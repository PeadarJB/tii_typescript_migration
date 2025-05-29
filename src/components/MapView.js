// --- Importing Necessary Modules ---

// Import the 'WebMap' class from the ArcGIS Maps SDK.
// A WebMap is a way to represent a map that's been saved in ArcGIS Online or Portal.
// It includes layers, basemaps, pop-up configurations, bookmarks, etc., all defined in one item.
import WebMap from "@arcgis/core/WebMap.js";

// Import the 'MapView' class from the ArcGIS Maps SDK.
// A MapView is what actually renders a 2D map (WebMap or a simple Map object) in your web page,
// allowing users to see and interact with it (pan, zoom, click).
import MapView from "@arcgis/core/views/MapView.js";

// Import the CONFIG object from our application's configuration file.
// This CONFIG object holds settings like the ID of the WebMap we want to load.
// The path "../config/appConfig.js" means "go up one directory from here (components/),
// then into the 'config' directory, and find 'appConfig.js'".
import { CONFIG } from "../config/appConfig.js";

// --- Module-Level Variables ---

// These variables are declared outside any function, making them accessible
// within this module (this file). We use 'let' because their values will be assigned later.

// 'view' will hold the instance (the created object) of our MapView once it's initialized.
// We keep it at this level so we can check if the map has already been set up
// and also to provide access to it via the getMapView() function.
let view;

// 'webmap' will hold the instance of our WebMap once it's loaded.
// Similar to 'view', this allows us to store and reuse the loaded WebMap object.
let webmap;

// --- Main Function to Initialize the Map ---

/**
 * JSDoc comment: This describes the function for documentation purposes.
 * Initializes the ArcGIS MapView by loading a WebMap specified in the application's configuration.
 * It places the map into a specified HTML container.
 *
 * @param {string} [containerId="viewDiv"] - The ID of the HTML <div> element where the map should be rendered.
 * If no ID is provided, it defaults to "viewDiv". The `[]` around containerId in JSDoc means it's optional.
 * @returns {Promise<{view: MapView, webmap: WebMap}>}
 * A Promise that, when successfully resolved, provides an object containing:
 * - `view`: The initialized MapView instance.
 * - `webmap`: The loaded WebMap instance.
 * If an error occurs, the Promise will be rejected.
 */
// 'export' makes this function available to be imported and used in other JavaScript files (like main.js).
export function initializeMapView(containerId = "viewDiv") {
    // --- Prevent Re-initialization ---
    // Check if the 'view' variable already has a MapView instance.
    // This is a simple guard to prevent accidentally trying to create the map more than once
    // if this function were to be called multiple times.
    if (view) {
        // If 'view' already exists, log a warning to the console.
        console.warn("MapView.js: MapView has already been initialized.");
        // Immediately return a Promise that resolves with the existing 'view' and 'webmap'.
        // 'Promise.resolve()' creates a Promise that is already successfully completed.
        return Promise.resolve({ view, webmap });
    }

    // --- Create and Load the WebMap ---
    // 'new WebMap({...})' creates a new WebMap object.
    // We pass it a configuration object.
    webmap = new WebMap({
        // The 'portalItem' property tells the WebMap to load its definition
        // from an item stored in ArcGIS Online or an ArcGIS Portal.
        portalItem: {
            // 'id': This is the unique ID of the WebMap item in ArcGIS Online.
            // We get this ID from our global CONFIG object.
            id: CONFIG.webMapId
        }
        // When the WebMap is created this way, it will automatically start loading
        // its definition and all its layers from the server.
    });

    // --- Create the MapView ---
    // 'new MapView({...})' creates a new MapView object, which will display the WebMap.
    view = new MapView({
        // 'container': This crucial property tells the MapView which HTML element (by its ID)
        // on your web page should be used to display the map.
        // 'containerId' is the parameter passed to this function (defaults to "viewDiv").
        container: containerId,

        // 'map': This property associates the MapView with the 'webmap' object we just created.
        // So, this MapView will display the contents of that WebMap.
        map: webmap,

        // Note on initial view properties like center, zoom, and extent:
        // When you load a WebMap, these properties are usually already defined and saved
        // as part of the WebMap item in ArcGIS Online. So, you often don't need to
        // set 'center', 'zoom', or 'extent' here in the MapView constructor,
        // as it will use what's defined in the WebMap.
        // You *can* override them here if you have a specific reason to.
    });

    // --- Handle Asynchronous Loading ---
    // Creating a MapView and loading a WebMap are asynchronous operations because they
    // involve fetching data from servers and rendering complex graphics.
    // 'view.when()' returns a Promise. A Promise is an object representing the eventual
    // completion (or failure) of an asynchronous operation.
    // The code inside '.then()' will execute only when the MapView is fully ready and displayed.
    // The code inside '.catch()' will execute if any error occurs during this process.
    return view.when()
        .then(() => {
            // This block executes when the MapView is successfully initialized and the WebMap is loaded.
            console.log("MapView.js: MapView and WebMap are ready.");

            // For debugging or information, let's log the titles of the layers found in the WebMap.
            // 'webmap.layers' is a collection of layers in the WebMap.
            // '.map(layer => layer.title)' creates a new array containing just the titles of these layers.
            console.log("MapView.js: Layers in WebMap:", webmap.layers.map(layer => layer.title));

            // At this point, you could perform additional setup tasks that depend on the view being ready.
            // For example, adding custom widgets to the view, setting up event listeners for map clicks, etc.
            // (e.g., view.ui.add(myWidget, "top-right");)

            // The Promise should resolve with the 'view' and 'webmap' instances so that
            // the code that called 'initializeMapView' (e.g., main.js) can use them.
            return { view, webmap };
        })
        .catch(error => {
            // This block executes if an error occurred while initializing the MapView or loading the WebMap.
            console.error("MapView.js: Error initializing MapView or WebMap:", error);

            // Try to display a user-friendly error message directly in the map's container div.
            // 'document.getElementById(containerId)' gets the HTML element for the map.
            const mapContainer = document.getElementById(containerId);
            if (mapContainer) { // Check if the container element actually exists
                // 'innerHTML' lets us set the HTML content of an element.
                // We're creating a paragraph with an error message.
                // '(error.message || error)' tries to show a specific error message if available,
                // otherwise, it shows the whole error object (converted to string).
                mapContainer.innerHTML = `<p style="color: red; text-align: center; padding: 20px;">Error loading map: ${error.message || error}. Please check the WebMap ID and sharing settings.</p>`;
            }

            // 'throw error;' re-throws the error. This is important because it means the Promise
            // returned by 'initializeMapView' will be *rejected*. The calling code (in main.js)
            // can then also catch this error and handle it appropriately (e.g., stop the app).
            throw error;
        });
}

// --- Utility Getter Functions ---

/**
 * JSDoc: Utility function to get the already initialized MapView instance.
 * This allows other modules to safely access the 'view' object after it has been created.
 * @returns {MapView | null} The MapView instance, or `undefined` if `initializeMapView` hasn't successfully run.
 * (Technically returns `undefined` if not set, JSDoc says `null` which is a common convention for "no object").
 */
export function getMapView() {
    // Returns the current value of the module-level 'view' variable.
    return view;
}

/**
 * JSDoc: Utility function to get the already initialized WebMap instance.
 * This allows other modules to safely access the 'webmap' object.
 * @returns {WebMap | null} The WebMap instance, or `undefined` if `initializeMapView` hasn't successfully run.
 */
export function getWebMap() {
    // Returns the current value of the module-level 'webmap' variable.
    return webmap;
}