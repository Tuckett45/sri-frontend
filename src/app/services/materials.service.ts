import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environments';
import {
  Material,
  MaterialAssignment,
  MaterialAssignmentCreate,
  MaterialAssignmentReturn,
  MaterialOrder,
  MaterialOrderUpsert,
  MaterialUpsert
} from '../models/materials.model';

/**
 * Client for the Materials API (inventory across sites, intake/export orders,
 * and materials issued to technicians). Base URL comes from the environment;
 * the API subscription key is added automatically by ConfigurationInterceptor.
 */
@Injectable({ providedIn: 'root' })
export class MaterialsService {
  private readonly baseUrl = `${environment.apiUrl}/Materials`;

  private readonly httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  // ---------------- Inventory ----------------

  getMaterials(filters?: { market?: string; site?: string; search?: string }): Observable<Material[]> {
    let params = new HttpParams();
    if (filters?.market) params = params.set('market', filters.market);
    if (filters?.site) params = params.set('site', filters.site);
    if (filters?.search) params = params.set('search', filters.search);
    return this.http.get<Material[]>(this.baseUrl, { params, headers: this.httpOptions.headers });
  }

  getMaterial(id: string): Observable<Material> {
    return this.http.get<Material>(`${this.baseUrl}/${id}`, this.httpOptions);
  }

  saveMaterial(material: MaterialUpsert): Observable<Material> {
    if (material.id) {
      return this.http.put<Material>(`${this.baseUrl}/${material.id}`, material, this.httpOptions);
    }
    return this.http.post<Material>(this.baseUrl, material, this.httpOptions);
  }

  deleteMaterial(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`, this.httpOptions);
  }

  // ---------------- Orders (intake / export) ----------------

  getOrders(filters?: {
    materialId?: string;
    direction?: string;
    status?: string;
    market?: string;
  }): Observable<MaterialOrder[]> {
    let params = new HttpParams();
    if (filters?.materialId) params = params.set('materialId', filters.materialId);
    if (filters?.direction) params = params.set('direction', filters.direction);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.market) params = params.set('market', filters.market);
    return this.http.get<MaterialOrder[]>(`${this.baseUrl}/orders`, { params, headers: this.httpOptions.headers });
  }

  getOrder(id: string): Observable<MaterialOrder> {
    return this.http.get<MaterialOrder>(`${this.baseUrl}/orders/${id}`, this.httpOptions);
  }

  saveOrder(order: MaterialOrderUpsert): Observable<MaterialOrder> {
    return this.http.post<MaterialOrder>(`${this.baseUrl}/orders`, order, this.httpOptions);
  }

  /** Fulfill an order: intake adds to on-hand stock, export removes from it. */
  fulfillOrder(id: string, fulfilledDate?: string | Date | null): Observable<MaterialOrder> {
    return this.http.post<MaterialOrder>(
      `${this.baseUrl}/orders/${id}/fulfill`,
      { fulfilledDate: fulfilledDate ?? null },
      this.httpOptions
    );
  }

  deleteOrder(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/orders/${id}`, this.httpOptions);
  }

  // ---------------- Assignments (issued to technicians) ----------------

  getAssignments(filters?: {
    materialId?: string;
    technicianId?: string;
    status?: string;
    market?: string;
  }): Observable<MaterialAssignment[]> {
    let params = new HttpParams();
    if (filters?.materialId) params = params.set('materialId', filters.materialId);
    if (filters?.technicianId) params = params.set('technicianId', filters.technicianId);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.market) params = params.set('market', filters.market);
    return this.http.get<MaterialAssignment[]>(`${this.baseUrl}/assignments`, { params, headers: this.httpOptions.headers });
  }

  getAssignment(id: string): Observable<MaterialAssignment> {
    return this.http.get<MaterialAssignment>(`${this.baseUrl}/assignments/${id}`, this.httpOptions);
  }

  /** Issue a quantity of a material to a technician. */
  issueMaterial(assignment: MaterialAssignmentCreate): Observable<MaterialAssignment> {
    return this.http.post<MaterialAssignment>(`${this.baseUrl}/assignments`, assignment, this.httpOptions);
  }

  /** Record a (partial or full) return of an assigned material. */
  returnMaterial(id: string, payload: MaterialAssignmentReturn): Observable<MaterialAssignment> {
    return this.http.post<MaterialAssignment>(`${this.baseUrl}/assignments/${id}/return`, payload, this.httpOptions);
  }

  deleteAssignment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/assignments/${id}`, this.httpOptions);
  }
}
