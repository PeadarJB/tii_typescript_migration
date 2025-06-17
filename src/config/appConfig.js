export const CONFIG = {
    
    // The webMapId is the primary source for the map and its layers. 
    // The FilterManager and other components will get the layer directly from the loaded WebMap.
    webMapId: "bb27815620254e69819e7ce6b56f14b8", 
    roadNetworkLayerTitle: "TII CAIP NM", // The title of the layer within the WebMap to use for filtering and analysis.

    // --- Centralized Filter Configuration ---
    // This is the SINGLE SOURCE OF TRUTH for the FilterManager. 
    // It defines each filter component that will appear in the UI.
    filterConfig: [
        {
            id: 'flood-scenario',
            label: 'Flood Scenario',
            type: 'scenario-select', // Special type for combining multiple fields with OR
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
        floodAffected: "future_flood_intersection_m",
        floodAffected_h: "future_flood_intersection_h",
        cfram_f_m_0010: "cfram_f_m_0010",
        cfram_c_m_0010: "cfram_c_m_0010",
        nifm_f_m_0020: "nifm_f_m_0020",
        ncfhm_c_m_0010: "ncfhm_c_m_0010",
        cfram_f_h_0100: "cfram_f_h_0100",
        cfram_c_h_0200: "cfram_c_h_0200",
        nifm_f_h_0100: "nifm_f_h_0100",
        ncfhm_c_c_0200: "ncfhm_c_c_0200",
        historic_intersection_m: "historic_intersection_m",
        historic_intersection_h: "historic_intersection_h",
    },
    chartingFeatures: [
        {
            label: "Any Future Flood Intersection (4.5%)",
            field: "future_flood_intersection_m",
            description: "Any segment affected by a mid-range future flood model."
        },
        {
            label: "Any Future Flood Intersection (8.5%)",
            field: "future_flood_intersection_h",
            description: "Any segment affected by a high-range future flood model."
        },
        {
            label: "Future and Historic Flood Intersection (4.5%)",
            field: "historic_intersection_m",
            description: "Segments affected by both future and historic flood models under RCP 4.5."
        },
        {
            label: "Future and Historic Flood Intersection (8.5%)",
            field: "historic_intersection_h",
            description: "Segments affected by both future and historic flood models under RCP 8.5."
        },
        {
            label: "CFRAM Fluvial Model (4.5%)",
            field: "cfram_f_m_0010",
            description: "Segments affected by the CFRAM Fluvial model under RCP 4.5."
        },
        {
            label: "CFRAM Coastal Model (4.5%)",
            field: "cfram_c_m_0010",
            description: "Segments affected by the CFRAM Coastal model under RCP 4.5."
        },
        {
            label: "NIFM Fluvial Model (4.5%)",
            field: "nifm_f_m_0020",
            description: "Segments affected by the NIFM Fluvial model under RCP 4.5."
        },
        {
            label: "NCFHM Coastal Model",
            field: "ncfhm_c_m_0010",
            description: "Segments affected by the NCFHM Coastal model under RCP 4.5."
        },
        {
            label: "CFRAM Fluvial Model (8.5%)",
            field: "cfram_f_h_0010",
            description: "Segments affected by the CFRAM Fluvial model under RCP 8.5."
        },
        {
            label: "CFRAM Coastal Model (8.5%)",
            field: "cfram_c_h_0010",
            description: "Segments affected by the CFRAM Coastal model under RCP 8.5."
        },
        {
            label: "NIFM Fluvial Model (8.5%)",
            field: "nifm_f_h_0020",
            description: "Segments affected by the NIFM Fluvial model under RCP 8.5."
        }
    ],

    swipeLayerConfig: {
        leftPanel: {
            label: 'Left/Top Layer(s) (RCP 4.5)',
            layers: [
                { title: "CFRAM f m 0010",   label: "CFRAM Fluvial (10yr, RCP 4.5)" },
                { title: "CFRAM c m 0010",   label: "CFRAM Coastal (10yr, RCP 4.5)" },
                { title: "NIFM f m 0020",    label: "NIFM Fluvial (20yr, RCP 4.5)" },
                { title: "NCFHM c m 0010",   label: "NCFHM Coastal (10yr, RCP 4.5)" }
            ]
        },
        rightPanel: {
            label: 'Right/Bottom Layer(s) (RCP 8.5)',
            layers: [
                { title: "CFRAM f h 0100",   label: "CFRAM Fluvial (100yr, RCP 8.5)" },
                { title: "CFRAM c h 0200",   label: "CFRAM Coastal (200yr, RCP 8.5)" },
                { title: "NIFM f h 0100",    label: "NIFM Fluvial (100yr, RCP 8.5)" },
                { title: "NCFHM c c 0200",   label: "NCFHM Coastal (200yr, RCP 8.5)" }
            ]
        }
    }
};