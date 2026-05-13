import { createFeatureSelector, createSelector } from '@ngrx/store';
import { Insight } from '../../models/recommendation.models';

/**
 * Insights State Selectors
 * 
 * Provides selectors for accessing insights from the NgRx store.
 * Currently returns mock data - will be connected to actual state in future tasks.
 */

// Mock insights for demonstration
const mockInsights: Insight[] = [
  {
    id: '1',
    title: 'High Job Completion Rate',
    description: 'Job completion rate has increased by 15% over the last week',
    category: 'performance',
    severity: 'info',
    createdAt: new Date(),
    metrics: [
      {
        name: 'Completion Rate',
        value: 92,
        unit: '%',
        changePercentage: 15,
        trend: 'up'
      }
    ],
    visualizations: [],
    recommendations: ['Continue current workflow optimization strategies']
  },
  {
    id: '2',
    title: 'Resource Utilization Alert',
    description: 'Technician utilization has dropped below optimal levels',
    category: 'efficiency',
    severity: 'warning',
    createdAt: new Date(),
    metrics: [
      {
        name: 'Utilization',
        value: 68,
        unit: '%',
        changePercentage: -12,
        trend: 'down'
      }
    ],
    visualizations: [],
    recommendations: ['Review scheduling patterns', 'Consider workload redistribution']
  },
  {
    id: '3',
    title: 'Critical Scheduling Conflict',
    description: 'Multiple high-priority jobs scheduled for the same time slot',
    category: 'risk',
    severity: 'critical',
    createdAt: new Date(),
    metrics: [
      {
        name: 'Conflicts',
        value: 5,
        unit: 'jobs',
        changePercentage: 150,
        trend: 'up'
      }
    ],
    visualizations: [],
    recommendations: ['Reschedule conflicting jobs', 'Enable auto-conflict resolution']
  }
];

/**
 * Select all insights
 * 
 * TODO: Connect to actual insights state slice when implemented
 */
export const selectInsights = createSelector(
  () => mockInsights,
  (insights) => insights
);

/**
 * Select insights by category
 */
export const selectInsightsByCategory = (category: string) => createSelector(
  selectInsights,
  (insights) => insights.filter(insight => insight.category === category)
);

/**
 * Select insights by severity
 */
export const selectInsightsBySeverity = (severity: 'info' | 'warning' | 'critical') => createSelector(
  selectInsights,
  (insights) => insights.filter(insight => insight.severity === severity)
);

/**
 * Select critical insights
 */
export const selectCriticalInsights = createSelector(
  selectInsights,
  (insights) => insights.filter(insight => insight.severity === 'critical')
);
