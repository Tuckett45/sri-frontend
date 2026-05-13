/**
 * AI Analysis Component
 * 
 * Displays AI analysis results with readiness assessment, findings grouped by severity,
 * and recommendations grouped by priority.
 * 
 * Requirements: 7.1, 7.2
 */

import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// PrimeNG imports
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { AccordionModule } from 'primeng/accordion';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';

// Models
import {
  AnalysisResult,
  ReadinessStatus,
  AnalysisFinding,
  Recommendation,
  FindingSeverity
} from '../../models/ai-analysis.model';

// State
import * as AIAnalysisActions from '../../state/ai-analysis/ai-analysis.actions';
import * as AIAnalysisSelectors from '../../state/ai-analysis/ai-analysis.selectors';

@Component({
  selector: 'app-ai-analysis',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    CardModule,
    TagModule,
    ProgressSpinnerModule,
    MessageModule,
    AccordionModule,
    DividerModule,
    TooltipModule
  ],
  templateUrl: './ai-analysis.component.html',
  styleUrls: ['./ai-analysis.component.scss']
})
export class AIAnalysisComponent implements OnInit, OnDestroy {
  @Input() deploymentId!: string;

  analysisResult$!: Observable<AnalysisResult | null>;
  loading$!: Observable<boolean>;
  error$!: Observable<string | null>;

  analysisResult: AnalysisResult | null = null;
  loading = false;
  error: string | null = null;

  // Grouped findings
  criticalFindings: AnalysisFinding[] = [];
  highFindings: AnalysisFinding[] = [];
  mediumFindings: AnalysisFinding[] = [];
  lowFindings: AnalysisFinding[] = [];
  infoFindings: AnalysisFinding[] = [];

  // Grouped recommendations
  highPriorityRecommendations: Recommendation[] = [];
  mediumPriorityRecommendations: Recommendation[] = [];
  lowPriorityRecommendations: Recommendation[] = [];

  private destroy$ = new Subject<void>();

  constructor(private store: Store) {}

  ngOnInit(): void {
    if (!this.deploymentId) {
      console.error('AIAnalysisComponent: deploymentId is required');
      return;
    }

    // Select observables from store
    this.analysisResult$ = this.store.select(
      AIAnalysisSelectors.selectAnalysisResultByDeploymentId(this.deploymentId)
    );
    this.loading$ = this.store.select(AIAnalysisSelectors.selectAnalyzing);
    this.error$ = this.store.select(AIAnalysisSelectors.selectAnalyzingError);

    // Subscribe to state changes
    this.analysisResult$
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        this.analysisResult = result;
        if (result) {
          this.groupFindings(result.findings || []);
          this.groupRecommendations(result.recommendations || []);
        }
      });

    this.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => this.loading = loading);

    this.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => this.error = error);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Trigger AI analysis
   */
  onRunAnalysis(): void {
    this.store.dispatch(AIAnalysisActions.analyzeDeployment({
      deploymentId: this.deploymentId
    }));
  }

  /**
   * Retry analysis after error
   */
  onRetry(): void {
    this.onRunAnalysis();
  }

  /**
   * Group findings by severity
   */
  private groupFindings(findings: AnalysisFinding[]): void {
    this.criticalFindings = findings.filter(f => f.severity === FindingSeverity.Critical);
    this.highFindings = findings.filter(f => f.severity === FindingSeverity.High);
    this.mediumFindings = findings.filter(f => f.severity === FindingSeverity.Medium);
    this.lowFindings = findings.filter(f => f.severity === FindingSeverity.Low);
    this.infoFindings = findings.filter(f => f.severity === FindingSeverity.Info);
  }

  /**
   * Group recommendations by priority
   */
  private groupRecommendations(recommendations: Recommendation[]): void {
    this.highPriorityRecommendations = recommendations.filter(r => 
      r.priority?.toLowerCase() === 'high' || r.priority?.toLowerCase() === 'critical'
    );
    this.mediumPriorityRecommendations = recommendations.filter(r => 
      r.priority?.toLowerCase() === 'medium'
    );
    this.lowPriorityRecommendations = recommendations.filter(r => 
      r.priority?.toLowerCase() === 'low'
    );
  }

  /**
   * Get readiness status severity for tag
   */
  getReadinessSeverity(status: ReadinessStatus): 'success' | 'info' | 'warn' | 'danger' {
    switch (status) {
      case ReadinessStatus.Ready:
        return 'success';
      case ReadinessStatus.PartiallyReady:
      case ReadinessStatus.ReadyWithConcerns:
        return 'warn';
      case ReadinessStatus.NotReady:
        return 'danger';
      default:
        return 'info';
    }
  }

  /**
   * Get finding severity for tag
   */
  getFindingSeverity(severity: FindingSeverity): 'success' | 'info' | 'warn' | 'danger' {
    switch (severity) {
      case FindingSeverity.Critical:
        return 'danger';
      case FindingSeverity.High:
        return 'danger';
      case FindingSeverity.Medium:
        return 'warn';
      case FindingSeverity.Low:
        return 'info';
      case FindingSeverity.Info:
        return 'info';
      default:
        return 'info';
    }
  }

  /**
   * Get recommendation priority severity for tag
   */
  getRecommendationSeverity(priority: string): 'success' | 'info' | 'warn' | 'danger' {
    const p = priority?.toLowerCase();
    if (p === 'high' || p === 'critical') {
      return 'danger';
    } else if (p === 'medium') {
      return 'warn';
    } else {
      return 'info';
    }
  }

  /**
   * Format readiness status label
   */
  formatReadinessStatus(status: ReadinessStatus): string {
    return status.replace(/([A-Z])/g, ' $1').trim();
  }

  /**
   * Format finding category label
   */
  formatCategory(category: string): string {
    return category.replace(/([A-Z])/g, ' $1').trim();
  }

  /**
   * Format confidence as percentage
   */
  formatConfidence(confidence: number): string {
    return `${Math.round(confidence * 100)}%`;
  }

  /**
   * Format duration
   */
  formatDuration(duration: string): string {
    return duration || 'N/A';
  }

  /**
   * Format date
   */
  formatDate(date: Date | string): string {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString();
  }
}
