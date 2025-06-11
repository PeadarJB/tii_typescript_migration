export const CONFIG = {
    // --- Core Application Settings ---
    // The webMapId is the primary source for the map and its layers. 
    // The FilterManager and other components will get the layer directly from the loaded WebMap.
    webMapId: "78a86c5888c84e0793b3345a62d7282e", 
    roadNetworkLayerTitle: "TII CAIP NM", // The title of the layer within the WebMap to use for filtering and analysis.

    // --- Centralized Filter Configuration ---
    // This is the SINGLE SOURCE OF TRUTH for the FilterManager. 
    // It defines each filter component that will appear in the UI.
    filterConfig: [
        {
            id: 'flood-scenario',
            label: 'Flood Scenario',
            type: 'grouped-checkbox', // Special type for combining multiple fields with OR
            description: 'Select one or more flood scenarios to analyze.',
            // Each item represents a checkbox that corresponds to a specific database field and value.
            items: [
                { label: 'Future Flooding (Mid-Range, RCP 4.5%)', field: 'future_flood_intersection_m', value: 1 },
                { label: 'Future Flooding (High-Range, RCP 8.5%)', field: 'future_flood_intersection_h', value: 1 },
                { label: 'Historic & Future (Mid-Range, RCP 4.5%)', field: 'historic_intersection_m', value: 1 },
                { label: 'Historic & Future (High-Range, RCP 8.5%)', field: 'historic_intersection_h', value: 1 },
                { label: 'Historic Only (Mid-Range, RCP 4.5%)', field: 'hist_no_future_m', value: 1 },
                { label: 'Historic Only (High-Range, RCP 8.5%)', field: 'hist_no_future_h', value: 1 }
            ]
        },
        {
            id: 'county',
            label: 'County',
            type: 'multi-select', // Standard multi-select dropdown
            field: 'COUNTY',       // The database field to query
            dataType: 'string',    // For correct SQL syntax ('value')
            description: 'Filter by administrative county boundaries.',
            options: [] // This will be populated dynamically by the FilterManager
        },
        {
            id: 'criticality',
            label: 'Criticality Rating',
            type: 'multi-select',
            field: 'Criticality_Rating_Num1',
            dataType: 'number', // For correct SQL syntax (value)
            description: 'Infrastructure criticality assessment based on usage and importance.',
            options: [
                { label: "Very High (5)", value: "5" },
                { label: "High (4)", value: "4" },
                { label: "Medium (3)", value: "3" },
                { label: "Low (2)", value: "2" },
                { label: "Very Low (1)", value: "1" }
            ]
        },
        {
            id: 'subnet',
            label: 'Road Subnet',
            type: 'multi-select',
            field: 'Subnet',
            dataType: 'number',
            description: 'Classification of road infrastructure by construction and traffic patterns.',
            options: [
                { label: "Motorway/Dual Carriageway (0)", value: "0" },
                { label: "Engineered Pavements (1)", value: "1" },
                { label: "Urban Roads (2)", value: "2" },
                { label: "Legacy Pavements - High Traffic (3)", value: "3" },
                { label: "Legacy Pavements - Low Traffic (4)", value: "4" }
            ]
        },
        {
            id: 'lifeline',
            label: 'Lifeline Route',
            type: 'multi-select',
            field: 'Lifeline',
            dataType: 'number',
            description: 'Critical routes essential for emergency services and vital community functions.',
            options: [
                { label: "Lifeline Route", value: "1" },
                { label: "Non-lifeline Route", value: "0" }
            ]
        }
    ],

    // --- Field Definitions for Other Components (e.g., StatisticsManager) ---
    // These are kept separate from filterConfig to avoid confusion. This section defines
    // fields needed for specific calculations or displays outside of the filter logic.
    fields: {
        object_id: "OBJECTID",
        route: "Route",
        // Fields for statistics
        cfram_f_m_0010: "cfram_f_m_0010",
        cfram_c_m_0010: "cfram_c_m_0010",
        nifm_f_m_0020: "nifm_f_m_0020",
        ncfhm_c_m_0010: "ncfhm_c_m_0010",
        cfram_f_h_0100: "cfram_f_h_0100",
        cfram_c_h_0200: "cfram_c_h_0200",
        nifm_f_h_0100: "nifm_f_h_0100",
        ncfhm_c_c_0200: "ncfhm_c_c_0200"
    }
};
