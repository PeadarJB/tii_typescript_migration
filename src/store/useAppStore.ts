// src/store/useAppStore.ts

import { create } from 'zustand';
import { devtools, subscribeWithSelector, persist, createJSONStorage } from 'zustand/middleware';
import { message } from 'antd';

// Type imports
import type MapView from '@arcgis/core/views/MapView';
import type WebMap from '@arcgis/core/WebMap';
import type FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import type Extent from '@arcgis/core/geometry/Extent';
import type { FilterState, NetworkStatistics, AppPage } from '@/types/index';
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
  roadLayerSwipe: FeatureLayer | null;
  initialExtent: Extent | null;
  error: string | null;
  preSwipeDefinitionExpression: string | null;

  // UI state
  siderCollapsed: boolean;
  activePage: AppPage; // New state for navigation
  showFilters: boolean;
  showStats: boolean;
  showChart: boolean;
  showSwipe: boolean;
  showReportModal: boolean;
  isSwipeActive: boolean;
  themeMode: 'light' | 'dark';

  // Data state
  currentFilters: Partial<FilterState>;
  currentStats: NetworkStatistics | null;
  filterPanelKey: number;

  // Actions - Map
  initializeMap: (containerId: string) => Promise<void>;
  
  // Actions - UI
  setSiderCollapsed: (collapsed: boolean) => void;
  setActivePage: (page: AppPage) => void; // New action for navigation
  setShowFilters: (show: boolean) => void;
  setShowStats: (show: boolean) => void;
  setShowChart: (show: boolean) => void;
  setShowSwipe: (show: boolean) => void;
  setShowReportModal: (show: boolean) => void;
  setIsSwipeActive: (active: boolean) => void;
  setThemeMode: (mode: 'light' | 'dark') => void;
  
  // Actions - Filters
  setFilters: (filters: Partial<FilterState>) => void;
  applyFilters: () => Promise<void>;
  clearAllFilters: (options?: { silent?: boolean }) => void;

  // Actions - Swipe
  enterSwipeMode: () => void;
  exitSwipeMode: () => void;
  
  // Actions - Statistics
  updateStatistics: (stats: NetworkStatistics | null) => void;
  calculateStatistics: () => Promise<void>;
  
  // Computed values
  hasActiveFilters: () => boolean;
  
  // Reset actions
  resetFilterPanel: () => void;
  resetError: () => void;
}

const getInitialFilterStateFromConfig = (): Partial<FilterState> => {
    const initialState: Partial<FilterState> = {};
    CONFIG.filterConfig.forEach(filter => {
      if (filter.type === 'range-slider') {
          initialState[filter.id as keyof FilterState] = [filter.min ?? 0, filter.max ?? 5] as any;
      } else {
          initialState[filter.id as keyof FilterState] = [] as any;
      }
    });
    return initialState;
};

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
          activePage: 'past', // Set default page
          showFilters: true,
          showStats: false,
          showChart: false,
          showSwipe: false,
          showReportModal: false,
          isSwipeActive: false,
          themeMode: 'light',
          currentFilters: getInitialFilterStateFromConfig(),
          currentStats: null,
          filterPanelKey: Date.now(),

          // Map initialization
          initializeMap: async (containerId: string) => {
            try {
              set({ loading: true, error: null });

              const { view, webmap } = await initializeMapView(containerId);
              
              const mainLayer = webmap.layers.find(
                (layer) => layer.title === CONFIG.roadNetworkLayerTitle
              );
              const swipeLayer = webmap.layers.find(
                (layer) => layer.title === CONFIG.roadNetworkLayerSwipeTitle
              );
              
              const roadLayer = mainLayer && isFeatureLayer(mainLayer) ? mainLayer : null;
              const roadLayerSwipe = swipeLayer && isFeatureLayer(swipeLayer) ? swipeLayer : null;
              
              if (roadLayer) {
                await roadLayer.load();
                roadLayer.visible = false;
              } else {
                console.warn('Main road network layer not found.');
              }
              if (roadLayerSwipe) {
                await roadLayerSwipe.load();
                roadLayerSwipe.visible = false;
              } else {
                console.warn('Swipe road network layer not found.');
              }
              
              const initialExtent = view.extent.clone();
              
              set({
                mapView: view,
                webmap,
                roadLayer,
                roadLayerSwipe,
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
          setActivePage: (page) => {
            // Clear filters silently on page change
            get().clearAllFilters({ silent: true });
            
            set({
              activePage: page,
              showFilters: true,
              showStats: false,
              showChart: false,
              showSwipe: false,
            });

            // Reset map extent on page change
            const { mapView, initialExtent } = get();
            if (mapView && initialExtent) {
                mapView.goTo(initialExtent).catch(error => {
                    console.error("Failed to reset map extent:", error);
                });
            }
          },
          setShowFilters: (show) => set({ showFilters: show }),
          setShowStats: (show) => set({ showStats: show }),
          setShowChart: (show) => set({ showChart: show }),
          setShowSwipe: (show) => set({ showSwipe: show }),
          setShowReportModal: (show) => set({ showReportModal: show }),
          setIsSwipeActive: (active) => set({ isSwipeActive: active }),
          setThemeMode: (mode) => set({ themeMode: mode }),

          // Filter Actions
          setFilters: (filters) => {
            set({ currentFilters: filters });
          },

          applyFilters: async () => {
            const state = get();
            const { roadLayer, mapView, initialExtent, currentFilters, activePage } = state;
            
            console.log('🔍 [FILTER DEBUG] Starting applyFilters...');
            console.log('🔍 [FILTER DEBUG] Active page:', activePage);
            console.log('🔍 [FILTER DEBUG] Current filters raw:', currentFilters);
            
            if (!roadLayer || !mapView) {
              console.log('❌ [FILTER DEBUG] Missing roadLayer or mapView');
              return;
            }

            try {
              const whereClauses: string[] = [];

              console.log('🔍 [FILTER DEBUG] Processing filters...');
              
              for (const [key, values] of Object.entries(currentFilters)) {
                console.log(`🔍 [FILTER DEBUG] Processing filter: ${key}`, values);
                
                if (!values || !Array.isArray(values) || values.length === 0) {
                    console.log(`🔍 [FILTER DEBUG] Skipping ${key} - no values`);
                    continue;
                }

                const filterConfig = CONFIG.filterConfig.find(f => f.id === key);
                if (!filterConfig) {
                    console.log(`🔍 [FILTER DEBUG] No config found for filter: ${key}`);
                    continue;
                }

                console.log(`🔍 [FILTER DEBUG] Filter config for ${key}:`, filterConfig);

                switch (filterConfig.type) {
                    case 'scenario-select': {
                        const scenarioClauses = values.map(field => `${field} = 1`);
                        if (scenarioClauses.length > 0) {
                            const clause = `(${scenarioClauses.join(' OR ')})`;
                            whereClauses.push(clause);
                            console.log(`🔍 [FILTER DEBUG] Scenario clause for ${key}:`, clause);
                        }
                        break;
                    }
                    case 'range-slider': {
                        if (filterConfig.field && values.length === 2 && typeof values[0] === 'number' && typeof values[1] === 'number') {
                            const [min, max] = values as [number, number];
                            const defaultMin = filterConfig.min ?? 0;
                            const defaultMax = filterConfig.max ?? 5;
                            
                            console.log(`🔍 [FILTER DEBUG] Range slider ${key}:`);
                            console.log(`  - Field: ${filterConfig.field}`);
                            console.log(`  - Current range: [${min}, ${max}]`);
                            console.log(`  - Default range: [${defaultMin}, ${defaultMax}]`);
                            console.log(`  - Is different from default: ${min > defaultMin || max < defaultMax}`);
                            
                            // CHANGED: Always apply range filter if values are set, regardless of defaults
                            // This helps debug if the field has data
                            if (min >= defaultMin && max <= defaultMax) {
                                const clause = `${filterConfig.field} BETWEEN ${min} AND ${max}`;
                                whereClauses.push(clause);
                                console.log(`🔍 [FILTER DEBUG] Range clause for ${key}:`, clause);
                            } else {
                                console.log(`🔍 [FILTER DEBUG] Range ${key} outside bounds, skipping`);
                            }
                        } else {
                            console.log(`🔍 [FILTER DEBUG] Invalid range data for ${key}:`, values);
                        }
                        break;
                    }
                    case 'multi-select': {
                        if (filterConfig.field) {
                            const formattedValues = values.map(val => 
                                filterConfig.dataType === 'string' ? `'${val}'` : val
                            ).join(',');
                            const clause = `${filterConfig.field} IN (${formattedValues})`;
                            whereClauses.push(clause);
                            console.log(`🔍 [FILTER DEBUG] Multi-select clause for ${key}:`, clause);
                        }
                        break;
                    }
                    default:
                        console.log(`🔍 [FILTER DEBUG] Unknown filter type for ${key}:`, filterConfig.type);
                }
              }

              const finalWhereClause = whereClauses.length > 0 ? whereClauses.join(' AND ') : '1=1';
              
              console.log('🔍 [FILTER DEBUG] Generated WHERE clauses:', whereClauses);
              console.log('🔍 [FILTER DEBUG] Final WHERE clause:', finalWhereClause);
              
              // Apply the filter
              console.log('🔍 [FILTER DEBUG] Applying definitionExpression to roadLayer...');
              roadLayer.definitionExpression = finalWhereClause;
              console.log('🔍 [FILTER DEBUG] Road layer definitionExpression set to:', roadLayer.definitionExpression);

              if (finalWhereClause !== '1=1') {
                console.log('🔍 [FILTER DEBUG] Filters applied - making road layer visible');
                roadLayer.visible = true;
                set({ showStats: true });
                message.success('Filters applied successfully');

                // Query extent
                console.log('🔍 [FILTER DEBUG] Querying extent for filtered results...');
                const Query = (await import('@arcgis/core/rest/support/Query.js')).default;
                const query = new Query({ where: finalWhereClause });
                const extentResult = await roadLayer.queryExtent(query);
                
                console.log('🔍 [FILTER DEBUG] Extent query result:', extentResult);
                
                if (extentResult?.extent) {
                  console.log('🔍 [FILTER DEBUG] Zooming to extent:', extentResult.extent);
                  await mapView.goTo(extentResult.extent.expand(1.2));
                } else {
                  console.log('🔍 [FILTER DEBUG] No extent returned - possibly no features match the filter');
                }

                await get().calculateStatistics();
              } else {
                console.log('🔍 [FILTER DEBUG] No filters applied - hiding road layer');
                roadLayer.visible = false;
                set({ showStats: false, currentStats: null });
                message.info('Filters cleared or set to default. Road layer hidden.');
                if (initialExtent) {
                  await mapView.goTo(initialExtent);
                }
              }
            } catch (error) {
              console.error('❌ [FILTER DEBUG] Failed to apply filters:', error);
              message.error('Failed to apply filters');
            }
          },

          clearAllFilters: (options) => {
            const { roadLayer, mapView, initialExtent, hasActiveFilters } = get();
            const wereFiltersActive = hasActiveFilters();
            
            if (roadLayer) {
              roadLayer.definitionExpression = '1=1';
              roadLayer.visible = false;
            }
            
            if (mapView && initialExtent) {
              void mapView.goTo(initialExtent);
            }
            
            set({
              currentFilters: getInitialFilterStateFromConfig(),
              showStats: false,
              currentStats: null,
              filterPanelKey: Date.now(),
            });
            
            if (wereFiltersActive && !options?.silent) {
                message.info('All filters have been cleared.');
            }
          },

          // Swipe Actions
          enterSwipeMode: () => {
            const { roadLayer } = get();
            if (roadLayer) {
              set({ preSwipeDefinitionExpression: roadLayer.definitionExpression || '1=1' });
            }
          },

          exitSwipeMode: () => {
            const { roadLayer, roadLayerSwipe, preSwipeDefinitionExpression } = get();
            const expression = preSwipeDefinitionExpression || '1=1';
            const visible = expression !== '1=1';
            
            if (roadLayer) {
                roadLayer.definitionExpression = expression;
                roadLayer.visible = visible;
            }
            if (roadLayerSwipe) {
                roadLayerSwipe.definitionExpression = '1=0'; // Hide all features
                roadLayerSwipe.visible = false;
            }

            set({ preSwipeDefinitionExpression: null });
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
            const { currentFilters } = get();
            return Object.entries(currentFilters).some(([key, value]) => {
                if (!Array.isArray(value)) return false;
                
                const filterConfig = CONFIG.filterConfig.find(f => f.id === key);
                if (!filterConfig) return false;

                if (filterConfig.type === 'range-slider') {
                    const [currentMin, currentMax] = value as [number, number];
                    const defaultMin = filterConfig.min ?? 0;
                    const defaultMax = filterConfig.max ?? 5;
                    return currentMin > defaultMin || currentMax < defaultMax;
                }
                
                return value.length > 0;
            });
          },

          // Reset actions
          resetFilterPanel: () => set({ filterPanelKey: Date.now() }),
          resetError: () => set({ error: null }),
        }),
        {
          name: 'tii-app-storage',
          storage: createJSONStorage(() => localStorage),
          partialize: (state) => ({ themeMode: state.themeMode }),
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
  initialExtent: state.initialExtent,
}));

export const useUIState = () => useAppStore((state) => ({
  siderCollapsed: state.siderCollapsed,
  showFilters: state.showFilters,
  showStats: state.showStats,
  showChart: state.showChart,
  showSwipe: state.showSwipe,
  showReportModal: state.showReportModal,
  isSwipeActive: state.isSwipeActive,
  activePage: state.activePage,
}));

export const useFilterState = () => useAppStore((state) => ({
  currentFilters: state.currentFilters,
  hasActiveFilters: state.hasActiveFilters(),
  filterPanelKey: state.filterPanelKey,
}));

export const useStatisticsState = () => useAppStore((state) => ({
  currentStats: state.currentStats,
}));

export const useThemeState = () => useAppStore((state) => ({
    themeMode: state.themeMode,
    setThemeMode: state.setThemeMode,
}));