import { FC } from 'react';
import { Card, Statistic, Space, Row, Col, Typography, Empty, Spin, Divider } from 'antd';
import { FieldTimeOutlined, RiseOutlined, WarningOutlined } from '@ant-design/icons';
import { useStatisticsState } from '@/store/useAppStore';
import { usePanelStyles, useCommonStyles } from '@/styles/styled';

const { Text, Title } = Typography;

const PastEventsStatsPanel: FC = () => {
    const { pastEventStats, loading } = useStatisticsState();
    const { styles: panelStyles } = usePanelStyles();
    const { styles: commonStyles, theme } = useCommonStyles();

    if (loading) {
        return (
            <Card className={panelStyles.statsPanel}>
                <div className={commonStyles.loadingContainer} style={{ position: 'relative', background: 'transparent', height: 150 }}>
                    <Spin tip="Calculating stats..." />
                </div>
            </Card>
        );
    }

    if (!pastEventStats || pastEventStats.totalAffectedSegments === 0) {
        return (
            <Card className={panelStyles.statsPanel} style={{ minHeight: '150px' }}>
                 <div className={commonStyles.loadingContainer} style={{ position: 'relative', background: 'transparent' }}>
                    <Empty
                        image={<WarningOutlined style={{ fontSize: 48, color: theme.colorTextQuaternary }} />}
                        description={
                        <div style={{ color: theme.colorTextSecondary }}>
                            <Title level={5}>No Past Events Found</Title>
                            <Text type="secondary">Apply or adjust filters to see statistics.</Text>
                        </div>
                        }
                    />
                </div>
            </Card>
        );
    }

    const { totalAffectedLengthKm, totalAffectedSegments, breakdown } = pastEventStats;

    return (
        <Card
            title={<Space><FieldTimeOutlined /><span>Past Event Statistics</span></Space>}
            size="small"
            className={panelStyles.statsPanel}
        >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Row gutter={[16, 16]}>
                    <Col span={12}>
                        <Statistic 
                            title="Total Network Affected"
                            value={totalAffectedLengthKm}
                            precision={1}
                            suffix="km"
                            prefix={<RiseOutlined />}
                        />
                        <Text type="secondary">{totalAffectedSegments.toLocaleString()} segments</Text>
                    </Col>
                    <Col span={12}>
                        <Text strong>Event Point Count Breakdown:</Text>
                        <ul style={{ paddingLeft: '16px', margin: '4px 0 0 0', listStyleType: 'square' }}>
                            <li>DMS Defects: <strong>{breakdown.drainageDefects.toLocaleString()}</strong></li>
                            <li>OPW Points: <strong>{breakdown.opwFloodPoints.toLocaleString()}</strong></li>
                            <li>JBA/NRA Points: <strong>{breakdown.nraFloodPoints.toLocaleString()}</strong></li>
                            <li>MOCC Points: <strong>{breakdown.moccFloodPoints.toLocaleString()}</strong></li>
                        </ul>
                    </Col>
                </Row>
                 <Divider style={{ margin: '8px 0' }} />
                 <Text type="secondary" style={{ fontSize: theme.fontSizeSM, textAlign: 'center', display: 'block' }}>
                    Statistics are based on the currently filtered road network.
                </Text>
            </Space>
        </Card>
    );
};

export default PastEventsStatsPanel;
