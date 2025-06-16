// src/components/SimpleSwipePanel.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Select, Button, Space, Slider, Radio, Tag, message } from 'antd';
import { SwapOutlined, CloseOutlined } from '@ant-design/icons';
import Swipe from '@arcgis/core/widgets/Swipe';
import { CONFIG } from '../config/appConfig';

// ** CHANGE **: Accept isSwipeActive and its setter from props, remove internal state
const SimpleSwipePanel = ({ view, webmap, isSwipeActive, setIsSwipeActive }) => {
  const [swipeWidget, setSwipeWidget] = useState(null);
  const [leftLayers, setLeftLayers] = useState([]);
  const [rightLayers, setRightLayers] = useState([]);
  const [direction, setDirection] = useState('horizontal');
  const [position, setPosition] = useState(50);
  // const [isActive, setIsActive] = useState(false); // This state is now managed by the parent

  const leftLayerOptions = CONFIG.swipeLayerConfig.leftPanel.layers;
  const rightLayerOptions = CONFIG.swipeLayerConfig.rightPanel.layers;

  // ** CHANGE **: Memoize the stopSwipe function to use in a cleanup effect
  const stopSwipe = useCallback(() => {
    if (swipeWidget) {
      const allLayerTitles = [...leftLayers, ...rightLayers];
      allLayerTitles.forEach(title => {
        const layer = view.map.allLayers.find(l => l.title === title);
        if (layer) {
          layer.visible = false;
        }
      });

      view.ui.remove(swipeWidget);
      swipeWidget.destroy();
      
      setSwipeWidget(null);
      setIsSwipeActive(false); // Update parent state
      message.info('Layer comparison deactivated');
    }
  }, [swipeWidget, view, leftLayers, rightLayers, setIsSwipeActive]);

  // ** CHANGE **: This effect handles cleanup. It runs when the component unmounts
  // (e.g., when the swipe toggle in the header is turned off).
  useEffect(() => {
    // Return a cleanup function
    return () => {
      stopSwipe();
    };
  }, [stopSwipe]); // The dependency ensures the latest stopSwipe function is used

  const findLayer = (title) => {
    return webmap.allLayers.find(l => l.title === title);
  };

  const startSwipe = async () => {
    if (!view || !webmap) return;

    try {
      const leftLayerObjects = leftLayers.map(title => findLayer(title)).filter(Boolean);
      const rightLayerObjects = rightLayers.map(title => findLayer(title)).filter(Boolean);

      if (leftLayerObjects.length === 0 || rightLayerObjects.length === 0) {
        message.warning('Please select at least one layer for each side');
        return;
      }

      [...leftLayerObjects, ...rightLayerObjects].forEach(layer => {
        layer.visible = true;
      });

      const swipe = new Swipe({
        view: view,
        leadingLayers: leftLayerObjects,
        trailingLayers: rightLayerObjects,
        direction: direction,
        position: position
      });

      view.ui.add(swipe);
      
      setSwipeWidget(swipe);
      setIsSwipeActive(true); // Update parent state
      message.success('Layer comparison activated');
    } catch (error) {
      console.error('Failed to create swipe:', error);
      message.error('Failed to activate layer comparison');
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
          {isSwipeActive && <Tag color="green">Active</Tag>}
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
            disabled={isSwipeActive}
            options={leftLayerOptions.map(layer => ({
              label: layer.label,
              value: layer.title
            }))}
          />
        </div>
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
            disabled={isSwipeActive}
            options={rightLayerOptions.map(layer => ({
              label: layer.label,
              value: layer.title
            }))}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            Swipe Direction:
          </label>
          <Radio.Group 
            value={direction} 
            onChange={(e) => updateDirection(e.target.value)}
            disabled={!isSwipeActive}
          >
            <Radio.Button value="horizontal">Horizontal</Radio.Button>
            <Radio.Button value="vertical">Vertical</Radio.Button>
          </Radio.Group>
        </div>
        {isSwipeActive && (
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Position: {position}%
            </label>
            <Slider
              value={position}
              onChange={updatePosition}
              marks={{ 0: '0%', 50: '50%', 100: '100%' }}
            />
          </div>
        )}
        <Button
          type={isSwipeActive ? 'default' : 'primary'}
          icon={isSwipeActive ? <CloseOutlined /> : <SwapOutlined />}
          onClick={isSwipeActive ? stopSwipe : startSwipe}
          block
          danger={isSwipeActive}
        >
          {isSwipeActive ? 'Stop Comparison' : 'Start Comparison'}
        </Button>
      </Space>
    </Card>
  );
};

export default SimpleSwipePanel;