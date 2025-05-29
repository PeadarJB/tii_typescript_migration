import WebMap from "@arcgis/core/WebMap.js";
import MapView from "@arcgis/core/views/MapView.js";
import { CONFIG } from "../config/appConfig.js"; // Adjust path as necessary

let view; // To hold the MapView instance
let webmap; // To hold the WebMap instance

/**
 * Initializes the ArcGIS MapView with the configured WebMap.
 * @param {string} containerId - The ID of the HTML element to house the map.
 * @returns {Promise<{view: MapView, webmap: WebMap}>} A promise that resolves with the view and webmap instances.
 */
export function initializeMapView(containerId = "viewDiv") {
    // Ensure it only initializes once if called multiple times, though typically called once.
    if (view) {
        console.warn("MapView already initialized.");
        return Promise.resolve({ view, webmap });
    }

    webmap = new WebMap({
        portalItem: {
            id: CONFIG.webMapId
        }
    });

    view = new MapView({
        container: containerId,
        map: webmap,
        // Center, zoom, and other initial view properties are typically defined
        // by the WebMap itself. You can override them here if needed.
    });

    return view.when()
        .then(() => {
            console.log("MapView.js: MapView and WebMap are ready.");
            console.log("MapView.js: Layers in WebMap:", webmap.layers.map(layer => layer.title));
            // You can perform additional map/view setup here if needed
            return { view, webmap };
        })
        .catch(error => {
            console.error("MapView.js: Error initializing MapView or WebMap:", error);
            // Display a user-friendly error message on the page if possible
            const mapContainer = document.getElementById(containerId);
            if (mapContainer) {
                mapContainer.innerHTML = `<p style="color: red; text-align: center; padding: 20px;">Error loading map: ${error.message || error}. Please check the WebMap ID and sharing settings.</p>`;
            }
            throw error; // Re-throw the error for further handling if necessary
        });
}

/**
 * Utility function to get the already initialized view instance.
 * @returns {MapView | null} The MapView instance or null if not initialized.
 */
export function getMapView() {
    return view;
}

/**
 * Utility function to get the already initialized webmap instance.
 * @returns {WebMap | null} The WebMap instance or null if not initialized.
 */
export function getWebMap() {
    return webmap;
}