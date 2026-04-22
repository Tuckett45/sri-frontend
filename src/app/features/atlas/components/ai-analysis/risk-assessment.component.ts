/**
 * Risk Assessment Component
 * 
 * Displays overall risk level and score, identified risks with severity indicators,
 * and mitigation recommendations.
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
import { ProgressBarModule } from 'primeng/progressbar';

// Models
import {
  RiskAssessment,
  RiskLevel,
  IdentifiedRisk,
  RiskMitigation,
  RiskSeverity
} from '../../models/ai-analysis.model';

// State
import * as AIAnalysisActions from '../../state/ai-analysis/ai-analysis.actions';
import * as AIAnalysisSelectors from '../../state/ai-analysis/ai-analysis.selectors';

@Component({
  selector: 'app-risk-assessment',
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
    TooltipModule,
    ProgressBarModule
  ],
  templateUrl: './risk-assessment.component.html',
  styleUrls: ['./risk-assessment.component.scss']
})
export class RiskAssessmentComponent implements OnInit, OnDestroy {
  @Input() deploymentId!: string;

  riskAssessment$!: Observable<RiskAssessment | null>;
  loading$!: Observable<boolean>;
  error$!: Observable<string | null>;

  riskAssessment: RiskAssessment | null = null;
  loading = false;
  error: string | null = null;

  // Grouped risks
  criticalRisks: IdentifiedRisk[] = [];
  severeRisks: IdentifiedRisk[] = [];
  majorRisks: IdentifiedRisk[] = [];
  moderateRisks: IdentifiedRisk[] = [];
  minorRisks: IdentifiedRisk[] = [];
  negligibleRisks: IdentifiedRisk[] = [];

  // Grouped mitigations
  highPriorityMitigations: RiskMitigation[] = [];
  mediumPriorityMitigations: RiskMitigation[] = [];
  lowPriorityMitigations: RiskMitigation[] = [];

  private destroy$ = new Subject<void>();

  constructor(private store: Store) {}

  ngOnInit(): void {
    if (!this.deploymentId) {
      console.error('RiskAssessmentComponent: deploymentId is required');
      return;
    }

    // Select observables from store
    this.riskAssessment$ = this.store.select(
      AIAnalysisSelectors.selectRiskAssessmentByDeploymentId(this.deploymentId)
    );
    this.loading$ = this.store.select(AIAnalysisSelectors.selectAssessingRisk);
    this.error$ = this.store.select(AIAnalysisSelectors.selectAssessingRiskError);

    // Subscribe to state changes
    this.riskAssessment$
      .pipe(takeUntil(this.destroy$))
      .subscribe(assessment => {
        this.riskAssessment = assessment;
        if (assessment) {
          this.groupRisks(assessment.identifiedRisks || []);
          this.groupMitigations(assessment.mitigationRecommendations || []);
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
   * Trigger risk assessment
   */
  onAssessRisk(): void {
    this.store.dispatch(AIAnalysisActions.assessRisk({
      deploymentId: this.deploymentId
    }));
  }

  /**
   * Retry assessment after error
   */
  onRetry(): void {
    this.onAssessRisk();
  }

  /**
   * Group risks by severity
   */
  private groupRisks(risks: IdentifiedRisk[]): void {
    this.criticalRisks = risks.filter(r => r.severity === RiskSeverity.Critical);
    this.severeRisks = risks.filter(r => r.severity === RiskSeverity.Severe);
    this.majorRisks = risks.filter(r => r.severity === RiskSeverity.Major);
    this.moderateRisks = risks.filter(r => r.severity === RiskSeverity.Moderate);
    this.minorRisks = risks.filter(r => r.severity === RiskSeverity.Minor);
    this.negligibleRisks = risks.filter(r => r.severity === RiskSeverity.Negligible);
  }

  /**
   * Group mitigations by priority
   */
  private groupMitigations(mitigations: RiskMitigation[]): void {
    this.highPriorityMitigations = mitigations.filter(m => 
      m.priority?.toLowerCase() === 'high' || m.priority?.toLowerCase() === 'critical'
    );
    this.mediumPriorityMitigations = mitigations.filter(m => 
      m.priority?.toLowerCase() === 'medium'
    );
    this.lowPriorityMitigations = mitigations.filter(m => 
      m.priority?.toLowerCase() === 'low'
    );
  }

  /**
   * Get risk level severity for tag
   */
  getRiskLevelSeverity(level: RiskLevel): 'success' | 'info' | 'warn' | 'danger' {
    switch (level) {
      case RiskLevel.VeryLow:
      case RiskLevel.Low:
        return 'success';
      case RiskLevel.Medium:
        return 'warn';
      case RiskLevel.High:
      case RiskLevel.VeryHigh:
      case RiskLevel.Critical:
        return 'danger';
      default:
        return 'info';
    }
  }

  /**
   * Get risk severity for tag
   */
  getRiskSeverity(severity: RiskSeverity): 'success' | 'info' | 'warn' | 'danger' {
    switch (severity) {
      case RiskSeverity.Critical:
      case RiskSeverity.Severe:
        return 'danger';
      case RiskSeverity.Major:
      case RiskSeverity.Moderate:
        return 'warn';
      case RiskSeverity.Minor:
        return 'info';
      case RiskSeverity.Negligible:
        return 'success';
      default:
        return 'info';
    }
  }

  /**
   * Get mitigation priority severity for tag
   */
  getMitigationSeverity(priority: string): 'success' | 'info' | 'warn' | 'danger' {
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
   * Format risk level label
   */
  formatRiskLevel(level: RiskLevel): string {
    return level.replace(/([A-Z])/g, ' $1').trim();
  }

  /**
   * Format category label
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
   * Format probability as percentage
   */
  formatProbability(probability: number): string {
    return `${Math.round(probability * 100)}%`;
  }

  /**
   * Format effectiveness as percentage
   */
  formatEffectiveness(effectiveness: number): string {
    return `${Math.round(effectiveness * 100)}%`;
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

  /**
   * Get risk score color class
   */
  getRiskScoreColor(score: number): string {
    if (score >= 80) return 'risk-score-critical';
    if (score >= 60) return 'risk-score-high';
    if (score >= 40) return 'risk-score-medium';
    if (score >= 20) return 'risk-score-low';
    return 'risk-score-very-low';
  }
}
