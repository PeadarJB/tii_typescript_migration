// --- Importing Necessary Modules ---

// Import the CONFIG object from our application's configuration file.
// This holds important settings like layer IDs, field names we'll use for statistics, etc.
import { CONFIG } from "../config/appConfig.js";

// Import the 'Query' class from the ArcGIS REST support module.
// This class helps us define the parameters for querying a feature layer,
// especially when we want to get statistics.
import Query from "@arcgis/core/rest/support/Query.js";

// Placeholder for importing a charting library like Chart.js if you decide to use it.
// To use Chart.js, you'd first install it (npm install chart.js) and then uncomment this line.
// import Chart from 'chart.js/auto'; // 'auto' usually handles necessary registrations for Chart.js v3+

// --- Class Definition ---

// This 'StatisticsManager' class will be responsible for calculating statistical information
// from the roadNetworkLayer (e.g., total length, counts) and displaying it in the dashboard.
export class StatisticsManager {
    // The 'constructor' is called when we create a new 'StatisticsManager' object.
    // It sets up the initial properties for our statistics manager.

    /**
     * JSDoc comment: Describes the constructor and its parameters.
     * @param {HTMLElement|string} indicatorContainer - The HTML element itself, or its ID (string),
     * where general statistics (like total length, count) will be displayed.
     * @param {HTMLElement|string} chartContainer - The HTML element itself, or its ID (string),
     * where charts (like a pie chart) will be rendered.
     * @param {__esri.FeatureLayer} roadNetworkLayer - The ArcGIS FeatureLayer object representing the road network.
     * This is the layer from which we'll calculate statistics.
     */
    constructor(indicatorContainer, chartContainer, roadNetworkLayer) {
        // 'this' refers to the current instance of the StatisticsManager.

        // Store the HTML element for displaying main indicator boxes.
        // If a string ID is passed, get the element; otherwise, assume it's the element itself.
        this.indicatorContainer = typeof indicatorContainer === 'string' ? document.getElementById(indicatorContainer) : indicatorContainer;

        // Store the HTML element for displaying charts.
        this.chartContainer = typeof chartContainer === 'string' ? document.getElementById(chartContainer) : chartContainer;

        // Store the reference to the road network feature layer.
        this.layer = roadNetworkLayer;

        // Placeholder property to hold an instance of a chart (e.g., from Chart.js) if we create one.
        // this.pieChartInstance = null;

        // Basic check: if the containers weren't found, log an error and stop.
        if (!this.indicatorContainer || !this.chartContainer) {
            console.error("StatisticsManager: One or more containers (for indicators or charts) were not found in the HTML.");
            return; // Exit constructor
        }
        console.log("StatisticsManager initialized successfully.");
    }

    // --- Methods of the StatisticsManager Class ---

    /**
     * This is an 'async' function (can use 'await') that updates all statistical displays.
     * It takes a 'definitionExpression' which is a SQL-like WHERE clause (e.g., "COUNTY = 'Dublin'").
     * This expression comes from the FilterManager and tells us which features to include in the stats.
     * By default, if no expression is passed, it's "1=1" (meaning "include all features").
     * @param {string} definitionExpression - The current filter criteria.
     */
    async updateStatistics(definitionExpression = "1=1") {
        // If the layer isn't available (e.g., not loaded yet or an error occurred), do nothing.
        if (!this.layer) {
            console.warn("StatisticsManager: Road network layer is not available. Cannot update statistics.");
            return;
        }

        // Provide immediate feedback to the user that statistics are being loaded.
        // 'innerHTML' allows us to directly set the HTML content of an element.
        this.indicatorContainer.innerHTML = '<p><em>Loading statistics...</em></p>';

        try {
            // --- Constructing a Statistical Query ---
            // We want to ask the ArcGIS server to calculate some statistics for us.
            // This is more efficient than downloading all features and calculating in the browser,
            // especially for large datasets.

            const statsQuery = new Query({
                // 'where': This is the filter condition. Only features matching this expression
                // will be included in the statistical calculation.
                where: definitionExpression,

                // 'outStatistics': This is an array that defines what statistics we want.
                // Each object in the array defines one statistical calculation.
                outStatistics: [
                    {
                        // 'statisticType': The type of calculation (e.g., "sum", "count", "avg", "min", "max").
                        statisticType: "sum",
                        // 'onStatisticField': The field in the feature layer to perform the calculation on.
                        // We get the actual field name from our CONFIG object.
                        onStatisticField: CONFIG.fields.length, // e.g., a field named "Shape_Length" or "LENGTH_KM"
                        // 'outStatisticFieldName': The name we want for this calculated statistic in the results.
                        // This can be any name we choose.
                        outStatisticFieldName: "total_length_affected"
                    },
                    {
                        statisticType: "count",
                        // For "count", 'onStatisticField' can be any field that is present in all features,
                        // or often people use the primary key (ObjectID) or an indexed field.
                        // Here, we use the same length field, but it's just counting records.
                        onStatisticField: CONFIG.fields.length,
                        outStatisticFieldName: "total_segments_affected"
                    }
                    // You can add more statistic definitions here for other calculations.
                ]
            });

            // --- Executing the Query ---
            // 'await this.layer.queryFeatures(statsQuery)' sends our statistical query to the ArcGIS server.
            // The server processes it and sends back a result (a "FeatureSet").
            // For statistical queries, this FeatureSet usually contains just ONE "feature"
            // whose "attributes" object holds all the calculated statistics.
            const results = await this.layer.queryFeatures(statsQuery);

            // --- Processing and Displaying Results ---
            // Check if the server returned any features (it should return one feature with attributes for stats).
            if (results.features.length > 0) {
                // Get the attributes from the first (and usually only) feature in the results.
                const stats = results.features[0].attributes;

                // Extract the calculated statistics using the 'outStatisticFieldName' we defined.
                // Use '|| 0' to default to 0 if a statistic is unexpectedly null or undefined.
                const totalLength = stats.total_length_affected || 0;
                const segmentCount = stats.total_segments_affected || 0;

                // Call another method to actually update the HTML with these values.
                this.displayMainIndicators(totalLength, segmentCount);

                // TODO: Placeholder for where you'll add more advanced statistics.
                // For example, to get stats grouped by "Criticality" or "County" for a pie chart,
                // you would add 'groupByFieldsForStatistics: [CONFIG.fields.criticality]' to your Query object.
                // The results would then be an array of features, one for each group.
                // Examples:
                // - Percentage of total network (this needs the *overall* total length, which you might query once at the start).
                // - Statistics by flood prediction model (would involve querying different fields or using different `where` clauses).
                // - Managing authority pie chart (query statistics grouped by the managing authority field).

            } else {
                // If no features matched the filter (e.g., "County = 'NonExistentCounty'"),
                // the stats query might return no features. In this case, display 0 for all indicators.
                this.displayMainIndicators(0, 0);
                console.log("StatisticsManager: No features matched the current filter for statistics.");
            }
        } catch (error) {
            // If an error occurs during the query (network, server, bad field name, etc.),
            // log it to the console and display an error message in the UI.
            console.error("StatisticsManager: Error calculating statistics:", error);
            this.indicatorContainer.innerHTML = `<p style="color: red;">Error loading statistics.</p>`;
        }
    }

    /**
     * Updates the HTML content of the 'indicatorContainer' to display the main summary statistics.
     * This uses JavaScript template literals (backticks ``) to create an HTML string.
     * @param {number} totalLength - The total length of the road network affected by current filters (in meters, presumably).
     * @param {number} segmentCount - The number of road segments affected by current filters.
     */
    displayMainIndicators(totalLength, segmentCount) {
        // Convert totalLength from meters (assuming it is) to kilometers and format to one decimal place.
        // 'toFixed(1)' converts a number to a string, keeping one decimal place.
        const totalLengthKm = (totalLength / 1000).toFixed(1);

        // Set the innerHTML of the indicator container with the new statistics.
        // This will replace any previous content (like "Loading statistics...").
        // We use CSS classes like "indicator-box", "value", "label" for styling these elements.
        // You would define these classes in your main.css file.
        this.indicatorContainer.innerHTML = `
            <div class="indicator-box">
                <div class="value">${totalLengthKm} km</div> 
                <div class="label">Total Network Affected</div>
            </div>
            <div class="indicator-box">
                <div class="value">${segmentCount}</div>
                <div class="label">Affected Road Segments</div>
            </div>
            `;
        // Reminder: The actual styling for '.indicator-box', '.value', '.label'
        // should be defined in your CSS file (e.g., main.css or panels.css).
    }

    // TODO: Placeholder for methods to create and update charts.
    // For example, if using Chart.js:
    // async updatePieChart(definitionExpression = "1=1") {
    //     // 1. Query data grouped by the category for the pie chart (e.g., 'Lifeline').
    //     //    This query would use 'groupByFieldsForStatistics' and 'outStatistics' (e.g., sum of length per category).
    //     // 2. Process the results into the format Chart.js expects (labels, data arrays).
    //     // 3. If 'this.pieChartInstance' exists, update its data and call .update().
    //     // 4. If not, create a new Chart instance:
    //     //    this.pieChartInstance = new Chart(this.chartContainer.getContext('2d'), { /* chart config */ });
    // }
}