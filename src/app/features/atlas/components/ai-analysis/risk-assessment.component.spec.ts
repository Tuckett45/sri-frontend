/**
 * Risk Assessment Component Unit Tests
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { RiskAssessmentComponent } from './risk-assessment.component';
import * as AIAnalysisActions from '../../state/ai-analysis/ai-analysis.actions';
import * as AIAnalysisSelectors from '../../state/ai-analysis/ai-analysis.selectors';
import {
  RiskAssessment,
  RiskLevel,
  RiskSeverity,
  RiskCategory
} from '../../models/ai-analysis.model';

describe('RiskAssessmentComponent', () => {
  let component: RiskAssessmentComponent;
  let fixture: ComponentFixture<RiskAssessmentComponent>;
  let store: MockStore;

  const mockRiskAssessment: RiskAssessment = {
    deploymentId: 'test-deployment-1',
    overallRiskLevel: RiskLevel.Medium,
    overallRiskScore: 55,
    identifiedRisks: [
      {
        id: 'risk-1',
        title: 'Critical Security Risk',
        description: 'Security vulnerability detected',
        category: RiskCategory.Security,
        severity: RiskSeverity.Critical,
        probability: 0.8,
        confidence: 0.95,
        potentialImpact: 'High impact',
        riskIndicators: ['Indicator 1'],
        historicalOccurrences: ['Occurrence 1']
      },
      {
        id: 'risk-2',
        title: 'Minor Performance Risk',
        description: 'Performance degradation possible',
        category: RiskCategory.Performance,
        severity: RiskSeverity.Minor,
        probability: 0.3,
        confidence: 0.7
      }
    ],
    mitigationRecommendations: [
      {
        id: 'mit-1',
        riskId: 'risk-1',
        title: 'Fix Security Issue',
        description: 'Address the security vulnerability',
        type: 'Corrective',
        priority: 'High',
        expectedEffectiveness: 0.95,
        estimatedEffort: '2 hours',
        implementationSteps: ['Step 1', 'Step 2']
      }
    ],
    confidenceLevel: 0.9,
    completedAt: new Date('2024-01-15T10:00:00Z'),
    assessmentDuration: '00:03:00',
    explanatoryReasoning: 'Risk assessment completed successfully'
  };

  const initialState = {
    aiAnalysis: {
      analysisResults: {},
      riskAssessments: {},
      recommendationSets: {},
      availableAgents: [],
      selectedDeploymentId: null,
      loading: {
        analyzing: false,
        assessingRisk: false,
        generatingRecommendations: false,
        loadingAgents: false,
        validatingOperation: false
      },
      error: {
        analyzing: null,
        assessingRisk: null,
        generatingRecommendations: null,
        loadingAgents: null,
        validatingOperation: null
      },
      lastAnalyzed: {},
      lastRiskAssessed: {},
      lastRecommendationsGenerated: {}
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskAssessmentComponent],
      providers: [
        provideMockStore({ initialState })
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(RiskAssessmentComponent);
    component = fixture.componentInstance;
    component.deploymentId = 'test-deployment-1';
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with deployment ID', () => {
    fixture.detectChanges();
    expect(component.deploymentId).toBe('test-deployment-1');
  });

  it('should dispatch assessRisk action when Assess Risk is clicked', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.onAssessRisk();
    expect(dispatchSpy).toHaveBeenCalledWith(
      AIAnalysisActions.assessRisk({ deploymentId: 'test-deployment-1' })
    );
  });

  it('should group risks by severity', () => {
    component.riskAssessment = mockRiskAssessment;
    component['groupRisks'](mockRiskAssessment.identifiedRisks || []);
    
    expect(component.criticalRisks.length).toBe(1);
    expect(component.criticalRisks[0].severity).toBe(RiskSeverity.Critical);
    expect(component.minorRisks.length).toBe(1);
    expect(component.minorRisks[0].severity).toBe(RiskSeverity.Minor);
  });

  it('should group mitigations by priority', () => {
    component.riskAssessment = mockRiskAssessment;
    component['groupMitigations'](mockRiskAssessment.mitigationRecommendations || []);
    
    expect(component.highPriorityMitigations.length).toBe(1);
    expect(component.highPriorityMitigations[0].priority).toBe('High');
  });

  it('should return correct severity for risk level', () => {
    expect(component.getRiskLevelSeverity(RiskLevel.VeryLow)).toBe('success');
    expect(component.getRiskLevelSeverity(RiskLevel.Low)).toBe('success');
    expect(component.getRiskLevelSeverity(RiskLevel.Medium)).toBe('warn');
    expect(component.getRiskLevelSeverity(RiskLevel.High)).toBe('danger');
    expect(component.getRiskLevelSeverity(RiskLevel.Critical)).toBe('danger');
  });

  it('should return correct severity for risk severity', () => {
    expect(component.getRiskSeverity(RiskSeverity.Critical)).toBe('danger');
    expect(component.getRiskSeverity(RiskSeverity.Severe)).toBe('danger');
    expect(component.getRiskSeverity(RiskSeverity.Major)).toBe('warn');
    expect(component.getRiskSeverity(RiskSeverity.Moderate)).toBe('warn');
    expect(component.getRiskSeverity(RiskSeverity.Minor)).toBe('info');
    expect(component.getRiskSeverity(RiskSeverity.Negligible)).toBe('success');
  });

  it('should format probability as percentage', () => {
    expect(component.formatProbability(0.8)).toBe('80%');
    expect(component.formatProbability(0.5)).toBe('50%');
  });

  it('should format effectiveness as percentage', () => {
    expect(component.formatEffectiveness(0.95)).toBe('95%');
    expect(component.formatEffectiveness(0.5)).toBe('50%');
  });

  it('should return correct risk score color class', () => {
    expect(component.getRiskScoreColor(85)).toBe('risk-score-critical');
    expect(component.getRiskScoreColor(65)).toBe('risk-score-high');
    expect(component.getRiskScoreColor(45)).toBe('risk-score-medium');
    expect(component.getRiskScoreColor(25)).toBe('risk-score-low');
    expect(component.getRiskScoreColor(15)).toBe('risk-score-very-low');
  });

  it('should handle retry on error', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.onRetry();
    expect(dispatchSpy).toHaveBeenCalledWith(
      AIAnalysisActions.assessRisk({ deploymentId: 'test-deployment-1' })
    );
  });

  it('should clean up on destroy', () => {
    const destroySpy = spyOn(component['destroy$'], 'next');
    const completeSpy = spyOn(component['destroy$'], 'complete');
    
    component.ngOnDestroy();
    
    expect(destroySpy).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalled();
  });
});
