import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { PipelineExecutionService } from './pipeline-execution.service';
import { PipelineStage, StageResult } from '../models/workflow.models';

describe('PipelineExecutionService', () => {
  let service: PipelineExecutionService;
  let httpMock: HttpTestingController;

  const mockStages: PipelineStage[] = [
    {
      id: 'stage1',
      name: 'Stage 1',
      status: 'completed',
      order: 0,
      dependencies: [],
      retryable: true,
      maxRetries: 3,
      currentRetries: 0
    },
    {
      id: 'stage2',
      name: 'Stage 2',
      status: 'pending',
      order: 1,
      dependencies: ['stage1'],
      retryable: true,
      maxRetries: 3,
      currentRetries: 0
    },
    {
      id: 'stage3',
      name: 'Stage 3',
      status: 'pending',
      order: 2,
      dependencies: ['stage2'],
      retryable: false,
      maxRetries: 0,
      currentRetries: 0
    }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PipelineExecutionService]
    });
    service = TestBed.inject(PipelineExecutionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('executeStage', () => {
    it('should execute stage successfully', (done) => {
      const jobId = 'job-123';
      const stageId = 'stage1';
      const mockResponse = { data: { message: 'Success' } };

      service.executeStage(jobId, stageId).subscribe(result => {
        expect(result.stageId).toBe(stageId);
        expect(result.status).toBe('success');
        expect(result.output).toEqual(mockResponse.data);
        expect(result.duration).toBeGreaterThanOrEqual(0);
        done();
      });

      const req = httpMock.expectOne('/api/pipeline/execute');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ jobId, stageId });
      req.flush(mockResponse);
    });

    it('should handle stage execution error', (done) => {
      const jobId = 'job-123';
      const stageId = 'stage1';

      service.executeStage(jobId, stageId).subscribe({
        error: (error) => {
          expect(error.stageId).toBe(stageId);
          expect(error.status).toBe('failure');
          expect(error.error).toBeDefined();
          done();
        }
      });

      const req = httpMock.expectOne('/api/pipeline/execute');
      req.error(new ProgressEvent('error'));
    });
  });

  describe('checkDependencies', () => {
    it('should return true when all dependencies are completed', () => {
      const stage = mockStages[1]; // stage2 depends on stage1
      const result = service.checkDependencies(stage, mockStages);
      expect(result).toBe(true);
    });

    it('should return false when dependencies are not completed', () => {
      const stages = [...mockStages];
      stages[0].status = 'pending'; // stage1 is pending
      const stage = stages[1]; // stage2 depends on stage1

      const result = service.checkDependencies(stage, stages);
      expect(result).toBe(false);
    });

    it('should return true when dependencies are skipped', () => {
      const stages = [...mockStages];
      stages[0].status = 'skipped'; // stage1 is skipped
      const stage = stages[1]; // stage2 depends on stage1

      const result = service.checkDependencies(stage, stages);
      expect(result).toBe(true);
    });

    it('should return true when stage has no dependencies', () => {
      const stage = mockStages[0]; // stage1 has no dependencies
      const result = service.checkDependencies(stage, mockStages);
      expect(result).toBe(true);
    });

    it('should return false when dependency stage does not exist', () => {
      const stage: PipelineStage = {
        id: 'stage-x',
        name: 'Stage X',
        status: 'pending',
        order: 3,
        dependencies: ['non-existent'],
        retryable: true,
        maxRetries: 3,
        currentRetries: 0
      };

      const result = service.checkDependencies(stage, mockStages);
      expect(result).toBe(false);
    });
  });

  describe('retryStage', () => {
    it('should retry a retryable stage', (done) => {
      const jobId = 'job-123';
      const stage = { ...mockStages[1] };
      stage.status = 'failed';
      stage.currentRetries = 1;

      const mockResponse = { data: { message: 'Retry success' } };

      service.retryStage(jobId, stage).subscribe(result => {
        expect(result.status).toBe('success');
        done();
      });

      const req = httpMock.expectOne('/api/pipeline/execute');
      req.flush(mockResponse);
    });

    it('should return error for non-retryable stage', (done) => {
      const jobId = 'job-123';
      const stage = { ...mockStages[2] };
      stage.retryable = false;

      service.retryStage(jobId, stage).subscribe({
        error: (error) => {
          expect(error.message).toContain('not retryable');
          done();
        }
      });
    });

    it('should return error when max retries reached', (done) => {
      const jobId = 'job-123';
      const stage = { ...mockStages[1] };
      stage.currentRetries = 3;
      stage.maxRetries = 3;

      service.retryStage(jobId, stage).subscribe({
        error: (error) => {
          expect(error.message).toContain('maximum retry count');
          done();
        }
      });
    });
  });

  describe('skipStage', () => {
    it('should skip stage with reason', (done) => {
      const stageId = 'stage2';
      const reason = 'Not needed for this job';

      service.skipStage(stageId, reason).subscribe(result => {
        expect(result.stageId).toBe(stageId);
        expect(result.status).toBe('skipped');
        expect(result.output.skipReason).toBe(reason);
        expect(result.duration).toBe(0);
        done();
      });
    });

    it('should return error when reason is empty', (done) => {
      const stageId = 'stage2';
      const reason = '';

      service.skipStage(stageId, reason).subscribe({
        error: (error) => {
          expect(error.message).toContain('Skip reason is required');
          done();
        }
      });
    });

    it('should return error when reason is whitespace only', (done) => {
      const stageId = 'stage2';
      const reason = '   ';

      service.skipStage(stageId, reason).subscribe({
        error: (error) => {
          expect(error.message).toContain('Skip reason is required');
          done();
        }
      });
    });
  });

  describe('aggregateResults', () => {
    it('should aggregate results with success status', () => {
      const jobId = 'job-123';
      const stages = [...mockStages];
      stages[0].status = 'completed';
      stages[1].status = 'completed';
      stages[2].status = 'completed';

      const stageResults = new Map<string, StageResult>();
      stageResults.set('stage1', {
        stageId: 'stage1',
        status: 'completed',
        output: {},
        duration: 1000,
        timestamp: new Date()
      });

      const result = service.aggregateResults(jobId, stages, stageResults);

      expect(result.jobId).toBe(jobId);
      expect(result.status).toBe('success');
      expect(result.errors.length).toBe(0);
    });

    it('should aggregate results with failure status', () => {
      const jobId = 'job-123';
      const stages = [...mockStages];
      stages[0].status = 'completed';
      stages[1].status = 'failed';
      stages[2].status = 'pending';

      const stageResults = new Map<string, StageResult>();
      stageResults.set('stage2', {
        stageId: 'stage2',
        status: 'failed',
        output: null,
        error: new Error('Stage failed'),
        duration: 1000,
        timestamp: new Date()
      });

      const result = service.aggregateResults(jobId, stages, stageResults);

      expect(result.status).toBe('failed');
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].field).toBe('stage2');
    });

    it('should aggregate results with partial status', () => {
      const jobId = 'job-123';
      const stages = [...mockStages];
      stages[0].status = 'completed';
      stages[1].status = 'pending';
      stages[2].status = 'pending';

      const stageResults = new Map<string, StageResult>();

      const result = service.aggregateResults(jobId, stages, stageResults);

      expect(result.status).toBe('partial');
    });

    it('should include skipped stages in success status', () => {
      const jobId = 'job-123';
      const stages = [...mockStages];
      stages[0].status = 'completed';
      stages[1].status = 'skipped';
      stages[2].status = 'completed';

      const stageResults = new Map<string, StageResult>();

      const result = service.aggregateResults(jobId, stages, stageResults);

      expect(result.status).toBe('success');
    });
  });

  describe('getNextStage', () => {
    it('should return first pending stage in order', () => {
      const stages = [...mockStages];
      const nextStage = service.getNextStage(stages);

      expect(nextStage).toBeDefined();
      expect(nextStage?.id).toBe('stage2');
    });

    it('should return null when no pending stages', () => {
      const stages = [...mockStages];
      stages.forEach(s => s.status = 'completed');

      const nextStage = service.getNextStage(stages);

      expect(nextStage).toBeNull();
    });

    it('should respect stage order', () => {
      const stages: PipelineStage[] = [
        { ...mockStages[0], order: 2, status: 'pending' },
        { ...mockStages[1], order: 0, status: 'pending' },
        { ...mockStages[2], order: 1, status: 'pending' }
      ];

      const nextStage = service.getNextStage(stages);

      expect(nextStage?.order).toBe(0);
    });
  });

  describe('validateStageExecution', () => {
    it('should validate stage can be executed', () => {
      const stage = mockStages[1];
      const result = service.validateStageExecution(stage, mockStages);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject running stage', () => {
      const stages = [...mockStages];
      stages[1].status = 'running';

      const result = service.validateStageExecution(stages[1], stages);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('already running');
    });

    it('should reject completed stage', () => {
      const stages = [...mockStages];
      stages[1].status = 'completed';

      const result = service.validateStageExecution(stages[1], stages);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('already completed');
    });

    it('should reject skipped stage', () => {
      const stages = [...mockStages];
      stages[1].status = 'skipped';

      const result = service.validateStageExecution(stages[1], stages);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('been skipped');
    });

    it('should reject stage with unmet dependencies', () => {
      const stages = [...mockStages];
      stages[0].status = 'pending';

      const result = service.validateStageExecution(stages[1], stages);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Dependencies not met');
    });
  });

  describe('calculateProgress', () => {
    it('should calculate progress correctly', () => {
      const stages = [...mockStages];
      stages[0].status = 'completed';
      stages[1].status = 'completed';
      stages[2].status = 'pending';

      const progress = service.calculateProgress(stages);

      expect(progress).toBe((2 / 3) * 100);
    });

    it('should return 0 for empty stages', () => {
      const progress = service.calculateProgress([]);
      expect(progress).toBe(0);
    });

    it('should count skipped stages as completed', () => {
      const stages = [...mockStages];
      stages[0].status = 'completed';
      stages[1].status = 'skipped';
      stages[2].status = 'pending';

      const progress = service.calculateProgress(stages);

      expect(progress).toBe((2 / 3) * 100);
    });
  });

  describe('getStatusSummary', () => {
    it('should return correct status summary', () => {
      const stages = [...mockStages];
      stages[0].status = 'completed';
      stages[1].status = 'running';
      stages[2].status = 'pending';

      const summary = service.getStatusSummary(stages);

      expect(summary.total).toBe(3);
      expect(summary.completed).toBe(1);
      expect(summary.running).toBe(1);
      expect(summary.pending).toBe(1);
      expect(summary.failed).toBe(0);
      expect(summary.skipped).toBe(0);
    });

    it('should count all status types', () => {
      const stages: PipelineStage[] = [
        { ...mockStages[0], status: 'completed' },
        { ...mockStages[1], status: 'failed' },
        { ...mockStages[2], status: 'skipped' }
      ];

      const summary = service.getStatusSummary(stages);

      expect(summary.completed).toBe(1);
      expect(summary.failed).toBe(1);
      expect(summary.skipped).toBe(1);
    });
  });
});
