import React, { useState, useEffect, useRef } from 'react';
import { Card, Select, Button, Space, Spin, Empty, Radio, InputNumber, Switch } from 'antd';
import { BarChartOutlined, ReloadOutlined, PieChartOutlined, DownloadOutlined } from '@ant-design/icons';
import Chart from 'chart.js/auto';
import { CONFIG } from '../config/appConfig';

const EnhancedChartPanel = ({ roadLayer }) => {
  const [loading, setLoading] = useState(false);
  const [groupByField, setGroupByField] = useState('COUNTY');
  const [selectedFeatures, setSelectedFeatures] = useState(['future_flood_intersection_m']);
  const [chartType, setChartType] = useState('bar');
  const [maxCategories, setMaxCategories] = useState(10);
  const [metric, setMetric] = useState('length');
  const [chartData, setChartData] = useState(null);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // Feature options from config
  const featureOptions = CONFIG.chartingFeatures.map(feature => ({
    label: feature.label,
    value: feature.field,
    description: feature.description
  }));

  // Group by field options
  const groupByOptions = [
    { label: 'County', value: 'COUNTY' },
    { label: 'Criticality Rating', value: 'Criticality_Rating_Num1' },
    { label: 'Road Subnet', value: 'Subnet' },
    { label: 'Lifeline Route', value: 'Lifeline' },
    { label: 'Route', value: 'Route' }
  ];

  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (chartData && chartRef.current) {
      renderChart();
    }
  }, [chartData, chartType]);

  const generateChart = async () => {
    if (!roadLayer || selectedFeatures.length === 0) return;

    try {
      setLoading(true);
      const Query = (await import('@arcgis/core/rest/support/Query.js')).default;
      
      const baseWhere = roadLayer.definitionExpression || '1=1';
      const allData = [];
      
      // Query for each selected feature
      for (const featureField of selectedFeatures) {
        const feature = CONFIG.chartingFeatures.find(f => f.field === featureField);
        const whereClause = `(${baseWhere}) AND (${featureField} = 1)`;
        
        const query = new Query({
          where: whereClause,
          groupByFieldsForStatistics: [groupByField],
          outStatistics: [{
            statisticType: 'count',
            onStatisticField: 'OBJECTID',
            outStatisticFieldName: 'segment_count'
          }],
          orderByFields: ['segment_count DESC']
        });

        const results = await roadLayer.queryFeatures(query);
        
        results.features.forEach((f) => {
          const groupValue = f.attributes[groupByField] || 'Unknown';
          const count = f.attributes.segment_count || 0;
          
          allData.push({
            category: String(groupValue),
            feature: feature.label,
            featureField: featureField,
            count: count,
            length: count * 0.1
          });
        });
      }

      // Sort and limit data
      const categoryTotals = {};
      allData.forEach(item => {
        const value = metric === 'length' ? item.length : item.count;
        categoryTotals[item.category] = (categoryTotals[item.category] || 0) + value;
      });
      
      const topCategories = Object.entries(categoryTotals)
        .sort(([, a], [, b]) => b - a)
        .slice(0, maxCategories)
        .map(([category]) => category);
      
      // Filter to top categories
      const filteredData = allData.filter(item => topCategories.includes(item.category));
      
      // Prepare chart data
      const datasets = selectedFeatures.map((featureField, index) => {
        const feature = CONFIG.chartingFeatures.find(f => f.field === featureField);
        const data = topCategories.map(category => {
          const item = filteredData.find(d => 
            d.category === category && d.featureField === featureField
          );
          return item ? (metric === 'length' ? item.length : item.count) : 0;
        });
        
        return {
          label: feature.label,
          data: data,
          backgroundColor: getChartColor(index, 0.7),
          borderColor: getChartColor(index, 1),
          borderWidth: 1
        };
      });

      setChartData({
        labels: topCategories,
        datasets: datasets
      });

    } catch (error) {
      console.error('Failed to generate chart:', error);
      setChartData(null);
    } finally {
      setLoading(false);
    }
  };

  const getChartColor = (index, opacity = 1) => {
    const colors = [
      `rgba(0, 61, 130, ${opacity})`,    // TII Blue
      `rgba(250, 173, 20, ${opacity})`,  // Warning Orange
      `rgba(82, 196, 26, ${opacity})`,   // Success Green
      `rgba(255, 77, 79, ${opacity})`,   // Danger Red
      `rgba(24, 144, 255, ${opacity})`,  // Info Blue
      `rgba(114, 46, 209, ${opacity})`,  // Purple
      `rgba(250, 140, 22, ${opacity})`,  // Dark Orange
      `rgba(19, 194, 194, ${opacity})`   // Cyan
    ];
    return colors[index % colors.length];
  };

  const renderChart = () => {
    const ctx = chartRef.current.getContext('2d');
    
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const config = {
      type: chartType,
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: selectedFeatures.length > 1,
            position: 'top'
          },
          title: {
            display: true,
            text: `${metric === 'length' ? 'Road Length' : 'Segment Count'} by ${
              groupByOptions.find(o => o.value === groupByField)?.label
            }`
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const value = context.parsed.y || context.parsed;
                const suffix = metric === 'length' ? ' km' : ' segments';
                return `${label}: ${value.toFixed(1)}${suffix}`;
              }
            }
          }
        }
      }
    };

    // Add specific options for different chart types
    if (chartType === 'bar') {
      config.options.scales = {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: metric === 'length' ? 'Length (km)' : 'Segment Count'
          }
        },
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 45
          }
        }
      };
    } else if (chartType === 'pie') {
      config.options.plugins.legend.position = 'right';
    }

    chartInstance.current = new Chart(ctx, config);
  };

  const downloadChart = () => {
    if (chartInstance.current) {
      const url = chartInstance.current.toBase64Image();
      const link = document.createElement('a');
      link.download = `flood_risk_chart_${new Date().toISOString().split('T')[0]}.png`;
      link.href = url;
      link.click();
    }
  };

  return (
    <Card
      title={
        <Space>
          <BarChartOutlined />
          <span>Advanced Analysis</span>
        </Space>
      }
      size="small"
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        width: 450,
        height: 500,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
      extra={
        <Space size="small">
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={downloadChart}
            disabled={!chartData}
          />
          <Button
            size="small"
            type="primary"
            icon={<ReloadOutlined />}
            onClick={generateChart}
            loading={loading}
          >
            Generate
          </Button>
        </Space>
      }
      bodyStyle={{ 
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100% - 45px)'
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        {/* Feature Selection */}
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          placeholder="Select features to analyze..."
          value={selectedFeatures}
          onChange={setSelectedFeatures}
          options={featureOptions}
          maxTagCount={2}
        />
        
        {/* Group By */}
        <Select
          style={{ width: '100%' }}
          value={groupByField}
          onChange={setGroupByField}
          options={groupByOptions}
          placeholder="Group by..."
        />
        
        {/* Chart Options Row */}
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Radio.Group 
            value={chartType} 
            onChange={(e) => setChartType(e.target.value)}
            size="small"
            disabled={selectedFeatures.length > 1 && e?.target?.value === 'pie'}
          >
            <Radio.Button value="bar">
              <BarChartOutlined /> Bar
            </Radio.Button>
            <Radio.Button value="pie" disabled={selectedFeatures.length > 1}>
              <PieChartOutlined /> Pie
            </Radio.Button>
          </Radio.Group>
          
          <Radio.Group 
            value={metric} 
            onChange={(e) => setMetric(e.target.value)}
            size="small"
          >
            <Radio.Button value="length">Length (km)</Radio.Button>
            <Radio.Button value="count">Segments</Radio.Button>
          </Radio.Group>
        </Space>
        
        {/* Max Categories */}
        <Space align="center">
          <span style={{ fontSize: 12 }}>Max Categories:</span>
          <InputNumber
            min={5}
            max={50}
            value={maxCategories}
            onChange={setMaxCategories}
            size="small"
            style={{ width: 60 }}
          />
        </Space>
      </Space>
      
      {/* Chart Area */}
      <div style={{ flex: 1, position: 'relative', marginTop: 8 }}>
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
            description="Configure options and click 'Generate' to create a chart" 
            style={{ marginTop: 50 }}
          />
        )}
      </div>
    </Card>
  );
};

export default EnhancedChartPanel;