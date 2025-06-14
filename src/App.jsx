import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Space, Spin, Card, message } from 'antd';
import { DashboardOutlined, WarningOutlined, DownloadOutlined } from '@ant-design/icons';
import { initializeMapView } from './components/MapView';
import { CONFIG } from './config/appConfig';
import 'antd/dist/reset.css';

const { Header, Sider, Content } = Layout;

function App() {
  const [loading, setLoading] = useState(true);
  const [mapView, setMapView] = useState(null);
  const [webmap, setWebmap] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initMap = async () => {
      try {
        console.log('Initializing map...');
        const { view, webmap } = await initializeMapView('viewDiv');
        
        // Find road network layer
        const roadLayer = webmap.layers.find(
          layer => layer.title === CONFIG.roadNetworkLayerTitle
        );
        
        if (roadLayer) {
          await roadLayer.load();
          console.log('Road network layer loaded');
        }
        
        setMapView(view);
        setWebmap(webmap);
        setLoading(false);
        message.success('Application loaded successfully');
      } catch (err) {
        console.error('Failed to initialize:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    initMap();
  }, []);

  if (loading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        background: '#f0f2f5'
      }}>
        <Spin size="large" tip="Loading TII Flood Risk Dashboard..." />
      </div>
    );
  }

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
          </Space>
        </Card>
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        collapsible 
        style={{ background: '#fff' }}
        defaultCollapsed={false}
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
          items={[
            {
              key: '1',
              icon: <DashboardOutlined />,
              label: 'Dashboard',
            },
            {
              key: '2',
              icon: <WarningOutlined />,
              label: 'Flood Analysis',
            },
          ]}
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
          <h2 style={{ margin: 0 }}>TII Flood Risk Dashboard</h2>
          
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => message.info('Report generation coming in Phase 2')}
          >
            Generate Report
          </Button>
        </Header>
        
        <Content style={{ position: 'relative' }}>
          <div id="viewDiv" style={{ width: '100%', height: 'calc(100vh - 64px)' }} />
          
          <Card
            size="small"
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              width: 300,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
            title="Welcome"
          >
            <p>
              Phase 1 Implementation Complete
            </p>
            <ul style={{ paddingLeft: 20, margin: '10px 0' }}>
              <li>✅ Ant Design UI Framework</li>
              <li>✅ ArcGIS Map Integration</li>
              <li>✅ Basic Layout Structure</li>
              <li>⏳ Filters & Analysis (Phase 2)</li>
            </ul>
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;