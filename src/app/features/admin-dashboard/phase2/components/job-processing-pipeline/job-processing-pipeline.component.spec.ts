import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of, throwError } from 'rxjs';

import { JobProcessingPipelineComponent } from './job-processing-pipeline.component';
import { PipelineExecutionService } from '../../services/pipeline-execution.service';
import { PipelineStage, StageResult, JobResult } from '../../models/workflow.models';

describe('JobProcessingPipelineComponent', () => {
  let component: JobProcessingPipelineComponent;
  let fixture: ComponentFixture<JobProcessingPipelineComponent>;
  let mockStore: MockStore;
  let mockPipelineService: jasmine.SpyObj<PipelineExecutionService>;

  const mockStages: PipelineStage[] = [
    {
      id: 'creation',
      name: 'Job Creation',
      status: 'pending',
      order: 0,
      dependencies: [],
      retryable: false,
      maxRetries: 0,
      currentRetry: 0
    },
    {
      id: 'validation',
      name: 'Validation',
      status: 'pending',
      order: 1,
      dependencies: ['creation'],
      retryable: true,
      maxRetries: 3,
      currentRetry: 0
    }
  ];

  beforeEach(async () => {
    const pipelineServiceSpy = jasmine.createSpyObj('PipelineExecutionService', [
      'executeStage',
      'checkDependencies',
      'retryStage',
      'skipStage',
      'aggregateResults',
      'getNextStage',
      'validateStageExecution'
    ]);

    await TestBed.configureTestingModule({
      declarations: [JobProcessingPipelineComponent],
      providers: [
        provideMockStore({}),
        { provide: PipelineExecutionService, useValue: pipelineServiceSpy }
      ]
    }).compileComponents();

    mockStore = TestBed.inject(MockStore);
    mockPipelineService = TestBed.inject(PipelineExecutionService) as jasmine.SpyObj<PipelineExecutionService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(JobProcessingPipelineComponent);
    component = fixture.componentInstance;
    component.jobId = 'test-job-123';
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Pipeline Initialization', () => {
    it('should initialize with default stages', () => {
      expect(component.stages.length).toBe(6);
      expect(component.stages[0].id).toBe('creation');
      expect(component.stages[5].id).toBe('completion');
    });

    it('should start pipeline on init when jobId is provided', () => {
      spyOn<any>(component, 'executeNextStage');
      component.ngOnInit();
      expect(component['executeNextStage']).toHaveBeenCalled();
    });
  });

  describe('Stage Execution', () => {
    it('should execute stage successfully', (done) => {
      const mockResult: StageResult = {
        stageId: 'creation',
        status: 'success',
        output: { message: 'Success' },
        duration: 1000,
        timestamp: new Date()
      };

      mockPipelineService.executeStage.and.returnValue(of(mockResult));

      component.executeStage('creation').subscribe(result => {
        expect(result).toEqual(mockResult);
        expect(mockPipelineService.executeStage).toHaveBeenCalledWith('test-job-123', 'creation');
        done();
      });
    });

    it('should handle stage execution error', (done) => {
      const error = new Error('Stage failed');
      mockPipelineService.executeStage.and.returnValue(throwError(() => error));

      component.executeStage('creation').subscribe({
        error: (err) => {
          expect(err).toEqual(error);
          done();
        }
      });
    });

    it('should update stage status to running when executing', () => {
      const mockResult: StageResult = {
        stageId: 'creation',
        status: 'success',
        output: {},
        duration: 1000,
        timestamp: new Date()
      };

      mockPipelineService.executeStage.and.returnValue(of(mockResult));

      component.executeStage('creation');
      expect(component.stages[0].status).toBe('running');
      expect(component.loading).toBe(true);
    });
  });

  describe('Stage Dependencies', () => {
    it('should check dependencies using service', () => {
      const stage = component.stages[1]; // validation stage with dependencies
      mockPipelineService.checkDependencies.and.returnValue(true);

      const result = component['areDependenciesMet'](stage);

      expect(result).toBe(true);
      expect(mockPipelineService.checkDependencies).toHaveBeenCalledWith(stage, component.stages);
    });

    it('should return false when dependencies are not met', () => {
      const stage = component.stages[1];
      mockPipelineService.checkDependencies.and.returnValue(false);

      const result = component['areDependenciesMet'](stage);

      expect(result).toBe(false);
    });
  });

  describe('Stage Retry', () => {
    it('should retry failed stage', () => {
      const stage = component.stages[1];
      stage.status = 'failed';
      stage.currentRetry = 0;

      const mockResult: StageResult = {
        stageId: 'validation',
        status: 'success',
        output: {},
        duration: 1000,
        timestamp: new Date()
      };

      mockPipelineService.retryStage.and.returnValue(of(mockResult));

      component.retryStage('validation');

      expect(stage.currentRetry).toBe(1);
      expect(stage.status).toBe('pending');
      expect(mockPipelineService.retryStage).toHaveBeenCalledWith('test-job-123', stage);
    });

    it('should handle retry error', () => {
      const stage = component.stages[1];
      stage.status = 'failed';

      const error = new Error('Retry failed');
      mockPipelineService.retryStage.and.returnValue(throwError(() => error));

      component.retryStage('validation');

      expect(mockPipelineService.retryStage).toHaveBeenCalled();
    });
  });

  describe('Stage Skip', () => {
    it('should skip stage with reason', () => {
      const mockResult: StageResult = {
        stageId: 'validation',
        status: 'skipped',
        output: { skipReason: 'Not needed' },
        duration: 0,
        timestamp: new Date()
      };

      mockPipelineService.skipStage.and.returnValue(of(mockResult));
      mockPipelineService.getNextStage.and.returnValue(null);

      component.stageToSkip = 'validation';
      component.skipReason = 'Not needed';
      component.skipStage();

      expect(mockPipelineService.skipStage).toHaveBeenCalledWith('validation', 'Not needed');
      expect(component.showSkipDialog).toBe(false);
      expect(component.stageToSkip).toBeNull();
    });

    it('should not skip stage without reason', () => {
      component.stageToSkip = 'validation';
      component.skipReason = '';
      component.skipStage();

      expect(mockPipelineService.skipStage).not.toHaveBeenCalled();
    });

    it('should show skip dialog', () => {
      component.showSkipStageDialog('validation');

      expect(component.stageToSkip).toBe('validation');
      expect(component.showSkipDialog).toBe(true);
      expect(component.skipReason).toBe('');
    });

    it('should cancel skip dialog', () => {
      component.stageToSkip = 'validation';
      component.skipReason = 'test';
      component.showSkipDialog = true;

      component.cancelSkip();

      expect(component.showSkipDialog).toBe(false);
      expect(component.stageToSkip).toBeNull();
      expect(component.skipReason).toBe('');
    });
  });

  describe('Pipeline Completion', () => {
    it('should aggregate results and emit completion event', () => {
      const mockJobResult: JobResult = {
        jobId: 'test-job-123',
        status: 'success',
        results: new Map(),
        errors: [],
        completedAt: new Date()
      };

      mockPipelineService.aggregateResults.and.returnValue(mockJobResult);

      spyOn(component.pipelineComplete, 'emit');

      component['completePipeline']();

      expect(mockPipelineService.aggregateResults).toHaveBeenCalledWith(
        'test-job-123',
        component.stages,
        component.stageResults
      );
      expect(component.pipelineComplete.emit).toHaveBeenCalledWith(mockJobResult);
    });
  });

  describe('Helper Methods', () => {
    it('should get stage by id', () => {
      const stage = component.getStage('creation');
      expect(stage).toBeDefined();
      expect(stage?.id).toBe('creation');
    });

    it('should return undefined for non-existent stage', () => {
      const stage = component.getStage('non-existent');
      expect(stage).toBeUndefined();
    });

    it('should get stage result', () => {
      const mockResult: StageResult = {
        stageId: 'creation',
        status: 'success',
        output: {},
        duration: 1000,
        timestamp: new Date()
      };

      component.stageResults.set('creation', mockResult);

      const result = component.getStageResult('creation');
      expect(result).toEqual(mockResult);
    });

    it('should check if stage can be retried', () => {
      const stage = component.stages[1];
      stage.status = 'failed';
      stage.retryable = true;
      stage.currentRetry = 0;
      stage.maxRetries = 3;

      expect(component.canRetryStage('validation')).toBe(true);
    });

    it('should return false if stage cannot be retried', () => {
      const stage = component.stages[0];
      stage.status = 'failed';
      stage.retryable = false;

      expect(component.canRetryStage('creation')).toBe(false);
    });

    it('should check if stage can be skipped', () => {
      const stage = component.stages[1];
      stage.status = 'failed';

      expect(component.canSkipStage('validation')).toBe(true);
    });

    it('should calculate pipeline progress', () => {
      component.stages[0].status = 'completed';
      component.stages[1].status = 'completed';

      const progress = component.getPipelineProgress();
      expect(progress).toBe((2 / 6) * 100);
    });
  });

  describe('Error Handling', () => {
    it('should set error message on stage failure', () => {
      const stage = component.stages[0];
      const error = new Error('Test error');

      component.handleStageError('creation', error);

      expect(stage.status).toBe('failed');
      expect(component.error).toBe('Test error');
      expect(component.loading).toBe(false);
    });

    it('should clear error on successful stage execution', () => {
      component.error = 'Previous error';

      const mockResult: StageResult = {
        stageId: 'creation',
        status: 'success',
        output: {},
        duration: 1000,
        timestamp: new Date()
      };

      mockPipelineService.getNextStage.and.returnValue(null);

      component['handleStageSuccess']('creation', mockResult);

      expect(component.error).toBeNull();
      expect(component.loading).toBe(false);
    });
  });
});
