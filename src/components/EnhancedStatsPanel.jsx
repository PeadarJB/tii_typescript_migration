import React, { useState, useEffect } from 'react';
import { Card, Statistic, Progress, Space, Tag, Spin, Empty, Carousel, Typography, Row, Col, Tooltip } from 'antd';
import { 
  WarningOutlined, 
  RiseOutlined, 
  EnvironmentOutlined,
  ThunderboltOutlined,
  InfoCircleOutlined,
  LeftOutlined,
  RightOutlined
} from '@ant-design/icons';
import { CONFIG } from '../config/appConfig';

const { Title, Text } = Typography;

const EnhancedStatsPanel = ({ roadLayer, onStatsChange }) => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [carouselRef, setCarouselRef] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (roadLayer) {
      // Load initial statistics
      calculateStatistics();
      
      // Listen for definition expression changes
      const handle = roadLayer.watch('definitionExpression', () => {
        calculateStatistics();
      });
      
      return () => handle.remove();
    }
  }, [roadLayer]);

  const calculateStatistics = async () => {
    if (!roadLayer) return;
    
    try {
      setLoading(true);
      const Query = (await import('@arcgis/core/rest/support/Query.js')).default;
      
      // Get current filter
      const baseWhere = roadLayer.definitionExpression || '1=1';
      
      // Define the statistics to calculate for each scenario
      const rcp45Fields = {
        any: CONFIG.fields.floodAffected,
        cfram_f: CONFIG.fields.cfram_f_m_0010,
        cfram_c: CONFIG.fields.cfram_c_m_0010,
        nifm_f: CONFIG.fields.nifm_f_m_0020,
        ncfhm_c: CONFIG.fields.ncfhm_c_m_0010
      };
      
      const rcp85Fields = {
        any: CONFIG.fields.floodAffected_h,
        cfram_f: CONFIG.fields.cfram_f_h_0100,
        cfram_c: CONFIG.fields.cfram_c_h_0200,
        nifm_f: CONFIG.fields.nifm_f_h_0100,
        ncfhm_c: CONFIG.fields.ncfhm_c_c_0200
      };
      
      // Calculate statistics for each field
      const calculateFieldStats = async (fields) => {
        const results = {};
        
        for (const [key, field] of Object.entries(fields)) {
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
          const lengthKm = count * 0.1; // Each segment is 0.1km
          
          results[key] = {
            count,
            lengthKm,
            field
          };
        }
        
        return results;
      };
      
      // Get total count in current filter
      const queryTotal = new Query({
        where: baseWhere,
        outStatistics: [{
          statisticType: 'count',
          onStatisticField: CONFIG.fields.object_id,
          outStatisticFieldName: 'total_count'
        }]
      });
      
      const [rcp45Stats, rcp85Stats, totalResult] = await Promise.all([
        calculateFieldStats(rcp45Fields),
        calculateFieldStats(rcp85Fields),
        roadLayer.queryFeatures(queryTotal)
      ]);
      
      const totalSegments = totalResult.features[0]?.attributes.total_count || 0;
      const totalLength = totalSegments * 0.1;
      
      // Calculate percentages
      const calculatePercentages = (fieldStats) => {
        const result = {};
        for (const [key, data] of Object.entries(fieldStats)) {
          result[key] = {
            ...data,
            percentage: totalSegments > 0 ? (data.count / totalSegments) * 100 : 0
          };
        }
        return result;
      };
      
      const statsData = {
        rcp45: calculatePercentages(rcp45Stats),
        rcp85: calculatePercentages(rcp85Stats),
        total: {
          segments: totalSegments,
          length: totalLength
        }
      };
      
      setStats(statsData);
      
      // Notify parent component
      if (onStatsChange) {
        onStatsChange(statsData);
      }
      
    } catch (error) {
      console.error('Failed to calculate statistics:', error);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevel = (percent) => {
    if (percent < 5) return { level: 'Low', color: 'success', icon: '✓' };
    if (percent < 15) return { level: 'Medium', color: 'warning', icon: '!' };
    if (percent < 25) return { level: 'High', color: 'orange', icon: '!!' };
    return { level: 'Extreme', color: 'error', icon: '!!!' };
  };

  const getModelIcon = (modelType) => {
    if (modelType.includes('coastal')) return <EnvironmentOutlined />;
    return <ThunderboltOutlined />;
  };

  const formatModelName = (key) => {
    const names = {
      any: 'Any Future Flood Intersection',
      cfram_f: 'CFRAM Fluvial Model',
      cfram_c: 'CFRAM Coastal Model',
      nifm_f: 'NIFM Fluvial Model',
      ncfhm_c: 'NCFHM Coastal Model'
    };
    return names[key] || key;
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
          height: 380,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ textAlign: 'center', padding: '100px 20px' }}>
          <Spin size="large" />
          <p style={{ marginTop: 16 }}>Calculating flood risk statistics...</p>
        </div>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card 
        size="small"
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          width: 450,
          height: 380,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        <Empty description="No statistics available" />
      </Card>
    );
  }

  const renderScenarioSlide = (scenario, data) => {
    const anyRisk = getRiskLevel(data.any.percentage);
    
    return (
      <div style={{ padding: '0 20px' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <Title level={4} style={{ margin: 0 }}>
              {scenario === 'rcp45' ? (
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
              {scenario === 'rcp45' ? '10-20 year return period' : '100-200 year return period'}
            </Text>
          </div>
          
          {/* Overall Risk Summary */}
          <Card 
            size="small" 
            style={{ 
              background: anyRisk.color === 'error' ? '#fff2e8' : '#f6ffed',
              borderColor: anyRisk.color === 'error' ? '#ffbb96' : '#b7eb8f'
            }}
          >
            <Row gutter={16} align="middle">
              <Col span={12}>
                <Statistic
                  title="Total Roads at Risk"
                  value={data.any.lengthKm.toFixed(1)}
                  suffix="km"
                  prefix={<RiseOutlined />}
                />
              </Col>
              <Col span={12} style={{ textAlign: 'right' }}>
                <Tag color={anyRisk.color} style={{ fontSize: 14, padding: '4px 12px' }}>
                  {anyRisk.icon} {anyRisk.level} Risk
                </Tag>
                <div style={{ marginTop: 8 }}>
                  <Text strong style={{ fontSize: 20, color: anyRisk.color === 'error' ? '#ff4d4f' : undefined }}>
                    {data.any.percentage.toFixed(1)}%
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
              {Object.entries(data).filter(([key]) => key !== 'any').map(([key, modelData]) => (
                <div key={key} style={{ 
                  padding: '8px 12px', 
                  background: '#fafafa', 
                  borderRadius: 4,
                  border: '1px solid #f0f0f0'
                }}>
                  <Row align="middle">
                    <Col span={14}>
                      <Space size="small">
                        {getModelIcon(key)}
                        <Text style={{ fontSize: 13 }}>{formatModelName(key)}</Text>
                      </Space>
                    </Col>
                    <Col span={5} style={{ textAlign: 'right' }}>
                      <Text strong>{modelData.lengthKm.toFixed(1)} km</Text>
                    </Col>
                    <Col span={5} style={{ textAlign: 'right' }}>
                      <Progress
                        percent={modelData.percentage}
                        size="small"
                        format={(percent) => `${percent.toFixed(1)}%`}
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
            marginTop: 8,
            padding: '8px',
            background: '#f5f5f5',
            borderRadius: 4,
            textAlign: 'center'
          }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Total Network Analyzed: {stats.total.length.toFixed(1)} km ({stats.total.segments.toLocaleString()} segments)
            </Text>
          </div>
        </Space>
      </div>
    );
  };

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
        height: 380,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
      bodyStyle={{ 
        padding: '12px 0',
        height: 'calc(100% - 45px)',
        position: 'relative'
      }}
    >
      <Carousel
        ref={setCarouselRef}
        dots={{ className: 'custom-dots' }}
        afterChange={setCurrentSlide}
        style={{ height: '100%' }}
      >
        {/* RCP 4.5 Slide */}
        <div>
          {stats && renderScenarioSlide('rcp45', stats.rcp45)}
        </div>
        
        {/* RCP 8.5 Slide */}
        <div>
          {stats && renderScenarioSlide('rcp85', stats.rcp85)}
        </div>
      </Carousel>
      
      {/* Navigation Arrows */}
      <Button
        type="text"
        icon={<LeftOutlined />}
        onClick={() => carouselRef?.prev()}
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
        icon={<RightOutlined />}
        onClick={() => carouselRef?.next()}
        style={{
          position: 'absolute',
          right: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10
        }}
        disabled={currentSlide === 1}
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
          <Tag color={currentSlide === 0 ? 'blue' : 'default'}>
            RCP 4.5
          </Tag>
          <Tag color={currentSlide === 1 ? 'red' : 'default'}>
            RCP 8.5
          </Tag>
        </Space>
      </div>
    </Card>
  );
};

export default EnhancedStatsPanel;