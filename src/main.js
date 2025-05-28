// Import the Map class from ArcGIS Maps SDK - creates the map data structure
import Map from "@arcgis/core/Map.js";

// Import MapView class - handles the visual display and user interaction with the map
import MapView from "@arcgis/core/views/MapView.js";

// Create a new Map instance with a basemap
const map = new Map({
    basemap: "streets-vector" // Set the basemap style (vector-based streets map)
});

// Create a MapView instance to display the map in the browser
const view = new MapView({
    container: "viewDiv",        // HTML element ID where map will be rendered
    map: map,                    // The map instance to display
    center: [-8.0, 53.5],       // Map center coordinates [longitude, latitude] - centered on Ireland
    zoom: 7                      // Initial zoom level (higher = more zoomed in)
});

// Execute code when the MapView is fully loaded and ready
view.when(() => {
    console.log("Map is ready!"); // Log message to browser console when map finishes loading
});