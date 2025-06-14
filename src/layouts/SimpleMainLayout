import React, { useState } from 'react';
import {
  Layout,
  Menu,
  Button,
  Space,
  Avatar,
  Dropdown,
  Typography,
  Card,
  Spin,
  message
} from 'antd';
import {
  DashboardOutlined,
  FilterOutlined,
  BarChartOutlined,
  SwapOutlined,
  DownloadOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  WarningOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import MapContainer from '../components/MapContainer';
import { theme } from '../config/themeConfig';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const SimpleMainLayout = ({ appManager, error }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState(['dashboard']);

  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: 'analysis',
      icon: <WarningOutlined />,
      label: 'Flood Analysis',
      children: [
        {
          key: 'filters',
          icon: <FilterOutlined />,
          label: 'Filters',
        },
        {
          key: 'statistics',
          icon: <BarChartOutlined />,
          label: 'Statistics',
        },
        {
          key: 'comparison',
          icon: <SwapOutlined />,
          label: 'Layer Comparison',
        },
      ],
    },
  ];

  const userMenuItems = [
    {
      key: 'settings',
      label: 'Settings',
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

  if (error) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Card>
            <Space direction="vertical" align="center">
              <WarningOutlined style={{ fontSize: 48, color: theme.token.colorError }} />
              <h2>Error Loading Application</h2>
              <p>{error}</p>
            </Space>
          </Card>
        </Content>
      </Layout>
    );
  }

  if (!appManager || !appManager.components.view) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Spin size="large" tip="Loading application..." />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        style={{ background: '#fff' }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid #f0f0f0',
        }}>
          <div style={{
            width: 32,
            height: 32,
            background: theme.token.colorPrimary,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            color: '#fff',
          }}>
            TII
          </div>
          {!collapsed && (
            <Text strong style={{ marginLeft: 8 }}>
              Flood Risk
            </Text>
          )}
        </div>
        <Menu
          mode="inline"
          selectedKeys={selectedKeys}
          onClick={({ key }) => setSelectedKeys([key])}
          items={menuItems}
          style={{ borderRight: 0 }}
        />
      </Sider>
      
      <Layout>
        <Header style={{
          padding: '0 24px',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          
          <Space>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={() => message.info('Report generation coming soon')}
            >
              Generate Report
            </Button>
            
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Avatar style={{ backgroundColor: theme.token.colorPrimary, cursor: 'pointer' }}>
                U
              </Avatar>
            </Dropdown>
          </Space>
        </Header>
        
        <Content style={{ margin: 0, height: 'calc(100vh - 64px)', position: 'relative' }}>
          <MapContainer appManager={appManager} />
          
          {/* Simple info card overlay */}
          <Card
            size="small"
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              width: 300,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
            title="TII Flood Risk Dashboard"
          >
            <p style={{ margin: 0 }}>
              Phase 1 Implementation - Map view is active.
              Filters and analysis tools coming in Phase 2.
            </p>
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
};

export default SimpleMainLayout;