import { FC } from 'react';
import { Card, Statistic, Space, Row, Col, Typography, Empty, Spin } from 'antd';
import { FieldTimeOutlined, RiseOutlined, WarningOutlined } from '@ant-design/icons';
import { useStatisticsState } from '@/store/useAppStore';
import { usePanelStyles } from '@/styles/styled';

const { Text } = Typography;

const PastEventsStatsPanel: FC = () => {
    const { pastEventStats, loading } = useStatisticsState();
    const { styles: panelStyles } = usePanelStyles();

    if (loading) {
        return <Card className={panelStyles.statsPanel}><Spin /></Card>;
    }

    if (!pastEventStats) {
        return (
            <Card className={panelStyles.statsPanel}>
                <Empty 
                  image={<WarningOutlined />}
                  description="Apply filters to view statistics for past events."
                />
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
                    <Text strong>Event Count Breakdown:</Text>
                    <ul style={{ paddingLeft: '16px', margin: '4px 0 0 0' }}>
                        <li>DMS Defects: {breakdown.drainageDefects.toLocaleString()}</li>
                        <li>OPW Points: {breakdown.opwFloodPoints.toLocaleString()}</li>
                        <li>JBA/NRA Points: {breakdown.nraFloodPoints.toLocaleString()}</li>
                        <li>MOCC Points: {breakdown.moccFloodPoints.toLocaleString()}</li>
                    </ul>
                </Col>
            </Row>
        </Card>
    );
};

export default PastEventsStatsPanel;