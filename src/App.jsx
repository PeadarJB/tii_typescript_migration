import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Space, Spin, Card, message, Switch } from 'antd';
import { DashboardOutlined, WarningOutlined, DownloadOutlined, FilterOutlined } from '@ant-design/icons';
import { initializeMapView } from './components/MapView';
import SimpleFilterPanel from './components/SimpleFilterPanel';
import { CONFIG } from './config/appConfig';
import 'antd/dist/reset.css';

const { Header, Sider, Content } = Layout;

function App() {
  const [loading, setLoading] = useState(true);
  const [mapView, setMapView] = useState(null);
  const [webmap, setWebmap] = useState(null);
  const [roadLayer, setRoadLayer] = useState(null);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const initMap = async () => {
      try {
        console.log('Initializing map...');
        
        // Wait a bit to ensure DOM is ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const { view, webmap } = await initializeMapView('viewDiv');
        
        // Find road network layer
        const roadLayer = webmap.layers.find(
          layer => layer.title === CONFIG.roadNetworkLayerTitle
        );
        
        if (roadLayer) {
          await roadLayer.load();
          console.log('Road network layer loaded');
          setRoadLayer(roadLayer);
        } else {
          console.warn('Road network layer not found');
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

    // Only initialize if not already loading/loaded
    if (loading && !mapView) {
      initMap();
    }
  }, []); // Remove strict mode double-initialization issue

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
          
          <Space>
            <Space size="small">
              <span>Show Filters:</span>
              <Switch
                checked={showFilters}
                onChange={setShowFilters}
                checkedChildren={<FilterOutlined />}
                unCheckedChildren={<FilterOutlined />}
              />
            </Space>
            
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={() => message.info('Report generation coming in Phase 2')}
            >
              Generate Report
            </Button>
          </Space>
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
              <li>✅ County Filter (NEW!)</li>
              <li>⏳ Statistics & Analysis (Phase 2)</li>
            </ul>
          </Card>
          
          {/* Filter Panel - Conditionally Rendered */}
          {showFilters && roadLayer && (
            <SimpleFilterPanel
              view={mapView}
              webmap={webmap}
              roadLayer={roadLayer}
            />
          )}
          
          {/* Debug info */}
          {showFilters && !roadLayer && (
            <Card
              size="small"
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                width: 300,
                background: '#fff3cd',
                borderColor: '#ffeaa7',
              }}
            >
              <p style={{ margin: 0, color: '#856404' }}>
                Waiting for road layer to load...
              </p>
              <p style={{ margin: 0, fontSize: 12, color: '#856404' }}>
                showFilters: {String(showFilters)}<br/>
                roadLayer: {String(!!roadLayer)}<br/>
                mapView: {String(!!mapView)}
              </p>
            </Card>
          )}
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;