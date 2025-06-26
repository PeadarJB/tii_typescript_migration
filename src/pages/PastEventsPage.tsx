import { FC, Suspense, lazy } from 'react';
import { Spin } from 'antd';
import { useUIState, useMapState } from '@/store/useAppStore';
import { PAST_EVENTS_FILTER_CONFIG, PAST_EVENTS_CHARTING_FEATURES } from '@/config/appConfig';
import { useCommonStyles } from '@/styles/styled';

// Lazy load components
const EnhancedFilterPanel = lazy(() => import('@/components/EnhancedFilterPanel'));
const PastEventsStatsPanel = lazy(() => import('@/components/panels/PastEventsStatsPanel'));
const EnhancedChartPanel = lazy(() => import('@/components/EnhancedChartPanel'));

const LoadingFallback: FC = () => {
    const { styles } = useCommonStyles();
    return (
        <div className={styles.loadingContainer} style={{ position: 'absolute', background: 'transparent' }}>
            <Spin />
        </div>
    );
};

const PastEventsPage: FC = () => {
    const { showFilters, showStats, showChart } = useUIState();
    const { roadLayer, loading } = useMapState();

    return (
        <Suspense fallback={<LoadingFallback />}>
            {showFilters && roadLayer && (
                <EnhancedFilterPanel config={PAST_EVENTS_FILTER_CONFIG} page="past" />
            )}
            {showStats && roadLayer && (
                <PastEventsStatsPanel />
            )}
            {showChart && roadLayer && !loading && (
                <EnhancedChartPanel chartingFeatures={PAST_EVENTS_CHARTING_FEATURES} />
            )}
        </Suspense>
    );
};

export default PastEventsPage;
