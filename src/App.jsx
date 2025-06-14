import React, { useState, useEffect, useRef } from 'react';
import { Layout, Menu, Button, Space, Spin, Card, message, Switch } from 'antd';
import { DashboardOutlined, WarningOutlined, DownloadOutlined, FilterOutlined, BarChartOutlined } from '@ant-design/icons';
import { initializeMapView } from './components/MapView';
import SimpleFilterPanel from './components/SimpleFilterPanel';
import SimpleStatsPanel from './components/SimpleStatsPanel';
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
  const [showStats, setShowStats] = useState(true);
  const mapContainerRef = useRef(null);
  const initStarted = useRef(false);

  useEffect(() => {
    const initMap = async () => {
      // Prevent multiple initializations
      if (initStarted.current) return;
      initStarted.current = true;

      try {
        console.log('Waiting for map container...');
        
        // Wait for the map container to be in the DOM
        let retries = 0;
        while (!document.getElementById('viewDiv') && retries < 20) {
          await new Promise(resolve => setTimeout(resolve, 100));
          retries++;
        }

        if (!document.getElementById('viewDiv')) {
          throw new Error('Map container not found after waiting');
        }

        console.log('Map container found, initializing map...');
        const { view, webmap } = await initializeMapView('viewDiv');
        
        // Find road network layer
        const roadLayer = webmap.layers.find(
          layer => layer.title === CONFIG.roadNetworkLayerTitle
        );
        
        if (roadLayer) {
          await roadLayer.load();
          console.log('Road network layer loaded:', roadLayer.title);
          setRoadLayer(roadLayer);
        } else {
          console.warn('Road network layer not found. Available layers:', 
            webmap.layers.map(l => l.title).join(', '));
        }
        
        setMapView(view);
        setWebmap(webmap);
        setLoading(false);
        message.success('Application loaded successfully');
      } catch (err) {
        console.error('Failed to initialize:', err);
        setError(err.message || 'Failed to initialize map');
        setLoading(false);
      }
    };

    // Start initialization after a short delay
    const timer = setTimeout(initMap, 100);
    return () => clearTimeout(timer);
  }, []);

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
            <Button onClick={() => window.location.reload()}>
              Reload Page
            </Button>
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
              <span>Panels:</span>
              <Switch
                checked={showFilters}
                onChange={setShowFilters}
                checkedChildren="Filters"
                unCheckedChildren="Filters"
                style={{ minWidth: 70 }}
              />
              <Switch
                checked={showStats}
                onChange={setShowStats}
                checkedChildren="Stats"
                unCheckedChildren="Stats"
                style={{ minWidth: 60 }}
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
          {/* Map Container */}
          <div 
            ref={mapContainerRef}
            id="viewDiv" 
            style={{ 
              width: '100%', 
              height: 'calc(100vh - 64px)',
              position: 'relative'
            }} 
          />
          
          {/* Loading Overlay */}
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
          
          {/* Welcome Card */}
          {!loading && (
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
                <li>✅ Enhanced Filters with Flood Scenarios</li>
                <li>✅ Real-time Statistics Panel</li>
                <li>⏳ Charts & Analysis (Phase 2)</li>
              </ul>
            </Card>
          )}
          
          {/* Filter Panel - Conditionally Rendered */}
          {showFilters && roadLayer && mapView && (
            <SimpleFilterPanel
              view={mapView}
              webmap={webmap}
              roadLayer={roadLayer}
            />
          )}
          
          {/* Statistics Panel */}
          {showStats && roadLayer && !loading && (
            <SimpleStatsPanel roadLayer={roadLayer} />
          )}
          
          {/* Debug info */}
          {showFilters && !roadLayer && !loading && (
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
                Cannot show filters: Road layer not found
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: 12, color: '#856404' }}>
                Looking for layer: "{CONFIG.roadNetworkLayerTitle}"
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#856404' }}>
                Available layers: {webmap?.layers?.map(l => l.title).join(', ') || 'None'}
              </p>
            </Card>
          )}
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;