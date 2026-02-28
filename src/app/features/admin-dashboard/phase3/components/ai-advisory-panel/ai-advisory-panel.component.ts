import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  Recommendation,
  RecommendationContext,
  Feedback
} from '../../models/recommendation.models';
import {
  selectRecommendations,
  selectLoading,
  selectError,
  selectIsAccepting,
  selectIsRejecting
} from '../../state/ai-recommendations/ai-recommendations.selectors';
import {
  loadRecommendations,
  refreshRecommendations,
  acceptRecommendation,
  rejectRecommendation,
  provideFeedback
} from '../../state/ai-recommendations/ai-recommendations.actions';

/**
 * AI Advisory Panel Component
 * 
 * Displays AI-generated recommendations with confidence scores, priorities,
 * and action controls. Supports auto-refresh and user feedback collection.
 * 
 * **Validates: Requirements 8.1, 8.2, 8.5, 8.6**
 */
@Component({
  selector: 'app-ai-advisory-panel',
  templateUrl: './ai-advisory-panel.component.html',
  styleUrls: ['./ai-advisory-panel.component.scss']
})
export class AIAdvisoryPanelComponent implements OnInit, OnDestroy {
  @Input() context: 'job' | 'scheduling' | 'resource-allocation' | 'forecasting' = 'job';
  @Input() entityId?: string;
  @Input() autoRefresh: boolean = false;
  @Output() recommendationAccepted = new EventEmitter<Recommendation>();
  @Output() recommendationRejected = new EventEmitter<{ recommendation: Recommendation; reason: string }>();

  // Observables from store
  recommendations$: Observable<Recommendation[]>;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;

  // UI state
  expandedRecommendations = new Set<string>();
  selectedRecommendation: Recommendation | null = null;
  showRejectDialog = false;
  rejectReason = '';
  rejectingRecommendationId: string | null = null;
  
  // Auto-refresh
  private refreshInterval = 60000; // 60 seconds
  private destroy$ = new Subject<void>();

  constructor(private store: Store) {
    this.recommendations$ = this.store.select(selectRecommendations);
    this.loading$ = this.store.select(selectLoading);
    this.error$ = this.store.select(selectError);
  }

  ngOnInit(): void {
    // Load initial recommendations
    this.loadRecommendations();

    // Set up auto-refresh if enabled
    if (this.autoRefresh) {
      interval(this.refreshInterval)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.refreshRecommendations();
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load recommendations for the current context
   * **Validates: Requirements 8.1**
   */
  private loadRecommendations(): void {
    const context: RecommendationContext = {
      type: this.context,
      entityId: this.entityId
    };
    this.store.dispatch(loadRecommendations({ context }));
  }

  /**
   * Refresh recommendations manually
   * **Validates: Requirements 8.1**
   */
  refreshRecommendations(): void {
    const context: RecommendationContext = {
      type: this.context,
      entityId: this.entityId
    };
    this.store.dispatch(refreshRecommendations({ context }));
  }

  /**
   * Toggle recommendation expansion
   */
  toggleRecommendation(recommendationId: string): void {
    if (this.expandedRecommendations.has(recommendationId)) {
      this.expandedRecommendations.delete(recommendationId);
    } else {
      this.expandedRecommendations.add(recommendationId);
    }
  }

  /**
   * Check if recommendation is expanded
   */
  isExpanded(recommendationId: string): boolean {
    return this.expandedRecommendations.has(recommendationId);
  }

  /**
   * Accept a recommendation
   * **Validates: Requirements 8.5, 8.6**
   */
  acceptRecommendation(recommendation: Recommendation): void {
    this.store.dispatch(acceptRecommendation({ 
      id: recommendation.id,
      metadata: { acceptedAt: new Date() }
    }));
    this.recommendationAccepted.emit(recommendation);
  }

  /**
   * Show reject dialog for a recommendation
   */
  showRejectDialogFor(recommendation: Recommendation): void {
    this.rejectingRecommendationId = recommendation.id;
    this.selectedRecommendation = recommendation;
    this.showRejectDialog = true;
    this.rejectReason = '';
  }

  /**
   * Cancel reject dialog
   */
  cancelReject(): void {
    this.showRejectDialog = false;
    this.rejectingRecommendationId = null;
    this.selectedRecommendation = null;
    this.rejectReason = '';
  }

  /**
   * Confirm rejection with reason
   * **Validates: Requirements 8.5, 8.6**
   */
  confirmReject(): void {
    if (this.rejectingRecommendationId && this.rejectReason.trim()) {
      this.store.dispatch(rejectRecommendation({ 
        id: this.rejectingRecommendationId,
        reason: this.rejectReason
      }));
      
      if (this.selectedRecommendation) {
        this.recommendationRejected.emit({
          recommendation: this.selectedRecommendation,
          reason: this.rejectReason
        });
      }
      
      this.cancelReject();
    }
  }

  /**
   * Provide feedback on a recommendation
   * **Validates: Requirements 8.5, 8.6**
   */
  provideFeedback(recommendation: Recommendation, rating: 1 | 2 | 3 | 4 | 5, helpful: boolean): void {
    const feedback: Feedback = {
      recommendationId: recommendation.id,
      rating,
      helpful,
      timestamp: new Date()
    };
    this.store.dispatch(provideFeedback({ id: recommendation.id, feedback }));
  }

  /**
   * Get priority badge class
   */
  getPriorityClass(priority: string): string {
    return `priority-${priority}`;
  }

  /**
   * Get confidence level text
   * **Validates: Requirements 8.2**
   */
  getConfidenceLevel(confidence: number): string {
    if (confidence >= 0.9) return 'Very High';
    if (confidence >= 0.75) return 'High';
    if (confidence >= 0.5) return 'Medium';
    if (confidence >= 0.25) return 'Low';
    return 'Very Low';
  }

  /**
   * Get confidence bar width percentage
   * **Validates: Requirements 8.2**
   */
  getConfidenceWidth(confidence: number): number {
    return confidence * 100;
  }

  /**
   * Get confidence bar class
   */
  getConfidenceClass(confidence: number): string {
    if (confidence >= 0.75) return 'confidence-high';
    if (confidence >= 0.5) return 'confidence-medium';
    return 'confidence-low';
  }

  /**
   * Check if recommendation is accepting
   */
  isAccepting(recommendationId: string): Observable<boolean> {
    return this.store.select(selectIsAccepting(recommendationId));
  }

  /**
   * Check if recommendation is rejecting
   */
  isRejecting(recommendationId: string): Observable<boolean> {
    return this.store.select(selectIsRejecting(recommendationId));
  }

  /**
   * Format timestamp for display
   */
  formatTimestamp(date: Date): string {
    return new Date(date).toLocaleString();
  }

  /**
   * Check if recommendation is expired
   */
  isExpired(recommendation: Recommendation): boolean {
    if (!recommendation.expiresAt) return false;
    return new Date(recommendation.expiresAt) < new Date();
  }

  /**
   * Get status badge class
   */
  getStatusClass(status: string): string {
    return `status-${status}`;
  }
}
