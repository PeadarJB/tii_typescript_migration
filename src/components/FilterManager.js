// src/components/FilterManager.js

import { CONFIG } from "../config/appConfig.js";
import Query from "@arcgis/core/rest/support/Query.js";

export class FilterManager {
    constructor(container, view, roadNetworkLayer) {
        // --- SETUP ---
        this.container = typeof container === 'string' ? document.getElementById(container) : container;
        this.view = view;
        this.layer = roadNetworkLayer;
        
        // --- STATE MANAGEMENT ---
        // Stores the state of active filters, e.g., { county: ['Dublin', 'Kildare'], criticality: [4, 5] }
        this.activeFilters = new Map(); 
        this.onFilterChangeCallback = null;
        this.initialExtent = null;
        this.filterElements = new Map(); // Store references to UI components

        // --- VALIDATION ---
        if (!this.container) {
            console.error("FilterManager: Container not found. Filters cannot be created.");
            return;
        }
        if (!this.view || !this.layer) {
            console.warn("FilterManager: View or Layer not provided. Zoom and query functionality will be affected.");
        }

        // --- INITIALIZATION ---
        this.storeInitialExtent();
        console.log("FilterManager initialized.");
    }

    /**
     * Stores the initial map extent to allow for resetting the view.
     */
    storeInitialExtent() {
        if (this.view?.extent) {
            this.initialExtent = this.view.extent.clone();
        } else if (this.view) {
            this.view.when(view => {
                this.initialExtent = view.extent?.clone();
                console.log("FilterManager: Initial map extent stored on view ready.", this.initialExtent);
            }).catch(error => console.error("FilterManager: Error storing initial extent:", error));
        }
    }

    /**
     * Sets a callback function to be executed when filters are changed.
     * @param {function} callback - The function to call with the new definitionExpression.
     */
    onFilterChange(callback) {
        this.onFilterChangeCallback = callback;
    }

    /**
     * Main initialization method. Clears the container and builds all filters from the config.
     */
    async initializeFilters() {
        this.container.innerHTML = ''; // Clear previous content

        // Create a container for the filter buttons
        const filterControlsWrapper = document.createElement('div');
        filterControlsWrapper.className = 'filter-controls-wrapper';
        this.container.appendChild(filterControlsWrapper);

        // Build each filter UI component
        for (const config of CONFIG.filterConfig) {
            // Dynamically populate options if needed
            if (config.type === 'multi-select' && config.options.length === 0) {
                config.options = await this.getUniqueValues(config.field);
            }
            this.createFilter(config, filterControlsWrapper);
        }

        console.log("FilterManager: All filters initialized.");
    }

    /**
     * Creates a single filter component (dropdown with checkboxes or pick list).
     * @param {object} config - The configuration object for a single filter.
     * @param {HTMLElement} parent - The parent element to append the filter to.
     */
    createFilter(config, parent) {
        const wrapper = document.createElement('div');
        wrapper.className = 'filter-dropdown-wrapper';

        const dropdown = document.createElement('calcite-dropdown');
        dropdown.width = 'auto';
        
        const button = document.createElement('calcite-button');
        button.setAttribute('slot', 'trigger');
        button.id = `btn-${config.id}`;
        button.innerText = config.label;
        button.appearance = 'outline-fill';
        button.kind = 'neutral';
        
        const panel = document.createElement('calcite-dropdown-group');
        panel.setAttribute('slot', 'content');
        panel.selectionMode = 'multiple';

        const pickList = document.createElement('calcite-pick-list');
        pickList.filterEnabled = true; // Enable search within the list
        pickList.filterPlaceholder = `Filter ${config.label}...`;

        // Populate items
        config.items?.forEach(item => {
             const pickListItem = document.createElement('calcite-pick-list-item');
             pickListItem.label = item.label;
             // Use a composite value for grouped-checkbox type
             pickListItem.value = `${item.field}||${item.value}`;
             pickList.appendChild(pickListItem);
        });
        
        config.options?.forEach(option => {
            const pickListItem = document.createElement('calcite-pick-list-item');
            if(typeof option === 'object'){
                pickListItem.label = option.label;
                pickListItem.value = option.value;
            } else {
                pickListItem.label = option;
                pickListItem.value = option;
            }
            pickList.appendChild(pickListItem);
        });


        // Event Listener for selection changes
        pickList.addEventListener('calciteListItemChange', (event) => {
            const selectedItems = event.target.selectedItems.map(item => item.value);
            this.activeFilters.set(config.id, selectedItems);
            this.updateFilterButton(button, config.label, selectedItems.length);
            this.applyFilters();
        });
        
        // Assemble the component
        panel.appendChild(pickList);
        dropdown.appendChild(button);
        dropdown.appendChild(panel);
        wrapper.appendChild(dropdown);
        parent.appendChild(wrapper);

        this.filterElements.set(config.id, { wrapper, button, pickList });
    }

     /**
     * Updates a filter button's appearance based on active selections.
     * @param {HTMLElement} button - The button element to update.
     * @param {string} baseLabel - The default label for the button.
     * @param {number} count - The number of selected items.
     */
    updateFilterButton(button, baseLabel, count) {
        if (count > 0) {
            button.innerText = `${baseLabel} (${count})`;
            button.iconEnd = 'chevron-down-t';
            button.appearance = 'solid'; // Change appearance to indicate it's active
            button.kind = 'brand';
        } else {
            button.innerText = baseLabel;
            button.iconEnd = null;
            button.appearance = 'outline-fill';
            button.kind = 'neutral';
        }
    }


    /**
     * Fetches unique values for a given field from the feature layer.
     * @param {string} fieldName - The name of the field to query.
     * @returns {Promise<string[]>} A promise that resolves to an array of unique string values.
     */
    async getUniqueValues(fieldName) {
        if (!this.layer) return [];
        try {
            const query = new Query({
                where: "1=1",
                outFields: [fieldName],
                returnDistinctValues: true,
                orderByFields: [fieldName]
            });
            const results = await this.layer.queryFeatures(query);
            return results.features
                .map(feature => feature.attributes[fieldName])
                .filter(value => value !== null && value !== undefined && String(value).trim() !== "");
        } catch (error) {
            console.error(`FilterManager: Error fetching unique values for "${fieldName}":`, error);
            return [];
        }
    }

    /**
     * Constructs and applies the definitionExpression to the layer based on active filters.
     */
    async applyFilters() {
        const whereClauses = [];

        for (const [filterId, selectedValues] of this.activeFilters.entries()) {
            if (selectedValues.length === 0) continue;

            const config = CONFIG.filterConfig.find(c => c.id === filterId);
            if (!config) continue;

            let groupClause = '';
            if (config.type === 'multi-select') {
                const values = (config.dataType === 'string')
                    ? selectedValues.map(v => `'${v.replace(/'/g, "''")}'`).join(',')
                    : selectedValues.join(',');
                groupClause = `${config.field} IN (${values})`;
            } else if (config.type === 'grouped-checkbox') {
                 const orClauses = selectedValues.map(val => {
                    const [field, value] = val.split('||');
                    return `${field} = ${value}`;
                });
                groupClause = orClauses.join(' OR ');
            }
            
            if(groupClause) {
                whereClauses.push(`(${groupClause})`);
            }
        }

        const newDefinitionExpression = whereClauses.length > 0 ? whereClauses.join(" AND ") : "1=1";
        
        if (this.layer.definitionExpression !== newDefinitionExpression) {
            this.layer.definitionExpression = newDefinitionExpression;
            console.log("FilterManager: Applied definitionExpression:", newDefinitionExpression);
            await this.zoomToFilteredExtent(newDefinitionExpression === "1=1");
        }
        
        if (this.onFilterChangeCallback) {
            this.onFilterChangeCallback(newDefinitionExpression);
        }
    }
    
    /**
     * Zooms the map to the extent of the currently filtered features.
     * @param {boolean} isReset - If true, zooms to the initial full extent.
     */
    async zoomToFilteredExtent(isReset) {
        if (!this.view || !this.layer) return;

        if (isReset) {
            if (this.initialExtent) this.view.goTo(this.initialExtent);
            return;
        }

        try {
            const extentQuery = this.layer.createQuery();
            const { extent, count } = await this.layer.queryExtent(extentQuery);
            if (count > 0 && extent) {
                this.view.goTo(extent.expand(1.5));
            }
        } catch (error) {
            if (!error.name?.includes("AbortError")) {
                console.error("FilterManager: Error zooming to filtered extent:", error);
            }
        }
    }
    
    /**
     * PUBLIC METHOD: Resets all active filters and clears the UI.
     */
    resetAllFilters() {
        this.activeFilters.clear();
        
        // Reset UI components
        for (const [id, elements] of this.filterElements.entries()) {
            const config = CONFIG.filterConfig.find(c => c.id === id);
            elements.pickList.selectedItems = [];
            this.updateFilterButton(elements.button, config.label, 0);
        }

        this.applyFilters();
        console.log("FilterManager: All filters have been reset.");
    }
}
