import React, { useState, useEffect } from 'react';
import { Card, Select, Button, Space, Divider, Tag, Badge, Tooltip, message, Spin, Collapse } from 'antd';
import { 
  FilterOutlined, 
  ClearOutlined, 
  WarningOutlined, 
  InfoCircleOutlined,
  EnvironmentOutlined,
  SafetyCertificateOutlined,
  RoadOutlined,
  HeartOutlined
} from '@ant-design/icons';
import { CONFIG } from '../config/appConfig';

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
    if (roadLayer) {
      loadDynamicOptions();
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
    ].reduce((sum, val) => sum + (val > 0 ? 1 : 0), 0);
    setActiveFilterCount(count);
  }, [selectedScenarios, selectedCounties, selectedCriticality, selectedSubnets, selectedLifeline]);

  const loadDynamicOptions = async () => {
    try {
      setLoading(true);
      const Query = (await import('@arcgis/core/rest/support/Query.js')).default;
      
      // Load unique counties
      const query = new Query({
        where: '1=1',
        outFields: ['COUNTY'],
        returnDistinctValues: true,
        orderByFields: ['COUNTY']
      });

      const results = await roadLayer.queryFeatures(query);
      
      const counties = results.features
        .map(f => f.attributes.COUNTY)
        .filter(c => c && c.trim() !== '')
        .map(c => ({ label: c, value: c }));
      
      setCountyOptions(counties);
      console.log('Loaded counties:', counties.length);
    } catch (error) {
      console.error('Failed to load dynamic options:', error);
      message.error('Failed to load filter options');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = async () => {
    try {
      setApplyingFilters(true);
      const whereClauses = [];

      // Build flood scenario clause (OR logic within scenarios)
      if (selectedScenarios.length > 0) {
        const scenarioClauses = selectedScenarios.map(field => `${field} = 1`);
        whereClauses.push(`(${scenarioClauses.join(' OR ')})`);
      }

      // Build county clause
      if (selectedCounties.length > 0) {
        const countyList = selectedCounties.map(c => `'${c}'`).join(',');
        whereClauses.push(`COUNTY IN (${countyList})`);
      }

      // Build criticality clause
      if (selectedCriticality.length > 0) {
        const criticalityList = selectedCriticality.join(',');
        whereClauses.push(`Criticality_Rating_Num1 IN (${criticalityList})`);
      }

      // Build subnet clause
      if (selectedSubnets.length > 0) {
        const subnetList = selectedSubnets.join(',');
        whereClauses.push(`Subnet IN (${subnetList})`);
      }

      // Build lifeline clause
      if (selectedLifeline.length > 0) {
        const lifelineList = selectedLifeline.join(',');
        whereClauses.push(`Lifeline IN (${lifelineList})`);
      }

      // Apply combined filter
      const finalWhereClause = whereClauses.length > 0 
        ? whereClauses.join(' AND ') 
        : '1=1';
      
      roadLayer.definitionExpression = finalWhereClause;
      
      if (whereClauses.length > 0) {
        // Show layer when filters are applied
        roadLayer.visible = true;
        
        message.success(`${activeFilterCount} filter${activeFilterCount !== 1 ? 's' : ''} applied successfully`);
        
        // Zoom to filtered extent
        const Query = (await import('@arcgis/core/rest/support/Query.js')).default;
        const query = new Query({ where: finalWhereClause });
        
        const extent = await roadLayer.queryExtent(query);
        if (extent && extent.extent) {
          await view.goTo(extent.extent.expand(1.2));
        }
      } else {
        // Hide layer when no filters
        roadLayer.visible = false;
        message.info('No filters applied - road layer hidden');
        
        // Return to initial extent
        if (initialExtent) {
          await view.goTo(initialExtent);
        }
      }
      
      // Notify parent component about filter changes
      if (onFiltersChange) {
        const filterSummary = {};
        if (selectedScenarios.length > 0) {
          filterSummary['Flood Scenarios'] = selectedScenarios.map(field => {
            const scenario = floodScenarios.find(s => s.field === field);
            return scenario ? scenario.label : field;
          });
        }
        if (selectedCounties.length > 0) {
          filterSummary['Counties'] = selectedCounties;
        }
        if (selectedCriticality.length > 0) {
          filterSummary['Criticality'] = selectedCriticality.map(val => 
            criticalityOptions.find(opt => opt.value === val)?.label || val
          );
        }
        if (selectedSubnets.length > 0) {
          filterSummary['Road Subnet'] = selectedSubnets.map(val => 
            subnetOptions.find(opt => opt.value === val)?.label || val
          );
        }
        if (selectedLifeline.length > 0) {
          filterSummary['Lifeline'] = selectedLifeline.map(val => 
            lifelineOptions.find(opt => opt.value === val)?.label || val
          );
        }
        onFiltersChange(filterSummary);
      }
      
    } catch (error) {
      console.error('Failed to apply filters:', error);
      message.error('Failed to apply filters');
    } finally {
      setApplyingFilters(false);
    }
  };

  const clearAllFilters = async () => {
    setSelectedScenarios([]);
    setSelectedCounties([]);
    setSelectedCriticality([]);
    setSelectedSubnets([]);
    setSelectedLifeline([]);
    
    roadLayer.definitionExpression = '1=1';
    roadLayer.visible = false;
    message.info('All filters cleared - road layer hidden');
    
    // Return to initial extent
    if (initialExtent && view) {
      await view.goTo(initialExtent);
    }
    
    // Notify parent component
    if (onFiltersChange) {
      onFiltersChange({});
    }
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
            extra={
              selectedScenarios.length > 0 && (
                <Button
                  type="link"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFilterGroup('scenario');
                  }}
                >
                  Clear
                </Button>
              )
            }
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ marginBottom: 8 }}>
                <Space size={4}>
                  <InfoCircleOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />
                  <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                    Select one or more flood scenarios to analyze
                  </span>
                </Space>
              </div>
              <Select
                mode="multiple"
                style={{ width: '100%' }}
                placeholder="Select flood scenarios..."
                value={selectedScenarios}
                onChange={setSelectedScenarios}
                options={floodScenarios.map(scenario => ({
                  label: (
                    <Space size={4}>
                      <Tag 
                        color={scenario.field.includes('_h') ? 'red' : 'blue'} 
                        style={{ margin: 0, fontSize: 11 }}
                      >
                        {scenario.field.includes('_h') ? 'RCP 8.5' : 'RCP 4.5'}
                      </Tag>
                      <span style={{ fontSize: 12 }}>{scenario.label}</span>
                    </Space>
                  ),
                  value: scenario.field
                }))}
                maxTagCount={2}
                maxTagPlaceholder={(omitted) => `+${omitted.length} more`}
              />
            </Space>
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
            extra={
              selectedCounties.length > 0 && (
                <Button
                  type="link"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFilterGroup('county');
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
              placeholder="Select counties..."
              value={selectedCounties}
              onChange={setSelectedCounties}
              options={countyOptions}
              showSearch
              filterOption={(input, option) =>
                option.label.toLowerCase().includes(input.toLowerCase())
              }
              maxTagCount={3}
              maxTagPlaceholder={(omitted) => `+${omitted.length} more`}
            />
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
            extra={
              selectedCriticality.length > 0 && (
                <Button
                  type="link"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFilterGroup('criticality');
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
              placeholder="Select criticality levels..."
              value={selectedCriticality}
              onChange={setSelectedCriticality}
              options={criticalityOptions}
              maxTagCount={2}
              maxTagPlaceholder={(omitted) => `+${omitted.length} more`}
            />
          </Panel>

          {/* Road Subnet */}
          <Panel
            header={renderPanelHeader(
              'Road Subnet', 
              <RoadOutlined />, 
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
            extra={
              selectedLifeline.length > 0 && (
                <Button
                  type="link"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFilterGroup('lifeline');
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
              placeholder="Select lifeline status..."
              value={selectedLifeline}
              onChange={setSelectedLifeline}
              options={lifelineOptions}
            />
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
        
        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <>
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ fontSize: 12, color: '#666' }}>
              <strong>Active Filters Summary:</strong>
              <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                {selectedScenarios.length > 0 && (
                  <li>{selectedScenarios.length} flood scenario(s)</li>
                )}
                {selectedCounties.length > 0 && (
                  <li>{selectedCounties.length} county/counties</li>
                )}
                {selectedCriticality.length > 0 && (
                  <li>{selectedCriticality.length} criticality level(s)</li>
                )}
                {selectedSubnets.length > 0 && (
                  <li>{selectedSubnets.length} road type(s)</li>
                )}
                {selectedLifeline.length > 0 && (
                  <li>{selectedLifeline.length} lifeline status(es)</li>
                )}
              </ul>
            </div>
          </>
        )}
      </Space>
    </Card>
  );
};

export default EnhancedFilterPanel;