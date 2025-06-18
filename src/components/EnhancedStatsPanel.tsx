import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import type { 
  NetworkStatistics, 
  ScenarioStatistics,
  SegmentStatistic,
  RiskLevelType,
  ClimateScenarioType
} from '@/types';
import type FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import { CONFIG } from '@/config/appConfig';
import Query from '@arcgis/core/rest/support/Query';

const { Title, Text } = Typography;

interface EnhancedStatsPanelProps {
  roadLayer: FeatureLayer;
  onStatsChange?: (stats: NetworkStatistics | null) => void;
}

interface RiskInfo {
  level: string;
  color: 'success' | 'warning' | 'orange' | 'error';
  icon: string;
}

interface ModelStats {
  [key: string]: SegmentStatistic;
}

const EnhancedStatsPanel: React.FC<EnhancedStatsPanelProps> = ({ 
  roadLayer, 
  onStatsChange 
}) => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<NetworkStatistics | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const carouselRef = useRef<CarouselRef>(null);

  useEffect(() => {
    if (roadLayer) {
      const handleFilterChange = (): void => {
        const isFiltered = roadLayer.definitionExpression && 
                          roadLayer.definitionExpression !== '1=1';
        
        if (isFiltered) {
          void calculateStatistics();
        } else {
          setStats(null);
          setLoading(false);
          if (onStatsChange) {
            onStatsChange(null);
          }
        }
      };

      handleFilterChange();
      
      const handle = roadLayer.watch('definitionExpression', handleFilterChange);
      
      return () => handle.remove();
    }
  }, [roadLayer, onStatsChange]);

  const calculateStatistics = async (): Promise<void> => {
    if (!roadLayer) return;
    
    try {
      setLoading(true);
      
      const baseWhere = roadLayer.definitionExpression || '1=1';

      // Get total count in current filter
      const queryTotal = new Query({
        where: baseWhere,
        outStatistics: [{
          statisticType: 'count',
          onStatisticField: CONFIG.fields.object_id,
          outStatisticFieldName: 'total_count'
        }]
      });

      const totalResult = await roadLayer.queryFeatures(queryTotal);
      const totalSegments = totalResult.features[0]?.attributes.total_count || 0;
      const totalLength = totalSegments * CONFIG.defaultSettings.segmentLengthKm;

      // Define field sets for each scenario
      const rcp45Fields: Record<string, string | undefined> = {
        any: CONFIG.fields.floodAffected,
        cfram_f: CONFIG.fields.cfram_f_m_0010,
        cfram_c: CONFIG.fields.cfram_c_m_0010,
        nifm_f: CONFIG.fields.nifm_f_m_0020,
        ncfhm_c: CONFIG.fields.ncfhm_c_m_0010
      };

      const rcp85Fields: Record<string, string | undefined> = {
        any: CONFIG.fields.floodAffected_h,
        cfram_f: CONFIG.fields.cfram_f_h_0100,
        cfram_c: CONFIG.fields.cfram_c_h_0200,
        nifm_f: CONFIG.fields.nifm_f_h_0100,
        ncfhm_c: CONFIG.fields.ncfhm_c_c_0200
      };
      
      // Helper to run queries for a set of fields
      const getStatsForScenario = async (
        fields: Record<string, string | undefined>
      ): Promise<ModelStats> => {
        const scenarioStats: ModelStats = {};
        
        for (const [key, field] of Object.entries(fields)) {
          if (!field) continue;
          
          const query = new Query({
            where: `(${baseWhere}) AND (${field} = 1)`,
            outStatistics: [{
              statisticType: 'count',
              onStatisticField: CONFIG.fields.object_id,
              outStatisticFieldName: 'affected_count'
            }]
          });
          
          const result = await roadLayer.queryFeatures(query);
          const count = result.features[0]?.attributes.affected_count || 0;
          
          scenarioStats[key] = {
            count: count,
            lengthKm: count * CONFIG.defaultSettings.segmentLengthKm,
            percentage: totalSegments > 0 ? (count / totalSegments) * 100 : 0,
            label: formatModelName(key),
            modelType: key.includes('c') ? 'coastal' : 'fluvial'
          };
        }
        
        return scenarioStats;
      };

      const [rcp45Stats, rcp85Stats] = await Promise.all([
        getStatsForScenario(rcp45Fields),
        getStatsForScenario(rcp85Fields)
      ]);
      
      // Create scenario statistics
      const scenarios: ScenarioStatistics[] = [
        {
          scenario: 'rcp45' as ClimateScenarioType,
          title: 'RCP 4.5 Flood Scenario',
          returnPeriod: '10-20 year return period',
          totalAffected: rcp45Stats.any || createEmptyStatistic(),
          modelBreakdown: Object.entries(rcp45Stats)
            .filter(([key]) => key !== 'any')
            .map(([_, stat]) => stat)
            .filter(stat => stat.count > 0),
          riskLevel: getRiskLevel(rcp45Stats.any?.percentage || 0).level as RiskLevelType
        },
        {
          scenario: 'rcp85' as ClimateScenarioType,
          title: 'RCP 8.5 Flood Scenario',
          returnPeriod: '100-200 year return period',
          totalAffected: rcp85Stats.any || createEmptyStatistic(),
          modelBreakdown: Object.entries(rcp85Stats)
            .filter(([key]) => key !== 'any')
            .map(([_, stat]) => stat)
            .filter(stat => stat.count > 0),
          riskLevel: getRiskLevel(rcp85Stats.any?.percentage || 0).level as RiskLevelType
        }
      ];

      const finalStats: NetworkStatistics = {
        totalSegments,
        totalLengthKm: totalLength,
        scenarios,
        lastUpdated: new Date()
      };

      setStats(finalStats);
      
      if (onStatsChange) {
        onStatsChange(finalStats);
      }

    } catch (error) {
      console.error('Failed to calculate statistics:', error);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const createEmptyStatistic = (): SegmentStatistic => ({
    count: 0,
    lengthKm: 0,
    percentage: 0,
    label: 'No data'
  });

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

  const formatModelName = (key: string): string => {
    const names: Record<string, string> = {
      any: 'Any Future Flood Intersection',
      cfram_f: 'CFRAM Fluvial Model',
      cfram_c: 'CFRAM Coastal Model',
      nifm_f: 'NIFM Fluvial Model',
      ncfhm_c: 'NCFHM Coastal Model'
    };
    return names[key] || key;
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
              Total Network Analyzed: {stats?.totalLengthKm.toFixed(1)} km 
              ({stats?.totalSegments.toLocaleString()} segments)
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

  if (!stats || stats.scenarios.length === 0) {
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
        {stats.scenarios.map((scenario, index) => (
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
        disabled={currentSlide === stats.scenarios.length - 1}
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
          {stats.scenarios.map((scenario, index) => (
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