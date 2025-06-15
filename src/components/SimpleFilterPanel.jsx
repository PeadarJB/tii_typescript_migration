import React, { useState, useEffect } from 'react';
import { Card, Select, Button, Space, Divider, Checkbox, Tag, message, Spin } from 'antd';
import { FilterOutlined, ClearOutlined, WarningOutlined } from '@ant-design/icons';
import { CONFIG } from '../config/appConfig';

const SimpleFilterPanel = ({ view, webmap, roadLayer, onFiltersChange, initialExtent }) => {
  const [counties, setCounties] = useState([]);
  const [selectedCounties, setSelectedCounties] = useState([]);
  const [selectedScenarios, setSelectedScenarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [applyingFilters, setApplyingFilters] = useState(false);

  // Get flood scenarios from config
  const floodScenarios = CONFIG.filterConfig.find(f => f.id === 'flood-scenario')?.items || [];

  // Load unique county values when component mounts
  useEffect(() => {
    if (roadLayer) {
      loadCounties();
    }
  }, [roadLayer]);

  const loadCounties = async () => {
    try {
      setLoading(true);
      const Query = (await import('@arcgis/core/rest/support/Query.js')).default;
      
      const query = new Query({
        where: '1=1',
        outFields: ['COUNTY'],
        returnDistinctValues: true,
        orderByFields: ['COUNTY']
      });

      const results = await roadLayer.queryFeatures(query);
      
      const countyList = results.features
        .map(f => f.attributes.COUNTY)
        .filter(c => c && c.trim() !== '')
        .map(c => ({ label: c, value: c }));
      
      setCounties(countyList);
      console.log('Loaded counties:', countyList.length);
    } catch (error) {
      console.error('Failed to load counties:', error);
      message.error('Failed to load county list');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = async () => {
    try {
      setApplyingFilters(true);
      const whereClauses = [];

      // Build flood scenario clause
      if (selectedScenarios.length > 0) {
        const scenarioClauses = selectedScenarios.map(field => `${field} = 1`);
        whereClauses.push(`(${scenarioClauses.join(' OR ')})`);
      }

      // Build county clause
      if (selectedCounties.length > 0) {
        const countyList = selectedCounties.map(c => `'${c}'`).join(',');
        whereClauses.push(`COUNTY IN (${countyList})`);
      }

      // Apply combined filter
      const finalWhereClause = whereClauses.length > 0 
        ? whereClauses.join(' AND ') 
        : '1=1';
      
      roadLayer.definitionExpression = finalWhereClause;
      
      if (whereClauses.length > 0) {
        // Show layer when filters are applied
        roadLayer.visible = true;
        
        message.success(`Filters applied successfully`);
        
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
        onFiltersChange(filterSummary);
      }
      
    } catch (error) {
      console.error('Failed to apply filters:', error);
      message.error('Failed to apply filters');
    } finally {
      setApplyingFilters(false);
    }
  };

  const clearFilters = async () => {
    setSelectedCounties([]);
    setSelectedScenarios([]);
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

  const hasActiveFilters = selectedCounties.length > 0 || selectedScenarios.length > 0;

  return (
    <Card
      title={
        <Space>
          <FilterOutlined />
          <span>Filters</span>
          {hasActiveFilters && (
            <Tag color="blue">{selectedCounties.length + selectedScenarios.length} active</Tag>
          )}
        </Space>
      }
      size="small"
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        width: 320,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        maxHeight: 'calc(100vh - 100px)',
        overflow: 'auto'
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* Flood Scenarios Section */}
        <div>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: 8,
            marginBottom: 8, 
            fontWeight: 500 
          }}>
            <WarningOutlined style={{ color: '#faad14' }} />
            Flood Scenarios:
          </label>
          <Space direction="vertical" style={{ width: '100%' }}>
            {floodScenarios.map(scenario => (
              <Checkbox
                key={scenario.field}
                checked={selectedScenarios.includes(scenario.field)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedScenarios([...selectedScenarios, scenario.field]);
                  } else {
                    setSelectedScenarios(selectedScenarios.filter(f => f !== scenario.field));
                  }
                }}
              >
                <Space size={4}>
                  <Tag color={scenario.field.includes('_h') ? 'red' : 'blue'} style={{ margin: 0 }}>
                    {scenario.field.includes('_h') ? 'RCP 8.5' : 'RCP 4.5'}
                  </Tag>
                  <span style={{ fontSize: 13 }}>{scenario.label}</span>
                </Space>
              </Checkbox>
            ))}
          </Space>
        </div>
        
        <Divider style={{ margin: '12px 0' }} />
        
        {/* Counties Section */}
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            Filter by County:
          </label>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="Select counties..."
            loading={loading}
            value={selectedCounties}
            onChange={setSelectedCounties}
            options={counties}
            maxTagCount={2}
          />
        </div>
        
        <Divider style={{ margin: '12px 0' }} />
        
        {/* Action Buttons */}
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button
            type="primary"
            icon={<FilterOutlined />}
            onClick={applyFilters}
            loading={applyingFilters}
            disabled={loading}
          >
            Apply Filters
          </Button>
          <Button
            icon={<ClearOutlined />}
            onClick={clearFilters}
            disabled={loading || applyingFilters}
          >
            Clear All
          </Button>
        </Space>
        
        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <>
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ fontSize: 12, color: '#666' }}>
              <strong>Active Filters:</strong>
              <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                {selectedScenarios.length > 0 && (
                  <li>{selectedScenarios.length} flood scenario(s)</li>
                )}
                {selectedCounties.length > 0 && (
                  <li>{selectedCounties.length} county/counties</li>
                )}
              </ul>
            </div>
          </>
        )}
      </Space>
    </Card>
  );
};

export default SimpleFilterPanel;