// src/pages/DataOverviewPage.tsx

import { FC } from 'react';
import { Layout, Row, Col, Card, Typography, Table, Tag, Space, Alert } from 'antd';
import { BookOutlined, DatabaseOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { CONFIG } from '@/config/appConfig';
import type { FieldMetadata } from '@/types';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const columns = [
  {
    title: 'Field Name',
    dataIndex: 'fieldName',
    key: 'fieldName',
    render: (text: string) => <Text code>{text}</Text>,
  },
  {
    title: 'Friendly Name',
    dataIndex: 'friendlyName',
    key: 'friendlyName',
    render: (text: string) => <Text strong>{text}</Text>,
  },
  {
    title: 'Description',
    dataIndex: 'description',
    key: 'description',
  },
  {
    title: 'Data Type',
    dataIndex: 'dataType',
    key: 'dataType',
    render: (text: string) => text ? <Tag>{text}</Tag> : null,
  },
];

const simpleColumns = [
    {
      title: 'Field Name',
      dataIndex: 'fieldName',
      key: 'fieldName',
      render: (text: string) => <Text code>{text}</Text>,
    },
    {
      title: 'Friendly Name',
      dataIndex: 'friendlyName',
      key: 'friendlyName',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
  ];

interface SectionCardProps {
  title: string;
  data: ReadonlyArray<FieldMetadata>;
  simple?: boolean;
}

const SectionCard: FC<SectionCardProps> = ({ title, data, simple = false }) => (
  <Card title={<Space><DatabaseOutlined /> {title}</Space>} style={{ marginBottom: 24 }}>
    <Table
      columns={simple ? simpleColumns : columns}
      dataSource={data.map(item => ({ ...item, key: item.fieldName }))}
      pagination={false}
      size="small"
    />
  </Card>
);

const DataOverviewPage: FC = () => {
  const { dataGlossary } = CONFIG;

  return (
    <Layout style={{ padding: '24px', overflowY: 'auto', height: 'calc(100vh - 64px)' }}>
      <Content style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Title level={2} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <BookOutlined /> Data Glossary: TII Road Network Layer
        </Title>
        <Paragraph type="secondary">
          This document provides a comprehensive glossary for the fields contained within the primary <Text code>TII_CAIP_NM</Text> road network feature layer. The data is structured to allow for detailed analysis of flood risk by combining road network attributes with data from historical events and future climate scenarios.
        </Paragraph>

        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <SectionCard title="Core Road Network Attributes" data={dataGlossary.coreAttributes} />
            <SectionCard title="Criticality & Lifeline Attributes" data={dataGlossary.criticalityAttributes} />
            <SectionCard title="Precipitation Model Fields" data={dataGlossary.precipitationFields} simple />
          </Col>
          <Col xs={24} lg={12}>
            <SectionCard title="Past Event Indicator Fields (Binary Flags)" data={dataGlossary.pastEventIndicators} simple />
            <SectionCard title="Past Event Count Fields" data={dataGlossary.pastEventCounts} simple />
          </Col>
        </Row>
        
        <SectionCard title="Future Scenario Indicator Fields (Binary Flags)" data={dataGlossary.futureScenarioIndicators} simple />
        <SectionCard title="Future Scenario Inundation Depth Fields" data={dataGlossary.inundationDepthFields} simple />

        <Card title={<Space><InfoCircleOutlined />Cross-Analysis & System Fields</Space>}>
            <Alert
                message="Cross-Analysis Fields"
                description={dataGlossary.crossAnalysisNote.description}
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
            />
             <Paragraph>Example Fields: {dataGlossary.crossAnalysisNote.examples.map(ex => <Text code key={ex}>{ex}</Text>).reduce((prev, curr) => <>{prev}, {curr}</>)}</Paragraph>
             <Paragraph>System Fields are generally used for system identification or are byproducts of GIS analysis and are not intended for direct use in the dashboard's primary statistics. Examples include: {dataGlossary.systemFields.map(sf => <Text code key={sf}>{sf}</Text>).reduce((prev, curr) => <>{prev}, {curr}</>)}</Paragraph>
        </Card>

      </Content>
    </Layout>
  );
};

export default DataOverviewPage;
