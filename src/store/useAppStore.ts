// src/store/useAppStore.ts

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { message } from 'antd';

// Type imports
import type MapView from '@arcgis/core/views/MapView';
import type WebMap from '@arcgis/core/WebMap';
import type FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import type Extent from '@arcgis/core/geometry/Extent';
import type { FilterState, NetworkStatistics } from '@/types/index';
import { isFeatureLayer } from '@/types/index';

// Service imports
import { initializeMapView } from '@/components/MapView';
import { CONFIG } from '@/config/appConfig';
import { StatisticsService } from '@/services/StatisticsService';

// Store state interface
interface AppStore {
  // Map-related state
  loading: boolean;
  mapView: MapView | null;
  webmap: WebMap | null;
  roadLayer: FeatureLayer | null;
  initialExtent: Extent | null;
  error: string | null;

  // UI state
  siderCollapsed: boolean;
  showFilters: boolean;
  showStats: boolean;
  showChart: boolean;
  showSwipe: boolean;
  showReportModal: boolean;
  isSwipeActive: boolean;

  // Data state
  currentFilters: Partial<FilterState>;
  currentStats: NetworkStatistics | null;
  filterPanelKey: number;

  // Actions - Map
  initializeMap: (containerId: string) => Promise<void>;
  
  // Actions - UI
  setSiderCollapsed: (collapsed: boolean) => void;
  setShowFilters: (show: boolean) => void;
  setShowStats: (show: boolean) => void;
  setShowChart: (show: boolean) => void;
  setShowSwipe: (show: boolean) => void;
  setShowReportModal: (show: boolean) => void;
  setIsSwipeActive: (active: boolean) => void;
  
  // Actions - Filters
  setFilters: (filters: Partial<FilterState>) => void;
  applyFilters: () => Promise<void>;
  clearAllFilters: () => void;
  
  // Actions - Statistics
  updateStatistics: (stats: NetworkStatistics | null) => void;
  calculateStatistics: () => Promise<void>;
  
  // Computed values
  hasActiveFilters: () => boolean;
  
  // Reset actions
  resetFilterPanel: () => void;
  resetError: () => void;
}

// Create the store
export const useAppStore = create<AppStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Initial state
      loading: true,
      mapView: null,
      webmap: null,
      roadLayer: null,
      initialExtent: null,
      error: null,
      siderCollapsed: true,
      showFilters: true,
      showStats: false,
      showChart: false,
      showSwipe: false,
      showReportModal: false,
      isSwipeActive: false,
      currentFilters: {},
      currentStats: null,
      filterPanelKey: Date.now(),

      // Map initialization
      initializeMap: async (containerId: string) => {
        try {
          set({ loading: true, error: null });

          const { view, webmap } = await initializeMapView(containerId);
          
          // Find road layer
          const foundLayer = webmap.layers.find(
            (layer) => layer.title === CONFIG.roadNetworkLayerTitle
          );
          
          const roadLayer = foundLayer && isFeatureLayer(foundLayer) ? foundLayer : null;
          
          if (roadLayer) {
            await roadLayer.load();
            roadLayer.visible = false;
          } else {
            console.warn('Road network layer not found.');
          }
          
          const initialExtent = view.extent.clone();
          
          set({
            mapView: view,
            webmap,
            roadLayer,
            initialExtent,
            loading: false,
          });
          
          message.success('Application loaded successfully');
        } catch (err) {
          console.error('Failed to initialize:', err);
          const errorMessage = err instanceof Error ? err.message : 'Failed to initialize map';
          
          set({
            error: errorMessage,
            loading: false,
          });
        }
      },

      // UI Actions
      setSiderCollapsed: (collapsed) => set({ siderCollapsed: collapsed }),
      setShowFilters: (show) => set({ showFilters: show }),
      setShowStats: (show) => set({ showStats: show }),
      setShowChart: (show) => set({ showChart: show }),
      setShowSwipe: (show) => set({ showSwipe: show }),
      setShowReportModal: (show) => set({ showReportModal: show }),
      setIsSwipeActive: (active) => set({ isSwipeActive: active }),

      // Filter Actions
      setFilters: (filters) => {
        set({ currentFilters: filters });
        
        // Hide stats if no filters are active
        const hasFilters = Object.values(filters).some(
          (value) => Array.isArray(value) && value.length > 0
        );
        
        if (!hasFilters) {
          set({ showStats: false });
        }
      },

      applyFilters: async () => {
        const state = get();
        const { roadLayer, mapView, initialExtent, currentFilters } = state;
        
        if (!roadLayer || !mapView) return;

        try {
          const whereClauses: string[] = [];

          // Build where clauses from filters
          Object.entries(currentFilters).forEach(([key, values]) => {
            if (!values || !Array.isArray(values) || values.length === 0) return;

            if (key === 'flood-scenario') {
              // Special handling for flood scenarios
              const scenarioClauses = values.map(field => `${field} = 1`);
              whereClauses.push(`(${scenarioClauses.join(' OR ')})`);
            } else {
              // Standard handling for other filters
              const filterConfig = CONFIG.filterConfig.find(f => f.id === key);
              if (filterConfig && 'field' in filterConfig && filterConfig.field) {
                const formattedValues = values.map(val => 
                  filterConfig.dataType === 'string' ? `'${val}'` : val
                ).join(',');
                whereClauses.push(`${filterConfig.field} IN (${formattedValues})`);
              }
            }
          });

          const finalWhereClause = whereClauses.length > 0 ? whereClauses.join(' AND ') : '1=1';
          roadLayer.definitionExpression = finalWhereClause;

          if (whereClauses.length > 0) {
            roadLayer.visible = true;
            set({ showStats: true });
            message.success('Filters applied successfully');

            // Zoom to filtered extent
            const Query = (await import('@arcgis/core/rest/support/Query.js')).default;
            const query = new Query({ where: finalWhereClause });
            const extentResult = await roadLayer.queryExtent(query);
            
            if (extentResult?.extent) {
              await mapView.goTo(extentResult.extent.expand(1.2));
            }

            // Calculate statistics
            await get().calculateStatistics();
          } else {
            roadLayer.visible = false;
            message.info('No filters applied - road layer hidden');
            
            if (initialExtent) {
              await mapView.goTo(initialExtent);
            }
          }
        } catch (error) {
          console.error('Failed to apply filters:', error);
          message.error('Failed to apply filters');
        }
      },

      clearAllFilters: () => {
        const { roadLayer, mapView, initialExtent } = get();
        
        if (roadLayer) {
          roadLayer.definitionExpression = '1=1';
          roadLayer.visible = false;
        }
        
        if (mapView && initialExtent) {
          void mapView.goTo(initialExtent);
        }
        
        set({
          currentFilters: {},
          showStats: false,
          currentStats: null,
          filterPanelKey: Date.now(),
        });
        
        message.info('All filters have been cleared.');
      },

      // Statistics Actions
      updateStatistics: (stats) => set({ currentStats: stats }),

      calculateStatistics: async () => {
        const { roadLayer } = get();
        if (!roadLayer) return;

        try {
          const stats = await StatisticsService.calculateNetworkStatistics(
            roadLayer,
            roadLayer.definitionExpression || '1=1'
          );
          
          set({ currentStats: stats });
        } catch (error) {
          console.error('Failed to calculate statistics:', error);
          set({ currentStats: null });
        }
      },

      // Computed values
      hasActiveFilters: () => {
        const filters = get().currentFilters;
        return Object.values(filters).some(
          (value) => Array.isArray(value) && value.length > 0
        );
      },

      // Reset actions
      resetFilterPanel: () => set({ filterPanelKey: Date.now() }),
      resetError: () => set({ error: null }),
    })),
    {
      name: 'app-store',
    }
  )
);

// Selectors for common use cases
export const useMapState = () => useAppStore((state) => ({
  mapView: state.mapView,
  webmap: state.webmap,
  roadLayer: state.roadLayer,
  loading: state.loading,
  error: state.error,
}));

export const useUIState = () => useAppStore((state) => ({
  siderCollapsed: state.siderCollapsed,
  showFilters: state.showFilters,
  showStats: state.showStats,
  showChart: state.showChart,
  showSwipe: state.showSwipe,
  showReportModal: state.showReportModal,
  isSwipeActive: state.isSwipeActive,
}));

export const useFilterState = () => useAppStore((state) => ({
  currentFilters: state.currentFilters,
  hasActiveFilters: state.hasActiveFilters(),
  filterPanelKey: state.filterPanelKey,
}));

export const useStatisticsState = () => useAppStore((state) => ({
  currentStats: state.currentStats,
}));