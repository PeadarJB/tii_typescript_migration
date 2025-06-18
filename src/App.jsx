// src/App.jsx

import React, { useState, useEffect, useRef } from 'react';
import { Layout, Menu, Button, Space, Spin, Card, message, Switch, Tooltip } from 'antd';
import { 
  DashboardOutlined, 
  WarningOutlined, 
  DownloadOutlined, 
  FilterOutlined, 
  BarChartOutlined,
  SwapOutlined 
} from '@ant-design/icons';
import { initializeMapView } from './components/MapView';
import EnhancedFilterPanel from './components/EnhancedFilterPanel';
import EnhancedStatsPanel from './components/EnhancedStatsPanel';
import EnhancedChartPanel from './components/EnhancedChartPanel';
import SimpleSwipePanel from './components/SimpleSwipePanel';
import SimpleReportGenerator from './components/SimpleReportGenerator';
import { CONFIG } from './config/appConfig';
import 'antd/dist/reset.css';

const { Header, Sider, Content } = Layout;

function App() {
  const [loading, setLoading] = useState(true);
  const [mapView, setMapView] = useState(null);
  const [webmap, setWebmap] = useState(null);
  const [roadLayer, setRoadLayer] = useState(null);
  const [error, setError] = useState(null);
  const [siderCollapsed, setSiderCollapsed] = useState(true);
  const siderRef = useRef(null);
  const [showFilters, setShowFilters] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [showSwipe, setShowSwipe] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [currentFilters, setCurrentFilters] = useState({});
  const [currentStats, setCurrentStats] = useState(null);
  const [initialExtent, setInitialExtent] = useState(null);
  const mapContainerRef = useRef(null);
  const initStarted = useRef(false);
  const [filterPanelKey, setFilterPanelKey] = useState(Date.now());
  const [isSwipeActive, setIsSwipeActive] = useState(false);

  useEffect(() => {
    const initMap = async () => {
      if (initStarted.current) return;
      initStarted.current = true;
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (!document.getElementById('viewDiv')) throw new Error('Map container not found');
        const { view, webmap } = await initializeMapView('viewDiv');
        const roadLayer = webmap.layers.find(layer => layer.title === CONFIG.roadNetworkLayerTitle);
        if (roadLayer) {
          await roadLayer.load();
          roadLayer.visible = false;
          setRoadLayer(roadLayer);
        } else {
          console.warn('Road network layer not found.');
        }
        setInitialExtent(view.extent.clone());
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
    initMap();
  }, []);

  const hasActiveFilters = Object.values(currentFilters).some(arr => Array.isArray(arr) && arr.length > 0);

  const handleFiltersChange = (filters) => {
    setCurrentFilters(filters);
    const isActive = Object.values(filters).some(arr => Array.isArray(arr) && arr.length > 0);
    if (!isActive) {
      setShowStats(false);
    }
  };

  const handleApplyFilters = () => {
    setShowStats(true);
  };

  const clearAllFilters = async () => {
    if (roadLayer) {
      roadLayer.definitionExpression = '1=1';
      roadLayer.visible = false;
    }
    if (initialExtent && mapView) {
      await mapView.goTo(initialExtent);
    }
    setCurrentFilters({});
    setShowStats(false);
    setFilterPanelKey(Date.now());
    message.info('All filters have been cleared.');
  };

  const handleFilterToggle = (checked) => {
    if (!checked && hasActiveFilters) {
      clearAllFilters();
    }
    setShowFilters(checked);
  };

  const handleSwipeToggle = (checked) => {
    setShowSwipe(checked);
    // If turning swipe ON, turn the other panels OFF to prevent conflicts
    if (checked) {
        if (showFilters) {
            handleFilterToggle(false);
        }
        if (showStats) {
            setShowStats(false);
        }
    }
  };

  if (error) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f0f2f5' }}>
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
    <Layout style={{ minHeight: '100vh' }}>
      <Sider ref={siderRef} collapsible collapsed={siderCollapsed} onCollapse={setSiderCollapsed} trigger={null} style={{ background: '#fff', transition: 'all 0.2s' }} onMouseEnter={() => setSiderCollapsed(false)} onMouseLeave={() => setSiderCollapsed(true)}>
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #f0f0f0', background: '#003d82', color: '#fff', fontWeight: 'bold', fontSize: '20px' }}>
          TII
        </div>
        <Menu mode="inline" defaultSelectedKeys={['1']} style={{ borderRight: 0 }} items={[{ key: '1', icon: <DashboardOutlined />, label: 'Dashboard' }, { key: '2', icon: <WarningOutlined />, label: 'Flood Analysis' }]} />
      </Sider>
      
      <Layout>
        <Header style={{ padding: '0 24px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0' }}>
          <h2 style={{ margin: 0 }}>TII Flood Risk Dashboard</h2>
          <Space>
            <Space size="small">
              <span>Panels:</span>
              <Tooltip title={showSwipe ? 'Filter panel cannot be open at the same time as the swipe panel' : ''}>
                <Switch
                  size="small"
                  checked={showFilters}
                  onChange={handleFilterToggle}
                  checkedChildren="Filter"
                  unCheckedChildren="Filter"
                  disabled={showSwipe}
                />
              </Tooltip>
              <Tooltip title={!hasActiveFilters ? 'Apply filters to view statistics' : showSwipe ? 'Stats panel cannot be open at the same time as the swipe panel' : ''}>
                <Switch
                  size="small"
                  checked={showStats}
                  onChange={setShowStats}
                  checkedChildren="Stats"
                  unCheckedChildren="Stats"
                  disabled={!hasActiveFilters || showSwipe}
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
            <Button type="primary" icon={<DownloadOutlined />} onClick={() => setShowReportModal(true)}>
              Generate Report
            </Button>
          </Space>
        </Header>
        
        <Content style={{ position: 'relative' }}>
          <div ref={mapContainerRef} id="viewDiv" style={{ width: '100%', height: 'calc(100vh - 64px)', position: 'relative' }} />
          
          {loading && ( <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(255, 255, 255, 0.9)', zIndex: 1000 }}> <Spin size="large" /> </div> )}
        
          {showReportModal && mapView && ( <SimpleReportGenerator view={mapView} roadLayer={roadLayer} activeFilters={currentFilters} statistics={currentStats} onClose={() => setShowReportModal(false)} /> )}
          
          {showFilters && roadLayer && mapView && ( <EnhancedFilterPanel key={filterPanelKey} view={mapView} webmap={webmap} roadLayer={roadLayer} onFiltersChange={handleFiltersChange} initialExtent={initialExtent} onApplyFilters={handleApplyFilters} onClearAll={clearAllFilters} /> )}
          
          {showChart && roadLayer && !loading && ( <EnhancedChartPanel roadLayer={roadLayer} /> )}
          
          {showSwipe && mapView && webmap && !loading && (
            <SimpleSwipePanel
              view={mapView}
              webmap={webmap}
              isSwipeActive={isSwipeActive}
              setIsSwipeActive={setIsSwipeActive}
            />
          )}
          
          {showStats && hasActiveFilters && roadLayer && !loading && ( <EnhancedStatsPanel roadLayer={roadLayer} onStatsChange={setCurrentStats} /> )}
          
          {showFilters && !roadLayer && !loading && ( <Card size="small" style={{ position: 'absolute', top: 16, right: 16, width: 300, background: '#fff3cd', borderColor: '#ffeaa7' }}> <p style={{ margin: 0, color: '#856404' }}>Cannot show filters: Road layer not found</p> <p style={{ margin: '8px 0 0 0', fontSize: 12, color: '#856404' }}>Looking for layer: "{CONFIG.roadNetworkLayerTitle}"</p> <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#856404' }}>Available layers: {webmap?.layers?.map(l => l.title).join(', ') || 'None'}</p> </Card> )}
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;