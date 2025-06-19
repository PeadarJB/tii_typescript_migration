// App.tsx - Refactored with Zustand Store

import { useEffect, useRef } from 'react';
import type { ReactElement } from 'react';
import { Layout, Menu, Button, Space, Spin, Card, Switch, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import { DashboardOutlined, WarningOutlined, DownloadOutlined } from '@ant-design/icons';
import { ErrorBoundary } from 'react-error-boundary';

// Store imports
import { useAppStore, useMapState, useUIState, useFilterState, useStatisticsState } from '@/store/useAppStore';

// Component imports
import EnhancedFilterPanel from './components/EnhancedFilterPanel';
import EnhancedStatsPanel from './components/EnhancedStatsPanel';
import EnhancedChartPanel from './components/EnhancedChartPanel';
import SimpleSwipePanel from './components/SimpleSwipePanel';
import SimpleReportGenerator from './components/SimpleReportGenerator';
import { CONFIG } from './config/appConfig';
import 'antd/dist/reset.css';

const { Header, Sider, Content } = Layout;

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps): ReactElement {
  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      background: '#f0f2f5' 
    }}>
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
  // Store hooks
  const { mapView, webmap, roadLayer, loading, error } = useMapState();
  const { 
    siderCollapsed, 
    showFilters, 
    showStats, 
    showChart, 
    showSwipe, 
    showReportModal,
    isSwipeActive 
  } = useUIState();
  const { currentFilters, hasActiveFilters, filterPanelKey } = useFilterState();
  const { currentStats } = useStatisticsState();
  
  // Store actions
  const initializeMap = useAppStore((state) => state.initializeMap);
  const setSiderCollapsed = useAppStore((state) => state.setSiderCollapsed);
  const setShowFilters = useAppStore((state) => state.setShowFilters);
  const setShowStats = useAppStore((state) => state.setShowStats);
  const setShowChart = useAppStore((state) => state.setShowChart);
  const setShowSwipe = useAppStore((state) => state.setShowSwipe);
  const setShowReportModal = useAppStore((state) => state.setShowReportModal);
  const setIsSwipeActive = useAppStore((state) => state.setIsSwipeActive);
  const setFilters = useAppStore((state) => state.setFilters);
  const applyFilters = useAppStore((state) => state.applyFilters);
  const clearAllFilters = useAppStore((state) => state.clearAllFilters);
  const updateStatistics = useAppStore((state) => state.updateStatistics);

  // Refs
  const siderRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const initStarted = useRef<boolean>(false);

  // Initialize map on mount
  useEffect(() => {
    const init = async (): Promise<void> => {
      if (initStarted.current) return;
      initStarted.current = true;

      await new Promise<void>(resolve => setTimeout(resolve, 100));
      await initializeMap('viewDiv');
    };
    
    void init();
  }, [initializeMap]);

  // Handle filter toggle
  const handleFilterToggle = (checked: boolean): void => {
    if (!checked && hasActiveFilters) {
      clearAllFilters();
    }
    setShowFilters(checked);
  };

  // Handle swipe toggle
  const handleSwipeToggle = (checked: boolean): void => {
    setShowSwipe(checked);
    
    if (checked) {
      if (showFilters) {
        handleFilterToggle(false);
      }
      if (showStats) {
        setShowStats(false);
      }
    }
  };

  // Get stats tooltip
  const getStatsTooltip = (): string => {
    if (isSwipeActive) {
      return 'Disable layer comparison to use stats';
    }
    if (!hasActiveFilters) {
      return 'Apply filters to view statistics';
    }
    return '';
  };

  // Menu items
  const menuItems: MenuProps['items'] = [
    { key: '1', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '2', icon: <WarningOutlined />, label: 'Flood Analysis' },
  ];

  // Handle error state
  if (error) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        background: '#f0f2f5' 
      }}>
        <Card>
          <Space direction="vertical" align="center">
            <WarningOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />
            <h2>Error Loading Application</h2>
            <p>{error}</p>
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
          collapsed={siderCollapsed}
          onCollapse={setSiderCollapsed}
          trigger={null}
          style={{ background: '#fff', transition: 'all 0.2s' }}
          onMouseEnter={() => setSiderCollapsed(false)}
          onMouseLeave={() => setSiderCollapsed(true)}
        >
          <div style={{ 
            height: 64, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            borderBottom: '1px solid #f0f0f0', 
            background: '#003d82', 
            color: '#fff', 
            fontWeight: 'bold', 
            fontSize: '20px' 
          }}>
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
          <Header style={{ 
            padding: '0 24px', 
            background: '#fff', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            borderBottom: '1px solid #f0f0f0' 
          }}>
            <h2 style={{ margin: 0 }}>TII Flood Risk Dashboard</h2>
            <Space>
              <Space size="small">
                <span>Panels:</span>
                <Tooltip title={isSwipeActive ? 'Disable layer comparison to use filters' : ''}>
                  <Switch
                    size="small"
                    checked={showFilters}
                    onChange={handleFilterToggle}
                    checkedChildren="Filter"
                    unCheckedChildren="Filter"
                    disabled={isSwipeActive}
                  />
                </Tooltip>
                <Tooltip title={getStatsTooltip()}>
                  <Switch
                    size="small"
                    checked={showStats}
                    onChange={setShowStats}
                    checkedChildren="Stats"
                    unCheckedChildren="Stats"
                    disabled={!hasActiveFilters || isSwipeActive}
                  />
                </Tooltip>
                <Switch
                  size="small"
                  checked={showChart}
                  onChange={setShowChart}
                  checkedChildren="Chart"
                  unCheckedChildren="Chart"
                />
                <Switch
                  size="small"
                  checked={showSwipe}
                  onChange={handleSwipeToggle}
                  checkedChildren="Swipe"
                  unCheckedChildren="Swipe"
                />
              </Space>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={() => setShowReportModal(true)}
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
            
            {loading && (
              <div style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                right: 0, 
                bottom: 0, 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                background: 'rgba(255, 255, 255, 0.9)', 
                zIndex: 1000 
              }}>
                <Spin size="large" />
              </div>
            )}
            
            {showReportModal && mapView && (
              <SimpleReportGenerator
                view={mapView}
                roadLayer={roadLayer}
                activeFilters={currentFilters}
                statistics={currentStats}
                onClose={() => setShowReportModal(false)}
              />
            )}
            
            {showFilters && roadLayer && mapView && (
              <EnhancedFilterPanel
                key={filterPanelKey}
                view={mapView}
                roadLayer={roadLayer}
                onFiltersChange={setFilters}
                initialExtent={mapView.extent}
                onApplyFilters={applyFilters}
                isShown={showFilters}
              />
            )}
            
            {showChart && roadLayer && !loading && (
              <EnhancedChartPanel roadLayer={roadLayer} />
            )}
            
            {showSwipe && mapView && webmap && !loading && (
              <SimpleSwipePanel
                view={mapView}
                webmap={webmap}
                isSwipeActive={isSwipeActive}
                setIsSwipeActive={setIsSwipeActive}
              />
            )}
            
            {showStats && hasActiveFilters && roadLayer && !loading && (
              <EnhancedStatsPanel
                roadLayer={roadLayer}
                onStatsChange={updateStatistics}
              />
            )}
            
            {showFilters && !roadLayer && !loading && webmap && (
              <Card size="small" style={{ 
                position: 'absolute', 
                top: 16, 
                right: 16, 
                width: 300, 
                background: '#fff3cd', 
                borderColor: '#ffeaa7' 
              }}>
                <p style={{ margin: 0, color: '#856404' }}>
                  Cannot show filters: Road layer not found
                </p>
                <p style={{ margin: '8px 0 0 0', fontSize: 12, color: '#856404' }}>
                  Looking for layer: &quot;{CONFIG.roadNetworkLayerTitle}&quot;
                </p>
                <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#856404' }}>
                  Available layers: {webmap.layers.map(l => l.title).join(', ') || 'None'}
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