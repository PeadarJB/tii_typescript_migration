// src/components/SimpleSwipePanel.tsx - Final Version

import { useState, useEffect, useCallback, FC } from 'react';
import { Card, Select, Button, Space, Slider, Radio, Tag, message, Tooltip, Divider } from 'antd';
import { SwapOutlined, CloseOutlined } from '@ant-design/icons';

// Store imports
import { useAppStore, useMapState, useUIState } from '@/store/useAppStore';

// Style imports
import { usePanelStyles, useCommonStyles } from '@/styles/styled';

// Type imports
import type Swipe from '@arcgis/core/widgets/Swipe';
import type Layer from '@arcgis/core/layers/Layer';
import { CONFIG, PRECIPITATION_SWIPE_CONFIG } from '@/config/appConfig';

interface SimpleSwipePanelProps {}

const SimpleSwipePanel: FC<SimpleSwipePanelProps> = () => {
  const { styles: panelStyles } = usePanelStyles();
  const { theme } = useCommonStyles();

  const { mapView: view, webmap, roadLayer, roadLayerSwipe } = useMapState();
  const { isSwipeActive, activePage } = useUIState();
  const setIsSwipeActive = useAppStore((state) => state.setIsSwipeActive);
  const enterSwipeMode = useAppStore((state) => state.enterSwipeMode);
  const exitSwipeMode = useAppStore((state) => state.exitSwipeMode);

  // State for Future page
  const [leftLayers, setLeftLayers] = useState<string[]>([]);
  const [rightLayers, setRightLayers] = useState<string[]>([]);
  
  // State for Precipitation page
  const [precipRcp, setPrecipRcp] = useState<'rcp45' | 'rcp85'>('rcp45');
  const [floodModel, setFloodModel] = useState<'fluvial' | 'coastal'>('fluvial');
  const [rainfallType, setRainfallType] = useState<'absolute' | 'change'>('change');

  // Core swipe state
  const [swipeWidget, setSwipeWidget] = useState<Swipe | null>(null);
  const [direction, setDirection] = useState<'horizontal' | 'vertical'>('horizontal');
  const [position, setPosition] = useState(50);
  
  const stopSwipe = useCallback(() => {
    if (swipeWidget && view) {
      [...swipeWidget.leadingLayers, ...swipeWidget.trailingLayers].forEach(layer => {
        if (layer) (layer as Layer).visible = false;
      });
      view.ui.remove(swipeWidget);
      swipeWidget.destroy();
      exitSwipeMode();
      setSwipeWidget(null);
      setIsSwipeActive(false);
      message.info('Layer comparison deactivated');
    }
  }, [swipeWidget, view, setIsSwipeActive, exitSwipeMode]);

  useEffect(() => {
    // This single cleanup hook correctly handles unmounting when the panel is closed or the page changes.
    return () => stopSwipe();
  }, [stopSwipe]);

  const findLayer = (title: string): Layer | undefined => {
    if (!webmap) return undefined;
    return webmap.allLayers.find((l: Layer) => l.title === title);
  };

  const startSwipe = async () => {
    if (!view || !webmap) {
      message.error("Map is not ready. Please try again.");
      return;
    }

    try {
        let leadingLayers: Layer[] = [];
        let trailingLayers: Layer[] = [];

        enterSwipeMode();

        if (activePage === 'future') {
            if (!roadLayer || !roadLayerSwipe) {
                message.error("Road network layers for swipe not found.");
                exitSwipeMode();
                return;
            }
            const leftFloodLayers = leftLayers.map(title => findLayer(title)).filter((l): l is Layer => !!l);
            const rightFloodLayers = rightLayers.map(title => findLayer(title)).filter((l): l is Layer => !!l);
            if (leftFloodLayers.length === 0 || rightFloodLayers.length === 0) {
                message.warning('Please select at least one layer for each side');
                exitSwipeMode();
                return;
            }
            const leftFields = CONFIG.swipeLayerConfig.leftPanel.layers.filter(l => leftLayers.includes(l.title)).map(l => l.roadNetworkFieldName).filter(Boolean);
            roadLayer.definitionExpression = leftFields.length > 0 ? leftFields.map(f => `${f} = 1`).join(' OR ') : '1=0';
            roadLayer.visible = true;
            const rightFields = CONFIG.swipeLayerConfig.rightPanel.layers.filter(l => rightLayers.includes(l.title)).map(l => l.roadNetworkFieldName).filter(Boolean);
            roadLayerSwipe.definitionExpression = rightFields.length > 0 ? rightFields.map(f => `${f} = 1`).join(' OR ') : '1=0';
            roadLayerSwipe.visible = true;
            leadingLayers = [...leftFloodLayers, roadLayer];
            trailingLayers = [...rightFloodLayers, roadLayerSwipe];

        } else if (activePage === 'precipitation') {
            const rainfallConfig = PRECIPITATION_SWIPE_CONFIG.rainfallLayers[precipRcp];
            const rainfallLayerTitle = rainfallType in rainfallConfig ? rainfallConfig[rainfallType as keyof typeof rainfallConfig] : rainfallConfig.change;
            const inundationLayerTitle = PRECIPITATION_SWIPE_CONFIG.inundationLayers[precipRcp][floodModel];

            const rainfallLayer = findLayer(rainfallLayerTitle);
            const inundationLayer = findLayer(inundationLayerTitle);

            if (!rainfallLayer || !inundationLayer) {
                message.error('Required precipitation or inundation layers not found in the web map.');
                exitSwipeMode();
                return;
            }
            leadingLayers = [rainfallLayer];
            trailingLayers = [inundationLayer];
        }

        [...leadingLayers, ...trailingLayers].forEach(layer => { if(layer) layer.visible = true; });

        const SwipeWidget = (await import('@arcgis/core/widgets/Swipe')).default;
        const swipe = new SwipeWidget({
            view: view,
            leadingLayers: leadingLayers,
            trailingLayers: trailingLayers,
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
  
  // When changing RCP scenario on precipitation page, default to 'change' if 'absolute' is not available
  useEffect(() => {
    if(activePage === 'precipitation' && precipRcp === 'rcp45' && rainfallType === 'absolute') {
        setRainfallType('change');
    }
  }, [precipRcp, activePage, rainfallType]);

  const updatePosition = (value: number) => {
    setPosition(value);
    if (swipeWidget) swipeWidget.position = value;
  };

  const updateDirection = (value: 'horizontal' | 'vertical') => {
    setDirection(value);
    if (swipeWidget) swipeWidget.direction = value;
  };

  const renderFutureControls = () => (
    <>
        <div className="layer-select">
            <label style={{ display: 'block', marginBottom: theme.marginXS, fontWeight: 500 }}>Left/Top Layers (RCP 4.5):</label>
            <Select
                mode="multiple" style={{ width: '100%' }} placeholder="Select RCP 4.5 layers..."
                value={leftLayers} onChange={setLeftLayers} disabled={isSwipeActive}
                options={CONFIG.swipeLayerConfig.leftPanel.layers.map(layer => ({ label: layer.label, value: layer.title }))}
            />
        </div>
        <div className="layer-select">
            <label style={{ display: 'block', marginBottom: theme.marginXS, fontWeight: 500 }}>Right/Bottom Layers (RCP 8.5):</label>
            <Select
                mode="multiple" style={{ width: '100%' }} placeholder="Select RCP 8.5 layers..."
                value={rightLayers} onChange={setRightLayers} disabled={isSwipeActive}
                options={CONFIG.swipeLayerConfig.rightPanel.layers.map(layer => ({ label: layer.label, value: layer.title }))}
            />
        </div>
    </>
  );

  const renderPrecipitationControls = () => (
    <>
        <div>
            <label style={{ display: 'block', marginBottom: theme.marginXS, fontWeight: 500 }}>RCP Scenario:</label>
            <Radio.Group value={precipRcp} onChange={(e) => setPrecipRcp(e.target.value)} disabled={isSwipeActive}>
                <Radio.Button value="rcp45">RCP 4.5</Radio.Button>
                <Radio.Button value="rcp85">RCP 8.5</Radio.Button>
            </Radio.Group>
        </div>
        <div>
            <label style={{ display: 'block', marginBottom: theme.marginXS, fontWeight: 500 }}>Inundation Model (Right Side):</label>
            <Radio.Group value={floodModel} onChange={(e) => setFloodModel(e.target.value)} disabled={isSwipeActive}>
                <Radio.Button value="fluvial">Fluvial</Radio.Button>
                <Radio.Button value="coastal">Coastal</Radio.Button>
            </Radio.Group>
        </div>
        <div>
            <label style={{ display: 'block', marginBottom: theme.marginXS, fontWeight: 500 }}>Rainfall Data (Left Side):</label>
            <Radio.Group value={rainfallType} onChange={(e) => setRainfallType(e.target.value)} disabled={isSwipeActive}>
                <Radio.Button value="change">Change</Radio.Button>
                <Tooltip title={precipRcp === 'rcp45' ? "Absolute rainfall data is only available for RCP 8.5" : undefined}>
                    <Radio.Button value="absolute" disabled={precipRcp === 'rcp45'}>Absolute</Radio.Button>
                </Tooltip>
            </Radio.Group>
        </div>
    </>
  );

  if (!view || !webmap) return null;

  return (
    <Card
      title={ <Space><SwapOutlined /><span>Layer Comparison</span>{isSwipeActive && <Tag color="green">Active</Tag>}</Space> }
      size="small"
      className={panelStyles.swipePanel}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        {activePage === 'future' && renderFutureControls()}
        {activePage === 'precipitation' && renderPrecipitationControls()}
        <Divider style={{margin: '8px 0'}} />
        <div>
            <label style={{ display: 'block', marginBottom: theme.marginXS, fontWeight: 500 }}>Swipe Direction:</label>
            <Radio.Group value={direction} onChange={(e) => updateDirection(e.target.value as 'horizontal' | 'vertical')} disabled={!isSwipeActive}>
                <Radio.Button value="horizontal">Horizontal</Radio.Button>
                <Radio.Button value="vertical">Vertical</Radio.Button>
            </Radio.Group>
        </div>
        {isSwipeActive && (
          <div>
            <label style={{ display: 'block', marginBottom: theme.marginXS, fontWeight: 500 }}>Position: {position}%</label>
            <Slider value={position} onChange={updatePosition} marks={{ 0: '0%', 50: '50%', 100: '100%' }} />
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