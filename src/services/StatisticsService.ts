import type { 
  NetworkStatistics,
  ScenarioStatistics,
  PastEventStatistics,
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
   * Calculate network statistics for current filters
   * @param layer - Road network layer
   * @param definitionExpression - Current filter expression
   * @returns Network statistics
   */
  public static async calculateNetworkStatistics(
    layer: FeatureLayer,
    definitionExpression: string = '1=1'
  ): Promise<NetworkStatistics> {
    try {
      // Get total network stats
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

      // Calculate statistics for each scenario, with RCP 8.5 first.
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
    } catch (error) {
      console.error('StatisticsService: Failed to calculate network statistics', error);
      throw error;
    }
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
    const TOTAL_NETWORK_LENGTH_KM = 5338.2; // Fixed total network length
    const fields = this.getScenarioFields(scenario);
    const modelBreakdown: SegmentStatistic[] = [];
    let totalAffectedCount = 0;

    // Get statistics for each model
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
    const totalAffectedPercentage = totalSegments > 0 
      ? (totalAffectedLengthKm / TOTAL_NETWORK_LENGTH_KM) * 100 
      : 0;

    return {
      scenario,
      title: scenario === 'rcp45' 
        ? 'RCP 4.5 Flood Scenario' 
        : 'RCP 8.5 Flood Scenario',
      returnPeriod: scenario === 'rcp45' 
        ? '10-20 year return period' 
        : '100-200 year return period',
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

  /**
   * Get field mappings for a climate scenario
   */
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

  /**
   * Get human-readable model label
   */
  private static getModelLabel(modelKey: string): string {
    const labels: Record<string, string> = {
      cfram_f: 'CFRAM Fluvial Model',
      cfram_c: 'CFRAM Coastal Model',
      nifm_f: 'NIFM Fluvial Model',
      ncfhm_c: 'NCFHM Coastal Model'
    };
    return labels[modelKey] || modelKey;
  }

  /**
   * Calculate risk level based on percentage affected
   */
  private static calculateRiskLevel(percentage: number): RiskLevelType {
    if (percentage < 5) return 'low';
    if (percentage < 15) return 'medium';
    return 'high';
  }

  /**
   * Calculate statistics for a specific area (e.g., county)
   */
  public static async calculateAreaStatistics(
    layer: FeatureLayer,
    areaField: string,
    areaValue: string
  ): Promise<NetworkStatistics> {
    const whereClause = `${areaField} = '${areaValue}'`;
    return this.calculateNetworkStatistics(layer, whereClause);
  }

  /**
   * Compare statistics between two scenarios
   */
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

  /**
   * Export statistics to CSV format
   */
  public static exportToCSV(statistics: NetworkStatistics): string {
    const headers = ['Scenario', 'Model', 'Affected Segments', 'Length (km)', 'Percentage'];
    const rows: string[][] = [];

    statistics.scenarios.forEach(scenario => {
      // Add total row for scenario
      rows.push([
        scenario.title,
        'Total',
        scenario.totalAffected.count.toString(),
        scenario.totalAffected.lengthKm.toFixed(2),
        scenario.totalAffected.percentage.toFixed(2) + '%'
      ]);

      // Add model breakdown
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

    // Convert to CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  }
}