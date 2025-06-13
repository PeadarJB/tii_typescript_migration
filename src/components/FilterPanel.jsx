import React, { useState, useEffect } from 'react';
import {
  ProCard,
  ProForm,
  ProFormSelect,
  ProFormCascader,
  ProFormSlider,
  ProFormCheckbox,
} from '@ant-design/pro-components';
import { Button, Space, Tag, Badge, Tooltip, message } from 'antd';
import { FilterOutlined, ClearOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { CONFIG } from '../../config/appConfig';
import { theme, getRiskColor } from '../../config/themeConfig';

/**
 * FilterPanel - Advanced filtering interface using Ant Design Pro components
 */
const FilterPanel = ({ appManager }) => {
  const [form] = ProForm.useForm();
  const [loading, setLoading] = useState(false);
  const [filterCount, setFilterCount] = useState(0);
  const [countyOptions, setCountyOptions] = useState([]);

  // Initialize filters when component mounts
  useEffect(() => {
    if (appManager?.components?.filterManager) {
      initializeFilterOptions();
    }
  }, [appManager]);

  // Load dynamic filter options (like counties)
  const initializeFilterOptions = async () => {
    try {
      setLoading(true);
      const filterManager = appManager.components.filterManager;
      
      // Get unique county values
      const counties = await filterManager.getUniqueValues('COUNTY');
      setCountyOptions(counties.map(county => ({
        label: county.label,
        value: county.value,
      })));
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to initialize filter options:', error);
      message.error('Failed to load filter options');
      setLoading(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = async (changedValues, allValues) => {
    try {
      const filterManager = appManager.components.filterManager;
      if (!filterManager) return;

      // Build filter expressions
      const filters = {};
      
      // Flood scenario filters
      if (allValues.floodScenarios?.length > 0) {
        filters['flood-scenario'] = allValues.floodScenarios.map(scenario => {
          const config = CONFIG.filterConfig.find(c => c.id === 'flood-scenario');
          const item = config.items.find(i => i.field === scenario);
          return { field: item.field, value: item.value, label: item.label };
        });
      }

      // County filters
      if (allValues.counties?.length > 0) {
        filters.county = allValues.counties.map(county => ({
          field: 'COUNTY',
          value: county,
          dataType: 'string',
        }));
      }

      // Criticality filter
      if (allValues.criticality) {
        const [min, max] = allValues.criticality;
        filters.criticality = [];
        for (let i = min; i <= max; i++) {
          filters.criticality.push({
            field: 'Criticality_Rating_Num1',
            value: i.toString(),
            dataType: 'number',
          });
        }
      }

      // Road subnet filter
      if (allValues.roadSubnet?.length > 0) {
        filters.subnet = allValues.roadSubnet.map(subnet => ({
          field: 'Subnet',
          value: subnet,
          dataType: 'number',
        }));
      }

      // Lifeline filter
      if (allValues.lifeline !== undefined && allValues.lifeline !== null) {
        filters.lifeline = [{
          field: 'Lifeline',
          value: allValues.lifeline ? '1' : '0',
          dataType: 'number',
        }];
      }

      // Apply filters through the original filter manager
      // This is a simplified approach - you may need to adapt based on your FilterManager implementation
      Object.keys(filters).forEach(filterId => {
        filterManager.currentFilters[filterId] = filters[filterId];
      });
      
      await filterManager.applyFilters();
      
      // Update filter count
      const activeFilterCount = Object.values(filters).filter(f => f.length > 0).length;
      setFilterCount(activeFilterCount);
      
      message.success('Filters applied successfully');
    } catch (error) {
      console.error('Failed to apply filters:', error);
      message.error('Failed to apply filters');
    }
  };

  // Clear all filters
  const handleClearFilters = () => {
    form.resetFields();
    appManager.components.filterManager?.resetAllFilters();
    setFilterCount(0);
    message.info('All filters cleared');
  };

  // Get flood scenario options from config
  const floodScenarioOptions = CONFIG.filterConfig
    .find(config => config.id === 'flood-scenario')
    ?.items.map(item => ({
      label: (
        <Space>
          <Tag color={item.field.includes('_h') ? 'error' : 'warning'}>
            {item.field.includes('_h') ? 'RCP 8.5' : 'RCP 4.5'}
          </Tag>
          {item.label}
        </Space>
      ),
      value: item.field,
    })) || [];

  // Get road subnet options
  const roadSubnetOptions = CONFIG.filterConfig
    .find(config => config.id === 'subnet')
    ?.options.map(opt => ({
      label: opt.label,
      value: opt.value,
    })) || [];

  return (
    <ProCard
      title={
        <Space>
          <FilterOutlined />
          <span>Filters</span>
          {filterCount > 0 && (
            <Badge count={filterCount} style={{ marginLeft: 8 }} />
          )}
        </Space>
      }
      extra={
        <Space size="small">
          <Tooltip title="Clear all filters">
            <Button
              type="text"
              size="small"
              icon={<ClearOutlined />}
              onClick={handleClearFilters}
              danger
            />
          </Tooltip>
        </Space>
      }
      size="small"
      bordered
      style={{
        boxShadow: theme.token.boxShadowSecondary,
      }}
      bodyStyle={{ padding: '12px' }}
      loading={loading}
    >
      <ProForm
        form={form}
        layout="vertical"
        submitter={false}
        onValuesChange={handleFilterChange}
        size="small"
      >
        <ProFormSelect
          name="floodScenarios"
          label={
            <Space>
              <span>Flood Scenarios</span>
              <Tooltip title="Select future or historic flood scenarios to analyze">
                <InfoCircleOutlined style={{ color: theme.token.colorTextSecondary }} />
              </Tooltip>
            </Space>
          }
          mode="multiple"
          options={floodScenarioOptions}
          placeholder="Select flood scenarios..."
          showSearch
          fieldProps={{
            maxTagCount: 2,
            maxTagPlaceholder: (omittedValues) => `+${omittedValues.length} more`,
          }}
        />

        <ProFormSelect
          name="counties"
          label="Counties"
          mode="multiple"
          options={countyOptions}
          placeholder="Select counties..."
          showSearch
          fieldProps={{
            maxTagCount: 2,
            maxTagPlaceholder: (omittedValues) => `+${omittedValues.length} more`,
          }}
        />

        <ProFormSlider
          name="criticality"
          label={
            <Space>
              <span>Criticality Rating</span>
              <Tooltip title="Infrastructure criticality from 1 (Very Low) to 5 (Very High)">
                <InfoCircleOutlined style={{ color: theme.token.colorTextSecondary }} />
              </Tooltip>
            </Space>
          }
          marks={{
            1: 'Very Low',
            2: 'Low',
            3: 'Medium',
            4: 'High',
            5: 'Very High',
          }}
          min={1}
          max={5}
          step={1}
          range
          fieldProps={{
            tipFormatter: (value) => {
              const labels = ['', 'Very Low', 'Low', 'Medium', 'High', 'Very High'];
              return labels[value] || value;
            },
          }}
        />

        <ProFormSelect
          name="roadSubnet"
          label="Road Subnet"
          mode="multiple"
          options={roadSubnetOptions}
          placeholder="Select road types..."
          fieldProps={{
            maxTagCount: 2,
            maxTagPlaceholder: (omittedValues) => `+${omittedValues.length} more`,
          }}
        />

        <ProFormCheckbox
          name="lifeline"
          label={
            <Space>
              <span>Lifeline Routes Only</span>
              <Tooltip title="Show only critical routes for emergency services">
                <InfoCircleOutlined style={{ color: theme.token.colorTextSecondary }} />
              </Tooltip>
            </Space>
          }
        />
      </ProForm>
    </ProCard>
  );
};

export default FilterPanel;