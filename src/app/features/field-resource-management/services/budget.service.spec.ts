import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BudgetService } from './budget.service';
import { CacheService } from './cache.service';
import { 
  JobBudget, 
  BudgetAdjustment, 
  BudgetDeduction,
  BudgetStatus 
} from '../models/budget.model';
import { 
  CreateBudgetDto, 
  AdjustBudgetDto 
} from '../models/dtos/budget.dto';

describe('BudgetService', () => {
  let service: BudgetService;
  let httpMock: HttpTestingController;
  let cacheService: CacheService;

  const mockBudget: JobBudget = {
    id: 'budget-123',
    jobId: 'job-123',
    allocatedHours: 100,
    consumedHours: 50,
    remainingHours: 50,
    status: BudgetStatus.OnTrack,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15')
  };

  const mockAdjustment: BudgetAdjustment = {
    id: 'adj-123',
    jobId: 'job-123',
    amount: 20,
    reason: 'Additional scope added',
    adjustedBy: 'user-123',
    adjustedByName: 'John Manager',
    timestamp: new Date('2024-01-15'),
    previousBudget: 100,
    newBudget: 120
  };

  const mockDeduction: BudgetDeduction = {
    id: 'ded-123',
    jobId: 'job-123',
    timecardEntryId: 'tc-123',
    technicianId: 'tech-123',
    technicianName: 'Jane Technician',
    hoursDeducted: 8,
    timestamp: new Date('2024-01-15')
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BudgetService,
        CacheService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(BudgetService);
    httpMock = TestBed.inject(HttpTestingController);
    cacheService = TestBed.inject(CacheService);
  });

  afterEach(() => {
    cacheService.clearAll();
    httpMock.verify();
  });

  describe('getBudget', () => {
    it('should retrieve budget for a job', () => {
      service.getBudget('job-123').subscribe(budget => {
        expect(budget).toEqual(mockBudget);
        expect(budget.jobId).toBe('job-123');
        expect(budget.allocatedHours).toBe(100);
        expect(budget.consumedHours).toBe(50);
      });

      const req = httpMock.expectOne('/api/budgets/job/job-123');
      expect(req.request.method).toBe('GET');
      req.flush(mockBudget);
    });

    it('should retry on failure', () => {
      let callCount = 0;

      service.getBudget('job-123').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Budget not found');
          expect(callCount).toBe(3); // Initial + 2 retries
        }
      });

      // Expect 3 requests (initial + 2 retries)
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/budgets/job/job-123');
        callCount++;
        req.flush(null, { status: 404, statusText: 'Not Found' });
      }
    });

    it('should handle 404 error with appropriate message', () => {
      service.getBudget('nonexistent-job').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Budget not found');
        }
      });

      // getBudget uses retry(2), so 3 requests total (initial + 2 retries)
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/budgets/job/nonexistent-job');
        req.flush(null, { status: 404, statusText: 'Not Found' });
      }
    });
  });

  describe('createBudget', () => {
    it('should create a new budget', () => {
      const createDto: CreateBudgetDto = {
        jobId: 'job-123',
        allocatedHours: 100
      };

      service.createBudget(createDto).subscribe(budget => {
        expect(budget).toEqual(mockBudget);
        expect(budget.allocatedHours).toBe(100);
        expect(budget.consumedHours).toBe(50);
      });

      const req = httpMock.expectOne('/api/budgets');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(createDto);
      req.flush(mockBudget);
    });

    it('should handle 400 error for invalid data', () => {
      const invalidDto: CreateBudgetDto = {
        jobId: 'job-123',
        allocatedHours: -10 // Invalid negative hours
      };

      service.createBudget(invalidDto).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Invalid budget data');
        }
      });

      const req = httpMock.expectOne('/api/budgets');
      req.flush(null, { status: 400, statusText: 'Bad Request' });
    });

    it('should handle 409 error for duplicate budget', () => {
      const createDto: CreateBudgetDto = {
        jobId: 'job-123',
        allocatedHours: 100
      };

      service.createBudget(createDto).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Budget conflict - the budget may have been modified by another user');
        }
      });

      const req = httpMock.expectOne('/api/budgets');
      req.flush(null, { status: 409, statusText: 'Conflict' });
    });
  });

  describe('adjustBudget', () => {
    it('should adjust budget with positive amount', () => {
      const adjustDto: AdjustBudgetDto = {
        amount: 20,
        reason: 'Additional scope added'
      };

      service.adjustBudget('job-123', adjustDto).subscribe(adjustment => {
        expect(adjustment).toEqual(mockAdjustment);
        expect(adjustment.amount).toBe(20);
        expect(adjustment.reason).toBe('Additional scope added');
      });

      const req = httpMock.expectOne('/api/budgets/job-123/adjustments');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(adjustDto);
      req.flush(mockAdjustment);
    });

    it('should adjust budget with negative amount', () => {
      const adjustDto: AdjustBudgetDto = {
        amount: -10,
        reason: 'Scope reduced'
      };

      const negativeAdjustment: BudgetAdjustment = {
        ...mockAdjustment,
        amount: -10,
        reason: 'Scope reduced',
        previousBudget: 100,
        newBudget: 90
      };

      service.adjustBudget('job-123', adjustDto).subscribe(adjustment => {
        expect(adjustment.amount).toBe(-10);
        expect(adjustment.newBudget).toBe(90);
      });

      const req = httpMock.expectOne('/api/budgets/job-123/adjustments');
      req.flush(negativeAdjustment);
    });

    it('should handle 403 error for insufficient permissions', () => {
      const adjustDto: AdjustBudgetDto = {
        amount: 20,
        reason: 'Test adjustment'
      };

      service.adjustBudget('job-123', adjustDto).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Insufficient permissions to modify budget');
        }
      });

      const req = httpMock.expectOne('/api/budgets/job-123/adjustments');
      req.flush(null, { status: 403, statusText: 'Forbidden' });
    });

    it('should handle 400 error for invalid adjustment data', () => {
      const invalidDto: AdjustBudgetDto = {
        amount: 0,
        reason: '' // Empty reason
      };

      service.adjustBudget('job-123', invalidDto).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Invalid budget data');
        }
      });

      const req = httpMock.expectOne('/api/budgets/job-123/adjustments');
      req.flush(null, { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('deductHours', () => {
    it('should deduct hours from budget', () => {
      const updatedBudget: JobBudget = {
        ...mockBudget,
        consumedHours: 58,
        remainingHours: 42
      };

      service.deductHours('job-123', 8, 'tc-123').subscribe(budget => {
        expect(budget.consumedHours).toBe(58);
        expect(budget.remainingHours).toBe(42);
      });

      const req = httpMock.expectOne('/api/budgets/job-123/deductions');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ hours: 8, timecardEntryId: 'tc-123' });
      req.flush(updatedBudget);
    });

    it('should handle deduction that causes over-budget', () => {
      const overBudget: JobBudget = {
        ...mockBudget,
        consumedHours: 110,
        remainingHours: -10,
        status: BudgetStatus.OverBudget
      };

      service.deductHours('job-123', 60, 'tc-456').subscribe(budget => {
        expect(budget.consumedHours).toBe(110);
        expect(budget.remainingHours).toBe(-10);
        expect(budget.status).toBe(BudgetStatus.OverBudget);
      });

      const req = httpMock.expectOne('/api/budgets/job-123/deductions');
      req.flush(overBudget);
    });

    it('should handle 404 error for non-existent budget', () => {
      service.deductHours('nonexistent-job', 8, 'tc-123').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Budget not found');
        }
      });

      const req = httpMock.expectOne('/api/budgets/nonexistent-job/deductions');
      req.flush(null, { status: 404, statusText: 'Not Found' });
    });
  });

  describe('getAdjustmentHistory', () => {
    it('should retrieve adjustment history', () => {
      const adjustments = [mockAdjustment];

      service.getAdjustmentHistory('job-123').subscribe(history => {
        expect(history).toEqual(adjustments);
        expect(history.length).toBe(1);
        expect(history[0].amount).toBe(20);
      });

      const req = httpMock.expectOne('/api/budgets/job-123/adjustments');
      expect(req.request.method).toBe('GET');
      req.flush(adjustments);
    });

    it('should return empty array when no adjustments exist', () => {
      service.getAdjustmentHistory('job-123').subscribe(history => {
        expect(history).toEqual([]);
        expect(history.length).toBe(0);
      });

      const req = httpMock.expectOne('/api/budgets/job-123/adjustments');
      req.flush([]);
    });

    it('should retry on failure', () => {
      let callCount = 0;

      service.getAdjustmentHistory('job-123').subscribe({
        next: () => fail('should have failed'),
        error: () => {
          expect(callCount).toBe(3); // Initial + 2 retries
        }
      });

      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/budgets/job-123/adjustments');
        callCount++;
        req.flush(null, { status: 500, statusText: 'Server Error' });
      }
    });
  });

  describe('getDeductionHistory', () => {
    it('should retrieve deduction history', () => {
      const deductions = [mockDeduction];

      service.getDeductionHistory('job-123').subscribe(history => {
        expect(history).toEqual(deductions);
        expect(history.length).toBe(1);
        expect(history[0].hoursDeducted).toBe(8);
      });

      const req = httpMock.expectOne('/api/budgets/job-123/deductions');
      expect(req.request.method).toBe('GET');
      req.flush(deductions);
    });

    it('should return empty array when no deductions exist', () => {
      service.getDeductionHistory('job-123').subscribe(history => {
        expect(history).toEqual([]);
        expect(history.length).toBe(0);
      });

      const req = httpMock.expectOne('/api/budgets/job-123/deductions');
      req.flush([]);
    });
  });

  describe('calculateBudgetStatus', () => {
    it('should return OnTrack when consumed is less than 80%', () => {
      const budget: JobBudget = {
        ...mockBudget,
        allocatedHours: 100,
        consumedHours: 50 // 50%
      };

      const status = service.calculateBudgetStatus(budget);
      expect(status).toBe(BudgetStatus.OnTrack);
    });

    it('should return OnTrack at exactly 79% consumed', () => {
      const budget: JobBudget = {
        ...mockBudget,
        allocatedHours: 100,
        consumedHours: 79
      };

      const status = service.calculateBudgetStatus(budget);
      expect(status).toBe(BudgetStatus.OnTrack);
    });

    it('should return Warning when consumed is 80%', () => {
      const budget: JobBudget = {
        ...mockBudget,
        allocatedHours: 100,
        consumedHours: 80
      };

      const status = service.calculateBudgetStatus(budget);
      expect(status).toBe(BudgetStatus.Warning);
    });

    it('should return Warning when consumed is between 80% and 99%', () => {
      const budget: JobBudget = {
        ...mockBudget,
        allocatedHours: 100,
        consumedHours: 90
      };

      const status = service.calculateBudgetStatus(budget);
      expect(status).toBe(BudgetStatus.Warning);
    });

    it('should return OverBudget when consumed is exactly 100%', () => {
      const budget: JobBudget = {
        ...mockBudget,
        allocatedHours: 100,
        consumedHours: 100
      };

      const status = service.calculateBudgetStatus(budget);
      expect(status).toBe(BudgetStatus.OverBudget);
    });

    it('should return OverBudget when consumed exceeds allocated', () => {
      const budget: JobBudget = {
        ...mockBudget,
        allocatedHours: 100,
        consumedHours: 110
      };

      const status = service.calculateBudgetStatus(budget);
      expect(status).toBe(BudgetStatus.OverBudget);
    });

    it('should handle zero allocated hours', () => {
      const budget: JobBudget = {
        ...mockBudget,
        allocatedHours: 0,
        consumedHours: 0
      };

      const status = service.calculateBudgetStatus(budget);
      // When dividing by zero, result is NaN, which is >= 100
      expect(status).toBe(BudgetStatus.OverBudget);
    });

    it('should handle very small allocated hours', () => {
      const budget: JobBudget = {
        ...mockBudget,
        allocatedHours: 0.1,
        consumedHours: 0.05 // 50%
      };

      const status = service.calculateBudgetStatus(budget);
      expect(status).toBe(BudgetStatus.OnTrack);
    });

    it('should handle very large hours', () => {
      const budget: JobBudget = {
        ...mockBudget,
        allocatedHours: 10000,
        consumedHours: 8500 // 85%
      };

      const status = service.calculateBudgetStatus(budget);
      expect(status).toBe(BudgetStatus.Warning);
    });
  });

  describe('error handling', () => {
    it('should handle 500 server error', () => {
      service.getBudget('job-123').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Server error occurred while processing budget request');
        }
      });

      // getBudget uses retry(2), so 3 requests total
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/budgets/job/job-123');
        req.flush(null, { status: 500, statusText: 'Internal Server Error' });
      }
    });

    it('should handle network error', () => {
      service.getBudget('job-123').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('error');
        }
      });

      // getBudget uses retry(2), so 3 requests total
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/budgets/job/job-123');
        req.error(new ProgressEvent('error'));
      }
    });

    it('should handle unknown status code', () => {
      service.getBudget('job-123').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Server error: 418');
        }
      });

      // getBudget uses retry(2), so 3 requests total
      for (let i = 0; i < 3; i++) {
        const req = httpMock.expectOne('/api/budgets/job/job-123');
        req.flush(null, { status: 418, statusText: "I'm a teapot" });
      }
    });
  });

  describe('concurrent modification scenarios', () => {
    it('should handle concurrent budget adjustments', () => {
      const adjustDto: AdjustBudgetDto = {
        amount: 20,
        reason: 'Concurrent adjustment'
      };

      service.adjustBudget('job-123', adjustDto).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Budget conflict - the budget may have been modified by another user');
        }
      });

      const req = httpMock.expectOne('/api/budgets/job-123/adjustments');
      req.flush(null, { status: 409, statusText: 'Conflict' });
    });
  });
});
