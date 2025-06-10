// src/components/FilterManager.js

// These imports bring in external tools we need:
// - CONFIG contains our app's settings and field names
// - Query helps us ask the database for specific data
import { CONFIG } from "../config/appConfig.js";
import Query from "@arcgis/core/rest/support/Query.js";

export class FilterManager {
    constructor(container, view, roadNetworkLayer) {
        // SETUP: Get the HTML container where filters will be displayed
        this.container = typeof container === 'string' ? document.getElementById(container) : container;
        
        // SETUP: Store references to the map view and data layer
        this.view = view; // The map display
        this.layer = roadNetworkLayer; // The data we're filtering
        
        // SETUP: Initialize tracking variables
        this.currentFilters = {}; // Keeps track of what filters are currently active
        this.onFilterChangeCallback = null; // Function to call when filters change
        this.initialExtent = null; // Remember the original map zoom/position

        // ERROR CHECKING: Make sure we have a valid container
        if (!this.container) {
            console.error("FilterManager: Container not found. Filters cannot be created.");
            return;
        }
        
        // ERROR CHECKING: Warn if view or layer is missing (but continue anyway)
        if (!this.view || !this.layer) {
            console.error("FilterManager: View or Layer is not provided. Zoom functionality may be affected.");
            // Note: We don't return here because basic filtering might still work
        }

        // SAVE INITIAL MAP POSITION: Store where the map starts so we can return to it later
        if (this.view && this.view.extent) {
            // If the map extent is immediately available, save it now
            this.initialExtent = this.view.extent.clone();
            console.log("FilterManager: Initial map extent stored directly.", this.initialExtent);
        } else if (this.view) {
            // If the map isn't ready yet, wait for it and then save the extent
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

    // MAIN INITIALIZATION: Create all the filter dropdown menus
    async initializeFilters() {
        // Clear any existing filter UI elements
        this.container.innerHTML = '';

        // DEFINE WHAT FILTERS TO CREATE: Set up configuration for each filter type
        const filterConfigs = [
            { 
                label: "Affected by Flooding",  // What users see
                fieldName: CONFIG.fields.floodAffected,  // Database field name
                options: CONFIG.filterOptions.floodAffected, 
                dataType: 'string'  // Text data
            },
            { 
                label: "County",  // What users see
                fieldName: CONFIG.fields.county,  // Database field name
                options: await this.getUniqueValues(CONFIG.fields.county), // Get all possible values
                dataType: 'string'  // Text data
            },
            { 
                label: "Criticality", 
                fieldName: CONFIG.fields.criticality, 
                options: CONFIG.filterOptions.criticality, // Pre-defined options from config
                dataType: 'number'  // Numeric data
            },
            { 
                label: "Subnet", 
                fieldName: CONFIG.fields.subnet, 
                options: CONFIG.filterOptions.subnet, // Pre-defined options from config
                dataType: 'number'  // Numeric data
            },
            { 
                label: "Lifeline Route", 
                fieldName: CONFIG.fields.lifeline, 
                options: CONFIG.filterOptions.lifeline, // Pre-defined options from config
                dataType: 'number'  // Numeric data
            },
            { 
                label: "Route",  // What users see
                fieldName: CONFIG.fields.route,  // Database field name
                options: await this.getUniqueValues(CONFIG.fields.route), // Get all possible values
                dataType: 'string'  // Text data
            },
            { 
                label: "Historic Flooding (4.5%)", 
                fieldName: CONFIG.fields.historic_intersection_m, 
                options: CONFIG.filterOptions.historic_intersection_m, // Pre-defined options from config
                dataType: 'number'  // Numeric data
            },
            { 
                label: "Historic Flooding (8.5%)", 
                fieldName: CONFIG.fields.historic_intersection_h, 
                options: CONFIG.filterOptions.historic_intersection_h, // Pre-defined options from config
                dataType: 'number'  // Numeric data
            },
            // More filters can be added here following the same pattern
        ];

        // CREATE EACH FILTER: Loop through and build the dropdown menus
        for (const config of filterConfigs) {
            await this.createDropdownFilter(config.label, config.fieldName, config.options);
        }

        console.log("FilterManager: All filter UI elements have been initialized.");
    }

    // DATA RETRIEVAL: Get all unique values from a database field for dropdown options
    async getUniqueValues(fieldName) {
        // Safety check: Make sure we have a data layer to query
        if (!this.layer) {
            console.warn("FilterManager: Layer not available for getUniqueValues.");
            return [];
        }

        // BUILD DATABASE QUERY: Ask for all unique values in this field
        const uniqueValuesQuery = new Query({
            where: "1=1", // Get all records (1=1 is always true)
            outFields: [fieldName], // Only return this specific field
            returnDistinctValues: true, // Remove duplicates
            orderByFields: [fieldName] // Sort the results alphabetically
        });

        try {
            // EXECUTE QUERY: Ask the database for the data
            const results = await this.layer.queryFeatures(uniqueValuesQuery);
            
            // PROCESS RESULTS: Extract the values and clean them up
            return results.features
                .map(feature => feature.attributes[fieldName]) // Get the field value from each record
                .filter(value => value !== null && value !== undefined && String(value).trim() !== ""); // Remove empty values
        } catch (error) {
            console.error(`FilterManager: Error fetching unique values for field "${fieldName}":`, error);
            return []; // Return empty array if something goes wrong
        }
    }

    // UI CREATION: Build a single dropdown filter with all its options
    async createDropdownFilter(labelText, fieldName, options) {
        // CREATE UNIQUE ID: Make a clean ID for this filter element
        const filterId = `filter-${fieldName.toLowerCase().replace(/[^a-z0-9-_]/g, '')}`;
        
        // CREATE LABEL: The text that appears next to the dropdown
        const label = document.createElement("calcite-label");
        label.setAttribute("layout", "inline");
        label.innerText = `${labelText}: `;

        // CREATE DROPDOWN: The actual selection menu
        const select = document.createElement("calcite-select");
        select.setAttribute("id", filterId);
        select.setAttribute("label", `${labelText} filter selection`);

        // ADD "ALL" OPTION: Default option that shows everything (no filter)
        const allOption = document.createElement("calcite-option");
        allOption.setAttribute("value", ""); // Empty value means "no filter"
        allOption.innerText = `-`;
        allOption.setAttribute("selected", ""); // Make this the default selection
        select.appendChild(allOption);

        // ADD SPECIFIC OPTIONS: Add each possible filter value to the dropdown
        options.forEach(optionInput => {
            const optionElement = document.createElement("calcite-option");
            
            // HANDLE DIFFERENT OPTION FORMATS: Some options are simple values, others are objects
            if (typeof optionInput === 'object' && optionInput !== null && 'value' in optionInput && 'label' in optionInput) {
                // Object format: {value: "1", label: "High Priority"}
                optionElement.setAttribute("value", optionInput.value);
                optionElement.innerText = optionInput.label;
            } else {
                // Simple format: just the value itself
                optionElement.setAttribute("value", optionInput);
                optionElement.innerText = optionInput;
            }
            select.appendChild(optionElement);
        });

        // ADD EVENT LISTENER: React when user selects a different option
        select.addEventListener("calciteSelectChange", (event) => {
            const selectedValue = event.target.value;
            
            if (selectedValue === "") {
                // USER SELECTED "ALL": Remove this filter
                delete this.currentFilters[fieldName];
            } else {
                // USER SELECTED SPECIFIC VALUE: Store this filter
                this.currentFilters[fieldName] = { value: selectedValue, fieldName: fieldName };
            }
            
            // APPLY THE CHANGES: Update the map display with new filters
            this.applyFilters();
        });

        // ADD TO PAGE: Create a wrapper and add the filter to the container
        const wrapper = document.createElement('div');
        wrapper.style.display = 'inline-block'; // Display filters side by side
        wrapper.style.marginRight = '15px'; // Add spacing between filters
        wrapper.appendChild(label);
        wrapper.appendChild(select);
        this.container.appendChild(wrapper);
    }

    // FILTER APPLICATION: Take all active filters and apply them to the map layer
    async applyFilters() {
        let definitionExpressionsArray = []; // Will hold SQL-like filter statements
        let allFiltersEmpty = true; // Track if any filters are active

        // BUILD FILTER EXPRESSIONS: Convert each active filter into a database query
        for (const fieldKey in this.currentFilters) {
            allFiltersEmpty = false; // We found at least one active filter
            const filterItem = this.currentFilters[fieldKey];
            const { value, fieldName } = filterItem;
            
            // DETERMINE DATA TYPE: Figure out if this field contains numbers or text
            let isNumeric = false;
            if (CONFIG.fields.criticality === fieldName) {
                isNumeric = true; // Criticality field contains numbers
            }
            // Add more numeric field checks here if needed

            // CREATE PROPER SQL SYNTAX: Format the filter expression correctly
            if (isNumeric) {
                // NUMERIC FIELDS: No quotes needed around numbers
                definitionExpressionsArray.push(`${fieldName} = ${value}`);
            } else {
                // TEXT FIELDS: Wrap in single quotes and escape any quotes in the value
                definitionExpressionsArray.push(`${fieldName} = '${String(value).replace(/'/g, "''")}'`);
            }
        }

        // COMBINE ALL FILTERS: Join multiple filters with "AND" (all must be true)
        const newDefinitionExpression = definitionExpressionsArray.length > 0
            ? definitionExpressionsArray.join(" AND ")
            : ""; // Empty string means "show everything"

        // APPLY TO LAYER: Tell the map layer to use this filter
        this.layer.definitionExpression = newDefinitionExpression;
        console.log("FilterManager: Applied definitionExpression to layer:", newDefinitionExpression);

        // ZOOM TO FILTERED RESULTS: Automatically zoom the map to show filtered data
        if (!allFiltersEmpty && this.view && this.layer && this.layer.visible) {
            try {
                // QUERY FOR EXTENT: Find the geographic bounds of filtered features
                const extentQuery = this.layer.createQuery();
                const results = await this.layer.queryExtent(extentQuery);

                if (results && results.count > 0 && results.extent) {
                    // ZOOM TO RESULTS: Move map to show all filtered features
                    await this.view.goTo(results.extent.expand(1.5)); // 1.5x padding around results
                    console.log("FilterManager: Zoomed to filtered extent.");
                } else if (results && results.count === 0) {
                    // NO RESULTS FOUND: Optionally return to original view
                    console.log("FilterManager: No features match the current filters. Not zooming.");
                    if (this.initialExtent) {
                        await this.view.goTo(this.initialExtent);
                        console.log("FilterManager: No features found, zoomed to initial extent.");
                    }
                } else {
                    console.log("FilterManager: Could not get extent for filtered features, or layer might be empty after filter.");
                }
            } catch (error) {
                console.error("FilterManager: Error zooming to filtered extent:", error);
            }
        } else if (allFiltersEmpty && this.view && this.initialExtent) {
            // ALL FILTERS CLEARED: Return to the original map view
            await this.view.goTo(this.initialExtent);
            console.log("FilterManager: All filters cleared. Zoomed to initial map extent.");
        }

        // NOTIFY OTHER COMPONENTS: Tell other parts of the app that filters changed
        if (this.onFilterChangeCallback) {
            this.onFilterChangeCallback(newDefinitionExpression);
        }
    }
    getActiveFiltersText() {
        const activeFilters = [];
        for (const fieldKey in this.currentFilters) {
            const filterItem = this.currentFilters[fieldKey];
            const selectElement = this.container.querySelector(`#filter-${fieldKey.toLowerCase().replace(/[^a-z0-9-_]/g, '')}`);
            if (selectElement) {
                const label = selectElement.selectedOption?.textContent || filterItem.value;
                const labelText = selectElement.previousElementSibling?.innerText || fieldKey;
                activeFilters.push(`${labelText.replace(':', '')}: ${label}`);
            }
        }
        return activeFilters;
    }
}