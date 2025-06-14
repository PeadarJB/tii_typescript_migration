import { message, notification } from 'antd';
import { initializeMapView } from '../components/MapView';
import { CONFIG } from '../config/appConfig';

/**
 * AppManager - Central application state and component management
 * Refactored to work with Ant Design architecture
 * This version manages only the core map and data, while UI components manage their own state
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
        
        // Store current state
        this.currentFilters = {};
        this.currentStatistics = [];
        this.currentDefinitionExpression = '1=1';
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
     * Apply filters to the road network layer
     * This method is called by the FilterPanel component
     */
    async applyFilters(filters) {
        try {
            // Build SQL where clause from filters
            const whereClauses = [];
            
            // Process each filter type
            Object.entries(filters).forEach(([filterType, filterValues]) => {
                if (filterValues && filterValues.length > 0) {
                    if (filterType === 'flood-scenario') {
                        // Special handling for flood scenarios (OR logic)
                        const scenarioClauses = filterValues.map(v => `${v.field} = ${v.value}`);
                        if (scenarioClauses.length > 0) {
                            whereClauses.push(`(${scenarioClauses.join(' OR ')})`);
                        }
                    } else {
                        // Regular filters
                        const values = filterValues.map(v => {
                            if (v.dataType === 'string') {
                                return `'${v.value}'`;
                            }
                            return v.value;
                        });
                        whereClauses.push(`${filterValues[0].field} IN (${values.join(', ')})`);
                    }
                }
            });
            
            this.currentDefinitionExpression = whereClauses.length > 0 ? whereClauses.join(' AND ') : '1=1';
            this.components.roadNetworkLayer.definitionExpression = this.currentDefinitionExpression;
            
            // Store current filters
            this.currentFilters = filters;
            
            // Update statistics
            await this.updateStatistics();
            
            // Notify listeners
            this.emit('filterChange', this.currentDefinitionExpression);
            
            // Zoom to filtered extent if there are active filters
            if (whereClauses.length > 0) {
                const query = this.components.roadNetworkLayer.createQuery();
                query.where = this.currentDefinitionExpression;
                const extent = await this.components.roadNetworkLayer.queryExtent(query);
                if (extent && extent.extent) {
                    await this.components.view.goTo(extent.extent.expand(1.2));
                }
            }
            
            console.log('AppManager: Filters applied', this.currentDefinitionExpression);
            return true;
        } catch (error) {
            console.error('AppManager: Failed to apply filters', error);
            throw error;
        }
    }

    /**
     * Clear all filters
     */
    async clearFilters() {
        this.currentFilters = {};
        this.currentDefinitionExpression = '1=1';
        this.components.roadNetworkLayer.definitionExpression = '1=1';
        
        await this.updateStatistics();
        this.emit('filterChange', '1=1');
        
        // Reset view to initial extent
        const initialExtent = this.components.webmap.initialViewProperties?.viewpoint?.targetGeometry;
        if (initialExtent) {
            await this.components.view.goTo(initialExtent);
        }
    }

    /**
     * Update statistics based on current filters
     */
    async updateStatistics() {
        try {
            const Query = (await import('@arcgis/core/rest/support/Query.js')).default;
            
            // Helper function to query statistics for a scenario
            const queryScenarioStats = async (scenarioType) => {
                const fields = scenarioType === 'rcp45' ? {
                    any: CONFIG.fields.floodAffected,
                    cfram_f: CONFIG.fields.cfram_f_m_0010,
                    cfram_c: CONFIG.fields.cfram_c_m_0010,
                    nifm_f: CONFIG.fields.nifm_f_m_0020,
                    ncfhm_c: CONFIG.fields.ncfhm_c_m_0010
                } : {
                    any: CONFIG.fields.floodAffected_h,
                    cfram_f: CONFIG.fields.cfram_f_h_0100,
                    cfram_c: CONFIG.fields.cfram_c_h_0200,
                    nifm_f: CONFIG.fields.nifm_f_h_0100,
                    ncfhm_c: CONFIG.fields.ncfhm_c_c_0200
                };
                
                const stats = [];
                
                for (const [key, field] of Object.entries(fields)) {
                    const query = new Query({
                        where: `(${this.currentDefinitionExpression}) AND (${field} = 1)`,
                        outStatistics: [{
                            statisticType: 'count',
                            onStatisticField: CONFIG.fields.object_id,
                            outStatisticFieldName: 'count_result'
                        }]
                    });
                    
                    try {
                        const result = await this.components.roadNetworkLayer.queryFeatures(query);
                        const count = result.features[0]?.attributes.count_result || 0;
                        
                        let label = 'Unknown';
                        switch(key) {
                            case 'any': label = 'Any Future Flood Intersection'; break;
                            case 'cfram_f': label = 'CFRAM Fluvial Model'; break;
                            case 'cfram_c': label = 'CFRAM Coastal Model'; break;
                            case 'nifm_f': label = 'NIFM Fluvial Model'; break;
                            case 'ncfhm_c': label = 'NCFHM Coastal Model'; break;
                        }
                        
                        stats.push({
                            count: count,
                            derivedLengthKm: count * 0.1,
                            label: label
                        });
                    } catch (error) {
                        console.error(`Failed to query ${key}:`, error);
                    }
                }
                
                return stats;
            };
            
            // Query both scenarios
            const [rcp45Stats, rcp85Stats] = await Promise.all([
                queryScenarioStats('rcp45'),
                queryScenarioStats('rcp85')
            ]);
            
            this.currentStatistics = [
                {
                    title: "RCP 4.5 Flood Scenario (10 - 20 year return period)",
                    stats: rcp45Stats
                },
                {
                    title: "RCP 8.5 Flood Scenario (100 - 200 year return period)",
                    stats: rcp85Stats
                }
            ];
            
            this.emit('dataUpdate', this.currentStatistics);
            
        } catch (error) {
            console.error('AppManager: Failed to update statistics', error);
            this.currentStatistics = [];
        }
    }

    /**
     * Get unique values for a field (used by FilterPanel)
     */
    async getUniqueFieldValues(fieldName) {
        try {
            const Query = (await import('@arcgis/core/rest/support/Query.js')).default;
            
            const query = new Query({
                where: '1=1',
                outFields: [fieldName],
                returnDistinctValues: true,
                orderByFields: [fieldName]
            });
            
            const results = await this.components.roadNetworkLayer.queryFeatures(query);
            
            return results.features
                .map(f => f.attributes[fieldName])
                .filter(v => v !== null && v !== undefined && String(v).trim() !== '')
                .map(v => ({
                    label: String(v),
                    value: String(v)
                }));
                
        } catch (error) {
            console.error(`Failed to get unique values for ${fieldName}:`, error);
            return [];
        }
    }

    /**
     * Perform initial data load
     */
    async performInitialDataLoad() {
        try {
            await this.updateStatistics();
            console.log('AppManager: Initial data load completed');
        } catch (error) {
            console.error('AppManager: Initial data load failed', error);
            message.warning('Some data failed to load initially');
        }
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
        return this.currentFilters;
    }

    /**
     * Get current statistics
     */
    getCurrentStatistics() {
        return this.currentStatistics;
    }

    /**
     * Generate report
     */
    async generateReport() {
        // This will be implemented when we create the new ReportGenerator
        message.info('Report generation will be implemented in Phase 2');
    }

    /**
     * Initialize swipe comparison
     */
    async initializeSwipeComparison(leftLayers, rightLayers, position, direction) {
        // This will be implemented when we migrate the SwipeWidget
        console.log('SwipeComparison will be implemented in Phase 2');
        return true;
    }

    /**
     * Cleanup and destroy
     */
    async destroy() {
        try {
            // Clear listeners
            this.listeners = {
                filterChange: [],
                modeChange: [],
                dataUpdate: [],
            };

            // Destroy map view if it exists
            if (this.components.view) {
                this.components.view.destroy();
            }

            // Clear references
            this.components = {};
            this.isInitialized = false;

            console.log('AppManager: Destroyed successfully');
        } catch (error) {
            console.error('AppManager: Error during cleanup', error);
        }
    }
}