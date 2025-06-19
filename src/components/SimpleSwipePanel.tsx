// src/components/SimpleSwipePanel.tsx

import { useState, useEffect, useCallback, FC } from 'react';
import { Card, Select, Button, Space, Slider, Radio, Tag, message } from 'antd';
import { SwapOutlined, CloseOutlined } from '@ant-design/icons';

// FIX: Import the real types directly from the ArcGIS SDK and our types file
import type MapView from '@arcgis/core/views/MapView';
import type WebMap from '@arcgis/core/WebMap';
import type Swipe from '@arcgis/core/widgets/Swipe';
import type Layer from '@arcgis/core/layers/Layer';
import type { LayerConfig } from '@/types/index';
import { CONFIG } from '@/config/appConfig';

// FIX: Define the component's props with the correct types
interface SimpleSwipePanelProps {
  view: MapView;
  webmap: WebMap;
  isSwipeActive: boolean;
  setIsSwipeActive: (active: boolean) => void;
}

const SimpleSwipePanel: FC<SimpleSwipePanelProps> = ({
  view,
  webmap,
  isSwipeActive,
  setIsSwipeActive,
}) => {
  // FIX: Provide explicit types for the state variables
  const [swipeWidget, setSwipeWidget] = useState<Swipe | null>(null);
  const [leftLayers, setLeftLayers] = useState<string[]>([]);
  const [rightLayers, setRightLayers] = useState<string[]>([]);
  const [direction, setDirection] = useState<'horizontal' | 'vertical'>('horizontal');
  const [position, setPosition] = useState(50);

  // FIX: Ensure the local variables correctly handle the 'readonly' type from the config
  const leftLayerOptions: readonly LayerConfig[] = CONFIG.swipeLayerConfig.leftPanel.layers;
  const rightLayerOptions: readonly LayerConfig[] = CONFIG.swipeLayerConfig.rightPanel.layers;

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
      setIsSwipeActive(false);
      message.info('Layer comparison deactivated');
    }
  }, [swipeWidget, view, leftLayers, rightLayers, setIsSwipeActive]);

  useEffect(() => {
    // Return a cleanup function to be called when the component unmounts
    return () => {
      stopSwipe();
    };
  }, [stopSwipe]);

  const findLayer = (title: string): Layer | undefined => {
    return webmap.allLayers.find((l: Layer) => l.title === title);
  };

  const startSwipe = async () => {
    const SwipeWidget = (await import('@arcgis/core/widgets/Swipe')).default;

    if (!view || !webmap) {
      return;
    }

    try {
      const leftLayerObjects = leftLayers.map(title => findLayer(title)).filter((l): l is Layer => l !== undefined);
      const rightLayerObjects = rightLayers.map(title => findLayer(title)).filter((l): l is Layer => l !== undefined);

      if (leftLayerObjects.length === 0 || rightLayerObjects.length === 0) {
        message.warning('Please select at least one layer for each side');
        return;
      }
      
      [...leftLayerObjects, ...rightLayerObjects].forEach(layer => {
        layer.visible = true;
      });
      
      const swipe = new SwipeWidget({
        view: view,
        leadingLayers: leftLayerObjects,
        trailingLayers: rightLayerObjects,
        direction: direction,
        position: position,
      });

      view.ui.add(swipe);
      
      setSwipeWidget(swipe);
      setIsSwipeActive(true);
      message.success('Layer comparison activated');
    } catch (error) {
      console.error('Failed to create swipe:', error);
      message.error('Failed to activate layer comparison');
    }
  };

  const updatePosition = (value: number) => {
    setPosition(value);
    if (swipeWidget) {
      swipeWidget.position = value;
    }
  };

  const updateDirection = (value: 'horizontal' | 'vertical') => {
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
              value: layer.title,
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
              value: layer.title,
            }))}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            Swipe Direction:
          </label>
          <Radio.Group
            value={direction}
            onChange={(e) => updateDirection(e.target.value as 'horizontal' | 'vertical')}
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
          onClick={() => void (isSwipeActive ? stopSwipe() : startSwipe())}
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