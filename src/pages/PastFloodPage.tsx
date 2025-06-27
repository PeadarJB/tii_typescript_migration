import { Suspense, FC } from 'react';
import { Card, Spin } from 'antd';
import { lazy } from 'react';

// Store imports
import { useUIState, useMapState, useFilterState, useAppStore } from '@/store/useAppStore';
import { useCommonStyles } from '@/styles/styled';
import { CONFIG } from '@/config/appConfig';

// Lazy loaded components
const EnhancedFilterPanel = lazy(() => import('@/components/EnhancedFilterPanel'));
const EnhancedStatsPanel = lazy(() => import('@/components/EnhancedStatsPanel'));
const EnhancedChartPanel = lazy(() => import('@/components/EnhancedChartPanel'));
const SimpleSwipePanel = lazy(() => import('@/components/SimpleSwipePanel'));
const SimpleReportGenerator = lazy(() => import('@/components/SimpleReportGenerator'));

const LoadingFallback: FC = () => {
    const { styles } = useCommonStyles();
    return (
      <div className={styles.loadingContainer} style={{ position: 'absolute', background: 'transparent' }}>
        <Spin />
      </div>
    );
}

const PastFloodPage: FC = () => {
    const { mapView, webmap, roadLayer, loading } = useMapState();
    const { 
        showFilters, 
        showStats, 
        showChart, 
        showSwipe, 
        showReportModal 
    } = useUIState();
    const { hasActiveFilters, filterPanelKey } = useFilterState();
    const { theme } = useCommonStyles();

    return (
        <>
            {showReportModal && mapView && (
                <Suspense fallback={<LoadingFallback />}>
                <SimpleReportGenerator onClose={() => useAppStore.getState().setShowReportModal(false)} />
                </Suspense>
            )}
            
            {showFilters && roadLayer && mapView && (
                <Suspense fallback={<LoadingFallback />}>
                <EnhancedFilterPanel key={filterPanelKey} />
                </Suspense>
            )}
            
            {showChart && roadLayer && !loading && (
                <Suspense fallback={<LoadingFallback />}>
                <EnhancedChartPanel />
                </Suspense>
            )}
            
            {showSwipe && mapView && webmap && !loading && (
                <Suspense fallback={<LoadingFallback />}>
                <SimpleSwipePanel />
                </Suspense>
            )}
            
            {showStats && hasActiveFilters && roadLayer && !loading && (
                <Suspense fallback={<LoadingFallback />}>
                <EnhancedStatsPanel />
                </Suspense>
            )}
            
            {showFilters && !roadLayer && !loading && webmap && (
                <Card size="small" style={{ 
                position: 'absolute', 
                top: theme.margin, 
                right: theme.margin, 
                width: 300, 
                background: theme.colorWarningBg, 
                borderColor: theme.colorWarningBorder 
                }}>
                <p style={{ margin: 0, color: theme.colorWarningText }}>
                    Cannot show filters: Road layer not found
                </p>
                <p style={{ margin: `${theme.marginXS}px 0 0 0`, fontSize: theme.fontSizeSM, color: theme.colorWarningText }}>
                    Looking for layer: &quot;{CONFIG.roadNetworkLayerTitle}&quot;
                </p>
                <p style={{ margin: `${theme.marginXXS}px 0 0 0`, fontSize: theme.fontSizeSM, color: theme.colorWarningText }}>
                    Available layers: {webmap.layers.map(l => l.title).join(', ') || 'None'}
                </p>
                </Card>
            )}
        </>
    )
}

export default PastFloodPage;