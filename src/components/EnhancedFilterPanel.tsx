// src/components/EnhancedFilterPanel.tsx

import { useState, useEffect, useCallback } from 'react';
import type { FC } from 'react';
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
  HeartOutlined
} from '@ant-design/icons';

// Type imports
import type MapView from '@arcgis/core/views/MapView';
import type FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import type Extent from '@arcgis/core/geometry/Extent';
import type FeatureSet from '@arcgis/core/rest/support/FeatureSet';
import type { FilterState } from '@/types';

// Component Props Interface
interface EnhancedFilterPanelProps {
  view: MapView;
  roadLayer: FeatureLayer;
  onFiltersChange: (filters: Partial<FilterState>) => void;
  initialExtent: Extent | null;
  onApplyFilters?: () => void;
  isShown: boolean;
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

// Base Filter Config
interface BaseFilterConfig {
  id: string;
  label: string;
  description: string;
}

// Scenario Filter Config
interface ScenarioFilterConfig extends BaseFilterConfig {
  type: 'scenario-select';
  items: readonly ScenarioItem[];
}

// Multi-select Filter Config
interface MultiSelectFilterConfig extends BaseFilterConfig {
  type: 'multi-select';
  field: string;
  dataType: 'string' | 'number';
  options: readonly FilterOption[];
}

// Union type for all filter configs
type FilterConfigItem = ScenarioFilterConfig | MultiSelectFilterConfig;

// Dynamic Options Interface
interface DynamicOptions {
  county: FilterOption[];
}

// Filter Configuration
const CONFIG: { filterConfig: readonly FilterConfigItem[] } = {
  filterConfig: [
    {
      id: 'flood-scenario',
      label: 'Flood Scenario',
      type: 'scenario-select',
      description: 'Select one or more flood scenarios to analyze.',
      items: [
        { label: 'Future Flooding (Mid-Range, RCP 4.5)', field: 'future_flood_intersection_m', value: 1 },
        { label: 'Future Flooding (High-Range, RCP 8.5)', field: 'future_flood_intersection_h', value: 1 },
        { label: 'Historic & Future (Mid-Range, RCP 4.5)', field: 'historic_intersection_m', value: 1 },
        { label: 'Historic & Future (High-Range, RCP 8.5)', field: 'historic_intersection_h', value: 1 },
        { label: 'Historic Only (Mid-Range, RCP 4.5)', field: 'hist_no_future_m', value: 1 },
        { label: 'Historic Only (High-Range, RCP 8.5)', field: 'hist_no_future_h', value: 1 }
      ]
    } satisfies ScenarioFilterConfig,
    {
      id: 'county',
      label: 'County',
      type: 'multi-select',
      field: 'COUNTY',
      dataType: 'string',
      description: 'Filter by administrative county boundaries.',
      options: [] // Populated dynamically
    } satisfies MultiSelectFilterConfig,
    {
      id: 'criticality',
      label: 'Criticality Rating',
      type: 'multi-select',
      field: 'Criticality_Rating_Num1',
      dataType: 'number',
      description: 'Infrastructure criticality assessment based on usage and importance.',
      options: [
        { label: "Very High (5)", value: "5" },
        { label: "High (4)", value: "4" },
        { label: "Medium (3)", value: "3" },
        { label: "Low (2)", value: "2" },
        { label: "Very Low (1)", value: "1" }
      ]
    } satisfies MultiSelectFilterConfig,
    {
      id: 'subnet',
      label: 'Road Subnet',
      type: 'multi-select',
      field: 'Subnet',
      dataType: 'number',
      description: 'Classification of road infrastructure by construction and traffic patterns.',
      options: [
        { label: "Motorway/Dual Carriageway (0)", value: "0" },
        { label: "Engineered Pavements (1)", value: "1" },
        { label: "Urban Roads (2)", value: "2" },
        { label: "Legacy Pavements - High Traffic (3)", value: "3" },
        { label: "Legacy Pavements - Low Traffic (4)", value: "4" }
      ]
    } satisfies MultiSelectFilterConfig,
    {
      id: 'lifeline',
      label: 'Lifeline Route',
      type: 'multi-select',
      field: 'Lifeline',
      dataType: 'number',
      description: 'Critical routes essential for emergency services and vital community functions.',
      options: [
        { label: "Lifeline Route", value: "1" },
        { label: "Non-lifeline Route", value: "0" }
      ]
    } satisfies MultiSelectFilterConfig
  ]
} as const;

// Helper to get initial state for filter values
const getInitialFilterState = (): Record<string, string[]> => {
  const initialState: Record<string, string[]> = {};
  CONFIG.filterConfig.forEach(filter => {
    initialState[filter.id] = [];
  });
  return initialState;
};

const EnhancedFilterPanel: FC<EnhancedFilterPanelProps> = ({ 
  view, 
  roadLayer, 
  onFiltersChange, 
  initialExtent, 
  onApplyFilters, 
  isShown 
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [applyingFilters, setApplyingFilters] = useState<boolean>(false);
  const [dynamicOptions, setDynamicOptions] = useState<DynamicOptions>({ county: [] });
  
  // A single state object to hold all filter values, keyed by filter ID.
  const [filterValues, setFilterValues] = useState<Record<string, string[]>>(getInitialFilterState());
  const [expandedPanels, setExpandedPanels] = useState<string[]>(['flood-scenario']);
  
  const loadDynamicOptions = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const Query = (await import('@arcgis/core/rest/support/Query.js')).default;
      
      const countyConfig = CONFIG.filterConfig.find(f => f.id === 'county') as MultiSelectFilterConfig | undefined;
      
      if (!countyConfig || countyConfig.field.length === 0) {
        throw new Error('County field not found in configuration');
      }
      
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
  }, [roadLayer]);
  
  // Load dynamic filter options
  useEffect(() => {
    void loadDynamicOptions();
  }, [loadDynamicOptions]);

  const clearAllFilters = useCallback((): void => {
    setFilterValues(getInitialFilterState());
    
    roadLayer.definitionExpression = '1=1';
    roadLayer.visible = false;
    
    message.info('All filters cleared');

    if (initialExtent !== null) {
      void view.goTo(initialExtent);
    }

    if (onFiltersChange) {
      onFiltersChange({});
    }
  }, [roadLayer, initialExtent, view, onFiltersChange]);

  // When the panel is hidden via the toggle, clear filters if any are active
  useEffect(() => {
    if (isShown === false) {
      const hasActiveFilters = Object.values(filterValues).some(v => v.length > 0);
      
      if (hasActiveFilters) {
        clearAllFilters();
        message.info('Filters cleared as the panel was closed.');
      }
    }
  }, [isShown, filterValues, clearAllFilters]);
  
  const handleFilterChange = (id: string, value: string[]): void => {
    setFilterValues(prev => ({
      ...prev,
      [id]: value,
    }));
  };
  
  const applyFilters = async (): Promise<void> => {
    try {
      setApplyingFilters(true);
      const whereClauses: string[] = [];

      // Loop through the config to build the WHERE clause dynamically
      CONFIG.filterConfig.forEach(config => {
        const selectedValues = filterValues[config.id];
        
        if (!selectedValues || selectedValues.length === 0) {
          return;
        }

        if (config.type === 'scenario-select') {
          // Special OR logic for scenarios
          const scenarioClauses = selectedValues.map(field => `${field} = 1`);
          
          whereClauses.push(`(${scenarioClauses.join(' OR ')})`);
        } else if (config.field.length > 0) {
          // Standard IN logic for other filters
          const formattedValues = selectedValues.map(val => 
            config.dataType === 'string' ? `'${val}'` : val
          ).join(',');
          
          whereClauses.push(`${config.field} IN (${formattedValues})`);
        }
      });
      
      const finalWhereClause = whereClauses.length > 0 ? whereClauses.join(' AND ') : '1=1';
      
      roadLayer.definitionExpression = finalWhereClause;
      
      if (whereClauses.length > 0) {
        // Show layer when filters are applied
        roadLayer.visible = true;
        
        message.success('Filters applied successfully');

        // Call the handler to open the stats panel
        if (onApplyFilters) {
          onApplyFilters();
        }
        
        // Zoom to filtered extent
        const Query = (await import('@arcgis/core/rest/support/Query.js')).default;
        const query = new Query({ where: finalWhereClause });
        
        const extentResult = await roadLayer.queryExtent(query);
        
        if (extentResult !== null && 'extent' in extentResult && extentResult.extent !== null) {
          void view.goTo(extentResult.extent.expand(1.2));
        }
      } else {
        // Hide layer when no filters
        roadLayer.visible = false;
        message.info('No filters applied - road layer hidden');
        
        // Return to initial extent
        if (initialExtent !== null) {
          void view.goTo(initialExtent);
        }
      }
      
      // Notify parent component about filter changes
      if (onFiltersChange) {
        onFiltersChange(filterValues);
      }

    } catch (error) {
      console.error('Failed to apply filters:', error);
      message.error('Failed to apply filters');
    } finally {
      setApplyingFilters(false);
    }
  };
  
  const clearFilterGroup = (id: string): void => {
    handleFilterChange(id, []);
  };

  const activeFilterCount = Object.values(filterValues).filter(v => v.length > 0).length;
  const hasActiveFilters = activeFilterCount > 0;
  
  const icons: Record<string, React.ReactNode> = {
    'flood-scenario': <WarningOutlined />,
    'county': <EnvironmentOutlined />,
    'criticality': <SafetyCertificateOutlined />,
    'subnet': <CarOutlined />,
    'lifeline': <HeartOutlined />
  };

  const collapseItems: CollapseProps['items'] = CONFIG.filterConfig.map(filter => {
    const selected = filterValues[filter.id] ?? [];
    
    // Determine options based on filter type and id
    let options: readonly (FilterOption | ScenarioItem)[];
    if (filter.id === 'county') {
      options = dynamicOptions.county;
    } else if (filter.type === 'multi-select') {
      options = filter.options;
    } else {
      options = filter.items;
    }
    
    const valueProp = filter.type === 'scenario-select' ? 'field' : 'value';

    return {
      key: filter.id,
      label: (
        <Space>
          {icons[filter.id]}
          <span>{filter.label}</span>
          {selected.length > 0 && <Badge count={selected.length} />}
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
        <Row gutter={8} align="middle">
          <Col>
            <Tooltip title={filter.description}>
              <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
            </Tooltip>
          </Col>
          <Col flex="auto">
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder={`Select ${filter.label.toLowerCase()}...`}
              value={selected}
              onChange={(value: string[]) => handleFilterChange(filter.id, value)}
              options={options.map((opt: FilterOption | ScenarioItem) => ({
                label: opt.label,
                value: valueProp === 'field' ? (opt as ScenarioItem).field : (opt as FilterOption).value
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
  
  return (
    <Card
      title={
        <Space>
          <FilterOutlined />
          <span>Advanced Filters</span>
          {hasActiveFilters && <Badge count={activeFilterCount} style={{ backgroundColor: '#52c41a' }} />}
        </Space>
      }
      size="small"
      style={{ 
        position: 'absolute', 
        top: 16, 
        right: 16, 
        width: 360, 
        maxHeight: 'calc(100vh - 100px)', 
        display: 'flex', 
        flexDirection: 'column' 
      }}
      bodyStyle={{ padding: '12px', overflow: 'auto', flex: 1 }}
      extra={
        <Tooltip title="Clear all filters">
          <Button 
            size="small" 
            icon={<ClearOutlined />} 
            onClick={clearAllFilters} 
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
          activeKey={expandedPanels} 
          onChange={(keys) => setExpandedPanels(Array.isArray(keys) ? keys : [keys].filter(Boolean))} 
          size="small" 
          expandIconPosition="end"
          items={collapseItems}
        />
        
        <Divider style={{ margin: '12px 0' }} />
        
        <Button
          type="primary"
          icon={<FilterOutlined />}
          onClick={() => void applyFilters()}
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