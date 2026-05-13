import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ConfigurationManagerService } from './configuration-manager.service';
import { ApiHeadersService } from '../../../../services/api-headers.service';
import { of } from 'rxjs';
import {
  Configuration,
  ConfigSchema,
  TemplateConfigData
} from '../models/template.models';

describe('ConfigurationManagerService', () => {
  let service: ConfigurationManagerService;
  let httpMock: HttpTestingController;
  let apiHeadersService: jasmine.SpyObj<ApiHeadersService>;

  const mockHeaders = { 'Authorization': 'Bearer test-token' };

  beforeEach(() => {
    const apiHeadersSpy = jasmine.createSpyObj('ApiHeadersService', ['getApiHeaders']);
    apiHeadersSpy.getApiHeaders.and.returnValue(of(mockHeaders));

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ConfigurationManagerService,
        { provide: ApiHeadersService, useValue: apiHeadersSpy }
      ]
    });

    service = TestBed.inject(ConfigurationManagerService);
    httpMock = TestBed.inject(HttpTestingController);
    apiHeadersService = TestBed.inject(ApiHeadersService) as jasmine.SpyObj<ApiHeadersService>;
  });

  afterEach(() => {
    httpMock.verify();
    service.clearConfigurationCache();
  });

  describe('getConfiguration', () => {
    it('should retrieve configuration value from API - Requirement 12.1', (done) => {
      const key = 'max-retries';
      const mockConfig: Configuration = {
        key,
        value: 3,
        type: 'number',
        description: 'Maximum retry attempts',
        category: 'system',
        isEditable: true
      };

      service.getConfiguration(key).subscribe(value => {
        expect(value).toBe(3);
        done();
      });

      const req = httpMock.expectOne(`/api/configurations/${key}`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
      req.flush(mockConfig);
    });

    it('should return cached value if available and not expired - Requirement 12.1', (done) => {
      const key = 'cache-test';
      const mockConfig: Configuration = {
        key,
        value: 'cached-value',
        type: 'string',
        description: 'Test config',
        category: 'test',
        isEditable: true
      };

      // First call - should hit API
      service.getConfiguration(key).subscribe(value => {
        expect(value).toBe('cached-value');

        // Second call - should use cache
        service.getConfiguration(key).subscribe(cachedValue => {
          expect(cachedValue).toBe('cached-value');
          done();
        });
      });

      // Only one HTTP request should be made
      const req = httpMock.expectOne(`/api/configurations/${key}`);
      req.flush(mockConfig);
    });

    it('should handle errors when fetching configuration', (done) => {
      const key = 'non-existent';

      service.getConfiguration(key).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBeDefined();
          done();
        }
      });

      const req = httpMock.expectOne(`/api/configurations/${key}`);
      req.flush('Not found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('getConfigurationBatch', () => {
    it('should retrieve multiple configurations in batch - Requirement 12.6', (done) => {
      const keys = ['key1', 'key2', 'key3'];
      const mockConfigs: Configuration[] = [
        { key: 'key1', value: 'value1', type: 'string', description: '', category: 'test', isEditable: true },
        { key: 'key2', value: 42, type: 'number', description: '', category: 'test', isEditable: true },
        { key: 'key3', value: true, type: 'boolean', description: '', category: 'test', isEditable: true }
      ];

      service.getConfigurationBatch(keys).subscribe(result => {
        expect(result.size).toBe(3);
        expect(result.get('key1')).toBe('value1');
        expect(result.get('key2')).toBe(42);
        expect(result.get('key3')).toBe(true);
        done();
      });

      const req = httpMock.expectOne(`/api/configurations/batch?keys=key1,key2,key3`);
      expect(req.request.method).toBe('GET');
      req.flush(mockConfigs);
    });

    it('should return empty map for empty keys array', (done) => {
      service.getConfigurationBatch([]).subscribe(result => {
        expect(result.size).toBe(0);
        done();
      });
    });

    it('should use cache for already cached keys', (done) => {
      const keys = ['cached-key', 'new-key'];
      
      // Pre-cache one key
      const cachedConfig: Configuration = {
        key: 'cached-key',
        value: 'cached',
        type: 'string',
        description: '',
        category: 'test',
        isEditable: true
      };

      service.getConfiguration('cached-key').subscribe(() => {
        // Now request batch with one cached and one new key
        service.getConfigurationBatch(keys).subscribe(result => {
          expect(result.size).toBe(2);
          expect(result.get('cached-key')).toBe('cached');
          expect(result.get('new-key')).toBe('new-value');
          done();
        });

        // Should only request the uncached key
        const req = httpMock.expectOne(`/api/configurations/batch?keys=new-key`);
        req.flush([{
          key: 'new-key',
          value: 'new-value',
          type: 'string',
          description: '',
          category: 'test',
          isEditable: true
        }]);
      });

      const req = httpMock.expectOne(`/api/configurations/cached-key`);
      req.flush(cachedConfig);
    });
  });

  describe('updateConfiguration', () => {
    it('should validate and update configuration - Requirements 12.2, 12.3, 12.4', (done) => {
      const key = 'max-retries';
      const newValue = 5;
      const mockConfig: Configuration = {
        key,
        value: 3,
        type: 'number',
        description: 'Maximum retry attempts',
        category: 'system',
        isEditable: true,
        validationSchema: {
          type: 'number',
          required: true,
          min: 1,
          max: 10
        }
      };

      service.updateConfiguration(key, newValue).subscribe(() => {
        expect(service.isCached(key)).toBe(false); // Cache should be cleared
        done();
      });

      // First request to get config for validation
      const getReq = httpMock.expectOne(`/api/configurations/${key}`);
      expect(getReq.request.method).toBe('GET');
      getReq.flush(mockConfig);

      // Second request to update
      const putReq = httpMock.expectOne(`/api/configurations/${key}`);
      expect(putReq.request.method).toBe('PUT');
      expect(putReq.request.body).toEqual({ value: newValue });
      putReq.flush(null);
    });

    it('should reject invalid configuration with descriptive errors - Requirement 12.3', (done) => {
      const key = 'max-retries';
      const invalidValue = 15; // Exceeds max
      const mockConfig: Configuration = {
        key,
        value: 3,
        type: 'number',
        description: 'Maximum retry attempts',
        category: 'system',
        isEditable: true,
        validationSchema: {
          type: 'number',
          required: true,
          min: 1,
          max: 10
        }
      };

      service.updateConfiguration(key, invalidValue).subscribe({
        next: () => fail('Should have failed validation'),
        error: (error) => {
          expect(error.message).toContain('Configuration validation failed');
          expect(error.message).toContain('must be at most 10');
          done();
        }
      });

      const getReq = httpMock.expectOne(`/api/configurations/${key}`);
      getReq.flush(mockConfig);
    });

    it('should clear cache after successful update - Requirement 12.4', (done) => {
      const key = 'test-config';
      const mockConfig: Configuration = {
        key,
        value: 'old',
        type: 'string',
        description: '',
        category: 'test',
        isEditable: true
      };

      // Pre-cache the configuration
      service.getConfiguration(key).subscribe(() => {
        expect(service.isCached(key)).toBe(true);

        // Update the configuration
        service.updateConfiguration(key, 'new').subscribe(() => {
          expect(service.isCached(key)).toBe(false);
          done();
        });

        const getReq2 = httpMock.expectOne(`/api/configurations/${key}`);
        getReq2.flush(mockConfig);

        const putReq = httpMock.expectOne(`/api/configurations/${key}`);
        putReq.flush(null);
      });

      const getReq1 = httpMock.expectOne(`/api/configurations/${key}`);
      getReq1.flush(mockConfig);
    });
  });

  describe('updateConfigurationBatch', () => {
    it('should update multiple configurations - Requirement 12.6', (done) => {
      const updates = new Map<string, any>([
        ['key1', 'value1'],
        ['key2', 42]
      ]);

      service.updateConfigurationBatch(updates).subscribe(() => {
        expect(service.isCached('key1')).toBe(false);
        expect(service.isCached('key2')).toBe(false);
        done();
      });

      const req = httpMock.expectOne(`/api/configurations/batch`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body.updates).toEqual([
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 42 }
      ]);
      req.flush(null);
    });

    it('should handle empty updates map', (done) => {
      service.updateConfigurationBatch(new Map()).subscribe(() => {
        done();
      });
    });
  });

  describe('getTemplateConfiguration', () => {
    it('should retrieve template-specific configuration - Requirement 12.5', (done) => {
      const templateId = 'template-123';
      const mockTemplateConfig: TemplateConfigData = {
        templateId,
        configurations: {
          'setting1': 'value1',
          'setting2': 42
        },
        updatedAt: new Date(),
        updatedBy: 'user-123'
      };

      service.getTemplateConfiguration(templateId).subscribe(config => {
        expect(config.templateId).toBe(templateId);
        expect(config.configurations['setting1']).toBe('value1');
        expect(config.configurations['setting2']).toBe(42);
        done();
      });

      const req = httpMock.expectOne(`/api/configurations/templates/${templateId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockTemplateConfig);
    });

    it('should cache template configuration', (done) => {
      const templateId = 'template-456';
      const mockTemplateConfig: TemplateConfigData = {
        templateId,
        configurations: { 'test': 'value' },
        updatedAt: new Date(),
        updatedBy: 'user-123'
      };

      // First call
      service.getTemplateConfiguration(templateId).subscribe(() => {
        // Second call - should use cache
        service.getTemplateConfiguration(templateId).subscribe(config => {
          expect(config.templateId).toBe(templateId);
          done();
        });
      });

      // Only one HTTP request
      const req = httpMock.expectOne(`/api/configurations/templates/${templateId}`);
      req.flush(mockTemplateConfig);
    });
  });

  describe('updateTemplateConfiguration', () => {
    it('should update template-specific configuration - Requirement 12.5', (done) => {
      const templateId = 'template-789';
      const updates = {
        configurations: {
          'newSetting': 'newValue'
        }
      };

      service.updateTemplateConfiguration(templateId, updates).subscribe(() => {
        done();
      });

      const req = httpMock.expectOne(`/api/configurations/templates/${templateId}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updates);
      req.flush(null);
    });

    it('should clear template cache after update', (done) => {
      const templateId = 'template-clear';
      const mockConfig: TemplateConfigData = {
        templateId,
        configurations: {},
        updatedAt: new Date(),
        updatedBy: 'user'
      };

      // Pre-cache
      service.getTemplateConfiguration(templateId).subscribe(() => {
        expect(service.isCached(`template:${templateId}`)).toBe(true);

        // Update
        service.updateTemplateConfiguration(templateId, {}).subscribe(() => {
          expect(service.isCached(`template:${templateId}`)).toBe(false);
          done();
        });

        const putReq = httpMock.expectOne(`/api/configurations/templates/${templateId}`);
        putReq.flush(null);
      });

      const getReq = httpMock.expectOne(`/api/configurations/templates/${templateId}`);
      getReq.flush(mockConfig);
    });
  });

  describe('validateConfiguration', () => {
    it('should validate required fields - Requirement 12.2', () => {
      const schema: ConfigSchema = {
        type: 'string',
        required: true
      };

      const result = service.validateConfiguration('test-key', null, schema);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].code).toBe('REQUIRED_FIELD');
    });

    it('should validate type constraints - Requirement 12.2', () => {
      const schema: ConfigSchema = {
        type: 'number',
        required: false
      };

      const result = service.validateConfiguration('test-key', 'not-a-number', schema);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].code).toBe('INVALID_TYPE');
    });

    it('should validate enum constraints - Requirement 12.2', () => {
      const schema: ConfigSchema = {
        type: 'string',
        required: false,
        enum: ['option1', 'option2', 'option3']
      };

      const result = service.validateConfiguration('test-key', 'invalid-option', schema);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].code).toBe('INVALID_ENUM_VALUE');
    });

    it('should validate min/max for numbers - Requirement 12.2', () => {
      const schema: ConfigSchema = {
        type: 'number',
        required: false,
        min: 1,
        max: 10
      };

      const resultTooSmall = service.validateConfiguration('test-key', 0, schema);
      expect(resultTooSmall.valid).toBe(false);
      expect(resultTooSmall.errors[0].code).toBe('VALUE_TOO_SMALL');

      const resultTooLarge = service.validateConfiguration('test-key', 15, schema);
      expect(resultTooLarge.valid).toBe(false);
      expect(resultTooLarge.errors[0].code).toBe('VALUE_TOO_LARGE');

      const resultValid = service.validateConfiguration('test-key', 5, schema);
      expect(resultValid.valid).toBe(true);
    });

    it('should validate pattern for strings - Requirement 12.2', () => {
      const schema: ConfigSchema = {
        type: 'string',
        required: false,
        pattern: '^[A-Z]{3}$' // Three uppercase letters
      };

      const resultInvalid = service.validateConfiguration('test-key', 'abc', schema);
      expect(resultInvalid.valid).toBe(false);
      expect(resultInvalid.errors[0].code).toBe('PATTERN_MISMATCH');

      const resultValid = service.validateConfiguration('test-key', 'ABC', schema);
      expect(resultValid.valid).toBe(true);
    });

    it('should validate nested object properties - Requirement 12.2', () => {
      const schema: ConfigSchema = {
        type: 'object',
        required: false,
        properties: {
          'name': {
            type: 'string',
            required: true
          },
          'age': {
            type: 'number',
            required: true,
            min: 0
          }
        }
      };

      const resultInvalid = service.validateConfiguration('test-key', {
        name: 'John',
        age: -5
      }, schema);
      
      expect(resultInvalid.valid).toBe(false);
      expect(resultInvalid.errors.some(e => e.code === 'VALUE_TOO_SMALL')).toBe(true);

      const resultValid = service.validateConfiguration('test-key', {
        name: 'John',
        age: 25
      }, schema);
      
      expect(resultValid.valid).toBe(true);
    });

    it('should return valid for no schema', () => {
      const result = service.validateConfiguration('test-key', 'any-value');
      expect(result.valid).toBe(true);
    });

    it('should return valid for null value when not required', () => {
      const schema: ConfigSchema = {
        type: 'string',
        required: false
      };

      const result = service.validateConfiguration('test-key', null, schema);
      expect(result.valid).toBe(true);
    });
  });

  describe('cache management', () => {
    it('should clear all cached configurations', (done) => {
      const mockConfig: Configuration = {
        key: 'test',
        value: 'value',
        type: 'string',
        description: '',
        category: 'test',
        isEditable: true
      };

      service.getConfiguration('test').subscribe(() => {
        expect(service.isCached('test')).toBe(true);
        
        service.clearConfigurationCache();
        expect(service.isCached('test')).toBe(false);
        done();
      });

      const req = httpMock.expectOne('/api/configurations/test');
      req.flush(mockConfig);
    });

    it('should refresh configuration from server', (done) => {
      const mockConfig: Configuration = {
        key: 'refresh-test',
        value: 'old-value',
        type: 'string',
        description: '',
        category: 'test',
        isEditable: true
      };

      const updatedConfig: Configuration = {
        ...mockConfig,
        value: 'new-value'
      };

      // Initial fetch
      service.getConfiguration('refresh-test').subscribe(value => {
        expect(value).toBe('old-value');

        // Refresh
        service.refreshConfiguration('refresh-test').subscribe(newValue => {
          expect(newValue).toBe('new-value');
          done();
        });

        const refreshReq = httpMock.expectOne('/api/configurations/refresh-test');
        refreshReq.flush(updatedConfig);
      });

      const initialReq = httpMock.expectOne('/api/configurations/refresh-test');
      initialReq.flush(mockConfig);
    });

    it('should provide cache statistics', (done) => {
      const mockConfig: Configuration = {
        key: 'stats-test',
        value: 'value',
        type: 'string',
        description: '',
        category: 'test',
        isEditable: true
      };

      service.getConfiguration('stats-test').subscribe(() => {
        const stats = service.getCacheStats();
        expect(stats.size).toBeGreaterThan(0);
        expect(stats.keys).toContain('stats-test');
        done();
      });

      const req = httpMock.expectOne('/api/configurations/stats-test');
      req.flush(mockConfig);
    });
  });

  describe('resetConfiguration', () => {
    it('should reset configuration to default value', (done) => {
      const key = 'reset-test';

      service.resetConfiguration(key).subscribe(() => {
        expect(service.isCached(key)).toBe(false);
        done();
      });

      const req = httpMock.expectOne(`/api/configurations/${key}/reset`);
      expect(req.request.method).toBe('POST');
      req.flush(null);
    });
  });

  describe('getAllConfigurations', () => {
    it('should fetch all configurations and cache them', (done) => {
      const mockConfigs: Configuration[] = [
        { key: 'config1', value: 'value1', type: 'string', description: '', category: 'test', isEditable: true },
        { key: 'config2', value: 42, type: 'number', description: '', category: 'test', isEditable: true }
      ];

      service.getAllConfigurations().subscribe(configs => {
        expect(configs.length).toBe(2);
        expect(service.isCached('config1')).toBe(true);
        expect(service.isCached('config2')).toBe(true);
        done();
      });

      const req = httpMock.expectOne('/api/configurations');
      expect(req.request.method).toBe('GET');
      req.flush(mockConfigs);
    });
  });

  describe('getConfigurationSchema', () => {
    it('should retrieve configuration schema', (done) => {
      const key = 'schema-test';
      const mockSchema: ConfigSchema = {
        type: 'number',
        required: true,
        min: 1,
        max: 100
      };
      const mockConfig: Configuration = {
        key,
        value: 50,
        type: 'number',
        description: '',
        category: 'test',
        isEditable: true,
        validationSchema: mockSchema
      };

      service.getConfigurationSchema(key).subscribe(schema => {
        expect(schema).toEqual(mockSchema);
        done();
      });

      const req = httpMock.expectOne(`/api/configurations/${key}`);
      req.flush(mockConfig);
    });

    it('should throw error if no schema exists', (done) => {
      const key = 'no-schema';
      const mockConfig: Configuration = {
        key,
        value: 'value',
        type: 'string',
        description: '',
        category: 'test',
        isEditable: true
      };

      service.getConfigurationSchema(key).subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toContain('No validation schema found');
          done();
        }
      });

      const req = httpMock.expectOne(`/api/configurations/${key}`);
      req.flush(mockConfig);
    });
  });
});
