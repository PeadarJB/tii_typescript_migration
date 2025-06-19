// FIX: Remove the problematic imports. We will use the __esri namespace instead.
import type { RoadSegmentAttributes } from '@/types/index';

// By referencing the types, we make the global __esri namespace available
/// <reference types="@arcgis/core" />

/**
 * Creates a styled popup template for road network features.
 * @returns A configuration object for an ArcGIS PopupTemplate.
 */
// FIX: Use the __esri namespace to access the correct 'Properties' type.
export const createPopupTemplate = (): __esri.PopupTemplateProperties => {
  // FIX: Use the __esri namespace for the CustomContentProperties type.
  const customContent: __esri.CustomContentProperties = {
    creator: (event: __esri.PopupTemplateCreatorEvent | undefined): HTMLDivElement => {
      const container = document.createElement('div');
      container.style.cssText = 'font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 8px;';

      if (!event || !event.graphic || !event.graphic.attributes) {
        container.textContent = "No data available.";
        return container;
      }

      const attributes = event.graphic.attributes as RoadSegmentAttributes;

      const createRow = (label: string, value: string | number | null, isHighlighted = false): HTMLDivElement => {
        const row = document.createElement('div');
        row.style.cssText = `
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          border-bottom: 1px solid #f0f0f0;
          ${isHighlighted ? `background: #e6f7ff; margin: 0 -8px; padding-left: 8px; padding-right: 8px;` : ''}
        `;

        const labelEl = document.createElement('span');
        labelEl.style.cssText = 'color: #666; font-size: 12px;';
        labelEl.textContent = label;

        const valueEl = document.createElement('span');
        valueEl.style.cssText = `
          font-weight: 500;
          font-size: 12px;
          ${isHighlighted ? `color: #1890ff;` : 'color: #333;'}
        `;
        valueEl.textContent = value?.toString() ?? 'N/A';

        row.appendChild(labelEl);
        row.appendChild(valueEl);
        return row;
      };

      const createBadge = (value: number): HTMLSpanElement => {
        const colors: Record<number, string> = {
          5: '#f5222d', 4: '#fa8c16', 3: '#faad14', 2: '#52c41a', 1: '#52c41a',
        };
        const labels: Record<number, string> = {
          5: 'Very High', 4: 'High', 3: 'Medium', 2: 'Low', 1: 'Very Low',
        };

        const badge = document.createElement('span');
        badge.style.cssText = `
          display: inline-block; padding: 2px 8px; border-radius: 4px;
          font-size: 11px; font-weight: 500; color: white;
          background: ${colors[value] ?? '#666'};
        `;
        badge.textContent = labels[value] ?? 'Unknown';
        return badge;
      };

      const titleSection = document.createElement('div');
      titleSection.style.cssText = 'margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #1890ff;';
      titleSection.innerHTML = `<h4 style="margin: 0; color: #1890ff; font-size: 14px;">Road Information</h4>`;
      container.appendChild(titleSection);

      container.appendChild(createRow('Route', attributes.Route, false));
      container.appendChild(createRow('County', attributes.COUNTY, false));

      const lengthKm = attributes.Shape__Length != null
        ? `${(attributes.Shape__Length * 0.001).toFixed(2)} km`
        : 'N/A';
      container.appendChild(createRow('Length', lengthKm, false));

      const critRow = document.createElement('div');
      critRow.style.cssText = 'display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0;';
      critRow.innerHTML = '<span style="color: #666; font-size: 12px;">Criticality:</span>';
      critRow.appendChild(createBadge(attributes.Criticality_Rating_Num1));
      container.appendChild(critRow);

      const isLifeline = attributes.Lifeline === 1;
      container.appendChild(createRow('Lifeline Route', isLifeline ? '✓ Yes' : '✗ No', isLifeline));

      const floodSection = document.createElement('div');
      floodSection.style.cssText = 'margin-top: 12px; padding-top: 8px; border-top: 2px solid #faad14;';
      floodSection.innerHTML = `<h4 style="margin: 0 0 8px 0; color: #faad14; font-size: 14px;">Flood Risk Status</h4>`;
      container.appendChild(floodSection);

      const rcp45AtRisk = attributes.future_flood_intersection_m === 1;
      container.appendChild(createRow('RCP 4.5 Risk', rcp45AtRisk ? '⚠️ At Risk' : '✓ Safe', rcp45AtRisk));

      const rcp85AtRisk = attributes.future_flood_intersection_h === 1;
      container.appendChild(createRow('RCP 8.5 Risk', rcp85AtRisk ? '⚠️ At Risk' : '✓ Safe', rcp85AtRisk));

      return container;
    },
  };

  return {
    title: "{Route}",
    content: [customContent],
    outFields: ["*"],
  };
};

// ... other helper functions ...