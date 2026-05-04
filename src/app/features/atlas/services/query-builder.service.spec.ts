import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { QueryBuilderService } from './query-builder.service';
import { AtlasErrorHandlerService } from './atlas-error-handler.service';
import {
  DataSourceInfo,
  FieldConfig,
  UserQuery,
  QueryResult,
  ExportRequestDto,
  ExportFormat,
  QueryTemplate,
  CreateTemplateRequest,
  TemplateExecutionRequest
} from '../models/query-builder.model';

describe('QueryBuilderService', () => {
  let service: QueryBuilderService;
  let httpMock: HttpTestingController;
  let errorHandler: jasmine.SpyObj<AtlasErrorHandlerService>;

  const baseUrl = '/v1/query-builder';

  beforeEach(() => {
    const errorHandlerSpy = jasmine.createSpyObj('AtlasErrorHandlerService', ['handleError']);
    
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        QueryBuilderService,
        { provide: AtlasErrorHandlerService, useValue: errorHandlerSpy }
      ]
    });

    service = TestBed.inject(QueryBuilderService);
    httpMock = TestBed.inject(HttpTestingController);
    errorHandler = TestBed.inject(AtlasErrorHandlerService) as jasmine.SpyObj<AtlasErrorHandlerService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getDataSources', () => {
    it('should retrieve available data sources', () => {
      const mockDataSources: DataSourceInfo[] = [
        {
          id: 'deployments',
          name: 'Deployments',
          description: 'Deployment records',
          fieldCount: 15,
          maxRowsTotal: 10000
        },
        {
          id: 'agents',
          name: 'Agents',
          description: 'AI agent records',
          fieldCount: 10,
          maxRowsTotal: 5000
        }
      ];

      service.getDataSources().subscribe(sources => {
        expect(sources).toEqual(mockDataSources);
        expect(sources.length).toBe(2);
        expect(sources[0].id).toBe('deployments');
      });

      const req = httpMock.expectOne(`${baseUrl}/data-sources`);
      expect(req.request.method).toBe('GET');
      req.flush(mockDataSources);
    });
  });

  describe('getFields', () => {
    it('should retrieve field configurations for a data source', () => {
      const dataSourceId = 'deployments';
      const mockFields: FieldConfig[] = [
        {
          name: 'id',
          displayName: 'ID',
          dataType: 'string',
          allowedOperators: ['equals', 'notEquals'],
          isFilterable: true,
          isSortable: true
        },
        {
          name: 'status',
          displayName: 'Status',
          dataType: 'string',
          allowedOperators: ['equals', 'in'],
          isFilterable: true,
          isSortable: true
        }
      ];

      service.getFields(dataSourceId).subscribe(fields => {
        expect(fields).toEqual(mockFields);
        expect(fields.length).toBe(2);
        expect(fields[0].name).toBe('id');
      });

      const req = httpMock.expectOne(`${baseUrl}/data-sources/${dataSourceId}/fields`);
      expect(req.request.method).toBe('GET');
      req.flush(mockFields);
    });
  });

  describe('executeQuery', () => {
    it('should execute a user-defined query', () => {
      const query: UserQuery = {
        dataSource: 'deployments',
        filters: [
          { field: 'status', operator: 'equals', value: 'ACTIVE', dataType: 'string' }
        ],
        logicalOperator: 'AND',
        sortBy: [{ field: 'createdAt', direction: 'DESC' }],
        limit: 100
      };

      const mockResult: QueryResult = {
        columns: [
          { name: 'id', displayName: 'ID', dataType: 'string' },
          { name: 'status', displayName: 'Status', dataType: 'string' }
        ],
        rows: [
          ['dep-1', 'ACTIVE'],
          ['dep-2', 'ACTIVE']
        ],
        totalRows: 2,
        executionTimeMs: 45,
        fromCache: false,
        timestamp: new Date()
      };

      service.executeQuery(query).subscribe(result => {
        expect(result).toEqual(mockResult);
        expect(result.totalRows).toBe(2);
        expect(result.executionTimeMs).toBe(45);
      });

      const req = httpMock.expectOne(`${baseUrl}/execute`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(query);
      req.flush(mockResult);
    });
  });

  describe('exportResults', () => {
    it('should export query results as a blob', () => {
      const exportRequest: ExportRequestDto = {
        queryResult: {
          columns: [{ name: 'id', displayName: 'ID', dataType: 'string' }],
          rows: [['dep-1']],
          totalRows: 1,
          executionTimeMs: 10,
          fromCache: false,
          timestamp: new Date()
        },
        format: ExportFormat.CSV,
        dataSource: 'deployments',
        fileName: 'export'
      };

      const mockBlob = new Blob(['id\ndep-1'], { type: 'text/csv' });

      service.exportResults(exportRequest).subscribe(blob => {
        expect(blob).toEqual(mockBlob);
        expect(blob.type).toBe('text/csv');
      });

      const req = httpMock.expectOne(`${baseUrl}/export`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(exportRequest);
      expect(req.request.responseType).toBe('blob');
      req.flush(mockBlob);
    });
  });

  describe('getTemplates', () => {
    it('should retrieve query templates', () => {
      const mockTemplates: QueryTemplate[] = [
        {
          id: 'template-1',
          name: 'Active Deployments',
          description: 'Query active deployments',
          dataSource: 'deployments',
          parameters: [],
          sqlTemplate: 'SELECT * FROM deployments WHERE status = \'ACTIVE\'',
          isPublic: true,
          createdBy: 'user-1',
          createdAt: new Date(),
          modifiedAt: new Date()
        }
      ];

      service.getTemplates().subscribe(templates => {
        expect(templates).toEqual(mockTemplates);
        expect(templates.length).toBe(1);
        expect(templates[0].name).toBe('Active Deployments');
      });

      const req = httpMock.expectOne(`${baseUrl}/templates`);
      expect(req.request.method).toBe('GET');
      req.flush(mockTemplates);
    });
  });

  describe('createTemplate', () => {
    it('should create a new query template', () => {
      const createRequest: CreateTemplateRequest = {
        name: 'New Template',
        description: 'Test template',
        dataSource: 'deployments',
        parameters: [
          {
            name: 'status',
            displayName: 'Status',
            dataType: 'string',
            isRequired: true,
            defaultValue: 'ACTIVE'
          }
        ],
        sqlTemplate: 'SELECT * FROM deployments WHERE status = @status',
        isPublic: false
      };

      const mockTemplate: QueryTemplate = {
        id: 'template-123',
        ...createRequest,
        createdBy: 'user-1',
        createdAt: new Date(),
        modifiedAt: new Date()
      };

      service.createTemplate(createRequest).subscribe(template => {
        expect(template).toEqual(mockTemplate);
        expect(template.id).toBe('template-123');
      });

      const req = httpMock.expectOne(`${baseUrl}/templates`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(createRequest);
      req.flush(mockTemplate);
    });
  });

  describe('getTemplate', () => {
    it('should retrieve a specific template by ID', () => {
      const templateId = 'template-123';
      const mockTemplate: QueryTemplate = {
        id: templateId,
        name: 'Test Template',
        description: 'Template description',
        dataSource: 'deployments',
        parameters: [],
        sqlTemplate: 'SELECT * FROM deployments',
        isPublic: true,
        createdBy: 'user-1',
        createdAt: new Date(),
        modifiedAt: new Date()
      };

      service.getTemplate(templateId).subscribe(template => {
        expect(template).toEqual(mockTemplate);
        expect(template.id).toBe(templateId);
      });

      const req = httpMock.expectOne(`${baseUrl}/templates/${templateId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockTemplate);
    });
  });

  describe('deleteTemplate', () => {
    it('should delete a query template', () => {
      const templateId = 'template-123';

      service.deleteTemplate(templateId).subscribe(() => {
        expect(true).toBe(true); // Verify completion
      });

      const req = httpMock.expectOne(`${baseUrl}/templates/${templateId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('executeTemplate', () => {
    it('should execute a query template with parameters', () => {
      const templateId = 'template-123';
      const executionRequest: TemplateExecutionRequest = {
        parameters: {
          status: 'ACTIVE',
          type: 'STANDARD'
        }
      };

      const mockResult: QueryResult = {
        columns: [
          { name: 'id', displayName: 'ID', dataType: 'string' },
          { name: 'status', displayName: 'Status', dataType: 'string' }
        ],
        rows: [
          ['dep-1', 'ACTIVE'],
          ['dep-2', 'ACTIVE']
        ],
        totalRows: 2,
        executionTimeMs: 35,
        fromCache: false,
        timestamp: new Date()
      };

      service.executeTemplate(templateId, executionRequest).subscribe(result => {
        expect(result).toEqual(mockResult);
        expect(result.totalRows).toBe(2);
      });

      const req = httpMock.expectOne(`${baseUrl}/templates/${templateId}/execute`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(executionRequest);
      req.flush(mockResult);
    });
  });
});
