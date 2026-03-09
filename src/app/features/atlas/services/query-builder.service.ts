import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AtlasErrorHandlerService } from './atlas-error-handler.service';
import { AtlasQueryBuilderService } from '../../../services/atlas-query-builder.service';
import {
  DataSourceInfo,
  FieldConfig,
  UserQuery,
  QueryResult,
  ExportRequestDto,
  QueryTemplate,
  CreateTemplateRequest,
  TemplateExecutionRequest
} from '../models/query-builder.model';

/**
 * Service for building and executing dynamic database queries with templates and export capabilities.
 * 
 * This service provides methods to:
 * - Retrieve available data sources and their field configurations
 * - Execute user-defined queries with filtering, sorting, and pagination
 * - Export query results in various formats (CSV, JSON, Excel)
 * - Manage query templates for reusable queries
 * - Execute parameterized query templates
 * 
 * All API calls are routed through the ATLAS API gateway at /v1/query-builder
 * and include automatic error handling via AtlasErrorHandlerService.
 * 
 * Requirements: 1.1, 1.2, 1.4, 1.5, 1.9
 */
@Injectable({
  providedIn: 'root'
})
export class QueryBuilderService {
  // Kept only for executeTemplate which is not yet in AtlasQueryBuilderService
  private readonly baseUrl = '/v1/query-builder';

  constructor(
    private http: HttpClient,
    private atlasQueryBuilder: AtlasQueryBuilderService,
    private errorHandler: AtlasErrorHandlerService
  ) {}

  /**
   * Get list of available data sources that can be queried.
   * 
   * Data sources represent different database tables or views that users
   * can build queries against. Each data source includes metadata about
   * the number of fields and maximum rows available.
   * 
   * @returns Observable of array of DataSourceInfo objects
   * 
   * @example
   * this.queryBuilderService.getDataSources()
   *   .subscribe(sources => {
   *     sources.forEach(source => {
   *       console.log(`${source.name}: ${source.fieldCount} fields, max ${source.maxRowsTotal} rows`);
   *     });
   *   });
   */
  getDataSources(): Observable<DataSourceInfo[]> {
    return this.atlasQueryBuilder.getDataSources().pipe(
      map((r) => r as unknown as DataSourceInfo[]),
      catchError((error: HttpErrorResponse) =>
        this.errorHandler.handleError<DataSourceInfo[]>(error, {
          endpoint: `${this.baseUrl}/data-sources`,
          method: 'GET'
        })
      )
    );
  }

  /**
   * Get field configurations for a specific data source.
   * 
   * Field configurations include metadata about each field such as data type,
   * allowed operators for filtering, sortability, and role-based access control.
   * 
   * @param dataSourceId - The unique identifier of the data source
   * @returns Observable of array of FieldConfig objects
   * 
   * @example
   * this.queryBuilderService.getFields('deployments')
   *   .subscribe(fields => {
   *     fields.forEach(field => {
   *       console.log(`${field.displayName} (${field.dataType})`);
   *       console.log(`  Filterable: ${field.isFilterable}, Sortable: ${field.isSortable}`);
   *       console.log(`  Operators: ${field.allowedOperators?.join(', ')}`);
   *     });
   *   });
   */
  getFields(dataSourceId: string): Observable<FieldConfig[]> {
    return this.atlasQueryBuilder.getDataSourceFields(dataSourceId).pipe(
      map((r) => r as unknown as FieldConfig[]),
      catchError((error: HttpErrorResponse) =>
        this.errorHandler.handleError<FieldConfig[]>(error, {
          endpoint: `${this.baseUrl}/data-sources/${dataSourceId}/fields`,
          method: 'GET'
        })
      )
    );
  }

  /**
   * Execute a user-defined query against a data source.
   * 
   * Queries can include filters, logical operators, grouping, sorting, and row limits.
   * Results include column metadata, row data, execution time, and cache status.
   * 
   * @param query - The user query definition including data source, filters, and sort criteria
   * @returns Observable of QueryResult with columns, rows, and metadata
   * 
   * @example
   * const query: UserQuery = {
   *   dataSource: 'deployments',
   *   filters: [
   *     { field: 'status', operator: 'equals', value: 'ACTIVE', dataType: 'string' },
   *     { field: 'createdAt', operator: 'greaterThan', value: '2024-01-01', dataType: 'date' }
   *   ],
   *   logicalOperator: 'AND',
   *   sortBy: [{ field: 'createdAt', direction: 'DESC' }],
   *   limit: 100
   * };
   * 
   * this.queryBuilderService.executeQuery(query)
   *   .subscribe(result => {
   *     console.log(`Query returned ${result.totalRows} rows in ${result.executionTimeMs}ms`);
   *     console.log(`From cache: ${result.fromCache}`);
   *     console.log('Columns:', result.columns);
   *     console.log('Data:', result.rows);
   *   });
   */
  executeQuery(query: UserQuery): Observable<QueryResult> {
    return this.atlasQueryBuilder.executeQuery(query as any).pipe(
      map((r) => r as unknown as QueryResult),
      catchError((error: HttpErrorResponse) =>
        this.errorHandler.handleError<QueryResult>(error, {
          endpoint: `${this.baseUrl}/execute`,
          method: 'POST'
        })
      )
    );
  }

  /**
   * Export query results to a file in the specified format.
   * 
   * Supports exporting to CSV, JSON, or Excel formats. The response is a Blob
   * that can be downloaded by the user.
   * 
   * @param request - The export request including query result, format, and optional filename
   * @returns Observable of Blob containing the exported file
   * 
   * @example
   * // First execute a query to get results
   * this.queryBuilderService.executeQuery(query)
   *   .pipe(
   *     switchMap(result => {
   *       const exportRequest: ExportRequestDto = {
   *         queryResult: result,
   *         format: ExportFormat.CSV,
   *         dataSource: 'deployments',
   *         fileName: 'deployment-report'
   *       };
   *       return this.queryBuilderService.exportResults(exportRequest);
   *     })
   *   )
   *   .subscribe(blob => {
   *     // Create download link
   *     const url = window.URL.createObjectURL(blob);
   *     const link = document.createElement('a');
   *     link.href = url;
   *     link.download = 'deployment-report.csv';
   *     link.click();
   *     window.URL.revokeObjectURL(url);
   *   });
   */
  exportResults(request: ExportRequestDto): Observable<Blob> {
    return this.atlasQueryBuilder
      .exportQueryResults(
        request.queryResult as any,
        request.format as any,
        request.dataSource,
        request.fileName
      )
      .pipe(
        catchError((error: HttpErrorResponse) =>
          this.errorHandler.handleError<Blob>(error, {
            endpoint: `${this.baseUrl}/export`,
            method: 'POST'
          })
        )
      );
  }

  /**
   * Get list of available query templates.
   * 
   * Query templates are pre-defined queries that can be executed with parameters.
   * Templates can be public (available to all users) or private (user-specific).
   * 
   * @returns Observable of array of QueryTemplate objects
   * 
   * @example
   * this.queryBuilderService.getTemplates()
   *   .subscribe(templates => {
   *     templates.forEach(template => {
   *       console.log(`${template.name}: ${template.description}`);
   *       console.log(`  Public: ${template.isPublic}`);
   *       console.log(`  Parameters: ${template.parameters?.length || 0}`);
   *     });
   *   });
   */
  getTemplates(): Observable<QueryTemplate[]> {
    return this.atlasQueryBuilder.getTemplates().pipe(
      map((r) => r as unknown as QueryTemplate[]),
      catchError((error: HttpErrorResponse) =>
        this.errorHandler.handleError<QueryTemplate[]>(error, {
          endpoint: `${this.baseUrl}/templates`,
          method: 'GET'
        })
      )
    );
  }

  /**
   * Create a new query template.
   * 
   * Templates allow users to save frequently used queries with parameterized values.
   * Templates can be made public to share with other users.
   * 
   * @param request - The template creation request including name, description, and SQL template
   * @returns Observable of the created QueryTemplate
   * 
   * @example
   * const templateRequest: CreateTemplateRequest = {
   *   name: 'Active Deployments by Type',
   *   description: 'Query active deployments filtered by type',
   *   dataSource: 'deployments',
   *   parameters: [
   *     {
   *       name: 'deploymentType',
   *       displayName: 'Deployment Type',
   *       dataType: 'string',
   *       isRequired: true,
   *       defaultValue: 'STANDARD'
   *     }
   *   ],
   *   sqlTemplate: 'SELECT * FROM deployments WHERE status = \'ACTIVE\' AND type = @deploymentType',
   *   isPublic: false
   * };
   * 
   * this.queryBuilderService.createTemplate(templateRequest)
   *   .subscribe(template => {
   *     console.log(`Template created with ID: ${template.id}`);
   *   });
   */
  createTemplate(request: CreateTemplateRequest): Observable<QueryTemplate> {
    return this.atlasQueryBuilder
      .saveTemplate(request.name, request.description ?? '', request.query as any)
      .pipe(
        map((r) => r as unknown as QueryTemplate),
        catchError((error: HttpErrorResponse) =>
          this.errorHandler.handleError<QueryTemplate>(error, {
            endpoint: `${this.baseUrl}/templates`,
            method: 'POST'
          })
        )
      );
  }

  /**
   * Get a specific query template by its ID.
   * 
   * @param templateId - The unique identifier of the template
   * @returns Observable of the QueryTemplate
   * 
   * @example
   * this.queryBuilderService.getTemplate('template-123')
   *   .subscribe(template => {
   *     console.log(`Template: ${template.name}`);
   *     console.log(`SQL: ${template.sqlTemplate}`);
   *     console.log(`Parameters:`, template.parameters);
   *   });
   */
  getTemplate(templateId: string): Observable<QueryTemplate> {
    return this.atlasQueryBuilder.loadTemplate(templateId).pipe(
      map((r) => r as unknown as QueryTemplate),
      catchError((error: HttpErrorResponse) =>
        this.errorHandler.handleError<QueryTemplate>(error, {
          endpoint: `${this.baseUrl}/templates/${templateId}`,
          method: 'GET'
        })
      )
    );
  }

  /**
   * Delete a query template.
   * 
   * Only the template creator or administrators can delete templates.
   * 
   * @param templateId - The unique identifier of the template to delete
   * @returns Observable that completes when deletion is successful
   * 
   * @example
   * this.queryBuilderService.deleteTemplate('template-123')
   *   .subscribe(() => {
   *     console.log('Template deleted successfully');
   *   });
   */
  deleteTemplate(templateId: string): Observable<void> {
    return this.atlasQueryBuilder.deleteTemplate(templateId).pipe(
      catchError((error: HttpErrorResponse) =>
        this.errorHandler.handleError<void>(error, {
          endpoint: `${this.baseUrl}/templates/${templateId}`,
          method: 'DELETE'
        })
      )
    );
  }

  /**
   * Execute a query template with provided parameters.
   * 
   * Template execution substitutes parameter values into the SQL template
   * and executes the resulting query.
   * 
   * @param templateId - The unique identifier of the template to execute
   * @param request - The execution request containing parameter values
   * @returns Observable of QueryResult with columns, rows, and metadata
   * 
   * @example
   * const executionRequest: TemplateExecutionRequest = {
   *   parameters: {
   *     deploymentType: 'EMERGENCY',
   *     startDate: '2024-01-01',
   *     endDate: '2024-12-31'
   *   }
   * };
   * 
   * this.queryBuilderService.executeTemplate('template-123', executionRequest)
   *   .subscribe(result => {
   *     console.log(`Template executed: ${result.totalRows} rows returned`);
   *     console.log('Data:', result.rows);
   *   });
   */
  executeTemplate(
    templateId: string,
    request: TemplateExecutionRequest
  ): Observable<QueryResult> {
    return this.http.post<QueryResult>(
      `${this.baseUrl}/templates/${templateId}/execute`,
      request
    ).pipe(
      catchError((error: HttpErrorResponse) => 
        this.errorHandler.handleError<QueryResult>(error, {
          endpoint: `${this.baseUrl}/templates/${templateId}/execute`,
          method: 'POST'
        })
      )
    );
  }
}
