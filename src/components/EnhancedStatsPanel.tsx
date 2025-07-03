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
  Button,
  List
} from 'antd';
import {
  WarningOutlined,
  RiseOutlined,
  EnvironmentOutlined,
  ThunderboltOutlined,
  InfoCircleOutlined,
  LeftOutlined,
  RightOutlined,
  ToolOutlined,
  PushpinOutlined,
  EyeOutlined,
  CloudOutlined,
} from '@ant-design/icons';
import type { CarouselRef } from 'antd/lib/carousel';
import classNames from 'classnames';

// Store imports
import { useAppStore, useMapState, useStatisticsState, useUIState } from '@/store/useAppStore';

// Style imports
import { usePanelStyles, useCommonStyles, styleUtils } from '@/styles/styled';

// Type imports
import type { ScenarioStatistics, PastEventStatistics } from '@/types';

const { Title, Text, Paragraph } = Typography;

// No props needed anymore!
interface EnhancedStatsPanelProps {}

interface RiskInfo {
  level: string;
  color: 'success' | 'warning' | 'error';
  icon: string;
}

const PastEventStats: React.FC<{ stats: PastEventStatistics }> = ({ stats }) => {
    const { styles: commonStyles, theme } = useCommonStyles();
  
    const eventCountLabels: Record<string, { label: string, icon: React.ReactNode }> = {
      drainageDefects: { label: 'Drainage Defects', icon: <ToolOutlined /> },
      opwPoints: { label: 'OPW Points', icon: <PushpinOutlined /> },
      nraPoints: { label: 'NRA Points', icon: <EyeOutlined /> },
      moccPoints: { label: 'MOCC Events', icon: <CloudOutlined /> },
    };
  
    const getEventCount = (label: string): number => {
      return stats.eventCounts.find(e => e.label === label)?.count ?? 0;
    };
  
    return (
      <div style={{ padding: `0 ${theme.margin}px ${theme.margin}px` }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {/* Header */}
          <div style={{ textAlign: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>
              <Space>
                <Tag color="purple">Past Events</Tag>
                <span>Impact Analysis</span>
              </Space>
            </Title>
            <Text type="secondary" style={{ fontSize: theme.fontSizeSM, maxWidth: 350, display: 'inline-block' }}>
              {stats.description}
            </Text>
          </div>
  
          {/* Overall Impact */}
          <Card size="small" className={classNames(commonStyles.statsCard, `risk-high`)}>
            <Statistic
              title="Total Network Length Affected by Selected Past Events"
              value={stats.totalAffected.lengthKm.toFixed(1)}
              suffix="km"
              prefix={<RiseOutlined />}
            />
          </Card>
  
          {/* Event Counts */}
          <div>
            <Text strong>Key Event Counts:</Text>
            <Row gutter={8} style={{ marginTop: theme.marginXS }}>
              {Object.keys(eventCountLabels).map(key => (
                <Col span={6} key={key}>
                  <Card size="small" style={{ textAlign: 'center' }}>
                    <Statistic
                      title={<Space size={4}>{eventCountLabels[key].icon} {eventCountLabels[key].label}</Space>}
                      value={getEventCount(key)}
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
          
          {/* Breakdown */}
          <div>
            <Text strong>Network Impact Breakdown:</Text>
            <List
              size="small"
              dataSource={stats.eventBreakdown}
              renderItem={item => (
                <List.Item style={{ padding: `${theme.marginXXS}px 0` }}>
                  <Row style={{ width: '100%' }} align="middle">
                    <Col span={14}>
                        <Paragraph ellipsis={{ rows: 2, tooltip: item.label }} style={{ marginBottom: 0 }}>
                            <Text style={{ fontSize: 13 }}>{item.label}</Text>
                        </Paragraph>
                    </Col>
                    <Col span={10} style={{ textAlign: 'right' }}>
                      <Text strong>{item.lengthKm.toFixed(1)} km</Text>
                    </Col>
                  </Row>
                </List.Item>
              )}
              style={{ maxHeight: 200, overflowY: 'auto', marginTop: theme.marginXS, paddingRight: theme.marginXS }}
            />
          </div>
        </Space>
      </div>
    );
  };

const EnhancedStatsPanel: React.FC<EnhancedStatsPanelProps> = () => {
  // Style hooks
  const { styles: panelStyles } = usePanelStyles();
  const { styles: commonStyles, theme } = useCommonStyles();

  // Store hooks
  const { roadLayer } = useMapState();
  const { currentStats } = useStatisticsState();
  const { activePage } = useUIState();
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

  const renderContent = () => {
    if (loading) {
      return (
        <div className={commonStyles.loadingContainer} style={{ position: 'relative', background: 'transparent', height: 200 }}>
          <Spin size="large" />
          <p style={{ marginTop: theme.margin, color: theme.colorTextSecondary }}>Calculating statistics...</p>
        </div>
      );
    }
  
    if (!currentStats || (!currentStats.scenarios?.length && !currentStats.pastEvents)) {
      return (
        <div className={commonStyles.loadingContainer} style={{ position: 'relative', background: 'transparent', height: '100%' }}>
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
      );
    }

    if (activePage === 'past' && currentStats.pastEvents) {
        return <PastEventStats stats={currentStats.pastEvents} />;
    }

    if (activePage === 'future' && currentStats.scenarios && currentStats.scenarios.length > 0) {
        return (
            <>
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
                <div className="slide-indicators">
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
            </>
        )
    }

    return null; // Fallback
  }

  return (
    <Card
      title={
        <Space>
          <WarningOutlined />
          <span>Risk Statistics</span>
          <Tooltip title={activePage === 'future' ? "Swipe to see different climate scenarios" : "Statistics based on selected past events"}>
            <InfoCircleOutlined style={{ fontSize: theme.fontSizeSM, color: theme.colorTextTertiary }} />
          </Tooltip>
        </Space>
      }
      size="small"
      className={panelStyles.statsPanel}
      styles={{ body: { padding: activePage === 'future' ? '8px 0 30px 0' : '8px', position: 'relative' } }}
    >
      {renderContent()}
    </Card>
  );
};

export default EnhancedStatsPanel;
