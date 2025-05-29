import { initializeMapView, getMapView, getWebMap } from './components/MapView.js';
import './styles/main.css'; // Import main CSS file
// Import other top-level component initializers here later (e.g., FilterManager, StatsManager)

// This function will be the main entry point for our application logic
async function startApp() {
    try {
        // Initialize the map. The initializeMapView function now returns a promise
        // that resolves with the view and webmap instances.
        const { view, webmap } = await initializeMapView("viewDiv"); // "viewDiv" is the ID from your index.html

        // Now you have access to the 'view' and 'webmap' objects here.
        // You can pass them to other modules or components that need them.
        console.log("main.js: Map initialized. View extent:", view.extent);

        // --- Placeholder for initializing other components ---
        // For example, once FilterManager and StatisticsManager are created:
        // const roadNetworkLayer = webmap.layers.find(layer => layer.title === CONFIG.roadNetworkLayerTitle);
        // if (roadNetworkLayer) {
        //     const filterManager = new FilterManager(view, roadNetworkLayer);
        //     const statsManager = new StatisticsManager(roadNetworkLayer);
        //
        //     // Example of connecting them (conceptual)
        //     filterManager.on('filterChange', (newDefinitionExpression) => {
        //         statsManager.updateStatistics(newDefinitionExpression);
        //     });
        // } else {
        //     console.error(`main.js: Road network layer "${CONFIG.roadNetworkLayerTitle}" not found in WebMap.`);
        // }
        // --- End of placeholder ---

    } catch (error) {
        console.error("main.js: Failed to initialize the application.", error);
        // Display a general error message to the user if the map couldn't load.
        const appContainer = document.body; // Or a more specific error div
        appContainer.innerHTML = `<p style="color: red; text-align: center; padding: 20px;">Critical error: Could not start the application. ${error.message}</p>`;
    }
}

// Start the application
startApp();