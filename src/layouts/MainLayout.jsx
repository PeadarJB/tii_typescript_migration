import React, { useState } from 'react';
import {
  GoldOutlined,
  DashboardOutlined,
  FilterOutlined,
  BarChartOutlined,
  SlidersOutlined,
  FileTextOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  WarningOutlined,
  EnvironmentOutlined,
  SwapOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { ProLayout, ProCard } from '@ant-design/pro-components';
import { Button, Space, Badge, Avatar, Dropdown, Switch, Typography, Empty } from 'antd';
import MapContainer from '../components/MapContainer';
import FilterPanel from '../components/panels/FilterPanel';
import StatisticsPanel from '../components/panels/StatisticsPanel';
// import ChartPanel from '../components/panels/ChartPanel';
import SwipePanel from '../components/panels/SwipePanel';
import { theme } from '../config/themeConfig';

const { Text } = Typography;

// Define the route configuration
const menuRoutes = {
  route: {
    path: '/',
    routes: [
      {
        path: '/dashboard',
        name: 'Dashboard',
        icon: <DashboardOutlined />,
        component: 'Dashboard',
      },
      {
        path: '/analysis',
        name: 'Flood Analysis',
        icon: <WarningOutlined />,
        routes: [
          {
            path: '/analysis/map',
            name: 'Map View',
            icon: <EnvironmentOutlined />,
            component: 'MapView',
          },
          {
            path: '/analysis/filters',
            name: 'Filters',
            icon: <FilterOutlined />,
            component: 'Filters',
          },
          {
            path: '/analysis/statistics',
            name: 'Statistics',
            icon: <BarChartOutlined />,
            component: 'Statistics',
          },
          {
            path: '/analysis/comparison',
            name: 'Layer Comparison',
            icon: <SwapOutlined />,
            component: 'Comparison',
          },
        ],
      },
      {
        path: '/infrastructure',
        name: 'Infrastructure',
        icon: <GoldOutlined />,
        routes: [
          {
            path: '/infrastructure/roads',
            name: 'Road Network',
            icon: <GoldOutlined />,
            component: 'RoadNetwork',
          },
          {
            path: '/infrastructure/critical',
            name: 'Critical Routes',
            icon: <WarningOutlined />,
            component: 'CriticalRoutes',
          },
        ],
      },
      {
        path: '/reports',
        name: 'Reports',
        icon: <FileTextOutlined />,
        component: 'Reports',
      },
      {
        path: '/settings',
        name: 'Settings',
        icon: <SettingOutlined />,
        component: 'Settings',
      },
    ],
  },
  location: {
    pathname: '/dashboard',
  },
};

const MainLayout = ({ appManager, error }) => {
  const [pathname, setPathname] = useState('/dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [showStatistics, setShowStatistics] = useState(true);
  const [showChart, setShowChart] = useState(false);
  const [showSwipe, setShowSwipe] = useState(false);

  // User menu items
  const userMenuItems = [
    {
      key: 'profile',
      label: 'Profile Settings',
      icon: <SettingOutlined />,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: 'Logout',
      danger: true,
    },
  ];

  // Right toolbar content
  const rightContentRender = () => (
    <Space size="middle" style={{ marginRight: 16 }}>
      {/* View mode toggles */}
      <Space size="small">
        <Text type="secondary" style={{ fontSize: 12 }}>Panels:</Text>
        <Switch
          checkedChildren="Filters"
          unCheckedChildren="Filters"
          checked={showFilters}
          onChange={setShowFilters}
          size="small"
        />
        <Switch
          checkedChildren="Stats"
          unCheckedChildren="Stats"
          checked={showStatistics}
          onChange={setShowStatistics}
          size="small"
        />
        <Switch
          checkedChildren="Charts"
          unCheckedChildren="Charts"
          checked={showChart}
          onChange={setShowChart}
          size="small"
        />
      </Space>

      {/* Action buttons */}
      <Button
        type={showSwipe ? 'primary' : 'default'}
        icon={<SwapOutlined />}
        onClick={() => setShowSwipe(!showSwipe)}
      >
        Layer Comparison
      </Button>
      
      <Button
        type="primary"
        icon={<DownloadOutlined />}
        onClick={() => appManager?.components?.reportGenerator?.generateReport()}
      >
        Generate Report
      </Button>

      {/* User dropdown */}
      <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
        <Badge dot status="success">
          <Avatar
            size="small"
            style={{ backgroundColor: theme.token.colorPrimary }}
          >
            TII
          </Avatar>
        </Badge>
      </Dropdown>
    </Space>
  );

  // Main content renderer based on current path
  const renderContent = () => {
    if (error) {
      return (
        <ProCard
          style={{ height: '100%' }}
          bodyStyle={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <WarningOutlined style={{ fontSize: 48, color: theme.token.colorError }} />
            <h2>Error Loading Application</h2>
            <p>{error}</p>
          </div>
        </ProCard>
      );
    }

    // For now, always show the map view as the main content
    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Map Container - Main View */}
        <div style={{ flex: 1, position: 'relative' }}>
          <MapContainer appManager={appManager} />
          
          {/* Floating panels */}
          {showFilters && (
            <div style={{
              position: 'absolute',
              top: 16,
              left: 16,
              width: 320,
              maxHeight: 'calc(100% - 32px)',
              zIndex: 10,
            }}>
              <FilterPanel appManager={appManager} />
            </div>
          )}
          
          {showStatistics && (
            <div style={{
              position: 'absolute',
              bottom: 16,
              left: 16,
              width: 320,
              zIndex: 10,
            }}>
              <StatisticsPanel appManager={appManager} />
            </div>
          )}
          
          {showChart && (
            <div style={{
              position: 'absolute',
              top: 16,
              right: 16,
              width: 400,
              maxHeight: 'calc(100% - 32px)',
              zIndex: 10,
            }}>
              {/* Temporarily disabled due to lodash issue */}
              {/* <ChartPanel appManager={appManager} /> */}
              <ProCard
                title="Charts"
                size="small"
                bordered
                style={{ boxShadow: theme.token.boxShadowSecondary }}
              >
                <Empty description="Charts will be available in Phase 2" />
              </ProCard>
            </div>
          )}
          
          {showSwipe && (
            <div style={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              width: 360,
              zIndex: 10,
            }}>
              <SwipePanel 
                appManager={appManager} 
                onClose={() => setShowSwipe(false)} 
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <ProLayout
      title="TII Flood Risk Dashboard"
      logo="https://www.tii.ie/globalassets/images/about/tii-logo.svg"
      layout="mix"
      splitMenus={false}
      collapsed={collapsed}
      onCollapse={setCollapsed}
      collapsedButtonRender={(collapsed) => (
        <Button
          type="text"
          onClick={() => setCollapsed(!collapsed)}
          style={{ width: '100%', textAlign: 'center' }}
        >
          {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        </Button>
      )}
      breadcrumbRender={false}
      menuHeaderRender={(logo, title) => (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '16px 0',
          }}
        >
          {logo}
          {!collapsed && title}
        </div>
      )}
      menuItemRender={(item, dom) => (
        <a
          onClick={() => {
            setPathname(item.path || '/dashboard');
          }}
        >
          {dom}
        </a>
      )}
      rightContentRender={rightContentRender}
      {...menuRoutes}
      location={{ pathname }}
      token={{
        header: {
          colorBgHeader: theme.token.colorPrimary,
          colorHeaderTitle: '#fff',
          colorTextMenu: '#fff',
          colorTextMenuSecondary: '#fff',
          colorTextMenuSelected: '#fff',
          colorBgMenuItemSelected: 'rgba(255,255,255,0.2)',
          colorTextMenuActive: '#fff',
          colorTextRightActionsItem: '#fff',
        },
        sider: {
          colorMenuBackground: '#fff',
          colorTextMenu: theme.token.colorText,
          colorTextMenuSelected: theme.token.colorPrimary,
          colorBgMenuItemSelected: theme.token.colorPrimaryBg,
          colorTextMenuActive: theme.token.colorPrimary,
          colorBgMenuItemHover: theme.token.colorPrimaryBg,
          colorTextMenuItemHover: theme.token.colorPrimary,
          colorBgCollapsedButton: '#fff',
          colorTextCollapsedButton: theme.token.colorText,
        },
        pageContainer: {
          paddingBlockPageContainerContent: 0,
          paddingInlinePageContainerContent: 0,
        },
      }}
      bgLayoutImgList={[
        {
          src: 'https://img.alicdn.com/imgextra/i3/O1CN01Rn3ZZv1aSuXbDF8V0_!!6000000003330-2-tps-884-496.png',
          left: 85,
          bottom: 100,
          height: '303px',
        },
        {
          src: 'https://img.alicdn.com/imgextra/i3/O1CN01Rn3ZZv1aSuXbDF8V0_!!6000000003330-2-tps-884-496.png',
          bottom: -68,
          right: -45,
          height: '303px',
        },
        {
          src: 'https://img.alicdn.com/imgextra/i3/O1CN01d5GmOO1XyXNAN0qfp_!!6000000002993-2-tps-884-496.png',
          bottom: 0,
          left: 0,
          width: '331px',
          opacity: 0.05,
        },
      ]}
    >
      {renderContent()}
    </ProLayout>
  );
};

export default MainLayout;