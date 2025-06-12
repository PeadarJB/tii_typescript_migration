// --- Importing Necessary Modules ---

import { initializeMapView } from './components/MapView.js';
import { FilterManager } from './components/FilterManager.js';
import { StatisticsManager } from './components/StatisticsManager.js';
import { SwipeWidgetManager } from './components/SwipeWidgetManager.js';
import { SwipeControlsUI } from './components/SwipeControlsUI.js';
import { ChartGenerator } from './components/ChartGenerator.js'; // Missing import
import { CONFIG } from './config/appConfig.js';
import { ReportGenerator } from './components/ReportGenerator.js';
import './styles/main.css';

// --- Application State Management ---
// --- Application State Management ---
class AppManager {
    constructor() {
        this.components = {};
        this.isInitialized = false;
        this.errorContainer = null;
    }

    /**
     * Main initialization method
     */
    async initialize() {
        try {
            // 1. Initialize the map first
            try {
                await this.initializeMap();
            } catch (mapError) {
                console.error("AppManager: Map initialization failed critically:", mapError);
                this.handleCriticalError(mapError);
                return;
            }

            // 2. Show a loading indicator for the rest of the app
            this.showLoadingState();

            // 3. Initialize all other components
            try {
                await this.initializeUIComponents();
                this.setupComponentInteractions();

                // Correctly create the ReportGenerator instance here
                this.components.reportGenerator = new ReportGenerator(this);

                await this.performInitialDataLoad();

                this.isInitialized = true;
                this.hideLoadingState();
                console.log("AppManager: Application initialization complete.");

            } catch (postMapInitError) {
                console.error("AppManager: Error initializing UI components or loading data:", postMapInitError);
                this.hideLoadingState();
                this.handleCriticalError(postMapInitError);
            }

        } catch (error) {
            console.error("AppManager: Unexpected error during overall initialization:", error);
            this.hideLoadingState();
            this.handleCriticalError(error);
        }
    }

    /**
     * Initialize map and core components
     */
    async initializeMap() {
        try {
            const { view, webmap } = await initializeMapView("viewDiv");
            this.components.view = view;
            this.components.webmap = webmap;
            console.log("AppManager: Map initialized successfully.");

            const roadNetworkLayer = this.findRoadNetworkLayer(webmap);
            if (!roadNetworkLayer) {
                throw new Error(`Road network layer "${CONFIG.roadNetworkLayerTitle}" not found in WebMap.`);
            }

            await roadNetworkLayer.load();
            this.components.roadNetworkLayer = roadNetworkLayer;
            // Start with the road network layer invisible.
            roadNetworkLayer.visible = false; 
            console.log(`AppManager: Road network layer "${roadNetworkLayer.title}" loaded successfully.`);

        } catch (error) {
            console.error("AppManager: Map initialization failed:", error);
            throw new Error(`Map initialization failed: ${error.message}`);
        }
    }

    /**
     * Initialize all UI components.
     * Note: ReportGenerator is handled separately in the main initialize method.
     */
    async initializeUIComponents() {
        const initTasks = [];
        try {
            initTasks.push(this.initializeSwipeComponents());
            initTasks.push(this.initializeFilterManager());
            initTasks.push(this.initializeStatisticsManager());
            initTasks.push(this.initializeChartGenerator());
            await Promise.all(initTasks);
            console.log("AppManager: All UI components initialized successfully.");
        } catch (error) {
            console.error("AppManager: UI component initialization failed:", error);
            throw new Error(`Component initialization failed: ${error.message}`);
        }
    }

    /**
     * Initialize swipe-related components
     */
    async initializeSwipeComponents() {
        try {
            this.components.swipeManager = new SwipeWidgetManager(
                this.components.view,
                this.components.webmap
            );
            this.components.swipeControlsUI = new SwipeControlsUI(
                'swipe-controls-container',
                this.components.swipeManager,
                this.components.webmap
            );
            await this.components.swipeControlsUI.initialize();
            console.log("AppManager: Swipe components initialized.");
        } catch (error) {
            console.error("AppManager: Swipe components initialization failed:", error);
            throw error;
        }
    }

    /**
     * Initialize Filter Manager
     */
    async initializeFilterManager() {
        try {
            this.components.filterManager = new FilterManager(
                'filter-controls-container',
                this.components.view,
                this.components.roadNetworkLayer
            );
            await this.components.filterManager.initializeFilters();
            console.log("AppManager: FilterManager initialized.");
        } catch (error) {
            console.error("AppManager: FilterManager initialization failed:", error);
            throw error;
        }
    }

    /**
     * Initialize Statistics Manager
     */
    async initializeStatisticsManager() {
        try {
            this.components.statsManager = new StatisticsManager(
                'indicator-boxes-container',
                'pie-chart-container',
                this.components.roadNetworkLayer
            );
            console.log("AppManager: StatisticsManager initialized.");
        } catch (error) {
            console.error("AppManager: StatisticsManager initialization failed:", error);
            throw error;
        }
    }

    /**
     * Initialize Chart Generator
     */
    async initializeChartGenerator() {
        try {
            this.components.chartGenerator = new ChartGenerator(
                'chart-generator-container',
                this.components.view,
                this.components.webmap,
                this.components.roadNetworkLayer,
                this.components.filterManager
            );
            await this.components.chartGenerator.initialize();
            console.log("AppManager: ChartGenerator initialized.");
        } catch (error) {
            console.error("AppManager: ChartGenerator initialization failed:", error);
            throw error;
        }
    }

    /**
     * Setup interactions between components
     */
    setupComponentInteractions() {
        try {
            // Setup listener for filter changes
            this.components.filterManager.onFilterChange(async (newDefinitionExpression) => {
                console.log("AppManager: Filter changed:", newDefinitionExpression);
                try {
                    await this.components.statsManager.updateAllStatistics(newDefinitionExpression);
                    console.log("AppManager: Components updated for filter change.");
                } catch (error) {
                    console.error("AppManager: Error updating components after filter change:", error);
                    this.showErrorMessage("Failed to update data after filter change.");
                }
            });

            // Setup listener for the report button
            const reportBtn = document.getElementById('generate-report-btn');
            if (reportBtn) {
                reportBtn.addEventListener('click', () => {
                    this.components.reportGenerator?.generateReport();
                });
            }

            console.log("AppManager: Component interactions configured.");
        } catch (error) {
            console.error("AppManager: Failed to setup component interactions:", error);
            throw error;
        }
    }

    /**
     * Perform initial data load
     */
    async performInitialDataLoad() {
        try {
            const initialDefinitionExpression =
                this.components.filterManager.layer.definitionExpression || "1=1";
            await this.components.statsManager.updateAllStatistics(initialDefinitionExpression);
            console.log("AppManager: Initial data load completed.");
        } catch (error) {
            console.error("AppManager: Initial data load failed:", error);
            throw error;
        }
    }

    /**
     * Find the road network layer in the webmap
     */
    findRoadNetworkLayer(webmap) {
        return webmap.layers.find(layer => layer.title === CONFIG.roadNetworkLayerTitle);
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'app-loading';
        loadingDiv.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255, 255, 255, 0.9); display: flex; justify-content: center; align-items: center; z-index: 9999; font-family: Arial, sans-serif;">
                <div style="text-align: center;">
                    <div style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
                    <p style="margin: 0; font-size: 16px; color: #333;">Loading application...</p>
                </div>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>`;
        document.body.appendChild(loadingDiv);
    }

    /**
     * Hide loading state
     */
    hideLoadingState() {
        const loadingDiv = document.getElementById('app-loading');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }

    /**
     * Handle critical application errors
     */
    handleCriticalError(error) {
        this.hideLoadingState();
        const errorDiv = document.createElement('div');
        errorDiv.id = 'app-error';
        errorDiv.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #f8f9fa; display: flex; justify-content: center; align-items: center; z-index: 10000; font-family: Arial, sans-serif;">
                <div style="max-width: 600px; padding: 40px; text-align: center; background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                    <h2 style="color: #e74c3c; margin-bottom: 20px;">Application Error</h2>
                    <p style="color: #666; margin-bottom: 20px; line-height: 1.5;">The application failed to start properly. Please try refreshing the page. If the problem persists, contact support.</p>
                    <details style="text-align: left; margin-top: 20px;">
                        <summary style="cursor: pointer; color: #007bff;">Show technical details</summary>
                        <pre style="background: #f8f9fa; padding: 15px; border-radius: 4px; margin-top: 10px; white-space: pre-wrap; word-wrap: break-word; font-size: 12px; overflow-x: auto;">${error.message || error}</pre>
                    </details>
                    <button onclick="window.location.reload()" style="background: #007bff; color: white; border: none; padding: 12px 24px; border-radius: 4px; cursor: pointer; font-size: 14px; margin-top: 20px;">Refresh Page</button>
                </div>
            </div>`;
        document.body.appendChild(errorDiv);
    }

    /**
     * Show temporary error message
     */
    showErrorMessage(message, duration = 5000) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `position: fixed; top: 20px; right: 20px; background: #e74c3c; color: white; padding: 15px 20px; border-radius: 4px; z-index: 9998; max-width: 300px; font-family: Arial, sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,0.2);`;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, duration);
    }

    /**
     * Cleanup method for proper resource management
     */
    async destroy() {
        try {
            const destroyTasks = [];
            if (this.components.chartGenerator?.destroy) destroyTasks.push(this.components.chartGenerator.destroy());
            if (this.components.statsManager?.destroy) destroyTasks.push(this.components.statsManager.destroy());
            if (this.components.filterManager?.destroy) destroyTasks.push(this.components.filterManager.destroy());
            if (this.components.swipeControlsUI?.destroy) destroyTasks.push(this.components.swipeControlsUI.destroy());
            if (this.components.swipeManager?.destroy) destroyTasks.push(this.components.swipeManager.destroy());
            await Promise.allSettled(destroyTasks);
            this.components = {};
            this.isInitialized = false;
            console.log("AppManager: Application destroyed successfully.");
        } catch (error) {
            console.error("AppManager: Error during cleanup:", error);
        }
    }
}


// --- Global Application Instance ---
let appManager = null;

// --- Main Application Startup Function ---
async function startApp() {
    try {
        // Clean up any previous instance
        if (appManager) {
            await appManager.destroy();
        }

        // Create and initialize new app instance
        appManager = new AppManager();
        await appManager.initialize();
        
        console.log("Application started successfully.");
        
    } catch (error) {
        console.error("Failed to start application:", error);
        
        // Ensure cleanup even on failure
        if (appManager) {
            try {
                await appManager.destroy();
            } catch (cleanupError) {
                console.error("Error during cleanup after failed startup:", cleanupError);
            }
        }
        
        throw error;
    }
}

// --- Handle Page Visibility Changes ---
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log("Page hidden - consider pausing heavy operations");
    } else {
        console.log("Page visible - resume operations");
    }
});

// --- Handle Page Unload ---
window.addEventListener('beforeunload', async () => {
    if (appManager) {
        try {
            await appManager.destroy();
        } catch (error) {
            console.error("Error during page unload cleanup:", error);
        }
    }
});

// --- Start the Application ONLY After DOM is Ready ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded. Starting application...");
    startApp().catch(error => {
        console.error("Application startup failed:", error);
    });
});

// --- Error Boundary for Uncaught Errors ---
window.addEventListener('error', (event) => {
    console.error("Uncaught error:", event.error);
    if (appManager && !appManager.isInitialized) {
        appManager.handleCriticalError(event.error);
    }
});

window.addEventListener('unhandledrejection', (event) => {
    console.error("Unhandled promise rejection:", event.reason);
    event.preventDefault(); // Prevent default browser error handling
});

// --- Export for potential external access ---
export { appManager, startApp };