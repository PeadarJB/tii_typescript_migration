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
  const { mapView: view, webmap, roadLayer, roadLayerSwipe } = useMapState();
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
      // Only show message if it was previously active to avoid firing on component unmount
      if (isSwipeActive) {
          message.info('Layer comparison deactivated');
      }
    }
  }, [swipeWidget, view, leftLayers, rightLayers, setIsSwipeActive, exitSwipeMode, isSwipeActive]);

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
    if (!view || !webmap || !roadLayer || !roadLayerSwipe) {
      message.error("Swipe layers are not ready. Please try again.");
      return;
    }

    try {
      const leftFloodLayers = leftLayers.map(title => findLayer(title)).filter((l): l is Layer => l !== undefined);
      const rightFloodLayers = rightLayers.map(title => findLayer(title)).filter((l): l is Layer => l !== undefined);

      if (leftFloodLayers.length === 0 || rightFloodLayers.length === 0) {
        message.warning('Please select at least one layer for each side');
        return;
      }
      
      enterSwipeMode();

      // --- Build definition expression for LEFT road layer ---
      const leftFields = leftLayers
        .map(title => allSwipeLayers.find(l => l.title === title)?.roadNetworkFieldName)
        .filter((field): field is string => !!field);
      roadLayer.definitionExpression = leftFields.length > 0 ? leftFields.map(f => `${f} = 1`).join(' OR ') : '1=0';
      roadLayer.visible = true;

      // --- Build definition expression for RIGHT road layer ---
      const rightFields = rightLayers
        .map(title => allSwipeLayers.find(l => l.title === title)?.roadNetworkFieldName)
        .filter((field): field is string => !!field);
      roadLayerSwipe.definitionExpression = rightFields.length > 0 ? rightFields.map(f => `${f} = 1`).join(' OR ') : '1=0';
      roadLayerSwipe.visible = true;


      // Make selected flood hazard layers visible
      [...leftFloodLayers, ...rightFloodLayers].forEach(layer => {
        layer.visible = true;
      });
      
      const SwipeWidget = (await import('@arcgis/core/widgets/Swipe')).default;
      const swipe = new SwipeWidget({
        view: view,
        leadingLayers: [...leftFloodLayers, roadLayer],
        trailingLayers: [...rightFloodLayers, roadLayerSwipe],
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