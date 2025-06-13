import React, { useState } from 'react';
import { ProCard } from '@ant-design/pro-components';
import {
  Form,
  Select,
  Button,
  Space,
  Tag,
  Slider,
  Segmented,
  Divider,
  Alert,
  Checkbox,
  message,
} from 'antd';
import {
  SwapOutlined,
  ColumnWidthOutlined,
  ColumnHeightOutlined,
  CloseOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { CONFIG } from '../../config/appConfig';
import { theme } from '../../config/themeConfig';

/**
 * SwipePanel - Layer comparison controls using Ant Design components
 */
const SwipePanel = ({ appManager, onClose }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [swipeActive, setSwipeActive] = useState(false);
  const [swipePosition, setSwipePosition] = useState(50);

  // Get layer options from config
  const leftLayerOptions = CONFIG.swipeLayerConfig.leftPanel.layers.map(layer => ({
    label: (
      <Space size={4}>
        <Tag color="blue" style={{ marginRight: 0 }}>4.5</Tag>
        {layer.label}
      </Space>
    ),
    value: layer.title,
  }));

  const rightLayerOptions = CONFIG.swipeLayerConfig.rightPanel.layers.map(layer => ({
    label: (
      <Space size={4}>
        <Tag color="red" style={{ marginRight: 0 }}>8.5</Tag>
        {layer.label}
      </Space>
    ),
    value: layer.title,
  }));

  // Create swipe widget
  const handleCreateSwipe = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      const { leftLayers, rightLayers, direction } = values;
      
      // Check for overlapping selections
      const commonLayers = leftLayers.filter(layer => rightLayers.includes(layer));
      if (commonLayers.length > 0) {
        message.error('Same layer cannot be selected on both sides');
        setLoading(false);
        return;
      }

      // Initialize swipe through the manager
      const success = await appManager.components.swipeManager.initializeSwipe(
        leftLayers,
        rightLayers,
        swipePosition,
        direction
      );

      if (success) {
        setSwipeActive(true);
        message.success('Layer comparison activated');
      } else {
        message.error('Failed to create comparison view');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to create swipe:', error);
      message.error('Failed to create comparison view');
      setLoading(false);
    }
  };

  // Remove swipe widget
  const handleRemoveSwipe = () => {
    const success = appManager.components.swipeManager.destroy();
    if (success) {
      setSwipeActive(false);
      form.resetFields();
      setSwipePosition(50);
      message.info('Layer comparison deactivated');
    }
  };

  // Update swipe position
  const handlePositionChange = (value) => {
    setSwipePosition(value);
    if (swipeActive) {
      appManager.components.swipeManager.updatePosition(value);
    }
  };

  // Update swipe direction
  const handleDirectionChange = (value) => {
    if (swipeActive) {
      const newDirection = value === 'vertical' ? 'vertical' : 'horizontal';
      appManager.components.swipeManager.updateDirection(newDirection);
      form.setFieldValue('direction', newDirection);
    }
  };

  return (
    <ProCard
      title={
        <Space>
          <SwapOutlined />
          <span>Layer Comparison</span>
          {swipeActive && (
            <Tag color="success" icon={<CheckOutlined />}>
              Active
            </Tag>
          )}
        </Space>
      }
      extra={
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined />}
          onClick={onClose}
        />
      }
      size="small"
      bordered
      style={{
        boxShadow: theme.token.boxShadowSecondary,
      }}
      bodyStyle={{ padding: '12px' }}
    >
      <Form
        form={form}
        layout="vertical"
        size="small"
        initialValues={{
          direction: 'horizontal',
        }}
      >
        <Alert
          message="Compare flood scenarios side by side"
          description="Select layers for each side to visualize differences between RCP 4.5 and RCP 8.5 scenarios"
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
        />

        <Form.Item
          name="leftLayers"
          label="Left/Top Layers (RCP 4.5)"
          rules={[{ required: true, message: 'Select at least one layer' }]}
        >
          <Select
            mode="multiple"
            placeholder="Select RCP 4.5 layers..."
            options={leftLayerOptions}
            disabled={swipeActive}
            maxTagCount={2}
            maxTagPlaceholder={(omittedValues) => `+${omittedValues.length} more`}
          />
        </Form.Item>

        <Form.Item
          name="rightLayers"
          label="Right/Bottom Layers (RCP 8.5)"
          rules={[{ required: true, message: 'Select at least one layer' }]}
        >
          <Select
            mode="multiple"
            placeholder="Select RCP 8.5 layers..."
            options={rightLayerOptions}
            disabled={swipeActive}
            maxTagCount={2}
            maxTagPlaceholder={(omittedValues) => `+${omittedValues.length} more`}
          />
        </Form.Item>

        <Divider style={{ margin: '12px 0' }} />

        <Form.Item
          name="direction"
          label="Comparison Direction"
        >
          <Segmented
            block
            disabled={swipeActive}
            options={[
              {
                label: (
                  <Space>
                    <ColumnWidthOutlined />
                    <span>Horizontal</span>
                  </Space>
                ),
                value: 'horizontal',
              },
              {
                label: (
                  <Space>
                    <ColumnHeightOutlined />
                    <span>Vertical</span>
                  </Space>
                ),
                value: 'vertical',
              },
            ]}
            onChange={handleDirectionChange}
          />
        </Form.Item>

        {swipeActive && (
          <Form.Item label={`Position: ${swipePosition}%`}>
            <Slider
              value={swipePosition}
              onChange={handlePositionChange}
              marks={{
                0: '0%',
                25: '25%',
                50: '50%',
                75: '75%',
                100: '100%',
              }}
            />
          </Form.Item>
        )}

        <Space style={{ width: '100%', justifyContent: 'center' }}>
          {!swipeActive ? (
            <Button
              type="primary"
              icon={<SwapOutlined />}
              onClick={handleCreateSwipe}
              loading={loading}
              block
            >
              Activate Comparison
            </Button>
          ) : (
            <Button
              danger
              icon={<CloseOutlined />}
              onClick={handleRemoveSwipe}
              block
            >
              Deactivate Comparison
            </Button>
          )}
        </Space>
      </Form>
    </ProCard>
  );
};

export default SwipePanel;