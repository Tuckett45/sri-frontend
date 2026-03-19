import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TemplateEngineService } from './template-engine.service';
import { ApiHeadersService } from '../../../../services/api-headers.service';
import { of } from 'rxjs';
import {
  WorkflowTemplate,
  TemplateCategory,
  TemplateCustomization,
  AppliedTemplate
} from '../models/template.models';

describe('TemplateEngineService', () => {
  let service: TemplateEngineService;
  let httpMock: HttpTestingController;
  let apiHeadersService: jasmine.SpyObj<ApiHeadersService>;

  const mockTemplate: WorkflowTemplate = {
    id: 'template1',
    name: 'Test Template',
    description: 'A test template',
    version: '1.0.0',
    category: 'standard',
    workflowType: 'job',
    author: 'admin',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    isPublic: true,
    usageCount: 10,
    rating: 4.5,
    steps: [
      {
        id: 'step1',
        name: 'Step 1',
        description: 'First step',
        order: 0,
        component: 'StepComponent',
        defaultValues: {},
        validations: []
      }
    ],
    configuration: {
      allowCustomization: true,
      requiredFields: ['step1'],
      optionalFields: [],
      defaultValues: {},
      validations: [],
      permissions: []
    },
    metadata: {}
  };

  beforeEach(() => {
    const apiHeadersSpy = jasmine.createSpyObj('ApiHeadersService', ['getApiHeaders']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        TemplateEngineService,
        { provide: ApiHeadersService, useValue: apiHeadersSpy }
      ]
    });

    service = TestBed.inject(TemplateEngineService);
    httpMock = TestBed.inject(HttpTestingController);
    apiHeadersService = TestBed.inject(ApiHeadersService) as jasmine.SpyObj<ApiHeadersService>;

    // Default mock for getApiHeaders - return Observable with empty headers
    apiHeadersService.getApiHeaders.and.returnValue(of(new (window as any).Headers()));
  });

  afterEach(() => {
    httpMock.verify();
    service.clearCache();
  });

  describe('getTemplates', () => {
    it('should fetch all templates when no workflow type is specified', (done) => {
      const mockTemplates = [mockTemplate];

      service.getTemplates().subscribe(templates => {
        expect(templates.length).toBe(1);
        expect(templates[0].id).toBe('template1');
        done();
      });

      const req = httpMock.expectOne('/api/templates');
      expect(req.request.method).toBe('GET');
      req.flush(mockTemplates);
    });

    it('should fetch templates filtered by workflow type', (done) => {
      const mockTemplates = [mockTemplate];

      service.getTemplates('job').subscribe(templates => {
        expect(templates.length).toBe(1);
        done();
      });

      const req = httpMock.expectOne('/api/templates?workflowType=job');
      expect(req.request.method).toBe('GET');
      req.flush(mockTemplates);
    });

    it('should parse date strings to Date objects', (done) => {
      service.getTemplates().subscribe(templates => {
        expect(templates[0].createdAt instanceof Date).toBe(true);
        expect(templates[0].updatedAt instanceof Date).toBe(true);
        done();
      });

      const req = httpMock.expectOne('/api/templates');
      req.flush([mockTemplate]);
    });
  });

  describe('getTemplateById', () => {
    it('should fetch a template by ID', (done) => {
      service.getTemplateById('template1').subscribe(template => {
        expect(template.id).toBe('template1');
        expect(template.name).toBe('Test Template');
        done();
      });

      const req = httpMock.expectOne('/api/templates/template1');
      expect(req.request.method).toBe('GET');
      req.flush(mockTemplate);
    });

    it('should cache fetched templates', (done) => {
      // First call - should hit the API
      service.getTemplateById('template1').subscribe(template => {
        expect(template.id).toBe('template1');

        // Second call - should use cache (no HTTP request)
        service.getTemplateById('template1').subscribe(cachedTemplate => {
          expect(cachedTemplate.id).toBe('template1');
          done();
        });
      });

      const req = httpMock.expectOne('/api/templates/template1');
      req.flush(mockTemplate);
    });
  });

  describe('getTemplateCategories', () => {
    it('should fetch template categories', (done) => {
      const mockCategories: TemplateCategory[] = [
        {
          id: 'cat1',
          name: 'Standard',
          description: 'Standard templates',
          icon: 'icon',
          templateCount: 5
        }
      ];

      service.getTemplateCategories().subscribe(categories => {
        expect(categories.length).toBe(1);
        expect(categories[0].name).toBe('Standard');
        done();
      });

      const req = httpMock.expectOne('/api/templates/categories');
      expect(req.request.method).toBe('GET');
      req.flush(mockCategories);
    });
  });

  describe('applyTemplate', () => {
    it('should apply a template without customizations', (done) => {
      service.applyTemplate('template1').subscribe(applied => {
        expect(applied.templateId).toBe('template1');
        expect(applied.status).toBe('applied');
        expect(applied.workflowId).toBeTruthy();
        done();
      });

      // First request to get the template
      const getReq = httpMock.expectOne('/api/templates/template1');
      getReq.flush(mockTemplate);

      // Second request to increment usage count
      const usageReq = httpMock.expectOne('/api/templates/template1/usage');
      usageReq.flush({});
    });

    it('should apply a template with valid customizations', (done) => {
      const customizations: TemplateCustomization = {
        templateId: 'template1',
        overrides: { field1: 'value1' },
        addedSteps: [],
        removedSteps: [],
        modifiedSteps: new Map()
      };

      service.applyTemplate('template1', customizations).subscribe(applied => {
        expect(applied.templateId).toBe('template1');
        expect(applied.customizations).toEqual(customizations);
        done();
      });

      const getReq = httpMock.expectOne('/api/templates/template1');
      getReq.flush(mockTemplate);

      const usageReq = httpMock.expectOne('/api/templates/template1/usage');
      usageReq.flush({});
    });

    it('should reject invalid customizations', (done) => {
      const invalidCustomizations: TemplateCustomization = {
        templateId: 'template1',
        overrides: {},
        addedSteps: [],
        removedSteps: ['step1'], // Trying to remove required step
        modifiedSteps: new Map()
      };

      service.applyTemplate('template1', invalidCustomizations).subscribe(
        () => fail('Should have thrown an error'),
        error => {
          expect(error.message).toContain('Invalid customizations');
          done();
        }
      );

      const getReq = httpMock.expectOne('/api/templates/template1');
      getReq.flush(mockTemplate);
    });
  });

  describe('validateTemplate', () => {
    it('should validate a valid template', () => {
      const result = service.validateTemplate(mockTemplate);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should detect missing required fields', () => {
      const invalidTemplate = { ...mockTemplate, id: '', name: '' };
      const result = service.validateTemplate(invalidTemplate);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_REQUIRED_FIELDS')).toBe(true);
    });

    it('should detect templates with no steps', () => {
      const invalidTemplate = { ...mockTemplate, steps: [] };
      const result = service.validateTemplate(invalidTemplate);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'NO_STEPS')).toBe(true);
    });

    it('should detect duplicate step IDs', () => {
      const invalidTemplate = {
        ...mockTemplate,
        steps: [
          { ...mockTemplate.steps[0], id: 'step1' },
          { ...mockTemplate.steps[0], id: 'step1' }
        ]
      };
      const result = service.validateTemplate(invalidTemplate);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'DUPLICATE_STEP_ID')).toBe(true);
    });

    it('should detect invalid step order', () => {
      const invalidTemplate = {
        ...mockTemplate,
        steps: [{ ...mockTemplate.steps[0], order: -1 }]
      };
      const result = service.validateTemplate(invalidTemplate);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_STEP_ORDER')).toBe(true);
    });

    it('should warn about gaps in step order', () => {
      const templateWithGaps = {
        ...mockTemplate,
        steps: [
          { ...mockTemplate.steps[0], id: 'step1', order: 0 },
          { ...mockTemplate.steps[0], id: 'step2', order: 5 }
        ]
      };
      const result = service.validateTemplate(templateWithGaps);
      
      expect(result.warnings.some(w => w.code === 'STEP_ORDER_GAP')).toBe(true);
    });
  });

  describe('validateTemplateCustomization', () => {
    it('should validate valid customizations', () => {
      const customizations: TemplateCustomization = {
        templateId: 'template1',
        overrides: {},
        addedSteps: [],
        removedSteps: [],
        modifiedSteps: new Map()
      };

      const result = service.validateTemplateCustomization(mockTemplate, customizations);
      expect(result.valid).toBe(true);
    });

    it('should reject removal of required steps', () => {
      const customizations: TemplateCustomization = {
        templateId: 'template1',
        overrides: {},
        addedSteps: [],
        removedSteps: ['step1'],
        modifiedSteps: new Map()
      };

      const result = service.validateTemplateCustomization(mockTemplate, customizations);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'REQUIRED_STEP_REMOVED')).toBe(true);
    });

    it('should validate added steps have required fields', () => {
      const customizations: TemplateCustomization = {
        templateId: 'template1',
        overrides: {},
        addedSteps: [{
          id: '',
          name: '',
          description: '',
          order: 1,
          component: '',
          defaultValues: {},
          validations: []
        }],
        removedSteps: [],
        modifiedSteps: new Map()
      };

      const result = service.validateTemplateCustomization(mockTemplate, customizations);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_ADDED_STEP')).toBe(true);
    });

    it('should detect duplicate step IDs in added steps', () => {
      const customizations: TemplateCustomization = {
        templateId: 'template1',
        overrides: {},
        addedSteps: [{
          id: 'step1', // Conflicts with existing step
          name: 'New Step',
          description: 'Test',
          order: 1,
          component: 'Component',
          defaultValues: {},
          validations: []
        }],
        removedSteps: [],
        modifiedSteps: new Map()
      };

      const result = service.validateTemplateCustomization(mockTemplate, customizations);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'DUPLICATE_STEP_ID')).toBe(true);
    });

    it('should reject modifications to non-existent steps', () => {
      const customizations: TemplateCustomization = {
        templateId: 'template1',
        overrides: {},
        addedSteps: [],
        removedSteps: [],
        modifiedSteps: new Map([['nonexistent', { name: 'Modified' }]])
      };

      const result = service.validateTemplateCustomization(mockTemplate, customizations);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'STEP_NOT_FOUND')).toBe(true);
    });

    it('should reject removal of required fields from required steps', () => {
      const customizations: TemplateCustomization = {
        templateId: 'template1',
        overrides: {},
        addedSteps: [],
        removedSteps: [],
        modifiedSteps: new Map([['step1', { name: '' }]])
      };

      const result = service.validateTemplateCustomization(mockTemplate, customizations);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'REQUIRED_FIELD_REMOVED')).toBe(true);
    });
  });

  describe('getTemplateVersions', () => {
    it('should fetch template versions', (done) => {
      const mockVersions = [
        {
          id: 'v1',
          templateId: 'template1',
          version: '1.0.0',
          changes: 'Initial version',
          createdBy: 'admin',
          createdAt: new Date('2024-01-01'),
          isActive: true
        }
      ];

      service.getTemplateVersions('template1').subscribe(versions => {
        expect(versions.length).toBe(1);
        expect(versions[0].version).toBe('1.0.0');
        done();
      });

      const req = httpMock.expectOne('/api/templates/template1/versions');
      req.flush(mockVersions);
    });
  });

  describe('getTemplateUsageStats', () => {
    it('should fetch template usage statistics', (done) => {
      const mockStats = {
        templateId: 'template1',
        totalUsage: 100,
        successRate: 0.95,
        averageCompletionTime: 3600,
        popularCustomizations: [],
        userRatings: [4, 5, 5, 4, 5]
      };

      service.getTemplateUsageStats('template1').subscribe(stats => {
        expect(stats.totalUsage).toBe(100);
        expect(stats.successRate).toBe(0.95);
        done();
      });

      const req = httpMock.expectOne('/api/templates/template1/stats');
      req.flush(mockStats);
    });
  });

  describe('getPopularTemplates', () => {
    it('should fetch popular templates with default limit', (done) => {
      const mockTemplates = [mockTemplate];

      service.getPopularTemplates().subscribe(templates => {
        expect(templates.length).toBe(1);
        done();
      });

      const req = httpMock.expectOne('/api/templates/popular?limit=10');
      req.flush(mockTemplates);
    });

    it('should fetch popular templates with custom limit', (done) => {
      const mockTemplates = [mockTemplate];

      service.getPopularTemplates(5).subscribe(templates => {
        expect(templates.length).toBe(1);
        done();
      });

      const req = httpMock.expectOne('/api/templates/popular?limit=5');
      req.flush(mockTemplates);
    });
  });

  describe('clearCache', () => {
    it('should clear the template cache', (done) => {
      // First, cache a template
      service.getTemplateById('template1').subscribe(() => {
        // Clear the cache
        service.clearCache();

        // Next call should hit the API again
        service.getTemplateById('template1').subscribe(() => {
          done();
        });

        const req2 = httpMock.expectOne('/api/templates/template1');
        req2.flush(mockTemplate);
      });

      const req1 = httpMock.expectOne('/api/templates/template1');
      req1.flush(mockTemplate);
    });
  });
});
