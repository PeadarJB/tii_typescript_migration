// src/components/EnhancedStatsPanel.tsx - Connected to Zustand Store

import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, 
  Statistic, 
  Progress, 
  Space, 
  Tag, 
  Spin, 
  Empty, 
  Carousel, 
  Typography, 
  Row, 
  Col, 
  Tooltip, 
  Button 
} from 'antd';
import {
  WarningOutlined,
  RiseOutlined,
  EnvironmentOutlined,
  ThunderboltOutlined,
  InfoCircleOutlined,
  LeftOutlined,
  RightOutlined
} from '@ant-design/icons';
import type { CarouselRef } from 'antd/lib/carousel';

// Store imports
import { useAppStore, useMapState, useStatisticsState } from '@/store/useAppStore';

// Type imports
import type { 
  NetworkStatistics, 
  ScenarioStatistics,
  SegmentStatistic,
  RiskLevelType,
  ClimateScenarioType
} from '@/types';
import { CONFIG } from '@/config/appConfig';
import Query from '@arcgis/core/rest/support/Query';

const { Title, Text } = Typography;

// No props needed anymore!
interface EnhancedStatsPanelProps {}

interface RiskInfo {
  level: string;
  color: 'success' | 'warning' | 'orange' | 'error';
  icon: string;
}

interface ModelStats {
  [key: string]: SegmentStatistic;
}

const EnhancedStatsPanel: React.FC<EnhancedStatsPanelProps> = () => {
  // Store hooks
  const { roadLayer } = useMapState();
  const { currentStats } = useStatisticsState();
  const updateStatistics = useAppStore((state) => state.updateStatistics);
  const calculateStatistics = useAppStore((state) => state.calculateStatistics);

  // Local state
  const [loading, setLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const carouselRef = useRef<CarouselRef>(null);

  // Watch for filter changes on the road layer
  useEffect(() => {
    if (!roadLayer) return;

    const handleFilterChange = async (): Promise<void> => {
      const isFiltered = roadLayer.definitionExpression && 
                        roadLayer.definitionExpression !== '1=1';
      
      if (isFiltered) {
        setLoading(true);
        try {
          await calculateStatistics();
        } finally {
          setLoading(false);
        }
      } else {
        updateStatistics(null);
      }
    };

    // Initial calculation
    void handleFilterChange();
    
    // Watch for changes
    const handle = roadLayer.watch('definitionExpression', handleFilterChange);
    
    return () => handle.remove();
  }, [roadLayer, calculateStatistics, updateStatistics]);

  const getRiskLevel = (percent: number): RiskInfo => {
    if (percent < 5) return { level: 'low', color: 'success', icon: '✓' };
    if (percent < 15) return { level: 'medium', color: 'warning', icon: '!' };
    if (percent < 25) return { level: 'high', color: 'orange', icon: '!!' };
    return { level: 'extreme', color: 'error', icon: '!!!' };
  };

  const getModelIcon = (modelType?: string): React.ReactNode => {
    if (modelType === 'coastal') return <EnvironmentOutlined />;
    return <ThunderboltOutlined />;
  };

  const renderScenarioSlide = (scenario: ScenarioStatistics): React.ReactNode => {
    const anyRisk = getRiskLevel(scenario.totalAffected.percentage);
    
    return (
      <div style={{ padding: '0 20px 20px 20px' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {/* Header */}
          <div style={{ textAlign: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>
              {scenario.scenario === 'rcp45' ? (
                <Space>
                  <Tag color="blue">RCP 4.5</Tag>
                  <span>Flood Scenario</span>
                </Space>
              ) : (
                <Space>
                  <Tag color="red">RCP 8.5</Tag>
                  <span>Flood Scenario</span>
                </Space>
              )}
            </Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {scenario.returnPeriod}
            </Text>
          </div>
          
          {/* Overall Risk Summary */}
          <Card
            size="small"
            style={{
              background: anyRisk.color === 'error' ? '#fff2e8' : 
                         (anyRisk.color === 'warning' || anyRisk.color === 'orange' ? '#fffbe6' : '#f6ffed'),
              borderColor: anyRisk.color === 'error' ? '#ffbb96' : 
                          (anyRisk.color === 'warning' || anyRisk.color === 'orange' ? '#ffe58f' : '#b7eb8f')
            }}
          >
            <Row gutter={16} align="middle">
              <Col span={12}>
                <Statistic
                  title="Total Roads at Risk"
                  value={scenario.totalAffected.lengthKm.toFixed(1)}
                  suffix="km"
                  prefix={<RiseOutlined />}
                />
              </Col>
              <Col span={12} style={{ textAlign: 'right' }}>
                <Tag color={anyRisk.color} style={{ fontSize: 14, padding: '4px 12px' }}>
                  {anyRisk.icon} {anyRisk.level.toUpperCase()} Risk
                </Tag>
                <div style={{ marginTop: 8 }}>
                  <Text strong style={{ 
                    fontSize: 20, 
                    color: anyRisk.color === 'error' ? '#ff4d4f' : undefined 
                  }}>
                    {scenario.totalAffected.percentage.toFixed(1)}%
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}> of network</Text>
                </div>
              </Col>
            </Row>
          </Card>
          
          {/* Detailed Model Breakdown */}
          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Model Breakdown:
            </Text>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              {scenario.modelBreakdown.map((modelData, index) => (
                <div 
                  key={index} 
                  style={{ 
                    padding: '8px 12px', 
                    background: '#fafafa', 
                    borderRadius: 4, 
                    border: '1px solid #f0f0f0' 
                  }}
                >
                  <Row align="middle">
                    <Col span={14}>
                      <Space size="small">
                        {getModelIcon(modelData.modelType)}
                        <Text style={{ fontSize: 13 }}>{modelData.label}</Text>
                      </Space>
                    </Col>
                    <Col span={5} style={{ textAlign: 'right' }}>
                      <Text strong>{modelData.lengthKm.toFixed(1)} km</Text>
                    </Col>
                    <Col span={5} style={{ textAlign: 'right' }}>
                      <Progress
                        percent={Number(modelData.percentage.toFixed(1))}
                        size="small"
                        format={(percent) => `${percent}%`}
                        strokeColor={modelData.percentage > 10 ? '#ff4d4f' : undefined}
                        style={{ marginBottom: 0 }}
                      />
                    </Col>
                  </Row>
                </div>
              ))}
            </Space>
          </div>

          {/* Network Summary */}
          <div style={{ 
            padding: '8px', 
            background: '#f5f5f5', 
            borderRadius: 4, 
            textAlign: 'center' 
          }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Total Network Analyzed: {currentStats?.totalLengthKm.toFixed(1)} km 
              ({currentStats?.totalSegments.toLocaleString()} segments)
            </Text>
          </div>
        </Space>
      </div>
    );
  };

  if (loading) {
    return (
      <Card
        size="small"
        style={{ 
          position: 'absolute', 
          bottom: 16, 
          left: 16, 
          width: 450, 
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)' 
        }}
      >
        <div style={{ textAlign: 'center', padding: '100px 20px' }}>
          <Spin size="large" />
          <p style={{ marginTop: 16 }}>Calculating statistics...</p>
        </div>
      </Card>
    );
  }

  if (!currentStats || currentStats.scenarios.length === 0) {
    return (
      <Card
        size="small"
        style={{ 
          position: 'absolute', 
          bottom: 16, 
          left: 16, 
          width: 450, 
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '200px' 
        }}
      >
        <Empty
          image={<WarningOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
          description={
            <div style={{ color: '#8c8c8c' }}>
              <Title level={5}>Statistics Unavailable</Title>
              <Text type="secondary">Please apply a filter to view statistics.</Text>
            </div>
          }
        />
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <WarningOutlined />
          <span>Flood Risk Statistics</span>
          <Tooltip title="Swipe to see different climate scenarios">
            <InfoCircleOutlined style={{ fontSize: 12, color: '#8c8c8c' }} />
          </Tooltip>
        </Space>
      }
      size="small"
      style={{ 
        position: 'absolute', 
        bottom: 16, 
        left: 16, 
        width: 450, 
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)' 
      }}
      bodyStyle={{ padding: '12px 0 30px 0', position: 'relative' }}
    >
      <Carousel
        ref={carouselRef}
        dots={false}
        afterChange={setCurrentSlide}
        adaptiveHeight
      >
        {currentStats.scenarios.map((scenario, index) => (
          <div key={index}>{renderScenarioSlide(scenario)}</div>
        ))}
      </Carousel>
      
      {/* Navigation Arrows */}
      <Button
        type="text"
        shape="circle"
        icon={<LeftOutlined />}
        onClick={() => carouselRef.current?.prev()}
        style={{ 
          position: 'absolute', 
          left: 8, 
          top: '50%', 
          transform: 'translateY(-50%)', 
          zIndex: 10 
        }}
        disabled={currentSlide === 0}
      />
      <Button
        type="text"
        shape="circle"
        icon={<RightOutlined />}
        onClick={() => carouselRef.current?.next()}
        style={{ 
          position: 'absolute', 
          right: 8, 
          top: '50%', 
          transform: 'translateY(-50%)', 
          zIndex: 10 
        }}
        disabled={currentSlide === currentStats.scenarios.length - 1}
      />
      
      {/* Slide Indicator */}
      <div style={{ 
        position: 'absolute', 
        bottom: 8, 
        left: 0, 
        right: 0, 
        textAlign: 'center' 
      }}>
        <Space size="small">
          {currentStats.scenarios.map((scenario, index) => (
            <Tag 
              key={index}
              color={currentSlide === index ? 
                (scenario.scenario === 'rcp45' ? 'blue' : 'red') : 'default'
              } 
              style={{ cursor: 'pointer' }} 
              onClick={() => carouselRef.current?.goTo(index)}
            >
              {scenario.scenario === 'rcp45' ? 'RCP 4.5' : 'RCP 8.5'}
            </Tag>
          ))}
        </Space>
      </div>
    </Card>
  );
};

export default EnhancedStatsPanel;