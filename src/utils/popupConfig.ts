import type { PopupTemplateConfig, RoadSegmentAttributes } from '@/types/arcgis';

/**
 * Creates a styled popup template for road network features
 * @returns PopupTemplate configuration object for ArcGIS
 */
export const createPopupTemplate = (): PopupTemplateConfig => {
  return {
    title: "{Route}",
    content: [{
      type: "custom",
      creator: (graphic: __esri.Graphic) => {
        const attributes = graphic.attributes as RoadSegmentAttributes;
        
        // Create styled HTML content
        const container = document.createElement('div');
        container.style.cssText = 'font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 8px;';
        
        // Helper function to create a row
        const createRow = (label: string, value: string | number | null, isHighlighted: boolean = false): HTMLDivElement => {
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
          valueEl.textContent = value?.toString() || 'N/A';
          
          row.appendChild(labelEl);
          row.appendChild(valueEl);
          return row;
        };
        
        // Create badge for criticality
        const createBadge = (value: number): HTMLSpanElement => {
          const colors: Record<number, string> = {
            5: '#f5222d', // Very High - red
            4: '#fa8c16', // High - orange
            3: '#faad14', // Medium - yellow
            2: '#52c41a', // Low - green
            1: '#52c41a'  // Very Low - green
          };
          
          const labels: Record<number, string> = {
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
        container.appendChild(createRow('Route', attributes.Route, false));
        container.appendChild(createRow('County', attributes.COUNTY, false));
        
        const lengthKm = attributes.Shape__Length 
          ? (attributes.Shape__Length * 0.001).toFixed(2) + ' km'
          : null;
        container.appendChild(createRow('Length', lengthKm, false));
        
        // Criticality with badge
        const critRow = document.createElement('div');
        critRow.style.cssText = 'display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;';
        critRow.innerHTML = '<span style="color: #666; font-size: 12px;">Criticality:</span>';
        critRow.appendChild(createBadge(attributes.Criticality_Rating_Num1));
        container.appendChild(critRow);
        
        // Lifeline status
        const lifelineValue = attributes.Lifeline === 1 ? '✓ Yes' : '✗ No';
        const isLifeline = attributes.Lifeline === 1;
        const lifelineRow = createRow('Lifeline Route', lifelineValue, isLifeline);
        container.appendChild(lifelineRow);
        
        // Flood risk section
        const floodSection = document.createElement('div');
        floodSection.style.cssText = 'margin-top: 12px; padding-top: 8px; border-top: 2px solid #faad14;';
        floodSection.innerHTML = `
          <h4 style="margin: 0 0 8px 0; color: #faad14; font-size: 14px;">Flood Risk Status</h4>
        `;
        container.appendChild(floodSection);
        
        // RCP 4.5 Status
        const rcp45AtRisk = attributes.future_flood_intersection_m === 1;
        const rcp45Status = rcp45AtRisk ? '⚠️ At Risk' : '✓ Safe';
        const rcp45Row = createRow('RCP 4.5 Risk', rcp45Status, rcp45AtRisk);
        container.appendChild(rcp45Row);
        
        // RCP 8.5 Status
        const rcp85AtRisk = attributes.future_flood_intersection_h === 1;
        const rcp85Status = rcp85AtRisk ? '⚠️ At Risk' : '✓ Safe';
        const rcp85Row = createRow('RCP 8.5 Risk', rcp85Status, rcp85AtRisk);
        container.appendChild(rcp85Row);
        
        // Historic flooding
        const historicM = attributes.historic_intersection_m === 1;
        const historicH = attributes.historic_intersection_h === 1;
        if (historicM || historicH) {
          const historicSection = document.createElement('div');
          historicSection.style.cssText = 'margin-top: 8px; padding: 4px 8px; background: #fff7e6; border-radius: 4px;';
          historicSection.innerHTML = `
            <span style="color: #fa8c16; font-size: 11px; font-weight: 500;">
              ⚠️ Historic flooding recorded
            </span>
          `;
          container.appendChild(historicSection);
        }
        
        // Model details (if at risk)
        if (rcp45AtRisk || rcp85AtRisk) {
          const modelSection = document.createElement('div');
          modelSection.style.cssText = 'margin-top: 8px; font-size: 11px; color: #666;';
          
          const affectedModels: string[] = [];
          
          // Check RCP 4.5 models
          if (attributes.cfram_f_m_0010 === 1) affectedModels.push('CFRAM Fluvial (4.5)');
          if (attributes.cfram_c_m_0010 === 1) affectedModels.push('CFRAM Coastal (4.5)');
          if (attributes.nifm_f_m_0020 === 1) affectedModels.push('NIFM Fluvial (4.5)');
          if (attributes.ncfhm_c_m_0010 === 1) affectedModels.push('NCFHM Coastal (4.5)');
          
          // Check RCP 8.5 models
          if (attributes.cfram_f_h_0100 === 1) affectedModels.push('CFRAM Fluvial (8.5)');
          if (attributes.cfram_c_h_0200 === 1) affectedModels.push('CFRAM Coastal (8.5)');
          if (attributes.nifm_f_h_0100 === 1) affectedModels.push('NIFM Fluvial (8.5)');
          if (attributes.ncfhm_c_c_0200 === 1) affectedModels.push('NCFHM Coastal (8.5)');
          
          if (affectedModels.length > 0) {
            modelSection.innerHTML = `
              <strong>Affected by models:</strong><br/>
              ${affectedModels.join(', ')}
            `;
            container.appendChild(modelSection);
          }
        }
        
        return container;
      }
    }],
    outFields: ["*"]
  };
};

/**
 * Format road attributes for display
 * @param attributes - Road segment attributes
 * @returns Formatted object for display
 */
export const formatRoadAttributes = (attributes: RoadSegmentAttributes): Record<string, string | number> => {
  return {
    'Route': attributes.Route || 'Unknown',
    'County': attributes.COUNTY || 'Unknown',
    'Length (km)': attributes.Shape__Length ? (attributes.Shape__Length * 0.001).toFixed(2) : 'N/A',
    'Criticality': getCriticalityLabel(attributes.Criticality_Rating_Num1),
    'Lifeline Route': attributes.Lifeline === 1 ? 'Yes' : 'No',
    'RCP 4.5 Risk': attributes.future_flood_intersection_m === 1 ? 'At Risk' : 'Safe',
    'RCP 8.5 Risk': attributes.future_flood_intersection_h === 1 ? 'At Risk' : 'Safe',
    'Road Type': getSubnetLabel(attributes.Subnet)
  };
};

/**
 * Get criticality rating label
 * @param rating - Numeric criticality rating (1-5)
 * @returns Human-readable label
 */
export const getCriticalityLabel = (rating: number): string => {
  const labels: Record<number, string> = {
    5: 'Very High',
    4: 'High',
    3: 'Medium',
    2: 'Low',
    1: 'Very Low'
  };
  return labels[rating] || 'Unknown';
};

/**
 * Get road subnet label
 * @param subnet - Numeric subnet code
 * @returns Human-readable label
 */
export const getSubnetLabel = (subnet: number): string => {
  const labels: Record<number, string> = {
    0: 'Motorway/Dual Carriageway',
    1: 'Engineered Pavements',
    2: 'Urban Roads',
    3: 'Legacy Pavements - High Traffic',
    4: 'Legacy Pavements - Low Traffic'
  };
  return labels[subnet] || 'Unknown';
};

/**
 * Check if a road segment is at risk
 * @param attributes - Road segment attributes
 * @param scenario - Climate scenario ('rcp45' | 'rcp85' | 'any')
 * @returns True if the segment is at risk
 */
export const isSegmentAtRisk = (
  attributes: RoadSegmentAttributes, 
  scenario: 'rcp45' | 'rcp85' | 'any' = 'any'
): boolean => {
  switch (scenario) {
    case 'rcp45':
      return attributes.future_flood_intersection_m === 1;
    case 'rcp85':
      return attributes.future_flood_intersection_h === 1;
    case 'any':
    default:
      return attributes.future_flood_intersection_m === 1 || 
             attributes.future_flood_intersection_h === 1;
  }
};