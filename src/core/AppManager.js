import { message, notification } from 'antd';
import { initializeMapView } from '../components/MapView';
import { FilterManager } from '../components/FilterManager';
import { StatisticsManager } from '../components/StatisticsManager';
import { SwipeWidgetManager } from '../components/SwipeWidgetManager';
import { ChartGenerator } from '../components/ChartGenerator';
import { ReportGenerator } from '../components/ReportGenerator';
import { CONFIG } from '../config/appConfig';

/**
 * AppManager - Central application state and component management
 * Refactored to work with Ant Design architecture
 */
export class AppManager {
    constructor() {
        this.components = {};
        this.isInitialized = false;
        this.currentMode = 'dashboard';
        this.listeners = {
            filterChange: [],
            modeChange: [],
            dataUpdate: [],
        };
    }

    /**
     * Initialize all application components
     */
    async initialize() {
        try {
            // Show loading message
            const hideLoading = message.loading('Initializing application components...', 0);

            // Initialize map first as it's the core component
            await this.initializeMap();
            
            // Initialize other components in parallel where possible
            await Promise.all([
                this.initializeFilterManager(),
                this.initializeStatisticsManager(),
                this.initializeChartGenerator(),
                this.initializeSwipeManager(),
            ]);

            // Initialize report generator (depends on other components)
            this.components.reportGenerator = new ReportGenerator(this);

            // Setup component interactions
            this.setupComponentInteractions();

            // Perform initial data load
            await this.performInitialDataLoad();

            this.isInitialized = true;
            hideLoading();
            
            message.success('Application initialized successfully');
            console.log('AppManager: Initialization complete');

        } catch (error) {
            console.error('AppManager: Initialization failed', error);
            notification.error({
                message: 'Initialization Failed',
                description: error.message || 'Failed to initialize application components',
                duration: 0,
            });
            throw error;
        }
    }

    /**
     * Initialize map component
     */
    async initializeMap() {
        try {
            const { view, webmap } = await initializeMapView('viewDiv');
            this.components.view = view;
            this.components.webmap = webmap;

            // Find and load the road network layer
            const roadNetworkLayer = webmap.layers.find(
                layer => layer.title === CONFIG.roadNetworkLayerTitle
            );

            if (!roadNetworkLayer) {
                throw new Error(`Road network layer "${CONFIG.roadNetworkLayerTitle}" not found`);
            }

            await roadNetworkLayer.load();
            this.components.roadNetworkLayer = roadNetworkLayer;
            
            console.log('AppManager: Map initialized successfully');
        } catch (error) {
            console.error('AppManager: Map initialization failed', error);
            throw new Error(`Map initialization failed: ${error.message}`);
        }
    }

    /**
     * Initialize filter manager
     */
    async initializeFilterManager() {
        try {
            this.components.filterManager = new FilterManager(
                null, // Container will be managed by React component
                this.components.view,
                this.components.roadNetworkLayer
            );
            
            console.log('AppManager: FilterManager created');
        } catch (error) {
            console.error('AppManager: FilterManager initialization failed', error);
            throw error;
        }
    }

    /**
     * Initialize statistics manager
     */
    async initializeStatisticsManager() {
        try {
            this.components.statsManager = new StatisticsManager(
                null, // Container will be managed by React component
                null,
                this.components.roadNetworkLayer
            );
            
            console.log('AppManager: StatisticsManager created');
        } catch (error) {
            console.error('AppManager: StatisticsManager initialization failed', error);
            throw error;
        }
    }

    /**
     * Initialize chart generator
     */
    async initializeChartGenerator() {
        try {
            this.components.chartGenerator = new ChartGenerator(
                null, // Container will be managed by React component
                this.components.view,
                this.components.webmap,
                this.components.roadNetworkLayer,
                this.components.filterManager
            );
            
            console.log('AppManager: ChartGenerator created');
        } catch (error) {
            console.error('AppManager: ChartGenerator initialization failed', error);
            throw error;
        }
    }

    /**
     * Initialize swipe manager
     */
    async initializeSwipeManager() {
        try {
            this.components.swipeManager = new SwipeWidgetManager(
                this.components.view,
                this.components.webmap
            );
            
            console.log('AppManager: SwipeManager created');
        } catch (error) {
            console.error('AppManager: SwipeManager initialization failed', error);
            throw error;
        }
    }

    /**
     * Setup interactions between components
     */
    setupComponentInteractions() {
        // Filter change listener
        if (this.components.filterManager) {
            this.components.filterManager.onFilterChange((newDefinitionExpression) => {
                console.log('AppManager: Filter changed', newDefinitionExpression);
                
                // Update statistics
                if (this.components.statsManager) {
                    this.components.statsManager.updateAllStatistics(newDefinitionExpression)
                        .catch(error => {
                            console.error('Failed to update statistics', error);
                            message.error('Failed to update statistics');
                        });
                }

                // Notify listeners
                this.emit('filterChange', newDefinitionExpression);
            });
        }
    }

    /**
     * Perform initial data load
     */
    async performInitialDataLoad() {
        try {
            const initialExpression = this.components.roadNetworkLayer?.definitionExpression || '1=1';
            
            if (this.components.statsManager) {
                await this.components.statsManager.updateAllStatistics(initialExpression);
            }
            
            console.log('AppManager: Initial data load completed');
        } catch (error) {
            console.error('AppManager: Initial data load failed', error);
            message.warning('Some data failed to load initially');
        }
    }

    /**
     * Switch application mode
     */
    setMode(newMode) {
        if (this.currentMode === newMode) return;
        
        const oldMode = this.currentMode;
        this.currentMode = newMode;
        
        // Handle mode-specific logic
        if (newMode === 'comparison' && this.components.swipeManager) {
            // Swipe mode is now handled by the React component
            console.log('AppManager: Switched to comparison mode');
        } else if (oldMode === 'comparison' && this.components.swipeManager) {
            // Cleanup swipe if leaving comparison mode
            this.components.swipeManager.destroy();
        }
        
        this.emit('modeChange', { oldMode, newMode });
    }

    /**
     * Event emitter functionality
     */
    on(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
    }

    off(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }

    /**
     * Get current filter state
     */
    getCurrentFilters() {
        return this.components.filterManager?.getCurrentFilterSummary() || {};
    }

    /**
     * Get current statistics
     */
    getCurrentStatistics() {
        return this.components.statsManager?.getCurrentScenariosData() || [];
    }

    /**
     * Generate report
     */
    async generateReport() {
        if (this.components.reportGenerator) {
            await this.components.reportGenerator.generateReport();
        } else {
            message.error('Report generator not available');
        }
    }

    /**
     * Cleanup and destroy
     */
    async destroy() {
        try {
            // Destroy components in reverse order
            const components = [
                'reportGenerator',
                'chartGenerator',
                'statsManager',
                'filterManager',
                'swipeManager',
                'view'
            ];

            for (const componentName of components) {
                const component = this.components[componentName];
                if (component && typeof component.destroy === 'function') {
                    await component.destroy();
                }
            }

            // Clear references
            this.components = {};
            this.isInitialized = false;
            this.listeners = {
                filterChange: [],
                modeChange: [],
                dataUpdate: [],
            };

            console.log('AppManager: Destroyed successfully');
        } catch (error) {
            console.error('AppManager: Error during cleanup', error);
        }
    }
}