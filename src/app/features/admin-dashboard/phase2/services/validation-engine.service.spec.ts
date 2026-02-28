import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ValidationEngineService } from './validation-engine.service';
import { ApiHeadersService } from '../../../../services/api-headers.service';
import { of } from 'rxjs';
import { 
  ValidationResult, 
  BusinessRule, 
  Condition, 
  Constraint 
} from '../models/validation.models';
import { WorkflowData, WizardStep } from '../models/workflow.models';

describe('ValidationEngineService', () => {
  let service: ValidationEngineService;
  let httpMock: HttpTestingController;
  let apiHeadersService: jasmine.SpyObj<ApiHeadersService>;

  beforeEach(() => {
    const apiHeadersSpy = jasmine.createSpyObj('ApiHeadersService', ['getApiHeaders']);
    
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ValidationEngineService,
        { provide: ApiHeadersService, useValue: apiHeadersSpy }
      ]
    });

    service = TestBed.inject(ValidationEngineService);
    httpMock = TestBed.inject(HttpTestingController);
    apiHeadersService = TestBed.inject(ApiHeadersService) as jasmine.SpyObj<ApiHeadersService>;
    
    // Default mock for getApiHeaders
    apiHeadersService.getApiHeaders.and.returnValue(of(new (window as any).Headers()));
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('validateWorkflowData', () => {
    it('should validate required fields and return errors for missing fields', (done) => {
      const invalidData: WorkflowData = {
        type: '',
        createdBy: '',
        steps: new Map(),
        metadata: {},
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      service.validateWorkflowData(invalidData).subscribe(result => {
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some(e => e.field === 'type')).toBe(true);
        expect(result.errors.some(e => e.field === 'createdBy')).toBe(true);
        expect(result.errors.some(e => e.field === 'steps')).toBe(true);
        done();
      });

      const req = httpMock.expectOne('/api/validation/workflow');
      req.flush({ isValid: true, errors: [], warnings: [], metadata: {} });
    });

    it('should aggregate local and backend validation errors', (done) => {
      const data: WorkflowData = {
        type: '',
        createdBy: 'user1',
        steps: new Map([['step1', { data: 'test' }]]),
        metadata: {},
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const backendErrors = [{
        field: 'metadata',
        message: 'Invalid metadata',
        code: 'INVALID_METADATA',
        severity: 'error' as const
      }];

      service.validateWorkflowData(data).subscribe(result => {
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBe(2); // 1 local + 1 backend
        expect(result.metadata['totalErrorCount']).toBe(2);
        done();
      });

      const req = httpMock.expectOne('/api/validation/workflow');
      req.flush({ isValid: false, errors: backendErrors, warnings: [], metadata: {} });
    });
  });

  describe('evaluateRule', () => {
    it('should evaluate a simple equals condition', () => {
      const rule: BusinessRule = {
        id: 'rule1',
        name: 'Test Rule',
        description: 'Test',
        entityType: 'workflow',
        conditions: [{
          field: 'status',
          operator: 'equals',
          value: 'active'
        }],
        action: 'allow',
        message: 'Test',
        priority: 1
      };

      const data = { status: 'active' };
      const result = service.evaluateRule(rule, data);
      expect(result).toBe(true);
    });

    it('should evaluate multiple conditions with AND logic', () => {
      const rule: BusinessRule = {
        id: 'rule1',
        name: 'Test Rule',
        description: 'Test',
        entityType: 'workflow',
        conditions: [
          {
            field: 'status',
            operator: 'equals',
            value: 'active',
            logicalOperator: 'AND'
          },
          {
            field: 'priority',
            operator: 'greaterThan',
            value: 5
          }
        ],
        action: 'allow',
        message: 'Test',
        priority: 1
      };

      const data = { status: 'active', priority: 10 };
      const result = service.evaluateRule(rule, data);
      expect(result).toBe(true);
    });
  });

  describe('evaluateCondition', () => {
    it('should evaluate equals operator', () => {
      const condition: Condition = {
        field: 'status',
        operator: 'equals',
        value: 'active'
      };

      expect(service.evaluateCondition(condition, { status: 'active' })).toBe(true);
      expect(service.evaluateCondition(condition, { status: 'inactive' })).toBe(false);
    });

    it('should evaluate greaterThan operator', () => {
      const condition: Condition = {
        field: 'count',
        operator: 'greaterThan',
        value: 5
      };

      expect(service.evaluateCondition(condition, { count: 10 })).toBe(true);
      expect(service.evaluateCondition(condition, { count: 3 })).toBe(false);
    });

    it('should evaluate contains operator for strings', () => {
      const condition: Condition = {
        field: 'name',
        operator: 'contains',
        value: 'test'
      };

      expect(service.evaluateCondition(condition, { name: 'test-workflow' })).toBe(true);
      expect(service.evaluateCondition(condition, { name: 'workflow' })).toBe(false);
    });

    it('should evaluate in operator for arrays', () => {
      const condition: Condition = {
        field: 'status',
        operator: 'in',
        value: ['active', 'pending', 'completed']
      };

      expect(service.evaluateCondition(condition, { status: 'active' })).toBe(true);
      expect(service.evaluateCondition(condition, { status: 'cancelled' })).toBe(false);
    });
  });

  describe('validateConstraints', () => {
    it('should validate required constraint', () => {
      const constraints: Constraint[] = [{
        id: 'c1',
        field: 'name',
        type: 'required',
        message: 'Name is required',
        severity: 'error'
      }];

      const result1 = service.validateConstraints(constraints, { name: 'test' });
      expect(result1.isValid).toBe(true);

      const result2 = service.validateConstraints(constraints, { name: '' });
      expect(result2.isValid).toBe(false);
      expect(result2.errors.length).toBe(1);
    });

    it('should validate minLength constraint', () => {
      const constraints: Constraint[] = [{
        id: 'c1',
        field: 'password',
        type: 'minLength',
        value: 8,
        message: 'Password must be at least 8 characters',
        severity: 'error'
      }];

      const result1 = service.validateConstraints(constraints, { password: 'password123' });
      expect(result1.isValid).toBe(true);

      const result2 = service.validateConstraints(constraints, { password: 'pass' });
      expect(result2.isValid).toBe(false);
    });

    it('should validate pattern constraint', () => {
      const constraints: Constraint[] = [{
        id: 'c1',
        field: 'email',
        type: 'pattern',
        value: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
        message: 'Invalid email format',
        severity: 'error'
      }];

      const result1 = service.validateConstraints(constraints, { email: 'test@example.com' });
      expect(result1.isValid).toBe(true);

      const result2 = service.validateConstraints(constraints, { email: 'invalid-email' });
      expect(result2.isValid).toBe(false);
    });
  });

  describe('registerCustomValidator', () => {
    it('should register and retrieve custom validators', () => {
      const validator = (value: any) => ({
        isValid: value > 0,
        errors: [],
        warnings: [],
        metadata: {}
      });

      service.registerCustomValidator('positive', validator);
      const retrieved = service.getCustomValidator('positive');
      
      expect(retrieved).toBe(validator);
    });

    it('should return null for non-existent validators', () => {
      const retrieved = service.getCustomValidator('non-existent');
      expect(retrieved).toBe(null);
    });
  });

  describe('validateBatch', () => {
    it('should validate multiple items and return individual results', (done) => {
      const items: WorkflowData[] = [
        {
          type: 'workflow1',
          createdBy: 'user1',
          steps: new Map([['step1', {}]]),
          metadata: {},
          status: 'draft',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          type: '',
          createdBy: 'user2',
          steps: new Map(),
          metadata: {},
          status: 'draft',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      service.validateBatch(items).subscribe(results => {
        expect(results.length).toBe(2);
        expect(results[0].isValid).toBe(true);
        expect(results[1].isValid).toBe(false);
        done();
      });

      // Expect two HTTP requests (one for each item)
      const requests = httpMock.match('/api/validation/workflow');
      expect(requests.length).toBe(2);
      
      requests[0].flush({ isValid: true, errors: [], warnings: [], metadata: {} });
      requests[1].flush({ isValid: true, errors: [], warnings: [], metadata: {} });
    });
  });
});
