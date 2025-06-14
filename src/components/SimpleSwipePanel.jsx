import React, { useState, useEffect } from 'react';
import { Card, Select, Button, Space, Slider, Radio, Tag, message } from 'antd';
import { SwapOutlined, CloseOutlined } from '@ant-design/icons';
import Swipe from '@arcgis/core/widgets/Swipe';
import { CONFIG } from '../config/appConfig';

const SimpleSwipePanel = ({ view, webmap }) => {
  const [swipeWidget, setSwipeWidget] = useState(null);
  const [leftLayers, setLeftLayers] = useState([]);
  const [rightLayers, setRightLayers] = useState([]);
  const [direction, setDirection] = useState('horizontal');
  const [position, setPosition] = useState(50);
  const [isActive, setIsActive] = useState(false);

  // Get layer options from config
  const leftLayerOptions = CONFIG.swipeLayerConfig.leftPanel.layers;
  const rightLayerOptions = CONFIG.swipeLayerConfig.rightPanel.layers;

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (swipeWidget) {
        view.ui.remove(swipeWidget);
        swipeWidget.destroy();
      }
    };
  }, []);

  const findLayer = (title) => {
    // Find layer in webmap
    let layer = webmap.layers.find(l => l.title === title);
    
    // Check in sublayers if not found
    if (!layer) {
      webmap.layers.forEach(parentLayer => {
        if (parentLayer.layers) {
          const found = parentLayer.layers.find(l => l.title === title);
          if (found) layer = found;
        }
      });
    }
    
    return layer;
  };

  const startSwipe = async () => {
    if (!view || !webmap) return;

    try {
      // Find selected layers
      const leftLayerObjects = leftLayers.map(title => findLayer(title)).filter(Boolean);
      const rightLayerObjects = rightLayers.map(title => findLayer(title)).filter(Boolean);

      if (leftLayerObjects.length === 0 || rightLayerObjects.length === 0) {
        message.warning('Please select at least one layer for each side');
        return;
      }

      // Make selected layers visible
      [...leftLayerObjects, ...rightLayerObjects].forEach(layer => {
        layer.visible = true;
      });

      // Create swipe widget
      const swipe = new Swipe({
        view: view,
        leadingLayers: leftLayerObjects,
        trailingLayers: rightLayerObjects,
        direction: direction,
        position: position
      });

      // Add to view
      view.ui.add(swipe);
      
      setSwipeWidget(swipe);
      setIsActive(true);
      message.success('Layer comparison activated');
    } catch (error) {
      console.error('Failed to create swipe:', error);
      message.error('Failed to activate layer comparison');
    }
  };

  const stopSwipe = () => {
    if (swipeWidget) {
      // Hide layers
      const allLayers = [...leftLayers, ...rightLayers]
        .map(title => findLayer(title))
        .filter(Boolean);
      
      allLayers.forEach(layer => {
        layer.visible = false;
      });

      // Remove and destroy widget
      view.ui.remove(swipeWidget);
      swipeWidget.destroy();
      
      setSwipeWidget(null);
      setIsActive(false);
      message.info('Layer comparison deactivated');
    }
  };

  const updatePosition = (value) => {
    setPosition(value);
    if (swipeWidget) {
      swipeWidget.position = value;
    }
  };

  const updateDirection = (value) => {
    setDirection(value);
    if (swipeWidget) {
      swipeWidget.direction = value;
    }
  };

  return (
    <Card
      title={
        <Space>
          <SwapOutlined />
          <span>Layer Comparison</span>
          {isActive && <Tag color="green">Active</Tag>}
        </Space>
      }
      size="small"
      style={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        width: 350,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* Left Layers */}
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            Left/Top Layers (RCP 4.5):
          </label>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="Select RCP 4.5 layers..."
            value={leftLayers}
            onChange={setLeftLayers}
            disabled={isActive}
            options={leftLayerOptions.map(layer => ({
              label: layer.label,
              value: layer.title
            }))}
          />
        </div>

        {/* Right Layers */}
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            Right/Bottom Layers (RCP 8.5):
          </label>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="Select RCP 8.5 layers..."
            value={rightLayers}
            onChange={setRightLayers}
            disabled={isActive}
            options={rightLayerOptions.map(layer => ({
              label: layer.label,
              value: layer.title
            }))}
          />
        </div>

        {/* Direction */}
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            Swipe Direction:
          </label>
          <Radio.Group 
            value={direction} 
            onChange={(e) => updateDirection(e.target.value)}
            disabled={!isActive}
          >
            <Radio.Button value="horizontal">Horizontal</Radio.Button>
            <Radio.Button value="vertical">Vertical</Radio.Button>
          </Radio.Group>
        </div>

        {/* Position Slider */}
        {isActive && (
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Position: {position}%
            </label>
            <Slider
              value={position}
              onChange={updatePosition}
              marks={{
                0: '0%',
                50: '50%',
                100: '100%'
              }}
            />
          </div>
        )}

        {/* Action Button */}
        <Button
          type={isActive ? 'default' : 'primary'}
          icon={isActive ? <CloseOutlined /> : <SwapOutlined />}
          onClick={isActive ? stopSwipe : startSwipe}
          block
          danger={isActive}
        >
          {isActive ? 'Stop Comparison' : 'Start Comparison'}
        </Button>
      </Space>
    </Card>
  );
};

export default SimpleSwipePanel;