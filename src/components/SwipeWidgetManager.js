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
    // - leftLayerTitle: name of the layer to show on the left side
    // - rightLayerTitle: name of the layer to show on the right side  
    // - initialPosition: where to place the swipe line (0-100, default 50 = middle)
    // - direction: "horizontal" or "vertical" swipe direction
    async initializeSwipe(leftLayerTitle, rightLayerTitle, initialPosition = 50, direction = "horizontal") {
        
        // STEP 1: Check if we have the required components
        // Without a view and webmap, we can't create a swipe widget
        if (!this.view || !this.webmap) {
            console.error("SwipeWidgetManager: View or WebMap not provided.");
            return false; // Return false to indicate failure
        }

        // STEP 2: Make sure layer names were provided
        // We need both layer names to create a comparison
        if (!leftLayerTitle || !rightLayerTitle) {
            console.error("SwipeWidgetManager: Layer titles must be provided.");
            return false;
        }

        // STEP 3: Clean up any existing swipe widget first
        // This prevents having multiple widgets at once
        if (this.swipeWidget) {
            this.destroy(); // Remove the old widget before creating new one
        }

        try {
            // STEP 4: Find the actual layer objects by their names
            // We search through all layers in the webmap to find matches
            const leftLayer = this.findLayer(leftLayerTitle);
            const rightLayer = this.findLayer(rightLayerTitle);

            // STEP 5: Make sure we found both layers
            // If either layer is missing, we can't create the swipe
            if (!leftLayer || !rightLayer) {
                this.logMissingLayers(leftLayer, rightLayer, leftLayerTitle, rightLayerTitle);
                return false;
            }

            // STEP 6: Load the layers from the server
            // Layers need to be fully loaded before we can use them in widgets
            await this.loadLayers([leftLayer, rightLayer]);
            
            // STEP 7: Make sure both layers are visible on the map
            // Hidden layers won't show up in the swipe widget
            leftLayer.visible = true;
            rightLayer.visible = true;

            // STEP 8: Create the actual swipe widget
            // This is where the magic happens - ArcGIS creates the swipe functionality
            this.swipeWidget = new Swipe({
                view: this.view,                    // Which map view to add it to
                leadingLayers: [leftLayer],         // Layer(s) on the left/top side
                trailingLayers: [rightLayer],       // Layer(s) on the right/bottom side
                direction: direction,               // Which way the swipe goes
                position: initialPosition           // Where to start the swipe line
            });

            // STEP 9: Add the widget to the map's user interface
            // This makes it visible and interactive for users
            this.view.ui.add(this.swipeWidget);
            console.log("SwipeWidgetManager: Swipe widget initialized successfully.");
            return true; // Return true to indicate success

        } catch (error) {
            // If anything goes wrong, log the error and return false
            console.error("SwipeWidgetManager: Error initializing swipe widget.", error);
            return false;
        }
    }

    // Helper function to find a layer by its name/title
    // This searches through all layers in the webmap, including nested ones
    findLayer(layerTitle) {
        
        // STEP 1: First, try to find the layer directly in the main layer list
        // This works for most simple cases where layers aren't grouped
        let layer = this.webmap.layers.find(layer => layer.title === layerTitle);
        
        // STEP 2: If we didn't find it, look inside layer groups
        // Sometimes layers are organized in folders/groups, so we need to dig deeper
        if (!layer) {
            // Loop through each main layer to see if it contains sublayers
            for (const parentLayer of this.webmap.layers) {
                if (parentLayer.layers) { // Check if this layer has sublayers (it's a group)
                    // Search inside the group for our target layer
                    layer = parentLayer.layers.find(sublayer => sublayer.title === layerTitle);
                    if (layer) break; // Stop searching once we find it
                }
            }
        }
        
        return layer; // Return the found layer, or null if not found
    }

    // Helper function to load layers from the server
    // Layers must be loaded before they can be used in widgets
    async loadLayers(layers) {
        
        // Create a loading promise for each layer
        // We try to load each layer individually so we can handle failures better
        const loadPromises = layers.map(async (layer) => {
            try {
                await layer.load(); // Tell ArcGIS to load this layer's data
                return { layer, success: true }; // Return success info
            } catch (error) {
                // If loading fails, log the error but don't crash everything
                console.error(`Failed to load layer: ${layer.title}`, error);
                return { layer, success: false, error }; // Return failure info
            }
        });

        // Wait for all layers to finish loading (success or failure)
        const results = await Promise.all(loadPromises);
        
        // Check if any layers failed to load
        const failedLayers = results.filter(result => !result.success);
        
        // If any layers failed, throw an error with details
        if (failedLayers.length > 0) {
            throw new Error(`Failed to load ${failedLayers.length} layer(s): ${failedLayers.map(r => r.layer.title).join(', ')}`);
        }
    }

    // Helper function to provide detailed error messages when layers aren't found
    // This helps with debugging by showing what layers are available
    logMissingLayers(leftLayer, rightLayer, leftLayerTitle, rightLayerTitle) {
        console.warn("SwipeWidgetManager: Could not find one or both layers for swipe.");
        
        // Tell the user exactly which layers are missing
        if (!leftLayer) console.warn(`Left layer not found: "${leftLayerTitle}"`);
        if (!rightLayer) console.warn(`Right layer not found: "${rightLayerTitle}"`);
        
        // Show all available layers so the user can see what names to use
        console.log("Available layers:", this.webmap.layers.map(layer => layer.title));
    }

    // Function to change where the swipe line is positioned after the widget is created
    // Position should be a number between 0-100 (0=far left/top, 100=far right/bottom)
    updatePosition(position) {
        // Check if we have a widget and the position value makes sense
        if (this.swipeWidget && position >= 0 && position <= 100) {
            this.swipeWidget.position = position; // Move the swipe line
            return true; // Success
        }
        return false; // Failed (no widget or bad position value)
    }

    // Function to change the swipe direction after the widget is created
    // Direction can be "horizontal" (left/right) or "vertical" (up/down)
    updateDirection(direction) {
        // Check if we have a widget and the direction is valid
        if (this.swipeWidget && (direction === "horizontal" || direction === "vertical")) {
            this.swipeWidget.direction = direction; // Change the swipe direction
            return true; // Success
        }
        return false; // Failed (no widget or invalid direction)
    }

    // Function to show or hide a specific layer
    // This is useful for turning layers on/off while the swipe is active
    toggleLayerVisibility(layerTitle, visible) {
        const layer = this.findLayer(layerTitle); // Find the layer by name
        if (layer) {
            layer.visible = visible; // Set visibility (true=show, false=hide)
            return true; // Success
        }
        return false; // Failed (layer not found)
    }

    // Function to get the current position of the swipe line
    // Returns a number between 0-100, or null if no widget exists
    getPosition() {
        return this.swipeWidget ? this.swipeWidget.position : null;
    }

    // Function to check if the swipe widget is currently active/created
    // Returns true if widget exists, false if not
    isActive() {
        return this.swipeWidget !== null;
    }

    // Clean up method
    destroy() {
        if (this.swipeWidget && this.view) {
            this.view.ui.remove(this.swipeWidget);
            this.swipeWidget.destroy();
            this.swipeWidget = null;
            console.log("SwipeWidgetManager: Swipe widget destroyed.");
            return true;
        }
        return false;
    }
}