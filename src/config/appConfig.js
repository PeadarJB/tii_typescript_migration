export const CONFIG = {
    portalUrl: "https://pms-ie.maps.arcgis.com/home/index.html",
    webMapId: "78a86c5888c84e0793b3345a62d7282e", // WebMap ID
    roadNetworkLayerTitle: "TII CAIP NM", // Layer name to find in the WebMap

    // --- NEW: Centralized Filter Configuration ---
    // This structure defines each filter card that will appear in the UI.
    // - `id`: A unique identifier for the filter.
    // - `label`: The user-friendly name displayed on the filter button.
    // - `type`: 'multi-select' for standard attribute filters, 'grouped-checkbox' for flood scenarios.
    // - `dataType`: 'string' or 'number' for correct SQL query formatting.
    // - `field` (for multi-select): The single database field to query.
    // - `options` (for multi-select): Pre-defined choices. If empty, they will be fetched dynamically.
    // - `items` (for grouped-checkbox): The individual checkbox options, each mapping a label to a specific field and value.
    filterConfig: [
        {
            id: 'flood-scenario',
            label: 'Flood Scenario',
            type: 'grouped-checkbox',
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
            type: 'multi-select',
            field: 'COUNTY',
            dataType: 'string',
            options: [] // To be populated dynamically
        },
        {
            id: 'criticality',
            label: 'Criticality',
            type: 'multi-select',
            field: 'Criticality_Rating_Num1',
            dataType: 'number',
            options: [
                { label: "Very High", value: "5" },
                { label: "High", value: "4" },
                { label: "Medium", value: "3" },
                { label: "Low", value: "2" },
                { label: "Very Low", value: "1" },
            ]
        },
        {
            id: 'subnet',
            label: 'Subnet',
            type: 'multi-select',
            field: 'Subnet',
            dataType: 'number',
            options: [
                { label: "0 - Motorway/Dual Carriageway", value: "0" },
                { label: "1 - Engineered Pavements", value: "1" },
                { label: "2 - Urban", value: "2" },
                { label: "3 - Legacy Pavements (High Traffic)", value: "3" },
                { label: "4 - Legacy Pavements (Low Traffic)", value: "4" },
            ]
        },
        {
            id: 'lifeline',
            label: 'Lifeline Route',
            type: 'multi-select',
            field: 'Lifeline',
            dataType: 'number',
            options: [
                { label: "Lifeline Route", value: "1" },
                { label: "Non-lifeline Route", value: "0" },
            ]
        }
    ],

    // Field names for other parts of the app (statistics, etc.)
    fields: {
        object_id: "OBJECTID",
        route: "Route",
        // Fields for statistics (can overlap with filter fields)
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
        historic_no_future_m: "historic_no_future_m",
        historic_no_future_h: "historic_no_future_h",
    },

    // Configuration for the Chart Generator component
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
            label: "Historic Flood (4.5%)",
            field: "historic_no_future_m",
            description: "Segments affected by historic flood models without future flood impact under RCP 4.5."
        },
        {
            label: "Historic Flood (8.5%)",
            field: "historic_no_future_h",
            description: "Segments affected by historic flood models without future flood impact under RCP 8.5."
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
        }, 
    ]
};
