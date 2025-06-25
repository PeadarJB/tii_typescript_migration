import type { FilterConfigItem, ChartFeature, LayerConfig, AppPage } from '@/types';

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
};

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
}

export const CONFIG: AppConfiguration = {
  // --- Core Application Settings ---
  webMapId: "bb27815620254e69819e7ce6b56f14b8",
  roadNetworkLayerTitle: "TII CAIP NM",
  roadNetworkLayerSwipeTitle: "TII CAIP NM SWIPE",

  // --- Page-Specific Default Layer Visibility ---
  // Defines which layers are visible by default when a page is selected.
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
    precipitation: [], 
    explore: [], 
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
          label: 'Future Flooding (Mid-Range, RCP 4.5%)', 
          field: 'future_flood_intersection_m', 
          value: 1 
        },
        { 
          label: 'Future Flooding (High-Range, RCP 8.5%)', 
          field: 'future_flood_intersection_h', 
          value: 1 
        },
        { 
          label: 'Historic & Future (Mid-Range, RCP 4.5%)', 
          field: 'historic_intersection_m', 
          value: 1 
        },
        { 
          label: 'Historic & Future (High-Range, RCP 8.5%)', 
          field: 'historic_intersection_h', 
          value: 1 
        },
        { 
          label: 'Historic Only (Mid-Range, RCP 4.5%)', 
          field: 'hist_no_future_m', 
          value: 1 
        },
        { 
          label: 'Historic Only (High-Range, RCP 8.5%)', 
          field: 'hist_no_future_h', 
          value: 1 
        }
      ]
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
  },

  // --- Charting Features ---
  chartingFeatures: [
    {
      label: "Any Future Flood Intersection (4.5%)",
      field: "future_flood_intersection_m",
      description: "Any segment affected by a mid-range future flood model.",
      scenario: 'rcp45'
    },
    {
      label: "Any Future Flood Intersection (8.5%)",
      field: "future_flood_intersection_h",
      description: "Any segment affected by a high-range future flood model.",
      scenario: 'rcp85'
    },
    {
      label: "Future and Historic Flood Intersection (4.5%)",
      field: "historic_intersection_m",
      description: "Segments affected by both future and historic flood models under RCP 4.5.",
      scenario: 'rcp45'
    },
    {
      label: "Future and Historic Flood Intersection (8.5%)",
      field: "historic_intersection_h",
      description: "Segments affected by both future and historic flood models under RCP 8.5.",
      scenario: 'rcp85'
    },
    {
      label: "CFRAM Fluvial Model (4.5%)",
      field: "cfram_f_m_0010",
      description: "Segments affected by the CFRAM Fluvial model under RCP 4.5.",
      scenario: 'rcp45'
    },
    {
      label: "CFRAM Coastal Model (4.5%)",
      field: "cfram_c_m_0010",
      description: "Segments affected by the CFRAM Coastal model under RCP 4.5.",
      scenario: 'rcp45'
    },
    {
      label: "NIFM Fluvial Model (4.5%)",
      field: "nifm_f_m_0020",
      description: "Segments affected by the NIFM Fluvial model under RCP 4.5.",
      scenario: 'rcp45'
    },
    {
      label: "NCFHM Coastal Model",
      field: "ncfhm_c_m_0010",
      description: "Segments affected by the NCFHM Coastal model under RCP 4.5.",
      scenario: 'rcp45'
    },
    {
      label: "CFRAM Fluvial Model (8.5%)",
      field: "cfram_f_h_0010",
      description: "Segments affected by the CFRAM Fluvial model under RCP 8.5.",
      scenario: 'rcp85'
    },
    {
      label: "CFRAM Coastal Model (8.5%)",
      field: "cfram_c_h_0010",
      description: "Segments affected by the CFRAM Coastal model under RCP 8.5.",
      scenario: 'rcp85'
    },
    {
      label: "NIFM Fluvial Model (8.5%)",
      field: "nifm_f_h_0020",
      description: "Segments affected by the NIFM Fluvial model under RCP 8.5.",
      scenario: 'rcp85'
    }
  ],

  // --- Swipe Layer Configuration ---
  swipeLayerConfig: {
    leftPanel: {
      label: 'Left/Top Layer(s) (RCP 4.5)',
      layers: [
        { title: "CFRAM f m 0010", label: "CFRAM Fluvial (10yr, RCP 4.5)", roadNetworkFieldName: "cfram_f_m_0010" },
        { title: "CFRAM c m 0010", label: "CFRAM Coastal (10yr, RCP 4.5)", roadNetworkFieldName: "cfram_c_m_0010" },
        { title: "NIFM f m 0020", label: "NIFM Fluvial (20yr, RCP 4.5)", roadNetworkFieldName: "nifm_f_m_0020" },
        { title: "NCFHM c m 0010", label: "NCFHM Coastal (10yr, RCP 4.5)", roadNetworkFieldName: "ncfhm_c_m_0010" }
      ]
    },
    rightPanel: {
      label: 'Right/Bottom Layer(s) (RCP 8.5)',
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
    mapZoom: 7,
    maxChartCategories: 10,
    segmentLengthKm: 0.1,
    debounceDelay: 300,
    throttleDelay: 100,
  }
};

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