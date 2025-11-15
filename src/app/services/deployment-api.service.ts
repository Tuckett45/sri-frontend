// src/app/services/deployment-api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment, local_environment } from 'src/environments/environments';
import { Deployment, DeploymentStatus } from '../features/deployment/models/deployment.models';

export interface DeploymentListResponse {
  total: number;
  rows: Deployment[];
}

export interface DeploymentQueryParams {
  status?: string;
  vendor?: string;
  dataCenter?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class DeploymentApiService {
  private jsonOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': environment.apiSubscriptionKey
    })
  };

  private baseUrl = `${environment.apiUrl}/deployments`;

  constructor(private http: HttpClient) {}

  /**
   * Get deployments assigned to the current authenticated user based on their role.
   * Filters deployments where the user is assigned as:
   * - Deployment Engineer (DeploymentEngineerId)
   * - DC Ops (DCOpsId)
   * - Vendor Rep (VendorRepId)
   * - SRI Tech (SRITechId)
   */
  getMyDeployments(queryParams?: DeploymentQueryParams): Observable<DeploymentListResponse> {
    let params = new HttpParams();

    if (queryParams) {
      if (queryParams.status) {
        params = params.set('status', queryParams.status);
      }
      if (queryParams.vendor) {
        params = params.set('vendor', queryParams.vendor);
      }
      if (queryParams.dataCenter) {
        params = params.set('dataCenter', queryParams.dataCenter);
      }
      if (queryParams.from) {
        params = params.set('from', queryParams.from);
      }
      if (queryParams.to) {
        params = params.set('to', queryParams.to);
      }
      if (queryParams.page) {
        params = params.set('page', queryParams.page.toString());
      }
      if (queryParams.pageSize) {
        params = params.set('pageSize', queryParams.pageSize.toString());
      }
    }

    return this.http.get<DeploymentListResponse>(
      `${this.baseUrl}/my-deployments`,
      { ...this.jsonOptions, params }
    );
  }

  /**
   * Get all deployments (admin/general list view)
   */
  getAllDeployments(queryParams?: DeploymentQueryParams): Observable<DeploymentListResponse> {
    let params = new HttpParams();

    if (queryParams) {
      if (queryParams.status) {
        params = params.set('status', queryParams.status);
      }
      if (queryParams.vendor) {
        params = params.set('vendor', queryParams.vendor);
      }
      if (queryParams.dataCenter) {
        params = params.set('dataCenter', queryParams.dataCenter);
      }
      if (queryParams.from) {
        params = params.set('from', queryParams.from);
      }
      if (queryParams.to) {
        params = params.set('to', queryParams.to);
      }
      if (queryParams.page) {
        params = params.set('page', queryParams.page.toString());
      }
      if (queryParams.pageSize) {
        params = params.set('pageSize', queryParams.pageSize.toString());
      }
    }

    return this.http.get<DeploymentListResponse>(
      this.baseUrl,
      { ...this.jsonOptions, params }
    );
  }

  /**
   * Get a single deployment by ID
   */
  getDeployment(id: string): Observable<Deployment> {
    return this.http.get<Deployment>(
      `${this.baseUrl}/${id}`,
      this.jsonOptions
    );
  }

  /**
   * Create a new deployment
   */
  createDeployment(deployment: Partial<Deployment>): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(
      this.baseUrl,
      deployment,
      this.jsonOptions
    );
  }

  /**
   * Update an existing deployment
   */
  updateDeployment(id: string, deployment: Partial<Deployment>): Observable<void> {
    return this.http.put<void>(
      `${this.baseUrl}/${id}`,
      deployment,
      this.jsonOptions
    );
  }

  /**
   * Advance deployment to next phase
   */
  advancePhase(id: string, fromPhase: number, toPhase: number): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/${id}/advance`,
      { from: fromPhase, to: toPhase },
      this.jsonOptions
    );
  }
}

