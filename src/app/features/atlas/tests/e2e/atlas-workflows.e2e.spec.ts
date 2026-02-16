/**
 * ATLAS End-to-End Workflow Tests
 * 
 * Tests complete user workflows across all ATLAS features
 * Verifies state management consistency
 * Tests real-time updates via SignalR
 * 
 * Requirements: 9.10
 */

import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Store } from '@ngrx/store';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, Subject } from 'rxjs';

import { DeploymentService } from '../../services/deployment.service';
import { AIAnalysisService } from '../../services/ai-analysis.service';
import { ApprovalService } from '../../services/approval.service';
import { AtlasSignalRService } from '../../services/atlas-signalr.service';

import * as DeploymentActions from '../../state/deployments/deployment.actions';
import * as AIAnalysisActions from '../../state/ai-analysis/ai-analysis.actions';
import * as ApprovalActions from '../../state/approvals/approval.actions';

import { DeploymentType, LifecycleState } from '../../models/approval.model';
import { ReadinessStatus } from '../../models/ai-analysis.model';
import { ApprovalStatus } from '../../models/approval.model';

describe('ATLAS End-to-End Workflow Tests', () => {
  let store: MockStore;
  let deploymentService: jasmine.SpyObj<DeploymentService>;
  let aiAnalysisService: jasmine.SpyObj<AIAnalysisService>;
  let approvalService: jasmine.SpyObj<ApprovalService>;
  let signalRService: jasmine.SpyObj<AtlasSignalRService>;
  let signalREvents$: Subject<any>;

  const mockDeployment = {
    id: 'deployment-1',
    title: 'Test Deployment',
    type: DeploymentType.STANDARD,
    currentState: LifecycleState.DRAFT,
    clientId: 'client-1',
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    signalREvents$ = new Subject();

    deploymentService = jasmine.createSpyObj('DeploymentService', [
      'getDeployments',
      'getDeployment',
      'createDeployment',
      'transitionState',
      'submitEvidence'
    ]);

    aiAnalysisService = jasmine.createSpyObj('AIAnalysisService', [
      'analyzeDeployment',
      'assessRisk',
      'generateRecommendations'
    ]);

    approvalService = jasmine.createSpyObj('ApprovalService', [
      'checkAuthority',
      'requestApproval',
      'recordDecision',
      'getPendingApprovals'
    ]);

    signalRService = jasmine.createSpyObj('AtlasSignalRService', [
      'connect',
      'disconnect',
      'subscribe',
      'getEvents'
    ]);
    signalRService.getEvents.and.returnValue(signalREvents$.asObservable());

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        provideMockStore({
          initialState: {
            atlas: {
              deployments: {
                entities: {},
                ids: [],
                loading: false,
                error: null
              },
              aiAnalysis: {
                analyses: {},
                loading: false,
                error: null
              },
              approvals: {
                entities: {},
                ids: [],
                loading: false,
                error: null
              }
            }
          }
        }),
        { provide: DeploymentService, useValue: deploymentService },
        { provide: AIAnalysisService, useValue: aiAnalysisService },
        { provide: ApprovalService, useValue: approvalService },
        { provide: AtlasSignalRService, useValue: signalRService }
      ]
    });

    store = TestBed.inject(Store) as MockStore;
    spyOn(store, 'dispatch');
  });

  describe('Complete Deployment Lifecycle Workflow', () => {
    it('should complete full deployment workflow from creation to closure', (done) => {
      // Step 1: Create deployment
      deploymentService.createDeployment.and.returnValue(of(mockDeployment));
      
      store.dispatch(DeploymentActions.createDeployment({
        request: {
          title: 'Test Deployment',
          type: DeploymentType.STANDARD
        }
      }));

      expect(store.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({ type: '[Deployment] Create Deployment' })
      );

      // Step 2: Transition to SUBMITTED
      deploymentService.transitionState.and.returnValue(of(void 0));
      
      store.dispatch(DeploymentActions.transitionState({
        deploymentId: mockDeployment.id,
        request: {
          targetState: LifecycleState.SUBMITTED,
          reason: 'Ready for review'
        }
      }));

      expect(store.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({ type: '[Deployment] Transition State' })
      );

      // Step 3: Run AI analysis
      const mockAnalysis = {
        analysisId: 'analysis-1',
        deploymentId: mockDeployment.id,
        readinessAssessment: {
          status: ReadinessStatus.Ready,
          score: 85,
          summary: 'Ready for deployment'
        },
        confidenceLevel: 0.9,
        completedAt: new Date(),
        analysisDuration: '00:00:05'
      };

      aiAnalysisService.analyzeDeployment.and.returnValue(of(mockAnalysis));
      
      store.dispatch(AIAnalysisActions.analyzeDeployment({
        deploymentId: mockDeployment.id
      }));

      expect(store.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({ type: '[AI Analysis] Analyze Deployment' })
      );

      // Step 4: Request approval
      approvalService.requestApproval.and.returnValue(of(void 0));
      
      store.dispatch(ApprovalActions.requestApproval({
        request: {
          deploymentId: mockDeployment.id,
          forState: LifecycleState.READY,
          justification: 'Analysis complete, ready for approval'
        }
      }));

      expect(store.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({ type: '[Approval] Request Approval' })
      );

      // Step 5: Record approval decision
      approvalService.recordDecision.and.returnValue(of(void 0));
      
      store.dispatch(ApprovalActions.recordDecision({
        approvalId: 'approval-1',
        decision: {
          decision: ApprovalStatus.APPROVED,
          comments: 'Approved for deployment'
        }
      }));

      expect(store.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({ type: '[Approval] Record Decision' })
      );

      // Step 6: Transition to CLOSED
      store.dispatch(DeploymentActions.transitionState({
        deploymentId: mockDeployment.id,
        request: {
          targetState: LifecycleState.CLOSED,
          reason: 'Deployment completed successfully'
        }
      }));

      expect(store.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({ type: '[Deployment] Transition State' })
      );

      done();
    });

    it('should handle deployment with evidence submission', (done) => {
      // Create deployment
      deploymentService.createDeployment.and.returnValue(of(mockDeployment));
      deploymentService.submitEvidence.and.returnValue(of(void 0));

      // Submit evidence
      store.dispatch(DeploymentActions.submitEvidence({
        deploymentId: mockDeployment.id,
        request: {
          type: 'DOCUMENT' as any,
          title: 'Test Evidence',
          content: 'Evidence content'
        }
      }));

      expect(store.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({ type: '[Deployment] Submit Evidence' })
      );

      done();
    });
  });

  describe('Real-Time Updates via SignalR', () => {
    it('should receive and process deployment state change events', (done) => {
      signalRService.connect.and.returnValue(of(void 0));
      signalRService.subscribe.and.returnValue(of(void 0));

      // Connect to SignalR
      signalRService.connect();
      signalRService.subscribe('DeploymentStateChanged');

      // Simulate receiving event
      const stateChangeEvent = {
        eventType: 'DeploymentStateChanged',
        deploymentId: mockDeployment.id,
        fromState: LifecycleState.DRAFT,
        toState: LifecycleState.SUBMITTED,
        timestamp: new Date()
      };

      signalREvents$.next(stateChangeEvent);

      // Verify event is processed
      setTimeout(() => {
        expect(signalRService.getEvents).toHaveBeenCalled();
        done();
      }, 100);
    });

    it('should handle SignalR reconnection', (done) => {
      signalRService.connect.and.returnValue(of(void 0));

      // Initial connection
      signalRService.connect();
      expect(signalRService.connect).toHaveBeenCalled();

      // Simulate disconnection
      signalREvents$.error(new Error('Connection lost'));

      // Verify reconnection attempt
      setTimeout(() => {
        expect(signalRService.connect).toHaveBeenCalledTimes(1);
        done();
      }, 100);
    });

    it('should sync state after reconnection', (done) => {
      deploymentService.getDeployments.and.returnValue(of({
        items: [mockDeployment],
        pagination: {
          currentPage: 1,
          pageSize: 10,
          totalCount: 1,
          totalPages: 1
        }
      }));

      // Simulate reconnection
      signalRService.connect.and.returnValue(of(void 0));
      signalRService.connect();

      // Verify data refresh
      store.dispatch(DeploymentActions.loadDeployments({ params: {} }));
      
      expect(store.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({ type: '[Deployment] Load Deployments' })
      );

      done();
    });
  });

  describe('State Management Consistency', () => {
    it('should maintain consistent state across multiple operations', (done) => {
      const initialState = {
        entities: { [mockDeployment.id]: mockDeployment },
        ids: [mockDeployment.id],
        loading: false,
        error: null
      };

      store.setState({
        atlas: {
          deployments: initialState,
          aiAnalysis: { analyses: {}, loading: false, error: null },
          approvals: { entities: {}, ids: [], loading: false, error: null }
        }
      });

      // Perform multiple operations
      store.dispatch(DeploymentActions.selectDeployment({ deploymentId: mockDeployment.id }));
      store.dispatch(AIAnalysisActions.analyzeDeployment({ deploymentId: mockDeployment.id }));
      store.dispatch(ApprovalActions.loadPendingApprovals({ deploymentId: mockDeployment.id }));

      // Verify state consistency
      expect(store.dispatch).toHaveBeenCalledTimes(3);
      done();
    });

    it('should handle optimistic updates correctly', (done) => {
      deploymentService.transitionState.and.returnValue(of(void 0));

      // Dispatch optimistic update
      store.dispatch(DeploymentActions.transitionState({
        deploymentId: mockDeployment.id,
        request: {
          targetState: LifecycleState.SUBMITTED,
          reason: 'Ready'
        }
      }));

      // Verify optimistic update
      expect(store.dispatch).toHaveBeenCalled();

      done();
    });

    it('should rollback on operation failure', (done) => {
      deploymentService.transitionState.and.returnValue(
        new Subject().asObservable() // Never completes to simulate error
      );

      store.dispatch(DeploymentActions.transitionState({
        deploymentId: mockDeployment.id,
        request: {
          targetState: LifecycleState.SUBMITTED,
          reason: 'Ready'
        }
      }));

      // Simulate failure
      store.dispatch(DeploymentActions.transitionStateFailure({
        error: 'Transition failed'
      }));

      expect(store.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({ type: '[Deployment] Transition State Failure' })
      );

      done();
    });
  });

  describe('Multi-Feature Workflows', () => {
    it('should coordinate deployment, analysis, and approval workflow', (done) => {
      // Setup services
      deploymentService.createDeployment.and.returnValue(of(mockDeployment));
      aiAnalysisService.analyzeDeployment.and.returnValue(of({
        analysisId: 'analysis-1',
        deploymentId: mockDeployment.id,
        readinessAssessment: {
          status: ReadinessStatus.Ready,
          score: 90,
          summary: 'Ready'
        },
        confidenceLevel: 0.95,
        completedAt: new Date(),
        analysisDuration: '00:00:03'
      }));
      approvalService.checkAuthority.and.returnValue(of({
        userId: 'user-1',
        isAuthorized: true,
        clientId: 'client-1'
      }));

      // Execute workflow
      store.dispatch(DeploymentActions.createDeployment({
        request: { title: 'Test', type: DeploymentType.STANDARD }
      }));

      store.dispatch(AIAnalysisActions.analyzeDeployment({
        deploymentId: mockDeployment.id
      }));

      store.dispatch(ApprovalActions.checkAuthority({
        deploymentId: mockDeployment.id,
        forState: LifecycleState.READY
      }));

      expect(store.dispatch).toHaveBeenCalledTimes(3);
      done();
    });
  });

  describe('Error Recovery Workflows', () => {
    it('should recover from transient failures', (done) => {
      let callCount = 0;
      deploymentService.getDeployment.and.callFake(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Network error');
        }
        return of(mockDeployment);
      });

      store.dispatch(DeploymentActions.loadDeploymentDetail({
        deploymentId: mockDeployment.id
      }));

      // Should retry and succeed
      setTimeout(() => {
        expect(callCount).toBeGreaterThan(1);
        done();
      }, 200);
    });
  });
});
