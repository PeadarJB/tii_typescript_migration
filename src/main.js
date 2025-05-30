// --- Importing Necessary Modules ---

import { initializeMapView } from './components/MapView.js';
import { FilterManager } from './components/FilterManager.js';
import { StatisticsManager } from './components/StatisticsManager.js';
import { SwipeWidgetManager } from './components/SwipeWidgetManager.js';
import { SwipeControlsUI } from './components/SwipeControlsUI.js'; // New UI component
import { CONFIG } from './config/appConfig.js';
import './styles/main.css';

// --- Main Application Function ---
async function startApp() {
    try {
        // --- Initialize the Map ---
        const { view, webmap } = await initializeMapView("viewDiv");
        console.log("main.js: Map has been initialized by MapView.js.");

        // --- Get the Target Layer for Filters and Statistics ---
        const roadNetworkLayer = webmap.layers.find(layer => layer.title === CONFIG.roadNetworkLayerTitle);

        // --- Initialize Swipe Widget Manager ---
        const swipeManager = new SwipeWidgetManager(view, webmap);
        console.log("main.js: SwipeWidgetManager has been initialized.");

        // --- Initialize Swipe Controls UI ---
        const swipeControlsUI = new SwipeControlsUI('swipe-controls-container', swipeManager, webmap);
        await swipeControlsUI.initialize();
        console.log("main.js: SwipeControlsUI has been initialized.");

        // --- Check if the Layer Was Found and Proceed ---
        if (roadNetworkLayer) {
            await roadNetworkLayer.load();
            console.log(`main.js: Successfully found and loaded road network layer: "${roadNetworkLayer.title}"`);

            // --- Initialize Filter Manager ---
            const filterManager = new FilterManager('filter-controls-container', view, roadNetworkLayer);
            await filterManager.initializeFilters();

            // --- Initialize Statistics Manager ---
            const statsManager = new StatisticsManager('indicator-boxes-container', 'pie-chart-container', roadNetworkLayer);
            await statsManager.updateAllStatistics();

            // --- Connect Filter Changes to Statistics Updates ---
            filterManager.onFilterChange((newDefinitionExpression) => {
                console.log("main.js: Filter has changed. New definitionExpression:", newDefinitionExpression);
                statsManager.updateAllStatistics(newDefinitionExpression);
            });

        } else {
            console.error(`main.js: CRITICAL - Road network layer titled "${CONFIG.roadNetworkLayerTitle}" was not found in the WebMap.`);
            const errorDisplayContainer = document.getElementById('filter-controls-container') || document.body;
            errorDisplayContainer.innerHTML = `<p style="color: red; text-align: center; font-weight: bold;">Error: Critical data layer ("${CONFIG.roadNetworkLayerTitle}") not found. Dashboard cannot operate fully.</p>`;
        }

    } catch (error) {
        console.error("main.js: Failed to initialize the application due to an error:", error);
        const appBody = document.body;
        appBody.innerHTML = `<p style="color: red; text-align: center; padding: 20px; font-size: 1.2em;">A critical error occurred while starting the application. Please try again later or contact support. Details: ${error.message}</p>`;
    }
}

// --- Start the Application ONLY After DOM is Ready ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("main.js: DOM fully loaded and parsed. Starting app.");
    startApp();
});