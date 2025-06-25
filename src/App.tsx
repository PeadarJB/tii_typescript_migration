// App.tsx - Refactored with theme toggle functionality

import { useEffect, useRef, lazy, Suspense, FC } from 'react';
import type { ReactElement } from 'react';
import { Layout, Menu, Button, Space, Spin, Card, Switch, Tooltip, Typography } from 'antd';
import type { MenuProps } from 'antd';
import {
  WarningOutlined,
  DownloadOutlined,
  SunOutlined,
  MoonOutlined,
  FieldTimeOutlined,
  CloudOutlined,
  AreaChartOutlined,
} from '@ant-design/icons';
import { ErrorBoundary } from 'react-error-boundary';
import { ThemeProvider } from 'antd-style';

import { CONFIG } from './config/appConfig';
import { lightTheme, darkTheme } from './config/themeConfig';

// Store imports
import { useAppStore, useMapState, useUIState, useFilterState, useThemeState } from '@/store/useAppStore';
import type { AppPage } from '@/types';


// Style imports
import { useCommonStyles } from '@/styles/styled';

// Lazy loaded components
const EnhancedFilterPanel = lazy(() => import('./components/EnhancedFilterPanel'));
const EnhancedStatsPanel = lazy(() => import('./components/EnhancedStatsPanel'));
const EnhancedChartPanel = lazy(() => import('./components/EnhancedChartPanel'));
const SimpleSwipePanel = lazy(() => import('./components/SimpleSwipePanel'));
const SimpleReportGenerator = lazy(() => import('./components/SimpleReportGenerator'));

import 'antd/dist/reset.css';

const { Header, Sider, Content } = Layout;

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps): ReactElement {
  const { styles } = useCommonStyles();

  return (
    <div className={styles.errorContainer}>
      <Card>
        <Space direction="vertical" align="center">
          <WarningOutlined className="error-icon" />
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

const LoadingFallback: FC = () => {
    const { styles } = useCommonStyles();
    return (
      <div className={styles.loadingContainer} style={{ position: 'absolute', background: 'transparent' }}>
        <Spin />
      </div>
    );
}

function App(): ReactElement {
  const { themeMode } = useThemeState();

  return (
    <ThemeProvider theme={themeMode === 'dark' ? darkTheme : lightTheme}>
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent(): ReactElement {
  const { styles, theme } = useCommonStyles();

  // Store hooks
  const { mapView, webmap, roadLayer, loading, error } = useMapState();
  const {
    siderCollapsed,
    activePage,
    showFilters,
    showStats,
    showChart,
    showSwipe,
    showReportModal,
    isSwipeActive
  } = useUIState();
  const { hasActiveFilters, filterPanelKey } = useFilterState();
  const { themeMode, setThemeMode } = useThemeState();

  // Store actions
  const initializeMap = useAppStore((state) => state.initializeMap);
  const setSiderCollapsed = useAppStore((state) => state.setSiderCollapsed);
  const setActivePage = useAppStore((state) => state.setActivePage);
  const setShowFilters = useAppStore((state) => state.setShowFilters);
  const setShowStats = useAppStore((state) => state.setShowStats);
  const setShowChart = useAppStore((state) => state.setShowChart);
  const setShowSwipe = useAppStore((state) => state.setShowSwipe);
  const setShowReportModal = useAppStore((state) => state.setShowReportModal);
  const clearAllFilters = useAppStore((state) => state.clearAllFilters);

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

  // Handle filter toggle with mutual exclusion
  const handleFilterToggle = (checked: boolean): void => {
    setShowFilters(checked);
    if (checked) {
      setShowChart(false);
      setShowSwipe(false);
    } else {
      if (hasActiveFilters) {
        clearAllFilters();
      }
    }
  };

  // Handle chart toggle with mutual exclusion
  const handleChartToggle = (checked: boolean): void => {
    setShowChart(checked);
    if (checked) {
      setShowFilters(false);
      setShowSwipe(false);
    }
  };


  // Handle swipe toggle with mutual exclusion
  const handleSwipeToggle = (checked: boolean): void => {
    setShowSwipe(checked);
    if (checked) {
      // Deactivate other panels when swipe is activated
      setShowFilters(false);
      setShowChart(false);
      if (showStats) {
        setShowStats(false);
      }
    }
  };

  const handleThemeChange = (checked: boolean) => {
    setThemeMode(checked ? 'dark' : 'light');
  };

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    setActivePage(e.key as AppPage);
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

  // Menu items for the new page structure
  const menuItems: MenuProps['items'] = [
    { key: 'future', icon: <WarningOutlined />, label: 'Future Flood Hazard' },
    { key: 'past', icon: <FieldTimeOutlined />, label: 'Past Flood Events' },
    { key: 'precipitation', icon: <CloudOutlined />, label: 'Precipitation' },
    { key: 'explore', icon: <AreaChartOutlined />, label: 'Explore Statistics' },
  ];

  // Handle error state
  if (error) {
    return (
      <div className={styles.errorContainer}>
        <Card>
          <Space direction="vertical" align="center">
            <WarningOutlined className="error-icon" />
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
          style={{ background: theme.colorBgContainer, transition: `all ${theme.motionDurationFast}` }}
          onMouseEnter={() => setSiderCollapsed(false)}
          onMouseLeave={() => setSiderCollapsed(true)}
        >
          <div className={styles.siderLogo}>
            TII
          </div>
          <Menu
            theme={themeMode}
            mode="inline"
            selectedKeys={[activePage]}
            onClick={handleMenuClick}
            style={{ borderRight: 0 }}
            items={menuItems}
          />
        </Sider>

        <Layout>
          <Header style={{
            padding: `0 ${theme.marginLG}px`,
            background: theme.colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${theme.colorBorderSecondary}`
          }}>
            <h2 style={{ margin: 0 }}>TII Flood Risk Dashboard</h2>
            <Space>
              <Space size="small">
                <span>Panels:</span>
                <Tooltip title={isSwipeActive ? 'Disable layer comparison to use filters' : 'Show/Hide the data filtering panel'}>
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
                <Tooltip title="Show advanced data visualization and analysis">
                  <Switch
                    size="small"
                    checked={showChart}
                    onChange={handleChartToggle}
                    checkedChildren="Chart"
                    unCheckedChildren="Chart"
                    disabled={isSwipeActive}
                  />
                </Tooltip>
                <Tooltip title="Compare two sets of layers side-by-side">
                  <Switch
                    size="small"
                    checked={showSwipe}
                    onChange={handleSwipeToggle}
                    checkedChildren="Swipe"
                    unCheckedChildren="Swipe"
                  />
                </Tooltip>
              </Space>
              <Switch
                checked={themeMode === 'dark'}
                onChange={handleThemeChange}
                checkedChildren={<MoonOutlined />}
                unCheckedChildren={<SunOutlined />}
              />
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
              className={styles.mapContainer}
            />

            {loading && (
              <div className={styles.loadingContainer}>
                <Spin size="large" />
              </div>
            )}
            
            {/* For now, we only render the main components. 
                In the next step, we'll conditionally render based on 'activePage' */}
            {activePage === 'future' && (
              <>
                {showReportModal && mapView && (
                  <Suspense fallback={<LoadingFallback />}>
                    <SimpleReportGenerator onClose={() => setShowReportModal(false)} />
                  </Suspense>
                )}
                
                {showFilters && roadLayer && mapView && (
                  <Suspense fallback={<LoadingFallback />}>
                    <EnhancedFilterPanel key={filterPanelKey} />
                  </Suspense>
                )}
                
                {showChart && roadLayer && !loading && (
                  <Suspense fallback={<LoadingFallback />}>
                    <EnhancedChartPanel />
                  </Suspense>
                )}
                
                {showSwipe && mapView && webmap && !loading && (
                  <Suspense fallback={<LoadingFallback />}>
                    <SimpleSwipePanel />
                  </Suspense>
                )}
                
                {showStats && hasActiveFilters && roadLayer && !loading && (
                  <Suspense fallback={<LoadingFallback />}>
                    <EnhancedStatsPanel />
                  </Suspense>
                )}
                
                {showFilters && !roadLayer && !loading && webmap && (
                  <Card size="small" style={{
                    position: 'absolute',
                    top: theme.margin,
                    right: theme.margin,
                    width: 300,
                    background: theme.colorWarningBg,
                    borderColor: theme.colorWarningBorder
                  }}>
                    <p style={{ margin: 0, color: theme.colorWarningText }}>
                      Cannot show filters: Road layer not found
                    </p>
                    <p style={{ margin: `${theme.marginXS}px 0 0 0`, fontSize: theme.fontSizeSM, color: theme.colorWarningText }}>
                      Looking for layer: &quot;{CONFIG.roadNetworkLayerTitle}&quot;
                    </p>
                    <p style={{ margin: `${theme.marginXXS}px 0 0 0`, fontSize: theme.fontSizeSM, color: theme.colorWarningText }}>
                      Available layers: {webmap.layers.map(l => l.title).join(', ') || 'None'}
                    </p>
                  </Card>
                )}
              </>
            )}

            {/* Placeholder for other pages */}
            {activePage !== 'future' && (
              <div style={{ padding: 50, textAlign: 'center' }}>
                <Typography.Title level={3}>'{activePage}' Page</Typography.Title>
                <Typography.Text>This content will be built in the next steps.</Typography.Text>
              </div>
            )}

          </Content>
        </Layout>
      </Layout>
    </ErrorBoundary>
  );
}

export default App;