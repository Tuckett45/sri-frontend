import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AtlasErrorHandlerService } from './atlas-error-handler.service';
import {
  AgentMetadata,
  AgentConfiguration,
  ExecuteAgentRequest,
  AgentRecommendation,
  AgentPerformanceReport,
  AgentHealthStatus,
  AgentDomain,
  AgentType,
  AgentExecutionStatus
} from '../models/agent.model';

/**
 * Service for executing AI agents, managing configurations, and monitoring telemetry.
 * 
 * This service provides methods to:
 * - List and retrieve agent metadata
 * - Manage agent configurations
 * - Execute agents individually, in batches, or as chains
 * - Monitor agent performance and health
 * - Query agent audit logs
 * 
 * All API calls are routed through the ATLAS API gateway at /api/agents
 * and include automatic error handling via AtlasErrorHandlerService.
 * 
 * Requirements: 1.1, 1.2, 1.4, 1.5, 13.1, 13.3
 */
@Injectable({
  providedIn: 'root'
})
export class AgentService {
  private readonly baseUrl = '/api/agents';

  constructor(
    private http: HttpClient,
    private errorHandler: AtlasErrorHandlerService
  ) {}

  /**
   * List available agents with optional filtering.
   */
  getAgents(params?: {
    domain?: AgentDomain;
    type?: AgentType;
    searchTerm?: string;
  }): Observable<AgentMetadata[]> {
    let httpParams = new HttpParams();
    
    if (params?.domain) {
      httpParams = httpParams.set('domain', params.domain);
    }
    if (params?.type) {
      httpParams = httpParams.set('type', params.type);
    }
    if (params?.searchTerm) {
      httpParams = httpParams.set('searchTerm', params.searchTerm);
    }

    return this.http.get<AgentMetadata[]>(this.baseUrl, { params: httpParams })
      .pipe(
        catchError((error: HttpErrorResponse) => 
          this.errorHandler.handleError<AgentMetadata[]>(error, {
            endpoint: this.baseUrl,
            method: 'GET'
          })
        )
      );
  }

  /**
   * Get metadata for a specific agent.
   */
  getAgent(agentId: string, version?: string): Observable<AgentMetadata> {
    let httpParams = new HttpParams();
    if (version) {
      httpParams = httpParams.set('version', version);
    }

    return this.http.get<AgentMetadata>(`${this.baseUrl}/${agentId}`, { params: httpParams })
      .pipe(
        catchError((error: HttpErrorResponse) => 
          this.errorHandler.handleError<AgentMetadata>(error, {
            endpoint: `${this.baseUrl}/${agentId}`,
            method: 'GET'
          })
        )
      );
  }

  /**
   * Get all available versions for a specific agent.
   */
  getAgentVersions(agentId: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/${agentId}/versions`)
      .pipe(
        catchError((error: HttpErrorResponse) => 
          this.errorHandler.handleError<string[]>(error, {
            endpoint: `${this.baseUrl}/${agentId}/versions`,
            method: 'GET'
          })
        )
      );
  }

  /**
   * Get the current configuration for a specific agent.
   */
  getConfiguration(agentId: string, version?: string): Observable<AgentConfiguration> {
    let httpParams = new HttpParams();
    if (version) {
      httpParams = httpParams.set('version', version);
    }

    return this.http.get<AgentConfiguration>(
      `${this.baseUrl}/${agentId}/configuration`,
      { params: httpParams }
    ).pipe(
      catchError((error: HttpErrorResponse) => 
        this.errorHandler.handleError<AgentConfiguration>(error, {
          endpoint: `${this.baseUrl}/${agentId}/configuration`,
          method: 'GET'
        })
      )
    );
  }

  /**
   * Update the configuration for a specific agent.
   */
  updateConfiguration(agentId: string, request: any): Observable<AgentConfiguration> {
    return this.http.put<AgentConfiguration>(
      `${this.baseUrl}/${agentId}/configuration`,
      request
    ).pipe(
      catchError((error: HttpErrorResponse) => 
        this.errorHandler.handleError<AgentConfiguration>(error, {
          endpoint: `${this.baseUrl}/${agentId}/configuration`,
          method: 'PUT'
        })
      )
    );
  }

  /**
   * Execute a single agent with the provided input.
   */
  executeAgent(request: ExecuteAgentRequest): Observable<AgentRecommendation> {
    return this.http.post<AgentRecommendation>(`${this.baseUrl}/execute`, request)
      .pipe(
        catchError((error: HttpErrorResponse) => 
          this.errorHandler.handleError<AgentRecommendation>(error, {
            endpoint: `${this.baseUrl}/execute`,
            method: 'POST'
          })
        )
      );
  }

  /**
   * Execute multiple agents in parallel (batch execution).
   */
  executeBatch(request: any): Observable<AgentRecommendation[]> {
    return this.http.post<AgentRecommendation[]>(`${this.baseUrl}/execute-batch`, request)
      .pipe(
        catchError((error: HttpErrorResponse) => 
          this.errorHandler.handleError<AgentRecommendation[]>(error, {
            endpoint: `${this.baseUrl}/execute-batch`,
            method: 'POST'
          })
        )
      );
  }

  /**
   * Execute a chain of agents where output from one feeds into the next.
   */
  executeChain(request: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/execute-chain`, request)
      .pipe(
        catchError((error: HttpErrorResponse) => 
          this.errorHandler.handleError<any>(error, {
            endpoint: `${this.baseUrl}/execute-chain`,
            method: 'POST'
          })
        )
      );
  }

  /**
   * Get performance report for a specific agent over a time period.
   */
  getPerformanceReport(
    agentId: string,
    startDate?: Date,
    endDate?: Date
  ): Observable<AgentPerformanceReport> {
    let httpParams = new HttpParams();
    if (startDate) {
      httpParams = httpParams.set('startDate', startDate.toISOString());
    }
    if (endDate) {
      httpParams = httpParams.set('endDate', endDate.toISOString());
    }
    
    return this.http.get<AgentPerformanceReport>(
      `${this.baseUrl}/telemetry/performance/${agentId}`,
      { params: httpParams }
    ).pipe(
      catchError((error: HttpErrorResponse) => 
        this.errorHandler.handleError<AgentPerformanceReport>(error, {
          endpoint: `${this.baseUrl}/telemetry/performance/${agentId}`,
          method: 'GET'
        })
      )
    );
  }

  /**
   * Get current health status for a specific agent.
   */
  getHealthStatus(agentId: string): Observable<AgentHealthStatus> {
    return this.http.get<AgentHealthStatus>(
      `${this.baseUrl}/telemetry/health/${agentId}`
    ).pipe(
      catchError((error: HttpErrorResponse) => 
        this.errorHandler.handleError<AgentHealthStatus>(error, {
          endpoint: `${this.baseUrl}/telemetry/health/${agentId}`,
          method: 'GET'
        })
      )
    );
  }

  /**
   * Get health status for all registered agents.
   */
  getAllHealthStatuses(): Observable<AgentHealthStatus[]> {
    return this.http.get<AgentHealthStatus[]>(`${this.baseUrl}/telemetry/health`)
      .pipe(
        catchError((error: HttpErrorResponse) => 
          this.errorHandler.handleError<AgentHealthStatus[]>(error, {
            endpoint: `${this.baseUrl}/telemetry/health`,
            method: 'GET'
          })
        )
      );
  }

  /**
   * Query agent audit logs with filtering and pagination.
   */
  queryAuditLogs(params?: {
    agentId?: string;
    userId?: string;
    status?: AgentExecutionStatus;
    startDate?: Date;
    endDate?: Date;
    pageSize?: number;
    pageNumber?: number;
  }): Observable<any> {
    let httpParams = new HttpParams();
    
    if (params?.agentId) {
      httpParams = httpParams.set('agentId', params.agentId);
    }
    if (params?.userId) {
      httpParams = httpParams.set('userId', params.userId);
    }
    if (params?.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params?.startDate) {
      httpParams = httpParams.set('startDate', params.startDate.toISOString());
    }
    if (params?.endDate) {
      httpParams = httpParams.set('endDate', params.endDate.toISOString());
    }
    if (params?.pageSize) {
      httpParams = httpParams.set('pageSize', params.pageSize.toString());
    }
    if (params?.pageNumber) {
      httpParams = httpParams.set('pageNumber', params.pageNumber.toString());
    }

    return this.http.get<any>('/api/agent-audit', { params: httpParams })
      .pipe(
        catchError((error: HttpErrorResponse) => 
          this.errorHandler.handleError<any>(error, {
            endpoint: '/api/agent-audit',
            method: 'GET'
          })
        )
      );
  }
}
