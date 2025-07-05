// src/pages/ExploreStatisticsPage.tsx

import { FC, useState, useEffect, useRef } from 'react';
import { Layout, Row, Col, Card, Typography, Radio, Space, Spin, Tooltip, Empty } from 'antd';
import { BarChartOutlined, PieChartOutlined, RiseOutlined, ApartmentOutlined, SwapOutlined, CloudOutlined } from '@ant-design/icons';
import type { RadioChangeEvent } from 'antd';
import Chart from 'chart.js/auto';

// Store and config imports
import { useMapState } from '@/store/useAppStore';
import { CONFIG } from '@/config/appConfig';
import { useCommonStyles, styleUtils } from '@/styles/styled';

const { Content } = Layout;
const { Title, Text } = Typography;

type RcpScenario = 'rcp45' | 'rcp85';

interface RiskCompositionData {
    features: any[];
    sortedCounties: string[];
}

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
  const [riskCompositionData, setRiskCompositionData] = useState<RiskCompositionData | null>(null);
  const [riskEscalationData, setRiskEscalationData] = useState<any | null>(null);
  const [rainfallData, setRainfallData] = useState<any | null>(null);
  const [rainfallChangeData, setRainfallChangeData] = useState<any | null>(null);
  const [rainfallAbsoluteData, setRainfallAbsoluteData] = useState<any | null>(null);

  // Refs for charts
  const topCountiesChartRef = useRef<HTMLCanvasElement>(null);
  const vulnerabilityChartRef = useRef<HTMLCanvasElement>(null);
  const riskCompositionChartRef = useRef<HTMLCanvasElement>(null);
  const riskEscalationChartRef = useRef<HTMLCanvasElement>(null);
  const rainfallChartRef = useRef<HTMLCanvasElement>(null);
  const rainfallChangeChartRef = useRef<HTMLCanvasElement>(null);
  const rainfallAbsoluteChartRef = useRef<HTMLCanvasElement>(null);
  
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
        fetchedRiskComposition,
        fetchedRiskEscalation,
        fetchedRainfall,
        fetchedRainfallChange,
        fetchedRainfallAbsolute
      ] = await Promise.all([
        fetchTopCounties(scenario),
        fetchVulnerabilityByRoadType(),
        fetchRiskComposition(scenario),
        fetchRiskEscalationData(),
        fetchRainfallVsInundation(scenario),
        fetchRainfallBubbleData(CONFIG.fields.rainfall_change_2050),
        fetchRainfallBubbleData(CONFIG.fields.rainfall_absolute_2050)
      ]);

      setTopCountiesData(fetchedTopCounties);
      setVulnerabilityData(fetchedVulnerability);
      setRiskCompositionData(fetchedRiskComposition);
      setRiskEscalationData(fetchedRiskEscalation);
      setRainfallData(fetchedRainfall);
      setRainfallChangeData(fetchedRainfallChange);
      setRainfallAbsoluteData(fetchedRainfallAbsolute);
      
      setLoading(false);
    };

    // Debounce fetch to prevent rapid re-renders on scenario change
    const timer = setTimeout(fetchData, 100);

    return () => {
      clearTimeout(timer);
      Object.keys(chartInstances.current).forEach(destroyChart);
    };
  }, [roadLayer, scenario]);

  // Render charts when their data updates
  useEffect(() => { if (topCountiesData) renderTopCountiesChart(topCountiesData) }, [topCountiesData, theme]);
  useEffect(() => { if (vulnerabilityData) renderVulnerabilityChart(vulnerabilityData) }, [vulnerabilityData, theme]);
  useEffect(() => { if (riskCompositionData) renderRiskCompositionChart(riskCompositionData) }, [riskCompositionData, theme]);
  useEffect(() => { if (riskEscalationData) renderRiskEscalationChart(riskEscalationData) }, [riskEscalationData, theme]);
  useEffect(() => { if (rainfallData) renderRainfallChart(rainfallData) }, [rainfallData, theme]);
  useEffect(() => { if (rainfallChangeData) renderRainfallBubbleChart(rainfallChangeData, 'rainfallChange') }, [rainfallChangeData, theme]);
  useEffect(() => { if (rainfallAbsoluteData) renderRainfallBubbleChart(rainfallAbsoluteData, 'rainfallAbsolute') }, [rainfallAbsoluteData, theme]);


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

  const fetchRiskComposition = async (currentScenario: RcpScenario): Promise<RiskCompositionData | null> => {
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
        
        const countyTotals: {[key: string]: number} = {};
        allFeatures.forEach(f => {
            countyTotals[f.COUNTY] = (countyTotals[f.COUNTY] || 0) + f.totalLength;
        });
        
        const sortedCounties = Object.entries(countyTotals)
            .sort(([,a],[,b]) => b-a)
            .map(([name]) => name);

        return {
            features: allFeatures,
            sortedCounties: sortedCounties
        };

    } catch (error) {
        console.error("Failed to fetch risk composition data:", error);
        return null;
    }
  };

  const fetchRiskEscalationData = async () => {
    if (!roadLayer) return null;
    
    const historicQuery = roadLayer.createQuery();
    historicQuery.where = `historic_flooding_any = 1`;
    historicQuery.groupByFieldsForStatistics = ['COUNTY'];
    historicQuery.outStatistics = [{ statisticType: 'sum', onStatisticField: 'Shape__Length', outStatisticFieldName: 'totalLength' }];

    const futureQuery = roadLayer.createQuery();
    futureQuery.where = `future_flood_intersection_h = 1`;
    futureQuery.groupByFieldsForStatistics = ['COUNTY'];
    futureQuery.outStatistics = [{ statisticType: 'sum', onStatisticField: 'Shape__Length', outStatisticFieldName: 'totalLength' }];

    try {
        const [historicResults, futureResults] = await Promise.all([
            roadLayer.queryFeatures(historicQuery),
            roadLayer.queryFeatures(futureQuery)
        ]);

        const data: { [county: string]: { past: number, future: number } } = {};

        historicResults.features.forEach(f => {
            const county = f.attributes.COUNTY;
            if (!data[county]) data[county] = { past: 0, future: 0 };
            data[county].past = f.attributes.totalLength / 1000;
        });

        futureResults.features.forEach(f => {
            const county = f.attributes.COUNTY;
            if (!data[county]) data[county] = { past: 0, future: 0 };
            data[county].future = f.attributes.totalLength / 1000;
        });

        return Object.entries(data)
            .map(([county, values]) => ({ county, ...values }))
            .sort((a, b) => b.future - a.future)
            .slice(0, 20);

    } catch (error) {
        console.error("Failed to fetch risk escalation data:", error);
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

  // NEW: Fetch data for rainfall bubble charts
  const fetchRainfallBubbleData = async (rainfallField: string) => {
    if (!roadLayer) return null;

    const subnetMap = CONFIG.filterConfig.find(f => f.id === 'subnet')?.options?.reduce((acc, opt) => {
        acc[opt.value] = opt.label;
        return acc;
    }, {} as Record<string, string>) ?? {};

    // Query for RCP 4.5
    const queryRcp45 = roadLayer.createQuery();
    queryRcp45.where = `future_flood_intersection_m = 1 AND ${rainfallField} IS NOT NULL AND ${rainfallField} > 0`;
    queryRcp45.groupByFieldsForStatistics = ['Subnet'];
    queryRcp45.outStatistics = [
        { statisticType: 'sum', onStatisticField: 'Shape__Length', outStatisticFieldName: 'totalLength' },
        { statisticType: 'avg', onStatisticField: rainfallField, outStatisticFieldName: 'avgRainfall' }
    ];

    // Query for RCP 8.5
    const queryRcp85 = roadLayer.createQuery();
    queryRcp85.where = `future_flood_intersection_h = 1 AND ${rainfallField} IS NOT NULL AND ${rainfallField} > 0`;
    queryRcp85.groupByFieldsForStatistics = ['Subnet'];
    queryRcp85.outStatistics = [
        { statisticType: 'sum', onStatisticField: 'Shape__Length', outStatisticFieldName: 'totalLength' },
        { statisticType: 'avg', onStatisticField: rainfallField, outStatisticFieldName: 'avgRainfall' }
    ];

    try {
        const [results45, results85] = await Promise.all([
            roadLayer.queryFeatures(queryRcp45),
            roadLayer.queryFeatures(queryRcp85)
        ]);

        const bubbleData: any[] = [];

        // Process RCP 4.5 data
        results45.features.forEach(f => {
            const subnetLabel = subnetMap[f.attributes.Subnet] || `Unknown (${f.attributes.Subnet})`;
            const lengthKm = f.attributes.totalLength / 1000;
            const rainfall = f.attributes.avgRainfall;
            
            if (lengthKm > 0 && rainfall > 0) {
                bubbleData.push({
                    x: f.attributes.Subnet, // Subnet category (0-4)
                    y: parseFloat(rainfall.toFixed(2)), // Rainfall value (2 decimal places)
                    r: Math.max(5, Math.min(50, lengthKm / 10)), // Bubble size based on length
                    length: lengthKm,
                    scenario: 'RCP 4.5',
                    subnet: subnetLabel
                });
            }
        });

        // Process RCP 8.5 data
        results85.features.forEach(f => {
            const subnetLabel = subnetMap[f.attributes.Subnet] || `Unknown (${f.attributes.Subnet})`;
            const lengthKm = f.attributes.totalLength / 1000;
            const rainfall = f.attributes.avgRainfall;
            
            if (lengthKm > 0 && rainfall > 0) {
                bubbleData.push({
                    x: f.attributes.Subnet, // Subnet category (0-4)
                    y: parseFloat(rainfall.toFixed(2)), // Rainfall value (2 decimal places)
                    r: Math.max(5, Math.min(50, lengthKm / 10)), // Bubble size based on length
                    length: lengthKm,
                    scenario: 'RCP 8.5',
                    subnet: subnetLabel
                });
            }
        });

        return {
            bubbleData,
            subnetLabels: Object.values(subnetMap)
        };

    } catch (error) {
        console.error("Failed to fetch rainfall bubble data:", error);
        return null;
    }
  };

  // --- Chart Rendering Functions ---

  const getChartOptions = (title: string, scales = true) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { labels: { color: theme.colorText } },
        title: { display: true, text: title, color: theme.colorText, font: {size: 14} }
    },
    scales: scales ? {
        x: { ticks: { color: theme.colorTextSecondary }, grid: { color: theme.colorBorderSecondary } },
        y: { ticks: { color: theme.colorTextSecondary }, grid: { color: theme.colorBorderSecondary } }
    } : undefined
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
      options: { ...getChartOptions(''), indexAxis: 'y', plugins: { ...getChartOptions('').plugins, legend: { display: false } } }
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

  const renderRiskCompositionChart = (data: RiskCompositionData) => {
    const ctx = riskCompositionChartRef.current?.getContext('2d');
    if (!ctx || !data || !data.features || data.features.length === 0) return;

    const { features, sortedCounties } = data;

    const subnetMap = CONFIG.filterConfig.find(f => f.id === 'subnet')?.options?.reduce((acc, opt) => {
        acc[opt.value] = opt.label;
        return acc;
    }, {} as Record<string, string>) ?? {};

    const subnets = Object.values(subnetMap);
    const counties = sortedCounties;

    const datasets = subnets.map((subnetLabel, i) => ({
        label: subnetLabel,
        data: counties.map((county: string) => {
            const item = features.find((d: any) => d.COUNTY === county && (subnetMap[d.Subnet] || `Unknown (${d.Subnet})`) === subnetLabel);
            return item ? item.totalLength / 1000 : 0;
        }),
        backgroundColor: styleUtils.getChartColor(i, 0.8)
    }));

    destroyChart('riskComposition');
    chartInstances.current.riskComposition = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: counties,
            datasets: datasets
        },
        options: {
            ...getChartOptions(''),
            indexAxis: 'y',
            scales: {
                x: { 
                    stacked: true, 
                    ...(getChartOptions('').scales?.x ?? {}), 
                    title: { display: true, text: 'At-Risk Road Length (km)', color: theme.colorTextSecondary } 
                },
                y: { 
                    stacked: true, 
                    ...(getChartOptions('').scales?.y ?? {}) 
                }
            }
        }
    });
  };

  const renderRiskEscalationChart = (data: any[]) => {
    const ctx = riskEscalationChartRef.current?.getContext('2d');
    if (!ctx) return;

    const labels = data.map(d => d.county);
    
    destroyChart('riskEscalation');
    chartInstances.current.riskEscalation = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Past vs. Future Risk',
                    data: data.map(d => [d.past, d.future]),
                    backgroundColor: 'rgba(128, 128, 128, 0.2)',
                    borderColor: 'rgba(128, 128, 128, 0.5)',
                    borderWidth: 1,
                    borderSkipped: false,
                },
                {
                    type: 'scatter',
                    label: 'Past Events',
                    data: data.map(d => d.past),
                    backgroundColor: styleUtils.getChartColor(1, 1),
                },
                {
                    type: 'scatter',
                    label: 'Future (RCP 8.5)',
                    data: data.map(d => d.future),
                    backgroundColor: styleUtils.getChartColor(3, 1),
                }
            ]
        },
        options: {
            ...getChartOptions(''),
            indexAxis: 'y',
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

  // NEW: Render rainfall bubble charts
  const renderRainfallBubbleChart = (data: any, chartKey: string) => {
    const ctx = chartKey === 'rainfallChange' 
        ? rainfallChangeChartRef.current?.getContext('2d')
        : rainfallAbsoluteChartRef.current?.getContext('2d');
    if (!ctx || !data) return;

    destroyChart(chartKey);

    const rcp45Data = data.bubbleData.filter((d: any) => d.scenario === 'RCP 4.5');
    const rcp85Data = data.bubbleData.filter((d: any) => d.scenario === 'RCP 8.5');

    const subnetLabels = ['Motorway/Dual (0)', 'Engineered (1)', 'Urban (2)', 'Legacy High (3)', 'Legacy Low (4)'];

    chartInstances.current[chartKey] = new Chart(ctx, {
        type: 'bubble',
        data: {
            datasets: [
                {
                    label: 'RCP 4.5',
                    data: rcp45Data,
                    backgroundColor: styleUtils.getChartColor(1, 0.6),
                    borderColor: styleUtils.getChartColor(1, 1),
                    borderWidth: 1,
                },
                {
                    label: 'RCP 8.5',
                    data: rcp85Data,
                    backgroundColor: styleUtils.getChartColor(3, 0.6),
                    borderColor: styleUtils.getChartColor(3, 1),
                    borderWidth: 1,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: theme.colorText } },
                title: { 
                    display: true, 
                    text: `${chartKey === 'rainfallChange' ? 'Rainfall Change 2050' : 'Rainfall Absolute 2050'} vs Road Subnet`,
                    color: theme.colorText, 
                    font: {size: 14} 
                },
                tooltip: {
                    callbacks: {
                        label: (context: any) => {
                            const point = context.raw;
                            return [
                                `${context.dataset.label}`,
                                `Subnet: ${point.subnet}`,
                                `Rainfall: ${point.y.toFixed(2)} mm`,
                                `Affected Length: ${point.length.toFixed(1)} km`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: { 
                    type: 'linear',
                    min: -0.5,
                    max: 4.5,
                    ticks: { 
                        stepSize: 1,
                        callback: function(value: any) {
                            const index = parseInt(value);
                            return subnetLabels[index] || '';
                        },
                        color: theme.colorTextSecondary 
                    },
                    title: { display: true, text: 'Road Subnet Category', color: theme.colorTextSecondary },
                    grid: { color: theme.colorBorderSecondary }
                },
                y: { 
                    ticks: { color: theme.colorTextSecondary },
                    title: { 
                        display: true, 
                        text: `${chartKey === 'rainfallChange' ? 'Rainfall Change' : 'Absolute Rainfall'} (mm)`,
                        color: theme.colorTextSecondary 
                    },
                    grid: { color: theme.colorBorderSecondary }
                }
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

  const largeChartCardStyle: React.CSSProperties = {
    ...chartCardStyle,
    height: '600px',
  }

  const chartBodyStyle: React.CSSProperties = {
    flex: 1,
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'auto',
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
              <Card title={<Tooltip title="Showing risk composition for all at-risk counties, sorted by total risk."><Space><PieChartOutlined />Risk Composition by County</Space></Tooltip>} style={largeChartCardStyle} bodyStyle={chartBodyStyle}>
                {loading ? <ChartPlaceholder title="Risk Composition" /> : (riskCompositionData && riskCompositionData.features.length > 0 ? <canvas ref={riskCompositionChartRef}></canvas> : <ChartEmpty />)}
              </Card>
            </Col>
            <Col xs={24} xl={8}>
              <Card title={<Tooltip title="Compares roads affected by past events vs. future (RCP 8.5) projections."><Space><SwapOutlined />Risk Escalation</Space></Tooltip>} style={largeChartCardStyle} bodyStyle={chartBodyStyle}>
                {loading ? <ChartPlaceholder title="Risk Escalation" /> : (riskEscalationData && riskEscalationData.length > 0 ? <canvas ref={riskEscalationChartRef}></canvas> : <ChartEmpty />)}
              </Card>
            </Col>
            
            <Col xs={24}>
              <Card title={<Space><RiseOutlined />Causal Factors: Rainfall Change vs. Inundation Depth</Space>} style={chartCardStyle} bodyStyle={chartBodyStyle}>
                {loading ? <ChartPlaceholder title="Causal Factors" /> : (rainfallData && rainfallData.labels.length > 0 ? <canvas ref={rainfallChartRef}></canvas> : <ChartEmpty />)}
              </Card>
            </Col>

            {/* NEW: Rainfall bubble charts */}
            <Col xs={24} xl={12}>
              <Card title={<Space><CloudOutlined />Rainfall Change 2050 vs Subnet Types</Space>} style={largeChartCardStyle} bodyStyle={chartBodyStyle}>
                {loading ? <ChartPlaceholder title="Rainfall Change Bubble Chart" /> : (rainfallChangeData && rainfallChangeData.bubbleData.length > 0 ? <canvas ref={rainfallChangeChartRef}></canvas> : <ChartEmpty />)}
              </Card>
            </Col>
            <Col xs={24} xl={12}>
              <Card title={<Space><CloudOutlined />Rainfall Absolute 2050 vs Subnet Types</Space>} style={largeChartCardStyle} bodyStyle={chartBodyStyle}>
                {loading ? <ChartPlaceholder title="Rainfall Absolute Bubble Chart" /> : (rainfallAbsoluteData && rainfallAbsoluteData.bubbleData.length > 0 ? <canvas ref={rainfallAbsoluteChartRef}></canvas> : <ChartEmpty />)}
              </Card>
            </Col>
          </Row>
        </div>
      </Content>
    </Layout>
  );
};

export default ExploreStatisticsPage;