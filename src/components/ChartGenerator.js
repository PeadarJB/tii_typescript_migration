// src/components/ChartGenerator.js

// Import necessary modules
import { CONFIG } from '../config/appConfig.js';
import Query from '@arcgis/core/rest/support/Query.js';
import Chart from 'chart.js/auto';

export class ChartGenerator {
    /**
     * Constructor for the ChartGenerator.
     * @param {string} containerId - The ID of the HTML element to contain the chart UI.
     * @param {esri.MapView} view - The ArcGIS MapView instance.
     * @param {esri.WebMap} webmap - The ArcGIS WebMap instance.
     * @param {esri.FeatureLayer} layer - The target feature layer for charting.
     * @param {FilterManager} filterManager - The FilterManager instance to get current filters.
     */
    constructor(containerId, view, webmap, layer, filterManager) {
        this.container = document.getElementById(containerId);
        this.view = view;
        this.webmap = webmap;
        this.layer = layer;
        this.filterManager = filterManager;
        this.chartInstance = null;
        this.currentDefinitionExpression = "1=1";
        this.elements = {};
        this.isLoading = false; // Prevent multiple simultaneous requests

        // Validation
        if (!this.container) {
            throw new Error("ChartGenerator: Container element not found.");
        }
        if (!this.layer) {
            throw new Error("ChartGenerator: Target layer not provided.");
        }
        
        console.log("ChartGenerator initialized.");
    }

    /**
     * Initializes the chart generator UI and event listeners.
     */
    async initialize() {
        try {
            this.createHTML();
            await this.populateDropdowns();
            this.setupEventListeners();
            this.setupFilterListener();
            console.log("ChartGenerator initialization complete.");
        } catch (error) {
            console.error("ChartGenerator: Initialization failed:", error);
            this.showStatus("Failed to initialize chart generator.", "error");
        }
    }

    /**
     * Sets up filter change listener
     */
    setupFilterListener() {
        if (this.filterManager && typeof this.filterManager.onFilterChange === 'function') {
            this.filterManager.onFilterChange((newDefinitionExpression) => {
                this.currentDefinitionExpression = newDefinitionExpression || "1=1";
                // Auto-regenerate chart if configuration is complete
                if (this.isChartConfigured()) {
                    this.generateChart();
                }
            });
        }
    }

    /**
     * Checks if chart is properly configured
     */
    isChartConfigured() {
        return this.elements.categoryFieldSelect?.value && 
               this.elements.metricSelect?.value;
    }

    /**
     * Creates the HTML structure for the chart controls.
     */
    createHTML() {
        this.container.innerHTML = `
            <div class="chart-controls-panel">
                <h3>Create Your Chart</h3>
                <div class="control-group">
                    <calcite-label for="category-field-select">Group by (Category):</calcite-label>
                    <calcite-select id="category-field-select" label="Category field selection">
                        <calcite-option value="" selected>Select field...</calcite-option>
                    </calcite-select>
                </div>
                <div class="control-group">
                    <calcite-label for="metric-select">Measure (Value):</calcite-label>
                    <calcite-select id="metric-select" label="Metric selection">
                        <calcite-option value="" selected>Select metric...</calcite-option>
                        <calcite-option value="segmentCount">Number of Segments</calcite-option>
                        <calcite-option value="totalLength">Total Length (km)</calcite-option>
                    </calcite-select>
                </div>
                <div class="control-group">
                    <calcite-label for="chart-type-select">Chart Type:</calcite-label>
                    <calcite-select id="chart-type-select" label="Chart type selection">
                        <calcite-option value="bar" selected>Bar Chart</calcite-option>
                        <calcite-option value="pie">Pie Chart</calcite-option>
                        <calcite-option value="doughnut">Doughnut Chart</calcite-option>
                        <calcite-option value="line">Line Chart</calcite-option>
                    </calcite-select>
                </div>
                <div class="control-group">
                    <calcite-button id="generate-chart-btn" width="full" disabled>Generate Chart</calcite-button>
                    <calcite-button id="clear-chart-btn" width="full" appearance="outline" style="margin-top: 5px;" disabled>Clear Chart</calcite-button>
                </div>
                <div id="chart-status" class="status-message" style="margin-top: 10px;"></div>
            </div>
            <div class="chart-container-wrapper" style="position: relative; height: 400px; margin-top: 20px;">
                <canvas id="dynamic-chart-canvas"></canvas>
            </div>
        `;

        // Store references to interactive elements
        this.elements = {
            categoryFieldSelect: this.container.querySelector('#category-field-select'),
            metricSelect: this.container.querySelector('#metric-select'),
            chartTypeSelect: this.container.querySelector('#chart-type-select'),
            generateChartBtn: this.container.querySelector('#generate-chart-btn'),
            clearChartBtn: this.container.querySelector('#clear-chart-btn'),
            chartCanvas: this.container.querySelector('#dynamic-chart-canvas'),
            chartStatus: this.container.querySelector('#chart-status'),
        };
    }

    /**
     * Populates dropdowns with layer fields and flood-related options.
     */
    async populateDropdowns() {
        try {
            // Ensure layer is loaded
            if (!this.layer.loaded) {
                await this.layer.load();
            }

            this.populateCategoryFields();
            this.addFloodFields();
            
        } catch (error) {
            console.error("ChartGenerator: Failed to populate dropdowns:", error);
            this.showStatus("Error loading layer fields.", "error");
            throw error;
        }
    }

    /**
     * Populates category field dropdown with suitable fields
     */
    populateCategoryFields() {
        const suitableFieldTypes = ['string', 'small-integer', 'integer'];
        const excludedFields = new Set([
            this.layer.objectIdField, 
            'Shape_Length', 
            'Shape_Area', 
            'future_flood_intersection',
            CONFIG.fields?.cfram_m_f_0010,
            CONFIG.fields?.cfram_c_m_0010,
            CONFIG.fields?.nifm_m_f_0020,
            CONFIG.fields?.ncfhm_c_m_0010
        ].filter(Boolean)); // Remove undefined values

        this.layer.fields
            .filter(field => 
                suitableFieldTypes.includes(field.type) && 
                !excludedFields.has(field.name)
            )
            .forEach(field => {
                const option = document.createElement('calcite-option');
                option.value = field.name;
                option.textContent = field.alias || field.name;
                
                if (field.domain?.type === "coded-value") {
                    option.dataset.hasDomain = "true";
                }
                
                this.elements.categoryFieldSelect.appendChild(option);
            });
    }

    /**
     * Adds flood-related binary fields as category options
     */
    addFloodFields() {
        const floodFields = [
            { name: CONFIG.fields?.floodAffected, alias: "Any Future Flood Intersection" },
            { name: CONFIG.fields?.cfram_m_f_0010, alias: "CFRAM Fluvial Model (0.1% AEP)" },
            { name: CONFIG.fields?.cfram_c_m_0010, alias: "CFRAM Coastal Model (0.1% AEP)" },
            { name: CONFIG.fields?.nifm_m_f_0020, alias: "NIFM Fluvial Model (0.2%)" },
            { name: CONFIG.fields?.ncfhm_c_m_0010, alias: "NCFHM Coastal Model (0.1%)" }
        ].filter(f => f.name && this.layer.fields.find(lf => lf.name === f.name));

        floodFields.forEach(field => {
            const option = document.createElement('calcite-option');
            option.value = field.name;
            option.textContent = field.alias || field.name;
            option.dataset.isBinary = "true";
            this.elements.categoryFieldSelect.appendChild(option);
        });
    }

    /**
     * Sets up event listeners for UI controls.
     */
    setupEventListeners() {
        // Generate chart button
        this.elements.generateChartBtn.addEventListener('click', () => {
            if (!this.isLoading) {
                this.generateChart();
            }
        });

        // Clear chart button
        this.elements.clearChartBtn.addEventListener('click', () => {
            this.clearChart();
        });

        // Enable/disable generate button based on selections
        const validateSelections = () => {
            const isValid = this.isChartConfigured();
            this.elements.generateChartBtn.disabled = !isValid;
        };

        this.elements.categoryFieldSelect.addEventListener('calciteSelectChange', validateSelections);
        this.elements.metricSelect.addEventListener('calciteSelectChange', validateSelections);

        // Auto-generate on chart type change if chart exists
        this.elements.chartTypeSelect.addEventListener('calciteSelectChange', () => {
            if (this.chartInstance && this.isChartConfigured()) {
                this.generateChart();
            }
        });
    }

    /**
     * Clears the current chart
     */
    clearChart() {
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
            this.elements.clearChartBtn.disabled = true;
            this.showStatus("Chart cleared.", "info");
        }
    }

    /**
     * Fetches data and generates/updates the chart based on current selections.
     */
    async generateChart() {
        if (this.isLoading) {
            return; // Prevent multiple simultaneous requests
        }

        const categoryField = this.elements.categoryFieldSelect.value;
        const metric = this.elements.metricSelect.value;
        const chartType = this.elements.chartTypeSelect.value;

        if (!categoryField || !metric) {
            this.showStatus("Please select a category field and a metric.", "warning");
            return;
        }

        this.isLoading = true;
        this.elements.generateChartBtn.disabled = true;
        this.showStatus("Generating chart...", "loading");

        try {
            const data = await this.queryChartData(categoryField);
            
            if (!data || data.length === 0) {
                this.showStatus("No data found for the current selection and filters.", "info");
                this.clearChart();
                return;
            }

            const chartData = this.processChartData(data, categoryField, metric);
            const chartTitle = this.buildChartTitle(metric, categoryField);
            
            this.renderChart(chartData.labels, chartData.values, chartType, chartTitle);
            this.showStatus("Chart generated successfully.", "success");
            this.elements.clearChartBtn.disabled = false;

        } catch (error) {
            console.error("ChartGenerator: Error generating chart:", error);
            this.showStatus(`Error generating chart: ${error.message}`, "error");
            this.clearChart();
        } finally {
            this.isLoading = false;
            this.elements.generateChartBtn.disabled = false;
        }
    }

    /**
     * Queries the feature layer for chart data
     */
    async queryChartData(categoryField) {
        const query = new Query({
            where: this.currentDefinitionExpression,
            outFields: [categoryField],
            groupByFieldsForStatistics: [categoryField],
            orderByFields: [categoryField],
            returnGeometry: false,
            outStatistics: [{
                statisticType: "count",
                onStatisticField: this.layer.objectIdField,
                outStatisticFieldName: "segment_count"
            }]
        });

        const results = await this.layer.queryFeatures(query);
        return results.features;
    }

    /**
     * Processes raw query results into chart-ready data
     */
    processChartData(features, categoryField, metric) {
        const categoryFieldDef = this.layer.fields.find(f => f.name === categoryField);
        const codedValueMap = this.buildCodedValueMap(categoryFieldDef);
        const isBinary = this.elements.categoryFieldSelect.selectedOption?.dataset.isBinary === "true";

        const labels = [];
        const values = [];

        features.forEach(feature => {
            const categoryValue = feature.attributes[categoryField];
            const label = this.formatCategoryLabel(categoryValue, codedValueMap, isBinary);
            const count = feature.attributes.segment_count;
            
            labels.push(label);
            values.push(metric === "totalLength" ? 
                parseFloat((count * 0.1).toFixed(2)) : 
                count
            );
        });

        return { labels, values };
    }

    /**
     * Builds a map of coded values for domain fields
     */
    buildCodedValueMap(fieldDefinition) {
        if (!fieldDefinition?.domain || fieldDefinition.domain.type !== "coded-value") {
            return null;
        }

        const map = new Map();
        fieldDefinition.domain.codedValues.forEach(cv => {
            map.set(cv.code, cv.name);
        });
        return map;
    }

    /**
     * Formats category labels based on field type and domain
     */
    formatCategoryLabel(value, codedValueMap, isBinary) {
        if (isBinary) {
            return value === 1 ? "Yes (Affected)" : 
                   value === 0 ? "No (Not Affected)" : "Unknown";
        }
        
        if (codedValueMap && codedValueMap.has(value)) {
            return codedValueMap.get(value);
        }
        
        return value === null || value === undefined ? "N/A" : String(value);
    }

    /**
     * Builds chart title from selected options
     */
    buildChartTitle(metric, categoryField) {
        const metricLabel = this.elements.metricSelect.selectedOption?.textContent || metric;
        const categoryLabel = this.elements.categoryFieldSelect.selectedOption?.textContent || categoryField;
        return `${metricLabel} by ${categoryLabel}`;
    }

    /**
     * Renders the chart using Chart.js.
     */
    renderChart(labels, dataValues, chartType, chartTitle) {
        this.clearChart(); // Clear any existing chart

        const ctx = this.elements.chartCanvas.getContext('2d');
        const config = this.buildChartConfig(labels, dataValues, chartType, chartTitle);
        
        this.chartInstance = new Chart(ctx, config);
    }

    /**
     * Builds Chart.js configuration object
     */
    buildChartConfig(labels, dataValues, chartType, chartTitle) {
        return {
            type: chartType,
            data: {
                labels: labels,
                datasets: [{
                    label: chartTitle,
                    data: dataValues,
                    backgroundColor: this.generateChartColors(labels.length, chartType),
                    borderColor: this.generateChartColors(labels.length, chartType, true),
                    borderWidth: ['pie', 'doughnut'].includes(chartType) ? 2 : 1
                }]
            },
            options: this.buildChartOptions(chartType, chartTitle, labels.length)
        };
    }

    /**
     * Builds Chart.js options object
     */
    buildChartOptions(chartType, chartTitle, labelCount) {
        const metricUnit = this.elements.metricSelect.value === 'totalLength' ? ' km' : ' segments';
        const isPieType = ['pie', 'doughnut'].includes(chartType);
        
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: isPieType ? 'top' : 'bottom',
                    display: isPieType || labelCount > 1
                },
                title: {
                    display: true,
                    text: chartTitle,
                    font: { size: 16 }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const value = isPieType ? context.parsed : context.parsed.y;
                            return `${context.label}: ${value}${metricUnit}`;
                        }
                    }
                }
            },
            scales: isPieType ? {} : {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: this.elements.metricSelect.selectedOption?.textContent || 'Value'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: this.elements.categoryFieldSelect.selectedOption?.textContent || 'Category'
                    }
                }
            }
        };
    }

    /**
     * Generates colors for chart elements.
     */
    generateChartColors(count, chartType, forBorder = false) {
        const baseColors = [
            [54, 162, 235],   // Blue
            [255, 99, 132],   // Red
            [75, 192, 192],   // Green
            [255, 206, 86],   // Yellow
            [153, 102, 255],  // Purple
            [255, 159, 64],   // Orange
            [99, 255, 132],   // Light Green
            [132, 99, 255],   // Light Purple
            [235, 54, 162],   // Pink
            [86, 255, 206]    // Teal
        ];

        const colors = [];
        const isPieType = ['pie', 'doughnut'].includes(chartType);
        
        for (let i = 0; i < count; i++) {
            const color = baseColors[i % baseColors.length];
            const opacity = (isPieType || !forBorder) ? 0.7 : 1;
            colors.push(`rgba(${color[0]}, ${color[1]}, ${color[2]}, ${opacity})`);
        }
        
        return colors;
    }

    /**
     * Displays status messages to the user.
     */
    showStatus(message, type = 'info') {
        if (!this.elements.chartStatus) return;

        this.elements.chartStatus.textContent = message;
        this.elements.chartStatus.className = `status-message status-${type}`;
        
        // Auto-clear success messages after 3 seconds
        if (type === 'success') {
            setTimeout(() => {
                if (this.elements.chartStatus.textContent === message) {
                    this.elements.chartStatus.textContent = '';
                    this.elements.chartStatus.className = 'status-message';
                }
            }, 3000);
        }
    }

    /**
     * Cleanup method for when the component is destroyed
     */
    destroy() {
        this.clearChart();
        
        // Remove event listeners
        Object.values(this.elements).forEach(element => {
            if (element && element.removeEventListener) {
                // Clone and replace to remove all listeners
                const newElement = element.cloneNode(true);
                element.parentNode?.replaceChild(newElement, element);
            }
        });
        
        this.elements = {};
        console.log("ChartGenerator destroyed.");
    }
}