// src/components/EnhancedFilterPanel.tsx - Refactored with consolidated styling

import { useState, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { Card, Select, Button, Space, Divider, Badge, Tooltip, message, Collapse, Row, Col, Slider } from 'antd';
import type { CollapseProps } from 'antd';
import {
  FilterOutlined,
  ClearOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  EnvironmentOutlined,
  SafetyCertificateOutlined,
  CarOutlined,
  HeartOutlined,
  CloudOutlined // Import for precipitation icon
} from '@ant-design/icons';

// Store imports
import { useAppStore, useMapState, useFilterState, useUIState } from '@/store/useAppStore';

// Style imports
import { usePanelStyles, useCommonStyles } from '@/styles/styled';

// Type imports
import type FeatureSet from '@arcgis/core/rest/support/FeatureSet';
import { CONFIG } from '@/config/appConfig';
import type { FilterState } from '@/types';

// Component Props Interface
interface EnhancedFilterPanelProps {
  key?: string | number;
}

// Filter Option Interface
interface FilterOption {
  label: string;
  value: string;
}

// Scenario Item Interface
interface ScenarioItem {
  label: string;
  field: string;
  value: number;
}

// Dynamic Options Interface
interface DynamicOptions {
  county: FilterOption[];
}

// Helper to get initial state for filter values
const getInitialFilterState = (): Partial<FilterState> => {
  const initialState: Partial<FilterState> = {};
  CONFIG.filterConfig.forEach(filter => {
    if (filter.type === 'range-slider') {
        initialState[filter.id as keyof FilterState] = [filter.min ?? 0, filter.max ?? 5] as any;
    } else {
        initialState[filter.id as keyof FilterState] = [] as any;
    }
  });
  return initialState;
};

const EnhancedFilterPanel: FC<EnhancedFilterPanelProps> = () => {
  const { styles: panelStyles } = usePanelStyles();
  const { styles: commonStyles, theme } = useCommonStyles();
  
  // Store hooks
  const { roadLayer } = useMapState();
  const { currentFilters, hasActiveFilters } = useFilterState();
  const { showFilters, activePage } = useUIState();
  const setFilters = useAppStore((state) => state.setFilters);
  const applyFilters = useAppStore((state) => state.applyFilters);
  const clearAllFilters = useAppStore((state) => state.clearAllFilters);

  // Local state
  const [loading, setLoading] = useState<boolean>(false);
  const [applyingFilters, setApplyingFilters] = useState<boolean>(false);
  const [dynamicOptions, setDynamicOptions] = useState<DynamicOptions>({ county: [] });
  const [filterValues, setFilterValues] = useState<Partial<FilterState>>(getInitialFilterState());
  const [expandedPanels, setExpandedPanels] = useState<string[]>([]);

  useEffect(() => {
    if (activePage === 'future') {
      setExpandedPanels(['flood-scenario']);
    } else if (activePage === 'past') {
      setExpandedPanels(['past-flood-event']);
    } else if (activePage === 'precipitation') {
        setExpandedPanels(['rainfall-absolute-cat', 'rainfall-change-cat', 'inundation-depth-45', 'inundation-depth-85']);
    }
  }, [activePage]);
  
  const loadDynamicOptions = useCallback(async (): Promise<void> => {
    if (!roadLayer) return;

    const countyConfig = CONFIG.filterConfig.find(f => f.id === 'county');
    
    if (!countyConfig || !countyConfig.field) {
        console.error('County filter configuration or its field is missing.');
        return;
    }
    
    const fieldName = countyConfig.field;

    try {
      setLoading(true);
      const Query = (await import('@arcgis/core/rest/support/Query.js')).default;
      
      const query = new Query({
        where: '1=1',
        outFields: [fieldName],
        returnDistinctValues: true,
        orderByFields: [fieldName]
      });

      const results: FeatureSet = await roadLayer.queryFeatures(query);

      const counties = results.features
        .map(f => f.attributes[fieldName])
        .filter((c): c is string => typeof c === 'string' && c.trim() !== '')
        .map(c => ({ label: c, value: c }));
      
      setDynamicOptions(prev => ({ ...prev, county: counties }));
    } catch (error) {
      console.error('Failed to load dynamic options:', error);
      message.error('Failed to load filter options');
    } finally {
      setLoading(false);
    }
  }, [roadLayer]);
  
  useEffect(() => {
    void loadDynamicOptions();
  }, [loadDynamicOptions]);

  useEffect(() => {
    setFilterValues(currentFilters);
  }, [currentFilters]);

  useEffect(() => {
    if (!showFilters && hasActiveFilters) {
      clearAllFilters();
      message.info('Filters cleared as the panel was closed.');
    }
  }, [showFilters, hasActiveFilters, clearAllFilters]);
  
  const handleFilterChange = (id: string, value: any): void => {
    const newFilterValues = {
      ...filterValues,
      [id]: value,
    };
    setFilterValues(newFilterValues);
    setFilters(newFilterValues);
  };
  
  const handleApplyFilters = async (): Promise<void> => {
    setApplyingFilters(true);
    try {
      await applyFilters();
    } finally {
      setApplyingFilters(false);
    }
  };
  
  const clearFilterGroup = (id: string): void => {
    const filterConfig = CONFIG.filterConfig.find(f => f.id === id);
    if (filterConfig?.type === 'range-slider') {
        handleFilterChange(id, [filterConfig.min ?? 0, filterConfig.max ?? 5]);
    } else {
        handleFilterChange(id, []);
    }
  };

  const activeFilterCount = Object.values(filterValues).filter(v => {
    if (!Array.isArray(v)) return false;
    const filterConfig = CONFIG.filterConfig.find(f => f.id === Object.keys(filterValues).find(key => filterValues[key as keyof FilterState] === v)!);
    if (filterConfig?.type === 'range-slider') {
        return Number(v[0]) > (filterConfig.min ?? 0) || Number(v[1]) < (filterConfig.max ?? 5);
    }
    return v.length > 0;
  }).length;
  
  const icons: Record<string, React.ReactNode> = {
    'flood-scenario': <WarningOutlined />,
    'past-flood-event': <WarningOutlined />,
    'county': <EnvironmentOutlined />,
    'criticality': <SafetyCertificateOutlined />,
    'subnet': <CarOutlined />,
    'lifeline': <HeartOutlined />,
    'rainfall-absolute-cat': <CloudOutlined />,
    'rainfall-change-cat': <CloudOutlined />,
    'inundation-depth-45': <CloudOutlined />,
    'inundation-depth-85': <CloudOutlined />,
  };

  const getVisibleFilters = () => {
    const commonFilterIds = ['county', 'criticality', 'subnet', 'lifeline'];
    if (activePage === 'past') {
      return CONFIG.filterConfig.filter(
        f => f.id === 'past-flood-event' || commonFilterIds.includes(f.id)
      );
    }
    if (activePage === 'precipitation') {
        const precipitationFilters = [
            'rainfall-absolute-cat',
            'rainfall-change-cat',
            'inundation-depth-45',
            'inundation-depth-85',
            'county'
        ];
        return CONFIG.filterConfig.filter(f => precipitationFilters.includes(f.id));
    }
    return CONFIG.filterConfig.filter(
      f => f.id === 'flood-scenario' || commonFilterIds.includes(f.id)
    );
  };

  const collapseItems: CollapseProps['items'] = getVisibleFilters().map(filter => {
    const selected = filterValues[filter.id as keyof FilterState] as any[] ?? [];
    
    let isFilterActive = false;
    let badgeCount = 0;

    if (filter.type === 'range-slider') {
        const [min, max] = selected as [number, number];
        const defaultMin = filter.min ?? 0;
        const defaultMax = filter.max ?? 5;
        if (min > defaultMin || max < defaultMax) {
            isFilterActive = true;
            badgeCount = 1;
        }
    } else if (Array.isArray(selected) && selected.length > 0) {
        isFilterActive = true;
        badgeCount = selected.length;
    }

    let options: readonly (FilterOption | ScenarioItem)[] | undefined;
    if (filter.type === 'multi-select' && filter.id === 'county') {
        options = dynamicOptions.county;
    } else if (filter.type === 'multi-select') {
        options = filter.options;
    } else if (filter.type === 'scenario-select') {
        options = filter.items;
    }
    
    const valueProp = filter.type === 'scenario-select' ? 'field' : 'value';

    return {
      key: filter.id,
      label: (
        <Space>
          {icons[filter.id]}
          <span>{filter.label}</span>
          {isFilterActive && <Badge count={badgeCount} className="filter-badge" />}
        </Space>
      ),
      extra: isFilterActive ? (
        <Button 
          type="link" 
          size="small" 
          onClick={(e) => { 
            e.stopPropagation(); 
            clearFilterGroup(filter.id); 
          }}
        >
          Clear
        </Button>
      ) : null,
      children: (
        <Row gutter={theme.marginXS} align="middle">
          <Col>
            <Tooltip title={filter.description}>
              <InfoCircleOutlined style={{ color: theme.colorTextTertiary }} />
            </Tooltip>
          </Col>
          <Col flex="auto">
            {filter.type === 'multi-select' || filter.type === 'scenario-select' ? (
                <Select
                  mode="multiple"
                  style={{ width: '100%' }}
                  placeholder={`Select ${filter.label.toLowerCase()}...`}
                  value={selected}
                  onChange={(value: string[]) => handleFilterChange(filter.id, value)}
                  options={options?.map((opt: any) => ({
                    label: opt.label,
                    value: opt[valueProp]
                  }))}
                  showSearch={filter.id === 'county'}
                  maxTagCount={3}
                  maxTagPlaceholder={omitted => `+${omitted.length} more`}
                  disabled={!options || options.length === 0}
                />
            ) : filter.type === 'range-slider' ? (
                <Slider
                    range
                    min={filter.min}
                    max={filter.max}
                    step={filter.step}
                    value={selected as [number, number] || [filter.min!, filter.max!]}
                    onChange={(value: number | number[]) => handleFilterChange(filter.id, value)}
                    marks={{
                        [filter.min!]: `${filter.min}m`,
                        [filter.max!]: `${filter.max}m`
                    }}
                />
            ) : null}
          </Col>
        </Row>
      )
    };
  });
  
  if (!roadLayer || !showFilters) return null;
  
  return (
    <Card
      className={panelStyles.filterPanel}
      title={
        <div className={commonStyles.panelHeader}>
          <FilterOutlined />
          <span>Advanced Filters</span>
          {hasActiveFilters && <Badge count={activeFilterCount} style={{ backgroundColor: theme.colorSuccess }} />}
        </div>
      }
      size="small"
      extra={
        <Tooltip title="Clear all filters">
          <Button 
            size="small" 
            icon={<ClearOutlined />} 
            onClick={() => clearAllFilters()} 
            disabled={!hasActiveFilters} 
            danger
          >
            Clear All
          </Button>
        </Tooltip>
      }
      loading={loading}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        <Collapse 
          className={commonStyles.filterSection}
          activeKey={expandedPanels} 
          onChange={(keys) => setExpandedPanels(Array.isArray(keys) ? keys : [keys].filter(Boolean))} 
          size="small" 
          expandIconPosition="end"
          items={collapseItems}
        />
        
        <Divider style={{ margin: `${theme.marginSM}px 0` }} />
        
        <Button
          type="primary"
          icon={<FilterOutlined />}
          onClick={() => void handleApplyFilters()}
          loading={applyingFilters}
          disabled={loading}
          block
        >
          Apply Filters
        </Button>
      </Space>
    </Card>
  );
};

export default EnhancedFilterPanel;
