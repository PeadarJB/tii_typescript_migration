// src/config/appConfig.ts

import type { FilterConfigItem, ChartFeature, LayerConfig, AppPage, FieldMetadata } from '@/types';

/**
 * Application configuration with strict TypeScript typing
 * Central configuration for the TII Flood Risk Dashboard
 */

// New configuration for page-specific metadata
export const PAGE_CONFIG: Record<AppPage, { title: string }> = {
  future: { title: 'Future Flood Hazard' },
  past: { title: 'Past Flood Events' },
  precipitation: { title: 'Precipitation' },
  explore: { title: 'Explore Statistics' },
  overview: { title: 'Data Overview' },
};

// NEW: Configuration for the Precipitation page swipe tool
export const PRECIPITATION_SWIPE_CONFIG = {
    rainfallLayers: {
        rcp45: {
          change: 'Rx1day CMIP5 rcp45 2021 2050 ensmean chg ANNUAL Intersection',
          absolute: 'Rx1day CMIP5 rcp45 2021 2050 ensmean final ANNUAL Intersection'
        },
        rcp85: {
          change: 'Rx1day CMIP5 rcp85 2021 2050 ensmean chg ANNUAL Intersection',
          absolute: 'Rx1day CMIP5 rcp85 2021 2050 ensmean final ANNUAL Intersection'
        },
    },
    inundationLayers: {
        rcp45: {
            fluvial: 'CFRAM dep f m 10pc Projected',
            coastal: 'CFRAM dep c m 10pc Projected'
        },
        rcp85: {
            fluvial: 'CFRAM dep f h 1pc Projected',
            coastal: 'CFRAM dep c h 0 5pc Projected'
        }
    },
    // Mapping from inundation models to road network field names
    roadNetworkFields: {
        rcp45: {
            fluvial: 'cfram_f_m_0010',
            coastal: 'cfram_c_m_0010'
        },
        rcp85: {
            fluvial: 'cfram_f_h_0100',
            coastal: 'cfram_c_h_0200'
        }
    }
} as const;

interface AppConfiguration {
  readonly webMapId: string;
  readonly roadNetworkLayerTitle: string;
  readonly roadNetworkLayerSwipeTitle: string;
  readonly defaultLayerVisibility: Record<AppPage, string[]>;
  readonly filterConfig: ReadonlyArray<FilterConfigItem>;
  readonly fields: Readonly<{
    object_id: string;
    route: string;
    floodAffected: string;
    floodAffected_h: string;
    cfram_f_m_0010: string;
    cfram_c_m_0010: string;
    nifm_f_m_0020: string;
    ncfhm_c_m_0010: string;
    cfram_f_h_0100: string;
    cfram_c_h_0200: string;
    nifm_f_h_0100: string;
    ncfhm_c_c_0200: string;
    historic_intersection_m: string;
    historic_intersection_h: string;
    historic_flooding_any: string;
    // Past Event Fields
    dms_defects: string;
    opw_jba_points: string;
    gsi_surface_water: string;
    gsi_groundwater: string;
    jba_historic_floods: string;
    mocc_events: string;
    // Past Event Count Fields
    dms_defects_count: string;
    opw_points_count: string;
    nra_points_count: string;
    mocc_points_count: string;
    // Precipitation Fields
    rainfall_absolute_cat: string;
    rainfall_change_cat: string;
    rainfall_change_2050: string;
    rainfall_absolute_2050: string;
    inundation_depth_rcp45: string;
    inundation_depth_rcp85: string;
  }>;
  readonly chartingFeatures: ReadonlyArray<ChartFeature>;
  readonly swipeLayerConfig: Readonly<{
    leftPanel: {
      label: string;
      layers: ReadonlyArray<LayerConfig>;
    };
    rightPanel: {
      label: string;
      layers: ReadonlyArray<LayerConfig>;
    };
  }>;
  readonly defaultSettings: Readonly<{
    mapCenter: [number, number];
    mapZoom: number;
    maxChartCategories: number;
    segmentLengthKm: number;
    debounceDelay: number;
    throttleDelay: number;
  }>;
  readonly dataGlossary: Readonly<{
    coreAttributes: ReadonlyArray<FieldMetadata>;
    criticalityAttributes: ReadonlyArray<FieldMetadata>;
    pastEventIndicators: ReadonlyArray<FieldMetadata>;
    pastEventCounts: ReadonlyArray<FieldMetadata>;
    futureScenarioIndicators: ReadonlyArray<FieldMetadata>;
    inundationDepthFields: ReadonlyArray<FieldMetadata>;
    precipitationFields: ReadonlyArray<FieldMetadata>;
    crossAnalysisNote: Readonly<{
      description: string;
      examples: ReadonlyArray<string>;
    }>;
    systemFields: ReadonlyArray<string>;
  }>;
}

export const CONFIG: AppConfiguration = {
  // --- Core Application Settings ---
  webMapId: "bb27815620254e69819e7ce6b56f14b8",
  roadNetworkLayerTitle: "TII CAIP NM",
  roadNetworkLayerSwipeTitle: "TII CAIP NM SWIPE",

  // --- Page-Specific Default Layer Visibility ---
  defaultLayerVisibility: {
    future: ["TII Network Model", "Local_Authority_Boundaries"],
    past: [
        "MOCC flood events", 
        "DMS Drainage 2015-2023",
        "OPW past flood events", 
        "GSI 2015 2016 Surface Water Flood Map", 
        "GSI Historic Groundwater Flood Map", 
        "JBA Historic Flooding NRA flood points", 
        "TII Network Model",
        "Local_Authority_Boundaries"
    ],
    precipitation: [        
        "TII Network Model",
        "Local_Authority_Boundaries"
    ],
    explore: [], 
    overview: [],
  },

  // --- Centralized Filter Configuration ---
  filterConfig: [
    {
      id: 'flood-scenario',
      label: 'Flood Scenario',
      type: 'scenario-select',
      description: 'Select one or more flood scenarios to analyze.',
      items: [
        { 
          label: 'Future Flooding (Mid-Range, 10-20yr)', 
          field: 'future_flood_intersection_m', 
          value: 1 
        },
        { 
          label: 'Future Flooding (High-Range, 100-200yr)', 
          field: 'future_flood_intersection_h', 
          value: 1 
        },
        { 
          label: 'Historic & Future (Mid-Range, 10-20yr)', 
          field: 'historic_intersection_m', 
          value: 1 
        },
        { 
          label: 'Historic & Future (High-Range, 100-200yr)', 
          field: 'historic_intersection_h', 
          value: 1 
        },
        { 
          label: 'Historic Only (Mid-Range, 10-20yr)', 
          field: 'hist_no_future_m', 
          value: 1 
        },
        { 
          label: 'Historic Only (High-Range, 100-200yr)', 
          field: 'hist_no_future_h', 
          value: 1 
        },
        { 
          label: 'Historic Any', 
          field: 'historic_flooding_any', 
          value: 1 
        }        
      ]
    },
    {
      id: 'past-flood-event',
      label: 'Past Flood Event',
      type: 'scenario-select',
      description: 'Select one or more past flood event types to analyze.',
      items: [
        { 
          label: 'DMS Drainage Defects (2015-2023)', 
          field: 'DMS_Defects_2015_2023', 
          value: 1 
        },
        { 
          label: 'OPW Past Flood Events', 
          field: 'opw_jba_flood_points', 
          value: 1 
        },
        { 
          label: 'GSI Surface Water Flood Map (2015-2016)', 
          field: 'GSI_2015_2016_SurfWater', 
          value: 1 
        },
        { 
          label: 'GSI Historic Groundwater Flood Map', 
          field: 'GSI_Hist_Groundwater', 
          value: 1 
        },
        { 
          label: 'JBA Historic Flooding (NRA Points)', 
          field: 'JBA_Hist_Floods_NRA_Points', 
          value: 1 
        },
        { 
          label: 'MOCC Flood Events', 
          field: 'MOCC_100m', 
          value: 1 
        }
      ]
    },
    // New Filters for Precipitation Page
    {
      id: 'rainfall-absolute-cat',
      label: 'Rainfall Absolute Category',
      type: 'multi-select',
      field: 'Rainfall_Absolute_category',
      dataType: 'number',
      description: 'Filter road segments by their predicted absolute rainfall category (1-5).',
      options: [
        { label: "Very High (5)", value: "5" }, { label: "High (4)", value: "4" },
        { label: "Medium (3)", value: "3" }, { label: "Low (2)", value: "2" },
        { label: "Very Low (1)", value: "1" }
      ]
    },
    {
        id: 'rainfall-change-cat',
        label: 'Rainfall Change Category',
        type: 'multi-select',
        field: 'Rainfall_Change_category',
        dataType: 'number',
        description: 'Filter road segments by their predicted rainfall change category (1-5).',
        options: [
            { label: "Very High (5)", value: "5" }, { label: "High (4)", value: "4" },
            { label: "Medium (3)", value: "3" }, { label: "Low (2)", value: "2" },
            { label: "Very Low (1)", value: "1" }
        ]
    },
    {
        id: 'inundation-depth-45',
        label: 'Inundation Depth (RCP 4.5)',
        type: 'range-slider',
        field: 'avg_dep_45',
        dataType: 'number',
        description: 'Filter by average inundation depth (in meters) for the RCP 4.5 scenario.',
        min: 0,
        max: 5,
        step: 0.1,
    },
    {
        id: 'inundation-depth-85',
        label: 'Inundation Depth (RCP 8.5)',
        type: 'range-slider',
        field: 'avg_dep_85',
        dataType: 'number',
        description: 'Filter by average inundation depth (in meters) for the RCP 8.5 scenario.',
        min: 0,
        max: 5,
        step: 0.1,
    },
    {
      id: 'county',
      label: 'County',
      type: 'multi-select',
      field: 'COUNTY',
      dataType: 'string',
      description: 'Filter by administrative county boundaries.',
      options: [] // Populated dynamically
    },
    {
      id: 'criticality',
      label: 'Criticality Rating',
      type: 'multi-select',
      field: 'Criticality_Rating_Num1',
      dataType: 'number',
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

  // --- Field Definitions ---
  fields: {
    object_id: "OBJECTID",
    route: "Route",
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
    historic_flooding_any: "historic_flooding_any",
    // Past Event Fields
    dms_defects: 'DMS_Defects_2015_2023',
    opw_jba_points: 'opw_jba_flood_points',
    gsi_surface_water: 'GSI_2015_2016_SurfWater',
    gsi_groundwater: 'GSI_Hist_Groundwater',
    jba_historic_floods: 'JBA_Hist_Floods_NRA_Points',
    mocc_events: 'MOCC_100m',
    // Past Event Count Fields
    dms_defects_count: 'Drainage_Defects_count',
    opw_points_count: 'OPW_flood_points_count',
    nra_points_count: 'NRA_flood_points_count',
    mocc_points_count: 'mocc_point_count',
    // Precipitation Fields
    rainfall_absolute_cat: 'Rainfall_Absolute_category',
    rainfall_change_cat: 'Rainfall_Change_category',
    rainfall_change_2050: 'Rainfall_Change_2050',
    rainfall_absolute_2050: 'Rainfall_Absolute_2050',
    inundation_depth_rcp45: 'avg_dep_45',
    inundation_depth_rcp85: 'avg_dep_85',
  },

  // --- Charting Features ---
  chartingFeatures: [
    {
      label: "Any Future Flood Intersection (Mid-Range, 10-20yr)",
      field: "future_flood_intersection_m",
      description: "Any segment affected by a mid-range future flood model.",
      scenario: 'rcp45'
    },
    {
      label: "Any Future Flood Intersection (High-Range, 100-200yr)",
      field: "future_flood_intersection_h",
      description: "Any segment affected by a high-range future flood model.",
      scenario: 'rcp85'
    },
    {
      label: "Future and Historic Flood Intersection (Mid-Range, 10-20yr)",
      field: "historic_intersection_m",
      description: "Segments affected by both future and historic flood models under RCP 4.5.",
      scenario: 'rcp45'
    },
    {
      label: "Future and Historic Flood Intersection (High-Range, 100-200yr)",
      field: "historic_intersection_h",
      description: "Segments affected by both future and historic flood models under RCP 8.5.",
      scenario: 'rcp85'
    },
    {
      label: "CFRAM Fluvial Model (Mid-Range, 10yr)",
      field: "cfram_f_m_0010",
      description: "Segments affected by the CFRAM Fluvial model under RCP 4.5.",
      scenario: 'rcp45'
    },
    {
      label: "CFRAM Coastal Model (Mid-Range, 10yr)",
      field: "cfram_c_m_0010",
      description: "Segments affected by the CFRAM Coastal model under RCP 4.5.",
      scenario: 'rcp45'
    },
    {
      label: "NIFM Fluvial Model (Mid-Range, 20yr)",
      field: "nifm_f_m_0020",
      description: "Segments affected by the NIFM Fluvial model under RCP 4.5.",
      scenario: 'rcp45'
    },
    {
      label: "NCFHM Coastal Model (Mid-Range, 10yr)",
      field: "ncfhm_c_m_0010",
      description: "Segments affected by the NCFHM Coastal model under RCP 4.5.",
      scenario: 'rcp45'
    },
    {
      label: "CFRAM Fluvial Model (High-Range, 10yr)",
      field: "cfram_f_h_0010",
      description: "Segments affected by the CFRAM Fluvial model under RCP 8.5.",
      scenario: 'rcp85'
    },
    {
      label: "CFRAM Coastal Model (High-Range, 10yr)",
      field: "cfram_c_h_0010",
      description: "Segments affected by the CFRAM Coastal model under RCP 8.5.",
      scenario: 'rcp85'
    },
    {
      label: "NIFM Fluvial Model (High-Range, 20yr)",
      field: "nifm_f_h_0020",
      description: "Segments affected by the NIFM Fluvial model under RCP 8.5.",
      scenario: 'rcp85'
    }
  ],

  // --- Swipe Layer Configuration ---
  swipeLayerConfig: {
    leftPanel: {
      label: 'Left/Top Layer(s) (Mid-Range, 10-20yr)',
      layers: [
        { title: "CFRAM f m 0010", label: "CFRAM Fluvial (10yr, RCP 4.5)", roadNetworkFieldName: "cfram_f_m_0010" },
        { title: "CFRAM c m 0010", label: "CFRAM Coastal (10yr, RCP 4.5)", roadNetworkFieldName: "cfram_c_m_0010" },
        { title: "NIFM f m 0020", label: "NIFM Fluvial (20yr, RCP 4.5)", roadNetworkFieldName: "nifm_f_m_0020" },
        { title: "NCFHM c m 0010", label: "NCFHM Coastal (10yr, RCP 4.5)", roadNetworkFieldName: "ncfhm_c_m_0010" }
      ]
    },
    rightPanel: {
      label: 'Right/Bottom Layer(s) (High-Range, 100-200yr)',
      layers: [
        { title: "CFRAM f h 0100", label: "CFRAM Fluvial (100yr, RCP 8.5)", roadNetworkFieldName: "cfram_f_h_0100" },
        { title: "CFRAM c h 0200", label: "CFRAM Coastal (200yr, RCP 8.5)", roadNetworkFieldName: "cfram_c_h_0200" },
        { title: "NIFM f h 0100", label: "NIFM Fluvial (100yr, RCP 8.5)", roadNetworkFieldName: "nifm_f_h_0100" },
        { title: "NCFHM c c 0200", label: "NCFHM Coastal (200yr, RCP 8.5)", roadNetworkFieldName: "ncfhm_c_c_0200" }
      ]
    }
  },

  // --- Default Settings ---
  defaultSettings: {
    mapCenter: [-8.2439, 53.4129], // Ireland center
    mapZoom: 15,
    maxChartCategories: 10,
    segmentLengthKm: 0.1,
    debounceDelay: 300,
    throttleDelay: 100,
  },

  // --- Data Glossary ---
  dataGlossary: {
    coreAttributes: [
      { fieldName: 'OBJECTID', friendlyName: 'Object ID', description: 'Unique identifier for each road segment, automatically generated by ArcGIS.', dataType: 'OID' },
      { fieldName: 'Route', friendlyName: 'Route Name', description: "The official name or number of the road (e.g., 'N25', 'M50').", dataType: 'String' },
      { fieldName: 'COUNTY', friendlyName: 'County', description: 'The administrative county the road segment is located in.', dataType: 'String' },
      { fieldName: 'Subnet', friendlyName: 'Road Subnet', description: 'A classification of the road based on its construction and traffic patterns.', dataType: 'Integer (0-4)' },
      { fieldName: 'Shape__Length', friendlyName: 'Segment Length', description: 'The length of the road segment in meters.', dataType: 'Double' },
    ],
    criticalityAttributes: [
      { fieldName: 'Criticality_Rating_Num1', friendlyName: 'Criticality Rating', description: "A numerical rating (1-5) of the road's importance, where 5 is 'Very High'.", dataType: 'Integer (1-5)' },
      { fieldName: 'Lifeline', friendlyName: 'Lifeline Route', description: "A binary flag indicating if the segment is part of a critical 'Lifeline' route for emergency services.", dataType: 'Double (1=Yes, 0=No)' },
    ],
    pastEventIndicators: [
        { fieldName: 'GSI_Hist_Groundwater', friendlyName: 'GSI Groundwater Flood', description: 'Intersects with the GSI Historic Groundwater Flood Map.' },
        { fieldName: 'GSI_2015_2016_SurfWater', friendlyName: 'GSI Surface Water Flood', description: 'Intersects with the GSI Surface Water Flood Map (2015-2016).' },
        { fieldName: 'JBA_Hist_Floods_NRA_Points', friendlyName: 'JBA/NRA Historic Points', description: 'Intersects with JBA historic flood points provided by the NRA.' },
        { fieldName: 'DMS_Defects_2015_2023', friendlyName: 'DMS Drainage Defects', description: 'Intersects with a drainage defect location from the Drainage Management System (2015-2023).' },
        { fieldName: 'opw_jba_flood_points', friendlyName: 'OPW/JBA Flood Points', description: 'Intersects with past flood event points from the OPW/JBA dataset.' },
        { fieldName: 'MOCC_100m', friendlyName: 'MOCC Flood Events', description: 'Intersects with a flood event recorded by the Motorway Operations Control Centre.' },
        { fieldName: 'historic_flooding_any', friendlyName: 'Any Historic Flooding', description: 'A summary flag indicating if the segment intersects with any of the past event datasets.' },
    ],
    pastEventCounts: [
        { fieldName: 'Drainage_Defects_count', friendlyName: 'Drainage Defects Count', description: 'The total number of drainage defects recorded for the segment.' },
        { fieldName: 'OPW_flood_points_count', friendlyName: 'OPW Flood Points Count', description: 'The total number of OPW flood points recorded for the segment.' },
        { fieldName: 'NRA_flood_points_count', friendlyName: 'NRA Flood Points Count', description: 'The total number of NRA historic flood points recorded for the segment.' },
        { fieldName: 'mocc_point_count', friendlyName: 'MOCC Events Count', description: 'The total number of MOCC flood events recorded for the segment.' },
    ],
    futureScenarioIndicators: [
        { fieldName: 'future_flood_intersection_m', friendlyName: 'Any Future Flood (Mid-Range, 10-20yr)', description: 'Intersects with any flood model under the RCP 4.5 scenario.' },
        { fieldName: 'future_flood_intersection_h', friendlyName: 'Any Future Flood (High-Range, 100-200yr)', description: 'Intersects with any flood model under the RCP 8.5 scenario.' },
        { fieldName: 'historic_intersection_m', friendlyName: 'Historic & Future (Mid-Range, 10-20yr)', description: 'Intersects with both a past event and a future (RCP 4.5) flood model.' },
        { fieldName: 'historic_intersection_h', friendlyName: 'Historic & Future (High-Range, 100-200yr)', description: 'Intersects with both a past event and a future (RCP 8.5) flood model.' },
        { fieldName: 'cfram_f_m_0010', friendlyName: 'CFRAM Fluvial (Mid, 10-yr)', description: 'Affected by the CFRAM Fluvial model, mid-range scenario (RCP 4.5), 10-year return period.' },
        { fieldName: 'cfram_c_m_0010', friendlyName: 'CFRAM Coastal (Mid, 10-yr)', description: 'Affected by the CFRAM Coastal model, mid-range scenario (RCP 4.5), 10-year return period.' },
        { fieldName: 'nifm_f_m_0020', friendlyName: 'NIFM Fluvial (Mid, 20-yr)', description: 'Affected by the NIFM Fluvial model, mid-range scenario (RCP 4.5), 20-year return period.' },
        { fieldName: 'ncfhm_c_m_0010', friendlyName: 'NCFHM Coastal (Mid, 10-yr)', description: 'Affected by the NCFHM Coastal model, mid-range scenario (RCP 4.5), 10-year return period.' },
        { fieldName: 'cfram_f_h_0100', friendlyName: 'CFRAM Fluvial (High, 100-yr)', description: 'Affected by the CFRAM Fluvial model, high-range scenario (RCP 8.5), 100-year return period.' },
        { fieldName: 'cfram_c_h_0200', friendlyName: 'CFRAM Coastal (High, 200-yr)', description: 'Affected by the CFRAM Coastal model, high-range scenario (RCP 8.5), 200-year return period.' },
        { fieldName: 'nifm_f_h_0100', friendlyName: 'NIFM Fluvial (High, 100-yr)', description: 'Affected by the NIFM Fluvial model, high-range scenario (RCP 8.5), 100-year return period.' },
        { fieldName: 'ncfhm_c_c_0200', friendlyName: 'NCFHM Coastal (High, 200-yr)', description: 'Affected by the NCFHM Coastal model, high-range scenario (RCP 8.5), 200-year return period.' },
    ],
    inundationDepthFields: [
        { fieldName: 'f_m_10pc', friendlyName: 'Fluvial Depth (Mid-range, 10-yr)', description: 'Average inundation depth from the CFRAM Fluvial model (RCP 4.5, 10-yr).' },
        { fieldName: 'f_h_1pc', friendlyName: 'Fluvial Depth (High-range, 100-yr)', description: 'Average inundation depth from the CFRAM Fluvial model (RCP 8.5, 100-yr).' },
        { fieldName: 'c_m_10pc', friendlyName: 'Coastal Depth (Mid-range, 10-yr)', description: 'Average inundation depth from the CFRAM Coastal model (RCP 4.5, 10-yr).' },
        { fieldName: 'c_h_0_5pc', friendlyName: 'Coastal Depth (High-range, 200-yr)', description: 'Average inundation depth from the CFRAM Coastal model (RCP 8.5, 200-yr).' },
        { fieldName: 'avg_dep_45', friendlyName: 'Avg. Depth (RCP 4.5)', description: 'The average of all applicable inundation depths for the RCP 4.5 scenario.' },
        { fieldName: 'avg_dep_85', friendlyName: 'Avg. Depth (RCP 8.5)', description: 'The average of all applicable inundation depths for the RCP 8.5 scenario.' },
    ],
    precipitationFields: [
        { fieldName: 'Rainfall_Absolute_category', friendlyName: 'Rainfall Absolute Category', description: 'A numerical category (1-5) representing the predicted absolute rainfall by 2050.' },
        { fieldName: 'Rainfall_Change_category', friendlyName: 'Rainfall Change Category', description: 'A numerical category (1-5) representing the predicted percentage change in rainfall by 2050.' },
        { fieldName: 'Rainfall_Change_2050', friendlyName: 'Rainfall Change 2050', description: 'The predicted percentage change in rainfall by 2050 (in mm).' },
        { fieldName: 'Rainfall_Absolute_2050', friendlyName: 'Rainfall Absolute 2050', description: 'The predicted absolute rainfall values by 2050 (in mm).' },
    ],
    crossAnalysisNote: {
        description: 'These fields represent the count of specific past events that occurred on road segments predicted to be flooded by a specific future scenario. The pattern continues for all combinations of future models and past event types.',
        examples: [
            'cfram_f_m_0010_opw_point',
            'cfram_f_m_0010_drainage',
            'nifm_f_h_0100_mocc',
        ]
    },
    systemFields: [
        'Join_Count', 'TARGET_FID', 'ID', 'acummulative_score', 'GlobalID', 'Shape'
    ],
  }
};

// NEW: Charting features for the Past Events page
export const PAST_EVENT_CHARTING_FEATURES: ReadonlyArray<ChartFeature> = [
    {
        label: "DMS Drainage Defects (2015-2023)",
        field: CONFIG.fields.dms_defects,
        description: "Segments affected by drainage defects identified between 2015 and 2023.",
        scenario: 'past'
    },
    {
        label: "OPW Past Flood Events",
        field: CONFIG.fields.opw_jba_points,
        description: "Segments affected by OPW past flood event data.",
        scenario: 'past'
    },
    {
        label: "GSI Surface Water Flood Map",
        field: CONFIG.fields.gsi_surface_water,
        description: "Segments affected by the GSI Surface Water Flood Map (2015-2016).",
        scenario: 'past'
    },
    {
        label: "GSI Historic Groundwater Flood Map",
        field: CONFIG.fields.gsi_groundwater,
        description: "Segments affected by the GSI Historic Groundwater Flood Map.",
        scenario: 'past'
    },
    {
        label: "JBA Historic Flooding (NRA Points)",
        field: CONFIG.fields.jba_historic_floods,
        description: "Segments affected by JBA historic flood data.",
        scenario: 'past'
    },
    {
        label: "MOCC Flood Events",
        field: CONFIG.fields.mocc_events,
        description: "Segments affected by MOCC flood events.",
        scenario: 'past'
    }
];

// Type-safe config getter functions
export const getFilterConfig = (id: string): FilterConfigItem | undefined => {
  return CONFIG.filterConfig.find(config => config.id === id);
};

export const getChartFeature = (field: string): ChartFeature | undefined => {
  return CONFIG.chartingFeatures.find(feature => feature.field === field);
};

export const getFieldName = (key: keyof typeof CONFIG.fields): string => {
  return CONFIG.fields[key];
};

// Validation functions
export const isValidFilterId = (id: string): boolean => {
  return CONFIG.filterConfig.some(config => config.id === id);
};

export const isValidFieldName = (field: string): boolean => {
  return Object.values(CONFIG.fields).includes(field);
};