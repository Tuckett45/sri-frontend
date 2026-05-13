import { Injectable } from '@angular/core';
import { AtlasConfigService } from './atlas-config.service';

/**
 * Service routing decision result
 */
export interface RoutingDecision {
  useAtlas: boolean;
  reason: string;
  featureName: string;
  timestamp: Date;
}

/**
 * AtlasRoutingService
 * 
 * Handles routing decisions between ATLAS and ARK services based on feature flags.
 * Supports hybrid mode where some features use ATLAS and others use ARK.
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.5, 10.7
 */
@Injectable({
  providedIn: 'root'
})
export class AtlasRoutingService {
  private routingLog: RoutingDecision[] = [];
  private readonly MAX_LOG_SIZE = 1000;

  constructor(private configService: AtlasConfigService) {}

  /**
   * Determine if a feature should use ATLAS or ARK services
   * Requirements: 10.1, 10.2, 10.3
   * 
   * @param featureName - The feature name (aiAnalysis, approvals, exceptions, agents, queryBuilder)
   * @returns True if ATLAS should be used, false if ARK should be used
   */
  shouldUseAtlas(featureName: string): boolean {
    const decision = this.makeRoutingDecision(featureName);
    this.logRoutingDecision(decision);
    return decision.useAtlas;
  }

  /**
   * Make a routing decision for a feature
   * Requirements: 10.1, 10.2, 10.3, 10.5
   * 
   * @param featureName - The feature name
   * @returns Routing decision with reason
   */
  makeRoutingDecision(featureName: string): RoutingDecision {
    const timestamp = new Date();

    // Check if ATLAS integration is enabled (Requirement 10.1)
    if (!this.configService.isEnabled()) {
      return {
        useAtlas: false,
        reason: 'ATLAS integration is disabled',
        featureName,
        timestamp
      };
    }

    // Check if hybrid mode is enabled (Requirement 10.5)
    if (this.configService.isHybridMode()) {
      // In hybrid mode, check if specific feature is enabled
      if (this.configService.isFeatureEnabled(featureName)) {
        return {
          useAtlas: true,
          reason: `Hybrid mode: ${featureName} is enabled for ATLAS`,
          featureName,
          timestamp
        };
      } else {
        return {
          useAtlas: false,
          reason: `Hybrid mode: ${featureName} is not enabled for ATLAS, using ARK`,
          featureName,
          timestamp
        };
      }
    }

    // ATLAS is fully enabled, use ATLAS for all features (Requirement 10.3)
    return {
      useAtlas: true,
      reason: 'ATLAS integration is fully enabled',
      featureName,
      timestamp
    };
  }

  /**
   * Get routing decision with detailed information
   * 
   * @param featureName - The feature name
   * @returns Routing decision object
   */
  getRoutingDecision(featureName: string): RoutingDecision {
    return this.makeRoutingDecision(featureName);
  }

  /**
   * Check if ATLAS is available for a specific feature
   * 
   * @param featureName - The feature name
   * @returns True if ATLAS is available for this feature
   */
  isAtlasAvailable(featureName: string): boolean {
    return this.shouldUseAtlas(featureName);
  }

  /**
   * Check if ARK fallback should be used for a feature
   * 
   * @param featureName - The feature name
   * @returns True if ARK fallback should be used
   */
  shouldUseArkFallback(featureName: string): boolean {
    return !this.shouldUseAtlas(featureName);
  }

  /**
   * Log routing decision for monitoring
   * Requirements: 10.7
   * 
   * @param decision - The routing decision to log
   */
  private logRoutingDecision(decision: RoutingDecision): void {
    // Add to in-memory log
    this.routingLog.push(decision);

    // Trim log if it exceeds max size
    if (this.routingLog.length > this.MAX_LOG_SIZE) {
      this.routingLog = this.routingLog.slice(-this.MAX_LOG_SIZE);
    }

    // Log to console for debugging
    console.log(
      `[ATLAS Routing] Feature: ${decision.featureName}, ` +
      `Use ATLAS: ${decision.useAtlas}, ` +
      `Reason: ${decision.reason}`
    );
  }

  /**
   * Get routing log for monitoring and debugging
   * Requirements: 10.7
   * 
   * @param featureName - Optional feature name to filter by
   * @param limit - Maximum number of entries to return
   * @returns Array of routing decisions
   */
  getRoutingLog(featureName?: string, limit: number = 100): RoutingDecision[] {
    let log = this.routingLog;

    // Filter by feature name if provided
    if (featureName) {
      log = log.filter(d => d.featureName === featureName);
    }

    // Return most recent entries up to limit
    return log.slice(-limit);
  }

  /**
   * Get routing statistics
   * Requirements: 10.7
   * 
   * @returns Statistics about routing decisions
   */
  getRoutingStatistics(): {
    totalDecisions: number;
    atlasCount: number;
    arkCount: number;
    byFeature: Record<string, { atlas: number; ark: number }>;
  } {
    const stats = {
      totalDecisions: this.routingLog.length,
      atlasCount: 0,
      arkCount: 0,
      byFeature: {} as Record<string, { atlas: number; ark: number }>
    };

    for (const decision of this.routingLog) {
      // Count overall
      if (decision.useAtlas) {
        stats.atlasCount++;
      } else {
        stats.arkCount++;
      }

      // Count by feature
      if (!stats.byFeature[decision.featureName]) {
        stats.byFeature[decision.featureName] = { atlas: 0, ark: 0 };
      }

      if (decision.useAtlas) {
        stats.byFeature[decision.featureName].atlas++;
      } else {
        stats.byFeature[decision.featureName].ark++;
      }
    }

    return stats;
  }

  /**
   * Clear routing log
   */
  clearRoutingLog(): void {
    this.routingLog = [];
  }

  /**
   * Get all enabled ATLAS features
   * 
   * @returns Array of enabled feature names
   */
  getEnabledAtlasFeatures(): string[] {
    if (!this.configService.isEnabled()) {
      return [];
    }

    if (this.configService.isHybridMode()) {
      return this.configService.config.features.enabledFeatures;
    }

    // All features enabled when ATLAS is fully enabled (except deployments - using ARK's)
    return ['aiAnalysis', 'approvals', 'exceptions', 'agents', 'queryBuilder'];
  }

  /**
   * Check if any ATLAS features are enabled
   * 
   * @returns True if at least one ATLAS feature is enabled
   */
  hasAnyAtlasFeatures(): boolean {
    return this.getEnabledAtlasFeatures().length > 0;
  }
}
