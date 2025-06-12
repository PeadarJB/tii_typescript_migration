// src/components/FilterManager.js

import { CONFIG } from "../config/appConfig.js";
import Query from "@arcgis/core/rest/support/Query.js";

export class FilterManager {
    constructor(container, view, roadNetworkLayer) {
        // SETUP: Get the HTML container where filters will be displayed
        this.container = typeof container === 'string' ? document.getElementById(container) : container;
        
        // SETUP: Store references to the map view and data layer
        this.view = view;
        this.layer = roadNetworkLayer;
        
        // SETUP: Initialize tracking variables for multi-select filters
        this.currentFilters = {}; // Stores active filter values per filter ID
        this.onFilterChangeCallback = null;
        this.initialExtent = null;

        // ERROR CHECKING: Make sure we have a valid container
        if (!this.container) {
            console.error("FilterManager: Container not found. Filters cannot be created.");
            return;
        }
        
        if (!this.view || !this.layer) {
            console.error("FilterManager: View or Layer is not provided. Zoom functionality may be affected.");
        }

        // SAVE INITIAL MAP POSITION
        if (this.view && this.view.extent) {
            this.initialExtent = this.view.extent.clone();
            console.log("FilterManager: Initial map extent stored directly.", this.initialExtent);
        } else if (this.view) {
            this.view.when(() => {
                if (this.view.extent) {
                    this.initialExtent = this.view.extent.clone();
                    console.log("FilterManager: Initial map extent stored via view.when().", this.initialExtent);
                } else {
                    console.warn("FilterManager: View became ready, but extent is still not available.");
                }
            }).catch(error => {
                console.error("FilterManager: Error storing initial extent via view.when():", error);
            });
        }

        console.log("FilterManager initialized successfully.");
    }

    // CALLBACK SETUP: Allow other parts of the app to know when filters change
    onFilterChange(callback) {
        this.onFilterChangeCallback = callback;
    }

    // MAIN INITIALIZATION: Create all filter UI elements based on configuration
    async initializeFilters() {
        // Clear any existing filter UI elements
        this.container.innerHTML = '';
        
        // Create reset button first
        this.createResetButton();

        // Get filter configuration (you'll need to add this to your CONFIG)
        const filterConfigs = CONFIG.filterConfig || [
            {
                id: 'flood-scenario',
                label: 'Flood Scenario',
                type: 'grouped-checkbox',
                items: [
                    { label: 'Future Flooding (Mid-Range, RCP 4.5%)', field: 'future_flood_intersection_m', value: 1 },
                    { label: 'Future Flooding (High-Range, RCP 8.5%)', field: 'future_flood_intersection_h', value: 1 },
                    { label: 'Historic & Future (Mid-Range, RCP 4.5%)', field: 'historic_intersection_m', value: 1 },
                    { label: 'Historic & Future (High-Range, RCP 8.5%)', field: 'historic_intersection_h', value: 1 },
                    { label: 'Historic Only (Mid-Range, RCP 4.5%)', field: 'hist_no_future_m', value: 1 },
                    { label: 'Historic Only (High-Range, RCP 8.5%)', field: 'hist_no_future_h', value: 1 }
                ]
            },
            {
                id: 'county',
                label: 'County',
                type: 'multi-select',
                field: 'COUNTY',
                dataType: 'string',
                options: await this.getUniqueValues('COUNTY')
            },
            {
                id: 'criticality',
                label: 'Criticality',
                type: 'multi-select',
                field: 'Criticality_Rating_Num1',
                dataType: 'number',
                options: [
                    { label: "Very High", value: "5" },
                    { label: "High", value: "4" },
                    { label: "Medium", value: "3" },
                    { label: "Low", value: "2" },
                    { label: "Very Low", value: "1" },
                ]
            },
            {
                id: 'subnet',
                label: 'Subnet',
                type: 'multi-select',
                field: 'Subnet',
                dataType: 'number',
                options: [
                    { label: "0 - Motorway/Dual Carriageway", value: "0" },
                    { label: "1 - Engineered Pavements", value: "1" },
                    { label: "2 - Urban", value: "2" },
                    { label: "3 - Legacy Pavements (High Traffic)", value: "3" },
                    { label: "4 - Legacy Pavements (Low Traffic)", value: "4" },
                ]
            },
            {
                id: 'lifeline',
                label: 'Lifeline Route',
                type: 'multi-select',
                field: 'Lifeline',
                dataType: 'number',
                options: [
                    { label: "Lifeline Route", value: "1" },
                    { label: "Non-lifeline Route", value: "0" },
                ]
            }
        ];

        // Initialize current filters object
        filterConfigs.forEach(config => {
            if (config.type === 'grouped-checkbox') {
                this.currentFilters[config.id] = {};
            } else {
                this.currentFilters[config.id] = [];
            }
        });

        // CREATE EACH FILTER: Build UI elements based on type
        for (const config of filterConfigs) {
            if (config.type === 'grouped-checkbox') {
                this.createGroupedCheckboxFilter(config);
            } else if (config.type === 'scenario-select') { 
                this.createScenarioSelectFilter(config);
            } else if (config.type === 'multi-select') {
                await this.createMultiSelectFilter(config);
            }
        }

        console.log("FilterManager: All filter UI elements have been initialized.");
    }

    // DATA RETRIEVAL: Get all unique values from a database field
    async getUniqueValues(fieldName) {
        if (!this.layer) {
            console.warn("FilterManager: Layer not available for getUniqueValues.");
            return [];
        }

        const uniqueValuesQuery = new Query({
            where: "1=1",
            outFields: [fieldName],
            returnDistinctValues: true,
            orderByFields: [fieldName]
        });

        try {
            const results = await this.layer.queryFeatures(uniqueValuesQuery);
            return results.features
                .map(feature => feature.attributes[fieldName])
                .filter(value => value !== null && value !== undefined && String(value).trim() !== "")
                .map(value => ({ label: String(value), value: String(value) }));
        } catch (error) {
            console.error(`FilterManager: Error fetching unique values for field "${fieldName}":`, error);
            return [];
        }
    }

    // CREATE RESET BUTTON: Add a button to clear all filters
    createResetButton() {
        const resetContainer = document.createElement('div');
        resetContainer.className = 'filter-reset-container';
        resetContainer.style.marginBottom = '15px';

        const resetButton = document.createElement('calcite-button');
        resetButton.setAttribute('kind', 'neutral');
        resetButton.setAttribute('scale', 's');
        resetButton.innerText = 'Reset All Filters';
        
        resetButton.addEventListener('click', () => {
            this.resetAllFilters();
        });

        resetContainer.appendChild(resetButton);
        this.container.appendChild(resetContainer);
    }

    // CREATE GROUPED CHECKBOX FILTER: For flood scenario selections
    createGroupedCheckboxFilter(config) {
        const wrapper = document.createElement('div');
        wrapper.className = 'filter-group';
        wrapper.style.marginBottom = '20px';

        // Create label
        const label = document.createElement('calcite-label');
        label.innerText = config.label;
        label.style.fontWeight = 'bold';
        label.style.marginBottom = '8px';
        label.style.display = 'block';
        wrapper.appendChild(label);

        // Create checkbox container
        const checkboxContainer = document.createElement('div');
        checkboxContainer.className = 'checkbox-group';
        checkboxContainer.style.display = 'grid';
        checkboxContainer.style.gridTemplateColumns = 'repeat(auto-fit, minmax(300px, 1fr))';
        checkboxContainer.style.gap = '8px';

        // Create checkboxes for each item
        config.items.forEach((item, index) => {
            const checkboxWrapper = document.createElement('calcite-label');
            checkboxWrapper.setAttribute('layout', 'inline');

            const checkbox = document.createElement('calcite-checkbox');
            checkbox.setAttribute('id', `${config.id}-${index}`);
            
            checkbox.addEventListener('calciteCheckboxChange', (event) => {
                if (event.target.checked) {
                    this.currentFilters[config.id][item.field] = {
                        field: item.field,
                        value: item.value,
                        dataType: 'number'
                    };
                } else {
                    delete this.currentFilters[config.id][item.field];
                }
                this.applyFilters();
            });

            checkboxWrapper.appendChild(checkbox);
            checkboxWrapper.appendChild(document.createTextNode(item.label));
            checkboxContainer.appendChild(checkboxWrapper);
        });

        wrapper.appendChild(checkboxContainer);
        this.container.appendChild(wrapper);
    }

    createScenarioSelectFilter(config) {
        const wrapper = document.createElement('div');
        wrapper.className = 'filter-group';
        wrapper.style.marginBottom = '20px';
    
        // Create label
        const label = document.createElement('calcite-label');
        label.innerText = config.label;
        label.style.fontWeight = 'bold';
        label.style.marginBottom = '8px';
        label.style.display = 'block';
        wrapper.appendChild(label);
    
        // Create combobox for multi-select
        const combobox = document.createElement('calcite-combobox');
        combobox.setAttribute('selection-mode', 'multiple');
        combobox.setAttribute('placeholder', `-`);
        combobox.setAttribute('max-items', '10');
    
        // Add options from the 'items' array in your config
        config.items.forEach(item => {
            const comboboxItem = document.createElement('calcite-combobox-item');
            // Use the unique field name as the internal value for the option
            comboboxItem.setAttribute('value', item.field);
            comboboxItem.setAttribute('text-label', item.label);
            combobox.appendChild(comboboxItem);
        });
    
        // Add event listener with custom logic
        combobox.addEventListener('calciteComboboxChange', (event) => {
            const selectedFields = event.target.selectedItems.map(item => item.value);
    
            // Clear the current filter state for this ID
            this.currentFilters[config.id] = {};
    
            // Re-populate the filter state based on the selected fields
            selectedFields.forEach(selectedField => {
                const originalItem = config.items.find(item => item.field === selectedField);
                if (originalItem) {
                    this.currentFilters[config.id][originalItem.field] = {
                        field: originalItem.field,
                        value: originalItem.value,
                        dataType: 'number' // Assuming all scenario fields are numeric flags
                    };
                }
            });
    
            this.applyFilters();
        });
    
        wrapper.appendChild(combobox);
        this.container.appendChild(wrapper);
    }

    // CREATE MULTI-SELECT FILTER: For dropdowns with multiple selections
    async createMultiSelectFilter(config) {
        const wrapper = document.createElement('div');
        wrapper.className = 'filter-group';
        wrapper.style.marginBottom = '20px';

        // Create label
        const label = document.createElement('calcite-label');
        label.innerText = config.label;
        label.style.fontWeight = 'bold';
        label.style.marginBottom = '8px';
        label.style.display = 'block';
        wrapper.appendChild(label);

        // Create combobox for multi-select
        const combobox = document.createElement('calcite-combobox');
        combobox.setAttribute('selection-mode', 'multiple');
        combobox.setAttribute('placeholder', `-`);
        combobox.setAttribute('max-items', '10');

        // Add options
        config.options.forEach(option => {
            const comboboxItem = document.createElement('calcite-combobox-item');
            comboboxItem.setAttribute('value', option.value);
            comboboxItem.setAttribute('text-label', option.label);
            combobox.appendChild(comboboxItem);
        });

        // Add event listener
        combobox.addEventListener('calciteComboboxChange', (event) => {
            const selectedValues = event.target.selectedItems.map(item => item.value);
            this.currentFilters[config.id] = selectedValues.map(value => ({
                field: config.field,
                value: value,
                dataType: config.dataType
            }));
            this.applyFilters();
        });

        wrapper.appendChild(combobox);
        this.container.appendChild(wrapper);
    }

    // RESET ALL FILTERS: Clear all active filters and return to initial view
    resetAllFilters() {
        // Clear all current filters
        Object.keys(this.currentFilters).forEach(filterId => {
            if (Array.isArray(this.currentFilters[filterId])) {
                this.currentFilters[filterId] = [];
            } else {
                this.currentFilters[filterId] = {};
            }
        });

        // Reset all UI elements
        this.container.querySelectorAll('calcite-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });

        this.container.querySelectorAll('calcite-combobox').forEach(combobox => {
            combobox.selectedItems = [];
        });

        // Apply empty filters (shows all data)
        this.applyFilters();
    }

    // FILTER APPLICATION: Convert all active filters into SQL and apply to layer
    async applyFilters() {
        let whereClauseArray = [];
        let hasActiveFilters = false;

        // Process each filter group
        Object.keys(this.currentFilters).forEach(filterId => {
            const filterData = this.currentFilters[filterId];
            
            if (Array.isArray(filterData) && filterData.length > 0) {
                // Multi-select filter
                hasActiveFilters = true;
                const field = filterData[0].field;
                const dataType = filterData[0].dataType;
                const values = filterData.map(item => item.value);
                
                if (dataType === 'string') {
                    const valueList = values.map(v => `'${String(v).replace(/'/g, "''")}'`).join(', ');
                    whereClauseArray.push(`${field} IN (${valueList})`);
                } else {
                    const valueList = values.join(', ');
                    whereClauseArray.push(`${field} IN (${valueList})`);
                }
            } else if (typeof filterData === 'object' && Object.keys(filterData).length > 0) {
                // Grouped checkbox filter (flood scenarios)
                hasActiveFilters = true;
                const fieldConditions = Object.values(filterData).map(item => {
                    return `${item.field} = ${item.value}`;
                });
                
                if (fieldConditions.length > 0) {
                    whereClauseArray.push(`(${fieldConditions.join(' OR ')})`);
                }
            }
        });

        // Build final WHERE clause
        const whereClause = whereClauseArray.length > 0 ? whereClauseArray.join(' AND ') : '';
        
        // Apply to layer
        this.layer.definitionExpression = whereClause;
        console.log("FilterManager: Applied definition expression:", whereClause);

        // Handle zooming
        if (hasActiveFilters && this.view && this.layer && this.layer.visible) {
            try {
                const extentQuery = this.layer.createQuery();
                const results = await this.layer.queryExtent(extentQuery);

                if (results && results.count > 0 && results.extent) {
                    await this.view.goTo(results.extent.expand(2));
                    console.log("FilterManager: Zoomed to filtered extent.");
                } else if (results && results.count === 0) {
                    console.log("FilterManager: No features match the current filters.");
                    if (this.initialExtent) {
                        await this.view.goTo(this.initialExtent);
                        console.log("FilterManager: No features found, zoomed to initial extent.");
                    }
                }
            } catch (error) {
                console.error("FilterManager: Error zooming to filtered extent:", error);
            }
        } else if (!hasActiveFilters && this.view && this.initialExtent) {
            await this.view.goTo(this.initialExtent);
            console.log("FilterManager: All filters cleared. Zoomed to initial map extent.");
        }

        // Notify callback
        if (this.onFilterChangeCallback) {
            this.onFilterChangeCallback(whereClause);
        }
    }

    // UTILITY: Get current filter summary for reporting
    getCurrentFilterSummary() {
        const summary = {};
        
        Object.keys(this.currentFilters).forEach(filterId => {
            const filterData = this.currentFilters[filterId];
            
            if (Array.isArray(filterData) && filterData.length > 0) {
                summary[filterId] = filterData.map(item => item.value);
            } else if (typeof filterData === 'object' && Object.keys(filterData).length > 0) {
                summary[filterId] = Object.keys(filterData);
            }
        });
        
        return summary;
    }

    // UTILITY: Get count of filtered features
    async getFilteredFeatureCount() {
        if (!this.layer) return 0;
        
        try {
            const query = this.layer.createQuery();
            const result = await this.layer.queryFeatureCount(query);
            return result;
        } catch (error) {
            console.error("FilterManager: Error getting feature count:", error);
            return 0;
        }
    }
}