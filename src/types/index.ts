/**
 * Core type definitions for TII Flood Risk Dashboard
 * Enterprise-level TypeScript patterns with strict typing
 */

// By importing 'React' itself, we can safely access all of its types (like React.ReactNode)
import type * as React from 'react';
import type { ChartConfiguration } from 'chart.js';

// By importing types directly, we solve module resolution issues with @arcgis/core
import type Extent from '@arcgis/core/geometry/Extent';
import type FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import type MapView from '@arcgis/core/views/MapView';
import type WebMap from '@arcgis/core/WebMap';

// ====================================
// Domain Types - Business Logic
// ====================================

/**
 * Climate scenarios for flood risk assessment
 */
export const ClimateScenario = {
  RCP45: 'rcp45',
  RCP85: 'rcp85',
} as const;

export type ClimateScenarioType = typeof ClimateScenario[keyof typeof ClimateScenario];

/**
 * Flood risk levels based on percentage thresholds
 */
export const RiskLevel = {
  NONE: 'none',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  EXTREME: 'extreme',
} as const;

export type RiskLevelType = typeof RiskLevel[keyof typeof RiskLevel];

/**
 * Road infrastructure criticality ratings
 */
export const CriticalityRating = {
  VERY_LOW: 1,
  LOW: 2,
  MEDIUM: 3,
  HIGH: 4,
  VERY_HIGH: 5,
} as const;

export type CriticalityRatingType = typeof CriticalityRating[keyof typeof CriticalityRating];

/**
 * Road subnet classifications
 */
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
  value: string | number;
  dataType: 'string' | 'number';
  operator?: 'IN' | 'BETWEEN' | 'EQUALS' | 'LIKE';
}

export interface FilterState {
  scenarios: string[];
  counties: string[];
  criticality: [number, number];
  subnet: string[];
  lifeline: boolean | null;
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

export interface NetworkStatistics {
  totalSegments: number;
  totalLengthKm: number;
  scenarios: ScenarioStatistics[];
  lastUpdated: Date;
}

// ====================================
// Chart Types
// ====================================

export interface ChartFeature {
  label: string;
  field: string;
  description: string;
  scenario: ClimateScenarioType;
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

export interface MapViewState {
  center: [number, number];
  zoom: number;
  extent?: Extent;
}

export interface LayerConfig {
  title: string;
  label: string;
  visible?: boolean;
  opacity?: number;
  minScale?: number;
  maxScale?: number;
}

export interface SwipeConfig {
  leftLayers: string[];
  rightLayers: string[];
  position: number;
  direction: 'horizontal' | 'vertical';
  active: boolean;
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
  config: SwipeConfig;
  onConfigChange: (config: Partial<SwipeConfig>) => void;
}

// ====================================
// Service Types
// ====================================

export interface QueryOptions {
  where?: string;
  outFields?: string[];
  returnGeometry?: boolean;
  returnDistinctValues?: boolean;
  orderByFields?: string[];
  groupByFieldsForStatistics?: string[];
  outStatistics?: Array<{
    statisticType: 'count' | 'sum' | 'min' | 'max' | 'avg' | 'stddev' | 'var';
    onStatisticField: string;
    outStatisticFieldName: string;
  }>;
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