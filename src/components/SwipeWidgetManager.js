// src/components/SwipeWidgetManager.js
// Import the ArcGIS Swipe widget - this is what creates the swipe functionality
import Swipe from "@arcgis/core/widgets/Swipe.js";

// Export our custom class so other files can use it
export class SwipeWidgetManager {
    // Constructor runs when we create a new instance of this class
    // It sets up the basic properties we need
    constructor(view, webmap) {
        this.view = view;           // The map view where the widget will be displayed
        this.webmap = webmap;       // The webmap containing all the layers
        this.swipeWidget = null;    // Will hold our swipe widget once created (starts empty)
    }

    // This is the main function that creates and sets up the swipe widget
    // Parameters:
    // - leftLayerTitlesArray: array of names of the layers to show on the left side
    // - rightLayerTitlesArray: array of names of the layers to show on the right side  
    // - initialPosition: where to place the swipe line (0-100, default 50 = middle)
    // - direction: "horizontal" or "vertical" swipe direction
    async initializeSwipe(leftLayerTitlesArray, rightLayerTitlesArray, initialPosition = 50, direction = "horizontal") {
        
        // STEP 1: Check if we have the required components
        if (!this.view || !this.webmap) {
            console.error("SwipeWidgetManager: View or WebMap not provided.");
            return false; 
        }

        // STEP 2: Make sure layer title arrays were provided and are not empty
        if (!leftLayerTitlesArray || leftLayerTitlesArray.length === 0 || !rightLayerTitlesArray || rightLayerTitlesArray.length === 0) {
            console.error("SwipeWidgetManager: Layer title arrays must be provided and be non-empty.");
            return false;
        }

        // STEP 3: Clean up any existing swipe widget first
        if (this.swipeWidget) {
            this.destroy(); 
        }

        try {
            // STEP 4: Find the actual layer objects by their names for leading layers
            const leadingLayerObjects = [];
            for (const title of leftLayerTitlesArray) {
                const layer = this.findLayer(title);
                if (layer) {
                    leadingLayerObjects.push(layer);
                } else {
                    console.warn(`SwipeWidgetManager: Left layer not found: "${title}"`);
                }
            }

            // Find the actual layer objects for trailing layers
            const trailingLayerObjects = [];
            for (const title of rightLayerTitlesArray) {
                const layer = this.findLayer(title);
                if (layer) {
                    trailingLayerObjects.push(layer);
                } else {
                    console.warn(`SwipeWidgetManager: Right layer not found: "${title}"`);
                }
            }

            // STEP 5: Make sure we found at least one layer for each side
            if (leadingLayerObjects.length === 0 || trailingLayerObjects.length === 0) {
                this.logMissingLayers(leadingLayerObjects, trailingLayerObjects, leftLayerTitlesArray, rightLayerTitlesArray);
                return false;
            }
            
            // STEP 6: Load all unique layers from the server
            const allLayersToLoad = [...new Set([...leadingLayerObjects, ...trailingLayerObjects])];
            await this.loadLayers(allLayersToLoad);
            
            // STEP 7: Make sure all selected layers are visible on the map
            allLayersToLoad.forEach(layer => layer.visible = true);

            // STEP 8: Create the actual swipe widget
            this.swipeWidget = new Swipe({
                view: this.view,
                leadingLayers: leadingLayerObjects,   // Pass array of layer objects
                trailingLayers: trailingLayerObjects, // Pass array of layer objects
                direction: direction,
                position: initialPosition
            });

            // STEP 9: Add the widget to the map's user interface
            this.view.ui.add(this.swipeWidget);
            console.log("SwipeWidgetManager: Swipe widget initialized successfully with multiple layers.", {
                leading: leadingLayerObjects.map(l => l.title),
                trailing: trailingLayerObjects.map(l => l.title)
            });
            return true;

        } catch (error) {
            console.error("SwipeWidgetManager: Error initializing swipe widget.", error);
            return false;
        }
    }

    // Helper function to find a layer by its name/title
    findLayer(layerTitle) {
        let layer = this.webmap.layers.find(l => l.title === layerTitle);
        if (!layer) {
            for (const parentLayer of this.webmap.layers) {
                if (parentLayer.layers && parentLayer.layers.length > 0) { // Check if it's a group layer with sublayers
                    layer = parentLayer.layers.find(sublayer => sublayer.title === layerTitle);
                    if (layer) break; 
                }
            }
        }
        return layer; 
    }

    // Helper function to load layers from the server
    async loadLayers(layers) {
        const loadPromises = layers.map(async (layer) => {
            try {
                if (!layer.loaded) { // Only load if not already loaded
                    await layer.load();
                }
                return { layer, success: true }; 
            } catch (error) {
                console.error(`Failed to load layer: ${layer.title}`, error);
                return { layer, success: false, error }; 
            }
        });

        const results = await Promise.allSettled(loadPromises); // Use allSettled to continue if some fail
        
        const failedLayers = results.filter(result => result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.success));
        
        if (failedLayers.length > 0) {
            const failedLayerTitles = failedLayers.map(r => r.status === 'fulfilled' ? r.value.layer.title : 'Unknown layer (promise rejected)');
            console.error(`SwipeWidgetManager: Failed to load some layers: ${failedLayerTitles.join(', ')}`);
            // Decide if this is a critical failure or if you can proceed with loaded layers
            // For now, we proceed, but you might want to throw an error if all layers for one side failed.
        }
    }

    // Helper function to provide detailed error messages when layers aren't found
    logMissingLayers(foundLeading, foundTrailing, requestedLeadingTitles, requestedTrailingTitles) {
        console.warn("SwipeWidgetManager: Could not find one or more layers for swipe.");
        if (foundLeading.length === 0) {
            console.warn(`No leading layers found from requested: "${requestedLeadingTitles.join('", "')}"`);
        }
        if (foundTrailing.length === 0) {
            console.warn(`No trailing layers found from requested: "${requestedTrailingTitles.join('", "')}"`);
        }
        // Log available layers for debugging
        const availableLayerTitles = [];
        this.webmap.layers.forEach(layer => {
            availableLayerTitles.push(layer.title);
            if (layer.layers && layer.layers.length > 0) {
                layer.layers.forEach(subLayer => availableLayerTitles.push(`  (Group) ${subLayer.title}`));
            }
        });
        console.log("Available layers in webmap:", availableLayerTitles);
    }

    // Function to change where the swipe line is positioned after the widget is created
    updatePosition(position) {
        if (this.swipeWidget && position >= 0 && position <= 100) {
            this.swipeWidget.position = position; 
            return true; 
        }
        return false; 
    }

    // Function to change the swipe direction after the widget is created
    updateDirection(direction) {
        if (this.swipeWidget && (direction === "horizontal" || direction === "vertical")) {
            this.swipeWidget.direction = direction; 
            return true; 
        }
        return false; 
    }

    // Function to show or hide a specific layer
    toggleLayerVisibility(layerTitle, visible) {
        const layer = this.findLayer(layerTitle); 
        if (layer) {
            layer.visible = visible; 
            return true; 
        }
        return false; 
    }

    // Function to get the current position of the swipe line
    getPosition() {
        return this.swipeWidget ? this.swipeWidget.position : null;
    }

    // Function to check if the swipe widget is currently active/created
    isActive() {
        return this.swipeWidget !== null;
    }

    // Clean up method
    destroy() {
        if (this.swipeWidget && this.view && this.view.ui) { // Added check for this.view.ui
            this.view.ui.remove(this.swipeWidget);
            this.swipeWidget.destroy();
            this.swipeWidget = null;
            console.log("SwipeWidgetManager: Swipe widget destroyed.");
            return true;
        }
        return false;
    }
}