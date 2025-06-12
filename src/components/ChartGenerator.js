// src/components/ChartGenerator.js

import { CONFIG } from '../config/appConfig.js';
import Query from '@arcgis/core/rest/support/Query.js';
import Chart from 'chart.js/auto';

export class ChartGenerator {
    constructor(containerId, view, webmap, layer, filterManager) {
        // ... (constructor properties are the same)
        this.container = document.getElementById(containerId);
        this.view = view;
        this.webmap = webmap;
        this.layer = layer;
        this.filterManager = filterManager;
        this.chartInstance = null;
        this.modalChartInstance = null; // For the modal chart
        this.lastChartData = null; // To store data for re-rendering
        this.lastChartOptions = null; // To store options for re-rendering
        this.lastChartType = 'bar'; // To store type for re-rendering
        this.currentDefinitionExpression = "1=1";
        this.elements = {};
        this.isLoading = false;
        this.maxFeatures = 4;
        this.colorPalette = [
            '#007ac2', '#f26a2e', '#4c9a2a', '#ffc425', '#a864a8',
            '#00a9b7', '#e6332e', '#808285', '#b2b2b2', '#6e4b32'
        ];

        if (!this.container) throw new Error("ChartGenerator: Container element not found.");
        if (!this.layer) throw new Error("ChartGenerator: Target layer not provided.");
    }

    async initialize() {
        this.createHTML();
        await this.populateControls();
        this.setupEventListeners();
        this.setupFilterListener();
    }

    createHTML() {
        // Main component HTML
        this.container.innerHTML = `
            <div class="chart-controls-panel">
                <h3>Create Your Chart</h3>
                <div class="control-group">
                    <calcite-label>Feature(s) to Analyze (Max ${this.maxFeatures}):</calcite-label>
                    <calcite-combobox id="feature-select" selection-mode="multiple" placeholder="Select features..."></calcite-combobox>
                </div>
                <div class="control-group">
                    <calcite-label for="group-by-select">Group by:</calcite-label>
                    <calcite-select id="group-by-select">
                        <calcite-option value="" selected>Select field...</calcite-option>
                    </calcite-select>
                </div>
                <div class="control-group">
                    <calcite-label for="metric-select">Measure by:</calcite-label>
                    <calcite-select id="metric-select">
                        <calcite-option value="segmentCount" selected>Number of Segments</calcite-option>
                        <calcite-option value="totalLength">Total Length (km)</calcite-option>
                    </calcite-select>
                </div>
                <div class="control-group">
                    <calcite-label for="max-categories-select">Maximum Categories:</calcite-label>
                    <calcite-select id="max-categories-select">
                        <calcite-option value="10" selected>Top 10</calcite-option>
                        <calcite-option value="20">Top 20</calcite-option>
                        <calcite-option value="Infinity">No limit</calcite-option>
                    </calcite-select>
                </div>
                <div class="control-group">
                    <calcite-label for="chart-type-select">Chart Type:</calcite-label>
                    <calcite-select id="chart-type-select">
                        <calcite-option value="bar" selected>Bar Chart</calcite-option>
                        <calcite-option value="pie">Pie Chart</calcite-option>
                    </calcite-select>
                </div>
                <div class="control-group chart-generator-buttons">
                    <calcite-button id="generate-chart-btn" width="full" disabled>Generate</calcite-button>
                    <calcite-button id="clear-chart-btn" width="full" appearance="outline">Clear</calcite-button>
                    <calcite-button id="expand-chart-btn" width="full" appearance="outline" disabled>Expand</calcite-button>
                </div>
                <div class="control-group chart-generator-buttons">
                    <calcite-button id="download-chart-btn" width="full" appearance="outline" icon-start="download" disabled>Download</calcite-button>
                </div>
                <div id="chart-status" class="status-message" style="margin-top: 10px;"></div>
            </div>
            <div class="chart-container-wrapper" style="position: relative; height: 400px; margin-top: 20px;">
                <canvas id="dynamic-chart-canvas"></canvas>
            </div>
        `;
        
        // Modal HTML (appended to body to avoid z-index issues)
        const modalHtml = `
            <div id="chart-modal-overlay" class="chart-modal-overlay">
                <div class="chart-modal-content">
                    <button id="chart-modal-close-btn" class="chart-modal-close-btn" aria-label="Close modal">&times;</button>
                    <div class="chart-modal-body">
                        <canvas id="modal-chart-canvas"></canvas>
                    </div>
                </div>
            </div>
        `;
        if (!document.getElementById('chart-modal-overlay')) {
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }

        // Cache all element references
        this.elements = Object.fromEntries(
            [...this.container.querySelectorAll('[id]'), ...document.querySelectorAll('[id^="chart-modal"], [id^="modal-chart"]')]
            .map(el => [el.id.replace(/-/g, '_'), el])
        );
    }

    setupEventListeners() {
        this.elements.feature_select.addEventListener('calciteComboboxChange', () => this.validateSelections());
        this.elements.group_by_select.addEventListener('calciteSelectChange', () => this.validateSelections());
        this.elements.chart_type_select.addEventListener('calciteSelectChange', () => this.validateSelections());

        this.elements.generate_chart_btn.addEventListener('click', () => this.generateChart());
        this.elements.clear_chart_btn.addEventListener('click', () => this.clearChart());
        this.elements.download_chart_btn.addEventListener('click', () => this.downloadChart());
        
        // New listeners for the modal
        this.elements.expand_chart_btn.addEventListener('click', () => this.openChartModal());
        this.elements.chart_modal_close_btn.addEventListener('click', () => this.closeChartModal());
        this.elements.chart_modal_overlay.addEventListener('click', (e) => {
            if (e.target === this.elements.chart_modal_overlay) {
                this.closeChartModal();
            }
        });
    }

    renderChart(chartData, chartOptions) {
        if (this.chartInstance) this.chartInstance.destroy();
        
        this.lastChartType = this.elements.chart_type_select.value;
        this.lastChartData = chartData;
        this.lastChartOptions = chartOptions; // Store for modal
        
        const chartConfig = { type: this.lastChartType, data: chartData, options: chartOptions };
        this.chartInstance = new Chart(this.elements.dynamic_chart_canvas, chartConfig);
        
        this.elements.download_chart_btn.disabled = false;
        this.elements.expand_chart_btn.disabled = false;
    }
    
    clearChart() {
        if (this.chartInstance) this.chartInstance.destroy();
        this.chartInstance = null;
        this.lastChartData = null;
        this.lastChartOptions = null;
        this.elements.download_chart_btn.disabled = true;
        this.elements.expand_chart_btn.disabled = true;
        this.showStatus("", "info");
    }

    openChartModal() {
        if (!this.lastChartData || !this.lastChartOptions) return;

        this.elements.chart_modal_overlay.classList.add('visible');
        document.body.style.overflow = 'hidden';

        if (this.modalChartInstance) this.modalChartInstance.destroy();

        const modalCtx = this.elements.modal_chart_canvas.getContext('2d');
        const modalOptions = JSON.parse(JSON.stringify(this.lastChartOptions));
        modalOptions.plugins.title.font = { size: 20 };

        this.modalChartInstance = new Chart(modalCtx, {
            type: this.lastChartType,
            data: this.lastChartData,
            options: modalOptions
        });
    }

    closeChartModal() {
        this.elements.chart_modal_overlay.classList.remove('visible');
        document.body.style.overflow = 'auto';

        if (this.modalChartInstance) {
            this.modalChartInstance.destroy();
            this.modalChartInstance = null;
        }
    }

    // --- Other methods like populateControls, generateChart, etc. ---
    // (These methods from the previous response remain the same. 
    // I am including them here for a complete, copy-pasteable file.)

    async populateControls() {
        if (!this.layer.loaded) await this.layer.load();

        CONFIG.chartingFeatures.forEach(feature => {
            const item = document.createElement('calcite-combobox-item');
            item.value = feature.field;
            item.setAttribute('text-label', feature.label);
            item.dataset.description = feature.description; // Store description if needed
            this.elements.feature_select.appendChild(item);
        });

        const suitableGroupByFields = ['string', 'small-integer', 'integer'];
        this.layer.fields
            .filter(f => suitableGroupByFields.includes(f.type) && !f.name.toLowerCase().includes('objectid'))
            .forEach(field => {
                const option = document.createElement('calcite-option');
                option.value = field.name;
                option.textContent = field.alias || field.name;
                this.elements.group_by_select.appendChild(option);
            });
    }

    validateSelections() {
        const selectedFeatures = this.getSelectedFeatures();
        const groupBy = this.elements.group_by_select.value;
        const chartType = this.elements.chart_type_select;

        if (selectedFeatures.length > 1) {
            if (chartType.value === 'pie') {
                chartType.value = 'bar';
            }
            chartType.disabled = true;
        } else {
            chartType.disabled = false;
        }

        if (selectedFeatures.length > this.maxFeatures) {
            this.showStatus(`Please select a maximum of ${this.maxFeatures} features.`, "warning");
        } else if (this.elements.chart_type_select.disabled) {
            this.showStatus("Pie charts only support a single feature.", "info");
        } else {
            this.showStatus("", "info");
        }

        this.elements.generate_chart_btn.disabled = selectedFeatures.length === 0 || !groupBy || selectedFeatures.length > this.maxFeatures;
    }
    
    setupFilterListener() {
        if (this.filterManager) {
            this.filterManager.onFilterChange((newDefinitionExpression) => {
                this.currentDefinitionExpression = newDefinitionExpression || "1=1";
                if (this.chartInstance) {
                    this.generateChart();
                }
            });
        }
    }

    async generateChart() {
        if (this.isLoading) return;
        this.isLoading = true;
        this.clearChart();
        this.showStatus("Generating chart...", "loading");

        const selectedFeatures = this.getSelectedFeatures();
        const groupByField = this.elements.group_by_select.value;

        try {
            const queries = selectedFeatures.map(feature => {
                const whereClause = `${this.currentDefinitionExpression} AND ${feature.value} = 1`;
                return this.layer.queryFeatures(new Query({
                    where: whereClause,
                    groupByFieldsForStatistics: [groupByField],
                    outStatistics: [{ statisticType: "count", onStatisticField: this.layer.objectIdField, outStatisticFieldName: "segment_count" }]
                }));
            });

            const results = await Promise.all(queries);
            const chartData = this.processChartData(results, selectedFeatures);
            const chartOptions = this.buildChartOptions(chartData);
            
            this.renderChart(chartData, chartOptions);
            this.showStatus("Chart generated successfully.", "success");
        } catch (error) {
            this.showStatus("Failed to generate chart. See console for details.", "error");
            console.error(error);
        } finally {
            this.isLoading = false;
        }
    }

    processChartData(results, selectedFeatures) {
        const metric = this.elements.metric_select.value;
        const maxCategories = parseInt(this.elements.max_categories_select.value, 10);
        const groupByField = this.elements.group_by_select.value;

        let allGroupLabels = new Set();
        const resultsByFeature = results.map((featureResult) => {
            const data = new Map();
            featureResult.features.forEach(f => {
                const groupLabel = f.attributes[groupByField];
                if (groupLabel !== null && groupLabel !== undefined && groupLabel !== '') {
                    allGroupLabels.add(groupLabel);
                    const count = f.attributes.segment_count;
                    const value = metric === 'totalLength' ? (count * 0.1) : count;
                    data.set(groupLabel, value);
                }
            });
            return { data };
        });

        let sortedLabels = Array.from(allGroupLabels).sort();
        if (sortedLabels.length > maxCategories) {
            const totals = new Map();
            sortedLabels.forEach(label => {
                let total = 0;
                resultsByFeature.forEach(feature => { total += (feature.data.get(label) || 0); });
                totals.set(label, total);
            });
            sortedLabels.sort((a, b) => totals.get(b) - totals.get(a));
            const topLabels = new Set(sortedLabels.slice(0, maxCategories));
            const otherLabels = sortedLabels.slice(maxCategories);

            resultsByFeature.forEach(feature => {
                let otherTotal = 0;
                otherLabels.forEach(label => { otherTotal += (feature.data.get(label) || 0); });
                otherLabels.forEach(label => feature.data.delete(label));
                if (otherTotal > 0) feature.data.set('Other', otherTotal);
            });

            sortedLabels = [...topLabels, (otherLabels.length > 0 ? 'Other' : undefined)].filter(Boolean);
        }

        const datasets = resultsByFeature.map((feature, index) => ({
            label: selectedFeatures[index].label,
            data: sortedLabels.map(label => feature.data.get(label) || 0),
            backgroundColor: this.colorPalette[index % this.colorPalette.length]
        }));

        return { labels: sortedLabels, datasets };
    }

    buildChartOptions(chartData) {
        const chartType = this.elements.chart_type_select.value;
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: this.buildChartTitle(), font: { size: 16 } },
                legend: { display: chartData.datasets.length > 1 }
            },
            scales: (chartType === 'bar') ? { x: { stacked: false }, y: { stacked: false, beginAtZero: true } } : {}
        };
    }

    buildChartTitle() {
        const features = this.getSelectedFeatures().map(f => f.label).join(' & ');
        const groupBy = this.elements.group_by_select.selectedOption.textContent;
        const metric = this.elements.metric_select.selectedOption.textContent;
        return `${metric} of ${features} by ${groupBy}`;
    }

    getSelectedFeatures() {
        if (!this.elements.feature_select) return [];
        return this.elements.feature_select.selectedItems.map(item => ({
            value: item.value,
            label: item.textLabel
        }));
    }

    downloadChart() {
        const chartToDownload = this.modalChartInstance || this.chartInstance;
        if (!chartToDownload) return;
        const link = document.createElement('a');
        link.href = chartToDownload.toBase64Image();
        link.download = `${this.buildChartTitle().replace(/ /g, '_')}.png`;
        link.click();
    }

    showStatus(message, type) {
        if (!this.elements.chart_status) return;
        this.elements.chart_status.textContent = message;
        this.elements.chart_status.style.color = type === 'error' ? 'red' : type === 'warning' ? '#b5830d' : 'black';
        
        // Auto-clear non-error messages
        if (type !== 'error') {
            setTimeout(() => {
                if (this.elements.chart_status.textContent === message) {
                    this.elements.chart_status.textContent = '';
                }
            }, 4000);
        }
    }
}