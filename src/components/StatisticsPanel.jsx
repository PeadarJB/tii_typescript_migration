import React, { useState, useEffect } from 'react';
import { ProCard, StatisticCard } from '@ant-design/pro-components';
import { Row, Col, Progress, Space, Tag, Segmented, Tooltip } from 'antd';
import {
  WarningOutlined,
  RiseOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import { theme, getRiskColor, floodRiskColors } from '../../config/themeConfig';

const { Statistic } = StatisticCard;

/**
 * StatisticsPanel - Display flood risk statistics using Ant Design components
 */
const StatisticsPanel = ({ appManager }) => {
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState('rcp45');

  // Listen for filter changes and data updates
  useEffect(() => {
    if (appManager) {
      // Initial load
      loadStatistics();

      // Listen for filter changes
      const handleFilterChange = () => {
        loadStatistics();
      };

      appManager.on('filterChange', handleFilterChange);

      return () => {
        appManager.off('filterChange', handleFilterChange);
      };
    }
  }, [appManager]);

  // Load statistics from the statistics manager
  const loadStatistics = async () => {
    try {
      setLoading(true);
      const statsData = appManager.getCurrentStatistics();
      setStatistics(statsData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load statistics:', error);
      setLoading(false);
    }
  };

  // Get statistics for selected scenario
  const getScenarioStats = () => {
    const scenarioData = statistics.find(s => 
      selectedScenario === 'rcp45' 
        ? s.title.includes('RCP 4.5') 
        : s.title.includes('RCP 8.5')
    );
    return scenarioData?.stats || [];
  };

  // Calculate total affected length
  const getTotalAffectedLength = () => {
    const stats = getScenarioStats();
    return stats.reduce((total, stat) => total + (stat.derivedLengthKm || 0), 0);
  };

  // Get risk level based on percentage
  const getRiskLevel = (percentage) => {
    if (percentage < 5) return { level: 'low', color: floodRiskColors.low };
    if (percentage < 15) return { level: 'medium', color: floodRiskColors.medium };
    if (percentage < 25) return { level: 'high', color: floodRiskColors.high };
    return { level: 'extreme', color: floodRiskColors.extreme };
  };

  const totalNetworkLength = 5338.2; // Total network in km (53382 segments * 0.1km)
  const totalAffected = getTotalAffectedLength();
  const percentageAffected = (totalAffected / totalNetworkLength) * 100;
  const riskInfo = getRiskLevel(percentageAffected);

  return (
    <ProCard
      title={
        <Space>
          <WarningOutlined />
          <span>Flood Risk Statistics</span>
        </Space>
      }
      extra={
        <Segmented
          size="small"
          value={selectedScenario}
          onChange={setSelectedScenario}
          options={[
            {
              label: (
                <Tooltip title="Mid-range climate scenario (10-20 year return period)">
                  <Space size={4}>
                    <Tag color="blue" style={{ margin: 0 }}>RCP 4.5</Tag>
                  </Space>
                </Tooltip>
              ),
              value: 'rcp45',
            },
            {
              label: (
                <Tooltip title="High-range climate scenario (100-200 year return period)">
                  <Space size={4}>
                    <Tag color="red" style={{ margin: 0 }}>RCP 8.5</Tag>
                  </Space>
                </Tooltip>
              ),
              value: 'rcp85',
            },
          ]}
        />
      }
      size="small"
      bordered
      loading={loading}
      style={{
        boxShadow: theme.token.boxShadowSecondary,
      }}
      bodyStyle={{ padding: '12px' }}
    >
      {/* Summary Statistics */}
      <StatisticCard
        statistic={{
          title: (
            <Space>
              <span>Total Roads at Risk</span>
              <Tooltip title="Total length of road network affected by flooding">
                <InfoCircleOutlined style={{ fontSize: 12, color: theme.token.colorTextSecondary }} />
              </Tooltip>
            </Space>
          ),
          value: totalAffected.toFixed(1),
          suffix: 'km',
          description: (
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Progress
                percent={percentageAffected}
                strokeColor={riskInfo.color}
                status={riskInfo.level === 'extreme' ? 'exception' : 'active'}
                format={(percent) => `${percent.toFixed(1)}% of network`}
              />
              <Tag color={riskInfo.color}>
                {riskInfo.level.toUpperCase()} RISK
              </Tag>
            </Space>
          ),
        }}
        style={{ marginBottom: 12 }}
      />

      {/* Detailed Statistics Grid */}
      <Row gutter={[8, 8]}>
        {getScenarioStats().map((stat, index) => {
          if (!stat || stat.count === 0) return null;
          
          const percentage = ((stat.derivedLengthKm / totalNetworkLength) * 100).toFixed(2);
          const icon = stat.label.includes('Coastal') ? <EnvironmentOutlined /> : <ThunderboltOutlined />;
          
          return (
            <Col span={24} key={index}>
              <StatisticCard
                statistic={{
                  title: (
                    <Space size={4}>
                      {icon}
                      <span style={{ fontSize: 12 }}>{stat.label}</span>
                    </Space>
                  ),
                  value: stat.derivedLengthKm.toFixed(1),
                  suffix: 'km',
                  layout: 'horizontal',
                }}
                chart={
                  <Progress
                    type="line"
                    percent={parseFloat(percentage)}
                    strokeColor={theme.token.colorPrimary}
                    showInfo={false}
                    size="small"
                    style={{ width: 80 }}
                  />
                }
                chartPlacement="right"
                size="small"
                style={{
                  border: `1px solid ${theme.token.colorBorderSecondary}`,
                  borderRadius: theme.token.borderRadius,
                }}
              />
            </Col>
          );
        })}
      </Row>

      {/* No Data State */}
      {getScenarioStats().length === 0 && !loading && (
        <div style={{ 
          textAlign: 'center', 
          padding: '20px',
          color: theme.token.colorTextSecondary 
        }}>
          <WarningOutlined style={{ fontSize: 24, marginBottom: 8 }} />
          <p>No flood risk data available for current filters</p>
        </div>
      )}
    </ProCard>
  );
};

export default StatisticsPanel;