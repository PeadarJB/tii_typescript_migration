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
        subnet: [], // Will be populated dynamically from the layer
        lifeline: [], // Will be populated dynamically from the layer
        route: [], // Will be populated dynamically from the layer
        floodAffected: [], 
        // other static options...
    }
};