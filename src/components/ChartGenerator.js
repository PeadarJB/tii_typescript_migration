// src/components/ChartGenerator.js

import { CONFIG } from '../config/appConfig.js';
import Query from '@arcgis/core/rest/support/Query.js';
import Chart from 'chart.js/auto';

export class ChartGenerator {
    constructor(containerId, view, webmap, layer, filterManager) {
        this.container = document.getElementById(containerId);
        this.view = view;
        this.webmap = webmap;
        this.layer = layer;
        this.filterManager = filterManager;
        this.chartInstance = null;
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
        this.container.innerHTML = `
            <div class="chart-controls-panel">
                <h3>Create Your Chart</h3>
                <div class="control-group">
                    <calcite-label>Feature(s) to Analyze (Max ${this.maxFeatures}):</calcite-label>
                    <div id="feature-checkbox-list" class="chart-feature-list"></div>
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
                    <calcite-button id="download-chart-btn" width="full" appearance="outline" icon-start="download" disabled>Download</calcite-button>
                </div>
                <div id="chart-status" class="status-message" style="margin-top: 10px;"></div>
            </div>
            <div class="chart-container-wrapper" style="position: relative; height: 400px; margin-top: 20px;">
                <canvas id="dynamic-chart-canvas"></canvas>
            </div>
        `;
        this.elements = Object.fromEntries(
            [...this.container.querySelectorAll('[id]')].map(el => [el.id.replace(/-/g, '_'), el])
        );
    }

    async populateControls() {
        if (!this.layer.loaded) await this.layer.load();

        CONFIG.chartingFeatures.forEach(feature => {
            const label = document.createElement('calcite-label');
            label.layout = 'inline-flex';
            const checkbox = document.createElement('calcite-checkbox');
            checkbox.value = feature.field;
            checkbox.dataset.label = feature.label;
            label.appendChild(checkbox);
            label.append(feature.label);
            this.elements.feature_checkbox_list.appendChild(label);
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

    setupEventListeners() {
        this.elements.feature_checkbox_list.addEventListener('calciteCheckboxChange', () => this.validateSelections());
        this.elements.group_by_select.addEventListener('calciteSelectChange', () => this.validateSelections());
        this.elements.chart_type_select.addEventListener('calciteSelectChange', () => this.validateSelections());

        this.elements.generate_chart_btn.addEventListener('click', () => this.generateChart());
        this.elements.clear_chart_btn.addEventListener('click', () => this.clearChart());
        this.elements.download_chart_btn.addEventListener('click', () => this.downloadChart());
    }

    validateSelections() {
        const selectedFeatures = this.getSelectedFeatures();
        const groupBy = this.elements.group_by_select.value;
        const chartType = this.elements.chart_type_select;

        if (selectedFeatures.length > 1) {
            chartType.value = 'bar';
            chartType.disabled = true;
            this.showStatus("Pie charts only support a single feature.", "info");
        } else {
            chartType.disabled = false;
        }

        if (selectedFeatures.length > this.maxFeatures) {
            this.showStatus(`Please select a maximum of ${this.maxFeatures} features.`, "warning");
            // Optionally, disable the last checked box
        }

        this.elements.generate_chart_btn.disabled = selectedFeatures.length === 0 || !groupBy || selectedFeatures.length > this.maxFeatures;
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
            
            this.renderChart(chartData);
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
        const resultsByFeature = results.map((featureResult, index) => {
            const data = new Map();
            featureResult.features.forEach(f => {
                const groupLabel = f.attributes[groupByField];
                if (groupLabel) {
                    allGroupLabels.add(groupLabel);
                    const count = f.attributes.segment_count;
                    const value = metric === 'totalLength' ? (count * 0.1) : count;
                    data.set(groupLabel, value);
                }
            });
            return { label: selectedFeatures[index].label, data };
        });

        let sortedLabels = Array.from(allGroupLabels).sort();
        if (sortedLabels.length > maxCategories) {
            // Logic to group smallest values into "Other"
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
            label: feature.label,
            data: sortedLabels.map(label => feature.data.get(label) || 0),
            backgroundColor: this.colorPalette[index % this.colorPalette.length]
        }));

        return { labels: sortedLabels, datasets };
    }

    renderChart(chartData) {
        if (this.chartInstance) this.chartInstance.destroy();
        const chartType = this.elements.chart_type_select.value;
        
        this.chartInstance = new Chart(this.elements.dynamic_chart_canvas, {
            type: chartType,
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: { display: true, text: this.buildChartTitle() },
                    legend: { display: chartData.datasets.length > 1 }
                },
                scales: (chartType === 'bar' && chartData.datasets.length > 1) ? { x: { stacked: false }, y: { stacked: false } } : {}
            }
        });
        this.elements.download_chart_btn.disabled = !this.chartInstance;
    }

    buildChartTitle() {
        const features = this.getSelectedFeatures().map(f => f.label).join(' vs ');
        const groupBy = this.elements.group_by_select.selectedOption.textContent;
        return `${features} by ${groupBy}`;
    }

    getSelectedFeatures() {
        return [...this.elements.feature_checkbox_list.querySelectorAll('calcite-checkbox')]
            .filter(cb => cb.checked)
            .map(cb => ({ value: cb.value, label: cb.dataset.label }));
    }
    
    clearChart() {
        if (this.chartInstance) this.chartInstance.destroy();
        this.chartInstance = null;
        this.elements.download_chart_btn.disabled = true;
        this.showStatus("Chart cleared.", "info");
    }

    downloadChart() {
        if (!this.chartInstance) return;
        const link = document.createElement('a');
        link.href = this.chartInstance.toBase64Image();
        link.download = `${this.buildChartTitle().replace(/ /g, '_')}.png`;
        link.click();
    }

    showStatus(message, type) { /* ... same as before ... */ }
    setupFilterListener() { /* ... same as before ... */ }
}