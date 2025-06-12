// src/components/FilterManager.js

import { CONFIG } from "../config/appConfig.js";
import Query from "@arcgis/core/rest/support/Query.js";

export class FilterManager {
    constructor(container, view, roadNetworkLayer) {
        this.container = typeof container === 'string' ? document.getElementById(container) : container;
        this.view = view;
        this.layer = roadNetworkLayer;
        this.currentFilters = {};
        this.onFilterChangeCallback = null;
        this.initialExtent = null;

        if (!this.container) {
            console.error("FilterManager: Container not found. Filters cannot be created.");
            return;
        }
        
        if (this.view?.extent) {
            this.initialExtent = this.view.extent.clone();
        } else if (this.view) {
            this.view.when(view => {
                this.initialExtent = view.extent?.clone();
            });
        }

        console.log("FilterManager initialized successfully.");
    }

    onFilterChange(callback) {
        this.onFilterChangeCallback = callback;
    }

    async initializeFilters() {
        this.container.innerHTML = '';
        this.createResetButton();

        const filterConfigs = CONFIG.filterConfig || [];

        filterConfigs.forEach(config => {
            // Initialize with an empty object for scenario-select and an empty array for others
            this.currentFilters[config.id] = (config.type === 'scenario-select') ? {} : [];
        });

        for (const config of filterConfigs) {
            if (config.type === 'scenario-select') {
                this.createScenarioSelectFilter(config);
            } else if (config.type === 'multi-select') {
                await this.createMultiSelectFilter(config);
            }
        }
        console.log("FilterManager: All filter UI elements have been initialized.");
    }

    async getUniqueValues(fieldName) {
        if (!this.layer) return [];
        const query = new Query({
            where: "1=1",
            outFields: [fieldName],
            returnDistinctValues: true,
            orderByFields: [fieldName]
        });
        try {
            const results = await this.layer.queryFeatures(query);
            return results.features
                .map(feature => feature.attributes[fieldName])
                .filter(value => value !== null && value !== undefined && String(value).trim() !== "")
                .map(value => ({ label: String(value), value: String(value) }));
        } catch (error) {
            console.error(`FilterManager: Error fetching unique values for field "${fieldName}":`, error);
            return [];
        }
    }

    createResetButton() {
        const resetContainer = document.createElement('div');
        resetContainer.className = 'filter-reset-container';
        const resetButton = document.createElement('calcite-button');
        resetButton.setAttribute('kind', 'neutral');
        resetButton.setAttribute('scale', 's');
        resetButton.innerText = 'Reset All Filters';
        resetButton.addEventListener('click', () => this.resetAllFilters());
        resetContainer.appendChild(resetButton);
        this.container.appendChild(resetContainer);
    }

    /**
     * REFACTORED: Creates a scenario dropdown filter.
     * This now includes the .filter-combobox-wrapper for controlled height and scrolling.
     */
    createScenarioSelectFilter(config) {
        const wrapper = document.createElement('div');
        wrapper.className = 'filter-group';

        const label = document.createElement('calcite-label');
        label.innerText = config.label;
        wrapper.appendChild(label);

        // Create the new wrapper that enables the CSS styling
        const comboboxWrapper = document.createElement('div');
        comboboxWrapper.className = 'filter-combobox-wrapper';

        const combobox = document.createElement('calcite-combobox');
        combobox.className = 'filter-combobox'; // Class for targeting chips
        combobox.setAttribute('selection-mode', 'multiple');
        combobox.setAttribute('placeholder', 'Select scenarios...');
        
        config.items.forEach(item => {
            const comboboxItem = document.createElement('calcite-combobox-item');
            comboboxItem.setAttribute('value', item.field);
            comboboxItem.setAttribute('text-label', item.label);
            combobox.appendChild(comboboxItem);
        });

        combobox.addEventListener('calciteComboboxChange', (event) => {
            const selectedFields = event.target.selectedItems.map(item => item.value);
            this.currentFilters[config.id] = {};
            selectedFields.forEach(selectedField => {
                const originalItem = config.items.find(item => item.field === selectedField);
                if (originalItem) {
                    this.currentFilters[config.id][originalItem.field] = {
                        field: originalItem.field,
                        value: originalItem.value,
                        dataType: 'number'
                    };
                }
            });
            this.applyFilters();
        });

        // Append combobox to the wrapper, then wrapper to the group
        comboboxWrapper.appendChild(combobox);
        wrapper.appendChild(comboboxWrapper);
        this.container.appendChild(wrapper);
    }

    /**
     * REFACTORED: Creates a standard multi-select dropdown filter.
     * This also now includes the .filter-combobox-wrapper.
     */
    async createMultiSelectFilter(config) {
        const wrapper = document.createElement('div');
        wrapper.className = 'filter-group';

        const label = document.createElement('calcite-label');
        label.innerText = config.label;
        wrapper.appendChild(label);
        
        // Create the new wrapper that enables the CSS styling
        const comboboxWrapper = document.createElement('div');
        comboboxWrapper.className = 'filter-combobox-wrapper';

        const combobox = document.createElement('calcite-combobox');
        combobox.className = 'filter-combobox'; // Class for targeting chips
        combobox.setAttribute('selection-mode', 'multiple');
        combobox.setAttribute('placeholder', `Select ${config.label.toLowerCase()}...`);
        
        const options = (config.options && config.options.length > 0) 
            ? config.options 
            : await this.getUniqueValues(config.field);

        options.forEach(option => {
            const comboboxItem = document.createElement('calcite-combobox-item');
            comboboxItem.setAttribute('value', option.value);
            comboboxItem.setAttribute('text-label', option.label);
            combobox.appendChild(comboboxItem);
        });

        combobox.addEventListener('calciteComboboxChange', (event) => {
            const selectedValues = event.target.selectedItems.map(item => item.value);
            this.currentFilters[config.id] = selectedValues.map(value => ({
                field: config.field,
                value: value,
                dataType: config.dataType
            }));
            this.applyFilters();
        });

        // Append combobox to the wrapper, then wrapper to the group
        comboboxWrapper.appendChild(combobox);
        wrapper.appendChild(comboboxWrapper);
        this.container.appendChild(wrapper);
    }

    resetAllFilters() {
        Object.keys(this.currentFilters).forEach(filterId => {
            // Check if the initial state should be an object or an array
            const config = CONFIG.filterConfig.find(c => c.id === filterId);
            this.currentFilters[filterId] = (config?.type === 'scenario-select') ? {} : [];
        });

        this.container.querySelectorAll('calcite-combobox').forEach(combobox => {
            combobox.selectedItems = [];
        });

        this.applyFilters();
    }

    async applyFilters() {
        let whereClauseArray = [];
        let hasActiveFilters = false;

        Object.keys(this.currentFilters).forEach(filterId => {
            const filterData = this.currentFilters[filterId];
            
            if (Array.isArray(filterData) && filterData.length > 0) {
                // Standard multi-select filters
                hasActiveFilters = true;
                const field = filterData[0].field;
                const dataType = filterData[0].dataType;
                const values = filterData.map(item => item.value);
                
                const valueList = (dataType === 'string')
                    ? values.map(v => `'${String(v).replace(/'/g, "''")}'`).join(', ')
                    : values.join(', ');
                    
                if (valueList) {
                    whereClauseArray.push(`${field} IN (${valueList})`);
                }

            } else if (typeof filterData === 'object' && Object.keys(filterData).length > 0) {
                // Scenario filters
                hasActiveFilters = true;
                const fieldConditions = Object.values(filterData).map(item => `${item.field} = ${item.value}`);
                if (fieldConditions.length > 0) {
                    whereClauseArray.push(`(${fieldConditions.join(' OR ')})`);
                }
            }
        });

        const whereClause = whereClauseArray.join(' AND ') || '1=1';
        this.layer.definitionExpression = whereClause;
        console.log("FilterManager: Applied definition expression:", whereClause);

        if (hasActiveFilters && this.view && this.layer?.visible) {
            try {
                const extent = await this.layer.queryExtent(this.layer.createQuery());
                if (extent && extent.count > 0) {
                    await this.view.goTo(extent.extent.expand(1.5));
                }
            } catch (error) {
                if (!error.name?.includes("AbortError")) {
                    console.error("FilterManager: Error zooming to filtered extent:", error);
                }
            }
        } else if (!hasActiveFilters && this.view && this.initialExtent) {
            await this.view.goTo(this.initialExtent);
        }

        if (this.onFilterChangeCallback) {
            this.onFilterChangeCallback(whereClause);
        }
    }

    getCurrentFilterSummary() {
        const summary = {};
        Object.keys(this.currentFilters).forEach(filterId => {
            const filterData = this.currentFilters[filterId];
            if (Array.isArray(filterData) && filterData.length > 0) {
                // For standard filters, store the array of values
                summary[filterId] = filterData.map(item => item.value);
            } else if (typeof filterData === 'object' && Object.keys(filterData).length > 0) {
                // For scenario filters, store the array of field names
                summary[filterId] = Object.keys(filterData);
            }
        });
        return summary;
    }
}
