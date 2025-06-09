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
            // --- Define and Fetch All Stats for the RCP 4.5 Scenario ---
            const rcp45_stats = [
                // Moved "Any Future Flood Intersection" into the RCP 4.5% group as requested
                await this.querySegmentCountAndDerivedLength(
                    baseDefinitionExpression,
                    `${CONFIG.fields.floodAffected} = 1`,
                    "Any Future Flood Intersection",
                    "count_general_flood"
                ),
                await this.querySegmentCountAndDerivedLength(
                    baseDefinitionExpression, `${CONFIG.fields.cfram_m_f_0010} = 1`, "CFRAM Fluvial Model", "count_cfram_fluvial"
                ),
                await this.querySegmentCountAndDerivedLength(
                    baseDefinitionExpression, `${CONFIG.fields.cfram_c_m_0010} = 1`, "CFRAM Coastal Model", "count_cfram_coastal"
                ),
                await this.querySegmentCountAndDerivedLength(
                    baseDefinitionExpression, `${CONFIG.fields.nifm_m_f_0020} = 1`, "NIFM Fluvial Model", "count_nifm_fluvial"
                ),
                await this.querySegmentCountAndDerivedLength(
                    baseDefinitionExpression, `${CONFIG.fields.ncfhm_c_m_0010} = 1`, "NCFHM Coastal Model", "count_ncfhm_coastal"
                )
            ];
            
            // --- Placeholder for RCP 8.5 stats to be added later ---
            const rcp85_stats = [
                await this.querySegmentCountAndDerivedLength(
                    baseDefinitionExpression,
                    `${CONFIG.fields.floodAffected} = 1`,
                    "Any Future Flood Intersection",
                    "count_general_flood"
                ),
                await this.querySegmentCountAndDerivedLength(
                    baseDefinitionExpression, `${CONFIG.fields.cfram_m_f_0010} = 1`, "CFRAM Fluvial Model", "count_cfram_fluvial"
                ),
                await this.querySegmentCountAndDerivedLength(
                    baseDefinitionExpression, `${CONFIG.fields.cfram_c_m_0010} = 1`, "CFRAM Coastal Model", "count_cfram_coastal"
                ),
                await this.querySegmentCountAndDerivedLength(
                    baseDefinitionExpression, `${CONFIG.fields.nifm_m_f_0020} = 1`, "NIFM Fluvial Model", "count_nifm_fluvial"
                ),
                await this.querySegmentCountAndDerivedLength(
                    baseDefinitionExpression, `${CONFIG.fields.ncfhm_c_m_0010} = 1`, "NCFHM Coastal Model", "count_ncfhm_coastal"
                )
            ];

            // Create the structured list of scenarios with the corrected grouping
            const scenarios = [
                { title: "RCP 4.5% Flood Scenario", stats: rcp45_stats },
                { title: "RCP 8.5% Flood Scenario", stats: rcp85_stats }
            ];

            this.displayAllStatsUI(scenarios);

        } catch (error) {
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
        const effectiveBaseExpression = (baseDefinitionExpression && baseDefinitionExpression.trim() !== "") ? baseDefinitionExpression : "1=1";
        const combinedWhereClause = `(${effectiveBaseExpression}) AND (${specificCondition})`;
        
        console.log(`StatisticsManager: Querying for "${statLabel}" with WHERE clause: ${combinedWhereClause}`);

        const statsQuery = new Query({
            where: combinedWhereClause,
            outStatistics: [{
                statisticType: "count",
                onStatisticField: CONFIG.fields.object_id,
                outStatisticFieldName: outCountFieldName
            }]
        });

        try {
            const results = await this.layer.queryFeatures(statsQuery);
            const count = results.features.length > 0 ? results.features[0].attributes[outCountFieldName] || 0 : 0;
            const derivedLengthKm = count * 0.1;
            return { count, derivedLengthKm, label: statLabel };
        } catch (error) {
            console.error(`StatisticsManager: Error querying stats for "${statLabel}":`, error);
            return { count: 0, derivedLengthKm: 0, label: `${statLabel} (Error)` };
        }
    }

    /**
     * Displays all the gathered statistics in the UI.
     * This function will now receive objects that include the label, count, and derivedLengthKm.
     * @param {Array<object>} scenarios - An array of scenario objects, each containing a title and an array of stats.
     */
    displayAllStatsUI(scenarios) {
        const totalRoadNetworkSegments = 53382;
        // Filter out scenarios that have no valid stats to show
        const activeScenarios = scenarios.filter(s => s.stats.filter(stat => stat && stat.count > 0).length > 0);

        if (activeScenarios.length === 0) {
            this.indicatorContainer.innerHTML = "<p>No statistics to display for the current filters.</p>";
            return;
        }

        const numSlides = activeScenarios.length;
        // Calculate the percentage width for each slide
        const slideWidthPercentage = 100 / numSlides;

        // Build the HTML for each slide in the carousel
        const slidesHtml = activeScenarios.map(scenario => {
            const indicatorsHtml = scenario.stats
                .filter(stats => stats && stats.count > 0)
                .map(stats => {
                    const percentageOfTotalSegments = ((stats.count / totalRoadNetworkSegments) * 100).toFixed(1);
                    return `
                        <div class="indicator-set">
                            <h4>${stats.label}</h4>
                            <div class="indicator-box">
                                <div class="value-1">${stats.derivedLengthKm.toFixed(1)} km</div>
                            </div>
                            <div class="indicator-box">
                                <div class="value-2"><b>${percentageOfTotalSegments}%</b> of Total Network</div>
                            </div>
                        </div>
                    `;
                }).join('');

            return `
                <div class="carousel-slide" style="width: ${slideWidthPercentage}%;">
                    <div class="flood-scenario"><h2>${scenario.title}</h2></div>
                    ${indicatorsHtml}
                </div>
            `;
        }).join('');

        // Create the main carousel structure with navigation buttons
        const carouselHtml = `
            <div class="stats-carousel">
                <button class="carousel-nav prev" aria-label="Previous scenario">&lt;</button>
                <div class="carousel-viewport">
                    <div class="carousel-track" style="width: ${numSlides * 100}%">
                        ${slidesHtml}
                    </div>
                </div>
                <button class="carousel-nav next" aria-label="Next scenario">&gt;</button>
            </div>
        `;

        this.indicatorContainer.innerHTML = carouselHtml;
        this.setupCarousel(); // Call the new method to make the carousel interactive
    }

    /**
     * Adds event listeners and logic to control the statistics carousel.
     */
    setupCarousel() {
        const carousel = this.indicatorContainer.querySelector('.stats-carousel');
        if (!carousel) return;

        const track = carousel.querySelector('.carousel-track');
        const slides = Array.from(carousel.querySelectorAll('.carousel-slide'));
        const nextButton = carousel.querySelector('.carousel-nav.next');
        const prevButton = carousel.querySelector('.carousel-nav.prev');

        if (slides.length <= 1) {
            nextButton.style.display = 'none';
            prevButton.style.display = 'none';
            return;
        }

        let currentIndex = 0;
        const slideWidth = 100 / slides.length;

        const updateCarousel = () => {
            track.style.transform = `translateX(-${currentIndex * slideWidth}%)`;
            prevButton.disabled = currentIndex === 0;
            nextButton.disabled = currentIndex === slides.length - 1;
        };

        nextButton.addEventListener('click', () => {
            if (currentIndex < slides.length - 1) {
                currentIndex++;
                updateCarousel();
            }
        });

        prevButton.addEventListener('click', () => {
            if (currentIndex > 0) {
                currentIndex--;
                updateCarousel();
            }
        });

        updateCarousel(); // Set initial state
    }

    // TODO: Add methods for pie chart (e.g., using Chart.js)
    // async updatePieChart(baseDefinitionExpression = "1=1") { ... }
}