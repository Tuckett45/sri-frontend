/**
 * Data models for AI recommendations and insights (Phase 3)
 */

export interface Recommendation {
  id: string;
  type: 'assignment' | 'scheduling' | 'resource-allocation' | 'optimization';
  title: string;
  description: string;
  confidence: number; // 0-1
  priority: 'low' | 'medium' | 'high' | 'critical';
  rationale: string;
  supportingData: any;
  actions: RecommendedAction[];
  createdAt: Date;
  expiresAt?: Date;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
}

export interface RecommendedAction {
  id: string;
  type: string;
  description: string;
  parameters: Record<string, any>;
  estimatedImpact: Impact;
}

export interface Impact {
  metric: string;
  currentValue: number;
  projectedValue: number;
  improvement: number;
  unit: string;
}

export interface RecommendationContext {
  type: string;
  entityId?: string;
  timeRange?: TimeRange;
  filters?: Record<string, any>;
}

export interface AcceptanceResult {
  recommendationId: string;
  success: boolean;
  appliedActions: string[];
  results: Record<string, any>;
  timestamp: Date;
}

export interface Feedback {
  recommendationId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  helpful: boolean;
  comment?: string;
  timestamp: Date;
}

export interface Insight {
  id: string;
  category: 'performance' | 'efficiency' | 'quality' | 'risk' | 'opportunity';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  metrics: InsightMetric[];
  visualizations: Visualization[];
  recommendations: string[];
  createdAt: Date;
}

export interface InsightMetric {
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  changePercentage: number;
}

export interface Visualization {
  type: 'chart' | 'graph' | 'heatmap' | 'table';
  data: any;
  config: Record<string, any>;
}

export interface InsightContext {
  type: string;
  timeRange: TimeRange;
  filters?: Record<string, any>;
}

export interface Explanation {
  recommendationId: string;
  factors: ExplanationFactor[];
  methodology: string;
  dataSource: string;
  confidence: number;
}

export interface ExplanationFactor {
  name: string;
  weight: number;
  value: any;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface RecommendationMetrics {
  totalRecommendations: number;
  acceptedRecommendations: number;
  rejectedRecommendations: number;
  acceptanceRate: number;
  averageConfidence: number;
  averageRating: number;
  impactMetrics: Record<string, number>;
}

export interface TimeRange {
  start: Date;
  end: Date;
}
