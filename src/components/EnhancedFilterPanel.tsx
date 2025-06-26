import { useState, useEffect, useCallback, FC } from 'react';
import { Card, Select, Button, Space, Divider, Badge, Tooltip, message, Collapse, Row, Col } from 'antd';
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
  FieldTimeOutlined
} from '@ant-design/icons';

// Store imports
import { useAppStore, useMapState, useFilterState } from '@/store/useAppStore';

// Style imports
import { usePanelStyles, useCommonStyles } from '@/styles/styled';

// Type imports
import type FeatureSet from '@arcgis/core/rest/support/FeatureSet';
import type { FilterConfigItem, FilterOption, ScenarioItem, AppPage } from '@/types';


// --- Component Props Interface ---
interface EnhancedFilterPanelProps {
  config: ReadonlyArray<FilterConfigItem>;
  page: AppPage;
}

interface DynamicOptions {
  county: FilterOption[];
}

const EnhancedFilterPanel: FC<EnhancedFilterPanelProps> = ({ config, page }) => {
  const { styles: panelStyles } = usePanelStyles();
  const { styles: commonStyles, theme } = useCommonStyles();
  
  // Store hooks
  const { roadLayer } = useMapState();
  // Pass the current page to the filter state selector
  const { currentFilters, hasActiveFilters } = useFilterState(page);
  const showFilters = useAppStore((state) => state.showFilters);
  const setFilters = useAppStore((state) => state.setFilters);
  const applyFilters = useAppStore((state) => state.applyFilters);
  const clearAllFilters = useAppStore((state) => state.clearAllFilters);

  // Local state
  const [loading, setLoading] = useState<boolean>(false);
  const [applyingFilters, setApplyingFilters] = useState<boolean>(false);
  const [dynamicOptions, setDynamicOptions] = useState<DynamicOptions>({ county: [] });
  const [filterValues, setFilterValues] = useState<Record<string, string[]>>({});
  const [expandedPanels, setExpandedPanels] = useState<string[]>([config[0]?.id ?? '']);
  
  const loadDynamicOptions = useCallback(async (): Promise<void> => {
    if (!roadLayer) return;
    
    // Use the passed-in config to find the county filter
    const countyConfig = config.find(f => f.id === 'county') as any; // Using 'any' for simplicity as field presence is checked
    if (!countyConfig || !countyConfig.field) return;

    try {
      setLoading(true);
      const Query = (await import('@arcgis/core/rest/support/Query.js')).default;
      
      const query = new Query({
        where: '1=1',
        outFields: [countyConfig.field],
        returnDistinctValues: true,
        orderByFields: [countyConfig.field]
      });

      const results: FeatureSet = await roadLayer.queryFeatures(query);

      const counties = results.features
        .map(f => f.attributes[countyConfig.field])
        .filter((c): c is string => typeof c === 'string' && c.trim() !== '')
        .map(c => ({ label: c, value: c }));
      
      setDynamicOptions(prev => ({ ...prev, county: counties }));
    } catch (error) {
      console.error('Failed to load dynamic options:', error);
      message.error('Failed to load filter options');
    } finally {
      setLoading(false);
    }
  }, [roadLayer, config]);
  
  useEffect(() => {
    void loadDynamicOptions();
  }, [loadDynamicOptions]);

  // Sync local state with the page-specific state from the store
  useEffect(() => {
    setFilterValues(currentFilters);
  }, [currentFilters]);

  // Clear filters when panel is hidden
  useEffect(() => {
    if (!showFilters && hasActiveFilters) {
      clearAllFilters(page);
      message.info('Filters cleared as the panel was closed.');
    }
  }, [showFilters, hasActiveFilters, clearAllFilters, page]);
  
  const handleFilterChange = (id: string, value: string[]): void => {
    const newFilterValues = { ...filterValues, [id]: value };
    setFilterValues(newFilterValues);
    setFilters(page, newFilterValues);
  };
  
  const handleApplyFilters = async (): Promise<void> => {
    setApplyingFilters(true);
    try {
      await applyFilters(page);
    } finally {
      setApplyingFilters(false);
    }
  };
  
  const clearFilterGroup = (id: string): void => {
    handleFilterChange(id, []);
  };

  const activeFilterCount = Object.values(filterValues).filter(v => Array.isArray(v) && v.length > 0).length;
  
  const icons: Record<string, React.ReactNode> = {
    'flood-scenario': <WarningOutlined />,
    'past-event-type': <FieldTimeOutlined />,
    'county': <EnvironmentOutlined />,
    'criticality': <SafetyCertificateOutlined />,
    'subnet': <CarOutlined />,
    'lifeline': <HeartOutlined />
  };

  const collapseItems: CollapseProps['items'] = config.map(filter => {
    const selected = filterValues[filter.id] ?? [];
    
    let options: readonly (FilterOption | ScenarioItem)[];
    if (filter.id === 'county') {
      options = dynamicOptions.county;
    } else if (filter.type === 'multi-select' && 'options' in filter) {
      options = filter.options ?? [];
    } else if (filter.type === 'scenario-select' && 'items' in filter) {
      options = filter.items ?? [];
    } else {
        options = [];
    }
    
    const valueProp = filter.type === 'scenario-select' ? 'field' : 'value';

    return {
      key: filter.id,
      label: (
        <Space>
          {icons[filter.id] || <FilterOutlined />}
          <span>{filter.label}</span>
          {selected.length > 0 && <Badge count={selected.length} className="filter-badge" />}
        </Space>
      ),
      extra: selected.length > 0 ? (
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
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder={`Select ${filter.label.toLowerCase()}...`}
              value={selected}
              onChange={(value: string[]) => handleFilterChange(filter.id, value)}
              options={options.map((opt: any) => ({
                label: opt.label,
                value: opt[valueProp]
              }))}
              showSearch={filter.id === 'county'}
              maxTagCount={3}
              maxTagPlaceholder={omitted => `+${omitted.length} more`}
            />
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
            onClick={() => clearAllFilters(page)} 
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