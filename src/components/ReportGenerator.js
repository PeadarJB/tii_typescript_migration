// src/components/ReportGenerator.js

import html2pdf from 'html2pdf.js';
import { CONFIG } from '../config/appConfig.js';

export class ReportGenerator {
    constructor(appManager) {
        this.appManager = appManager;
    }

    async generateReport() {
        this.showLoadingState("Gathering report data...");
        let reportElement;

        try {
            const [mapImageUrl, activeFiltersSummary, statisticsData] = await Promise.all([
                this.getMapImage(),
                this.getActiveFilterSummary(),
                this.getStatisticsData()
            ]);

            this.showLoadingState("Building PDF...");

            const reportHtml = this.buildReportHtml(mapImageUrl, activeFiltersSummary, statisticsData);

            reportElement = document.createElement('div');
            reportElement.style.width = '210mm';
            reportElement.style.position = 'absolute';
            reportElement.style.left = '-9999px';
            reportElement.innerHTML = reportHtml;
            document.body.appendChild(reportElement);

            await new Promise(resolve => setTimeout(resolve, 500));

            const options = {
                margin: [10, 10, 10, 10],
                filename: `TII_Flood_Report_${new Date().toISOString().split('T')[0]}.pdf`,
                image: { type: 'jpeg', quality: 0.95 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            await html2pdf().from(reportElement).set(options).save();

        } catch (error) {
            console.error("Failed to generate report:", error);
            alert("Sorry, there was an error generating the report. Please check the console for details.");
        } finally {
            if (reportElement && reportElement.parentNode) {
                document.body.removeChild(reportElement);
            }
            this.hideLoadingState();
        }
    }

    async getMapImage() {
        const view = this.appManager.components.view;
        if (!view) return null;

        const elementsToHide = [".esri-ui-top-left", ".esri-ui-bottom-left", "#swipe-controls-container", "#chart-generator-shell-panel"];
        elementsToHide.forEach(sel => {
            const el = document.querySelector(sel);
            if (el) el.style.visibility = 'hidden';
        });

        const screenshot = await view.takeScreenshot({ format: 'jpeg', quality: 95, width: 1200 });
        
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

    buildReportHtml(mapImageUrl, activeFiltersSummary, statisticsData) {
        const filterItems = Object.keys(activeFiltersSummary).length > 0
            ? Object.entries(activeFiltersSummary).map(([key, values]) => {
                if (!values || (Array.isArray(values) && values.length === 0) || (typeof values === 'object' && Object.keys(values).length === 0)) {
                    return '';
                }
                
                const filterConfig = CONFIG.filterConfig.find(c => c.id === key);
                const title = filterConfig ? filterConfig.label : key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                
                let valueText;
                if (key === 'flood-scenario' || key === 'scenario-select') {
                    const scenarioConfig = CONFIG.filterConfig.find(c => c.id === 'flood-scenario');
                    valueText = Object.keys(values).map(field => {
                        const scenarioItem = scenarioConfig.items.find(i => i.field === field);
                        return scenarioItem ? scenarioItem.label : field;
                    }).join(', ');
                } else {
                     valueText = Array.isArray(values) ? values.join(', ') : values;
                }
    
                return `<li><strong>${title}:</strong> ${valueText}</li>`;
              }).join('')
            : '<li>None</li>';
    
        const statsTables = statisticsData && statisticsData.length > 0
            ? statisticsData.map(scenario => {
                if (!scenario.stats || scenario.stats.filter(s => s && s.count > 0).length === 0) return '';
                
                const rows = scenario.stats
                    .filter(s => s && s.count > 0)
                    .map(stat => `
                        <tr>
                            <td>${stat.label}</td>
                            <td>${stat.derivedLengthKm.toFixed(1)} km</td>
                            <td>${((stat.count / 53382) * 100).toFixed(2)}%</td>
                        </tr>
                    `).join('');
        
                return `
                    <h3>${scenario.title}</h3>
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>Flood Type</th>
                                <th>km Affected</th>
                                <th>% of Total Network</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                `;
            }).join('<br>')
            : '<p>No statistics data for the current selection.</p>';
    
        return `
            <div class="report-container">
                <style>
                    .report-container { width: 190mm; font-family: Arial, sans-serif; color: #333; margin: 0 auto; }
                    .report-container h1, .report-container h2, .report-container h3 { font-family: 'Avenir Next', sans-serif; }
                    .report-container h2 { font-size: 18px; margin-top: 20px; border-bottom: 1px solid #ccc; padding-bottom: 3px; }
                    .report-container h3 { font-size: 16px; margin-top: 15px; }
                    .report-container .map-image { width: 100%; border: 1px solid #ccc; margin-bottom: 10px; margin-top: 10px; }
                    .report-container .filter-list { list-style-type: none; padding-left: 0; }
                    .report-container .filter-list li { margin-bottom: 5px; }
                    .report-container .report-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
                    .report-container .report-table th, .report-container .report-table td { border: 1px solid #ddd; padding: 6px; text-align: left; }
                    .report-container .report-table th { background-color: #f2f2f2; font-weight: bold; }
                    .report-header { text-align: center; margin-bottom: 20px; }
                    .report-header .title { font-size: 28px; color: #005987; margin: 0;}
                    .report-header .subtitle { font-size: 14px; color: #555; margin: 0;}
                    .page-break { page-break-after: always; }
                </style>
                
                <div class="report-header">
                    <h1 class="title">TII Flood Risk Report</h1>
                    <p class="subtitle">Generated on: ${new Date().toLocaleDateString('en-IE', { dateStyle: 'long' })}</p>
                </div>
                
                <h2>Active Filters</h2>
                <ul class="filter-list">${filterItems}</ul>
                
                <h2>Map View</h2>
                <img src="${mapImageUrl}" alt="Map Screenshot" class="map-image"/>
                
                <div class="page-break"></div>
    
                <h2>Statistics Summary</h2>
                ${statsTables}
            </div>
        `;
    }

    showLoadingState(message) {
        let loadingDiv = document.getElementById('report-loading');
        if (!loadingDiv) {
            loadingDiv = document.createElement('div');
            loadingDiv.id = 'report-loading';
            loadingDiv.innerHTML = `<div style="background:rgba(0,0,0,0.7); color:white; padding:20px; border-radius:8px;">${message}</div>`;
            loadingDiv.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; z-index:1001; display:flex; justify-content:center; align-items:center;';
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
