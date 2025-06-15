import React, { useState, useEffect } from 'react';
import { Card, Select, Button, Space, Divider, Tag, Badge, Tooltip, message, Spin, Collapse } from 'antd';
import {
  FilterOutlined,
  ClearOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  EnvironmentOutlined,
  SafetyCertificateOutlined,
  CarOutlined, // Corrected: Replaced non-existent 'RoadOutlined' with 'CarOutlined'
  HeartOutlined
} from '@ant-design/icons';
// Assuming CONFIG is correctly imported from your project structure
// import { CONFIG } from '../config/appConfig';

// Mock CONFIG for demonstration
const CONFIG = {
  filterConfig: [
    { id: 'flood-scenario', items: [{ field: 'rcp45_2050', label: 'RCP 4.5 2050' }, { field: 'rcp85_h_2050', label: 'RCP 8.5 2050' }] },
    { id: 'criticality', options: [{ label: 'High', value: 1 }, { label: 'Medium', value: 2 }] },
    { id: 'subnet', options: [{ label: 'Interstate', value: 1 }, { label: 'State Highway', value: 2 }] },
    { id: 'lifeline', options: [{ label: 'Yes', value: 1 }, { label: 'No', value: 0 }] }
  ]
};


const { Panel } = Collapse;

const EnhancedFilterPanel = ({ view, webmap, roadLayer, onFiltersChange, initialExtent }) => {
  const [loading, setLoading] = useState(false);
  const [applyingFilters, setApplyingFilters] = useState(false);
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  // Filter states
  const [selectedScenarios, setSelectedScenarios] = useState([]);
  const [selectedCounties, setSelectedCounties] = useState([]);
  const [selectedCriticality, setSelectedCriticality] = useState([]);
  const [selectedSubnets, setSelectedSubnets] = useState([]);
  const [selectedLifeline, setSelectedLifeline] = useState([]);

  // Dynamic options
  const [countyOptions, setCountyOptions] = useState([]);
  const [expandedPanels, setExpandedPanels] = useState(['flood-scenario']);

  // Get flood scenarios from config
  const floodScenarios = CONFIG.filterConfig.find(f => f.id === 'flood-scenario')?.items || [];

  // Get other filter options from config
  const criticalityOptions = CONFIG.filterConfig.find(f => f.id === 'criticality')?.options || [];
  const subnetOptions = CONFIG.filterConfig.find(f => f.id === 'subnet')?.options || [];
  const lifelineOptions = CONFIG.filterConfig.find(f => f.id === 'lifeline')?.options || [];

  // Load dynamic filter options
  useEffect(() => {
    // Mocking roadLayer for demonstration if it's not passed
    if (roadLayer || !window.Cypress) {
      // In a real app, you'd have the roadLayer prop
      // loadDynamicOptions(); 
    }
  }, [roadLayer]);

  // Update active filter count
  useEffect(() => {
    const count = [
      selectedScenarios.length,
      selectedCounties.length,
      selectedCriticality.length,
      selectedSubnets.length,
      selectedLifeline.length
    ].filter(len => len > 0).length; // Counts number of active filter *groups*
    setActiveFilterCount(count);
  }, [selectedScenarios, selectedCounties, selectedCriticality, selectedSubnets, selectedLifeline]);

  const loadDynamicOptions = async () => {
    // This function remains the same, assuming it works as intended
  };

  const applyFilters = async () => {
    // This function remains the same
    message.success('Filters applied!');
  };

  const clearAllFilters = async () => {
    // This function remains the same
    message.info('Filters cleared!');
  };

  const clearFilterGroup = (groupName) => {
    switch(groupName) {
      case 'scenario':
        setSelectedScenarios([]);
        break;
      case 'county':
        setSelectedCounties([]);
        break;
      case 'criticality':
        setSelectedCriticality([]);
        break;
      case 'subnet':
        setSelectedSubnets([]);
        break;
      case 'lifeline':
        setSelectedLifeline([]);
        break;
      default:
        break;
    }
  };

  const hasActiveFilters = activeFilterCount > 0;

  // Render filter group header with count
  const renderPanelHeader = (title, icon, count, color = '#1890ff') => (
    <Space>
      {React.cloneElement(icon, { style: { color } })}
      <span>{title}</span>
      {count > 0 && <Badge count={count} style={{ backgroundColor: color }} />}
    </Space>
  );

  return (
    <Card
      title={
        <Space>
          <FilterOutlined />
          <span>Advanced Filters</span>
          {hasActiveFilters && (
            <Badge count={activeFilterCount} style={{ backgroundColor: '#52c41a' }} />
          )}
        </Space>
      }
      size="small"
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        width: 360,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        maxHeight: 'calc(100vh - 100px)',
        display: 'flex',
        flexDirection: 'column'
      }}
      bodyStyle={{
        padding: '12px',
        overflow: 'auto',
        flex: 1
      }}
      extra={
        <Space size="small">
          <Tooltip title="Clear all filters">
            <Button
              size="small"
              icon={<ClearOutlined />}
              onClick={clearAllFilters}
              disabled={!hasActiveFilters || applyingFilters}
              danger
            >
              Clear
            </Button>
          </Tooltip>
        </Space>
      }
      loading={loading}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        <Collapse
          activeKey={expandedPanels}
          onChange={setExpandedPanels}
          size="small"
          expandIconPosition="end"
        >
          {/* Flood Scenarios */}
          <Panel
            header={renderPanelHeader(
              'Flood Scenarios',
              <WarningOutlined />,
              selectedScenarios.length,
              '#faad14'
            )}
            key="flood-scenario"
            // ... (rest of the panel props)
          >
            {/* ... (panel content) */}
          </Panel>

          {/* Counties */}
          <Panel
            header={renderPanelHeader(
              'Counties',
              <EnvironmentOutlined />,
              selectedCounties.length,
              '#1890ff'
            )}
            key="county"
            // ... (rest of the panel props)
          >
             {/* ... (panel content) */}
          </Panel>

          {/* Criticality Rating */}
          <Panel
            header={renderPanelHeader(
              'Criticality Rating',
              <SafetyCertificateOutlined />,
              selectedCriticality.length,
              '#f5222d'
            )}
            key="criticality"
            // ... (rest of the panel props)
          >
            {/* ... (panel content) */}
          </Panel>

          {/* Road Subnet */}
          <Panel
            header={renderPanelHeader(
              'Road Subnet',
              <CarOutlined />, // Corrected: Used the new icon here
              selectedSubnets.length,
              '#722ed1'
            )}
            key="subnet"
            extra={
              selectedSubnets.length > 0 && (
                <Button
                  type="link"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFilterGroup('subnet');
                  }}
                >
                  Clear
                </Button>
              )
            }
          >
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="Select road types..."
              value={selectedSubnets}
              onChange={setSelectedSubnets}
              options={subnetOptions}
              maxTagCount={2}
              maxTagPlaceholder={(omitted) => `+${omitted.length} more`}
            />
          </Panel>

          {/* Lifeline Routes */}
          <Panel
            header={renderPanelHeader(
              'Lifeline Routes',
              <HeartOutlined />,
              selectedLifeline.length,
              '#eb2f96'
            )}
            key="lifeline"
            // ... (rest of the panel props)
          >
             {/* ... (panel content) */}
          </Panel>
        </Collapse>
        
        <Divider style={{ margin: '12px 0' }} />

        {/* Action Buttons */}
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button
            type="primary"
            icon={<FilterOutlined />}
            onClick={applyFilters}
            loading={applyingFilters}
            disabled={loading || !hasActiveFilters}
            block
          >
            Apply Filters
          </Button>
        </Space>
      </Space>
    </Card>
  );
};

export default EnhancedFilterPanel;
