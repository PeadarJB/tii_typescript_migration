import React, { useState, useEffect } from 'react';
import { ProCard } from '@ant-design/pro-components';
import { Form, Select, Button, Space, Tag, Tooltip, InputNumber, Empty, message } from 'antd';
import { Column, Pie, Bar } from '@ant-design/charts';
import {
  BarChartOutlined,
  PieChartOutlined,
  LineChartOutlined,
  DownloadOutlined,
  ExpandOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { CONFIG } from '../../config/appConfig';
import { theme, chartColors } from '../../config/themeConfig';

/**
 * ChartPanel - Data visualization panel using Ant Design Charts
 */
const ChartPanel = ({ appManager }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState(null);
  const [chartConfig, setChartConfig] = useState({
    type: 'column',
    features: [],
    groupBy: '',
    metric: 'segmentCount',
    maxCategories: 10,
  });

  // Feature options from config
  const featureOptions = CONFIG.chartingFeatures.map(feature => ({
    label: (
      <Space>
        <Tag color={feature.field.includes('_h') ? 'error' : 'warning'} style={{ marginRight: 0 }}>
          {feature.field.includes('_h') ? '8.5%' : '4.5%'}
        </Tag>
        {feature.label}
      </Space>
    ),
    value: feature.field,
    description: feature.description,
  }));

  // Group by field options
  const [groupByOptions, setGroupByOptions] = useState([]);

  // Load field options when component mounts
  useEffect(() => {
    if (appManager?.components?.roadNetworkLayer) {
      loadGroupByOptions();
    }
  }, [appManager]);

  // Load available fields for grouping
  const loadGroupByOptions = async () => {
    try {
      const layer = appManager.components.roadNetworkLayer;
      const suitableFields = ['string', 'small-integer', 'integer'];
      
      const options = layer.fields
        .filter(f => suitableFields.includes(f.type) && !f.name.toLowerCase().includes('objectid'))
        .map(field => ({
          label: field.alias || field.name,
          value: field.name,
        }));
      
      setGroupByOptions(options);
    } catch (error) {
      console.error('Failed to load field options:', error);
    }
  };

  // Generate chart data
  const generateChart = async () => {
    try {
      setLoading(true);
      const { features, groupBy, metric, maxCategories } = form.getFieldsValue();
      
      if (!features || features.length === 0 || !groupBy) {
        message.warning('Please select features and group by field');
        setLoading(false);
        return;
      }

      // Get current filter expression
      const filterExpression = appManager.components.filterManager?.currentDefinitionExpression || '1=1';
      
      // Query data for each selected feature
      const chartDataArray = [];
      
      for (const featureField of features) {
        const feature = CONFIG.chartingFeatures.find(f => f.field === featureField);
        const whereClause = `${filterExpression} AND ${featureField} = 1`;
        
        // Perform the query
        const query = {
          where: whereClause,
          groupByFieldsForStatistics: [groupBy],
          outStatistics: [{
            statisticType: 'count',
            onStatisticField: appManager.components.roadNetworkLayer.objectIdField,
            outStatisticFieldName: 'segment_count',
          }],
        };
        
        const results = await appManager.components.roadNetworkLayer.queryFeatures(query);
        
        // Process results
        results.features.forEach(f => {
          const groupValue = f.attributes[groupBy] || 'Unknown';
          const count = f.attributes.segment_count || 0;
          const value = metric === 'totalLength' ? count * 0.1 : count;
          
          chartDataArray.push({
            category: String(groupValue),
            feature: feature.label,
            value: value,
            type: featureField.includes('_h') ? 'RCP 8.5' : 'RCP 4.5',
          });
        });
      }

      // Sort and limit categories
      const categoryTotals = {};
      chartDataArray.forEach(item => {
        categoryTotals[item.category] = (categoryTotals[item.category] || 0) + item.value;
      });
      
      const topCategories = Object.entries(categoryTotals)
        .sort(([, a], [, b]) => b - a)
        .slice(0, maxCategories)
        .map(([category]) => category);
      
      const filteredData = chartDataArray.filter(item => topCategories.includes(item.category));
      
      setChartData(filteredData);
      setChartConfig({ type: form.getFieldValue('chartType'), features, groupBy, metric, maxCategories });
      setLoading(false);
      
      message.success('Chart generated successfully');
    } catch (error) {
      console.error('Failed to generate chart:', error);
      message.error('Failed to generate chart');
      setLoading(false);
    }
  };

  // Render the appropriate chart based on type
  const renderChart = () => {
    if (!chartData || chartData.length === 0) {
      return (
        <Empty
          description="No data to display"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    const commonConfig = {
      data: chartData,
      padding: 'auto',
      autoFit: true,
      appendPadding: [10, 0, 0, 0],
      theme: {
        colors10: chartColors.primary,
      },
    };

    switch (chartConfig.type) {
      case 'pie':
        // For pie chart, aggregate data
        const pieData = {};
        chartData.forEach(item => {
          pieData[item.category] = (pieData[item.category] || 0) + item.value;
        });
        
        const pieChartData = Object.entries(pieData).map(([category, value]) => ({
          category,
          value,
        }));
        
        return (
          <Pie
            {...commonConfig}
            data={pieChartData}
            angleField="value"
            colorField="category"
            radius={0.8}
            label={{
              type: 'spider',
              labelHeight: 28,
              content: '{name}\n{percentage}',
            }}
            interactions={[{ type: 'element-selected' }, { type: 'element-active' }]}
          />
        );
      
      case 'bar':
        return (
          <Bar
            {...commonConfig}
            xField="value"
            yField="category"
            seriesField="feature"
            isGroup={true}
            label={{
              position: 'right',
              offset: 4,
              formatter: (v) => `${v.value.toFixed(1)}`,
            }}
            legend={{
              position: 'top-right',
            }}
          />
        );
      
      default: // column
        return (
          <Column
            {...commonConfig}
            xField="category"
            yField="value"
            seriesField="feature"
            isGroup={true}
            columnStyle={{
              radius: [4, 4, 0, 0],
            }}
            label={{
              position: 'top',
              offset: 4,
              style: {
                fill: theme.token.colorTextSecondary,
                fontSize: 10,
              },
              formatter: (v) => `${v.value.toFixed(1)}`,
            }}
            legend={{
              position: 'top-right',
            }}
            xAxis={{
              label: {
                autoRotate: true,
                autoHide: true,
              },
            }}
            yAxis={{
              title: {
                text: chartConfig.metric === 'totalLength' ? 'Length (km)' : 'Segments',
              },
            }}
          />
        );
    }
  };

  // Download chart as image
  const downloadChart = () => {
    // This would need to be implemented based on the chart instance
    message.info('Chart download functionality to be implemented');
  };

  return (
    <ProCard
      title={
        <Space>
          <BarChartOutlined />
          <span>Data Analysis</span>
        </Space>
      }
      extra={
        <Space size="small">
          {chartData && (
            <>
              <Tooltip title="Download chart">
                <Button
                  type="text"
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={downloadChart}
                />
              </Tooltip>
              <Tooltip title="Expand chart">
                <Button
                  type="text"
                  size="small"
                  icon={<ExpandOutlined />}
                  onClick={() => message.info('Expand functionality to be implemented')}
                />
              </Tooltip>
            </>
          )}
        </Space>
      }
      size="small"
      bordered
      style={{
        boxShadow: theme.token.boxShadowSecondary,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
      bodyStyle={{ 
        padding: '12px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Form
        form={form}
        layout="vertical"
        size="small"
        initialValues={{
          chartType: 'column',
          metric: 'segmentCount',
          maxCategories: 10,
        }}
        style={{ marginBottom: 12 }}
      >
        <Form.Item
          name="features"
          label="Features to Analyze"
          rules={[{ required: true, message: 'Please select features' }]}
        >
          <Select
            mode="multiple"
            placeholder="Select features..."
            options={featureOptions}
            maxTagCount={2}
            maxTagPlaceholder={(omittedValues) => `+${omittedValues.length} more`}
          />
        </Form.Item>

        <Form.Item
          name="groupBy"
          label="Group By"
          rules={[{ required: true, message: 'Please select grouping field' }]}
        >
          <Select
            placeholder="Select field..."
            options={groupByOptions}
            showSearch
          />
        </Form.Item>

        <Space style={{ width: '100%' }} direction="vertical" size={8}>
          <Space style={{ width: '100%' }}>
            <Form.Item name="chartType" label="Chart Type" style={{ marginBottom: 0 }}>
              <Select style={{ width: 120 }}>
                <Select.Option value="column">
                  <Space><BarChartOutlined />Column</Space>
                </Select.Option>
                <Select.Option value="bar">
                  <Space><BarChartOutlined rotate={90} />Bar</Space>
                </Select.Option>
                <Select.Option value="pie">
                  <Space><PieChartOutlined />Pie</Space>
                </Select.Option>
              </Select>
            </Form.Item>

            <Form.Item name="metric" label="Measure" style={{ marginBottom: 0 }}>
              <Select style={{ width: 140 }}>
                <Select.Option value="segmentCount">Segment Count</Select.Option>
                <Select.Option value="totalLength">Total Length (km)</Select.Option>
              </Select>
            </Form.Item>
          </Space>

          <Space style={{ width: '100%' }}>
            <Form.Item name="maxCategories" label="Max Categories" style={{ marginBottom: 0 }}>
              <InputNumber min={5} max={50} style={{ width: 100 }} />
            </Form.Item>

            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={generateChart}
              loading={loading}
              style={{ marginTop: 20 }}
            >
              Generate
            </Button>
          </Space>
        </Space>
      </Form>

      <div style={{ flex: 1, minHeight: 300 }}>
        {chartData ? renderChart() : (
          <Empty
            description="Configure options and click Generate to create a chart"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </div>
    </ProCard>
  );
};

export default ChartPanel;