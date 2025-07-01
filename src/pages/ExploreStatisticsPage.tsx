// src/pages/ExploreStatisticsPage.tsx

import { FC, useState } from 'react';
import { Layout, Row, Col, Card, Typography, Radio, Space } from 'antd';
import { BarChartOutlined, GlobalOutlined, PieChartOutlined, RiseOutlined } from '@ant-design/icons';
import type { RadioChangeEvent } from 'antd';

const { Content } = Layout;
const { Title, Text } = Typography;

type RcpScenario = 'rcp45' | 'rcp85';

const ExploreStatisticsPage: FC = () => {
  const [scenario, setScenario] = useState<RcpScenario>('rcp85');

  const handleScenarioChange = (e: RadioChangeEvent) => {
    setScenario(e.target.value as RcpScenario);
  };

  const chartCardStyle: React.CSSProperties = {
    width: '100%',
    height: '400px', // Fixed height for consistent alignment
    display: 'flex',
    flexDirection: 'column',
  };

  const chartBodyStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#999',
    fontSize: '16px',
    textAlign: 'center',
  };

  return (
    <Layout style={{ padding: '24px', overflowY: 'auto', height: 'calc(100vh - 64px)' }}>
      <Content>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <Title level={2} style={{ margin: 0 }}>Explore National Statistics</Title>
          <Space>
            <Text strong>Future Scenario:</Text>
            <Radio.Group value={scenario} onChange={handleScenarioChange}>
              <Radio.Button value="rcp45">RCP 4.5</Radio.Button>
              <Radio.Button value="rcp85">RCP 8.5</Radio.Button>
            </Radio.Group>
          </Space>
        </div>

        <Row gutter={[24, 24]}>
          {/* Row 1: Choropleth Maps */}
          <Col xs={24} xl={12}>
            <Card 
                title={<Space><GlobalOutlined />County Risk Map (Future Scenarios)</Space>} 
                style={chartCardStyle} 
                bodyStyle={chartBodyStyle}
            >
              Choropleth Map for Future Risk will be rendered here.
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card 
                title={<Space><GlobalOutlined />County Risk Map (Past Events)</Space>} 
                style={chartCardStyle} 
                bodyStyle={chartBodyStyle}
            >
              Choropleth Map for Past Events will be rendered here.
            </Card>
          </Col>

          {/* Row 2: Top 10 Counties and Sunburst Chart */}
          <Col xs={24} xl={12}>
            <Card 
                title={<Space><BarChartOutlined />Top 10 Affected Counties (Future Risk)</Space>} 
                style={chartCardStyle} 
                bodyStyle={chartBodyStyle}
            >
              Horizontal Bar Chart will be rendered here.
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card 
                title={<Space><PieChartOutlined />Risk Breakdown by Road & Flood Type</Space>} 
                style={chartCardStyle} 
                bodyStyle={chartBodyStyle}
            >
              Sunburst Chart will be rendered here.
            </Card>
          </Col>
          
          {/* Row 3: Dual-Axis Chart */}
          <Col xs={24}>
            <Card 
                title={<Space><RiseOutlined />Causal Factors: Rainfall Change vs. Inundation Depth</Space>} 
                style={chartCardStyle} 
                bodyStyle={chartBodyStyle}
            >
              Dual-Axis Combination Chart will be rendered here.
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
};

export default ExploreStatisticsPage;
