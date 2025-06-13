import React, { useEffect, useRef } from 'react';
import { Card, Spin } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';

/**
 * MapContainer - Wrapper component for the ArcGIS MapView
 * This component provides the container div for the map and handles
 * the integration between React and the ArcGIS Maps SDK
 */
const MapContainer = ({ appManager }) => {
  const mapDivRef = useRef(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    // The map should already be initialized by AppManager
    // This component just provides the container
    if (mapDivRef.current && !isInitialized.current) {
      isInitialized.current = true;
      
      // If the map view exists but isn't in the container, move it
      if (appManager?.components?.view && mapDivRef.current.children.length === 0) {
        appManager.components.view.container = mapDivRef.current;
      }
    }
  }, [appManager]);

  // Show loading state if app manager or view isn't ready
  if (!appManager?.components?.view) {
    return (
      <Card
        style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        bodyStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Spin size="large" tip="Loading map..." />
      </Card>
    );
  }

  return (
    <div 
      ref={mapDivRef}
      id="viewDiv"
      style={{ 
        width: '100%', 
        height: '100%',
        position: 'relative',
        outline: 'none'
      }}
    />
  );
};

export default MapContainer;