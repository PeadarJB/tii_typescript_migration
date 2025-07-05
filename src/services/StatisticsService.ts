// src/services/StatisticsService.ts

import type { 
  NetworkStatistics,
  ScenarioStatistics,
  PastEventStatistics,
  PrecipitationStatistics,
  RainfallAnalysis,
  InundationAnalysis,
  CombinedRiskAnalysis,
  GeographicBreakdown,
  RainfallCategoryDistribution,
  SegmentStatistic,
  EventCountStatistic,
  ClimateScenarioType,
  RiskLevelType
} from '@/types';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import { CONFIG } from '@/config/appConfig';
import { QueryService } from './QueryService';
import { useAppStore } from '@/store/useAppStore';

/**
 * Service for calculating flood risk statistics
 */
export class StatisticsService {
  /**
   * Main entry point for calculating statistics.
   * Determines whether to calculate for future scenarios, past events, or precipitation.
   * @param layer - Road network layer
   * @param definitionExpression - Current filter expression
   * @returns Network statistics
   */
  public static async calculateNetworkStatistics(
    layer: FeatureLayer,
    definitionExpression: string = '1=1'
  ): Promise<NetworkStatistics> {
    const activeFilters = useAppStore.getState().currentFilters;
    const activePage = useAppStore.getState().activePage;
    const isPastEventFilterActive = activeFilters['past-flood-event'] && activeFilters['past-flood-event'].length > 0;
    const isPrecipitationFilterActive = activePage === 'precipitation' && (
      (activeFilters['rainfall-absolute-cat'] && activeFilters['rainfall-absolute-cat'].length > 0) ||
      (activeFilters['rainfall-change-cat'] && activeFilters['rainfall-change-cat'].length > 0) ||
      (activeFilters['inundation-depth-45'] && activeFilters['inundation-depth-45'].some((v, i) => i === 0 ? v > 0 : v < 5)) ||
      (activeFilters['inundation-depth-85'] && activeFilters['inundation-depth-85'].some((v, i) => i === 0 ? v > 0 : v < 5))
    );

    const totalStats = await QueryService.getStatistics(
      layer,
      definitionExpression,
      [{
        statisticType: 'count',
        onStatisticField: CONFIG.fields.object_id,
        outStatisticFieldName: 'total_count'
      }]
    );
    const totalSegments = totalStats.total_count || 0;
    const totalLengthKm = totalSegments * CONFIG.defaultSettings.segmentLengthKm;
    
    if (isPrecipitationFilterActive) {
      const precipitation = await this.calculatePrecipitationStatistics(layer, definitionExpression, totalSegments);
      return {
        totalSegments,
        totalLengthKm,
        precipitation,
        lastUpdated: new Date()
      };
    } else if (isPastEventFilterActive) {
      const pastEvents = await this.calculatePastEventStatistics(layer, definitionExpression, totalSegments);
      return {
        totalSegments,
        totalLengthKm,
        pastEvents,
        scenarios: [],
        lastUpdated: new Date()
      };
    } else {
      const [rcp85Stats, rcp45Stats] = await Promise.all([
        this.calculateScenarioStatistics(layer, definitionExpression, 'rcp85', totalSegments),
        this.calculateScenarioStatistics(layer, definitionExpression, 'rcp45', totalSegments)
      ]);
      return {
        totalSegments,
        totalLengthKm,
        scenarios: [rcp85Stats, rcp45Stats],
        lastUpdated: new Date()
      };
    }
  }

  /**
   * Calculate statistics for precipitation filters
   */
  public static async calculatePrecipitationStatistics(
    layer: FeatureLayer,
    baseWhere: string,
    totalSegmentsInFilter: number
  ): Promise<PrecipitationStatistics> {
    const TOTAL_NETWORK_LENGTH_KM = 5338.2;
    const activeFilters = useAppStore.getState().currentFilters;

    // Analyze which precipitation filters are active
    const hasRainfallChangeFilter = activeFilters['rainfall-change-cat'] && activeFilters['rainfall-change-cat'].length > 0;
    const hasRainfallAbsoluteFilter = activeFilters['rainfall-absolute-cat'] && activeFilters['rainfall-absolute-cat'].length > 0;
    const hasInundationRcp45Filter = activeFilters['inundation-depth-45'] && 
      activeFilters['inundation-depth-45'].some((v, i) => i === 0 ? v > 0 : v < 5);
    const hasInundationRcp85Filter = activeFilters['inundation-depth-85'] && 
      activeFilters['inundation-depth-85'].some((v, i) => i === 0 ? v > 0 : v < 5);

    // Calculate rainfall analysis
    const rainfallAnalysis: PrecipitationStatistics['rainfallAnalysis'] = {};
    
    if (hasRainfallChangeFilter) {
      rainfallAnalysis.change = await this.calculateRainfallAnalysis(
        layer, baseWhere, CONFIG.fields.rainfall_change_2050, CONFIG.fields.rainfall_change_cat, 'change'
      );
    }
    
    if (hasRainfallAbsoluteFilter) {
      rainfallAnalysis.absolute = await this.calculateRainfallAnalysis(
        layer, baseWhere, CONFIG.fields.rainfall_absolute_2050, CONFIG.fields.rainfall_absolute_cat, 'absolute'
      );
    }

    // Calculate inundation analysis
    const inundationAnalysis: PrecipitationStatistics['inundationAnalysis'] = {};
    
    if (hasInundationRcp45Filter) {
      inundationAnalysis.rcp45 = await this.calculateInundationAnalysis(
        layer, baseWhere, CONFIG.fields.inundation_depth_rcp45, 'rcp45'
      );
    }
    
    if (hasInundationRcp85Filter) {
      inundationAnalysis.rcp85 = await this.calculateInundationAnalysis(
        layer, baseWhere, CONFIG.fields.inundation_depth_rcp85, 'rcp85'
      );
    }

    // Calculate geographic breakdown
    const geographicBreakdown = await this.calculateGeographicBreakdown(layer, baseWhere);

    // Calculate subnet breakdown
    const subnetBreakdown = await this.calculateSubnetBreakdown(layer, baseWhere);

    // Calculate combined risk analysis
    const combinedRisk = await this.calculateCombinedRiskAnalysis(layer, baseWhere);

    const totalAffectedLengthKm = totalSegmentsInFilter * CONFIG.defaultSettings.segmentLengthKm;
    const totalAffectedPercentage = TOTAL_NETWORK_LENGTH_KM > 0 ? (totalAffectedLengthKm / TOTAL_NETWORK_LENGTH_KM) * 100 : 0;

    return {
      title: 'Precipitation Risk Analysis',
      description: 'Analysis of road network segments based on rainfall projections and inundation depth models.',
      totalAffected: {
        count: totalSegmentsInFilter,
        lengthKm: totalAffectedLengthKm,
        percentage: totalAffectedPercentage,
        label: 'Total Roads in Analysis'
      },
      rainfallAnalysis,
      inundationAnalysis,
      geographicBreakdown,
      subnetBreakdown,
      combinedRisk,
      riskLevel: this.calculateRiskLevel(totalAffectedPercentage)
    };
  }

  /**
   * Calculate rainfall analysis for a specific field
   */
  private static async calculateRainfallAnalysis(
    layer: FeatureLayer,
    baseWhere: string,
    rainfallField: string,
    categoryField: string,
    type: 'change' | 'absolute'
  ): Promise<RainfallAnalysis> {
    // Get overall statistics
    const overallStats = await QueryService.getStatistics(
      layer,
      `${baseWhere} AND ${rainfallField} IS NOT NULL AND ${rainfallField} > 0`,
      [
        { statisticType: 'avg', onStatisticField: rainfallField, outStatisticFieldName: 'avg_rainfall' },
        { statisticType: 'min', onStatisticField: rainfallField, outStatisticFieldName: 'min_rainfall' },
        { statisticType: 'max', onStatisticField: rainfallField, outStatisticFieldName: 'max_rainfall' }
      ]
    );

    // Get category distribution
    const categoryStats = await QueryService.getStatistics(
      layer,
      `${baseWhere} AND ${categoryField} IS NOT NULL`,
      [
        { statisticType: 'count', onStatisticField: CONFIG.fields.object_id, outStatisticFieldName: 'total_count' }
      ]
    );

    const categoryDistribution: RainfallCategoryDistribution[] = [];
    const totalCount = categoryStats.total_count || 0;

    // Query each category (1-5)
    for (let category = 1; category <= 5; category++) {
      const catStats = await QueryService.getStatistics(
        layer,
        `${baseWhere} AND ${categoryField} = ${category}`,
        [{ statisticType: 'count', onStatisticField: CONFIG.fields.object_id, outStatisticFieldName: 'cat_count' }]
      );

      const count = catStats.cat_count || 0;
      const lengthKm = count * CONFIG.defaultSettings.segmentLengthKm;
      const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;

      categoryDistribution.push({
        category,
        count,
        lengthKm,
        percentage,
        label: `Category ${category} (${category === 1 ? 'Very Low' : category === 2 ? 'Low' : category === 3 ? 'Medium' : category === 4 ? 'High' : 'Very High'})`
      });
    }

    // Calculate high risk segments (categories 4-5)
    const highRiskStats = await QueryService.getStatistics(
      layer,
      `${baseWhere} AND ${categoryField} IN (4, 5)`,
      [{ statisticType: 'count', onStatisticField: CONFIG.fields.object_id, outStatisticFieldName: 'high_risk_count' }]
    );

    const highRiskCount = highRiskStats.high_risk_count || 0;
    const highRiskSegments: SegmentStatistic = {
      count: highRiskCount,
      lengthKm: highRiskCount * CONFIG.defaultSettings.segmentLengthKm,
      percentage: totalCount > 0 ? (highRiskCount / totalCount) * 100 : 0,
      label: 'High Risk (Category 4-5)'
    };

    return {
      type,
      average: overallStats.avg_rainfall || 0,
      min: overallStats.min_rainfall || 0,
      max: overallStats.max_rainfall || 0,
      unit: 'mm',
      categoryDistribution,
      highRiskSegments
    };
  }

  /**
   * Calculate inundation analysis for a specific scenario
   */
  private static async calculateInundationAnalysis(
    layer: FeatureLayer,
    baseWhere: string,
    depthField: string,
    scenario: ClimateScenarioType
  ): Promise<InundationAnalysis> {
    // Overall depth statistics
    const depthStats = await QueryService.getStatistics(
      layer,
      `${baseWhere} AND ${depthField} IS NOT NULL AND ${depthField} > 0`,
      [
        { statisticType: 'avg', onStatisticField: depthField, outStatisticFieldName: 'avg_depth' },
        { statisticType: 'max', onStatisticField: depthField, outStatisticFieldName: 'max_depth' },
        { statisticType: 'count', onStatisticField: CONFIG.fields.object_id, outStatisticFieldName: 'with_depth_count' }
      ]
    );

    // High risk (>0.5m depth)
    const highRiskStats = await QueryService.getStatistics(
      layer,
      `${baseWhere} AND ${depthField} > 0.5`,
      [{ statisticType: 'count', onStatisticField: CONFIG.fields.object_id, outStatisticFieldName: 'high_risk_count' }]
    );

    // Critical risk (>1.0m depth)
    const criticalRiskStats = await QueryService.getStatistics(
      layer,
      `${baseWhere} AND ${depthField} > 1.0`,
      [{ statisticType: 'count', onStatisticField: CONFIG.fields.object_id, outStatisticFieldName: 'critical_risk_count' }]
    );

    const withDepthCount = depthStats.with_depth_count || 0;
    const highRiskCount = highRiskStats.high_risk_count || 0;
    const criticalRiskCount = criticalRiskStats.critical_risk_count || 0;

    return {
      scenario,
      averageDepth: depthStats.avg_depth || 0,
      maxDepth: depthStats.max_depth || 0,
      segmentsWithDepth: {
        count: withDepthCount,
        lengthKm: withDepthCount * CONFIG.defaultSettings.segmentLengthKm,
        percentage: 100, // This is relative to the filtered set
        label: 'Segments with Inundation'
      },
      highRiskSegments: {
        count: highRiskCount,
        lengthKm: highRiskCount * CONFIG.defaultSettings.segmentLengthKm,
        percentage: withDepthCount > 0 ? (highRiskCount / withDepthCount) * 100 : 0,
        label: 'High Risk (>0.5m depth)'
      },
      criticalRiskSegments: {
        count: criticalRiskCount,
        lengthKm: criticalRiskCount * CONFIG.defaultSettings.segmentLengthKm,
        percentage: withDepthCount > 0 ? (criticalRiskCount / withDepthCount) * 100 : 0,
        label: 'Critical Risk (>1.0m depth)'
      }
    };
  }

  /**
   * Calculate geographic breakdown
   */
  private static async calculateGeographicBreakdown(
    layer: FeatureLayer,
    baseWhere: string
  ): Promise<GeographicBreakdown[]> {
    const query = layer.createQuery();
    query.where = baseWhere;
    query.groupByFieldsForStatistics = ['COUNTY'];
    query.outStatistics = [
      { statisticType: 'sum', onStatisticField: 'Shape__Length', outStatisticFieldName: 'totalLength' },
      { statisticType: 'avg', onStatisticField: CONFIG.fields.rainfall_change_2050, outStatisticFieldName: 'avgRainfallChange' },
      { statisticType: 'avg', onStatisticField: CONFIG.fields.rainfall_absolute_2050, outStatisticFieldName: 'avgRainfallAbsolute' },
      { statisticType: 'avg', onStatisticField: CONFIG.fields.inundation_depth_rcp45, outStatisticFieldName: 'avgInundationRcp45' },
      { statisticType: 'avg', onStatisticField: CONFIG.fields.inundation_depth_rcp85, outStatisticFieldName: 'avgInundationRcp85' }
    ];
    query.orderByFields = ['totalLength DESC'];

    try {
      const results = await layer.queryFeatures(query);
      return results.features.map(f => ({
        county: f.attributes.COUNTY,
        totalLength: (f.attributes.totalLength || 0) / 1000, // Convert to km
        averageRainfallChange: f.attributes.avgRainfallChange || undefined,
        averageRainfallAbsolute: f.attributes.avgRainfallAbsolute || undefined,
        averageInundationRcp45: f.attributes.avgInundationRcp45 || undefined,
        averageInundationRcp85: f.attributes.avgInundationRcp85 || undefined,
        riskLevel: this.calculateRiskLevel((f.attributes.totalLength || 0) / 1000 / 100) // Rough estimate
      })).slice(0, 10); // Top 10 counties
    } catch (error) {
      console.error('Failed to calculate geographic breakdown:', error);
      return [];
    }
  }

  /**
   * Calculate subnet breakdown
   */
  private static async calculateSubnetBreakdown(
    layer: FeatureLayer,
    baseWhere: string
  ): Promise<SegmentStatistic[]> {
    const subnetMap = CONFIG.filterConfig.find(f => f.id === 'subnet')?.options?.reduce((acc, opt) => {
      acc[opt.value] = opt.label;
      return acc;
    }, {} as Record<string, string>) ?? {};

    const breakdown: SegmentStatistic[] = [];

    for (const [subnetValue, subnetLabel] of Object.entries(subnetMap)) {
      const stats = await QueryService.getStatistics(
        layer,
        `${baseWhere} AND Subnet = ${subnetValue}`,
        [{ statisticType: 'count', onStatisticField: CONFIG.fields.object_id, outStatisticFieldName: 'subnet_count' }]
      );

      const count = stats.subnet_count || 0;
      if (count > 0) {
        breakdown.push({
          count,
          lengthKm: count * CONFIG.defaultSettings.segmentLengthKm,
          percentage: 0, // Will be calculated relative to total
          label: subnetLabel
        });
      }
    }

    // Calculate percentages
    const totalCount = breakdown.reduce((sum, item) => sum + item.count, 0);
    breakdown.forEach(item => {
      item.percentage = totalCount > 0 ? (item.count / totalCount) * 100 : 0;
    });

    return breakdown.sort((a, b) => b.count - a.count);
  }

  /**
   * Calculate combined risk analysis
   */
  private static async calculateCombinedRiskAnalysis(
    layer: FeatureLayer,
    baseWhere: string
  ): Promise<CombinedRiskAnalysis> {
    // High rainfall + high inundation
    const highRainfallHighInundationStats = await QueryService.getStatistics(
      layer,
      `${baseWhere} AND Rainfall_Change_category >= 4 AND (avg_dep_45 > 0.5 OR avg_dep_85 > 0.5)`,
      [{ statisticType: 'count', onStatisticField: CONFIG.fields.object_id, outStatisticFieldName: 'combined_high_count' }]
    );

    // Critical infrastructure (criticality >= 4)
    const criticalInfraStats = await QueryService.getStatistics(
      layer,
      `${baseWhere} AND Criticality_Rating_Num1 >= 4`,
      [{ statisticType: 'count', onStatisticField: CONFIG.fields.object_id, outStatisticFieldName: 'critical_infra_count' }]
    );

    // Lifeline routes
    const lifelineStats = await QueryService.getStatistics(
      layer,
      `${baseWhere} AND Lifeline = 1`,
      [{ statisticType: 'count', onStatisticField: CONFIG.fields.object_id, outStatisticFieldName: 'lifeline_count' }]
    );

    const highRainfallHighInundationCount = highRainfallHighInundationStats.combined_high_count || 0;
    const criticalInfraCount = criticalInfraStats.critical_infra_count || 0;
    const lifelineCount = lifelineStats.lifeline_count || 0;

    return {
      highRainfallHighInundation: {
        count: highRainfallHighInundationCount,
        lengthKm: highRainfallHighInundationCount * CONFIG.defaultSettings.segmentLengthKm,
        percentage: 0, // Will be calculated relative to total if needed
        label: 'High Rainfall + High Inundation'
      },
      criticalInfrastructureAtRisk: {
        count: criticalInfraCount,
        lengthKm: criticalInfraCount * CONFIG.defaultSettings.segmentLengthKm,
        percentage: 0,
        label: 'Critical Infrastructure at Risk'
      },
      lifelineRoutesAffected: {
        count: lifelineCount,
        lengthKm: lifelineCount * CONFIG.defaultSettings.segmentLengthKm,
        percentage: 0,
        label: 'Lifeline Routes Affected'
      }
    };
  }

  /**
   * Calculate statistics for past flood events by summing event counts.
   */
  public static async calculatePastEventStatistics(
    layer: FeatureLayer,
    baseWhere: string,
    totalSegmentsInFilter: number
  ): Promise<PastEventStatistics> {
    const TOTAL_NETWORK_LENGTH_KM = 5338.2;

    const summaryEventFields: Record<string, string> = {
        drainageDefects: CONFIG.fields.dms_defects_count,
        opwPoints: CONFIG.fields.opw_points_count,
        nraPoints: CONFIG.fields.nra_points_count,
        moccPoints: CONFIG.fields.mocc_points_count,
    };

    const eventBreakdown: SegmentStatistic[] = [];
    const pastEventFilterConfig = CONFIG.filterConfig.find(f => f.id === 'past-flood-event');
    if (pastEventFilterConfig?.items) {
        for (const item of pastEventFilterConfig.items) {
            const stats = await QueryService.getStatistics(
                layer,
                `(${baseWhere}) AND (${item.field} = 1)`,
                [{ statisticType: 'count', onStatisticField: CONFIG.fields.object_id, outStatisticFieldName: 'affected_count' }]
            );
            const count = stats.affected_count || 0;
            if (count > 0) {
                eventBreakdown.push({
                    count,
                    lengthKm: count * CONFIG.defaultSettings.segmentLengthKm,
                    percentage: totalSegmentsInFilter > 0 ? (count / totalSegmentsInFilter) * 100 : 0,
                    label: item.label,
                });
            }
        }
    }

    const totalAffectedLengthKm = totalSegmentsInFilter * CONFIG.defaultSettings.segmentLengthKm;
    const totalAffectedPercentage = TOTAL_NETWORK_LENGTH_KM > 0 ? (totalAffectedLengthKm / TOTAL_NETWORK_LENGTH_KM) * 100 : 0;

    const statisticDefinitions = Object.values(summaryEventFields).map(field => ({
        statisticType: 'sum' as const,
        onStatisticField: field,
        outStatisticFieldName: `sum_${field}`
    }));

    const sumStats = await QueryService.getStatistics(layer, baseWhere, statisticDefinitions);

    const eventCounts: EventCountStatistic[] = Object.entries(summaryEventFields).map(([key, field]) => ({
        label: key,
        count: sumStats[`sum_${field}`] || 0,
        field: field,
    }));

    return {
        title: 'Past Flood Events Analysis',
        description: 'Analysis of road network segments affected by historical flood data.',
        totalAffected: {
            count: totalSegmentsInFilter,
            lengthKm: totalAffectedLengthKm,
            percentage: totalAffectedPercentage,
            label: 'Total Roads Affected'
        },
        eventCounts,
        eventBreakdown,
        riskLevel: this.calculateRiskLevel(totalAffectedPercentage)
    };
  }

  /**
   * Calculate statistics for a specific climate scenario
   */
  private static async calculateScenarioStatistics(
    layer: FeatureLayer,
    baseWhere: string,
    scenario: ClimateScenarioType,
    totalSegments: number
  ): Promise<ScenarioStatistics> {
    const TOTAL_NETWORK_LENGTH_KM = 5338.2;
    const fields = this.getScenarioFields(scenario);
    const modelBreakdown: SegmentStatistic[] = [];
    let totalAffectedCount = 0;

    for (const [modelKey, field] of Object.entries(fields)) {
      if (!field) continue;
      const stats = await QueryService.getStatistics(
        layer,
        `(${baseWhere}) AND (${field} = 1)`,
        [{
          statisticType: 'count',
          onStatisticField: CONFIG.fields.object_id,
          outStatisticFieldName: 'affected_count'
        }]
      );
      const count = stats.affected_count || 0;
      if (modelKey === 'any') {
        totalAffectedCount = count;
      } else if (count > 0) {
        modelBreakdown.push({
          count,
          lengthKm: count * CONFIG.defaultSettings.segmentLengthKm,
          percentage: totalSegments > 0 ? (count / totalSegments) * 100 : 0,
          label: this.getModelLabel(modelKey),
          modelType: modelKey.includes('c') ? 'coastal' : 'fluvial'
        });
      }
    }

    const totalAffectedLengthKm = totalAffectedCount * CONFIG.defaultSettings.segmentLengthKm;
    const totalAffectedPercentage = totalSegments > 0 ? (totalAffectedLengthKm / TOTAL_NETWORK_LENGTH_KM) * 100 : 0;

    return {
      scenario,
      title: scenario === 'rcp45' ? 'RCP 4.5 Flood Scenario' : 'RCP 8.5 Flood Scenario',
      returnPeriod: scenario === 'rcp45' ? '10-20 year return period' : '100-200 year return period',
      totalAffected: {
        count: totalAffectedCount,
        lengthKm: totalAffectedLengthKm,
        percentage: totalAffectedPercentage,
        label: 'Total Roads at Risk'
      },
      modelBreakdown,
      riskLevel: this.calculateRiskLevel(totalAffectedPercentage)
    };
  }

  private static getScenarioFields(scenario: ClimateScenarioType): Record<string, string | undefined> {
    if (scenario === 'rcp45') {
      return {
        any: CONFIG.fields.floodAffected,
        cfram_f: CONFIG.fields.cfram_f_m_0010,
        cfram_c: CONFIG.fields.cfram_c_m_0010,
        nifm_f: CONFIG.fields.nifm_f_m_0020,
        ncfhm_c: CONFIG.fields.ncfhm_c_m_0010
      };
    } else {
      return {
        any: CONFIG.fields.floodAffected_h,
        cfram_f: CONFIG.fields.cfram_f_h_0100,
        cfram_c: CONFIG.fields.cfram_c_h_0200,
        nifm_f: CONFIG.fields.nifm_f_h_0100,
        ncfhm_c: CONFIG.fields.ncfhm_c_c_0200
      };
    }
  }

  private static getModelLabel(modelKey: string): string {
    const labels: Record<string, string> = {
      cfram_f: 'CFRAM Fluvial Model',
      cfram_c: 'CFRAM Coastal Model',
      nifm_f: 'NIFM Fluvial Model',
      ncfhm_c: 'NCFHM Coastal Model'
    };
    return labels[modelKey] || modelKey;
  }

  private static calculateRiskLevel(percentage: number): RiskLevelType {
    if (percentage < 5) return 'low';
    if (percentage < 15) return 'medium';
    return 'high';
  }

  public static async calculateAreaStatistics(
    layer: FeatureLayer,
    areaField: string,
    areaValue: string
  ): Promise<NetworkStatistics> {
    const whereClause = `${areaField} = '${areaValue}'`;
    return this.calculateNetworkStatistics(layer, whereClause);
  }

  public static compareScenarios(
    stats1: ScenarioStatistics,
    stats2: ScenarioStatistics
  ): {
    percentageIncrease: number;
    additionalLength: number;
    additionalSegments: number;
  } {
    const diff = stats2.totalAffected.lengthKm - stats1.totalAffected.lengthKm;
    const percentageIncrease = stats1.totalAffected.lengthKm > 0
      ? (diff / stats1.totalAffected.lengthKm) * 100
      : 0;

    return {
      percentageIncrease,
      additionalLength: diff,
      additionalSegments: stats2.totalAffected.count - stats1.totalAffected.count
    };
  }

  public static exportToCSV(statistics: NetworkStatistics): string {
    const headers = ['Scenario', 'Model', 'Affected Segments', 'Length (km)', 'Percentage'];
    const rows: string[][] = [];

    if (statistics?.scenarios) {
      statistics.scenarios.forEach(scenario => {
        rows.push([
          scenario.title,
          'Total',
          scenario.totalAffected.count.toString(),
          scenario.totalAffected.lengthKm.toFixed(2),
          scenario.totalAffected.percentage.toFixed(2) + '%'
        ]);
        scenario.modelBreakdown.forEach(model => {
          rows.push([
            scenario.title,
            model.label,
            model.count.toString(),
            model.lengthKm.toFixed(2),
            model.percentage.toFixed(2) + '%'
          ]);
        });
      });
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  }
}