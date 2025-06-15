// Styled popup template for road network features
export const createPopupTemplate = () => {
  return {
    title: "{Route}",
    content: [{
      type: "custom",
      creator: (graphic) => {
        const attributes = graphic.attributes;
        
        // Create styled HTML content
        const container = document.createElement('div');
        container.style.cssText = 'font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 8px;';
        
        // Helper function to create a row
        const createRow = (label, value, isHighlighted = false) => {
          const row = document.createElement('div');
          row.style.cssText = `
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            border-bottom: 1px solid #f0f0f0;
            ${isHighlighted ? 'background: #e6f7ff; margin: 0 -8px; padding-left: 8px; padding-right: 8px;' : ''}
          `;
          
          const labelEl = document.createElement('span');
          labelEl.style.cssText = 'color: #666; font-size: 12px;';
          labelEl.textContent = label;
          
          const valueEl = document.createElement('span');
          valueEl.style.cssText = `
            font-weight: 500;
            font-size: 12px;
            ${isHighlighted ? 'color: #1890ff;' : 'color: #333;'}
          `;
          valueEl.textContent = value || 'N/A';
          
          row.appendChild(labelEl);
          row.appendChild(valueEl);
          return row;
        };
        
        // Create badge for criticality
        const createBadge = (value) => {
          const colors = {
            5: '#f5222d', // Very High - red
            4: '#fa8c16', // High - orange
            3: '#faad14', // Medium - yellow
            2: '#52c41a', // Low - green
            1: '#52c41a'  // Very Low - green
          };
          
          const labels = {
            5: 'Very High',
            4: 'High',
            3: 'Medium',
            2: 'Low',
            1: 'Very Low'
          };
          
          const badge = document.createElement('span');
          badge.style.cssText = `
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
            color: white;
            background: ${colors[value] || '#666'};
          `;
          badge.textContent = labels[value] || 'Unknown';
          return badge;
        };
        
        // Add title section
        const titleSection = document.createElement('div');
        titleSection.style.cssText = 'margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #1890ff;';
        titleSection.innerHTML = `
          <h4 style="margin: 0; color: #1890ff; font-size: 14px;">Road Information</h4>
        `;
        container.appendChild(titleSection);
        
        // Add road details
        container.appendChild(createRow('Route', attributes.Route));
        container.appendChild(createRow('County', attributes.COUNTY));
        container.appendChild(createRow('Length', attributes.Shape__Length ? 
          `${(attributes.Shape__Length * 0.001).toFixed(2)} km` : 'N/A'));
        
        // Criticality with badge
        const critRow = document.createElement('div');
        critRow.style.cssText = 'display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;';
        critRow.innerHTML = '<span style="color: #666; font-size: 12px;">Criticality:</span>';
        critRow.appendChild(createBadge(attributes.Criticality_Rating_Num1));
        container.appendChild(critRow);
        
        // Lifeline status
        const lifelineValue = attributes.Lifeline === 1 ? '✓ Yes' : '✗ No';
        const lifelineRow = createRow('Lifeline Route', lifelineValue, attributes.Lifeline === 1);
        container.appendChild(lifelineRow);
        
        // Flood risk section
        const floodSection = document.createElement('div');
        floodSection.style.cssText = 'margin-top: 12px; padding-top: 8px; border-top: 2px solid #faad14;';
        floodSection.innerHTML = `
          <h4 style="margin: 0 0 8px 0; color: #faad14; font-size: 14px;">Flood Risk Status</h4>
        `;
        container.appendChild(floodSection);
        
        // RCP 4.5 Status
        const rcp45 = attributes.future_flood_intersection_m === 1;
        const rcp45Row = createRow('RCP 4.5 Risk', rcp45 ? '⚠️ At Risk' : '✓ Safe', rcp45);
        container.appendChild(rcp45Row);
        
        // RCP 8.5 Status
        const rcp85 = attributes.future_flood_intersection_h === 1;
        const rcp85Row = createRow('RCP 8.5 Risk', rcp85 ? '⚠️ At Risk' : '✓ Safe', rcp85);
        container.appendChild(rcp85Row);
        
        return container;
      }
    }],
    outFields: ["*"]
  };
};