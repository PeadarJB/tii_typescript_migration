// src/components/StatisticsManager.js

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
// from the roadNetworkLayer (e.g., count of affected segments and derived length)
// and displaying it in the dashboard.
export class StatisticsManager {
    // The 'constructor' is called when we create a new 'StatisticsManager' object.
    // It sets up the initial properties for our statistics manager.

    /**
     * JSDoc comment: Describes the constructor and its parameters.
     * @param {HTMLElement|string} indicatorContainer - The HTML element itself, or its ID (string),
     * where general statistics will be displayed.
     * @param {HTMLElement|string} chartContainer - The HTML element itself, or its ID (string),
     * where charts (like a pie chart) will be rendered. (Currently a placeholder for future use)
     * @param {__esri.FeatureLayer} roadNetworkLayer - The ArcGIS FeatureLayer object representing the road network.
     * This is the layer from which we'll calculate statistics.
     */
    constructor(indicatorContainer, chartContainer, roadNetworkLayer) {
        // 'this' refers to the current instance of the StatisticsManager.

        this.indicatorContainer = typeof indicatorContainer === 'string' ? document.getElementById(indicatorContainer) : indicatorContainer;
        this.chartContainer = typeof chartContainer === 'string' ? document.getElementById(chartContainer) : chartContainer;
        this.layer = roadNetworkLayer;
        // this.pieChartInstance = null; // To hold a Chart.js instance later

        if (!this.indicatorContainer) { // chartContainer can be optional if not used yet
            console.error("StatisticsManager: Indicator container not found.");
            return; 
        }
        console.log("StatisticsManager initialized successfully.");
    }

    // --- Methods of the StatisticsManager Class ---

    /**
     * Main public method to update all statistics displays.
     * It fetches and displays stats for general flood intersection and CFRAM specific flood type.
     * @param {string} baseDefinitionExpression - The current filter criteria from user selections (e.g., "COUNTY = 'Dublin'").
     * This is combined with specific conditions for each statistic.
     */
    async updateAllStatistics(baseDefinitionExpression = "1=1") {
        // If the layer isn't available, do nothing.
        if (!this.layer) {
            console.warn("StatisticsManager: Road network layer is not available. Cannot update statistics.");
            this.indicatorContainer.innerHTML = `<p style="color: orange;">Statistics unavailable: Layer not ready.</p>`;
            return;
        }

        // Provide immediate feedback to the user that statistics are being loaded.
        this.indicatorContainer.innerHTML = '<p><em>Loading all statistics...</em></p>';

        try {
            // --- Calculate Statistics for "future_flood_intersection" ---
            // We pass:
            // 1. baseDefinitionExpression: Current user filters (e.g., County, Criticality).
            // 2. Specific condition: Only count segments where 'future_flood_intersection' is 1.
            // 3. Label for this statistic set.
            // 4. Alias for the output count field from the query.
            const generalFloodStats = await this.querySegmentCountAndDerivedLength(
                baseDefinitionExpression,
                `${CONFIG.fields.floodAffected} = 1`, 
                "Any Future Flood Intersection", 
                "count_general_flood" 
            );

            // --- Calculate Statistics for "cfram_f_m_0010" ---
            const cframFluvialStats = await this.querySegmentCountAndDerivedLength(
                baseDefinitionExpression,
                `${CONFIG.fields.cfram_m_f_0010} = 1`,
                "CFRAM Fluvial Model (0.1% AEP)",
                "count_cfram_fluvial"
            );
            
            // TODO: Add more calls to querySegmentCountAndDerivedLength for other binary fields
            // if needed, for example:
            // const anotherFloodStat = await this.querySegmentCountAndDerivedLength(
            //     baseDefinitionExpression,
            //     `${CONFIG.fields.another_binary_field} = 1`,
            //     "Label for Another Flood Stat",
            //     "count_another_flood"
            // );

            // Once all stats are fetched, update the UI.
            this.displayAllStatsUI(generalFloodStats, cframFluvialStats /*, pass other stats here */);

        } catch (error) {
            // Catch any errors that occurred during the process.
            console.error("StatisticsManager: Error in updateAllStatistics pipeline:", error);
            this.indicatorContainer.innerHTML = `<p style="color: red;">Error loading statistics. (Check console)</p>`;
        }
    }

    /**
     * Helper function to query the count of segments for a specific condition 
     * (combined with base filters) and calculate the derived length.
     * @param {string} baseDefinitionExpression - Filters from user selections.
     * @param {string} specificCondition - Additional condition for this stat set (e.g., "binary_field = 1").
     * @param {string} statLabel - A label for this statistic set (used for display/logging).
     * @param {string} outCountFieldName - An alias for the count statistic in the query result.
     * @returns {Promise<object>} A promise resolving to an object with:
     * { count: number, derivedLengthKm: number, label: string }
     * Returns 0 for count/length if no features match or on error.
     */
    async querySegmentCountAndDerivedLength(baseDefinitionExpression, specificCondition, statLabel, outCountFieldName) {

        // Sanitize baseDefinitionExpression: if it's empty or just whitespace, use "1=1"
        const effectiveBaseExpression = (baseDefinitionExpression && baseDefinitionExpression.trim() !== "") 
                                        ? baseDefinitionExpression 
                                        : "1=1";

        // Combine the effective base filters with the specific condition for this particular statistic.
        const combinedWhereClause = `(${effectiveBaseExpression}) AND (${specificCondition})`;
        
        // Log what we're about to query for easier debugging.
        console.log(`StatisticsManager: Querying for "${statLabel}" with WHERE clause: ${combinedWhereClause}`);

        // Define the statistical query. We only need to count the segments.
        const statsQuery = new Query({
            where: combinedWhereClause,
            outStatistics: [
                {
                    statisticType: "count",
                    // For 'count', 'onStatisticField' can be any field that is reliably present in your records.
                    // 'OBJECTID' is often the best choice if you know it.
                    // Otherwise, a field like the one used for 'Route' or 'County' from your CONFIG is okay,
                    // as long as it's guaranteed to be there for the features you're counting.
                    // Let's use CONFIG.fields.route as an example from your config.
                    onStatisticField: CONFIG.fields.route, // Or "OBJECTID" or CONFIG.fields.county
                    outStatisticFieldName: outCountFieldName // e.g., "count_general_flood"
                }
            ]
        });
        
        // Log the JSON representation of the query for detailed debugging if needed.
        console.log(`StatisticsManager: Query object for "${statLabel}":`, statsQuery.toJSON());

        try {
            // Execute the query against the layer.
            const results = await this.layer.queryFeatures(statsQuery);

            let count = 0;
            // If the query returns features (it should return one feature with the statistics).
            if (results.features.length > 0) {
                // The statistics are in the 'attributes' of the first feature.
                const attributes = results.features[0].attributes;
                // Get the count using the alias we defined. Default to 0 if not found.
                count = attributes[outCountFieldName] || 0;
            } else {
                console.log(`StatisticsManager: No features matched for "${statLabel}". Count will be 0.`);
            }

            // Calculate derived length: each segment is 100m, so 0.1 km.
            const derivedLengthKm = count * 0.1;

            // Return an object containing the count, calculated length, and the label.
            return {
                count: count,
                derivedLengthKm: derivedLengthKm,
                label: statLabel
            };
        } catch (error) {
            // If an error happens specifically for this query.
            console.error(`StatisticsManager: Error querying stats for "${statLabel}":`, error);
            // Return a default object so the UI can still try to render something.
            return { count: 0, derivedLengthKm: 0, label: `${statLabel} (Error)` };
        }
    }

    /**
     * Displays all the gathered statistics in the UI.
     * This function will now receive objects that include the label, count, and derivedLengthKm.
     * @param {...object} statsObjects - One or more statistics objects, each from querySegmentCountAndDerivedLength.
     */
    displayAllStatsUI(...statsObjects) { // Using rest parameter to accept multiple stat objects
        // Start with an empty string and build up the HTML for all statistic sets.
        let htmlContent = '';

        statsObjects.forEach(stats => {
            if (stats) { // Check if the stats object is valid
                htmlContent += `
                    <div class="indicator-set" style="margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
                        <h4>${stats.label}</h4>
                        <div class="indicator-box">
                            <div class="value">${stats.derivedLengthKm.toFixed(1)} km</div> 
                            <div class="label">Affected Network Length</div>
                        </div>
                        <div class="indicator-box">
                            <div class="value">${stats.count}</div>
                            <div class="label">Affected Road Segments</div>
                        </div>
                    </div>
                `;
            }
        });
        
        if (htmlContent === '') {
            htmlContent = "<p>No statistics to display or an error occurred.</p>";
        }

        // Update the indicator container with the generated HTML.
        this.indicatorContainer.innerHTML = htmlContent;

        // Reminder: Add CSS for '.indicator-set', '.indicator-box', '.value', '.label'
        // in your main.css file for proper styling.
        // Example for .indicator-set if needed:
        // .indicator-set h4 { margin-top: 0; margin-bottom: 10px; color: #333; }
    }

    // TODO: Add methods for pie chart (e.g., using Chart.js)
    // async updatePieChart(baseDefinitionExpression = "1=1") { ... }
}