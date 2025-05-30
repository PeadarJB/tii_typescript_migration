// --- Importing Necessary Modules ---

// Import the 'initializeMapView' function from our MapView component.
// This function is responsible for setting up the ArcGIS Map and MapView.
// We've removed getMapView/getWebMap from this import line for this example,
// as 'initializeMapView' now returns them directly. They can be added back if needed.
import { initializeMapView } from './components/MapView.js';

// Import the FilterManager class from its component file.
import { FilterManager } from './components/FilterManager.js';

// Import the StatisticsManager class from its component file.
import { StatisticsManager } from './components/StatisticsManager.js';

// Import the SwipeWidgetManager class from its component file.
// This will handle the layer comparison functionality using ArcGIS Swipe widget.
import { SwipeWidgetManager } from './components/SwipeWidgetManager.js';

// Import the global application CONFIG object.
// The path './config/appConfig.js' means "from the current directory (src/),
// go into 'config' directory, and find 'appConfig.js'".
import { CONFIG } from './config/appConfig.js';

// Import the main CSS file for the application. Webpack will handle bundling this.
import './styles/main.css';

// --- Main Application Function ---

// 'async function startApp()' defines the main entry point for our application's logic.
// It's 'async' because it will use 'await' to handle asynchronous operations like loading the map.
async function startApp() {
    // 'try...catch' block is used for error handling. If any error occurs within the 'try' block,
    // the code inside the 'catch' block will be executed.
    try {
        // --- Initialize the Map ---
        // Call 'initializeMapView' (from MapView.js) and wait for it to complete.
        // It returns an object containing the 'view' (MapView instance) and 'webmap' (WebMap instance).
        // We use "destructuring assignment" ({ view, webmap }) to get these a D assign them to local constants.
        // "viewDiv" is the ID of the div in index.html where the map should be rendered.
        const { view, webmap } = await initializeMapView("viewDiv");
        console.log("main.js: Map has been initialized by MapView.js.");

        // --- Get the Target Layer for Filters and Statistics ---
        // We need to find our specific road network layer within the layers of the loaded WebMap.
        // 'webmap.layers' is a collection of all layers in the WebMap.
        // '.find()' is an array method that searches for the first element satisfying a condition.
        // The condition here is that the layer's 'title' property must exactly match
        // the 'roadNetworkLayerTitle' we defined in our CONFIG.
        const roadNetworkLayer = webmap.layers.find(layer => layer.title === CONFIG.roadNetworkLayerTitle);

        // --- Initialize Swipe Widget Manager ---
        // Create a new instance of our SwipeWidgetManager class.
        // We pass it the 'view' (MapView) and 'webmap' that it needs to function.
        // This manager will handle all swipe widget functionality throughout the app.
        const swipeManager = new SwipeWidgetManager(view, webmap);
        console.log("main.js: SwipeWidgetManager has been initialized.");

        // --- Setup Swipe Widget Controls ---
        // Create UI controls for the swipe widget functionality.
        // This adds buttons and dropdowns to let users create and control swipe comparisons.
        setupSwipeControls(swipeManager, webmap);

        // --- Check if the Layer Was Found and Proceed ---
        if (roadNetworkLayer) {
            // It's good practice to ensure the layer is fully loaded before performing queries on it,
            // especially if it's a complex layer or just added to the map.
            // 'await roadNetworkLayer.load()' will pause here until the layer confirms it's ready.
            await roadNetworkLayer.load();
            console.log(`main.js: Successfully found and loaded road network layer: "${roadNetworkLayer.title}"`);

            
            // --- Initialize Filter Manager ---
            // Create a new instance of our FilterManager class.
            // We pass it:
            //  - 'filter-controls-container': The ID of the div in index.html where filters will go.
            //  - 'view': The MapView instance (in case filters need to interact with the map view, e.g., spatial filters).
            //  - 'roadNetworkLayer': The layer that the filters will operate on.
            const filterManager = new FilterManager('filter-controls-container', view, roadNetworkLayer);
            // Call the method to create and display the filter UI elements. This is also async.
            await filterManager.initializeFilters();

            // --- Initialize Statistics Manager ---
            // Create a new instance of our StatisticsManager class.
            // We pass it:
            //  - 'indicator-boxes-container': The ID of the div for numeric stats.
            //  - 'pie-chart-container': The ID of the div for charts.
            //  - 'roadNetworkLayer': The layer to get statistics from.
            const statsManager = new StatisticsManager('indicator-boxes-container', 'pie-chart-container', roadNetworkLayer);
            // Call the method to calculate and display the initial set of statistics (showing all data).
            // This is async because it involves querying the layer.
            await statsManager.updateAllStatistics(); // Default is "1=1" (all data)

            // --- Connect Filter Changes to Statistics Updates ---
            // This is a crucial part for interactivity!
            // We use the 'onFilterChange' method we defined in FilterManager.
            // We provide it a "callback function". This function will be executed by FilterManager
            // *every time* the filters are applied.
            // The 'newDefinitionExpression' is the updated filter query string that FilterManager creates.
            filterManager.onFilterChange((newDefinitionExpression) => {
                // This code runs when a filter is changed by the user.
                console.log("main.js: Filter has changed. New definitionExpression:", newDefinitionExpression);
                // Tell the StatisticsManager to update its display using the new filter expression.
                statsManager.updateAllStatistics(newDefinitionExpression);
            });

        } else {
            // If the roadNetworkLayer couldn't be found in the WebMap (e.g., title mismatch, layer not in map),
            // log an error and display a message to the user. The dashboard can't function without this layer.
            console.error(`main.js: CRITICAL - Road network layer titled "${CONFIG.roadNetworkLayerTitle}" was not found in the WebMap.`);
            const errorDisplayContainer = document.getElementById('filter-controls-container') || document.body;
            errorDisplayContainer.innerHTML = `<p style="color: red; text-align: center; font-weight: bold;">Error: Critical data layer ("${CONFIG.roadNetworkLayerTitle}") not found. Dashboard cannot operate fully.</p>`;
        }

    } catch (error) {
        // If any error occurs during the 'startApp' process (e.g., map loading fails, component initialization fails),
        // it will be caught here.
        console.error("main.js: Failed to initialize the application due to an error:", error);
        // Display a generic error message to the user on the page.
        // This could be made more user-friendly or specific if needed.
        const appBody = document.body;
        appBody.innerHTML = `<p style="color: red; text-align: center; padding: 20px; font-size: 1.2em;">A critical error occurred while starting the application. Please try again later or contact support. Details: ${error.message}</p>`;
    }
}

// --- Start the Application ONLY After DOM is Ready ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("main.js: DOM fully loaded and parsed. Starting app.");
    startApp();
});

