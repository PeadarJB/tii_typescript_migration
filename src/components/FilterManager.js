// --- Importing Necessary Modules ---

// Import the CONFIG object from our application's configuration file.
// This CONFIG object holds important settings like layer IDs, field names, etc.
// The path "../config/appConfig.js" means "go up one directory from the current file,
// then into the 'config' directory, and find 'appConfig.js'".
import { CONFIG } from "../config/appConfig.js";

// The ArcGIS Maps SDK for JavaScript is modular. We import specific parts we need.
// Import the 'query' module from the ArcGIS REST API. This is a utility function
// that can be used to execute queries directly against a feature service URL.
// While we use layer.queryFeatures() in this example, understanding 'query' is good background.
// Note: This specific 'query' import is not strictly used in the current version of the code below,
// as we use 'this.layer.queryFeatures()'. It's kept here as an example of how you might import
// specific REST modules if needed for more direct service calls.
import * as query from "@arcgis/core/rest/query.js";

// Import the 'Query' class from the ArcGIS REST support module.
// This class is used to define the parameters for a query that we'll run against a feature layer.
// For example, what fields to get, any filters (where clause), if we want distinct values, etc.
import Query from "@arcgis/core/rest/support/Query.js";

// --- Class Definition ---

// In JavaScript, a 'class' is a blueprint for creating objects.
// This 'FilterManager' class will be responsible for creating, managing,
// and applying filters to our road network map layer.
export class FilterManager {
    // The 'constructor' is a special method that gets called automatically
    // when we create a new 'FilterManager' object (e.g., new FilterManager(...)).
    // It's used to set up the initial properties of the object.

    /**
     * JSDoc comment: This describes the constructor and its parameters for documentation.
     * @param {HTMLElement|string} container - The HTML element itself, or the ID (string) of the HTML element
     * where the filter dropdowns will be placed.
     * @param {__esri.MapView} view - The MapView instance from the ArcGIS SDK. This gives us context of the map.
     * (Currently not heavily used in this specific filter logic but good to have for future extensions).
     * @param {__esri.FeatureLayer} roadNetworkLayer - The specific ArcGIS FeatureLayer object that we want to filter.
     * This layer displays the road network on the map.
     */
    constructor(container, view, roadNetworkLayer) {
        // 'this' refers to the current instance of the FilterManager object being created.

        // Store the container element.
        // If 'container' is a string (an ID), find the HTML element with that ID.
        // Otherwise, assume 'container' is already the HTML element itself.
        this.container = typeof container === 'string' ? document.getElementById(container) : container;

        // Store the MapView instance.
        this.view = view;

        // Store the FeatureLayer instance (our road network layer).
        this.layer = roadNetworkLayer;

        // 'this.currentFilters' will be an object to keep track of the currently selected
        // filter values. For example: { "COUNTY": "Dublin", "Criticality_Rating_Num1": "High" }
        this.currentFilters = {};

        // 'this.onFilterChangeCallback' will hold a function that should be called whenever
        // the filters are updated. This allows other parts of our application (like the
        // StatisticsManager) to react to filter changes. It's initially null.
        this.onFilterChangeCallback = null;

        // Basic check: if the container element wasn't found, log an error and stop.
        // This prevents errors later if we try to add filters to a non-existent container.
        if (!this.container) {
            console.error("FilterManager: Container not found. Filters cannot be created.");
            return; // Exit the constructor early
        }
        // Log a message to the browser's developer console to confirm initialization.
        console.log("FilterManager initialized successfully.");
    }

    // --- Methods of the FilterManager Class ---

    /**
     * This method allows other parts of the application to provide a function (callback)
     * that will be executed whenever the filters are changed by the user.
     * For example, the StatisticsManager can use this to know when to update its stats.
     * @param {Function} callback - The function to be called. It will receive the new
     * definitionExpression (the filter query string) as an argument.
     */
    onFilterChange(callback) {
        // Store the provided callback function in our object's property.
        this.onFilterChangeCallback = callback;
    }

    /**
     * This is an 'async' function, meaning it can use the 'await' keyword
     * to pause execution until a Promise resolves (e.g., waiting for data from a server).
     * It sets up all the filter dropdowns in the UI.
     */
    async initializeFilters() {
        // Clear out any existing content in the filter container (e.g., placeholders like "Loading Filters...").
        this.container.innerHTML = '';

        // --- Create individual filters ---
        // We use 'await' because 'createDropdownFilter' might involve asynchronous operations
        // like 'getUniqueValues' which fetches data. This ensures filters are created sequentially.

        // Create a dropdown filter for the "Criticality" field.
        // - "Criticality" is the user-friendly label for the dropdown.
        // - CONFIG.fields.criticality is the actual field name from our config (e.g., "Criticality_Rating_Num1").
        // - CONFIG.filterOptions.criticality provides a predefined list of options for this filter (e.g., ["High", "Medium", "Low"]).
        await this.createDropdownFilter(
            "Criticality", // Label text
            CONFIG.fields.criticality, // Field name in the data
            CONFIG.filterOptions.criticality // Options for the dropdown (static list)
        );

        // Create a dropdown filter for the "County" field.
        // For this one, the options are fetched dynamically from the layer's data
        // by calling 'await this.getUniqueValues(CONFIG.fields.county)'.
        await this.createDropdownFilter(
            "County", // Label text
            CONFIG.fields.county, // Field name in the data
            await this.getUniqueValues(CONFIG.fields.county) // Options (dynamic list)
        );

        // TODO: Placeholder for creating more filters as per your application needs.
        // You would follow the same pattern as above for fields like "Subnet", "Lifeline", "Route".
        // For boolean fields like "Flood Affected", you might use a dropdown with "Yes"/"No",
        // or if it's based on multiple fields (like cfram_m_f_0010), the logic will be more complex.
        // For example:
        // await this.createDropdownFilter("Subnet", CONFIG.fields.subnet, await this.getUniqueValues(CONFIG.fields.subnet));
        // await this.createDropdownFilter("Lifeline", CONFIG.fields.lifeline, await this.getUniqueValues(CONFIG.fields.lifeline));

        console.log("FilterManager: All filter UI elements have been initialized.");
    }

    /**
     * Asynchronously fetches a list of unique (distinct) values for a specified field
     * from the roadNetworkLayer. This is used to populate dropdown lists dynamically,
     * so users only see relevant filter options.
     * @param {string} fieldName - The name of the field in the feature layer (e.g., "COUNTY").
     * @returns {Promise<string[]>} A promise that, when resolved, gives an array of unique string values.
     * Returns an empty array if there's an error or no layer.
     */
    async getUniqueValues(fieldName) {
        // If the layer isn't available, we can't query it, so return an empty array.
        if (!this.layer) {
            console.warn("FilterManager: Layer not available for getUniqueValues.");
            return [];
        }

        // Create a new Query object to define what we want from the layer.
        const uniqueValuesQuery = new Query({
            // 'where: "1=1"' is a common SQL trick meaning "get all records" (no filter on the query itself).
            // We might refine this if we only want unique values based on *already applied static filters*.
            where: "1=1",
            // 'outFields: [fieldName]' specifies that we are only interested in the values from this one field.
            outFields: [fieldName],
            // 'returnDistinctValues: true' is the key part that tells the server to only send back unique values.
            returnDistinctValues: true,
            // 'orderByFields: [fieldName]' is optional but nice: it sorts the unique values alphabetically
            // before returning them, making the dropdown list look cleaner.
            orderByFields: [fieldName]
        });

        try {
            // 'await this.layer.queryFeatures(uniqueValuesQuery)' sends the query to the ArcGIS server
            // and waits for the results (a "FeatureSet").
            const results = await this.layer.queryFeatures(uniqueValuesQuery);

            // 'results.features' is an array of "Graphic" objects. Each graphic has 'attributes'.
            // We .map() over this array to extract just the value of our fieldName from each feature's attributes.
            // .filter(value => value != null) removes any null or undefined values from the list.
            return results.features.map(feature => feature.attributes[fieldName])
                                 .filter(value => value != null);
        } catch (error) {
            // If anything goes wrong during the query (network issue, server error, misconfigured layer),
            // log the error and return an empty array so the application doesn't completely break.
            console.error(`FilterManager: Error fetching unique values for field "${fieldName}":`, error);
            return [];
        }
    }

    /**
     * Dynamically creates a single dropdown filter (using Calcite Components)
     * and adds it to the filter container.
     * @param {string} labelText - The human-readable text for the filter's label (e.g., "Select County").
     * @param {string} fieldName - The actual name of the field in the data that this filter will control.
     * @param {string[]} options - An array of strings that will become the options in the dropdown.
     */
    async createDropdownFilter(labelText, fieldName, options) {
        // Create a unique ID for the HTML select element for potential future use (e.g., direct manipulation).
        const filterId = `filter-${fieldName.toLowerCase().replace(/[^a-z0-9-_]/g, '')}`; // Sanitize fieldName for ID

        // --- Create Calcite Label ---
        // 'document.createElement("calcite-label")' creates a new Calcite Label HTML element.
        // Calcite Components are custom HTML elements provided by Esri for consistent UI.
        const label = document.createElement("calcite-label");
        // 'setAttribute' sets HTML attributes. 'layout: "inline"' helps with alignment.
        label.setAttribute("layout", "inline");
        // 'innerText' sets the visible text of the label.
        label.innerText = `${labelText}: `; // e.g., "County: "

        // --- Create Calcite Select (Dropdown) ---
        const select = document.createElement("calcite-select");
        select.setAttribute("id", filterId);
        // The 'label' attribute on calcite-select is important for accessibility (screen readers).
        // It provides a description of the select element even if a visual label isn't directly associated.
        select.setAttribute("label", `${labelText} filter selection`);

        // --- Create the "All" Option ---
        // It's good practice to have an option to clear the filter for this specific field.
        const allOption = document.createElement("calcite-option");
        // An empty 'value' (value="") will signify that no specific filter should be applied for this field.
        allOption.setAttribute("value", "");
        allOption.innerText = `All ${labelText}s`; // e.g., "All Countys"
        // 'setAttribute("selected", "")' makes this the default selected option when the dropdown first appears.
        allOption.setAttribute("selected", "");
        // 'appendChild' adds the 'allOption' inside the 'select' element.
        select.appendChild(allOption);

        // --- Populate with other options ---
        // 'options.forEach(...)' loops through each string in the 'options' array.
        options.forEach(optionValue => {
            const optionElement = document.createElement("calcite-option");
            optionElement.setAttribute("value", optionValue); // The actual value to filter by
            optionElement.innerText = optionValue; // The text displayed in the dropdown
            select.appendChild(optionElement);
        });

        // --- Event Listener for Dropdown Changes ---
        // 'addEventListener' attaches an event handler function that will run
        // whenever the 'calciteSelectChange' event occurs on this dropdown
        // (i.e., when the user picks a new option).
        select.addEventListener("calciteSelectChange", (event) => {
            // 'event.target' is the 'calcite-select' element that triggered the event.
            // 'event.target.selectedOption.value' gets the 'value' attribute of the chosen <calcite-option>.
            const selectedValue = event.target.selectedOption.value;

            // Update our 'this.currentFilters' object.
            if (selectedValue === "") {
                // If "All" was selected (empty value), remove this field from our active filters.
                delete this.currentFilters[fieldName];
            } else {
                // Otherwise, store the selected value for this field.
                this.currentFilters[fieldName] = selectedValue;
            }
            // After updating the internal state of filters, call 'this.applyFilters()'
            // to update the map layer.
            this.applyFilters();
        });

        // --- Add to HTML Page ---
        // Create a simple 'div' to wrap the label and select for better layout control if needed.
        const wrapper = document.createElement('div');
        // Basic styling for the wrapper to make filters appear side-by-side.
        // It's often better to do this with CSS classes defined in your stylesheet.
        wrapper.style.display = 'inline-block';
        wrapper.style.marginRight = '15px'; // Some spacing between filters
        wrapper.appendChild(label);
        wrapper.appendChild(select);

        // Add the complete filter UI (wrapper div) to the main filter container on the page.
        this.container.appendChild(wrapper);
    }

    /**
     * Constructs a SQL-like WHERE clause (definition expression) based on the
     * 'this.currentFilters' object and applies it to the feature layer.
     * This is what actually filters the data shown on the map.
     */
    applyFilters() {
        // 'definitionExpressions' will be an array of individual filter conditions,
        // like ["COUNTY = 'Dublin'", "Criticality_Rating_Num1 = 'High'"].
        let definitionExpressions = [];

        // 'for...in' loop iterates over the keys (field names) in the 'this.currentFilters' object.
        for (const field in this.currentFilters) {
            const value = this.currentFilters[field]; // Get the selected value for that field.

            // Construct the SQL-like condition for this field.
            // It's important to handle data types correctly:
            // - String values in SQL need to be enclosed in single quotes (e.g., field = 'value').
            // - Numeric values do not need quotes (e.g., field = 123).
            // This example assumes string values and also handles cases where the string value
            // itself might contain a single quote by escaping it (replacing ' with '').
            if (typeof value === 'string') {
                // Example: if field is "COUNTY" and value is "St. John's", this becomes:
                // "COUNTY = 'St. John''s'"
                definitionExpressions.push(`${field} = '${value.replace(/'/g, "''")}'`);
            } else {
                // For numbers or other non-string types (booleans might need special handling depending on backend)
                definitionExpressions.push(`${field} = ${value}`);
            }
        }

        // Combine all individual filter conditions with "AND".
        // If there are any active filters, join them: "CONDITION_1 AND CONDITION_2 AND ..."
        // If 'definitionExpressions' array is empty (no filters active),
        // set 'newDefinitionExpression' to "1=1", which means "show all features".
        const newDefinitionExpression = definitionExpressions.length > 0
            ? definitionExpressions.join(" AND ")
            : "1=1";

        // 'this.layer.definitionExpression' is a property of the ArcGIS FeatureLayer.
        // Setting it tells the layer to only display features that match this condition.
        // The map will automatically update to reflect this new filter.
        this.layer.definitionExpression = newDefinitionExpression;
        console.log("FilterManager: Applied definitionExpression to layer:", newDefinitionExpression);

        // --- Notify External Components ---
        // If a callback function was registered via 'onFilterChange()', call it now
        // and pass the new definition expression. This lets other parts of the app
        // (like the StatisticsManager) know that the filters have changed.
        if (this.onFilterChangeCallback) {
            this.onFilterChangeCallback(newDefinitionExpression);
        }
    }
}