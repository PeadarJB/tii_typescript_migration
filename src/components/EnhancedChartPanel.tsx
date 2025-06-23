// src/components/EnhancedChartPanel.tsx - Refactored with consolidated styling

import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, 
  Select, 
  Button, 
  Space, 
  Spin, 
  Empty, 
  Radio, 
  Tag, 
  Tooltip, 
  Modal, 
  message 
} from 'antd';
import { 
  BarChartOutlined, 
  ReloadOutlined, 
  PieChartOutlined, 
  DownloadOutlined,
  ClearOutlined,
  ExpandOutlined,
  InfoCircleOutlined 
} from '@ant-design/icons';
import type { RadioChangeEvent } from 'antd';
import Chart from 'chart.js/auto';
import type { ChartConfiguration, ChartType as ChartJSType } from 'chart.js';

// Store imports
import { useMapState } from '@/store/useAppStore';

// Style imports
import { usePanelStyles, useCommonStyles, styleUtils } from '@/styles/styled';

// Type imports
import type {  
  ChartConfig, 
  ChartDataPoint,
  FilterOption 
} from '@/types';
import { CONFIG } from '@/config/appConfig';
import Query from '@arcgis/core/rest/support/Query';

// No props needed anymore!
interface EnhancedChartPanelProps {}

interface ProcessedChartData {
  categories: string[];
  data: ChartDataPoint[];
  features: string[];
}

interface GroupByOption extends FilterOption {
  icon: string;
}

const EnhancedChartPanel: React.FC<EnhancedChartPanelProps> = () => {
  // Style hooks
  const { styles: panelStyles } = usePanelStyles();
  const { theme } = useCommonStyles();

  // Store hooks
  const { roadLayer } = useMapState();

  // Local state
  const [loading, setLoading] = useState(false);
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    features: [],
    groupBy: '',
    metric: 'segmentCount',
    maxCategories: 10,
    type: 'bar'
  });
  const [groupByOptions, setGroupByOptions] = useState<GroupByOption[]>([]);
  const [chartData, setChartData] = useState<ProcessedChartData | null>(null);
  const [expandedView, setExpandedView] = useState(false);
  
  const chartRef = useRef<HTMLCanvasElement>(null);
  const expandedChartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const expandedChartInstance = useRef<Chart | null>(null);

  // Feature options from config
  const featureOptions = CONFIG.chartingFeatures.map(feature => ({
    label: feature.label,
    value: feature.field,
    description: feature.description,
    scenario: feature.scenario
  }));

  // Predefined group by options
  const staticGroupByOptions: GroupByOption[] = [
    { label: 'County', value: 'COUNTY', icon: '🏛️' },
    { label: 'Criticality Rating', value: 'Criticality_Rating_Num1', icon: '⚠️' },
    { label: 'Road Subnet', value: 'Subnet', icon: '🛣️' },
    { label: 'Lifeline Route', value: 'Lifeline', icon: '🚨' },
    { label: 'Route', value: 'Route', icon: '📍' }
  ];

  // Max categories options
  const maxCategoriesOptions: FilterOption<number>[] = [
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
  }, [chartData, chartConfig.type, expandedView]);

  const loadDynamicGroupByOptions = (): void => {
    try {
      // For now, use static options. In future, could dynamically load field list
      setGroupByOptions(staticGroupByOptions);
    } catch (error) {
      console.error('Failed to load group by options:', error);
      setGroupByOptions(staticGroupByOptions);
    }
  };

  const generateChart = async (): Promise<void> => {
    const { features, groupBy, metric, maxCategories } = chartConfig;
    
    if (!roadLayer || features.length === 0 || !groupBy) {
      message.warning('Please select features and group by field');
      return;
    }

    try {
      setLoading(true);
      
      const baseWhere = roadLayer.definitionExpression || '1=1';
      const allData: ChartDataPoint[] = [];
      
      // Query for each selected feature
      for (const featureField of features) {
        const feature = CONFIG.chartingFeatures.find(f => f.field === featureField);
        if (!feature) continue;

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
            scenario: feature.scenario,
            value: metric === 'totalLength' ? count * CONFIG.defaultSettings.segmentLengthKm : count,
            type: feature.scenario === 'rcp85' ? 'RCP 8.5' : 'RCP 4.5'
          });
        });
      }

      // Process and limit data
      const processedData = processChartData(allData, maxCategories);
      setChartData(processedData);
      
      message.success('Chart generated successfully');
      setExpandedView(true); // Automatically open the modal
    } catch (error) {
      console.error('Failed to generate chart:', error);
      message.error('Failed to generate chart');
      setChartData(null);
    } finally {
      setLoading(false);
    }
  };

  const processChartData = (
    rawData: ChartDataPoint[], 
    maxCategories: number
  ): ProcessedChartData => {
    // Calculate totals by category
    const categoryTotals: Record<string, number> = {};
    rawData.forEach(item => {
      categoryTotals[item.category] = (categoryTotals[item.category] || 0) + item.value;
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
        if (!feature) return;

        let otherValue = 0;
        
        otherData.forEach(([category]) => {
          const item = rawData.find(d => 
            d.category === category && d.featureField === featureField
          );
          if (item) {
            otherValue += item.value;
          }
        });
        
        if (otherValue > 0) {
          filteredData.push({
            category: 'Other',
            feature: feature.label,
            featureField: featureField,
            scenario: feature.scenario,
            value: otherValue,
            type: feature.scenario === 'rcp85' ? 'RCP 8.5' : 'RCP 4.5'
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

  const renderChart = (): void => {
    const ctx = chartRef.current?.getContext('2d');
    const expandedCtx = expandedChartRef.current?.getContext('2d');
    
    if (!ctx || !chartData) return;
    
    // Destroy existing charts
    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
    }
    if (expandedChartInstance.current) {
      expandedChartInstance.current.destroy();
      expandedChartInstance.current = null;
    }

    const createChartConfig = (): ChartConfiguration => {
      const { type, metric, groupBy } = chartConfig;
      
      if (type === 'pie') {
        // For pie chart, aggregate all features
        const aggregatedData: Record<string, number> = {};
        chartData.data.forEach(item => {
          aggregatedData[item.category] = (aggregatedData[item.category] || 0) + item.value;
        });
        
        return {
          type: 'pie',
          data: {
            labels: Object.keys(aggregatedData),
            datasets: [{
              data: Object.values(aggregatedData),
              backgroundColor: Object.keys(aggregatedData).map((_, i) => styleUtils.getChartColor(i, 0.7)),
              borderColor: Object.keys(aggregatedData).map((_, i) => styleUtils.getChartColor(i, 1)),
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
                text: `${metric === 'totalLength' ? 'Road Length' : 'Segment Count'} by ${
                  groupByOptions.find(o => o.value === groupBy)?.label || groupBy
                }`
              },
              tooltip: {
                callbacks: {
                  label: (context) => {
                    const value = context.parsed as number;
                    const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
                    const percentage = ((value / total) * 100).toFixed(1);
                    const suffix = metric === 'totalLength' ? ' km' : ' segments';
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
            return item ? item.value : 0;
          });
          
          return {
            label: featureLabel,
            data: data,
            backgroundColor: styleUtils.getChartColor(index, 0.7),
            borderColor: styleUtils.getChartColor(index, 1),
            borderWidth: 1
          };
        });

        return {
          type: 'bar' as ChartJSType,
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
                text: `${metric === 'totalLength' ? 'Road Length' : 'Segment Count'} by ${
                  groupByOptions.find(o => o.value === groupBy)?.label || groupBy
                }`
              },
              tooltip: {
                callbacks: {
                  label: (context) => {
                    const label = context.dataset.label || '';
                    const value = context.parsed.y as number;
                    const suffix = metric === 'totalLength' ? ' km' : ' segments';
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
                  text: metric === 'totalLength' ? 'Length (km)' : 'Segment Count'
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

  const downloadChart = (): void => {
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

  const clearChart = (): void => {
    setChartData(null);
    setChartConfig({
      features: [],
      groupBy: '',
      metric: 'segmentCount',
      maxCategories: 10,
      type: 'bar'
    });
    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
    }
    message.info('Chart cleared');
  };

  type ChartType = 'bar' | 'pie';
  const handleChartTypeChange = (value: ChartType): void => {
    setChartConfig(prev => ({ ...prev, type: value }));
  };

  const handleMetricChange = (e: RadioChangeEvent): void => {
    setChartConfig(prev => ({ ...prev, metric: e.target.value }));
  };

  if (!roadLayer) return null;

  return (
    <>
      <Card
        className={panelStyles.chartPanel}
        title={
          <Space>
            <BarChartOutlined />
            <span>Advanced Analysis</span>
            <Tooltip title="Create custom data visualizations">
              <InfoCircleOutlined style={{ fontSize: theme.fontSizeSM, color: theme.colorTextTertiary }} />
            </Tooltip>
          </Space>
        }
        size="small"
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
              onClick={() => void generateChart()}
              loading={loading}
              disabled={chartConfig.features.length === 0 || !chartConfig.groupBy}
            >
              Generate
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size="small" className="chart-config">
          {/* Feature Selection */}
          <div>
            <label style={{ display: 'block', marginBottom: theme.marginXXS, fontSize: theme.fontSizeSM, fontWeight: 500 }}>
              Feature(s) to Analyze: <span style={{ color: theme.colorError }}>*</span>
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
                    <span style={{ fontSize: theme.fontSizeSM }}>{opt.label}</span>
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
            <label style={{ display: 'block', marginBottom: theme.marginXXS, fontSize: theme.fontSizeSM, fontWeight: 500 }}>
              Group by: <span style={{ color: theme.colorError }}>*</span>
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
              <label style={{ display: 'block', marginBottom: theme.marginXXS, fontSize: theme.fontSizeSM, fontWeight: 500 }}>
                Measure by:
              </label>
              <Radio.Group 
                value={chartConfig.metric} 
                onChange={handleMetricChange}
                size="small"
              >
                <Radio.Button value="segmentCount">Segments</Radio.Button>
                <Radio.Button value="totalLength">Length (km)</Radio.Button>
              </Radio.Group>
            </div>
            
            {/* Chart Type */}
            <div>
              <label style={{ display: 'block', marginBottom: theme.marginXXS, fontSize: theme.fontSizeSM, fontWeight: 500 }}>
                Chart type:
              </label>
              <Radio.Group 
                value={chartConfig.type} 
                onChange={(e) => handleChartTypeChange(e.target.value as ChartType)}
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
            <label style={{ display: 'block', marginBottom: theme.marginXXS, fontSize: theme.fontSizeSM, fontWeight: 500 }}>
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
        <div className="chart-area">
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