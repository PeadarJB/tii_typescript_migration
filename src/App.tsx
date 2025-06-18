// App.tsx

import { useState, useEffect, useRef, useCallback } from 'react';
// FIX: Separate value and type imports to satisfy the 'consistent-type-imports' rule.
import type { ReactElement } from 'react';
import { Layout, Menu, Button, Space, Spin, Card, message, Switch, Tooltip } from 'antd';
import { DashboardOutlined, WarningOutlined, DownloadOutlined } from '@ant-design/icons';
import { ErrorBoundary } from 'react-error-boundary';
import type { MenuProps } from 'antd';
// FIX: Use explicit `import type` for type-only imports.
import { isFeatureLayer } from '@/types/index';
import type { FilterState, NetworkStatistics } from '@/types/index';
import type MapView from '@arcgis/core/views/MapView';
import type WebMap from '@arcgis/core/WebMap';
import type FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import type Extent from '@arcgis/core/geometry/Extent';

// Component imports (still JS for now)
import { initializeMapView } from './components/MapView';
import EnhancedFilterPanel from './components/EnhancedFilterPanel';
import EnhancedStatsPanel from './components/EnhancedStatsPanel';
import EnhancedChartPanel from './components/EnhancedChartPanel';
import SimpleSwipePanel from './components/SimpleSwipePanel';
import SimpleReportGenerator from './components/SimpleReportGenerator';
import { CONFIG } from './config/appConfig';
import 'antd/dist/reset.css';

const { Header, Sider, Content } = Layout;

interface AppState {
  loading: boolean;
  mapView: MapView | null;
  webmap: WebMap | null;
  roadLayer: FeatureLayer | null;
  error: string | null;
  siderCollapsed: boolean;
  showFilters: boolean;
  showStats: boolean;
  showChart: boolean;
  showSwipe: boolean;
  showReportModal: boolean;
  currentFilters: Partial<FilterState>;
  currentStats: NetworkStatistics | null;
  initialExtent: Extent | null;
  filterPanelKey: number;
  isSwipeActive: boolean;
}

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f0f2f5' }}>
      <Card>
        <Space direction="vertical" align="center">
          <WarningOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />
          <h2>Application Error</h2>
          <p>{error.message}</p>
          <Space>
            <Button onClick={resetErrorBoundary}>Try Again</Button>
            <Button onClick={() => window.location.reload()}>Reload Page</Button>
          </Space>
        </Space>
      </Card>
    </div>
  );
}

function App(): ReactElement {
  const [state, setState] = useState<AppState>({
    loading: true,
    mapView: null,
    webmap: null,
    roadLayer: null,
    error: null,
    siderCollapsed: true,
    showFilters: true,
    showStats: false,
    showChart: false,
    showSwipe: false,
    showReportModal: false,
    currentFilters: {},
    currentStats: null,
    initialExtent: null,
    filterPanelKey: Date.now(),
    isSwipeActive: false,
  });

  const siderRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const initStarted = useRef(false);

  useEffect(() => {
    interface MapViewResult {
      view: MapView;
      webmap: WebMap;
    }

    const initMap = async (): Promise<void> => {
      // FIX: Add curly braces to satisfy the 'curly' lint rule.
      if (initStarted.current) { return; }
      initStarted.current = true;

      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const viewDiv = document.getElementById('viewDiv');

        if (!viewDiv) {
          throw new Error('Map container not found');
        }
        
        const { view, webmap } = (await initializeMapView('viewDiv')) as MapViewResult;
        
        const foundLayer = webmap.layers.find(
          (layer) => layer.title === CONFIG.roadNetworkLayerTitle
        );
        const roadLayer = foundLayer && isFeatureLayer(foundLayer) ? foundLayer : undefined;
        
        if (roadLayer) {
          await roadLayer.load();
          roadLayer.visible = false;
        } else {
          console.warn('Road network layer not found.');
        }
        
        const initialExtent = view.extent.clone();
        
        // FIX: Add blank line to satisfy 'padding-line-between-statements' rule.
        
        setState(prev => ({
          ...prev,
          mapView: view,
          webmap,
          roadLayer: roadLayer ?? null,
          initialExtent,
          loading: false,
        }));
        
        message.success('Application loaded successfully');
      } catch (err) {
        console.error('Failed to initialize:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize map';
        
        setState(prev => ({
          ...prev,
          error: errorMessage,
          loading: false,
        }));
      }
    };
    
    // FIX: Handle floating promises correctly with the `void` operator.
    void initMap();
  }, []);

  const hasActiveFilters = useCallback((): boolean => {
    return Object.values(state.currentFilters).some(
      (value) => Array.isArray(value) && value.length > 0
    );
  }, [state.currentFilters]);

  const handleFiltersChange = useCallback((filters: Partial<FilterState>) => {
    setState(prev => ({ ...prev, currentFilters: filters }));
    
    const isActive = Object.values(filters).some(
      (value) => Array.isArray(value) && value.length > 0
    );
    
    if (!isActive) {
      setState(prev => ({ ...prev, showStats: false }));
    }
  }, []);

  const handleApplyFilters = useCallback(() => {
    setState(prev => ({ ...prev, showStats: true }));
  }, []);

  const clearAllFilters = useCallback(async (): Promise<void> => {
    const { roadLayer, initialExtent, mapView } = state;
    
    if (roadLayer) {
      roadLayer.definitionExpression = '1=1';
      roadLayer.visible = false;
    }
    
    if (initialExtent && mapView) {
      await mapView.goTo(initialExtent);
    }
    
    setState(prev => ({
      ...prev,
      currentFilters: {},
      showStats: false,
      filterPanelKey: Date.now(),
    }));
    
    message.info('All filters have been cleared.');
  }, [state]);

  const handleFilterToggle = useCallback((checked: boolean) => {
    if (!checked && hasActiveFilters()) {
      void clearAllFilters();
    }
    setState(prev => ({ ...prev, showFilters: checked }));
  }, [hasActiveFilters, clearAllFilters]);

  const handleSwipeToggle = useCallback((checked: boolean) => {
    setState(prev => ({ ...prev, showSwipe: checked }));
    
    if (checked) {
      if (state.showFilters) {
        handleFilterToggle(false);
      }
      if (state.showStats) {
        setState(prev => ({ ...prev, showStats: false }));
      }
    }
  }, [state.showFilters, state.showStats, handleFilterToggle]);

  const handleStatsChange = useCallback((stats: NetworkStatistics | null) => {
    setState(prev => ({ ...prev, currentStats: stats }));
  }, []);

  // FIX: Refactor nested ternary to improve readability and satisfy 'no-nested-ternary' rule.
  const getStatsTooltip = (): string => {
    if (state.isSwipeActive) {
      return 'Disable layer comparison to use stats';
    }
    if (!hasActiveFilters()) {
      return 'Apply filters to view statistics';
    }
    
    return '';
  };

  const menuItems: MenuProps['items'] = [
    { key: '1', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '2', icon: <WarningOutlined />, label: 'Flood Analysis' },
  ];

  // FIX: Handle nullable string explicitly for strict-boolean-expressions rule
  if (state.error !== null && state.error !== '') {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f0f2f5' }}>
        <Card>
          <Space direction="vertical" align="center">
            <WarningOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />
            <h2>Error Loading Application</h2>
            <p>{state.error}</p>
            <Button onClick={() => window.location.reload()}>Reload Page</Button>
          </Space>
        </Card>
      </div>
    );
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider
          ref={siderRef}
          collapsible
          collapsed={state.siderCollapsed}
          onCollapse={(collapsed) => setState(prev => ({ ...prev, siderCollapsed: collapsed }))}
          trigger={null}
          style={{ background: '#fff', transition: 'all 0.2s' }}
          onMouseEnter={() => setState(prev => ({ ...prev, siderCollapsed: false }))}
          onMouseLeave={() => setState(prev => ({ ...prev, siderCollapsed: true }))}
        >
          <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #f0f0f0', background: '#003d82', color: '#fff', fontWeight: 'bold', fontSize: '20px' }}>
            TII
          </div>
          <Menu
            mode="inline"
            defaultSelectedKeys={['1']}
            style={{ borderRight: 0 }}
            items={menuItems}
          />
        </Sider>
        
        <Layout>
          <Header style={{ padding: '0 24px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0' }}>
            <h2 style={{ margin: 0 }}>TII Flood Risk Dashboard</h2>
            <Space>
              <Space size="small">
                <span>Panels:</span>
                <Tooltip title={state.isSwipeActive ? 'Disable layer comparison to use filters' : ''}>
                  <Switch
                    size="small"
                    checked={state.showFilters}
                    onChange={handleFilterToggle}
                    checkedChildren="Filter"
                    unCheckedChildren="Filter"
                    disabled={state.isSwipeActive}
                  />
                </Tooltip>
                <Tooltip title={getStatsTooltip()}>
                  <Switch
                    size="small"
                    checked={state.showStats}
                    onChange={(checked) => setState(prev => ({ ...prev, showStats: checked }))}
                    checkedChildren="Stats"
                    unCheckedChildren="Stats"
                    disabled={!hasActiveFilters() || state.isSwipeActive}
                  />
                </Tooltip>
                <Switch
                  size="small"
                  checked={state.showChart}
                  onChange={(checked) => setState(prev => ({ ...prev, showChart: checked }))}
                  checkedChildren="Chart"
                  unCheckedChildren="Chart"
                />
                <Switch
                  size="small"
                  checked={state.showSwipe}
                  onChange={handleSwipeToggle}
                  checkedChildren="Swipe"
                  unCheckedChildren="Swipe"
                />
              </Space>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={() => setState(prev => ({ ...prev, showReportModal: true }))}
              >
                Generate Report
              </Button>
            </Space>
          </Header>
          
          <Content style={{ position: 'relative' }}>
            <div
              ref={mapContainerRef}
              id="viewDiv"
              style={{ width: '100%', height: 'calc(100vh - 64px)', position: 'relative' }}
            />
            
            {state.loading && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(255, 255, 255, 0.9)', zIndex: 1000 }}>
                <Spin size="large" />
              </div>
            )}
            
            {state.showReportModal && state.mapView && (
              <SimpleReportGenerator
                view={state.mapView}
                roadLayer={state.roadLayer}
                activeFilters={state.currentFilters}
                statistics={state.currentStats}
                onClose={() => setState(prev => ({ ...prev, showReportModal: false }))}
              />
            )}
            
            {/* FIX: Removed @ts-expect-error and fixed prop mismatch */}
            {state.showFilters && state.roadLayer && state.mapView && state.webmap && (
              <EnhancedFilterPanel
                key={state.filterPanelKey}
                view={state.mapView}
                webmap={state.webmap}
                roadLayer={state.roadLayer}
                onFiltersChange={handleFiltersChange}
                initialExtent={state.initialExtent}
                onApplyFilters={handleApplyFilters}
                isShown={true}
              />
            )}
            
            {state.showChart && state.roadLayer && !state.loading && (
              <EnhancedChartPanel roadLayer={state.roadLayer} />
            )}
            
            {state.showSwipe && state.mapView && state.webmap && !state.loading && (
              <SimpleSwipePanel
                view={state.mapView}
                webmap={state.webmap}
                isSwipeActive={state.isSwipeActive}
                // FIX: Add explicit 'boolean' type to the 'active' parameter.
                setIsSwipeActive={(active: boolean) => setState(prev => ({ ...prev, isSwipeActive: active }))}
              />
            )}
            
            {state.showStats && hasActiveFilters() && state.roadLayer && !state.loading && (
              <EnhancedStatsPanel
                roadLayer={state.roadLayer}
                onStatsChange={handleStatsChange}
              />
            )}
            
            {state.showFilters && !state.roadLayer && !state.loading && state.webmap && (
              <Card size="small" style={{ position: 'absolute', top: 16, right: 16, width: 300, background: '#fff3cd', borderColor: '#ffeaa7' }}>
                <p style={{ margin: 0, color: '#856404' }}>
                  Cannot show filters: Road layer not found
                </p>
                <p style={{ margin: '8px 0 0 0', fontSize: 12, color: '#856404' }}>
                  {/* FIX: Escape quote characters to satisfy 'no-unescaped-entities' rule */}
                  Looking for layer: &quot;{CONFIG.roadNetworkLayerTitle}&quot;
                </p>
                <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#856404' }}>
                  Available layers: {state.webmap.layers.map(l => l.title).join(', ') || 'None'}
                </p>
              </Card>
            )}
          </Content>
        </Layout>
      </Layout>
    </ErrorBoundary>
  );
}

export default App;