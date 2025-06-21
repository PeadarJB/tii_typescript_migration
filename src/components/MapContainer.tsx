// src/components/MapContainer.tsx - Updated to work with Zustand Store

import React, { useEffect, useRef, FC } from 'react';
import { Card, Spin } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';

// Store imports
import { useMapState } from '@/store/useAppStore';

/**
 * MapContainer - Wrapper component for the ArcGIS MapView
 * This component provides the container div for the map and handles
 * the integration between React and the ArcGIS Maps SDK
 */

interface MapContainerProps {
  className?: string;
  style?: React.CSSProperties;
}

const MapContainer: FC<MapContainerProps> = ({ 
  className,
  style 
}) => {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);
  
  // Get map state from store
  const { mapView, loading } = useMapState();

  useEffect(() => {
    // The map should already be initialized by the store
    // This component just provides the container
    if (mapDivRef.current && !isInitialized.current && mapView) {
      isInitialized.current = true;
      
      // If the map view exists but isn't in the container, move it
      if (mapDivRef.current.children.length === 0) {
        // Type assertion needed as container property might be HTMLDivElement or string
        mapView.container = mapDivRef.current as any;
      }
    }
  }, [mapView]);

  // Show loading state if map isn't ready
  if (loading || !mapView) {
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