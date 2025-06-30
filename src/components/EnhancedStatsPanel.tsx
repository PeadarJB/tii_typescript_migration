// src/components/EnhancedStatsPanel.tsx - Refactored with consolidated styling

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
import classNames from 'classnames';

// Store imports
import { useAppStore, useMapState, useStatisticsState } from '@/store/useAppStore';

// Style imports
import { usePanelStyles, useCommonStyles, styleUtils } from '@/styles/styled';

// Type imports
import type { ScenarioStatistics } from '@/types';

const { Title, Text } = Typography;

// No props needed anymore!
interface EnhancedStatsPanelProps {}

interface RiskInfo {
  level: string;
  color: 'success' | 'warning' | 'error';
  icon: string;
}

const EnhancedStatsPanel: React.FC<EnhancedStatsPanelProps> = () => {
  // Style hooks
  const { styles: panelStyles } = usePanelStyles();
  const { styles: commonStyles, theme } = useCommonStyles();

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

  const getRiskInfo = (percent: number): RiskInfo => {
    // Per user request, always return a medium-risk style to maintain a consistent yellow background
    return { level: 'medium', color: 'warning', icon: '!' };
  };

  const getModelIcon = (modelType?: string): React.ReactNode => {
    if (modelType === 'coastal') return <EnvironmentOutlined />;
    return <ThunderboltOutlined />;
  };

  const renderScenarioSlide = (scenario: ScenarioStatistics): React.ReactNode => {
    const riskInfo = getRiskInfo(scenario.totalAffected.percentage);

    return (
      <div style={{ padding: `0 ${theme.margin}px ${theme.margin}px` }}>
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
            <Text type="secondary" style={{ fontSize: theme.fontSizeSM }}>
              {scenario.returnPeriod}
            </Text>
          </div>

          {/* Overall Risk Summary */}
          <Card
            size="small"
            className={classNames(commonStyles.statsCard, `risk-${riskInfo.level}`)}
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
                <div style={{ marginTop: theme.marginXS }}>
                  <Text strong style={{
                    fontSize: 20,
                    color: styleUtils.getRiskColor(riskInfo.level, theme)
                  }}>
                    {scenario.totalAffected.percentage.toFixed(1)}%
                  </Text>
                  <Text type="secondary" style={{ fontSize: theme.fontSizeSM }}> of network</Text>
                </div>
              </Col>
            </Row>
          </Card>

          {/* Detailed Model Breakdown */}
          <div>
            <Text strong style={{ display: 'block', marginBottom: theme.marginXS }}>
              Model Breakdown:
            </Text>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              {scenario.modelBreakdown.map((modelData, index) => (
                <div
                  key={index}
                  style={{
                    padding: `${theme.marginXS}px ${theme.marginSM}px`,
                    background: theme.colorBgContainer,
                    borderRadius: theme.borderRadius,
                    border: `1px solid ${theme.colorBorderSecondary}`
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
                        strokeColor={modelData.percentage > 10 ? theme.colorError : undefined}
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
            padding: theme.marginXS,
            background: theme.colorBgLayout,
            borderRadius: theme.borderRadius,
            textAlign: 'center'
          }}>
            <Text type="secondary" style={{ fontSize: theme.fontSizeSM }}>
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
        className={panelStyles.statsPanel}
      >
        <div className={commonStyles.loadingContainer} style={{ position: 'relative', background: 'transparent', height: 200 }}>
          <Spin size="large" />
          <p style={{ marginTop: theme.margin, color: theme.colorTextSecondary }}>Calculating statistics...</p>
        </div>
      </Card>
    );
  }

  if (!currentStats || currentStats.scenarios?.length === 0) {
    return (
      <Card
        size="small"
        className={panelStyles.statsPanel}
        style={{ minHeight: '200px' }}
      >
        <div className={commonStyles.loadingContainer} style={{ position: 'relative', background: 'transparent' }}>
          <Empty
            image={<WarningOutlined style={{ fontSize: 48, color: theme.colorTextQuaternary }} />}
            description={
              <div style={{ color: theme.colorTextSecondary }}>
                <Title level={5}>Statistics Unavailable</Title>
                <Text type="secondary">Please apply a filter to view statistics.</Text>
              </div>
            }
          />
        </div>
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
            <InfoCircleOutlined style={{ fontSize: theme.fontSizeSM, color: theme.colorTextTertiary }} />
          </Tooltip>
        </Space>
      }
      size="small"
      className={panelStyles.statsPanel}
    >
      <Carousel
        ref={carouselRef}
        dots={false}
        afterChange={setCurrentSlide}
        adaptiveHeight
      >
        {currentStats.scenarios?.map((scenario, index) => (
          <div key={index}>{renderScenarioSlide(scenario)}</div>
        ))}
      </Carousel>

      {/* Navigation Arrows */}
      <Button
        type="text"
        shape="circle"
        icon={<LeftOutlined />}
        onClick={() => carouselRef.current?.prev()}
        className="navigation-button prev"
        disabled={currentSlide === 0}
      />
      <Button
        type="text"
        shape="circle"
        icon={<RightOutlined />}
        onClick={() => carouselRef.current?.next()}
        className="navigation-button next"
        disabled={currentSlide === (currentStats.scenarios?.length ?? 0) - 1}
      />

      {/* Slide Indicator */}
      <div className="slide-indicators">
        <Space size="small">
          {currentStats.scenarios?.map((scenario, index) => (
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