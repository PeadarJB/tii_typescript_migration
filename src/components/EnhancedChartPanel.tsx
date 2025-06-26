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
  message,
  Row,
  Col
} from 'antd';
import {
  BarChartOutlined,
  ClearOutlined,
  DownloadOutlined,
  ExpandOutlined,
  InfoCircleOutlined,
  PieChartOutlined
} from '@ant-design/icons';
import type { ChartConfiguration } from 'chart.js';
import Chart from 'chart.js/auto';
import Query from '@arcgis/core/rest/support/Query';
import { useMapState } from '@/store/useAppStore';
import { usePanelStyles, styleUtils } from '@/styles/styled';
import type { ChartConfig, ChartDataPoint, FilterOption, ChartFeature } from '@/types';
import { CONFIG } from '@/config/appConfig';

interface EnhancedChartPanelProps {
  chartingFeatures: ReadonlyArray<ChartFeature>;
}

interface ProcessedChartData {
  categories: string[];
  data: ChartDataPoint[];
  features: string[];
}

interface GroupByOption extends FilterOption<string> {
  icon?: string;
}

const EnhancedChartPanel: React.FC<EnhancedChartPanelProps> = ({ chartingFeatures }) => {
  const { styles, theme } = usePanelStyles();
  const { roadLayer } = useMapState();

  const [loading, setLoading] = useState(false);
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    features: [],
    groupBy: 'COUNTY',
    metric: 'totalLength',
    maxCategories: 10,
    type: 'bar',
  });
  const [chartData, setChartData] = useState<ProcessedChartData | null>(null);
  const [expandedView, setExpandedView] = useState(false);

  const chartRef = useRef<HTMLCanvasElement>(null);
  const expandedChartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const expandedChartInstance = useRef<Chart | null>(null);

  const featureOptions = chartingFeatures.map(feature => ({
    label: feature.label,
    value: feature.field,
    scenario: feature.scenario,
  }));

  const groupByOptions: GroupByOption[] = [
    { label: 'County', value: 'COUNTY' },
    { label: 'Criticality Rating', value: 'Criticality_Rating_Num1' },
    { label: 'Road Subnet', value: 'Subnet' },
  ];

  const maxCategoriesOptions: FilterOption<number>[] = [
    { label: 'Top 5', value: 5 },
    { label: 'Top 10', value: 10 },
    { label: 'Top 20', value: 20 },
    { label: 'Show All', value: 9999 },
  ];

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartData, chartConfig.type, expandedView]);
  
  const getLabelForValue = (field: string, value: string | number): string => {
    const filter = CONFIG.filterConfig.find(f => f.field === field);
    if (filter?.options) {
      const option = filter.options.find(opt => String(opt.value) === String(value));
      return option?.label ?? String(value);
    }
    return String(value);
  };
  
  const generateChart = async () => {
    const { features, groupBy, metric, maxCategories } = chartConfig;
    if (!roadLayer) return;
    if (features.length === 0 || !groupBy) {
      message.warning('Please select features and a grouping field.');
      return;
    }
    setLoading(true);
    try {
      const allData: ChartDataPoint[] = [];
      for (const featureField of features) {
        const feature = chartingFeatures.find(f => f.field === featureField);
        if (!feature) continue;
        const query = new Query({
          where: `${featureField} = 1`,
          groupByFieldsForStatistics: [groupBy],
          outStatistics: [{
            statisticType: 'count',
            onStatisticField: 'OBJECTID',
            outStatisticFieldName: 'segment_count'
          }],
          orderByFields: ['segment_count DESC']
        });
        const results = await roadLayer.queryFeatures(query);
        results.features.forEach(f => {
          const groupValue = f.attributes[groupBy] ?? 'Unknown';
          const count = f.attributes.segment_count || 0;
          allData.push({
            category: String(groupValue),
            feature: feature.label,
            featureField,
            scenario: feature.scenario,
            value: metric === 'totalLength' ? count * CONFIG.defaultSettings.segmentLengthKm : count,
            type: feature.scenario,
          });
        });
      }
      setChartData(processChartData(allData, maxCategories));
      setExpandedView(true);
    } catch (err) {
      message.error('Failed to generate chart data.');
    } finally {
      setLoading(false);
    }
  };

  const processChartData = (rawData: ChartDataPoint[], maxCategories: number): ProcessedChartData => {
    const categoryTotals: Record<string, number> = {};
    rawData.forEach(item => {
      categoryTotals[item.category] = (categoryTotals[item.category] || 0) + item.value;
    });

    const topCategories = Object.keys(categoryTotals)
      .sort((a, b) => categoryTotals[b] - categoryTotals[a])
      .slice(0, maxCategories);
    
    return {
      categories: topCategories,
      data: rawData.filter(d => topCategories.includes(d.category)),
      features: [...new Set(rawData.map(d => d.feature))],
    };
  };

  const renderChart = () => {
    const targetRef = expandedView ? expandedChartRef : chartRef;
    const targetInstance = expandedView ? expandedChartInstance : chartInstance;
    if (!targetRef.current || !chartData) return;

    targetInstance.current?.destroy();
    
    const { type, metric, groupBy } = chartConfig;
    const labels = chartData.categories.map(cat => getLabelForValue(groupBy, cat));
    
    const datasets = chartData.features.map((featureLabel, i) => ({
      label: featureLabel,
      data: chartData.categories.map(category =>
        chartData.data.find(d => d.category === category && d.feature === featureLabel)?.value || 0
      ),
      backgroundColor: styleUtils.getChartColor(i, 0.7),
      borderColor: styleUtils.getChartColor(i, 1),
      borderWidth: 1,
    }));

    const config: ChartConfiguration = {
      type: type as 'bar' | 'pie' | 'line',
      data: { labels, datasets },
      options: {
        indexAxis: type === 'bar' ? 'y' : 'x',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: datasets.length > 1, position: 'bottom' },
          title: { display: true, text: `Chart of ${metric === 'totalLength' ? 'Road Length' : 'Segment Count'}` },
        },
      },
    };
    
    targetInstance.current = new Chart(targetRef.current, config);
  };

  const downloadChart = () => {
    const canvas = expandedView ? expandedChartRef.current : chartRef.current;
    if (canvas) {
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = 'tii-chart.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const clearChart = () => {
    setChartData(null);
    chartInstance.current?.destroy();
    setChartConfig(prev => ({ ...prev, features: [] }));
  };

  return (
    <>
      <Card
        className={styles.chartPanel}
        title={
          <Space>
            <BarChartOutlined /> Advanced Analysis
            <Tooltip title="Create charts by grouping features against road network attributes."><InfoCircleOutlined /></Tooltip>
          </Space>
        }
        extra={
          <Space>
            <Tooltip title="Clear Chart & Selections"><Button icon={<ClearOutlined />} onClick={clearChart} size="small" /></Tooltip>
            <Tooltip title="Download as PNG"><Button icon={<DownloadOutlined />} onClick={downloadChart} size="small" disabled={!chartData} /></Tooltip>
            <Tooltip title="Expand View"><Button icon={<ExpandOutlined />} onClick={() => setExpandedView(true)} size="small" disabled={!chartData} /></Tooltip>
            <Button type="primary" onClick={generateChart} loading={loading}>Generate</Button>
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <label>Feature(s) to Analyze: <span style={{ color: theme.colorError }}>*</span></label>
              <Select
                mode="multiple"
                style={{ width: '100%' }}
                placeholder="Select features..."
                value={chartConfig.features}
                onChange={value => setChartConfig(c => ({ ...c, features: value }))}
                maxTagCount="responsive"
              >
                {featureOptions.map(opt => (
                  <Select.Option key={opt.value} value={opt.value}>
                    <Tag color={opt.scenario === 'rcp85' ? 'volcano' : 'blue'}>{opt.scenario}</Tag> {opt.label}
                  </Select.Option>
                ))}
              </Select>
            </Col>
            <Col span={12}>
              <label>Group by: <span style={{ color: theme.colorError }}>*</span></label>
              <Select
                style={{ width: '100%' }}
                value={chartConfig.groupBy}
                onChange={value => setChartConfig(c => ({ ...c, groupBy: value }))}
                options={groupByOptions}
              />
            </Col>
            <Col span={12}>
              <label>Maximum categories:</label>
              <Select
                style={{ width: '100%' }}
                value={chartConfig.maxCategories}
                onChange={value => setChartConfig(c => ({ ...c, maxCategories: value }))}
                options={maxCategoriesOptions}
              />
            </Col>
            <Col span={12}>
              <label>Measure by:</label>
              <Radio.Group value={chartConfig.metric} onChange={e => setChartConfig(c => ({...c, metric: e.target.value}))}>
                <Radio.Button value="segmentCount">Segments</Radio.Button>
                <Radio.Button value="totalLength">Length (km)</Radio.Button>
              </Radio.Group>
            </Col>
             <Col span={12}>
              <label>Chart type:</label>
              <Radio.Group value={chartConfig.type} onChange={e => setChartConfig(c => ({...c, type: e.target.value}))}>
                <Radio.Button value="bar"><BarChartOutlined /></Radio.Button>
                <Radio.Button value="pie"><PieChartOutlined /></Radio.Button>
              </Radio.Group>
            </Col>
          </Row>
        </Space>
        <div className="chart-area" style={{ marginTop: 16, height: 300, position: 'relative' }}>
          {loading && <Spin style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}/>}
          {!loading && !chartData && <Empty description="Configure and generate a chart." />}
          {!loading && chartData && <canvas ref={chartRef}></canvas>}
        </div>
      </Card>
      <Modal open={expandedView} onCancel={() => setExpandedView(false)} width="90vw" footer={null} destroyOnClose>
        <div style={{ height: '75vh' }}><canvas ref={expandedChartRef}></canvas></div>
      </Modal>
    </>
  );
};

export default EnhancedChartPanel;