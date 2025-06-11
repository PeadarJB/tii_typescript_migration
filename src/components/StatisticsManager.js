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
        this.lastScenariosData = null;
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
            this.indicatorContainer.innerHTML = `<calcite-loader-bar type="indeterminate"></calcite-loader-bar><p><em>Loading statistics...</em></p>`;
            return;
        }

        // Provide immediate feedback to the user that statistics are being loaded.
        this.indicatorContainer.innerHTML = '<p><em>Loading all statistics...</em></p>';

        try {
            // --- REFACTORED: Fetch stats for both scenarios in parallel ---
            const [rcp45_stats, rcp85_stats] = await Promise.all([
                this._fetchStatsForScenario(baseDefinitionExpression, 'rcp45'),
                this._fetchStatsForScenario(baseDefinitionExpression, 'rcp85')
            ]);

            // --- Structure and Cache the Data ---
            const scenarios = [
                { title: "RCP 4.5 Flood Scenario (10 - 20 year return period)", stats: rcp45_stats },
                { title: "RCP 8.5 Flood Scenario (100 - 200 year return period)", stats: rcp85_stats }
            ];

            // ** THE CRITICAL STEP FOR THE REPORT GENERATOR **
            // Cache the newly fetched data so other components can access it.
            this.lastScenariosData = scenarios; 
            
            // --- Display the data in the UI ---
            this.displayAllStatsUI(scenarios);

        } catch (error) {
            console.error("StatisticsManager: Error updating statistics:", error);
            this.indicatorContainer.innerHTML = `<p style="color: red;">Error loading statistics.</p>`;
            this.lastScenariosData = []; // Clear cache on error
        }
    }

    /**
     * REFACTORED: Private helper to fetch all statistics for a single RCP scenario.
     * This avoids code duplication.
     * @param {string} baseDefinitionExpression - The base filter expression.
     * @param {'rcp45' | 'rcp85'} scenarioType - The type of scenario to fetch.
     * @returns {Promise<object[]>} A promise resolving to an array of statistics objects.
     */
    _fetchStatsForScenario(baseDefinitionExpression, scenarioType) {
        // Define the specific fields for the chosen scenario
        const fields = scenarioType === 'rcp45' 
            ? {
                any: CONFIG.fields.floodAffected,
                cfram_f: CONFIG.fields.cfram_f_m_0010,
                cfram_c: CONFIG.fields.cfram_c_m_0010,
                nifm_f: CONFIG.fields.nifm_f_m_0020,
                ncfhm_c: CONFIG.fields.ncfhm_c_m_0010
            } : {
                any: CONFIG.fields.floodAffected_h,
                cfram_f: CONFIG.fields.cfram_f_h_0100,
                cfram_c: CONFIG.fields.cfram_c_h_0200,
                nifm_f: CONFIG.fields.nifm_f_h_0100,
                ncfhm_c: CONFIG.fields.ncfhm_c_c_0200
            };
        
        // Create an array of promises for each statistic query
        const statPromises = [
            this.querySegmentCountAndDerivedLength(baseDefinitionExpression, `${fields.any} = 1`, `Any Future Flood Intersection`, `count_any`),
            this.querySegmentCountAndDerivedLength(baseDefinitionExpression, `${fields.cfram_f} = 1`, `CFRAM Fluvial Model`, `count_cfram_f`),
            this.querySegmentCountAndDerivedLength(baseDefinitionExpression, `${fields.cfram_c} = 1`, `CFRAM Coastal Model`, `count_cfram_c`),
            this.querySegmentCountAndDerivedLength(baseDefinitionExpression, `${fields.nifm_f} = 1`, `NIFM Fluvial Model`, `count_nifm_f`),
            this.querySegmentCountAndDerivedLength(baseDefinitionExpression, `${fields.ncfhm_c} = 1`, `NCFHM Coastal Model`, `count_ncfhm_c`)
        ];
        
        // Return a single promise that resolves when all stats for this scenario are fetched
        return Promise.all(statPromises);
    }

    /**
     * Helper function to query segment count and calculate derived length.
     * @returns {Promise<object>} An object with { count, derivedLengthKm, label }.
     */
    async querySegmentCountAndDerivedLength(baseDefinitionExpression, specificCondition, statLabel, outCountFieldName) {
        const combinedWhereClause = `(${baseDefinitionExpression || '1=1'}) AND (${specificCondition})`;
        
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
            const count = results.features[0]?.attributes[outCountFieldName] || 0;
            const derivedLengthKm = count * 0.1;
            return { count, derivedLengthKm, label: statLabel };
        } catch (error) {
            if (!error.name?.includes("AbortError")) {
               console.error(`StatisticsManager: Error querying for "${statLabel}":`, error);
            }
            return { count: 0, derivedLengthKm: 0, label: `${statLabel} (Error)` };
        }
    }

    /**
     * **PUBLIC GETTER METHOD**
     * Returns the last successfully fetched statistics data.
     * This is the method your ReportGenerator calls.
     * @returns {object[] | null} The cached scenario data.
     */
    getCurrentScenariosData() {
        return this.lastScenariosData;
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
                    const percentageOfTotalSegments = ((stats.count / totalRoadNetworkSegments) * 100).toFixed(2);
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