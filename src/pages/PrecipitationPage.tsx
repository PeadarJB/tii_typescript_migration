// src/pages/PrecipitationPage.tsx

import { Suspense, FC } from 'react';
import { Spin } from 'antd';
import { lazy } from 'react';

// Store imports
import { useUIState, useMapState, useFilterState } from '@/store/useAppStore';
import { useCommonStyles } from '@/styles/styled';

// Lazy loaded components
const EnhancedFilterPanel = lazy(() => import('@/components/EnhancedFilterPanel'));
const SimpleSwipePanel = lazy(() => import('@/components/SimpleSwipePanel'));
const EnhancedStatsPanel = lazy(() => import('@/components/EnhancedStatsPanel')); // Using the unified component

const LoadingFallback: FC = () => {
    const { styles } = useCommonStyles();
    return (
      <div className={styles.loadingContainer} style={{ position: 'absolute', background: 'transparent' }}>
        <Spin />
      </div>
    );
}

const PrecipitationPage: FC = () => {
    const { mapView, webmap, roadLayer, loading } = useMapState();
    const { 
        showFilters, 
        showStats,
        showSwipe, 
    } = useUIState();
    const { filterPanelKey, hasActiveFilters } = useFilterState();

    return (
        <>
            {showFilters && roadLayer && mapView && (
                <Suspense fallback={<LoadingFallback />}>
                    <EnhancedFilterPanel key={filterPanelKey} />
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
        </>
    )
}

export default PrecipitationPage;