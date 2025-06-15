import React, { useState, useEffect, useRef } from 'react';
import { Card, Select, Button, Space, Spin, Empty, Radio, InputNumber, Tag, Tooltip, Modal, message } from 'antd';
import { 
  BarChartOutlined, 
  ReloadOutlined, 
  PieChartOutlined, 
  DownloadOutlined,
  ClearOutlined,
  ExpandOutlined,
  InfoCircleOutlined 
} from '@ant-design/icons';
import Chart from 'chart.js/auto';
import { CONFIG } from '../config/appConfig';

const EnhancedChartPanel = ({ roadLayer }) => {
  const [loading, setLoading] = useState(false);
  const [chartConfig, setChartConfig] = useState({
    features: [],
    groupBy: '',
    measure: 'count',
    maxCategories: 10,
    chartType: 'bar'
  });
  const [groupByOptions, setGroupByOptions] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [expandedView, setExpandedView] = useState(false);
  
  const chartRef = useRef(null);
  const expandedChartRef = useRef(null);
  const chartInstance = useRef(null);
  const expandedChartInstance = useRef(null);

  // Feature options from config
  const featureOptions = CONFIG.chartingFeatures.map(feature => ({
    label: feature.label,
    value: feature.field,
    description: feature.description,
    scenario: feature.field.includes('_h') ? 'rcp85' : 'rcp45'
  }));

  // Predefined group by options
  const staticGroupByOptions = [
    { label: 'County', value: 'COUNTY', icon: '🏛️' },
    { label: 'Criticality Rating', value: 'Criticality_Rating_Num1', icon: '⚠️' },
    { label: 'Road Subnet', value: 'Subnet', icon: '🛣️' },
    { label: 'Lifeline Route', value: 'Lifeline', icon: '🚨' },
    { label: 'Route', value: 'Route', icon: '📍' }
  ];

  // Max categories options
  const maxCategoriesOptions = [
    { label: 'Top 10', value: 10 },
    { label: 'Top 20', value: 20 },
    { label: 'Top 50', value: 50 },
    { label: 'No limit', value: 999 }
  ];

  useEffect(() => {
    if (roadLayer) {
      loadDynamicGroupByOptions();
    }
  }, [roadLayer]);

  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
      if (expandedChartInstance.current) {
        expandedChartInstance.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (chartData) {
      renderChart();
    }
  }, [chartData, chartConfig.chartType]);

  const loadDynamicGroupByOptions = async () => {
    try {
      // For now, use static options. In future, could dynamically load field list
      setGroupByOptions(staticGroupByOptions);
    } catch (error) {
      console.error('Failed to load group by options:', error);
      setGroupByOptions(staticGroupByOptions);
    }
  };

  const generateChart = async () => {
    const { features, groupBy, measure, maxCategories } = chartConfig;
    
    if (!roadLayer || features.length === 0 || !groupBy) {
      message.warning('Please select features and group by field');
      return;
    }

    try {
      setLoading(true);
      const Query = (await import('@arcgis/core/rest/support/Query.js')).default;
      
      const baseWhere = roadLayer.definitionExpression || '1=1';
      const allData = [];
      
      // Query for each selected feature
      for (const featureField of features) {
        const feature = CONFIG.chartingFeatures.find(f => f.field === featureField);
        const whereClause = `(${baseWhere}) AND (${featureField} = 1)`;
        
        const query = new Query({
          where: whereClause,
          groupByFieldsForStatistics: [groupBy],
          outStatistics: [{
            statisticType: 'count',
            onStatisticField: 'OBJECTID',
            outStatisticFieldName: 'segment_count'
          }],
          orderByFields: ['segment_count DESC']
        });

        const results = await roadLayer.queryFeatures(query);
        
        results.features.forEach((f) => {
          const groupValue = f.attributes[groupBy] || 'Unknown';
          const count = f.attributes.segment_count || 0;
          
          allData.push({
            category: String(groupValue),
            feature: feature.label,
            featureField: featureField,
            scenario: feature.field.includes('_h') ? 'RCP 8.5' : 'RCP 4.5',
            count: count,
            length: count * 0.1 // km
          });
        });
      }

      // Process and limit data
      const processedData = processChartData(allData, maxCategories);
      setChartData(processedData);
      
      message.success('Chart generated successfully');
    } catch (error) {
      console.error('Failed to generate chart:', error);
      message.error('Failed to generate chart');
      setChartData(null);
    } finally {
      setLoading(false);
    }
  };

  const processChartData = (rawData, maxCategories) => {
    // Calculate totals by category
    const categoryTotals = {};
    rawData.forEach(item => {
      const value = chartConfig.measure === 'length' ? item.length : item.count;
      categoryTotals[item.category] = (categoryTotals[item.category] || 0) + value;
    });
    
    // Sort and get top categories
    const sortedCategories = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a);
    
    const topCategories = sortedCategories
      .slice(0, maxCategories)
      .map(([category]) => category);
    
    // Create "Other" category if needed
    const hasOther = sortedCategories.length > maxCategories && maxCategories < 999;
    if (hasOther) {
      const otherTotal = sortedCategories
        .slice(maxCategories)
        .reduce((sum, [, value]) => sum + value, 0);
      
      if (otherTotal > 0) {
        topCategories.push('Other');
        categoryTotals['Other'] = otherTotal;
      }
    }
    
    // Filter and organize data
    const filteredData = rawData.filter(item => topCategories.includes(item.category));
    
    // Add "Other" data for each feature if needed
    if (hasOther && categoryTotals['Other'] > 0) {
      const otherData = sortedCategories.slice(maxCategories);
      chartConfig.features.forEach(featureField => {
        const feature = CONFIG.chartingFeatures.find(f => f.field === featureField);
        let otherValue = 0;
        
        otherData.forEach(([category]) => {
          const item = rawData.find(d => 
            d.category === category && d.featureField === featureField
          );
          if (item) {
            otherValue += chartConfig.measure === 'length' ? item.length : item.count;
          }
        });
        
        if (otherValue > 0) {
          filteredData.push({
            category: 'Other',
            feature: feature.label,
            featureField: featureField,
            scenario: feature.field.includes('_h') ? 'RCP 8.5' : 'RCP 4.5',
            count: chartConfig.measure === 'count' ? otherValue : otherValue / 0.1,
            length: chartConfig.measure === 'length' ? otherValue : otherValue * 0.1
          });
        }
      });
    }
    
    return {
      categories: topCategories,
      data: filteredData,
      features: chartConfig.features.map(f => {
        const feature = CONFIG.chartingFeatures.find(cf => cf.field === f);
        return feature ? feature.label : f;
      })
    };
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
    const ctx = chartRef.current?.getContext('2d');
    const expandedCtx = expandedChartRef.current?.getContext('2d');
    
    if (!ctx || !chartData) return;
    
    // Destroy existing charts
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    if (expandedChartInstance.current) {
      expandedChartInstance.current.destroy();
    }

    const createChartConfig = () => {
      const { chartType, measure, groupBy } = chartConfig;
      
      if (chartType === 'pie') {
        // For pie chart, aggregate all features
        const aggregatedData = {};
        chartData.data.forEach(item => {
          const value = measure === 'length' ? item.length : item.count;
          aggregatedData[item.category] = (aggregatedData[item.category] || 0) + value;
        });
        
        return {
          type: 'pie',
          data: {
            labels: Object.keys(aggregatedData),
            datasets: [{
              data: Object.values(aggregatedData),
              backgroundColor: Object.keys(aggregatedData).map((_, i) => getChartColor(i, 0.7)),
              borderColor: Object.keys(aggregatedData).map((_, i) => getChartColor(i, 1)),
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'right',
                labels: {
                  padding: 10,
                  font: { size: 11 }
                }
              },
              title: {
                display: true,
                text: `${measure === 'length' ? 'Road Length' : 'Segment Count'} by ${
                  groupByOptions.find(o => o.value === groupBy)?.label || groupBy
                }`
              },
              tooltip: {
                callbacks: {
                  label: (context) => {
                    const value = context.parsed;
                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                    const percentage = ((value / total) * 100).toFixed(1);
                    const suffix = measure === 'length' ? ' km' : ' segments';
                    return `${context.label}: ${value.toFixed(1)}${suffix} (${percentage}%)`;
                  }
                }
              }
            }
          }
        };
      } else {
        // Bar chart
        const datasets = chartData.features.map((featureLabel, index) => {
          const data = chartData.categories.map(category => {
            const item = chartData.data.find(d => 
              d.category === category && d.feature === featureLabel
            );
            return item ? (measure === 'length' ? item.length : item.count) : 0;
          });
          
          return {
            label: featureLabel,
            data: data,
            backgroundColor: getChartColor(index, 0.7),
            borderColor: getChartColor(index, 1),
            borderWidth: 1
          };
        });

        return {
          type: 'bar',
          data: {
            labels: chartData.categories,
            datasets: datasets
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: chartData.features.length > 1,
                position: 'top',
                labels: {
                  padding: 10,
                  font: { size: 11 }
                }
              },
              title: {
                display: true,
                text: `${measure === 'length' ? 'Road Length' : 'Segment Count'} by ${
                  groupByOptions.find(o => o.value === groupBy)?.label || groupBy
                }`
              },
              tooltip: {
                callbacks: {
                  label: (context) => {
                    const label = context.dataset.label || '';
                    const value = context.parsed.y;
                    const suffix = measure === 'length' ? ' km' : ' segments';
                    return `${label}: ${value.toFixed(1)}${suffix}`;
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: measure === 'length' ? 'Length (km)' : 'Segment Count'
                }
              },
              x: {
                ticks: {
                  maxRotation: 45,
                  minRotation: 45,
                  font: { size: 10 }
                }
              }
            }
          }
        };
      }
    };

    const config = createChartConfig();
    
    // Create main chart
    chartInstance.current = new Chart(ctx, config);
    
    // Create expanded chart if modal is open
    if (expandedCtx && expandedView) {
      expandedChartInstance.current = new Chart(expandedCtx, config);
    }
  };

  const downloadChart = () => {
    const chart = expandedView && expandedChartInstance.current 
      ? expandedChartInstance.current 
      : chartInstance.current;
      
    if (chart) {
      const url = chart.toBase64Image();
      const link = document.createElement('a');
      link.download = `flood_risk_chart_${new Date().toISOString().split('T')[0]}.png`;
      link.href = url;
      link.click();
      message.success('Chart downloaded successfully');
    }
  };

  const clearChart = () => {
    setChartData(null);
    setChartConfig({
      features: [],
      groupBy: '',
      measure: 'count',
      maxCategories: 10,
      chartType: 'bar'
    });
    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
    }
    message.info('Chart cleared');
  };

  return (
    <>
      <Card
        title={
          <Space>
            <BarChartOutlined />
            <span>Advanced Analysis</span>
            <Tooltip title="Create custom data visualizations">
              <InfoCircleOutlined style={{ fontSize: 12, color: '#8c8c8c' }} />
            </Tooltip>
          </Space>
        }
        size="small"
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          width: 480,
          height: 550,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column'
        }}
        extra={
          <Space size="small">
            {chartData && (
              <>
                <Tooltip title="Clear chart">
                  <Button
                    size="small"
                    type="text"
                    icon={<ClearOutlined />}
                    onClick={clearChart}
                  />
                </Tooltip>
                <Tooltip title="Expand chart">
                  <Button
                    size="small"
                    type="text"
                    icon={<ExpandOutlined />}
                    onClick={() => setExpandedView(true)}
                  />
                </Tooltip>
                <Tooltip title="Download chart">
                  <Button
                    size="small"
                    type="text"
                    icon={<DownloadOutlined />}
                    onClick={downloadChart}
                  />
                </Tooltip>
              </>
            )}
            <Button
              size="small"
              type="primary"
              icon={<ReloadOutlined />}
              onClick={generateChart}
              loading={loading}
              disabled={chartConfig.features.length === 0 || !chartConfig.groupBy}
            >
              Generate
            </Button>
          </Space>
        }
        bodyStyle={{ 
          padding: '12px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          {/* Feature Selection */}
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 500 }}>
              Feature(s) to Analyze: <span style={{ color: '#ff4d4f' }}>*</span>
            </label>
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="Select features to analyze..."
              value={chartConfig.features}
              onChange={(value) => setChartConfig({ ...chartConfig, features: value })}
              options={featureOptions.map(opt => ({
                label: (
                  <Space size={4}>
                    <Tag 
                      color={opt.scenario === 'rcp85' ? 'red' : 'blue'} 
                      style={{ margin: 0, fontSize: 11 }}
                    >
                      {opt.scenario === 'rcp85' ? '8.5' : '4.5'}
                    </Tag>
                    <span style={{ fontSize: 12 }}>{opt.label}</span>
                  </Space>
                ),
                value: opt.value
              }))}
              maxTagCount={2}
              maxTagPlaceholder={(omitted) => `+${omitted.length} more`}
            />
          </div>
          
          {/* Group By */}
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 500 }}>
              Group by: <span style={{ color: '#ff4d4f' }}>*</span>
            </label>
            <Select
              style={{ width: '100%' }}
              value={chartConfig.groupBy}
              onChange={(value) => setChartConfig({ ...chartConfig, groupBy: value })}
              options={groupByOptions.map(opt => ({
                label: (
                  <Space>
                    <span>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </Space>
                ),
                value: opt.value
              }))}
              placeholder="Select grouping field..."
            />
          </div>
          
          {/* Chart Options Row */}
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            {/* Measure By */}
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 500 }}>
                Measure by:
              </label>
              <Radio.Group 
                value={chartConfig.measure} 
                onChange={(e) => setChartConfig({ ...chartConfig, measure: e.target.value })}
                size="small"
              >
                <Radio.Button value="count">Segments</Radio.Button>
                <Radio.Button value="length">Length (km)</Radio.Button>
              </Radio.Group>
            </div>
            
            {/* Chart Type */}
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 500 }}>
                Chart type:
              </label>
              <Radio.Group 
                value={chartConfig.chartType} 
                onChange={(e) => setChartConfig({ ...chartConfig, chartType: e.target.value })}
                size="small"
              >
                <Radio.Button value="bar">
                  <BarChartOutlined />
                </Radio.Button>
                <Radio.Button value="pie">
                  <PieChartOutlined />
                </Radio.Button>
              </Radio.Group>
            </div>
          </Space>
          
          {/* Max Categories */}
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 500 }}>
              Maximum categories:
            </label>
            <Select
              style={{ width: '100%' }}
              value={chartConfig.maxCategories}
              onChange={(value) => setChartConfig({ ...chartConfig, maxCategories: value })}
              options={maxCategoriesOptions}
            />
          </div>
        </Space>
        
        {/* Chart Area */}
        <div style={{ 
          flex: 1, 
          position: 'relative', 
          marginTop: 12,
          minHeight: 300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {loading ? (
            <Spin size="large" tip="Generating chart..." />
          ) : chartData ? (
            <canvas ref={chartRef} style={{ maxHeight: '100%', maxWidth: '100%' }} />
          ) : (
            <Empty 
              description="Configure options and click 'Generate' to create a chart" 
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </div>
      </Card>
      
      {/* Expanded View Modal */}
      <Modal
        title="Chart View"
        open={expandedView}
        onCancel={() => setExpandedView(false)}
        width="90%"
        style={{ top: 20 }}
        footer={[
          <Button key="download" type="primary" icon={<DownloadOutlined />} onClick={downloadChart}>
            Download
          </Button>,
          <Button key="close" onClick={() => setExpandedView(false)}>
            Close
          </Button>
        ]}
      >
        <div style={{ height: '70vh', position: 'relative' }}>
          <canvas ref={expandedChartRef} />
        </div>
      </Modal>
    </>
  );
};

export default EnhancedChartPanel;