// App.tsx - Refactored for Multi-Page Structure

import { useEffect, useRef } from 'react';
import type { ReactElement } from 'react';
import { Layout, Menu, Button, Space, Spin, Card, Switch, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import {
  WarningOutlined,
  DownloadOutlined,
  SunOutlined,
  MoonOutlined,
  FieldTimeOutlined,
  CloudOutlined,
  AreaChartOutlined,
  SwapOutlined,
  BookOutlined, // Import new icon
} from '@ant-design/icons';
import { ErrorBoundary } from 'react-error-boundary';
import { ThemeProvider } from 'antd-style';
// Asset imports
import tiiLogo from './assets/Logo_of_Transport_Infrastructure_Ireland.png';

import { lightTheme, darkTheme } from './config/themeConfig';

// Page and Widget imports
import { FutureHazardPage, PastFloodPage, PrecipitationPage, ExploreStatisticsPage, DataOverviewPage } from '@/pages';
import MapWidgets from '@/components/MapWidgets'; // Import the new component
import { PAGE_CONFIG } from './config/appConfig'; // Import the new page config

// Store imports
import { useAppStore, useMapState, useUIState, useFilterState, useThemeState } from '@/store/useAppStore';
import type { AppPage } from '@/types';

// Style imports
import { useCommonStyles } from '@/styles/styled';

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
  const { loading, error, mapView } = useMapState();
  const { siderCollapsed, activePage, isSwipeActive } = useUIState();
  const { hasActiveFilters } = useFilterState();
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
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  // Handles map initialization and re-attachment
  useEffect(() => {
    if (activePage !== 'explore' && activePage !== 'overview') {
        if (!mapView && mapContainerRef.current) {
            // If no map view exists, initialize it
            initializeMap('viewDiv');
        } else if (mapView && mapContainerRef.current && mapView.container !== mapContainerRef.current) {
            // If map view exists but is detached, re-attach it to the container
            mapView.container = mapContainerRef.current;
        }
    }
  }, [activePage, mapView, initializeMap]); // Added activePage to dependency array

  // Panel Toggles
  const { showFilters, showStats, showChart, showSwipe } = useUIState();

  const handleFilterToggle = (checked: boolean): void => {
    setShowFilters(checked);
    if (checked) {
      setShowChart(false);
      setShowSwipe(false);
    } else if (hasActiveFilters) {
      clearAllFilters();
    }
  };

  const handleChartToggle = (checked: boolean): void => {
    setShowChart(checked);
    if (checked) {
      setShowFilters(false);
      setShowSwipe(false);
    }
  };

  const handleSwipeToggle = (checked: boolean): void => {
    setShowSwipe(checked);
    if (checked) {
      setShowFilters(false);
      setShowChart(false);
      if (showStats) setShowStats(false);
    }
  };

  const handleThemeChange = (checked: boolean) => {
    setThemeMode(checked ? 'dark' : 'light');
  };

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    setActivePage(e.key as AppPage);
  };

  const pageTitle = PAGE_CONFIG[activePage]?.title || 'Dashboard';

  const menuItems: MenuProps['items'] = [
    { key: 'future', icon: <WarningOutlined />, label: 'Future Flood Hazard' },
    { key: 'past', icon: <FieldTimeOutlined />, label: 'Past Flood Events' },
    { key: 'precipitation', icon: <CloudOutlined />, label: 'Precipitation' },
    { key: 'explore', icon: <AreaChartOutlined />, label: 'Explore Statistics' },
    { key: 'overview', icon: <BookOutlined />, label: 'Data Overview' },
  ];

  if (error && activePage !== 'explore' && activePage !== 'overview') {
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
  
  const renderPageContent = () => {
    switch (activePage) {
        case 'future': return <FutureHazardPage />;
        case 'past': return <PastFloodPage />;
        case 'precipitation': return <PrecipitationPage />;
        case 'explore': return <ExploreStatisticsPage />;
        case 'overview': return <DataOverviewPage />;
        default: return <FutureHazardPage />;
    }
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider
          collapsible
          collapsed={siderCollapsed}
          onCollapse={setSiderCollapsed}
          trigger={null}
          style={{ background: theme.colorBgContainer, transition: `all ${theme.motionDurationFast}` }}
          onMouseEnter={() => setSiderCollapsed(false)}
          onMouseLeave={() => setSiderCollapsed(true)}
        >
          <div className={styles.siderLogo}>
            <img src={tiiLogo} alt="TII Logo" style={{ height: '40px', transition: 'all 0.2s' }} />
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
            <h2 style={{ margin: 0 }}>{`TII Flood Risk Dashboard - ${pageTitle}`}</h2>
            <Space>
              {(activePage === 'future' || activePage === 'past' || activePage === 'precipitation') && (
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

                    {(activePage === 'future' || activePage === 'past' || activePage === 'precipitation') && (
                        <Tooltip title={!hasActiveFilters ? 'Apply filters to view statistics' : ''}>
                        <Switch
                            size="small"
                            checked={showStats}
                            onChange={setShowStats}
                            checkedChildren="Stats"
                            unCheckedChildren="Stats"
                            disabled={!hasActiveFilters || isSwipeActive}
                        />
                        </Tooltip>
                    )}

                    {(activePage === 'future' || activePage === 'past') && (
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
                    )}

                    {(activePage === 'future' || activePage === 'precipitation') && (
                        <Tooltip title="Compare two sets of layers side-by-side">
                            <Switch
                                size="small"
                                checked={showSwipe}
                                onChange={handleSwipeToggle}
                                checkedChildren={<SwapOutlined />}
                                unCheckedChildren={<SwapOutlined />}
                            />
                        </Tooltip>
                    )}
                </Space>
              )}
              <Tooltip title="Toggle Dark/Light Theme">
              <Switch
                checked={themeMode === 'dark'}
                onChange={handleThemeChange}
                checkedChildren={<MoonOutlined />}
                unCheckedChildren={<SunOutlined />}
              />
              </Tooltip>
              {activePage !== 'explore' && activePage !== 'overview' && (
                <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    onClick={() => setShowReportModal(true)}
                >
                    Generate Report
                </Button>
              )}
            </Space>
          </Header>

          <Content style={{ position: 'relative' }}>
            {/* The map container and its related UI are now always in the DOM */}
            <div style={{
                visibility: (activePage === 'explore' || activePage === 'overview') ? 'hidden' : 'visible',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%'
            }}>
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
                <MapWidgets />
            </div>
            
            {/* The active page content is rendered on top */}
            {renderPageContent()}
          </Content>
        </Layout>
      </Layout>
    </ErrorBoundary>
  );
}

export default App;