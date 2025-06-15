import React, { useState, useEffect } from 'react';
import { Card, Statistic, Progress, Space, Tag, Spin, Empty, Carousel, Typography, Row, Col, Tooltip, Button } from 'antd';
import {
  WarningOutlined,
  RiseOutlined,
  EnvironmentOutlined,
  ThunderboltOutlined,
  InfoCircleOutlined,
  LeftOutlined,
  RightOutlined
} from '@ant-design/icons';
import { CONFIG } from '../config/appConfig.js';


const { Title, Text } = Typography;

const EnhancedStatsPanel = ({ roadLayer, onStatsChange }) => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [carouselRef, setCarouselRef] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (roadLayer) {
      const handleFilterChange = () => {
        // A filter is considered active if the definitionExpression is not the default '1=1'
        const isFiltered = roadLayer.definitionExpression && roadLayer.definitionExpression !== '1=1';
        
        if (isFiltered) {
          calculateStatistics();
        } else {
          // If no filters are active, clear the stats to show the placeholder
          setStats(null);
          setLoading(false);
          if (onStatsChange) {
            onStatsChange(null);
          }
        }
      };

      // Run once on initial load
      handleFilterChange();
      
      // Listen for subsequent changes to the layer's filter
      const handle = roadLayer.watch('definitionExpression', handleFilterChange);
      
      // Cleanup the watcher when the component unmounts
      return () => handle.remove();
    }
  }, [roadLayer]);

  const calculateStatistics = async () => {
     if (!roadLayer) return;
     
     try {
        setLoading(true);
        const Query = (await import('@arcgis/core/rest/support/Query.js')).default;
        
        const baseWhere = roadLayer.definitionExpression || '1=1';

        // Get total count in current filter to calculate percentages accurately
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
        const totalLength = totalSegments * 0.1;

        // Define field sets for each scenario based on appConfig.js
        const rcp45_fields = {
            any: CONFIG.fields.floodAffected,
            cfram_f: CONFIG.fields.cfram_f_m_0010,
            cfram_c: CONFIG.fields.cfram_c_m_0010,
            nifm_f: CONFIG.fields.nifm_f_m_0020,
            ncfhm_c: CONFIG.fields.ncfhm_c_m_0010
        };

        const rcp85_fields = {
            any: CONFIG.fields.floodAffected_h,
            cfram_f: CONFIG.fields.cfram_f_h_0100,
            cfram_c: CONFIG.fields.cfram_c_h_0200,
            nifm_f: CONFIG.fields.nifm_f_h_0100,
            ncfhm_c: CONFIG.fields.ncfhm_c_c_0200
        };
        
        // Helper to run queries for a set of fields
        const getStatsForScenario = async (fields) => {
            const scenarioStats = {};
            for (const [key, field] of Object.entries(fields)) {
                if (!field) continue; // Skip if field is not defined in config
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
                    lengthKm: count * 0.1,
                    percentage: totalSegments > 0 ? (count / totalSegments) * 100 : 0
                };
            }
            return scenarioStats;
        };

        const [rcp45, rcp85] = await Promise.all([
            getStatsForScenario(rcp45_fields),
            getStatsForScenario(rcp85_fields)
        ]);
        
        const finalStats = {
            rcp45,
            rcp85,
            total: {
                segments: totalSegments,
                length: totalLength
            }
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

  const getRiskLevel = (percent) => {
    if (percent < 5) return { level: 'Low', color: 'success', icon: '✓' };
    if (percent < 15) return { level: 'Medium', color: 'warning', icon: '!' };
    if (percent < 25) return { level: 'High', color: 'orange', icon: '!!' };
    return { level: 'Extreme', color: 'error', icon: '!!!' };
  };

  const getModelIcon = (modelType) => {
    if (modelType.includes('c')) return <EnvironmentOutlined />; // Coastal
    return <ThunderboltOutlined />; // Fluvial
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
        style={{ position: 'absolute', bottom: 16, left: 16, width: 450, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
      >
        <div style={{ textAlign: 'center', padding: '100px 20px' }}>
          <Spin size="large" />
          <p style={{ marginTop: 16 }}>Calculating statistics...</p>
        </div>
      </Card>
    );
  }

  // If not loading and stats are null, it means no filters are applied.
  if (!stats) {
    return (
      <Card
        size="small"
        style={{ position: 'absolute', bottom: 16, left: 16, width: 450, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}
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

  const renderScenarioSlide = (scenario, data) => {
    // Check if data and data.any exist before trying to access properties
    if (!data || !data.any) {
        return (
            <div style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 250 }}>
                <Empty description={`No data for ${scenario.toUpperCase()} scenario found within the current filter.`} />
            </div>
        );
    }

    const anyRisk = getRiskLevel(data.any.percentage);
    
    return (
      <div style={{ padding: '0 20px 20px 20px' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {/* Header */}
          <div style={{ textAlign: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>
              {scenario === 'rcp45' ? (
                <Space><Tag color="blue">RCP 4.5</Tag><span>Flood Scenario</span></Space>
              ) : (
                <Space><Tag color="red">RCP 8.5</Tag><span>Flood Scenario</span></Space>
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
              background: anyRisk.color === 'error' ? '#fff2e8' : (anyRisk.color === 'warning' || anyRisk.color === 'orange' ? '#fffbe6' : '#f6ffed'),
              borderColor: anyRisk.color === 'error' ? '#ffbb96' : (anyRisk.color === 'warning' || anyRisk.color === 'orange' ? '#ffe58f' : '#b7eb8f')
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
            <Text strong style={{ display: 'block', marginBottom: 8 }}>Model Breakdown:</Text>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              {Object.entries(data).filter(([key]) => key !== 'any' && data[key] && data[key].count > 0).map(([key, modelData]) => (
                <div key={key} style={{ padding: '8px 12px', background: '#fafafa', borderRadius: 4, border: '1px solid #f0f0f0' }}>
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
          <div style={{ padding: '8px', background: '#f5f5f5', borderRadius: 4, textAlign: 'center' }}>
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
      style={{ position: 'absolute', bottom: 16, left: 16, width: 450, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
      bodyStyle={{ padding: '12px 0 30px 0', position: 'relative' }} // Added padding-bottom to make space for carousel dots
    >
      <Carousel
        ref={setCarouselRef}
        dots={false}
        afterChange={setCurrentSlide}
        adaptiveHeight // This will adjust the carousel height to the current slide's content
      >
        <div>{stats && renderScenarioSlide('rcp45', stats.rcp45)}</div>
        <div>{stats && renderScenarioSlide('rcp85', stats.rcp85)}</div>
      </Carousel>
      
      {/* Navigation Arrows */}
      <Button
        type="text"
        shape="circle"
        icon={<LeftOutlined />}
        onClick={() => carouselRef?.prev()}
        style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}
        disabled={currentSlide === 0}
      />
      <Button
        type="text"
        shape="circle"
        icon={<RightOutlined />}
        onClick={() => carouselRef?.next()}
        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}
        disabled={currentSlide === 1}
      />
      
      {/* Slide Indicator */}
      <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center' }}>
        <Space size="small">
          <Tag color={currentSlide === 0 ? 'blue' : 'default'} style={{ cursor: 'pointer' }} onClick={() => carouselRef?.goTo(0)}>RCP 4.5</Tag>
          <Tag color={currentSlide === 1 ? 'red' : 'default'} style={{ cursor: 'pointer' }} onClick={() => carouselRef?.goTo(1)}>RCP 8.5</Tag>
        </Space>
      </div>
    </Card>
  );
};

export default EnhancedStatsPanel;
