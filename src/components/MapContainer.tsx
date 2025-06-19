import React, { useEffect, useRef } from 'react';
import { Card, Spin } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import type MapView from '@arcgis/core/views/MapView';

/**
 * MapContainer - Wrapper component for the ArcGIS MapView
 * This component provides the container div for the map and handles
 * the integration between React and the ArcGIS Maps SDK
 */

interface MapContainerProps {
  appManager?: {
    components?: {
      view?: MapView;
      [key: string]: any;
    };
    [key: string]: any;
  };
  className?: string;
  style?: React.CSSProperties;
}

const MapContainer: React.FC<MapContainerProps> = ({ 
  appManager,
  className,
  style 
}) => {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    // The map should already be initialized by AppManager
    // This component just provides the container
    if (mapDivRef.current && !isInitialized.current) {
      isInitialized.current = true;
      
      // If the map view exists but isn't in the container, move it
      if (appManager?.components?.view && mapDivRef.current.children.length === 0) {
        // Type assertion needed as container property might be HTMLDivElement or string
        appManager.components.view.container = mapDivRef.current as any;
      }
    }
  }, [appManager]);

  // Show loading state if app manager or view isn't ready
  if (!appManager?.components?.view) {
    return (
      <Card
        style={{ 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          ...style 
        }}
        bodyStyle={{ 
          width: '100%', 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}
        className={className}
      >
        <Spin 
          size="large" 
          tip="Loading map..." 
          indicator={<EnvironmentOutlined style={{ fontSize: 48 }} spin />}
        />
      </Card>
    );
  }

  return (
    <div 
      ref={mapDivRef}
      id="viewDiv"
      className={className}
      style={{ 
        width: '100%', 
        height: '100%',
        position: 'relative',
        outline: 'none',
        ...style
      }}
    />
  );
};

export default MapContainer;