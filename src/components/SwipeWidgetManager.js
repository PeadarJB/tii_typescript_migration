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
        
        // --- 1. NEW: Add an array to track layers used by the swipe tool ---
        this.layersInUse = [];
    }

    // This is the main function that creates and sets up the swipe widget
    async initializeSwipe(leftLayerTitlesArray, rightLayerTitlesArray, initialPosition = 50, direction = "horizontal") {
        
        if (!this.view || !this.webmap) {
            console.error("SwipeWidgetManager: View or WebMap not provided.");
            return false; 
        }

        if (!leftLayerTitlesArray || leftLayerTitlesArray.length === 0 || !rightLayerTitlesArray || rightLayerTitlesArray.length === 0) {
            console.error("SwipeWidgetManager: Layer title arrays must be provided and be non-empty.");
            return false;
        }

        if (this.swipeWidget) {
            this.destroy(); 
        }

        try {
            const leadingLayerObjects = [];
            for (const title of leftLayerTitlesArray) {
                const layer = this.findLayer(title);
                if (layer) {
                    leadingLayerObjects.push(layer);
                } else {
                    console.warn(`SwipeWidgetManager: Left layer not found: "${title}"`);
                }
            }

            const trailingLayerObjects = [];
            for (const title of rightLayerTitlesArray) {
                const layer = this.findLayer(title);
                if (layer) {
                    trailingLayerObjects.push(layer);
                } else {
                    console.warn(`SwipeWidgetManager: Right layer not found: "${title}"`);
                }
            }

            if (leadingLayerObjects.length === 0 || trailingLayerObjects.length === 0) {
                this.logMissingLayers(leadingLayerObjects, trailingLayerObjects, leftLayerTitlesArray, rightLayerTitlesArray);
                return false;
            }
            
            // --- 2. NEW: Track all unique layers that this swipe instance will use ---
            const allLayersToLoad = [...new Set([...leadingLayerObjects, ...trailingLayerObjects])];
            this.layersInUse = allLayersToLoad;
            
            await this.loadLayers(allLayersToLoad);
            
            // Make all selected layers visible on the map
            this.layersInUse.forEach(layer => layer.visible = true);

            this.swipeWidget = new Swipe({
                view: this.view,
                leadingLayers: leadingLayerObjects,
                trailingLayers: trailingLayerObjects,
                direction: direction,
                position: initialPosition
            });

            this.view.ui.add(this.swipeWidget);
            console.log("SwipeWidgetManager: Swipe widget initialized successfully.", {
                leading: leadingLayerObjects.map(l => l.title),
                trailing: trailingLayerObjects.map(l => l.title)
            });
            return true;

        } catch (error) {
            console.error("SwipeWidgetManager: Error initializing swipe widget.", error);
            // Ensure we clean up if initialization fails midway
            this.destroy();
            return false;
        }
    }

    // ... (findLayer, loadLayers, and other helper methods remain the same) ...
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
    async loadLayers(layers) {
        const loadPromises = layers.map(async (layer) => {
            try {
                if (!layer.loaded) {
                    await layer.load();
                }
                return { layer, success: true }; 
            } catch (error) {
                console.error(`Failed to load layer: ${layer.title}`, error);
                return { layer, success: false, error }; 
            }
        });
        const results = await Promise.allSettled(loadPromises);
        const failedLayers = results.filter(result => result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.success));
        if (failedLayers.length > 0) {
            const failedLayerTitles = failedLayers.map(r => r.status === 'fulfilled' ? r.value.layer.title : 'Unknown layer (promise rejected)');
            console.error(`SwipeWidgetManager: Failed to load some layers: ${failedLayerTitles.join(', ')}`);
        }
    }
    logMissingLayers(foundLeading, foundTrailing, requestedLeadingTitles, requestedTrailingTitles) {
        console.warn("SwipeWidgetManager: Could not find one or more layers for swipe.");
        if (foundLeading.length === 0) {
            console.warn(`No leading layers found from requested: "${requestedLeadingTitles.join('", "')}"`);
        }
        if (foundTrailing.length === 0) {
            console.warn(`No trailing layers found from requested: "${requestedTrailingTitles.join('", "')}"`);
        }
        const availableLayerTitles = [];
        this.webmap.layers.forEach(layer => {
            availableLayerTitles.push(layer.title);
            if (layer.layers && layer.layers.length > 0) {
                layer.layers.forEach(subLayer => availableLayerTitles.push(`  (Group) ${subLayer.title}`));
            }
        });
        console.log("Available layers in webmap:", availableLayerTitles);
    }
    updatePosition(position) {
        if (this.swipeWidget && position >= 0 && position <= 100) {
            this.swipeWidget.position = position; 
            return true; 
        }
        return false; 
    }
    updateDirection(direction) {
        if (this.swipeWidget && (direction === "horizontal" || direction === "vertical")) {
            this.swipeWidget.direction = direction; 
            return true; 
        }
        return false; 
    }
    toggleLayerVisibility(layerTitle, visible) {
        const layer = this.findLayer(layerTitle); 
        if (layer) {
            layer.visible = visible; 
            return true; 
        }
        return false; 
    }
    getPosition() {
        return this.swipeWidget ? this.swipeWidget.position : null;
    }
    isActive() {
        return this.swipeWidget !== null;
    }


    // Clean up method
    destroy() {
        // --- 3. NEW: Add cleanup logic to hide layers before destroying the widget ---
        this.layersInUse.forEach(layer => {
            // A safety check to avoid hiding the main TII layer if it was part of the swipe
            if (layer.title !== "TII CAIP NM") {
                layer.visible = false;
            }
        });
        this.layersInUse = []; // Reset the tracking array

        if (this.swipeWidget) {
            if (this.view && this.view.ui) {
                this.view.ui.remove(this.swipeWidget);
            }
            this.swipeWidget.destroy();
            this.swipeWidget = null;
            console.log("SwipeWidgetManager: Swipe widget destroyed and layers reset.");
            return true;
        }
        return false;
    }
}