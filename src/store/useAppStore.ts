// src/store/useAppStore.ts

import { create } from 'zustand';
import { devtools, subscribeWithSelector, persist, createJSONStorage } from 'zustand/middleware';
import { message } from 'antd';

// Type imports
import type MapView from '@arcgis/core/views/MapView';
import type WebMap from '@arcgis/core/WebMap';
import type FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import type Extent from '@arcgis/core/geometry/Extent';
import type { FilterState, NetworkStatistics, AppPage, PastEventStatistics, FilterConfigItem } from '@/types/index';
import { isFeatureLayer } from '@/types/index';

// Service imports
import { initializeMapView } from '@/components/MapView';
import { CONFIG, PAST_EVENTS_FILTER_CONFIG } from '@/config/appConfig';
import { StatisticsService } from '@/services/StatisticsService';

// Store state interface
interface AppStore {
  // Map-related state
  loading: boolean;
  mapView: MapView | null;
  webmap: WebMap | null;
  roadLayer: FeatureLayer | null;
  roadLayerSwipe: FeatureLayer | null;
  initialExtent: Extent | null;
  error: string | null;
  preSwipeDefinitionExpression: string | null;
  
  // UI state
  siderCollapsed: boolean;
  activePage: AppPage;
  showFilters: boolean;
  showStats: boolean;
  showChart: boolean;
  showSwipe: boolean;
  showReportModal: boolean;
  isSwipeActive: boolean;
  themeMode: 'light' | 'dark';

  // Data state
  currentFilters: { [key in AppPage]?: Partial<FilterState> };
  currentStats: NetworkStatistics | null;
  pastEventStats: PastEventStatistics | null;
  filterPanelKey: number;

  // Actions
  initializeMap: (containerId: string) => Promise<void>;
  setSiderCollapsed: (collapsed: boolean) => void;
  setActivePage: (page: AppPage) => void;
  setShowFilters: (show: boolean) => void;
  setShowStats: (show: boolean) => void;
  setShowChart: (show: boolean) => void;
  setShowSwipe: (show: boolean) => void;
  setShowReportModal: (show: boolean) => void;
  setIsSwipeActive: (active: boolean) => void;
  setThemeMode: (mode: 'light' | 'dark') => void;
  
  setFilters: (page: AppPage, filters: Partial<FilterState>) => void;
  applyFilters: (page: AppPage) => Promise<void>;
  clearAllFilters: (page: AppPage) => void;

  enterSwipeMode: () => void;
  exitSwipeMode: () => void;
  
  calculateFutureStatistics: () => Promise<void>;
  calculatePastEventStatistics: () => Promise<void>;
  calculateStatistics: () => Promise<void>; // Alias for backward compatibility
  
  hasActiveFilters: (page: AppPage) => boolean;
  resetError: () => void;
}

// Create the store with persist middleware
export const useAppStore = create<AppStore>()(
  devtools(
    subscribeWithSelector(
      persist(
        (set, get) => ({
          // Initial state
          loading: true,
          mapView: null,
          webmap: null,
          roadLayer: null,
          roadLayerSwipe: null,
          initialExtent: null,
          error: null,
          preSwipeDefinitionExpression: null,
          siderCollapsed: true,
          activePage: 'future',
          showFilters: true,
          showStats: false,
          showChart: false,
          showSwipe: false,
          showReportModal: false,
          isSwipeActive: false,
          themeMode: 'light',
          currentFilters: {},
          currentStats: null,
          pastEventStats: null,
          filterPanelKey: Date.now(),

          // Map initialization
          initializeMap: async (containerId: string) => {
            try {
              set({ loading: true, error: null });
              const { view, webmap } = await initializeMapView(containerId);
              
              const mainLayer = webmap.layers.find(layer => layer.title === CONFIG.roadNetworkLayerTitle);
              const swipeLayer = webmap.layers.find(layer => layer.title === CONFIG.roadNetworkLayerSwipeTitle);
              
              const roadLayer = mainLayer && isFeatureLayer(mainLayer) ? mainLayer : null;
              const roadLayerSwipe = swipeLayer && isFeatureLayer(swipeLayer) ? swipeLayer : null;
              
              if (roadLayer) await roadLayer.load();
              if (roadLayerSwipe) await roadLayerSwipe.load();
              
              set({
                mapView: view,
                webmap,
                roadLayer,
                roadLayerSwipe,
                initialExtent: view.extent.clone(),
                loading: false,
              });
              message.success('Application loaded successfully');
            } catch (err) {
              console.error('Failed to initialize:', err);
              const errorMessage = err instanceof Error ? err.message : 'Failed to initialize map';
              set({ error: errorMessage, loading: false });
            }
          },

          // UI Actions
          setSiderCollapsed: (collapsed) => set({ siderCollapsed: collapsed }),
          setActivePage: (page) => set({ activePage: page, showStats: false, currentStats: null, pastEventStats: null }),
          setShowFilters: (show) => set({ showFilters: show }),
          setShowStats: (show) => set({ showStats: show }),
          setShowChart: (show) => set({ showChart: show }),
          setShowSwipe: (show) => set({ showSwipe: show }),
          setShowReportModal: (show) => set({ showReportModal: show }),
          setIsSwipeActive: (active) => set({ isSwipeActive: active }),
          setThemeMode: (mode) => set({ themeMode: mode }),

          // Filter Actions
          setFilters: (page, filters) => {
            set(state => ({
              currentFilters: { ...state.currentFilters, [page]: filters }
            }));
            const hasFilters = Object.values(filters).some(val => Array.isArray(val) && val.length > 0);
            if (!hasFilters) set({ showStats: false });
          },

          applyFilters: async (page) => {
            const state = get();
            const { roadLayer, mapView } = state;
            const filtersForPage = state.currentFilters[page] || {};
            const filterConfig = page === 'past' ? PAST_EVENTS_FILTER_CONFIG : CONFIG.filterConfig;
            
            if (!roadLayer || !mapView) return;

            try {
                const whereClauses: string[] = [];
                Object.entries(filtersForPage).forEach(([key, values]) => {
                    if (!values || !Array.isArray(values) || values.length === 0) return;

                    const configItem = filterConfig.find(f => f.id === key);
                    if (!configItem) return;

                    if (configItem.type === 'scenario-select') {
                        const scenarioClauses = (values as string[]).map(field => `${field} = 1`);
                        if (scenarioClauses.length > 0) whereClauses.push(`(${scenarioClauses.join(' OR ')})`);
                    } else if ('field' in configItem && configItem.field) {
                        const formattedValues = (values as (string|number)[]).map(val => 
                            configItem.dataType === 'string' ? `'${val}'` : val
                        ).join(',');
                        if(formattedValues) whereClauses.push(`${configItem.field} IN (${formattedValues})`);
                    }
                });

                const finalWhereClause = whereClauses.length > 0 ? whereClauses.join(' AND ') : '1=1';
                roadLayer.definitionExpression = finalWhereClause;

                if (finalWhereClause !== '1=1') {
                    roadLayer.visible = true;
                    set({ showStats: true });
                    message.success('Filters applied successfully');

                    const Query = (await import('@arcgis/core/rest/support/Query.js')).default;
                    const query = new Query({ where: finalWhereClause });
                    const extentResult = await roadLayer.queryExtent(query);
                    if (extentResult?.extent) {
                      await mapView.goTo(extentResult.extent.expand(1.2));
                    }

                    if (page === 'future') await get().calculateFutureStatistics();
                    if (page === 'past') await get().calculatePastEventStatistics();

                } else {
                    roadLayer.visible = false;
                    message.info('No filters applied');
                    if(state.initialExtent) await mapView.goTo(state.initialExtent);
                }
            } catch (error) {
                console.error('Failed to apply filters:', error);
                message.error('Failed to apply filters');
            }
          },

          clearAllFilters: (page) => {
            const { roadLayer, mapView, initialExtent } = get();
            if (roadLayer) {
              roadLayer.definitionExpression = '1=1';
              roadLayer.visible = false;
            }
            if (mapView && initialExtent) void mapView.goTo(initialExtent);
            
            set(state => ({
              currentFilters: { ...state.currentFilters, [page]: {} },
              showStats: false,
              currentStats: null,
              pastEventStats: null,
              filterPanelKey: Date.now(),
            }));
            message.info('All filters have been cleared.');
          },

          // Swipe Actions
          enterSwipeMode: () => {
            const { roadLayer } = get();
            if (roadLayer) set({ preSwipeDefinitionExpression: roadLayer.definitionExpression || '1=1' });
          },

          exitSwipeMode: () => {
            const { roadLayer, roadLayerSwipe, preSwipeDefinitionExpression } = get();
            const expression = preSwipeDefinitionExpression || '1=1';
            if (roadLayer) {
                roadLayer.definitionExpression = expression;
                roadLayer.visible = expression !== '1=1';
            }
            if (roadLayerSwipe) {
                roadLayerSwipe.definitionExpression = '1=0';
                roadLayerSwipe.visible = false;
            }
            set({ preSwipeDefinitionExpression: null });
          },

          // Statistics Actions (Renamed for clarity)
          calculateFutureStatistics: async () => {
            const { roadLayer } = get();
            if (!roadLayer) return;
            set({ loading: true });
            try {
              const stats = await StatisticsService.calculateNetworkStatistics(roadLayer, roadLayer.definitionExpression || '1=1');
              set({ currentStats: stats, loading: false });
            } catch (error) {
              set({ currentStats: null, loading: false });
            }
          },
          
          calculatePastEventStatistics: async () => {
            const { roadLayer } = get();
            if (!roadLayer) return;
            set({ loading: true });
            try {
              const stats = await StatisticsService.calculatePastEventStatistics(roadLayer, roadLayer.definitionExpression || '1=1');
              set({ pastEventStats: stats, loading: false });
            } catch (error) {
              set({ pastEventStats: null, loading: false });
            }
          },

          // Computed values
          hasActiveFilters: (page) => {
            const filters = get().currentFilters[page] || {};
            return Object.values(filters).some(f => Array.isArray(f) && f.length > 0);
          },

          // Reset actions
          resetError: () => set({ error: null }),
        }),
        {
          name: 'tii-app-storage',
          storage: createJSONStorage(() => localStorage),
          partialize: (state) => ({ themeMode: state.themeMode, activePage: state.activePage }),
        }
      )
    ),
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
  roadLayerSwipe: state.roadLayerSwipe,
  loading: state.loading,
  error: state.error,
}));

export const useUIState = () => useAppStore((state) => ({
  siderCollapsed: state.siderCollapsed,
  activePage: state.activePage,
  showFilters: state.showFilters,
  showStats: state.showStats,
  showChart: state.showChart,
  showSwipe: state.showSwipe,
  showReportModal: state.showReportModal,
  isSwipeActive: state.isSwipeActive,
}));

export const useFilterState = (page: AppPage) => useAppStore((state) => ({
  currentFilters: state.currentFilters[page] || {},
  hasActiveFilters: state.hasActiveFilters(page),
  filterPanelKey: state.filterPanelKey,
}));

export const useStatisticsState = () => useAppStore((state) => ({
  currentStats: state.currentStats,
  pastEventStats: state.pastEventStats,
  loading: state.loading,
}));

export const useThemeState = () => useAppStore((state) => ({
    themeMode: state.themeMode,
    setThemeMode: state.setThemeMode,
}));