import React, { useState, useEffect } from 'react';
import { Card, Select, Button, Space, Divider, message } from 'antd';
import { FilterOutlined, ClearOutlined } from '@ant-design/icons';

const SimpleFilterPanel = ({ view, webmap, roadLayer }) => {
  const [counties, setCounties] = useState([]);
  const [selectedCounties, setSelectedCounties] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load unique county values when component mounts
  useEffect(() => {
    if (roadLayer) {
      loadCounties();
    }
  }, [roadLayer]);

  const loadCounties = async () => {
    try {
      setLoading(true);
      // Import Query dynamically to avoid issues
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
      if (selectedCounties.length === 0) {
        // No filter selected, show all
        roadLayer.definitionExpression = '1=1';
        message.info('Showing all roads');
      } else {
        // Build SQL WHERE clause
        const countyList = selectedCounties.map(c => `'${c}'`).join(',');
        const whereClause = `COUNTY IN (${countyList})`;
        roadLayer.definitionExpression = whereClause;
        
        message.success(`Filter applied: ${selectedCounties.length} counties selected`);
        
        // Zoom to filtered extent
        const Query = (await import('@arcgis/core/rest/support/Query.js')).default;
        const query = new Query({
          where: whereClause
        });
        
        const extent = await roadLayer.queryExtent(query);
        if (extent && extent.extent) {
          await view.goTo(extent.extent.expand(1.2));
        }
      }
    } catch (error) {
      console.error('Failed to apply filters:', error);
      message.error('Failed to apply filters');
    }
  };

  const clearFilters = () => {
    setSelectedCounties([]);
    roadLayer.definitionExpression = '1=1';
    message.info('Filters cleared');
  };

  return (
    <Card
      title={
        <Space>
          <FilterOutlined />
          <span>Filters</span>
        </Space>
      }
      size="small"
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        width: 300,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            Select Counties:
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
        
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button
            type="primary"
            icon={<FilterOutlined />}
            onClick={applyFilters}
            disabled={loading}
          >
            Apply Filter
          </Button>
          <Button
            icon={<ClearOutlined />}
            onClick={clearFilters}
            disabled={loading}
          >
            Clear
          </Button>
        </Space>
      </Space>
    </Card>
  );
};

export default SimpleFilterPanel;