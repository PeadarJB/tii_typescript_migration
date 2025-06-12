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
    }

    onFilterChange(callback) {
        this.onFilterChangeCallback = callback;
    }

    async initializeFilters() {
        this.container.innerHTML = '';
        this.createResetButton();

        const filterConfigs = CONFIG.filterConfig || [];

        filterConfigs.forEach(config => {
            this.currentFilters[config.id] = (config.type === 'scenario-select') ? {} : [];
        });

        for (const config of filterConfigs) {
            if (config.type === 'scenario-select') {
                this._createScenarioSelectFilter(config);
            } else if (config.type === 'multi-select') {
                await this._createMultiSelectFilter(config);
            }
        }
    }

    // --- Private Helper to Build the UI ---
    
    _createFilterCombobox(config) {
        const wrapper = document.createElement('div');
        wrapper.className = 'filter-group';

        const label = document.createElement('calcite-label');
        label.innerText = config.label;
        wrapper.appendChild(label);

        // This is the new flex container for the input and the "+N" indicator
        const inputArea = document.createElement('div');
        inputArea.className = 'filter-input-area';

        const combobox = document.createElement('calcite-combobox');
        combobox.className = 'filter-combobox';
        combobox.setAttribute('selection-mode', 'multiple');
        combobox.setAttribute('placeholder', `Select ${config.label.toLowerCase()}...`);

        // The "+N" indicator element, initially hidden
        const overflowIndicator = document.createElement('span');
        overflowIndicator.className = 'filter-overflow-indicator';

        inputArea.appendChild(combobox);
        inputArea.appendChild(overflowIndicator);
        wrapper.appendChild(inputArea);
        this.container.appendChild(wrapper);

        return { combobox, overflowIndicator };
    }
    
    // --- Filter Creation Methods (Now use the helper) ---

    _createScenarioSelectFilter(config) {
        const { combobox } = this._createFilterCombobox(config);
        
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
            this._updateChipDisplay(event.target); // Update the UI
        });
    }

    async _createMultiSelectFilter(config) {
        const { combobox } = this._createFilterCombobox(config);
        
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
            this._updateChipDisplay(event.target); // Update the UI
        });
    }
    
    // --- NEW: Method to control chip visibility ---

    _updateChipDisplay(combobox) {
        const overflowIndicator = combobox.nextElementSibling;
        if (!overflowIndicator) return;

        // Use a microtask delay to allow Calcite to render the chips before we check them
        queueMicrotask(() => {
            const chips = Array.from(combobox.querySelectorAll('calcite-chip'));
            const maxVisible = 1; // Show only the first selected chip

            // Hide or show chips based on their position
            chips.forEach((chip, index) => {
                chip.hidden = index >= maxVisible;
            });

            const overflowCount = chips.length - maxVisible;

            if (overflowCount > 0) {
                overflowIndicator.textContent = `+${overflowCount}`;
                overflowIndicator.style.display = 'inline-flex';
            } else {
                overflowIndicator.style.display = 'none';
            }
        });
    }

    // --- Core Logic (Mostly Unchanged) ---

    async getUniqueValues(fieldName) {
        if (!this.layer) return [];
        const query = new Query({
            where: "1=1", outFields: [fieldName], returnDistinctValues: true, orderByFields: [fieldName]
        });
        try {
            const results = await this.layer.queryFeatures(query);
            return results.features
                .map(f => f.attributes[fieldName])
                .filter(v => v !== null && v !== undefined && String(v).trim() !== "")
                .map(v => ({ label: String(v), value: String(v) }));
        } catch (error) {
            console.error(`Error fetching unique values for "${fieldName}":`, error);
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
        this.container.appendChild(resetButton);
    }

    resetAllFilters() {
        Object.keys(this.currentFilters).forEach(filterId => {
            const config = CONFIG.filterConfig.find(c => c.id === filterId);
            this.currentFilters[filterId] = (config?.type === 'scenario-select') ? {} : [];
        });

        this.container.querySelectorAll('calcite-combobox').forEach(combobox => {
            combobox.selectedItems = [];
            this._updateChipDisplay(combobox); // Reset the chip display
        });

        this.applyFilters();
    }

    async applyFilters() {
        // ... applyFilters logic remains the same ...
        let whereClauseArray = [];
        let hasActiveFilters = false;

        Object.keys(this.currentFilters).forEach(filterId => {
            const filterData = this.currentFilters[filterId];
            
            if (Array.isArray(filterData) && filterData.length > 0) {
                hasActiveFilters = true;
                const field = filterData[0].field;
                const dataType = filterData[0].dataType;
                const values = filterData.map(item => item.value);
                
                const valueList = (dataType === 'string')
                    ? values.map(v => `'${String(v).replace(/'/g, "''")}'`).join(', ')
                    : values.join(', ');
                    
                if (valueList) whereClauseArray.push(`${field} IN (${valueList})`);

            } else if (typeof filterData === 'object' && Object.keys(filterData).length > 0) {
                hasActiveFilters = true;
                const fieldConditions = Object.values(filterData).map(item => `${item.field} = ${item.value}`);
                if (fieldConditions.length > 0) whereClauseArray.push(`(${fieldConditions.join(' OR ')})`);
            }
        });

        const whereClause = whereClauseArray.join(' AND ') || '1=1';
        this.layer.definitionExpression = whereClause;

        if (hasActiveFilters && this.view && this.layer?.visible) {
            try {
                const { extent } = await this.layer.queryExtent(this.layer.createQuery());
                if (extent) await this.view.goTo(extent.expand(1.5));
            } catch (error) {
                if (!error.name?.includes("AbortError")) console.error("Error zooming to filtered extent:", error);
            }
        } else if (!hasActiveFilters && this.view && this.initialExtent) {
            await this.view.goTo(this.initialExtent);
        }

        this.onFilterChangeCallback?.(whereClause);
    }

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
}
