import { message, notification } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import type { NotificationInstance } from 'antd/es/notification/interface';

// FIX: Import directly from the modules we've already fixed.
import { initializeMapView } from '@/components/MapView';
import type { MapInitResult } from '@/components/MapView';
import { CONFIG } from '@/config/appConfig';
// FIX: Import all necessary types from our central types/index.ts file.
import {
  AppliedFilters,
  NetworkStatistics,
  FilterOption,
  AppError,
  NetworkError,
  isFeatureLayer,
} from '@/types/index';
// FIX: Import all necessary ArcGIS types directly.
import MapView from '@arcgis/core/views/MapView';
import WebMap from '@arcgis/core/WebMap';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Query from '@arcgis/core/rest/support/Query';
import type Graphic from '@arcgis/core/Graphic';
import type { RoadQueryResult } from '@/types/index';

export type AppMode = 'dashboard' | 'analysis' | 'report';

export interface AppManagerEvents {
  filterChange: (expression: string) => void;
  modeChange: (mode: AppMode) => void;
  dataUpdate: (statistics: NetworkStatistics) => void;
  error: (error: Error) => void;
}

// FIX: Use the directly imported types instead of the old 'Esri*' aliases.
export interface AppManagerComponents {
  view?: MapView;
  webmap?: WebMap;
  roadNetworkLayer?: FeatureLayer;
}

export class AppManager {
  private static instance: AppManager | null = null;
  
  public components: AppManagerComponents = {};
  public isInitialized = false;
  public currentMode: AppMode = 'dashboard';
  
  private listeners: Map<keyof AppManagerEvents, Set<Function>> = new Map();
  private currentFilters: AppliedFilters = {};
  private currentStatistics: NetworkStatistics | null = null;
  private currentDefinitionExpression = '1=1';
  
  private messageApi: MessageInstance | null = null;
  private notificationApi: NotificationInstance | null = null;

  private constructor() {
    (Object.keys({} as AppManagerEvents) as Array<keyof AppManagerEvents>).forEach(event => {
      this.listeners.set(event, new Set());
    });
  }

  public static getInstance(): AppManager {
    if (AppManager.instance === null) {
      AppManager.instance = new AppManager();
    }
    return AppManager.instance;
  }

  public async initialize(): Promise<void> {
    try {
      const hideLoading = message.loading('Initializing application components...', 0);

      await this.initializeMap();
      await this.performInitialDataLoad();

      this.isInitialized = true;
      hideLoading();
      
      message.success('Application initialized successfully');
    } catch (error) {
      console.error('AppManager: Initialization failed', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      notification.error({
        message: 'Initialization Failed',
        description: errorMessage,
        duration: 0,
      });
      
      this.emit('error', error instanceof Error ? error : new Error(errorMessage));
      throw error;
    }
  }

  private async initializeMap(): Promise<void> {
    try {
      const { view, webmap }: MapInitResult = await initializeMapView('viewDiv');
      this.components.view = view;
      this.components.webmap = webmap;

      const foundLayer = webmap.layers.find(
        layer => layer.title === CONFIG.roadNetworkLayerTitle
      );
      
      if (foundLayer && isFeatureLayer(foundLayer)) {
        await foundLayer.load();
        this.components.roadNetworkLayer = foundLayer;
        this.setupLayerEventHandlers(foundLayer);
      } else {
        throw new Error(`Road network layer "${CONFIG.roadNetworkLayerTitle}" not found`);
      }
    } catch (error) {
      console.error('AppManager: Map initialization failed', error);
      throw new NetworkError(
        `Map initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: error }
      );
    }
  }
  
  private setupLayerEventHandlers(layer: FeatureLayer): void {
    layer.watch('visible', (visible: boolean) => {
      if(import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log(`AppManager: Road layer visibility changed to ${visible}`);
      }
    });

    layer.watch('definitionExpression', (expression: string) => {
      this.currentDefinitionExpression = expression;
    });
  }

  public async applyFilters(filters: AppliedFilters): Promise<boolean> {
    try {
      const { roadNetworkLayer, view } = this.components;
      if (!roadNetworkLayer) {
        throw new Error('Road network layer not initialized');
      }

      const whereClauses = Object.values(filters)
        .flat()
        .map(filterValue => {
            if (!filterValue?.field) return null;
            const value = filterValue.dataType === 'string' ? `'${String(filterValue.value).replace(/'/g, "''")}'` : filterValue.value;
            return `${filterValue.field} = ${value}`;
        })
        .filter((clause): clause is string => clause !== null);

      this.currentDefinitionExpression = whereClauses.length > 0 ? `(${whereClauses.join(' OR ')})` : '1=1';
      roadNetworkLayer.definitionExpression = this.currentDefinitionExpression;
      
      this.currentFilters = filters;
      
      await this.updateStatistics();
      this.emit('filterChange', this.currentDefinitionExpression);
      
      if (whereClauses.length > 0 && view) {
        const query = new Query({ where: this.currentDefinitionExpression });
        const extentResult = await roadNetworkLayer.queryExtent(query);
        if (extentResult?.extent) {
          await view.goTo(extentResult.extent.expand(1.2));
        }
      }
      return true;
    } catch (error) {
      this.handleError(error);
      return false;
    }
  }

  public async clearFilters(): Promise<void> {
    try {
      this.currentFilters = {};
      this.currentDefinitionExpression = '1=1';
      
      if (this.components.roadNetworkLayer) {
        this.components.roadNetworkLayer.definitionExpression = '1=1';
      }
      
      await this.updateStatistics();
      this.emit('filterChange', '1=1');
      
      if (this.components.webmap?.initialViewProperties?.viewpoint?.targetGeometry && this.components.view) {
        await this.components.view.goTo(this.components.webmap.initialViewProperties.viewpoint.targetGeometry);
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  private async updateStatistics(): Promise<void> {
    // Placeholder for actual stats logic
    if (this.currentStatistics) {
      this.emit('dataUpdate', this.currentStatistics);
    }
  }

  public async getUniqueFieldValues(fieldName: string): Promise<FilterOption[]> {
    try {
      const { roadNetworkLayer } = this.components;
      if (!roadNetworkLayer) {
        throw new Error('Road network layer not initialized');
      }

      const query = new Query({
        where: '1=1',
        outFields: [fieldName],
        returnDistinctValues: true,
        orderByFields: [fieldName],
      });
      
      const results = await roadNetworkLayer.queryFeatures(query);
      
      return results.features
        .map((f: Graphic) => f.attributes[fieldName])
        .filter((v): v is string | number => v != null && String(v).trim() !== '')
        .map((v): FilterOption => ({
          label: String(v),
          value: String(v),
        }));
        
    } catch (error) {
      this.handleError(error);
      return [];
    }
  }

  private async performInitialDataLoad(): Promise<void> {
    try {
      await this.updateStatistics();
    } catch (error) {
      console.error('AppManager: Initial data load failed', error);
      message.warning('Some data failed to load initially');
    }
  }
  
  public setMode(mode: AppMode): void {
    if (this.currentMode !== mode) {
      this.currentMode = mode;
      this.emit('modeChange', mode);
    }
  }

  public on<K extends keyof AppManagerEvents>(event: K, callback: AppManagerEvents[K]): () => void {
    this.listeners.get(event)?.add(callback);
    return () => this.off(event, callback);
  }

  public off<K extends keyof AppManagerEvents>(event: K, callback: AppManagerEvents[K]): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit<K extends keyof AppManagerEvents>(event: K, ...args: Parameters<AppManagerEvents[K]>): void {
    this.listeners.get(event)?.forEach(callback => {
      try {
        (callback as (...args: any[]) => void)(...args);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }
  
  private handleError(error: unknown): void {
    const appError = error instanceof AppError 
      ? error 
      : new AppError(
          error instanceof Error ? error.message : 'An unexpected error occurred',
          'UNKNOWN_ERROR',
          { originalError: error }
        );
    
    console.error('AppManager Error:', appError);
    this.emit('error', appError);
    
    message.error(appError.message);
  }

  public getCurrentFilters(): AppliedFilters {
    return { ...this.currentFilters };
  }

  public getCurrentStatistics(): NetworkStatistics | null {
    return this.currentStatistics;
  }
  
  public isReady(): boolean {
    return this.isInitialized && !!this.components.view && !!this.components.webmap && !!this.components.roadNetworkLayer;
  }

  public async destroy(): Promise<void> {
    try {
      this.listeners.forEach(set => set.clear());
      this.listeners.clear();

      this.components.view?.destroy();
      
      this.components = {};
      this.isInitialized = false;
      this.currentFilters = {};
      this.currentStatistics = null;

      AppManager.instance = null;
    } catch (error) {
      console.error('AppManager: Error during cleanup', error);
    }
  }
}