import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environments';
import {
  Material,
  MaterialAssignment,
  MaterialAssignmentCreate,
  MaterialAssignmentReturn,
  MaterialAsset,
  MaterialAssetUpsert,
  MaterialCount,
  MaterialCountCreate,
  MaterialCountLineInput,
  MaterialOrder,
  MaterialOrderUpsert,
  MaterialStock,
  MaterialStockAdjust,
  MaterialStockReportRow,
  MaterialTransaction,
  MaterialTransfer,
  MaterialTransferCreate,
  MaterialUpsert,
  TechnicianBalanceRow
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

  // ---------------- Lookup (barcode / QR scan) ----------------

  /** Resolve a scanned SKU or serial number to its material. */
  lookupByCode(code: string): Observable<Material> {
    const params = new HttpParams().set('code', code);
    return this.http.get<Material>(`${this.baseUrl}/lookup`, { params, headers: this.httpOptions.headers });
  }

  // ---------------- Stock + ledger ----------------

  getStock(filters?: { materialId?: string; site?: string; market?: string }): Observable<MaterialStock[]> {
    let params = new HttpParams();
    if (filters?.materialId) params = params.set('materialId', filters.materialId);
    if (filters?.site) params = params.set('site', filters.site);
    if (filters?.market) params = params.set('market', filters.market);
    return this.http.get<MaterialStock[]>(`${this.baseUrl}/stock`, { params, headers: this.httpOptions.headers });
  }

  /** Append-only audit trail of stock movements. */
  getTransactions(filters?: {
    materialId?: string;
    site?: string;
    txnType?: string;
    market?: string;
    limit?: number;
  }): Observable<MaterialTransaction[]> {
    let params = new HttpParams();
    if (filters?.materialId) params = params.set('materialId', filters.materialId);
    if (filters?.site) params = params.set('site', filters.site);
    if (filters?.txnType) params = params.set('txnType', filters.txnType);
    if (filters?.market) params = params.set('market', filters.market);
    if (filters?.limit != null) params = params.set('limit', String(filters.limit));
    return this.http.get<MaterialTransaction[]>(`${this.baseUrl}/transactions`, { params, headers: this.httpOptions.headers });
  }

  /** Manual, audited on-hand adjustment at a site. */
  adjustStock(payload: MaterialStockAdjust): Observable<{ quantityAfter: number }> {
    return this.http.post<{ quantityAfter: number }>(`${this.baseUrl}/stock/adjust`, payload, this.httpOptions);
  }

  // ---------------- Transfers (site-to-site) ----------------

  getTransfers(filters?: { materialId?: string; status?: string; market?: string }): Observable<MaterialTransfer[]> {
    let params = new HttpParams();
    if (filters?.materialId) params = params.set('materialId', filters.materialId);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.market) params = params.set('market', filters.market);
    return this.http.get<MaterialTransfer[]>(`${this.baseUrl}/transfers`, { params, headers: this.httpOptions.headers });
  }

  createTransfer(transfer: MaterialTransferCreate): Observable<MaterialTransfer> {
    return this.http.post<MaterialTransfer>(`${this.baseUrl}/transfers`, transfer, this.httpOptions);
  }

  /** Complete a transfer: move stock from source to destination site. */
  completeTransfer(id: string): Observable<MaterialTransfer> {
    return this.http.post<MaterialTransfer>(`${this.baseUrl}/transfers/${id}/complete`, {}, this.httpOptions);
  }

  deleteTransfer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/transfers/${id}`, this.httpOptions);
  }

  // ---------------- Assets (serial / lot) ----------------

  getAssets(filters?: {
    materialId?: string;
    status?: string;
    technicianId?: string;
    search?: string;
  }): Observable<MaterialAsset[]> {
    let params = new HttpParams();
    if (filters?.materialId) params = params.set('materialId', filters.materialId);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.technicianId) params = params.set('technicianId', filters.technicianId);
    if (filters?.search) params = params.set('search', filters.search);
    return this.http.get<MaterialAsset[]>(`${this.baseUrl}/assets`, { params, headers: this.httpOptions.headers });
  }

  saveAsset(asset: MaterialAssetUpsert): Observable<MaterialAsset> {
    if (asset.id) {
      return this.http.put<MaterialAsset>(`${this.baseUrl}/assets/${asset.id}`, asset, this.httpOptions);
    }
    return this.http.post<MaterialAsset>(`${this.baseUrl}/assets`, asset, this.httpOptions);
  }

  deleteAsset(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/assets/${id}`, this.httpOptions);
  }

  // ---------------- Reconciliation / cycle counts ----------------

  getCounts(filters?: { site?: string; status?: string; market?: string }): Observable<MaterialCount[]> {
    let params = new HttpParams();
    if (filters?.site) params = params.set('site', filters.site);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.market) params = params.set('market', filters.market);
    return this.http.get<MaterialCount[]>(`${this.baseUrl}/counts`, { params, headers: this.httpOptions.headers });
  }

  getCount(id: string): Observable<MaterialCount> {
    return this.http.get<MaterialCount>(`${this.baseUrl}/counts/${id}`, this.httpOptions);
  }

  createCount(payload: MaterialCountCreate): Observable<MaterialCount> {
    return this.http.post<MaterialCount>(`${this.baseUrl}/counts`, payload, this.httpOptions);
  }

  saveCountLines(id: string, lines: MaterialCountLineInput[]): Observable<MaterialCount> {
    return this.http.put<MaterialCount>(`${this.baseUrl}/counts/${id}/lines`, { lines }, this.httpOptions);
  }

  /** Post a count: variance adjustments are written through the ledger. */
  postCount(id: string): Observable<MaterialCount> {
    return this.http.post<MaterialCount>(`${this.baseUrl}/counts/${id}/post`, {}, this.httpOptions);
  }

  // ---------------- Reporting ----------------

  getStockReport(filters?: { market?: string; site?: string; lowStockOnly?: boolean }): Observable<MaterialStockReportRow[]> {
    let params = new HttpParams();
    if (filters?.market) params = params.set('market', filters.market);
    if (filters?.site) params = params.set('site', filters.site);
    if (filters?.lowStockOnly) params = params.set('lowStockOnly', 'true');
    return this.http.get<MaterialStockReportRow[]>(`${this.baseUrl}/reports/stock`, { params, headers: this.httpOptions.headers });
  }

  getTechnicianBalances(filters?: { technicianId?: string; market?: string }): Observable<TechnicianBalanceRow[]> {
    let params = new HttpParams();
    if (filters?.technicianId) params = params.set('technicianId', filters.technicianId);
    if (filters?.market) params = params.set('market', filters.market);
    return this.http.get<TechnicianBalanceRow[]>(`${this.baseUrl}/reports/technician-balances`, { params, headers: this.httpOptions.headers });
  }
}
