import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { Recommendation, Insight } from '../../models/recommendation.models';
import { selectRecommendations } from '../../state/ai-recommendations/ai-recommendations.selectors';
import { selectInsights } from '../../state/insights/insights.selectors';

/**
 * AI Insights Dashboard Page
 * 
 * Comprehensive dashboard displaying AI recommendations and insights
 * across all contexts. Provides centralized access to AI-powered
 * decision support features.
 */
@Component({
  selector: 'app-ai-insights-dashboard',
  templateUrl: './ai-insights-dashboard.component.html',
  styleUrls: ['./ai-insights-dashboard.component.scss']
})
export class AiInsightsDashboardComponent implements OnInit {
  // Selected context for recommendations
  selectedContext: 'job' | 'scheduling' | 'resource-allocation' | 'forecasting' = 'job';
  
  // Display mode for insights
  insightsDisplayMode: 'cards' | 'list' | 'timeline' = 'cards';
  
  // Observables
  recommendations$: Observable<Recommendation[]>;
  insights$: Observable<Insight[]>;
  
  // Available contexts
  availableContexts: Array<{value: 'job' | 'scheduling' | 'resource-allocation' | 'forecasting', label: string}> = [
    { value: 'job', label: 'Job Management' },
    { value: 'scheduling', label: 'Scheduling' },
    { value: 'resource-allocation', label: 'Resource Allocation' },
    { value: 'forecasting', label: 'Forecasting' }
  ];

  constructor(private store: Store) {
    this.recommendations$ = this.store.select(selectRecommendations);
    this.insights$ = this.store.select(selectInsights);
  }

  ngOnInit(): void {
    // Initial data loading handled by child components
  }

  /**
   * Change the selected context for recommendations
   */
  changeContext(context: 'job' | 'scheduling' | 'resource-allocation' | 'forecasting'): void {
    this.selectedContext = context;
  }

  /**
   * Change the display mode for insights
   */
  changeInsightsDisplayMode(mode: 'cards' | 'list' | 'timeline'): void {
    this.insightsDisplayMode = mode;
  }

  /**
   * Handle recommendation acceptance
   */
  onRecommendationAccepted(recommendation: Recommendation): void {
    console.log('Recommendation accepted:', recommendation);
    // Additional handling can be added here
  }

  /**
   * Handle recommendation rejection
   */
  onRecommendationRejected(event: { recommendation: Recommendation; reason: string }): void {
    console.log('Recommendation rejected:', event);
    // Additional handling can be added here
  }

  /**
   * Handle insight selection
   */
  onInsightSelected(insight: Insight): void {
    console.log('Insight selected:', insight);
    // Could open a detail modal or navigate to related page
  }
}
