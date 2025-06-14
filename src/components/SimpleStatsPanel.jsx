import React, { useState, useEffect } from 'react';
import { Card, Statistic, Progress, Space, Tag, Spin, Empty } from 'antd';
import { WarningOutlined, RiseOutlined } from '@ant-design/icons';
import { CONFIG } from '../config/appConfig';

const SimpleStatsPanel = ({ roadLayer, onStatsChange }) => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

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
      
      // Calculate statistics for RCP 4.5 scenario
      const query45 = new Query({
        where: `(${baseWhere}) AND (${CONFIG.fields.floodAffected} = 1)`,
        outStatistics: [{
          statisticType: 'count',
          onStatisticField: CONFIG.fields.object_id,
          outStatisticFieldName: 'affected_count'
        }]
      });
      
      // Calculate statistics for RCP 8.5 scenario
      const query85 = new Query({
        where: `(${baseWhere}) AND (${CONFIG.fields.floodAffected_h} = 1)`,
        outStatistics: [{
          statisticType: 'count',
          onStatisticField: CONFIG.fields.object_id,
          outStatisticFieldName: 'affected_count'
        }]
      });
      
      // Get total count in current filter
      const queryTotal = new Query({
        where: baseWhere,
        outStatistics: [{
          statisticType: 'count',
          onStatisticField: CONFIG.fields.object_id,
          outStatisticFieldName: 'total_count'
        }]
      });
      
      const [result45, result85, resultTotal] = await Promise.all([
        roadLayer.queryFeatures(query45),
        roadLayer.queryFeatures(query85),
        roadLayer.queryFeatures(queryTotal)
      ]);
      
      const affected45 = result45.features[0]?.attributes.affected_count || 0;
      const affected85 = result85.features[0]?.attributes.affected_count || 0;
      const totalSegments = resultTotal.features[0]?.attributes.total_count || 0;
      
      // Calculate derived values
      const length45 = affected45 * 0.1; // Each segment is 0.1km
      const length85 = affected85 * 0.1;
      const totalLength = totalSegments * 0.1;
      
      const percent45 = totalSegments > 0 ? (affected45 / totalSegments) * 100 : 0;
      const percent85 = totalSegments > 0 ? (affected85 / totalSegments) * 100 : 0;
      
      setStats({
        rcp45: {
          segments: affected45,
          length: length45,
          percent: percent45
        },
        rcp85: {
          segments: affected85,
          length: length85,
          percent: percent85
        },
        total: {
          segments: totalSegments,
          length: totalLength
        }
      });
      
      // Notify parent component
      if (onStatsChange) {
        onStatsChange({
          rcp45: { segments: affected45, length: length45, percent: percent45 },
          rcp85: { segments: affected85, length: length85, percent: percent85 },
          total: { segments: totalSegments, length: totalLength }
        });
      }
      
    } catch (error) {
      console.error('Failed to calculate statistics:', error);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevel = (percent) => {
    if (percent < 5) return { level: 'Low', color: 'success' };
    if (percent < 15) return { level: 'Medium', color: 'warning' };
    if (percent < 25) return { level: 'High', color: 'orange' };
    return { level: 'Extreme', color: 'error' };
  };

  if (loading) {
    return (
      <Card 
        size="small"
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          width: 350,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin />
          <p style={{ marginTop: 10 }}>Calculating statistics...</p>
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
          width: 350,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        <Empty description="No statistics available" />
      </Card>
    );
  }

  const risk45 = getRiskLevel(stats.rcp45.percent);
  const risk85 = getRiskLevel(stats.rcp85.percent);

  return (
    <Card
      title={
        <Space>
          <WarningOutlined />
          <span>Flood Risk Statistics</span>
        </Space>
      }
      size="small"
      style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        width: 350,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* Total Network Stats */}
        <div style={{ 
          padding: '12px', 
          background: '#f5f5f5', 
          borderRadius: 4,
          marginBottom: 8 
        }}>
          <Statistic
            title="Total Road Network"
            value={stats.total.length.toFixed(1)}
            suffix="km"
            prefix={<RiseOutlined />}
          />
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            {stats.total.segments.toLocaleString()} segments analyzed
          </div>
        </div>

        {/* RCP 4.5 Stats */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Space>
              <strong>RCP 4.5 Scenario</strong>
              <Tag color="blue">10-20 year</Tag>
            </Space>
            <Tag color={risk45.color}>{risk45.level} Risk</Tag>
          </div>
          <Statistic
            value={stats.rcp45.length.toFixed(1)}
            suffix="km affected"
            valueStyle={{ fontSize: 20 }}
          />
          <Progress
            percent={stats.rcp45.percent}
            format={(percent) => `${percent.toFixed(1)}%`}
            strokeColor={risk45.color === 'error' ? '#ff4d4f' : undefined}
            status={risk45.color === 'error' ? 'exception' : 'normal'}
          />
        </div>

        {/* RCP 8.5 Stats */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Space>
              <strong>RCP 8.5 Scenario</strong>
              <Tag color="red">100-200 year</Tag>
            </Space>
            <Tag color={risk85.color}>{risk85.level} Risk</Tag>
          </div>
          <Statistic
            value={stats.rcp85.length.toFixed(1)}
            suffix="km affected"
            valueStyle={{ fontSize: 20 }}
          />
          <Progress
            percent={stats.rcp85.percent}
            format={(percent) => `${percent.toFixed(1)}%`}
            strokeColor={risk85.color === 'error' ? '#ff4d4f' : undefined}
            status={risk85.color === 'error' ? 'exception' : 'normal'}
          />
        </div>
      </Space>
    </Card>
  );
};

export default SimpleStatsPanel;