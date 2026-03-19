import { Injectable } from '@angular/core';
import { AtlasTelemetryService } from './atlas-telemetry.service';

/**
 * User interaction event types
 */
export enum InteractionType {
  CLICK = 'CLICK',
  VIEW = 'VIEW',
  FORM_SUBMIT = 'FORM_SUBMIT',
  NAVIGATION = 'NAVIGATION',
  SEARCH = 'SEARCH',
  FILTER = 'FILTER',
  SORT = 'SORT',
  EXPORT = 'EXPORT',
  DOWNLOAD = 'DOWNLOAD',
  UPLOAD = 'UPLOAD'
}

/**
 * User interaction event
 */
export interface UserInteractionEvent {
  timestamp: Date;
  type: InteractionType;
  feature: string;
  action: string;
  elementId?: string;
  elementType?: string;
  metadata?: any;
  userId?: string;
  sessionId?: string;
  correlationId?: string;
}

/**
 * Feature usage statistics
 */
export interface FeatureUsageStats {
  feature: string;
  totalInteractions: number;
  uniqueSessions: number;
  mostCommonActions: Array<{ action: string; count: number }>;
  averageInteractionsPerSession: number;
  lastUsed: Date;
}

/**
 * User session information
 */
export interface UserSession {
  sessionId: string;
  startTime: Date;
  lastActivity: Date;
  interactionCount: number;
  features: string[];
}

/**
 * Service for tracking user interactions with ATLAS features for analytics
 * 
 * Requirements:
 * - 13.9: Track user interactions with ATLAS features for analytics
 */
@Injectable({
  providedIn: 'root'
})
export class AtlasAnalyticsService {
  private interactions: UserInteractionEvent[] = [];
  private readonly maxInteractions = 1000; // Keep last 1000 interactions
  private sessionId: string;
  private sessionStartTime: Date;

  constructor(private telemetry: AtlasTelemetryService) {
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = new Date();
  }

  /**
   * Track a user interaction
   */
  trackInteraction(
    type: InteractionType,
    feature: string,
    action: string,
    metadata?: any,
    elementId?: string,
    elementType?: string
  ): void {
    const interaction: UserInteractionEvent = {
      timestamp: new Date(),
      type,
      feature,
      action,
      elementId,
      elementType,
      metadata,
      sessionId: this.sessionId,
      correlationId: this.generateCorrelationId()
    };

    this.addInteraction(interaction);

    // Track in telemetry
    this.telemetry.trackUserInteraction({
      type,
      feature,
      action,
      elementId,
      sessionId: this.sessionId
    }, interaction.correlationId);
  }

  /**
   * Track a click event
   */
  trackClick(
    feature: string,
    action: string,
    elementId?: string,
    metadata?: any
  ): void {
    this.trackInteraction(
      InteractionType.CLICK,
      feature,
      action,
      metadata,
      elementId,
      'button'
    );
  }

  /**
   * Track a page/component view
   */
  trackView(feature: string, viewName: string, metadata?: any): void {
    this.trackInteraction(
      InteractionType.VIEW,
      feature,
      `View: ${viewName}`,
      metadata
    );
  }

  /**
   * Track a form submission
   */
  trackFormSubmit(
    feature: string,
    formName: string,
    success: boolean,
    metadata?: any
  ): void {
    this.trackInteraction(
      InteractionType.FORM_SUBMIT,
      feature,
      `Submit: ${formName}`,
      { ...metadata, success }
    );
  }

  /**
   * Track navigation
   */
  trackNavigation(from: string, to: string, metadata?: any): void {
    this.trackInteraction(
      InteractionType.NAVIGATION,
      'Navigation',
      `${from} -> ${to}`,
      metadata
    );
  }

  /**
   * Track search
   */
  trackSearch(feature: string, query: string, resultCount?: number): void {
    this.trackInteraction(
      InteractionType.SEARCH,
      feature,
      'Search',
      { query, resultCount }
    );
  }

  /**
   * Track filter application
   */
  trackFilter(feature: string, filterType: string, filterValue: any): void {
    this.trackInteraction(
      InteractionType.FILTER,
      feature,
      `Filter: ${filterType}`,
      { filterValue }
    );
  }

  /**
   * Track sort action
   */
  trackSort(feature: string, sortField: string, sortDirection: string): void {
    this.trackInteraction(
      InteractionType.SORT,
      feature,
      `Sort: ${sortField}`,
      { sortDirection }
    );
  }

  /**
   * Track export action
   */
  trackExport(feature: string, format: string, recordCount?: number): void {
    this.trackInteraction(
      InteractionType.EXPORT,
      feature,
      `Export: ${format}`,
      { recordCount }
    );
  }

  /**
   * Track download action
   */
  trackDownload(feature: string, fileName: string, fileType?: string): void {
    this.trackInteraction(
      InteractionType.DOWNLOAD,
      feature,
      'Download',
      { fileName, fileType }
    );
  }

  /**
   * Track upload action
   */
  trackUpload(feature: string, fileName: string, fileSize?: number): void {
    this.trackInteraction(
      InteractionType.UPLOAD,
      feature,
      'Upload',
      { fileName, fileSize }
    );
  }

  /**
   * Get all interactions
   */
  getInteractions(filter?: {
    feature?: string;
    type?: InteractionType;
    startDate?: Date;
    endDate?: Date;
  }): UserInteractionEvent[] {
    let filtered = [...this.interactions];

    if (filter) {
      if (filter.feature) {
        filtered = filtered.filter(i => i.feature === filter.feature);
      }
      if (filter.type) {
        filtered = filtered.filter(i => i.type === filter.type);
      }
      if (filter.startDate) {
        filtered = filtered.filter(i => i.timestamp >= filter.startDate!);
      }
      if (filter.endDate) {
        filtered = filtered.filter(i => i.timestamp <= filter.endDate!);
      }
    }

    return filtered;
  }

  /**
   * Get feature usage statistics
   */
  getFeatureUsageStats(feature?: string): FeatureUsageStats[] {
    const features = feature
      ? [feature]
      : [...new Set(this.interactions.map(i => i.feature))];

    return features.map(f => {
      const featureInteractions = this.interactions.filter(i => i.feature === f);
      const sessions = new Set(featureInteractions.map(i => i.sessionId));
      const actionCounts = this.countActions(featureInteractions);

      return {
        feature: f,
        totalInteractions: featureInteractions.length,
        uniqueSessions: sessions.size,
        mostCommonActions: actionCounts.slice(0, 5),
        averageInteractionsPerSession: sessions.size > 0
          ? featureInteractions.length / sessions.size
          : 0,
        lastUsed: featureInteractions.length > 0
          ? featureInteractions[featureInteractions.length - 1].timestamp
          : new Date()
      };
    });
  }

  /**
   * Get current session information
   */
  getCurrentSession(): UserSession {
    const sessionInteractions = this.interactions.filter(
      i => i.sessionId === this.sessionId
    );

    return {
      sessionId: this.sessionId,
      startTime: this.sessionStartTime,
      lastActivity: sessionInteractions.length > 0
        ? sessionInteractions[sessionInteractions.length - 1].timestamp
        : this.sessionStartTime,
      interactionCount: sessionInteractions.length,
      features: [...new Set(sessionInteractions.map(i => i.feature))]
    };
  }

  /**
   * Get most used features
   */
  getMostUsedFeatures(limit: number = 5): Array<{ feature: string; count: number }> {
    const featureCounts: Record<string, number> = {};

    this.interactions.forEach(interaction => {
      featureCounts[interaction.feature] = (featureCounts[interaction.feature] || 0) + 1;
    });

    return Object.entries(featureCounts)
      .map(([feature, count]) => ({ feature, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get interaction count by type
   */
  getInteractionCountByType(): Record<InteractionType, number> {
    const counts: Record<string, number> = {};

    this.interactions.forEach(interaction => {
      counts[interaction.type] = (counts[interaction.type] || 0) + 1;
    });

    return counts as Record<InteractionType, number>;
  }

  /**
   * Get recent interactions
   */
  getRecentInteractions(count: number = 50): UserInteractionEvent[] {
    return this.interactions.slice(-count);
  }

  /**
   * Clear all interactions
   */
  clearInteractions(): void {
    this.interactions = [];
  }

  /**
   * Export analytics data
   */
  exportAnalytics(): {
    interactions: UserInteractionEvent[];
    featureUsage: FeatureUsageStats[];
    session: UserSession;
    mostUsedFeatures: Array<{ feature: string; count: number }>;
    interactionsByType: Record<InteractionType, number>;
    exportedAt: Date;
  } {
    return {
      interactions: [...this.interactions],
      featureUsage: this.getFeatureUsageStats(),
      session: this.getCurrentSession(),
      mostUsedFeatures: this.getMostUsedFeatures(),
      interactionsByType: this.getInteractionCountByType(),
      exportedAt: new Date()
    };
  }

  /**
   * Start a new session
   */
  startNewSession(): void {
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = new Date();
  }

  private addInteraction(interaction: UserInteractionEvent): void {
    this.interactions.push(interaction);

    // Keep only the most recent interactions
    if (this.interactions.length > this.maxInteractions) {
      this.interactions = this.interactions.slice(-this.maxInteractions);
    }
  }

  private countActions(interactions: UserInteractionEvent[]): Array<{ action: string; count: number }> {
    const actionCounts: Record<string, number> = {};

    interactions.forEach(interaction => {
      actionCounts[interaction.action] = (actionCounts[interaction.action] || 0) + 1;
    });

    return Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count);
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
