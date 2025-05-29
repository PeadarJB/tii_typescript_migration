import { initializeMapView } from './components/MapView.js'; // getMapView, getWebMap removed for simplicity here, can be added back if needed elsewhere
import { FilterManager } from './components/FilterManager.js';
import { StatisticsManager } from './components/StatisticsManager.js';
import { CONFIG } from './config/appConfig.js'; // Assuming CONFIG is used by managers directly or passed
import './styles/main.css';

async function startApp() {
    try {
        const { view, webmap } = await initializeMapView("viewDiv");
        console.log("main.js: Map initialized.");

        // Get the road network layer from the WebMap
        // Important: Ensure CONFIG.roadNetworkLayerTitle exactly matches the title of the layer in your WebMap
        const roadNetworkLayer = webmap.layers.find(layer => layer.title === CONFIG.roadNetworkLayerTitle);

        if (roadNetworkLayer) {
            // Make sure the layer is loaded before using it for queries
            await roadNetworkLayer.load();
            console.log(`main.js: Found road network layer: "${roadNetworkLayer.title}"`);

            // Initialize Filter Manager
            // Pass the ID of the HTML container for filters from index.html
            const filterManager = new FilterManager('filter-controls-container', view, roadNetworkLayer);
            await filterManager.initializeFilters(); // Asynchronously populates and creates filters

            // Initialize Statistics Manager
            // Pass IDs of HTML containers for stats and chart from index.html
            const statsManager = new StatisticsManager('indicator-boxes-container', 'pie-chart-container', roadNetworkLayer);
            await statsManager.updateStatistics(); // Display initial statistics for all data

            // Connect FilterManager changes to StatisticsManager updates
            filterManager.onFilterChange((newDefinitionExpression) => {
                console.log("main.js: Filter changed, updating statistics with expression:", newDefinitionExpression);
                statsManager.updateStatistics(newDefinitionExpression);
            });

        } else {
            console.error(`main.js: Road network layer "${CONFIG.roadNetworkLayerTitle}" not found in WebMap.`);
            // Display an error to the user in a UI element if desired
            document.getElementById('filter-controls-container').innerHTML = `<p style="color: red;">Error: Critical data layer not found. Dashboard cannot operate.</p>`;
        }

    } catch (error) {
        console.error("main.js: Failed to initialize the application.", error);
        // Consider a more user-friendly error display on the page
    }
}

startApp();