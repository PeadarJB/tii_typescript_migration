export const CONFIG = {
     portalUrl: "https://pms-ie.maps.arcgis.com/home/index.html",
    webMapId: "78a86c5888c84e0793b3345a62d7282e", // Replace this!
    roadNetworkLayerTitle: "TII CAIP NM", // e.g., "Ireland Road Network" - Used to find it in the WebMap
    //apiKey: "YOUR_ARCGIS_API_KEY_IF_NEEDED", // Only if accessing secured services or premium content not covered by user login

    // Field names from your road network feature layer
    // (It's good to define these early, even if you refine them later)
    fields: {
        object_id: "OBJECTID",
        county: "COUNTY",
        criticality: "Criticality_Rating_Num1",
        subnet: "Subnet",
        lifeline: "Lifeline",
        route: "Route", // Field used for length calculations
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
        // Add other fields needed for filters or statistics
    },

    // Initial filter options can be placeholders or defined if static
    // You planned to populate many dynamically, which is good.
    filterOptions: {
        criticality: [
            { label: "Very High", value: "5" },
            { label: "High", value: "4" },
            { label: "Medium", value: "3" },
            { label: "Low", value: "2" },
            { label: "Very Low", value: "1" },
        ],
        county: [], // Will be populated dynamically from the layer
        subnet: [
            { label: "0 - Motorway/Dual Carriageway", value: "0" },
            { label: "1 - Engineered Pavements", value: "1" },
            { label: "2 - Legacy Pavements (High Traffic)", value: "2" },
            { label: "3 - Legacy Pavements (Moderate Traffic)", value: "3" },
            { label: "4 - Legacy Pavements (Low Traffic)", value: "4" },
        ], // Will be populated dynamically from the layer
        lifeline: [
            { label: "Lifeline Route", value: "1" },
            { label: "Non-lifeline Route", value: "0" },
        ], // Will be populated dynamically from the layer
        route: [], // Will be populated dynamically from the layer
        floodAffected: [
            { label: "Affected by Flooding", value: "1" },
            { label: "Not Affected", value: "0" },
        ], 
        future_historic_intersection_m: [
            { label: "Midrange (RCP 4.5%) intersect with historic flooding.", value: "1" },
            { label: "No intersection", value: "0" },
        ],
        future_historic_intersection_h: [
            { label: "High-range (RCP 8.5%) intersect with historic flooding.", value: "1" },
            { label: "No intersection", value: "0" },
        ],
        // other static options...
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
        }, 
    ]
};
