import React, { useState, useEffect } from 'react';
import { Card, Select, Button, Space, Divider, Tag, Badge, Tooltip, message, Spin, Collapse } from 'antd';
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

// The configuration is now the single source of truth for the component.
const CONFIG = {
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
    },
    {
      id: 'county',
      label: 'County',
      type: 'multi-select',
      field: 'COUNTY',
      dataType: 'string',
      description: 'Filter by administrative county boundaries.',
      options: [] // Populated dynamically
    },
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
    },
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
    },
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
    }
  ]
};

// Helper to get initial state for filter values
const getInitialFilterState = () => {
  const initialState = {};
  CONFIG.filterConfig.forEach(filter => {
    initialState[filter.id] = [];
  });
  return initialState;
};


const { Panel } = Collapse;

const EnhancedFilterPanel = ({ view, webmap, roadLayer, onFiltersChange, initialExtent }) => {
  const [loading, setLoading] = useState(false);
  const [applyingFilters, setApplyingFilters] = useState(false);
  const [dynamicOptions, setDynamicOptions] = useState({ county: [] });
  
  // A single state object to hold all filter values, keyed by filter ID.
  const [filterValues, setFilterValues] = useState(getInitialFilterState());
  const [expandedPanels, setExpandedPanels] = useState(['flood-scenario']);
  
  // Load dynamic filter options
  useEffect(() => {
    if (roadLayer) {
      loadDynamicOptions();
    }
  }, [roadLayer]);
  
  const loadDynamicOptions = async () => {
    try {
      setLoading(true);
      const Query = (await import('@arcgis/core/rest/support/Query.js')).default;
      
      const countyConfig = CONFIG.filterConfig.find(f => f.id === 'county');
      const query = new Query({
        where: '1=1',
        outFields: [countyConfig.field],
        returnDistinctValues: true,
        orderByFields: [countyConfig.field]
      });

      const results = await roadLayer.queryFeatures(query);
      const counties = results.features
        .map(f => f.attributes[countyConfig.field])
        .filter(c => c && c.trim() !== '')
        .map(c => ({ label: c, value: c }));
      
      setDynamicOptions(prev => ({ ...prev, county: counties }));
      console.log('Loaded counties:', counties.length);
    } catch (error) {
      console.error('Failed to load dynamic options:', error);
      message.error('Failed to load filter options');
    } finally {
      setLoading(false);
    }
  };
  
  const handleFilterChange = (id, value) => {
    setFilterValues(prev => ({
      ...prev,
      [id]: value,
    }));
  };
  
  const applyFilters = async () => {
    try {
      setApplyingFilters(true);
      const whereClauses = [];

      // Loop through the config to build the WHERE clause dynamically
      CONFIG.filterConfig.forEach(config => {
        const selectedValues = filterValues[config.id];
        if (!selectedValues || selectedValues.length === 0) return;

        if (config.type === 'scenario-select') {
          // Special OR logic for scenarios
          const scenarioClauses = selectedValues.map(field => `${field} = 1`);
          whereClauses.push(`(${scenarioClauses.join(' OR ')})`);
        } else {
          // Standard IN logic for other filters
          const formattedValues = selectedValues.map(val => 
            config.dataType === 'string' ? `'${val}'` : val
          ).join(',');
          whereClauses.push(`${config.field} IN (${formattedValues})`);
        }
      });
      
      const finalWhereClause = whereClauses.length > 0 ? whereClauses.join(' AND ') : '1=1';
      roadLayer.definitionExpression = finalWhereClause;
      
      // The rest of the logic for zooming and notifying parent remains the same
      message.success('Filters applied successfully');

    } catch (error) {
      console.error('Failed to apply filters:', error);
      message.error('Failed to apply filters');
    } finally {
      setApplyingFilters(false);
    }
  };
  
  const clearAllFilters = () => {
    setFilterValues(getInitialFilterState());
    if(roadLayer) roadLayer.definitionExpression = '1=1';
    message.info('All filters cleared. Click "Apply Filters" to update the map.');
  };
  
  const clearFilterGroup = (id) => {
    handleFilterChange(id, []);
  };

  const activeFilterCount = Object.values(filterValues).filter(v => v.length > 0).length;
  const hasActiveFilters = activeFilterCount > 0;
  
  const icons = {
      'flood-scenario': <WarningOutlined />,
      'county': <EnvironmentOutlined />,
      'criticality': <SafetyCertificateOutlined />,
      'subnet': <CarOutlined />,
      'lifeline': <HeartOutlined />
  };
  
  return (
    <Card
      title={<Space><FilterOutlined /><span>Advanced Filters</span>{hasActiveFilters && <Badge count={activeFilterCount} style={{ backgroundColor: '#52c41a' }} />}</Space>}
      size="small"
      style={{ position: 'absolute', top: 16, right: 16, width: 360, maxHeight: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}
      bodyStyle={{ padding: '12px', overflow: 'auto', flex: 1 }}
      extra={<Tooltip title="Clear all filters"><Button size="small" icon={<ClearOutlined />} onClick={clearAllFilters} disabled={!hasActiveFilters} danger>Clear All</Button></Tooltip>}
      loading={loading}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        <Collapse activeKey={expandedPanels} onChange={setExpandedPanels} size="small" expandIconPosition="end">
          {CONFIG.filterConfig.map(filter => {
             const selected = filterValues[filter.id] || [];
             const options = filter.id === 'county' ? dynamicOptions.county : (filter.options || filter.items);
             const valueProp = filter.type === 'scenario-select' ? 'field' : 'value';

             return (
              <Panel
                key={filter.id}
                header={<Space>{icons[filter.id]}<span>{filter.label}</span>{selected.length > 0 && <Badge count={selected.length} />}</Space>}
                extra={selected.length > 0 && <Button type="link" size="small" onClick={(e) => { e.stopPropagation(); clearFilterGroup(filter.id); }}>Clear</Button>}
              >
                <Space direction="vertical" style={{width: '100%'}}>
                   <Tooltip title={filter.description}>
                      <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                   </Tooltip>
                   <Select
                      mode="multiple"
                      style={{ width: '100%' }}
                      placeholder={`Select ${filter.label.toLowerCase()}...`}
                      value={selected}
                      onChange={(value) => handleFilterChange(filter.id, value)}
                      options={options.map(opt => ({
                        label: opt.label,
                        value: opt[valueProp]
                      }))}
                      showSearch={filter.id === 'county'}
                      maxTagCount={3}
                      maxTagPlaceholder={omitted => `+${omitted.length} more`}
                    />
                </Space>
              </Panel>
             )
          })}
        </Collapse>
        
        <Divider style={{ margin: '12px 0' }} />
        
        <Button
          type="primary"
          icon={<FilterOutlined />}
          onClick={applyFilters}
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
