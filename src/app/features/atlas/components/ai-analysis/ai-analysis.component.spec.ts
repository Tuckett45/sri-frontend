/**
 * AI Analysis Component Unit Tests
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { AIAnalysisComponent } from './ai-analysis.component';
import * as AIAnalysisActions from '../../state/ai-analysis/ai-analysis.actions';
import * as AIAnalysisSelectors from '../../state/ai-analysis/ai-analysis.selectors';
import {
  AnalysisResult,
  ReadinessStatus,
  FindingSeverity,
  FindingCategory
} from '../../models/ai-analysis.model';

describe('AIAnalysisComponent', () => {
  let component: AIAnalysisComponent;
  let fixture: ComponentFixture<AIAnalysisComponent>;
  let store: MockStore;

  const mockAnalysisResult: AnalysisResult = {
    deploymentId: 'test-deployment-1',
    readinessAssessment: {
      status: ReadinessStatus.Ready,
      score: 85,
      summary: 'Deployment is ready',
      keyFactors: ['All tests passed', 'Documentation complete'],
      criticalBlockers: [],
      improvementAreas: ['Performance optimization']
    },
    findings: [
      {
        id: 'finding-1',
        title: 'Critical Security Issue',
        description: 'Security vulnerability detected',
        category: FindingCategory.Risk,
        severity: FindingSeverity.Critical,
        confidence: 0.95,
        supportingEvidence: ['Evidence 1'],
        potentialImpact: 'High impact'
      },
      {
        id: 'finding-2',
        title: 'Minor Documentation Gap',
        description: 'Some documentation missing',
        category: FindingCategory.Documentation,
        severity: FindingSeverity.Low,
        confidence: 0.75
      }
    ],
    recommendations: [
      {
        id: 'rec-1',
        title: 'Fix Security Issue',
        description: 'Address the security vulnerability',
        category: 'Security',
        priority: 'High',
        type: 'Corrective',
        confidence: 0.95,
        rationale: 'Critical for deployment',
        expectedBenefits: ['Improved security'],
        risksIfIgnored: ['Security breach'],
        estimatedEffort: '2 hours'
      }
    ],
    confidenceLevel: 0.9,
    completedAt: new Date('2024-01-15T10:00:00Z'),
    analysisDuration: '00:02:30',
    explanatoryReasoning: 'Analysis completed successfully'
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
      imports: [AIAnalysisComponent],
      providers: [
        provideMockStore({ initialState })
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(AIAnalysisComponent);
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

  it('should dispatch analyzeDeployment action when Run Analysis is clicked', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.onRunAnalysis();
    expect(dispatchSpy).toHaveBeenCalledWith(
      AIAnalysisActions.analyzeDeployment({ deploymentId: 'test-deployment-1' })
    );
  });

  it('should group findings by severity', () => {
    component.analysisResult = mockAnalysisResult;
    component['groupFindings'](mockAnalysisResult.findings || []);
    
    expect(component.criticalFindings.length).toBe(1);
    expect(component.criticalFindings[0].severity).toBe(FindingSeverity.Critical);
    expect(component.lowFindings.length).toBe(1);
    expect(component.lowFindings[0].severity).toBe(FindingSeverity.Low);
  });

  it('should group recommendations by priority', () => {
    component.analysisResult = mockAnalysisResult;
    component['groupRecommendations'](mockAnalysisResult.recommendations || []);
    
    expect(component.highPriorityRecommendations.length).toBe(1);
    expect(component.highPriorityRecommendations[0].priority).toBe('High');
  });

  it('should return correct severity for readiness status', () => {
    expect(component.getReadinessSeverity(ReadinessStatus.Ready)).toBe('success');
    expect(component.getReadinessSeverity(ReadinessStatus.NotReady)).toBe('danger');
    expect(component.getReadinessSeverity(ReadinessStatus.PartiallyReady)).toBe('warn');
  });

  it('should return correct severity for finding severity', () => {
    expect(component.getFindingSeverity(FindingSeverity.Critical)).toBe('danger');
    expect(component.getFindingSeverity(FindingSeverity.High)).toBe('danger');
    expect(component.getFindingSeverity(FindingSeverity.Medium)).toBe('warn');
    expect(component.getFindingSeverity(FindingSeverity.Low)).toBe('info');
  });

  it('should format confidence as percentage', () => {
    expect(component.formatConfidence(0.95)).toBe('95%');
    expect(component.formatConfidence(0.5)).toBe('50%');
  });

  it('should handle retry on error', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.onRetry();
    expect(dispatchSpy).toHaveBeenCalledWith(
      AIAnalysisActions.analyzeDeployment({ deploymentId: 'test-deployment-1' })
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
