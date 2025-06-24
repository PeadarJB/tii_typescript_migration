// src/components/SimpleSwipePanel.tsx - Connected to Zustand Store

import { useState, useEffect, useCallback, FC } from 'react';
import { Card, Select, Button, Space, Slider, Radio, Tag, message } from 'antd';
import { SwapOutlined, CloseOutlined } from '@ant-design/icons';

// Store imports
import { useAppStore, useMapState, useUIState } from '@/store/useAppStore';

// Style imports
import { usePanelStyles, useCommonStyles } from '@/styles/styled';

// Type imports
import type Swipe from '@arcgis/core/widgets/Swipe';
import type Layer from '@arcgis/core/layers/Layer';
import type { LayerConfig } from '@/types/index';
import { CONFIG } from '@/config/appConfig';

// No props needed anymore!
interface SimpleSwipePanelProps {}

const SimpleSwipePanel: FC<SimpleSwipePanelProps> = () => {
  // Style hooks
  const { styles: panelStyles } = usePanelStyles();
  const { theme } = useCommonStyles();

  // Store hooks
  const { mapView: view, webmap, roadLayer } = useMapState();
  const { isSwipeActive } = useUIState();
  const setIsSwipeActive = useAppStore((state) => state.setIsSwipeActive);
  const enterSwipeMode = useAppStore((state) => state.enterSwipeMode);
  const exitSwipeMode = useAppStore((state) => state.exitSwipeMode);

  // Local state
  const [swipeWidget, setSwipeWidget] = useState<Swipe | null>(null);
  const [leftLayers, setLeftLayers] = useState<string[]>([]);
  const [rightLayers, setRightLayers] = useState<string[]>([]);
  const [direction, setDirection] = useState<'horizontal' | 'vertical'>('horizontal');
  const [position, setPosition] = useState(50);

  // Config
  const allSwipeLayers: readonly LayerConfig[] = [
    ...CONFIG.swipeLayerConfig.leftPanel.layers,
    ...CONFIG.swipeLayerConfig.rightPanel.layers,
  ];
  const leftLayerOptions: readonly LayerConfig[] = CONFIG.swipeLayerConfig.leftPanel.layers;
  const rightLayerOptions: readonly LayerConfig[] = CONFIG.swipeLayerConfig.rightPanel.layers;

  const stopSwipe = useCallback(() => {
    if (swipeWidget && view) {
      const allLayerTitles = [...leftLayers, ...rightLayers];
      allLayerTitles.forEach(title => {
        const layer = view.map.allLayers.find(l => l.title === title);
        if (layer) {
          layer.visible = false;
        }
      });

      view.ui.remove(swipeWidget);
      swipeWidget.destroy();

      // Restore pre-swipe filter state
      exitSwipeMode();
      
      setSwipeWidget(null);
      setIsSwipeActive(false);
      message.info('Layer comparison deactivated');
    }
  }, [swipeWidget, view, leftLayers, rightLayers, setIsSwipeActive, exitSwipeMode]);

  useEffect(() => {
    // Cleanup function to be called when the component unmounts
    return () => {
      stopSwipe();
    };
  }, [stopSwipe]);

  const findLayer = (title: string): Layer | undefined => {
    if (!webmap) return undefined;
    return webmap.allLayers.find((l: Layer) => l.title === title);
  };

  const startSwipe = async () => {
    if (!view || !webmap || !roadLayer) {
      return;
    }

    try {
      const leftLayerObjects = leftLayers.map(title => findLayer(title)).filter((l): l is Layer => l !== undefined);
      const rightLayerObjects = rightLayers.map(title => findLayer(title)).filter((l): l is Layer => l !== undefined);

      if (leftLayerObjects.length === 0 || rightLayerObjects.length === 0) {
        message.warning('Please select at least one layer for each side');
        return;
      }
      
      // Save current filter state before applying swipe filters
      enterSwipeMode();

      // Build definition expression for road network layer
      const allSelectedLayerTitles = [...leftLayers, ...rightLayers];
      const roadFilterFields = allSelectedLayerTitles
        .map(title => allSwipeLayers.find(l => l.title === title)?.roadNetworkFieldName)
        .filter((field): field is string => !!field);
      
      if (roadFilterFields.length > 0) {
        const swipeDefinitionExpression = roadFilterFields.map(field => `${field} = 1`).join(' OR ');
        roadLayer.definitionExpression = swipeDefinitionExpression;
        roadLayer.visible = true;
      } else {
        roadLayer.visible = false;
      }

      // Make selected swipe layers visible
      [...leftLayerObjects, ...rightLayerObjects].forEach(layer => {
        layer.visible = true;
      });
      
      const SwipeWidget = (await import('@arcgis/core/widgets/Swipe')).default;
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
      // Restore state on failure
      exitSwipeMode();
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

  if (!view || !webmap) return null;

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
      className={panelStyles.swipePanel}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <div className="layer-select">
          <label style={{ display: 'block', marginBottom: theme.marginXS, fontWeight: 500 }}>
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
        <div className="layer-select">
          <label style={{ display: 'block', marginBottom: theme.marginXS, fontWeight: 500 }}>
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
          <label style={{ display: 'block', marginBottom: theme.marginXS, fontWeight: 500 }}>
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
            <label style={{ display: 'block', marginBottom: theme.marginXS, fontWeight: 500 }}>
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