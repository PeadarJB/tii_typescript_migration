// src/types/index.ts

/**
 * Core type definitions for TII Flood Risk Dashboard
 * Consolidated single source of truth for all application types.
 */

import type * as React from 'react';
import type { ChartConfiguration } from 'chart.js';

// Direct, consistent imports for all ArcGIS types
import type Extent from '@arcgis/core/geometry/Extent';
import type Graphic from '@arcgis/core/Graphic';
import type FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import type Layer from '@arcgis/core/layers/Layer';
import type MapView from '@arcgis/core/views/MapView';
import type View from '@arcgis/core/views/View';
import type WebMap from '@arcgis/core/WebMap';
import type Query from '@arcgis/core/rest/support/Query';
import type FeatureSet from '@arcgis/core/rest/support/FeatureSet';
import type * as esriConfig from "@arcgis/core/config";



// Augment window for ArcGIS globals if needed
declare global {
  interface Window {
    __esriConfig?: typeof esriConfig;
  }
}

// ====================================
// Application State & Page Types
// ====================================
export type AppPage = 'future' | 'past' | 'precipitation' | 'explore' | 'overview';


// ====================================
// Domain Types - Business Logic
// ====================================

export const ClimateScenario = {
  RCP45: 'rcp45',
  RCP85: 'rcp85',
} as const;
export type ClimateScenarioType = typeof ClimateScenario[keyof typeof ClimateScenario];

export const RiskLevel = {
  NONE: 'none',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  EXTREME: 'extreme',
} as const;
export type RiskLevelType = typeof RiskLevel[keyof typeof RiskLevel];

export const CriticalityRating = {
  VERY_LOW: 1,
  LOW: 2,
  MEDIUM: 3,
  HIGH: 4,
  VERY_HIGH: 5,
} as const;
export type CriticalityRatingType = typeof CriticalityRating[keyof typeof CriticalityRating];

export const RoadSubnet = {
  MOTORWAY: 0,
  ENGINEERED: 1,
  URBAN: 2,
  LEGACY_HIGH: 3,
  LEGACY_LOW: 4,
} as const;
export type RoadSubnetType = typeof RoadSubnet[keyof typeof RoadSubnet];


// ====================================
// Filter Types
// ====================================

export interface FloodScenarioItem {
  label: string;
  field: string;
  value: 1;
  description?: string;
}

export interface FilterOption<T = string> {
  label: string;
  value: T;
  icon?: React.ReactNode;
  description?: string;
}

export interface FilterConfigItem {
  id: string;
  label: string;
  type: 'scenario-select' | 'multi-select' | 'range-slider' | 'single-select';
  field?: string;
  dataType?: 'string' | 'number';
  description: string;
  options?: FilterOption[];
  items?: FloodScenarioItem[];
  min?: number;
  max?: number;
  step?: number;
}

export interface ActiveFilter {
  field: string;
  value: string | number | (string | number)[];
  dataType: 'string' | 'number';
  operator?: 'IN' | 'BETWEEN' | 'EQUALS' | 'LIKE';
}

export interface FilterState {
  'flood-scenario'?: string[];
  'past-flood-event'?: string[];
  county?: string[];
  criticality?: [number, number];
  subnet?: string[];
  lifeline?: (string | number)[];
  'rainfall-absolute-cat'?: string[];
  'rainfall-change-cat'?: string[];
  'inundation-depth-45'?: [number, number];
  'inundation-depth-85'?: [number, number];
}

export interface AppliedFilters {
  [filterId: string]: ActiveFilter[];
}

// ====================================
// Statistics Types
// ====================================

export interface SegmentStatistic {
  count: number;
  lengthKm: number;
  percentage: number;
  label: string;
  modelType?: 'fluvial' | 'coastal';
}

export interface ScenarioStatistics {
  scenario: ClimateScenarioType;
  title: string;
  returnPeriod: string;
  totalAffected: SegmentStatistic;
  modelBreakdown: SegmentStatistic[];
  riskLevel: RiskLevelType;
}

export interface EventCountStatistic {
  label: string;
  count: number;
  field: string;
}

export interface PastEventStatistics {
  title: string;
  description: string;
  totalAffected: SegmentStatistic;
  eventCounts: EventCountStatistic[];
  eventBreakdown: SegmentStatistic[];
  riskLevel: RiskLevelType;
}

// NEW: Precipitation Statistics Types
export interface RainfallCategoryDistribution {
  category: number;
  count: number;
  lengthKm: number;
  percentage: number;
  label: string;
}

export interface RainfallAnalysis {
  type: 'change' | 'absolute';
  average: number;
  min: number;
  max: number;
  unit: string;
  categoryDistribution: RainfallCategoryDistribution[];
  highRiskSegments: SegmentStatistic; // Category 4-5
}

export interface InundationAnalysis {
  scenario: ClimateScenarioType;
  averageDepth: number;
  maxDepth: number;
  segmentsWithDepth: SegmentStatistic;
  highRiskSegments: SegmentStatistic; // >0.5m depth
  criticalRiskSegments: SegmentStatistic; // >1.0m depth
}

export interface CombinedRiskAnalysis {
  highRainfallHighInundation: SegmentStatistic;
  criticalInfrastructureAtRisk: SegmentStatistic;
  lifelineRoutesAffected: SegmentStatistic;
}

export interface GeographicBreakdown {
  county: string;
  totalLength: number;
  averageRainfallChange?: number;
  averageRainfallAbsolute?: number;
  averageInundationRcp45?: number;
  averageInundationRcp85?: number;
  riskLevel: RiskLevelType;
}

export interface PrecipitationStatistics {
  title: string;
  description: string;
  totalAffected: SegmentStatistic;
  rainfallAnalysis: {
    change?: RainfallAnalysis;
    absolute?: RainfallAnalysis;
  };
  inundationAnalysis: {
    rcp45?: InundationAnalysis;
    rcp85?: InundationAnalysis;
  };
  geographicBreakdown: GeographicBreakdown[];
  subnetBreakdown: SegmentStatistic[];
  combinedRisk: CombinedRiskAnalysis;
  riskLevel: RiskLevelType;
}

export interface NetworkStatistics {
  totalSegments: number;
  totalLengthKm: number;
  scenarios?: ScenarioStatistics[];
  pastEvents?: PastEventStatistics;
  precipitation?: PrecipitationStatistics; // NEW
  lastUpdated: Date;
}

// ====================================
// Chart Types
// ====================================

export interface ChartFeature {
  label: string;
  field: string;
  description: string;
  scenario: ClimateScenarioType | 'past';
}

export interface ChartDataPoint {
  category: string;
  feature: string;
  value: number;
  type: string;
  featureField?: string;
  scenario?: string;
}

export interface ChartConfig {
  type: 'bar' | 'column' | 'pie' | 'line';
  features: string[];
  groupBy: string;
  metric: 'segmentCount' | 'totalLength';
  maxCategories: number;
}

// ====================================
// Map & GIS Types
// ====================================

export interface RoadSegmentAttributes {
  OBJECTID: number;
  Route: string;
  COUNTY: string;
  Shape__Length: number;
  Criticality_Rating_Num1: number;
  Lifeline: 0 | 1;
  Subnet: number;
  
  future_flood_intersection_m: 0 | 1;
  future_flood_intersection_h: 0 | 1;
  historic_intersection_m: 0 | 1;
  historic_intersection_h: 0 | 1;
  hist_no_future_m: 0 | 1;
  hist_no_future_h: 0 | 1;
  
  cfram_f_m_0010: 0 | 1;
  cfram_c_m_0010: 0 | 1;
  nifm_f_m_0020: 0 | 1;
  ncfhm_c_m_0010: 0 | 1;
  cfram_f_h_0100: 0 | 1;
  cfram_c_h_0200: 0 | 1;
  nifm_f_h_0100: 0 | 1;
  ncfhm_c_c_0200: 0 | 1;
  
  [key: string]: any;
}

export type RoadSegmentGraphic = Graphic & {
  attributes: RoadSegmentAttributes;
};

export interface RoadQueryResult extends FeatureSet {
  features: RoadSegmentGraphic[];
}


export interface MapViewState {
  center: [number, number];
  zoom: number;
  extent?: Extent;
}

export interface LayerConfig {
  title: string;
  label: string;
  roadNetworkFieldName?: string; // Field in the road network layer to filter by
  visible?: boolean;
  opacity?: number;
  minScale?: number;
  maxScale?: number;
}

export interface SwipeWidgetConfig {
  view: MapView;
  leadingLayers: Layer[];
  trailingLayers: Layer[];
  direction: 'horizontal' | 'vertical';
  position: number;
}


// ====================================
// Report Types
// ====================================

export interface ReportSection {
  id: string;
  title: string;
  content: string | React.ReactNode;
  includeInExport: boolean;
}

export interface ReportConfig {
  title: string;
  generatedDate: Date;
  sections: ReportSection[];
  mapScreenshot?: string;
  filters: FilterState;
  statistics: NetworkStatistics;
}

// ====================================
// Application State Types
// ====================================

export interface UIState {
  sidebarCollapsed: boolean;
  activePanel: 'filters' | 'statistics' | 'charts' | 'swipe' | null;
  showFilters: boolean;
  showStatistics: boolean;
  showCharts: boolean;
  showSwipe: boolean;
  loading: boolean;
  error: Error | null;
}

export interface AppState {
  initialized: boolean;
  mode: 'dashboard' | 'analysis' | 'report';
  filters: FilterState;
  appliedFilters: AppliedFilters;
  statistics: NetworkStatistics | null;
  ui: UIState;
  map: MapViewState | null;
}

// ====================================
// Component Props Types
// ====================================

export interface BaseComponentProps {
  className?: string;
  style?: React.CSSProperties;
  'data-testid'?: string;
}

export interface PanelProps extends BaseComponentProps {
  title?: React.ReactNode;
  extra?: React.ReactNode;
  loading?: boolean;
  error?: Error | null;
  onClose?: () => void;
}

export interface FilterPanelProps extends PanelProps {
  filters: FilterState;
  onFiltersChange: (filters: Partial<FilterState>) => void;
  onApply: () => Promise<void>;
  onClear: () => void;
  availableOptions: {
    counties: FilterOption[];
    [key: string]: FilterOption[];
  };
}

export interface StatisticsPanelProps extends PanelProps {
  statistics: NetworkStatistics | null;
  scenario: ClimateScenarioType;
  onScenarioChange: (scenario: ClimateScenarioType) => void;
}

export interface ChartPanelProps extends PanelProps {
  roadLayer: FeatureLayer;
  filters: AppliedFilters;
  onExport?: (chart: ChartConfiguration) => void;
}

export interface SwipePanelProps extends PanelProps {
  view: MapView;
  webmap: WebMap;
  config: SwipeWidgetConfig;
  onConfigChange: (config: Partial<SwipeWidgetConfig>) => void;
}

// ====================================
// Service Types
// ====================================

export interface StatisticDefinition {
  statisticType: 'count' | 'sum' | 'min' | 'max' | 'avg' | 'stddev' | 'var';
  onStatisticField: string;
  outStatisticFieldName: string;
}

export interface QueryOptions {
  where?: string;
  outFields?: string[];
  returnGeometry?: boolean;
  returnDistinctValues?: boolean;
  orderByFields?: string[];
  groupByFieldsForStatistics?: string[];
  outStatistics?: StatisticDefinition[];
}

export interface QueryBuilder {
  where(clause: string): QueryBuilder;
  outFields(...fields: string[]): QueryBuilder;
  returnGeometry(value: boolean): QueryBuilder;
  orderBy(...fields: string[]): QueryBuilder;
  groupBy(...fields: string[]): QueryBuilder;
  statistics(...stats: StatisticDefinition[]): QueryBuilder;
  build(): Query;
}

export interface ServiceResponse<T> {
  data: T;
  success: boolean;
  error?: Error;
  metadata?: {
    timestamp: Date;
    duration: number;
    cached: boolean;
  };
}

// ====================================
// Data & Metadata Types
// ====================================

export interface FieldMetadata {
  fieldName: string;
  friendlyName: string;
  description: string;
  dataType?: string;
}

// ====================================
// Error Types
// ====================================

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'NETWORK_ERROR', context);
    this.name = 'NetworkError';
  }
}

// ====================================
// Utility Types
// ====================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type ValueOf<T> = T[keyof T];
export type PromiseType<T extends Promise<any>> = T extends Promise<infer U> ? U : never;

// Type guard utilities
export const isNotNull = <T>(value: T | null): value is T => value !== null;
export const isNotUndefined = <T>(value: T | undefined): value is T => value !== undefined;
export const isDefined = <T>(value: T | null | undefined): value is T => value !== null && value !== undefined;

export const isFeatureLayer = (layer: Layer): layer is FeatureLayer => {
  return layer.type === 'feature';
};

export const isMapView = (view: View): view is MapView => {
  return view.type === '2d';
};