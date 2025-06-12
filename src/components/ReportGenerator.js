// src/components/ReportGenerator.js

import html2pdf from 'html2pdf.js';
import { CONFIG } from '../config/appConfig.js';

export class ReportGenerator {
    constructor(appManager) {
        this.appManager = appManager;
    }

    // Main function to start the report generation process
    async generateReport() {
        this.showLoadingState("Preparing Report Preview...");
        try {
            // 1. Gather data from the application
            const [mapImageUrl, activeFiltersSummary, statisticsData] = await Promise.all([
                this.getMapImage(),
                this.getActiveFilterSummary(),
                this.getStatisticsData()
            ]);

            // 2. Build the HTML for our report preview modal
            const modalHtml = this.buildPreviewModal(mapImageUrl, activeFiltersSummary, statisticsData);
            
            // 3. Create and show the modal
            this.createAndShowModal(modalHtml);

        } catch (error) {
            console.error("Failed to generate report preview:", error);
            alert("Sorry, there was an error preparing the report. Please check the console.");
        } finally {
            this.hideLoadingState();
        }
    }

    // --- Data Gathering Methods ---
    async getMapImage() {
        const view = this.appManager.components.view;
        if (!view) return null;

        // Hide UI elements for a clean screenshot
        const elementsToHide = [".esri-ui-top-left", ".esri-ui-bottom-left", "#swipe-controls-container", "#chart-generator-shell-panel"];
        elementsToHide.forEach(sel => {
            const el = document.querySelector(sel);
            if (el) el.style.visibility = 'hidden';
        });

        // FIXED: Increase resolution and DPI for a high-quality, non-pixelated image
        const screenshot = await view.takeScreenshot({
            format: 'jpeg',
            quality: 100, // Use highest quality
            width: 2400,  // Significantly higher width for more detail
            dpi: 300      // Set DPI for print quality
        });
        
        // Restore UI elements
        elementsToHide.forEach(sel => {
            const el = document.querySelector(sel);
            if (el) el.style.visibility = 'visible';
        });

        return screenshot.dataUrl;
    }

    getActiveFilterSummary() {
        return this.appManager.components.filterManager?.getCurrentFilterSummary() || {};
    }

    getStatisticsData() {
        return this.appManager.components.statsManager?.getCurrentScenariosData() || [];
    }

    // --- UI and PDF Generation Methods ---

    // Creates the HTML content for the modal dialog
    buildPreviewModal(mapImageUrl, activeFiltersSummary, statisticsData) {
        // FIXED: New, more robust logic to get user-friendly filter labels
        const filterText = Object.entries(activeFiltersSummary)
            .map(([key, values]) => {
                const filterConfig = CONFIG.filterConfig.find(c => c.id === key);
                if (!filterConfig || !values || (Array.isArray(values) && values.length === 0) || (typeof values === 'object' && Object.keys(values).length === 0)) {
                    return ''; // Skip empty filters
                }
        
                let valueText;
                if (filterConfig.type === 'scenario-select') {
                    // For scenarios, map the field names back to their labels
                    valueText = Object.keys(values)
                        .map(field => filterConfig.items.find(item => item.field === field)?.label || field)
                        .join(', ');
                } else if (filterConfig.options && filterConfig.options.length > 0) {
                    // For dropdowns with predefined options, map values to labels
                    valueText = values
                        .map(value => filterConfig.options.find(opt => opt.value === value)?.label || value)
                        .join(', ');
                } else {
                    // For dynamic dropdowns (like County), the values are the labels
                    valueText = Array.isArray(values) ? values.join(', ') : values;
                }
        
                return valueText ? `${filterConfig.label}: ${valueText}` : '';
            })
            .filter(Boolean)
            .join(' | ');

        // Process statistics into two separate columns for the layout
        const rcp45_stats = statisticsData.find(s => s.title.includes("4.5"))?.stats || [];
        const rcp85_stats = statisticsData.find(s => s.title.includes("8.5"))?.stats || [];

        const renderStatRows = (stats) => {
            if (stats.length === 0) return '<tr><td colspan="2">No data for this scenario.</td></tr>';
            return stats
                .filter(s => s && s.count > 0)
                .map(stat => `<tr><td>${stat.label}</td><td>${stat.derivedLengthKm.toFixed(1)} km</td></tr>`)
                .join('');
        };

        const mapImageHtml = mapImageUrl
            ? `<img src="${mapImageUrl}" alt="Map Screenshot" class="map-image"/>`
            : '<p>Map image could not be generated.</p>';

        return `
            <div id="report-preview-content" class="report-preview-content">
                <div class="report-header">
                    <h2>Map showing ${filterText || 'all routes'}</h2>
                </div>
                ${mapImageHtml}
                <div class="stats-grid">
                    <div class="stats-column">
                        <h3>RCP 4.5 Statistics</h3>
                        <table class="report-table">
                            <thead><tr><th>Flood Type</th><th>km Affected</th></tr></thead>
                            <tbody>${renderStatRows(rcp45_stats)}</tbody>
                        </table>
                    </div>
                    <div class="stats-column">
                        <h3>RCP 8.5 Statistics</h3>
                        <table class="report-table">
                            <thead><tr><th>Flood Type</th><th>km Affected</th></tr></thead>
                            <tbody>${renderStatRows(rcp85_stats)}</tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    // Creates the modal shell, injects content, and adds event listeners
    createAndShowModal(modalContentHtml) {
        // Create the modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'report-preview-overlay';
        modalOverlay.innerHTML = `
            <style>
                #report-preview-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1001; font-family: 'Avenir Next', sans-serif; }
                .report-preview-container { background: white; width: 210mm; height: 297mm; display: flex; flex-direction: column; box-shadow: 0 0 20px rgba(0,0,0,0.5); }
                .report-preview-toolbar { padding: 10px; background: #f0f0f0; text-align: right; flex-shrink: 0; border-bottom: 1px solid #ddd; }
                .report-preview-body { padding: 15mm; flex-grow: 1; overflow-y: auto; }
                .report-preview-content h2 { font-size: 16px; font-weight: bold; color: #333; margin: 0 0 10px 0; }
                .report-preview-content .map-image { width: 100%; border: 1px solid #ccc; }
                .report-preview-content .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px; }
                .report-preview-content h3 { font-size: 14px; margin: 0 0 8px 0; border-bottom: 1px solid #eee; padding-bottom: 5px; font-weight: bold; color: #005987;}
                .report-preview-content .report-table { width: 100%; border-collapse: collapse; font-size: 10px; }
                .report-preview-content .report-table th, .report-preview-content .report-table td { border: 1px solid #ddd; padding: 5px; text-align: left; }
                .report-preview-content .report-table th { background-color: #f7f7f7; font-weight: bold; }
            </style>
            <div class="report-preview-container">
                <div class="report-preview-toolbar">
                    <calcite-button id="download-report-pdf-btn" scale="s">Download as PDF</calcite-button>
                    <calcite-button id="cancel-report-btn" scale="s" kind="neutral">Cancel</calcite-button>
                </div>
                <div class="report-preview-body">
                    ${modalContentHtml}
                </div>
            </div>
        `;
        document.body.appendChild(modalOverlay);

        // Add event listeners
        document.getElementById('download-report-pdf-btn').addEventListener('click', () => this.downloadPdf());
        document.getElementById('cancel-report-btn').addEventListener('click', () => this.closeModal());
    }

    // Uses html2pdf to capture the visible modal content
    downloadPdf() {
        this.showLoadingState("Generating PDF...");
        const content = document.getElementById('report-preview-content');
        const options = {
            margin: 15, // Using mm units from jsPDF
            filename: `TII_Flood_Report_${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 3, useCORS: true }, // Increased scale for even better quality
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().from(content).set(options).save().then(() => {
            this.closeModal();
            this.hideLoadingState();
        }).catch(err => {
            this.hideLoadingState();
            console.error("PDF generation failed:", err);
            alert("Could not generate PDF. Please try again.");
        });
    }

    // Removes the modal from the DOM
    closeModal() {
        const modalOverlay = document.getElementById('report-preview-overlay');
        if (modalOverlay) {
            modalOverlay.remove();
        }
    }

    // --- Loading State Methods ---
    showLoadingState(message) {
        let loadingDiv = document.getElementById('report-loading');
        if (!loadingDiv) {
            loadingDiv = document.createElement('div');
            loadingDiv.id = 'report-loading';
            loadingDiv.innerHTML = `<div style="background:rgba(0,0,0,0.7); color:white; padding:20px; border-radius:8px;">${message}</div>`;
            loadingDiv.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; z-index:1002; display:flex; justify-content:center; align-items:center;';
            document.body.appendChild(loadingDiv);
        } else {
            loadingDiv.querySelector('div').textContent = message;
        }
    }

    hideLoadingState() {
        const loadingDiv = document.getElementById('report-loading');
        if (loadingDiv) loadingDiv.remove();
    }
}
