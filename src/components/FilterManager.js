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
            console.error("FilterManager: Container not found.");
            return;
        }

        this.view?.when(view => {
            this.initialExtent = view.extent?.clone();
        });
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
            await this._createFilterUI(config);
        }
    }

    async _createFilterUI(config) {
        const wrapper = document.createElement('div');
        wrapper.className = 'filter-group';

        const label = document.createElement('calcite-label');
        label.innerText = config.label;
        wrapper.appendChild(label);

        const inputArea = document.createElement('div');
        inputArea.className = 'filter-input-area';

        const combobox = document.createElement('calcite-combobox');
        combobox.className = 'filter-combobox';
        combobox.setAttribute('selection-mode', 'multiple');
        combobox.setAttribute('placeholder', `Select ${config.label.toLowerCase()}...`);
        combobox.setAttribute('label', `${config.label} filter`);

        const overflowIndicator = document.createElement('span');
        overflowIndicator.className = 'filter-overflow-indicator';

        inputArea.appendChild(combobox);
        inputArea.appendChild(overflowIndicator);
        wrapper.appendChild(inputArea);
        this.container.appendChild(wrapper);

        const options = config.type === 'scenario-select'
            ? config.items
            : (config.options && config.options.length > 0)
                ? config.options
                : await this.getUniqueValues(config.field);

        options.forEach(option => {
            const comboboxItem = document.createElement('calcite-combobox-item');
            comboboxItem.setAttribute('value', option.field || option.value);
            comboboxItem.setAttribute('text-label', option.label);
            combobox.appendChild(comboboxItem);
        });
        
        combobox.addEventListener('calciteComboboxChange', (event) => {
            this._handleSelectionChange(event, config);
        });
    }

    _handleSelectionChange(event, config) {
        const selectedItems = event.target.selectedItems;
        if (config.type === 'scenario-select') {
            this.currentFilters[config.id] = {};
            selectedItems.forEach(item => {
                const originalItem = config.items.find(opt => opt.field === item.value);
                if (originalItem) {
                    this.currentFilters[config.id][originalItem.field] = { field: originalItem.field, value: originalItem.value, dataType: 'number' };
                }
            });
        } else {
            this.currentFilters[config.id] = selectedItems.map(item => ({ field: config.field, value: item.value, dataType: config.dataType }));
        }
        this.applyFilters();
        this._updateChipDisplay(event.target);
    }
    
    _updateChipDisplay(combobox) {
        const overflowIndicator = combobox.nextElementSibling;
        const selectedCount = combobox.selectedItems.length;
        const maxVisible = 1; 
        
        const overflowCount = selectedCount - maxVisible;

        if (overflowCount > 0) {
            overflowIndicator.textContent = `+${overflowCount}`;
            overflowIndicator.style.display = 'inline-flex';
        } else {
            overflowIndicator.style.display = 'none';
        }
    }

    async getUniqueValues(fieldName) {
        if (!this.layer) return [];
        const query = new Query({ where: "1=1", outFields: [fieldName], returnDistinctValues: true, orderByFields: [fieldName] });
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
        this.container.appendChild(resetContainer);
    }

    resetAllFilters() {
        Object.keys(this.currentFilters).forEach(filterId => {
            const config = CONFIG.filterConfig.find(c => c.id === filterId);
            this.currentFilters[filterId] = (config?.type === 'scenario-select') ? {} : [];
        });
        this.container.querySelectorAll('calcite-combobox').forEach(combobox => {
            combobox.selectedItems = [];
            this._updateChipDisplay(combobox);
        });
        this.applyFilters();
    }

    async applyFilters() {
        let whereClauseArray = [];
        let hasActiveFilters = false;
        Object.keys(this.currentFilters).forEach(filterId => {
            const filterData = this.currentFilters[filterId];
            if (Array.isArray(filterData) && filterData.length > 0) {
                hasActiveFilters = true;
                const { field, dataType } = filterData[0];
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
