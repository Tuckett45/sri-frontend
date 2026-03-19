import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environments';
import {
  AtlasDataSourceInfo,
  AtlasFieldConfig,
  AtlasUserQuery,
  AtlasQueryResult,
  AtlasExportRequest,
  AtlasExportFormat,
  AtlasQueryTemplate
} from '../models/atlas.models';

/**
 * Service for the Atlas Platform dynamic query-builder API.
 * Base path: /v1/query-builder
 *
 * Allows authenticated users to build, execute, and export parameterised queries
 * against Atlas data sources without writing raw SQL.
 * All queries are validated for SQL injection and row-count limits server-side.
 */
@Injectable({ providedIn: 'root' })
export class AtlasQueryBuilderService {
  private readonly baseUrl = `${environment.atlasApiUrl}/v1/query-builder`;

  constructor(private http: HttpClient) {}

  // ─── Data Sources ─────────────────────────────────────────────────────────

  getDataSources(): Observable<AtlasDataSourceInfo[]> {
    return this.http.get<AtlasDataSourceInfo[]>(`${this.baseUrl}/data-sources`);
  }

  getDataSourceFields(dataSourceId: string): Observable<AtlasFieldConfig[]> {
    return this.http.get<AtlasFieldConfig[]>(`${this.baseUrl}/data-sources/${dataSourceId}/fields`);
  }

  // ─── Query Execution ──────────────────────────────────────────────────────

  executeQuery(query: AtlasUserQuery): Observable<AtlasQueryResult> {
    return this.http.post<AtlasQueryResult>(`${this.baseUrl}/execute`, query);
  }

  exportQueryResults(
    queryResult: AtlasQueryResult,
    format: AtlasExportFormat,
    dataSource: string,
    fileName?: string
  ): Observable<Blob> {
    const request: AtlasExportRequest = { queryResult, format, dataSource, fileName };
    return this.http.post(`${this.baseUrl}/export`, request, { responseType: 'blob' });
  }

  // ─── Templates ────────────────────────────────────────────────────────────

  getTemplates(): Observable<AtlasQueryTemplate[]> {
    return this.http.get<AtlasQueryTemplate[]>(`${this.baseUrl}/templates`);
  }

  saveTemplate(name: string, description: string, query: AtlasUserQuery): Observable<AtlasQueryTemplate> {
    return this.http.post<AtlasQueryTemplate>(`${this.baseUrl}/templates`, { name, description, query });
  }

  loadTemplate(templateId: string): Observable<AtlasQueryTemplate> {
    return this.http.get<AtlasQueryTemplate>(`${this.baseUrl}/templates/${templateId}`);
  }

  deleteTemplate(templateId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/templates/${templateId}`);
  }
}
