// src/pages/ExploreStatisticsPage.tsx

import { FC, useState, useEffect, useRef } from 'react';
import { Layout, Row, Col, Card, Typography, Radio, Space, Spin, Tooltip, Empty } from 'antd';
import { BarChartOutlined, PieChartOutlined, RiseOutlined, ApartmentOutlined, DotChartOutlined } from '@ant-design/icons';
import type { RadioChangeEvent } from 'antd';
import Chart from 'chart.js/auto';

// Store and config imports
import { useMapState } from '@/store/useAppStore';
import { CONFIG } from '@/config/appConfig';
import { useCommonStyles, styleUtils } from '@/styles/styled';

const { Content } = Layout;
const { Title, Text } = Typography;

type RcpScenario = 'rcp45' | 'rcp85';

// Helper function to create a placeholder for loading charts
const ChartPlaceholder: FC<{ title: string }> = ({ title }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
    <Spin />
    <Text style={{ marginTop: 16 }}>Loading: {title}</Text>
  </div>
);

const ChartEmpty: FC = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No data available for this chart." />
    </div>
);


const ExploreStatisticsPage: FC = () => {
  const { roadLayer } = useMapState();
  const { theme } = useCommonStyles();
  const [scenario, setScenario] = useState<RcpScenario>('rcp85');
  const [loading, setLoading] = useState(true);

  // State for chart data
  const [topCountiesData, setTopCountiesData] = useState<any[] | null>(null);
  const [vulnerabilityData, setVulnerabilityData] = useState<any | null>(null);
  const [riskBreakdownData, setRiskBreakdownData] = useState<any[] | null>(null);
  const [criticalityData, setCriticalityData] = useState<any[] | null>(null);
  const [rainfallData, setRainfallData] = useState<any | null>(null);

  // Refs for charts
  const topCountiesChartRef = useRef<HTMLCanvasElement>(null);
  const vulnerabilityChartRef = useRef<HTMLCanvasElement>(null);
  const riskBreakdownChartRef = useRef<HTMLCanvasElement>(null);
  const criticalityChartRef = useRef<HTMLCanvasElement>(null);
  const rainfallChartRef = useRef<HTMLCanvasElement>(null);
  
  // Chart instances
  const chartInstances = useRef<Record<string, Chart | null>>({});

  const handleScenarioChange = (e: RadioChangeEvent) => {
    setScenario(e.target.value as RcpScenario);
  };

  // Utility to destroy a chart instance
  const destroyChart = (key: string) => {
    if (chartInstances.current[key]) {
      chartInstances.current[key]?.destroy();
      chartInstances.current[key] = null;
    }
  };

  useEffect(() => {
    if (!roadLayer) {
        setLoading(false);
        return;
    };

    const fetchData = async () => {
      setLoading(true);
      Object.keys(chartInstances.current).forEach(destroyChart);

      const [
        fetchedTopCounties,
        fetchedVulnerability,
        fetchedRiskBreakdown,
        fetchedCriticality,
        fetchedRainfall
      ] = await Promise.all([
        fetchTopCounties(scenario),
        fetchVulnerabilityByRoadType(),
        fetchRiskBreakdown(scenario),
        fetchCriticalityVsSeverity(scenario),
        fetchRainfallVsInundation(scenario)
      ]);

      setTopCountiesData(fetchedTopCounties);
      setVulnerabilityData(fetchedVulnerability);
      setRiskBreakdownData(fetchedRiskBreakdown);
      setCriticalityData(fetchedCriticality);
      setRainfallData(fetchedRainfall);
      
      setLoading(false);
    };

    fetchData();

    return () => {
      Object.keys(chartInstances.current).forEach(destroyChart);
    };
  }, [roadLayer, scenario]);

  // Render charts when their data updates
  useEffect(() => { if (topCountiesData) renderTopCountiesChart(topCountiesData) }, [topCountiesData, theme]);
  useEffect(() => { if (vulnerabilityData) renderVulnerabilityChart(vulnerabilityData) }, [vulnerabilityData, theme]);
  useEffect(() => { if (riskBreakdownData) renderRiskBreakdownChart(riskBreakdownData) }, [riskBreakdownData, theme]);
  useEffect(() => { if (criticalityData) renderCriticalityChart(criticalityData) }, [criticalityData, theme]);
  useEffect(() => { if (rainfallData) renderRainfallChart(rainfallData) }, [rainfallData, theme]);


  // --- Data Fetching Functions ---

  const fetchTopCounties = async (currentScenario: RcpScenario) => {
    if (!roadLayer) return null;
    const floodField = currentScenario === 'rcp45' ? 'future_flood_intersection_m' : 'future_flood_intersection_h';
    const query = roadLayer.createQuery();
    query.where = `${floodField} = 1`;
    query.groupByFieldsForStatistics = ['COUNTY'];
    query.outStatistics = [{
      statisticType: 'sum',
      onStatisticField: 'Shape__Length',
      outStatisticFieldName: 'totalLength'
    }];
    query.orderByFields = ['totalLength DESC'];
    query.num = 10;

    try {
      const results = await roadLayer.queryFeatures(query);
      return results.features.map(f => ({
        county: f.attributes.COUNTY,
        length: (f.attributes.totalLength / 1000) // Convert to km
      }));
    } catch (error) {
      console.error("Failed to fetch top counties:", error);
      return null;
    }
  };
  
  const fetchVulnerabilityByRoadType = async () => {
    if (!roadLayer) return null;
    const subnetMap = CONFIG.filterConfig.find(f => f.id === 'subnet')?.options?.reduce((acc, opt) => {
        acc[opt.value] = opt.label;
        return acc;
    }, {} as Record<string, string>) ?? {};

    const queryRcp45 = roadLayer.createQuery();
    queryRcp45.where = 'future_flood_intersection_m = 1';
    queryRcp45.groupByFieldsForStatistics = ['Subnet'];
    queryRcp45.outStatistics = [{ statisticType: 'sum', onStatisticField: 'Shape__Length', outStatisticFieldName: 'totalLength' }];

    const queryRcp85 = roadLayer.createQuery();
    queryRcp85.where = 'future_flood_intersection_h = 1';
    queryRcp85.groupByFieldsForStatistics = ['Subnet'];
    queryRcp85.outStatistics = [{ statisticType: 'sum', onStatisticField: 'Shape__Length', outStatisticFieldName: 'totalLength' }];

    try {
        const [results45, results85] = await Promise.all([
            roadLayer.queryFeatures(queryRcp45),
            roadLayer.queryFeatures(queryRcp85)
        ]);

        const data: { [key: string]: { rcp45: number, rcp85: number } } = {};

        results45.features.forEach(f => {
            const subnetLabel = subnetMap[f.attributes.Subnet] || `Unknown (${f.attributes.Subnet})`;
            if (!data[subnetLabel]) data[subnetLabel] = { rcp45: 0, rcp85: 0 };
            data[subnetLabel].rcp45 = f.attributes.totalLength / 1000;
        });

        results85.features.forEach(f => {
            const subnetLabel = subnetMap[f.attributes.Subnet] || `Unknown (${f.attributes.Subnet})`;
            if (!data[subnetLabel]) data[subnetLabel] = { rcp45: 0, rcp85: 0 };
            data[subnetLabel].rcp85 = f.attributes.totalLength / 1000;
        });
        
        return {
            labels: Object.keys(data),
            rcp45: Object.values(data).map(d => d.rcp45),
            rcp85: Object.values(data).map(d => d.rcp85),
        };
    } catch (error) {
        console.error("Failed to fetch vulnerability data:", error);
        return null;
    }
  };

  const fetchRiskBreakdown = async (currentScenario: RcpScenario) => {
    if (!roadLayer) return null;
    const floodField = currentScenario === 'rcp45' ? 'future_flood_intersection_m' : 'future_flood_intersection_h';
    const query = roadLayer.createQuery();
    query.where = `${floodField} = 1`;
    query.groupByFieldsForStatistics = ['COUNTY', 'Subnet'];
    query.outStatistics = [{ statisticType: 'sum', onStatisticField: 'Shape__Length', outStatisticFieldName: 'totalLength' }];
    query.orderByFields = ['COUNTY', 'Subnet'];

    try {
        const results = await roadLayer.queryFeatures(query);
        const allFeatures = results.features.map(f => f.attributes);
        
        // Get top 10 counties by total risk
        const countyTotals: {[key: string]: number} = {};
        allFeatures.forEach(f => {
            countyTotals[f.COUNTY] = (countyTotals[f.COUNTY] || 0) + f.totalLength;
        });
        const top10Counties = Object.entries(countyTotals).sort(([,a],[,b]) => b-a).slice(0,10).map(([name]) => name);

        // Filter data for top 10 counties
        return allFeatures.filter(f => top10Counties.includes(f.COUNTY));

    } catch (error) {
        console.error("Failed to fetch risk breakdown data:", error);
        return null;
    }
  };

  const fetchCriticalityVsSeverity = async (currentScenario: RcpScenario) => {
    if (!roadLayer) return null;
    const floodField = currentScenario === 'rcp45' ? 'future_flood_intersection_m' : 'future_flood_intersection_h';
    const depthField = currentScenario === 'rcp45' ? 'avg_dep_45' : 'avg_dep_85';

    const query = roadLayer.createQuery();
    query.where = `${floodField} = 1 AND ${depthField} > 0`;
    query.groupByFieldsForStatistics = ['Route', 'Criticality_Rating_Num1'];
    query.outStatistics = [
        { statisticType: 'sum', onStatisticField: 'Shape__Length', outStatisticFieldName: 'totalLength' },
        { statisticType: 'avg', onStatisticField: depthField, outStatisticFieldName: 'avgDepth' }
    ];
    query.num = 2000; // Limit for performance

    try {
        const results = await roadLayer.queryFeatures(query);
        return results.features.map(f => ({
            x: f.attributes.Criticality_Rating_Num1,
            y: f.attributes.avgDepth,
            r: Math.sqrt(f.attributes.totalLength / 1000) * 2, // Scale bubble size
            label: f.attributes.Route,
        }));
    } catch (error) {
        console.error("Failed to fetch criticality data:", error);
        return null;
    }
  };

  const fetchRainfallVsInundation = async (currentScenario: RcpScenario) => {
    if (!roadLayer) return null;
    const depthField = currentScenario === 'rcp45' ? 'avg_dep_45' : 'avg_dep_85';

    const rainfallQuery = roadLayer.createQuery();
    rainfallQuery.where = `Rainfall_Change_category = 5`;
    rainfallQuery.groupByFieldsForStatistics = ['COUNTY'];
    rainfallQuery.outStatistics = [{ statisticType: 'sum', onStatisticField: 'Shape__Length', outStatisticFieldName: 'rainfallLength' }];

    const inundationQuery = roadLayer.createQuery();
    inundationQuery.where = `${depthField} > 0`;
    inundationQuery.groupByFieldsForStatistics = ['COUNTY'];
    inundationQuery.outStatistics = [{ statisticType: 'avg', onStatisticField: depthField, outStatisticFieldName: 'avgDepth' }];
    
    try {
        const [rainfallResults, inundationResults] = await Promise.all([
            roadLayer.queryFeatures(rainfallQuery),
            roadLayer.queryFeatures(inundationQuery)
        ]);
        
        const data: { [county: string]: { rainfallLength: number, avgDepth: number } } = {};
        
        rainfallResults.features.forEach(f => {
            const county = f.attributes.COUNTY;
            if (!data[county]) data[county] = { rainfallLength: 0, avgDepth: 0 };
            data[county].rainfallLength = f.attributes.rainfallLength / 1000;
        });

        inundationResults.features.forEach(f => {
            const county = f.attributes.COUNTY;
            if (!data[county]) data[county] = { rainfallLength: 0, avgDepth: 0 };
            data[county].avgDepth = f.attributes.avgDepth;
        });

        const sortedData = Object.entries(data).sort(([,a],[,b]) => b.rainfallLength - a.rainfallLength).slice(0, 15);

        return {
            labels: sortedData.map(([county]) => county),
            rainfall: sortedData.map(([, d]) => d.rainfallLength),
            depth: sortedData.map(([, d]) => d.avgDepth),
        };
    } catch (error) {
        console.error("Failed to fetch rainfall/inundation data:", error);
        return null;
    }
  };

  // --- Chart Rendering Functions ---

  const getChartOptions = (title: string) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { labels: { color: theme.colorText } },
        title: { display: true, text: title, color: theme.colorText }
    },
    scales: {
        x: { ticks: { color: theme.colorTextSecondary }, grid: { color: theme.colorBorderSecondary } },
        y: { ticks: { color: theme.colorTextSecondary }, grid: { color: theme.colorBorderSecondary } }
    }
  });

  const renderTopCountiesChart = (data: any[]) => {
    const ctx = topCountiesChartRef.current?.getContext('2d');
    if (!ctx) return;
    destroyChart('topCounties');
    chartInstances.current.topCounties = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.county),
        datasets: [{
          label: 'Affected Road Length (km)',
          data: data.map(d => parseFloat(d.length)),
          backgroundColor: styleUtils.getChartColor(0, 0.7),
          borderColor: styleUtils.getChartColor(0, 1),
          borderWidth: 1
        }]
      },
      options: { ...getChartOptions(''), indexAxis: 'y', plugins: { legend: { display: false } } }
    });
  };

  const renderVulnerabilityChart = (data: any) => {
    const ctx = vulnerabilityChartRef.current?.getContext('2d');
    if (!ctx) return;
    destroyChart('vulnerability');
    chartInstances.current.vulnerability = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [
                { label: 'RCP 4.5 (km)', data: data.rcp45, backgroundColor: styleUtils.getChartColor(1, 0.7) },
                { label: 'RCP 8.5 (km)', data: data.rcp85, backgroundColor: styleUtils.getChartColor(3, 0.7) }
            ]
        },
        options: getChartOptions('')
    });
  };

  const renderRiskBreakdownChart = (data: any[]) => {
    const ctx = riskBreakdownChartRef.current?.getContext('2d');
    if (!ctx || data.length === 0) return;

    const subnetMap = CONFIG.filterConfig.find(f => f.id === 'subnet')?.options?.reduce((acc, opt) => {
        acc[opt.value] = opt.label;
        return acc;
    }, {} as Record<string, string>) ?? {};

    const subnets = Object.values(subnetMap);
    const counties = [...new Set(data.map(d => d.COUNTY))];

    const datasets = subnets.map((subnetLabel, i) => ({
        label: subnetLabel,
        data: counties.map(county => {
            const item = data.find(d => d.COUNTY === county && (subnetMap[d.Subnet] || `Unknown (${d.Subnet})`) === subnetLabel);
            return item ? item.totalLength / 1000 : 0;
        }),
        backgroundColor: styleUtils.getChartColor(i, 0.7)
    }));

    destroyChart('riskBreakdown');
    chartInstances.current.riskBreakdown = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: counties,
            datasets: datasets
        },
        options: {
            ...getChartOptions(''),
            indexAxis: 'y',
            scales: {
                x: { stacked: true, ...getChartOptions('').scales.x },
                y: { stacked: true, ...getChartOptions('').scales.y }
            }
        }
    });
  };

  const renderCriticalityChart = (data: any[]) => {
    const ctx = criticalityChartRef.current?.getContext('2d');
    if (!ctx) return;
    destroyChart('criticality');
    chartInstances.current.criticality = new Chart(ctx, {
        type: 'bubble',
        data: {
            datasets: [{
                label: 'Routes',
                data: data,
                backgroundColor: styleUtils.getChartColor(4, 0.6)
            }]
        },
        options: {
            ...getChartOptions(''),
            scales: {
                x: { title: { display: true, text: 'Criticality Rating (1-5)', color: theme.colorTextSecondary }, min: 0, max: 6, ticks: { color: theme.colorTextSecondary }, grid: { color: theme.colorBorderSecondary } },
                y: { title: { display: true, text: 'Average Inundation Depth (m)', color: theme.colorTextSecondary }, ticks: { color: theme.colorTextSecondary }, grid: { color: theme.colorBorderSecondary } }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (c: any) => `${c.raw.label}: Criticality ${c.raw.x}, Depth ${c.raw.y.toFixed(2)}m`
                    }
                }
            }
        }
    });
  };

  const renderRainfallChart = (data: any) => {
    const ctx = rainfallChartRef.current?.getContext('2d');
    if (!ctx) return;
    destroyChart('rainfall');
    chartInstances.current.rainfall = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'Road Length in Highest Rainfall Change Category (km)',
                    data: data.rainfall,
                    backgroundColor: styleUtils.getChartColor(0, 0.7),
                    yAxisID: 'y'
                },
                {
                    type: 'line',
                    label: 'Average Inundation Depth (m)',
                    data: data.depth,
                    borderColor: styleUtils.getChartColor(3, 1),
                    backgroundColor: styleUtils.getChartColor(3, 0.5),
                    yAxisID: 'y1',
                    fill: false,
                }
            ]
        },
        options: {
            ...getChartOptions(''),
            scales: {
                x: { ticks: { color: theme.colorTextSecondary }, grid: { color: theme.colorBorderSecondary } },
                y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Length (km)', color: theme.colorTextSecondary }, ticks: { color: theme.colorTextSecondary }, grid: { color: theme.colorBorderSecondary } },
                y1: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'Depth (m)', color: theme.colorTextSecondary }, grid: { drawOnChartArea: false }, ticks: { color: theme.colorTextSecondary } }
            }
        }
    });
  };
  
  const chartCardStyle: React.CSSProperties = {
    width: '100%',
    height: '450px',
    display: 'flex',
    flexDirection: 'column',
  };

  const chartBodyStyle: React.CSSProperties = {
    flex: 1,
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <Layout style={{ padding: '24px', overflowY: 'auto', height: 'calc(100vh - 64px)', background: theme.colorBgLayout }}>
      <Content>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <Title level={2} style={{ margin: 0, color: theme.colorText }}>National Statistics Explorer</Title>
            <Space>
              <Text strong style={{ color: theme.colorTextSecondary }}>Climate Scenario:</Text>
              <Radio.Group value={scenario} onChange={handleScenarioChange}>
                <Radio.Button value="rcp45">RCP 4.5</Radio.Button>
                <Radio.Button value="rcp85">RCP 8.5</Radio.Button>
              </Radio.Group>
            </Space>
          </div>

          <Row gutter={[24, 24]}>
            <Col xs={24} xl={8}>
              <Card title={<Space><BarChartOutlined />Top 10 Affected Counties</Space>} style={chartCardStyle} bodyStyle={chartBodyStyle}>
                {loading ? <ChartPlaceholder title="Top Counties" /> : (topCountiesData && topCountiesData.length > 0 ? <canvas ref={topCountiesChartRef}></canvas> : <ChartEmpty />)}
              </Card>
            </Col>
            <Col xs={24} xl={16}>
              <Card title={<Space><ApartmentOutlined />Vulnerability by Road Type</Space>} style={chartCardStyle} bodyStyle={chartBodyStyle}>
                {loading ? <ChartPlaceholder title="Road Vulnerability" /> : (vulnerabilityData && vulnerabilityData.labels.length > 0 ? <canvas ref={vulnerabilityChartRef}></canvas> : <ChartEmpty />)}
              </Card>
            </Col>

            <Col xs={24} xl={16}>
              <Card title={<Tooltip title="Showing risk composition for the Top 10 at-risk counties"><Space><PieChartOutlined />Risk Composition by County</Space></Tooltip>} style={chartCardStyle} bodyStyle={chartBodyStyle}>
                {loading ? <ChartPlaceholder title="Risk Breakdown" /> : (riskBreakdownData && riskBreakdownData.length > 0 ? <canvas ref={riskBreakdownChartRef}></canvas> : <ChartEmpty />)}
              </Card>
            </Col>
            <Col xs={24} xl={8}>
              <Card title={<Tooltip title="Bubble size represents total length of the route"><Space><DotChartOutlined />Criticality vs. Flood Severity</Space></Tooltip>} style={chartCardStyle} bodyStyle={chartBodyStyle}>
                {loading ? <ChartPlaceholder title="Criticality" /> : (criticalityData && criticalityData.length > 0 ? <canvas ref={criticalityChartRef}></canvas> : <ChartEmpty />)}
              </Card>
            </Col>
            
            <Col xs={24}>
              <Card title={<Space><RiseOutlined />Causal Factors: Rainfall Change vs. Inundation Depth</Space>} style={chartCardStyle} bodyStyle={chartBodyStyle}>
                {loading ? <ChartPlaceholder title="Causal Factors" /> : (rainfallData && rainfallData.labels.length > 0 ? <canvas ref={rainfallChartRef}></canvas> : <ChartEmpty />)}
              </Card>
            </Col>
          </Row>
        </div>
      </Content>
    </Layout>
  );
};

export default ExploreStatisticsPage;
