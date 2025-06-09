export const CONFIG = {
     portalUrl: "https://pms-ie.maps.arcgis.com/home/index.html",
    webMapId: "13a98c8641b84ac4aeb17255e6901e9b", // Replace this!
    roadNetworkLayerTitle: "TII CAIP NM Updated", // e.g., "Ireland Road Network" - Used to find it in the WebMap
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
        floodAffected: "future_flood_intersection",
        cfram_m_f_0010: "cfram_f_m_0010",
        cfram_c_m_0010: "cfram_c_m_0010",
        nifm_m_f_0020: "nifm_f_m_0020",
        ncfhm_c_m_0010: "ncfhm_c_m_0010",
        cfram_f_h_0010: "cfram_f_h_0010",
        cfram_c_h_0010: "cfram_c_h_0010",
        nifm_f_h_0020: "nifm_f_h_0020"
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
        // other static options...
    },

    chartingFeatures: [
        {
            label: "Any Future Flood Intersection",
            field: "future_flood_intersection",
            description: "Any segment affected by a future flood model."
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
