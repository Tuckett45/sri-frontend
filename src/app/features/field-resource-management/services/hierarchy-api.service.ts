/**
 * Hierarchy API Service
 * Handles communication with atlas-platform hierarchy endpoints
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environments';

export interface ManagerInfo {
  userId: string;
  fullName: string | null;
  email: string | null;
  role: string | null;
  market: string | null;
}

export interface DirectReport {
  userId: string;
  fullName: string | null;
  email: string | null;
  role: string | null;
  market: string | null;
  assignedSince: string | null;
}

export interface ChainNode {
  userId: string;
  fullName: string | null;
  role: string | null;
  level: number;
}

export interface OrgTreeNode {
  userId: string;
  fullName: string | null;
  email: string | null;
  role: string | null;
  market: string | null;
  directReports: OrgTreeNode[];
}

export interface AssignManagerRequest {
  employeeUserId: string;
  managerUserId: string;
}

@Injectable({ providedIn: 'root' })
export class HierarchyApiService {
  private readonly apiUrl = `${environment.atlasApiUrl}/hierarchy`;

  constructor(private http: HttpClient) {}

  getMyManager(): Observable<ManagerInfo> {
    return this.http.get<ManagerInfo>(`${this.apiUrl}/my-manager`);
  }

  getMyReports(): Observable<DirectReport[]> {
    return this.http.get<DirectReport[]>(`${this.apiUrl}/my-reports`);
  }

  getReportsForUser(userId: string): Observable<DirectReport[]> {
    return this.http.get<DirectReport[]>(`${this.apiUrl}/reports/${userId}`);
  }

  getChain(userId: string): Observable<ChainNode[]> {
    return this.http.get<ChainNode[]>(`${this.apiUrl}/chain/${userId}`);
  }

  getTree(market?: string): Observable<OrgTreeNode[]> {
    let url = `${this.apiUrl}/tree`;
    if (market) url += `?market=${encodeURIComponent(market)}`;
    return this.http.get<OrgTreeNode[]>(url);
  }

  assignManager(dto: AssignManagerRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/assign`, dto);
  }

  removeManager(employeeUserId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${employeeUserId}`);
  }
}
