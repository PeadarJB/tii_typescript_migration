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
import { useMapState } from '@/store/useAppStore';
import { usePanelStyles, useCommonStyles, styleUtils } from '@/styles/styled';
import type { ChartConfig, ChartDataPoint, FilterOption, ChartFeature } from '@/types';
import { CONFIG } from '@/config/appConfig';
import Query from '@arcgis/core/rest/support/Query';

// Updated props to accept a dynamic list of features
interface EnhancedChartPanelProps {
  chartingFeatures: ReadonlyArray<ChartFeature>;
}

interface ProcessedChartData {
  categories: string[];
  data: ChartDataPoint[];
  features: string[];
}

interface GroupByOption extends FilterOption {
  icon: string;
}

const EnhancedChartPanel: React.FC<EnhancedChartPanelProps> = ({ chartingFeatures }) => {
  const { styles: panelStyles } = usePanelStyles();
  const { theme } = useCommonStyles();
  const { roadLayer } = useMapState();

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

  // Use the 'chartingFeatures' prop instead of a hardcoded config
  const featureOptions = chartingFeatures.map(feature => ({
    label: feature.label,
    value: feature.field,
    description: feature.description,
    scenario: feature.scenario
  }));

  const staticGroupByOptions: GroupByOption[] = [
    { label: 'County', value: 'COUNTY', icon: '🏛️' },
    { label: 'Criticality Rating', value: 'Criticality_Rating_Num1', icon: '⚠️' },
    { label: 'Road Subnet', value: 'Subnet', icon: '🛣️' },
    { label: 'Lifeline Route', value: 'Lifeline', icon: '🚨' },
    { label: 'Route', value: 'Route', icon: '📍' }
  ];

  const maxCategoriesOptions: FilterOption<number>[] = [
    { label: 'Top 10', value: 10 }, { label: 'Top 20', value: 20 },
    { label: 'Top 50', value: 50 }, { label: 'No limit', value: 999 }
  ];

  useEffect(() => {
    setGroupByOptions(staticGroupByOptions);
  }, []);

  useEffect(() => {
    return () => {
      chartInstance.current?.destroy();
      expandedChartInstance.current?.destroy();
    };
  }, []);

  useEffect(() => {
    if (chartData) {
      renderChart();
    }
  }, [chartData, chartConfig.type, expandedView]);

  const getLabelForValue = (field: string, value: string | number): string => {
    const filter = CONFIG.filterConfig.find(f => f.field === field);
    if (filter && 'options' in filter) {
        const option = filter.options?.find(opt => String(opt.value) === String(value));
        return option?.label ?? String(value);
    }
    return String(value);
  };

  const generateChart = async (): Promise<void> => {
    const { features, groupBy, metric, maxCategories } = chartConfig;
    
    if (!roadLayer || features.length === 0 || !groupBy) {
      message.warning('Please select features and group by field');
      return;
    }

    setLoading(true);
    try {
      const baseWhere = '1=1'; // Always query the entire layer for charts
      const allData: ChartDataPoint[] = [];
      
      for (const featureField of features) {
        const feature = chartingFeatures.find(f => f.field === featureField);
        if (!feature) continue;

        const whereClause = `(${baseWhere}) AND (${featureField} >= 1)`;
        
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
          const rawGroupValue = f.attributes[groupBy];
          const groupValue = rawGroupValue !== null && rawGroupValue !== undefined 
            ? rawGroupValue : 'Unknown';
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

      setChartData(processChartData(allData, maxCategories));
      message.success('Chart generated successfully');
      setExpandedView(true);
    } catch (error) {
      console.error('Failed to generate chart:', error);
      message.error('Failed to generate chart');
      setChartData(null);
    } finally {
      setLoading(false);
    }
  };

  const processChartData = (
    rawData: ChartDataPoint[], maxCategories: number
  ): ProcessedChartData => {
    const categoryTotals: Record<string, number> = {};
    rawData.forEach(item => {
      categoryTotals[item.category] = (categoryTotals[item.category] || 0) + item.value;
    });
    
    const sortedCategories = Object.entries(categoryTotals).sort(([, a], [, b]) => b - a);
    const topCategories = sortedCategories.slice(0, maxCategories).map(([category]) => category);
    
    const hasOther = sortedCategories.length > maxCategories && maxCategories < 999;
    if (hasOther) {
      topCategories.push('Other');
    }
    
    const dataByCategory: Record<string, ChartDataPoint[]> = {};
    rawData.forEach(item => {
        const categoryKey = topCategories.includes(item.category) ? item.category : 'Other';
        if (!dataByCategory[categoryKey]) dataByCategory[categoryKey] = [];
        dataByCategory[categoryKey].push(item);
    });

    const finalData: ChartDataPoint[] = [];
    topCategories.forEach(category => {
        chartConfig.features.forEach(featureField => {
            const feature = chartingFeatures.find(f => f.field === featureField);
            if (!feature) return;

            const items = dataByCategory[category]?.filter(d => d.featureField === featureField) || [];
            const totalValue = items.reduce((sum, item) => sum + item.value, 0);

            if(totalValue > 0){
                finalData.push({
                    category,
                    value: totalValue,
                    feature: feature.label,
                    featureField,
                    scenario: feature.scenario,
                    type: feature.scenario === 'rcp85' ? 'RCP 8.5' : 'RCP 4.5'
                });
            }
        });
    });

    return {
      categories: topCategories,
      data: finalData,
      features: chartConfig.features.map(f => chartingFeatures.find(cf => cf.field === f)?.label || f)
    };
  };

  const renderChart = (): void => {
    const ctx = chartRef.current;
    const expandedCtx = expandedChartRef.current;
    if (!ctx || !chartData) return;

    chartInstance.current?.destroy();
    expandedChartInstance.current?.destroy();

    const createChartConfig = (): ChartConfiguration => {
      const { type, metric, groupBy } = chartConfig;
      const chartLabels = chartData.categories.map(cat => getLabelForValue(groupBy, cat));

      if (type === 'pie') {
        const aggregatedData: Record<string, number> = {};
        chartData.data.forEach(item => {
          const label = getLabelForValue(groupBy, item.category);
          aggregatedData[label] = (aggregatedData[label] || 0) + item.value;
        });

        return { /* Pie chart config... */ } as ChartConfiguration;
      } else { // Bar chart
        const datasets = chartData.features.map((featureLabel, index) => {
          const data = chartData.categories.map(category =>
            chartData.data.find(d => d.category === category && d.feature === featureLabel)?.value || 0
          );
          return {
            label: featureLabel, data,
            backgroundColor: styleUtils.getChartColor(index, 0.7),
            borderColor: styleUtils.getChartColor(index, 1),
            borderWidth: 1
          };
        });

        return {
          type: 'bar',
          data: { labels: chartLabels, datasets },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
              legend: { display: chartData.features.length > 1, position: 'bottom', labels: { padding: 20, font: { size: 11 } } },
              title: { display: true, text: `${metric === 'totalLength' ? 'Road Length' : 'Segment Count'} by ${groupByOptions.find(o => o.value === groupBy)?.label || groupBy}` },
              tooltip: {
                callbacks: {
                  label: (context) => `${context.dataset.label || ''}: ${(context.parsed.y as number).toFixed(1)} ${metric === 'totalLength' ? 'km' : 'segments'}`
                }
              }
            },
            scales: {
              y: { beginAtZero: true, title: { display: true, text: metric === 'totalLength' ? 'Length (km)' : 'Segment Count' } },
              x: { ticks: { maxRotation: 90, minRotation: 70, font: { size: 10 }, autoSkip: false } }
            }
          }
        };
      }
    };

    const config = createChartConfig();
    chartInstance.current = new Chart(ctx, config);
    if (expandedCtx && expandedView) {
      expandedChartInstance.current = new Chart(expandedCtx, config);
    }
  };

  // ... (downloadChart, clearChart, handlers, etc.)

  return (
    <>
      <Card /* ...props... */ >
        <Space direction="vertical" style={{ width: '100%' }} size="small" className="chart-config">
          <div>
            <label /* ... */>Feature(s) to Analyze: <span style={{ color: theme.colorError }}>*</span></label>
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
          {/* ... (rest of the form controls) ... */}
        </Space>
        <div className="chart-area">
          {/* ... (chart canvas or empty state) ... */}
        </div>
      </Card>
      <Modal /* ...props... */ >
        {/* ... */}
      </Modal>
    </>
  );
};

export default EnhancedChartPanel;
