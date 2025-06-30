// App.tsx - Refactored for Multi-Page Structure

import { useEffect, useRef, FC } from 'react';
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
  SwapOutlined, // Import SwapOutlined for the Swipe button icon
} from '@ant-design/icons';
import { ErrorBoundary } from 'react-error-boundary';
import { ThemeProvider } from 'antd-style';

import { lightTheme, darkTheme } from './config/themeConfig';

// Page and Widget imports
import { FutureHazardPage, PastFloodPage } from '@/pages';
import MapWidgets from '@/components/MapWidgets'; // Import the new component
import { PAGE_CONFIG } from './config/appConfig'; // Import the new page config

// Store imports
import { useAppStore, useMapState, useUIState, useFilterState, useThemeState } from '@/store/useAppStore';
import type { AppPage } from '@/types';

// Style imports
import { useCommonStyles } from '@/styles/styled';

import 'antd/dist/reset.css';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

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

// A simple placeholder for pages that are not yet built
const PlaceholderPage: FC<{pageName: string}> = ({ pageName }) => (
    <div style={{ padding: 50, textAlign: 'center' }}>
        <Title level={3}>'{pageName}' Page</Title>
        <Text>This content will be built in the next steps.</Text>
    </div>
);


function AppContent(): ReactElement {
  const { styles, theme } = useCommonStyles();

  // Store hooks
  const { loading, error } = useMapState();
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
  ];

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
  
  const renderActivePage = () => {
    switch (activePage) {
        case 'future':
            return <FutureHazardPage />;
        case 'past':
            return <PastFloodPage />;
        case 'precipitation':
            return <PlaceholderPage pageName={PAGE_CONFIG.precipitation.title} />;
        case 'explore':
            return <PlaceholderPage pageName={PAGE_CONFIG.explore.title} />;
        default:
            return <FutureHazardPage />;
    }
  };

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
          <div className={styles.siderLogo}>TII</div>
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
              {(activePage === 'future' || activePage === 'past') && (
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
                    {activePage === 'future' && (
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

            <MapWidgets />
            
            {renderActivePage()}

          </Content>
        </Layout>
      </Layout>
    </ErrorBoundary>
  );
}

export default App;