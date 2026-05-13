import { TestBed } from '@angular/core/testing';
import { AtlasResponseValidatorService, ResponseSchema } from './atlas-response-validator.service';

describe('AtlasResponseValidatorService', () => {
  let service: AtlasResponseValidatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AtlasResponseValidatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('validateResponse', () => {
    it('should validate data matching schema', () => {
      const schema: ResponseSchema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          age: { type: 'number' }
        },
        required: ['id', 'name']
      };

      const data = {
        id: '123',
        name: 'John',
        age: 30
      };

      const result = service.validateResponse(data, schema);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect type mismatches', () => {
      const schema: ResponseSchema = {
        type: 'object',
        properties: {
          id: { type: 'number' }
        }
      };

      const data = {
        id: 'not-a-number'
      };

      const result = service.validateResponse(data, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect missing required properties', () => {
      const schema: ResponseSchema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' }
        },
        required: ['id', 'name']
      };

      const data = {
        id: '123'
      };

      const result = service.validateResponse(data, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('name'))).toBe(true);
    });

    it('should validate nested objects', () => {
      const schema: ResponseSchema = {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              name: { type: 'string' }
            },
            required: ['name']
          }
        }
      };

      const data = {
        user: {
          name: 'John'
        }
      };

      const result = service.validateResponse(data, schema);
      expect(result.isValid).toBe(true);
    });

    it('should validate arrays', () => {
      const schema: ResponseSchema = {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' }
          }
        }
      };

      const data = [
        { id: '1' },
        { id: '2' }
      ];

      const result = service.validateResponse(data, schema);
      expect(result.isValid).toBe(true);
    });

    it('should detect XSS in response data', () => {
      const schema: ResponseSchema = {
        type: 'object',
        properties: {
          message: { type: 'string' }
        }
      };

      const data = {
        message: '<script>alert("xss")</script>'
      };

      const result = service.validateResponse(data, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('XSS'))).toBe(true);
    });

    it('should detect SQL injection patterns', () => {
      const schema: ResponseSchema = {
        type: 'object',
        properties: {
          query: { type: 'string' }
        }
      };

      const data = {
        query: "'; DROP TABLE users--"
      };

      const result = service.validateResponse(data, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('SQL'))).toBe(true);
    });
  });

  describe('validateBasicResponse', () => {
    it('should validate null responses', () => {
      const result = service.validateBasicResponse(null);
      expect(result.isValid).toBe(true);
    });

    it('should validate simple objects', () => {
      const data = {
        message: 'Success',
        status: 200
      };

      const result = service.validateBasicResponse(data);
      expect(result.isValid).toBe(true);
    });

    it('should detect malicious content in basic responses', () => {
      const data = {
        message: '<script>alert("xss")</script>'
      };

      const result = service.validateBasicResponse(data);
      expect(result.isValid).toBe(false);
    });
  });

  describe('validatePaginatedResponse', () => {
    it('should validate correct paginated response', () => {
      const data = {
        items: [
          { id: '1', name: 'Item 1' },
          { id: '2', name: 'Item 2' }
        ],
        pagination: {
          currentPage: 1,
          pageSize: 10,
          totalCount: 2,
          totalPages: 1
        }
      };

      const result = service.validatePaginatedResponse(data);
      expect(result.isValid).toBe(true);
    });

    it('should reject response without items array', () => {
      const data = {
        pagination: {
          currentPage: 1,
          pageSize: 10,
          totalCount: 0,
          totalPages: 0
        }
      };

      const result = service.validatePaginatedResponse(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('items'))).toBe(true);
    });

    it('should reject response without pagination metadata', () => {
      const data = {
        items: []
      };

      const result = service.validatePaginatedResponse(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('pagination'))).toBe(true);
    });

    it('should validate pagination field types', () => {
      const data = {
        items: [],
        pagination: {
          currentPage: 'invalid',
          pageSize: 10,
          totalCount: 0,
          totalPages: 0
        }
      };

      const result = service.validatePaginatedResponse(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('currentPage'))).toBe(true);
    });

    it('should detect malicious content in paginated items', () => {
      const data = {
        items: [
          { name: '<script>alert("xss")</script>' }
        ],
        pagination: {
          currentPage: 1,
          pageSize: 10,
          totalCount: 1,
          totalPages: 1
        }
      };

      const result = service.validatePaginatedResponse(data);
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateErrorResponse', () => {
    it('should validate RFC 7807 ProblemDetails', () => {
      const data = {
        type: 'https://example.com/errors/not-found',
        title: 'Not Found',
        status: 404,
        detail: 'The requested resource was not found',
        instance: '/api/resource/123'
      };

      const result = service.validateErrorResponse(data);
      expect(result.isValid).toBe(true);
    });

    it('should validate minimal error response', () => {
      const data = {
        status: 500,
        title: 'Internal Server Error'
      };

      const result = service.validateErrorResponse(data);
      expect(result.isValid).toBe(true);
    });

    it('should reject non-object error responses', () => {
      const result = service.validateErrorResponse('error string');
      expect(result.isValid).toBe(false);
    });

    it('should validate error field types', () => {
      const data = {
        status: 'not-a-number',
        title: 'Error'
      };

      const result = service.validateErrorResponse(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('status'))).toBe(true);
    });

    it('should detect malicious content in error messages', () => {
      const data = {
        status: 400,
        detail: '<script>alert("xss")</script>'
      };

      const result = service.validateErrorResponse(data);
      expect(result.isValid).toBe(false);
    });
  });

  describe('string validation', () => {
    it('should validate string patterns', () => {
      const schema: ResponseSchema = {
        type: 'string',
        pattern: /^[A-Z]{3}$/
      };

      const validResult = service.validateResponse('ABC', schema);
      expect(validResult.isValid).toBe(true);

      const invalidResult = service.validateResponse('abc', schema);
      expect(invalidResult.isValid).toBe(false);
    });

    it('should validate string length', () => {
      const schema: ResponseSchema = {
        type: 'string',
        minLength: 3,
        maxLength: 10
      };

      const validResult = service.validateResponse('hello', schema);
      expect(validResult.isValid).toBe(true);

      const tooShortResult = service.validateResponse('hi', schema);
      expect(tooShortResult.isValid).toBe(false);

      const tooLongResult = service.validateResponse('this is too long', schema);
      expect(tooLongResult.isValid).toBe(false);
    });

    it('should validate string enums', () => {
      const schema: ResponseSchema = {
        type: 'string',
        enum: ['red', 'green', 'blue']
      };

      const validResult = service.validateResponse('red', schema);
      expect(validResult.isValid).toBe(true);

      const invalidResult = service.validateResponse('yellow', schema);
      expect(invalidResult.isValid).toBe(false);
    });
  });

  describe('number validation', () => {
    it('should validate number ranges', () => {
      const schema: ResponseSchema = {
        type: 'number',
        minimum: 0,
        maximum: 100
      };

      const validResult = service.validateResponse(50, schema);
      expect(validResult.isValid).toBe(true);

      const tooSmallResult = service.validateResponse(-1, schema);
      expect(tooSmallResult.isValid).toBe(false);

      const tooLargeResult = service.validateResponse(101, schema);
      expect(tooLargeResult.isValid).toBe(false);
    });

    it('should validate number enums', () => {
      const schema: ResponseSchema = {
        type: 'number',
        enum: [1, 2, 3]
      };

      const validResult = service.validateResponse(2, schema);
      expect(validResult.isValid).toBe(true);

      const invalidResult = service.validateResponse(4, schema);
      expect(invalidResult.isValid).toBe(false);
    });
  });
});
