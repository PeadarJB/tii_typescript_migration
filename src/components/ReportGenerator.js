// src/components/ReportGenerator.js

import html2pdf from 'html2pdf.js';

export class ReportGenerator {
    constructor(appManager) {
        this.appManager = appManager;
    }

    async generateReport() {
        this.showLoadingState("Generating Report...");

        try {
            // 1. Gather all the necessary data in parallel
            const [mapImageUrl, activeFilters, statisticsData] = await Promise.all([
                this.getMapImage(),
                this.getActiveFilterSummary(),
                this.getStatisticsData()
            ]);

            // 2. Build the report HTML using the gathered data
            const reportHtml = this.buildReportHtml(mapImageUrl, activeFilters, statisticsData);

            // 3. Create a hidden element to render the report for PDF conversion
            const reportElement = document.createElement('div');
            reportElement.style.display = 'block'; // Keep it visible for the library to measure
            reportElement.style.position = 'absolute';
            reportElement.style.left = '-9999px'; // Position it off-screen
            reportElement.innerHTML = reportHtml;
            document.body.appendChild(reportElement);

            // 4. Configure and run the PDF generator
            const options = {
                margin: 10,
                filename: `TII_Flood_Report_${new Date().toISOString().split('T')[0]}.pdf`,
                image: { type: 'jpeg', quality: 0.95 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            
            await html2pdf().from(reportElement).set(options).save();

            // 5. Clean up
            document.body.removeChild(reportElement);
            this.hideLoadingState();

        } catch (error) {
            console.error("Failed to generate report:", error);
            this.hideLoadingState();
            alert("Sorry, there was an error generating the report. Please check the console for details.");
        }
    }
    
    // --- Data Gathering Methods ---

    async getMapImage() {
        const view = this.appManager.components.view;
        // Temporarily hide UI elements on the map for a clean screenshot
        const elementsToHide = [".esri-ui-top-left", ".esri-ui-bottom-left", "#swipe-controls-container"];
        elementsToHide.forEach(sel => {
            const el = document.querySelector(sel);
            if (el) el.style.display = 'none';
        });

        const screenshot = await view.takeScreenshot({ format: 'jpeg', quality: 95, width: 1000 });
        
        // Show the UI elements again
        elementsToHide.forEach(sel => {
            const el = document.querySelector(sel);
            if (el) el.style.display = '';
        });

        return screenshot.dataUrl;
    }

    getActiveFilterSummary() {
        return this.appManager.components.filterManager?.getCurrentFilterSummary() || {};
    }

    getStatisticsData() {
        return this.appManager.components.statsManager?.getCurrentScenariosData() || [];
    }

    // --- HTML Building Method ---

    buildReportHtml(mapImageUrl, activeFiltersSummary, statisticsData) {
        const filterItems = Object.entries(activeFiltersSummary).length > 0
        ? Object.entries(activeFiltersSummary).map(([key, values]) => {
            const title = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            return `<li><strong>${title}:</strong> ${Array.isArray(values) ? values.join(', ') : values}</li>`;
          }).join('')
        : '<li>None</li>';

        const statsTables = statisticsData.map(scenario => {
            if (!scenario.stats || scenario.stats.filter(s => s.count > 0).length === 0) return '';
            
            const rows = scenario.stats
                .filter(s => s.count > 0)
                .map(stat => `
                    <tr>
                        <td>${stat.label}</td>
                        <td>${stat.derivedLengthKm.toFixed(1)} km</td>
                        <td>${((stat.count / 53382) * 100).toFixed(1)}%</td>
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
        }).join('<br>');

        return `
            <div class="report-container">
                <style>
                    .report-container { width: 200mm; font-family: Arial, sans-serif; color: #333; }
                    .report-container h1 { font-size: 24px; color: #005987; border-bottom: 2px solid #005987; padding-bottom: 5px;}
                    .report-container h2 { font-size: 18px; margin-top: 20px; }
                    .report-container h3 { font-size: 16px; margin-top: 15px; }
                    .report-container .map-image { width: 100%; border: 1px solid #ccc; margin-bottom: 20px; }
                    .report-container .filter-list { list-style-type: none; padding-left: 0; }
                    .report-container .report-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    .report-container .report-table th, .report-container .report-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    .report-container .report-table th { background-color: #f2f2f2; }
                </style>
                <h1>TII Flood Risk Report</h1>
                <p>Generated on: ${new Date().toLocaleDateString('en-IE', { dateStyle: 'long' })}</p>
                
                <h2>Map View</h2>
                <img src="${mapImageUrl}" alt="Map Screenshot" class="map-image"/>
                
                <h2>Active Filters</h2>
                <ul class="filter-list">${filterItems}</ul>
                
                <h2>Statistics Summary</h2>
                ${statsTables}
            </div>
        `;
    }

    // --- Loading State Methods ---

    showLoadingState(message) {
        let loadingDiv = document.getElementById('report-loading');
        if (!loadingDiv) {
            loadingDiv = document.createElement('div');
            loadingDiv.id = 'report-loading';
            loadingDiv.innerHTML = `<div style="background:rgba(0,0,0,0.7); color:white; padding:20px; border-radius:8px;">${message}</div>`;
            loadingDiv.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; z-index:1001; display:flex; justify-content:center; align-items:center;';
            document.body.appendChild(loadingDiv);
        }
    }

    hideLoadingState() {
        const loadingDiv = document.getElementById('report-loading');
        if (loadingDiv) loadingDiv.remove();
    }
}