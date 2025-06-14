import React, { useState, useEffect, useRef } from 'react';
import { Card, Select, Button, Space, Spin, Empty } from 'antd';
import { BarChartOutlined, ReloadOutlined } from '@ant-design/icons';
import Chart from 'chart.js/auto';

const SimpleChartPanel = ({ roadLayer }) => {
  const [loading, setLoading] = useState(false);
  const [groupByField, setGroupByField] = useState('COUNTY');
  const [chartData, setChartData] = useState(null);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // Simple grouping fields
  const groupByOptions = [
    { label: 'County', value: 'COUNTY' },
    { label: 'Criticality Rating', value: 'Criticality_Rating_Num1' },
    { label: 'Road Subnet', value: 'Subnet' },
    { label: 'Lifeline Route', value: 'Lifeline' }
  ];

  useEffect(() => {
    return () => {
      // Cleanup chart on unmount
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    // Update chart when data changes
    if (chartData && chartRef.current) {
      renderChart();
    }
  }, [chartData]);

  const generateChart = async () => {
    if (!roadLayer) return;

    try {
      setLoading(true);
      const Query = (await import('@arcgis/core/rest/support/Query.js')).default;
      
      // Get current filter
      const baseWhere = roadLayer.definitionExpression || '1=1';
      
      // Query for grouped statistics
      const query = new Query({
        where: baseWhere,
        groupByFieldsForStatistics: [groupByField],
        outStatistics: [{
          statisticType: 'count',
          onStatisticField: 'OBJECTID',
          outStatisticFieldName: 'segment_count'
        }],
        orderByFields: ['segment_count DESC']
      });

      const results = await roadLayer.queryFeatures(query);
      
      // Process results
      const labels = [];
      const values = [];
      const colors = [];
      
      // Take top 10 results
      const topResults = results.features.slice(0, 10);
      
      topResults.forEach((feature, index) => {
        const groupValue = feature.attributes[groupByField] || 'Unknown';
        const count = feature.attributes.segment_count || 0;
        const lengthKm = count * 0.1;
        
        labels.push(String(groupValue));
        values.push(lengthKm);
        
        // Simple color scheme
        colors.push(`hsl(${index * 36}, 70%, 50%)`);
      });

      setChartData({
        labels,
        datasets: [{
          label: 'Road Length (km)',
          data: values,
          backgroundColor: colors,
          borderColor: colors.map(c => c.replace('50%', '40%')),
          borderWidth: 1
        }]
      });

    } catch (error) {
      console.error('Failed to generate chart:', error);
      setChartData(null);
    } finally {
      setLoading(false);
    }
  };

  const renderChart = () => {
    const ctx = chartRef.current.getContext('2d');
    
    // Destroy previous chart if exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Create new chart
    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: `Road Network by ${groupByOptions.find(o => o.value === groupByField)?.label}`
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Length (km)'
            }
          },
          x: {
            ticks: {
              maxRotation: 45,
              minRotation: 45
            }
          }
        }
      }
    });
  };

  return (
    <Card
      title={
        <Space>
          <BarChartOutlined />
          <span>Data Analysis</span>
        </Space>
      }
      size="small"
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        width: 400,
        height: 400,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
      extra={
        <Button
          size="small"
          icon={<ReloadOutlined />}
          onClick={generateChart}
          loading={loading}
        >
          Generate
        </Button>
      }
    >
      <Space direction="vertical" style={{ width: '100%', height: '100%' }}>
        <Select
          style={{ width: '100%' }}
          value={groupByField}
          onChange={setGroupByField}
          options={groupByOptions}
          placeholder="Group by..."
        />
        
        <div style={{ flex: 1, position: 'relative', height: 'calc(100% - 80px)' }}>
          {loading ? (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100%' 
            }}>
              <Spin />
            </div>
          ) : chartData ? (
            <canvas ref={chartRef} />
          ) : (
            <Empty 
              description="Click 'Generate' to create a chart" 
              style={{ marginTop: 50 }}
            />
          )}
        </div>
      </Space>
    </Card>
  );
};

export default SimpleChartPanel;