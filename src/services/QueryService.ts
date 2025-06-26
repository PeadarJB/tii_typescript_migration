import Query from '@arcgis/core/rest/support/Query';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import type { 
  QueryOptions, 
  ServiceResponse,
  RoadSegmentAttributes,
  StatisticDefinition
} from '@/types';
import { NetworkError } from '@/types';

/**
 * Service for handling ArcGIS queries with proper error handling and caching
 */
export class QueryService {
  private static cache = new Map<string, { data: any; timestamp: number }>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  public static async executeQuery<T = RoadSegmentAttributes>(
    layer: FeatureLayer,
    options: QueryOptions
  ): Promise<ServiceResponse<__esri.FeatureSet>> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(layer.url ?? '', options);
    
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        data: cached,
        success: true,
        metadata: {
          timestamp: new Date(),
          duration: 0,
          cached: true
        }
      };
    }

    try {
      const query = this.buildQuery(options);
      const result = await layer.queryFeatures(query);
      
      this.setCache(cacheKey, result);
      
      return {
        data: result,
        success: true,
        metadata: {
          timestamp: new Date(),
          duration: Date.now() - startTime,
          cached: false
        }
      };
    } catch (error) {
      console.error('QueryService: Query failed', error);
      
      return {
        data: null as any,
        success: false,
        error: error instanceof Error ? error : new Error('Query failed'),
        metadata: {
          timestamp: new Date(),
          duration: Date.now() - startTime,
          cached: false
        }
      };
    }
  }

  public static async getUniqueValues(
    layer: FeatureLayer,
    fieldName: string
  ): Promise<Array<{ label: string; value: string }>> {
    const options: QueryOptions = {
      where: '1=1',
      outFields: [fieldName],
      returnDistinctValues: true,
      orderByFields: [fieldName]
    };

    const response = await this.executeQuery(layer, options);
    
    if (!response.success || !response.data) {
      throw new NetworkError('Failed to get unique values', { fieldName });
    }

    return response.data.features
      .map(feature => feature.attributes[fieldName])
      .filter((value): value is string | number => 
        value !== null && 
        value !== undefined && 
        String(value).trim() !== ''
      )
      .map(value => ({
        label: String(value),
        value: String(value)
      }));
  }

  public static async getStatistics(
    layer: FeatureLayer,
    where: string,
    statistics: StatisticDefinition[]
  ): Promise<Record<string, number>> {
    const options: QueryOptions = {
      where,
      outStatistics: statistics
    };

    const response = await this.executeQuery(layer, options);
    
    if (!response.success || !response.data) {
      throw new NetworkError('Failed to get statistics', { where, statistics });
    }

    if (response.data.features.length === 0) {
      const zeroStats: Record<string, number> = {};
      statistics.forEach(stat => {
        zeroStats[stat.outStatisticFieldName] = 0;
      });
      return zeroStats;
    }

    return response.data.features[0].attributes;
  }

  public static async getExtent(
    layer: FeatureLayer,
    where: string
  ): Promise<__esri.Extent | null> {
    try {
      const query = new Query({ where });
      const result = await layer.queryExtent(query);
      return result.extent;
    } catch (error) {
      console.error('QueryService: Failed to get extent', error);
      return null;
    }
  }

  private static buildQuery(options: QueryOptions): Query {
    const query = new Query();
    
    if (options.where !== undefined) query.where = options.where;
    if (options.outFields !== undefined) query.outFields = options.outFields;
    if (options.returnGeometry !== undefined) query.returnGeometry = options.returnGeometry;
    if (options.returnDistinctValues !== undefined) query.returnDistinctValues = options.returnDistinctValues;
    if (options.orderByFields !== undefined) query.orderByFields = options.orderByFields;
    if (options.groupByFieldsForStatistics !== undefined) {
      query.groupByFieldsForStatistics = options.groupByFieldsForStatistics;
    }
    if (options.outStatistics !== undefined) {
      query.outStatistics = options.outStatistics.map(stat => ({
        statisticType: stat.statisticType,
        onStatisticField: stat.onStatisticField,
        outStatisticFieldName: stat.outStatisticFieldName
      }));
    }
    
    return query;
  }

  private static generateCacheKey(url: string, options: QueryOptions): string {
    return `${url}::${JSON.stringify(options)}`;
  }

  private static getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > this.CACHE_DURATION;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  private static setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    if (this.cache.size > 100) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  public static clearCache(): void {
    this.cache.clear();
  }
}