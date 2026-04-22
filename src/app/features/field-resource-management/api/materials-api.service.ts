/**
 * Materials API Service
 * 
 * Provides a validated API integration layer for materials management operations.
 * Wraps HTTP calls with request validation and consistent error handling.
 * 
 * Endpoints:
 * - GET  /api/materials                              - Get all materials
 * - POST /api/materials                              - Create a new material
 * - GET  /api/materials/:materialId                  - Get a single material
 * - POST /api/materials/:materialId/consume          - Consume material for a job
 * - POST /api/materials/:materialId/receive          - Receive material from supplier
 * - GET  /api/materials/:materialId/transactions     - Get transaction history
 * - GET  /api/materials/reorder-recommendations      - Get reorder recommendations
 * - POST /api/purchase-orders                        - Create a purchase order
 * - GET  /api/purchase-orders/:poId                  - Get a purchase order
 * - PATCH /api/purchase-orders/:poId/status          - Update purchase order status
 * 
 * Requirements: 7.1-7.13, 11.1-11.7
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry, map } from 'rxjs/operators';
import {
  Material,
  MaterialTransaction,
  PurchaseOrder,
  ReorderRecommendation,
  Supplier,
  PurchaseOrderStatus,
  ReorderUrgency
} from '../models/material.model';
import {
  CreateMaterialDto,
  ConsumeMaterialDto,
  CreatePurchaseOrderDto
} from '../models/dtos/material.dto';
import { MATERIALS_ENDPOINTS, PURCHASE_ORDER_ENDPOINTS, SUPPLIER_ENDPOINTS } from './api-endpoints';
import {
  validateCreateMaterial,
  validateConsumeMaterial,
  validateCreatePurchaseOrder,
  validateId
} from './api-validators';

@Injectable({
  providedIn: 'root'
})
export class MaterialsApiService {
  private readonly retryCount = 2;

  constructor(private http: HttpClient) {}

  // ============================================================================
  // Materials Endpoints
  // ============================================================================

  /**
   * GET /api/materials
   * Retrieve all materials
   * Requirements: 7.1
   */
  getMaterials(): Observable<Material[]> {
    return this.http.get<Material[]>(MATERIALS_ENDPOINTS.getMaterials()).pipe(
      retry(this.retryCount),
      catchError(error => this.handleError(error, 'getMaterials'))
    );
  }

  /**
   * POST /api/materials
   * Create a new material
   * Requirements: 7.1-7.5
   */
  createMaterial(dto: CreateMaterialDto): Observable<Material> {
    const validation = validateCreateMaterial(dto);
    if (!validation.valid) {
      return throwError(() => new Error(`Validation failed: ${validation.errors.join('; ')}`));
    }

    return this.http.post<Material>(MATERIALS_ENDPOINTS.createMaterial(), dto).pipe(
      catchError(error => this.handleError(error, 'createMaterial'))
    );
  }

  /**
   * GET /api/materials/:materialId
   * Retrieve a single material by ID
   * Requirements: 7.1
   */
  getMaterial(materialId: string): Observable<Material> {
    const idValidation = validateId(materialId, 'materialId');
    if (!idValidation.valid) {
      return throwError(() => new Error(idValidation.errors.join('; ')));
    }

    return this.http.get<Material>(MATERIALS_ENDPOINTS.getMaterial(materialId)).pipe(
      retry(this.retryCount),
      catchError(error => this.handleError(error, 'getMaterial'))
    );
  }

  /**
   * POST /api/materials/:materialId/consume
   * Consume material for a job
   * Requirements: 7.9, 11.1, 11.2
   */
  consumeMaterial(dto: ConsumeMaterialDto): Observable<MaterialTransaction> {
    const validation = validateConsumeMaterial(dto);
    if (!validation.valid) {
      return throwError(() => new Error(`Validation failed: ${validation.errors.join('; ')}`));
    }

    return this.http.post<MaterialTransaction>(
      MATERIALS_ENDPOINTS.consumeMaterial(dto.materialId),
      dto
    ).pipe(
      catchError(error => this.handleError(error, 'consumeMaterial'))
    );
  }

  /**
   * POST /api/materials/:materialId/receive
   * Receive material from supplier
   * Requirements: 7.8, 7.13
   */
  receiveMaterial(
    materialId: string,
    quantity: number,
    supplierId: string,
    purchaseOrderId?: string
  ): Observable<MaterialTransaction> {
    const idValidation = validateId(materialId, 'materialId');
    if (!idValidation.valid) {
      return throwError(() => new Error(idValidation.errors.join('; ')));
    }

    if (quantity <= 0) {
      return throwError(() => new Error('quantity must be greater than 0'));
    }

    return this.http.post<MaterialTransaction>(
      MATERIALS_ENDPOINTS.receiveMaterial(materialId),
      { quantity, supplierId, purchaseOrderId }
    ).pipe(
      catchError(error => this.handleError(error, 'receiveMaterial'))
    );
  }

  /**
   * GET /api/materials/:materialId/transactions
   * Get transaction history for a material
   * Requirements: 7.10
   */
  getTransactions(materialId: string): Observable<MaterialTransaction[]> {
    const idValidation = validateId(materialId, 'materialId');
    if (!idValidation.valid) {
      return throwError(() => new Error(idValidation.errors.join('; ')));
    }

    return this.http.get<MaterialTransaction[]>(
      MATERIALS_ENDPOINTS.getTransactions(materialId)
    ).pipe(
      retry(this.retryCount),
      catchError(error => this.handleError(error, 'getTransactions'))
    );
  }

  /**
   * GET /api/materials/transactions?jobId=:jobId
   * Get transactions for a specific job
   * Requirements: 7.11, 11.2
   */
  getTransactionsByJob(jobId: string): Observable<MaterialTransaction[]> {
    const idValidation = validateId(jobId, 'jobId');
    if (!idValidation.valid) {
      return throwError(() => new Error(idValidation.errors.join('; ')));
    }

    const params = new HttpParams().set('jobId', jobId);
    return this.http.get<MaterialTransaction[]>(
      MATERIALS_ENDPOINTS.getAllTransactions(),
      { params }
    ).pipe(
      retry(this.retryCount),
      catchError(error => this.handleError(error, 'getTransactionsByJob'))
    );
  }

  /**
   * GET /api/materials/reorder-recommendations
   * Get materials that need reordering
   * Requirements: 7.6
   */
  getReorderRecommendations(): Observable<ReorderRecommendation[]> {
    return this.http.get<ReorderRecommendation[]>(
      MATERIALS_ENDPOINTS.getReorderRecommendations()
    ).pipe(
      retry(this.retryCount),
      map(recommendations => recommendations.map(rec => ({
        ...rec,
        urgency: this.calculateReorderUrgency(rec)
      }))),
      catchError(error => this.handleError(error, 'getReorderRecommendations'))
    );
  }

  /**
   * POST /api/materials/:materialId/adjust
   * Adjust material inventory for variance corrections
   * Requirements: 11.5
   */
  adjustMaterial(
    materialId: string,
    quantity: number,
    reason: string
  ): Observable<MaterialTransaction> {
    const idValidation = validateId(materialId, 'materialId');
    if (!idValidation.valid) {
      return throwError(() => new Error(idValidation.errors.join('; ')));
    }

    if (!reason || reason.trim().length < 5) {
      return throwError(() => new Error('reason must be at least 5 characters'));
    }

    return this.http.post<MaterialTransaction>(
      MATERIALS_ENDPOINTS.adjustMaterial(materialId),
      { quantity, reason }
    ).pipe(
      catchError(error => this.handleError(error, 'adjustMaterial'))
    );
  }

  // ============================================================================
  // Purchase Order Endpoints
  // ============================================================================

  /**
   * GET /api/purchase-orders
   * Get all purchase orders with optional status filter
   * Requirements: 7.7
   */
  getPurchaseOrders(status?: PurchaseOrderStatus): Observable<PurchaseOrder[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<PurchaseOrder[]>(
      PURCHASE_ORDER_ENDPOINTS.getPurchaseOrders(),
      { params }
    ).pipe(
      retry(this.retryCount),
      catchError(error => this.handleError(error, 'getPurchaseOrders'))
    );
  }

  /**
   * POST /api/purchase-orders
   * Create a new purchase order
   * Requirements: 7.6, 7.7, 7.13
   */
  createPurchaseOrder(dto: CreatePurchaseOrderDto): Observable<PurchaseOrder> {
    const validation = validateCreatePurchaseOrder(dto);
    if (!validation.valid) {
      return throwError(() => new Error(`Validation failed: ${validation.errors.join('; ')}`));
    }

    return this.http.post<PurchaseOrder>(
      PURCHASE_ORDER_ENDPOINTS.createPurchaseOrder(),
      dto
    ).pipe(
      catchError(error => this.handleError(error, 'createPurchaseOrder'))
    );
  }

  /**
   * GET /api/purchase-orders/:poId
   * Get a single purchase order by ID
   * Requirements: 7.7
   */
  getPurchaseOrder(poId: string): Observable<PurchaseOrder> {
    const idValidation = validateId(poId, 'poId');
    if (!idValidation.valid) {
      return throwError(() => new Error(idValidation.errors.join('; ')));
    }

    return this.http.get<PurchaseOrder>(
      PURCHASE_ORDER_ENDPOINTS.getPurchaseOrder(poId)
    ).pipe(
      retry(this.retryCount),
      catchError(error => this.handleError(error, 'getPurchaseOrder'))
    );
  }

  /**
   * PATCH /api/purchase-orders/:poId/status
   * Update purchase order status
   * Requirements: 7.7, 7.13
   */
  updatePurchaseOrderStatus(poId: string, status: PurchaseOrderStatus): Observable<PurchaseOrder> {
    const idValidation = validateId(poId, 'poId');
    if (!idValidation.valid) {
      return throwError(() => new Error(idValidation.errors.join('; ')));
    }

    if (!Object.values(PurchaseOrderStatus).includes(status)) {
      return throwError(() => new Error('Invalid purchase order status'));
    }

    return this.http.patch<PurchaseOrder>(
      PURCHASE_ORDER_ENDPOINTS.updateStatus(poId),
      { status }
    ).pipe(
      catchError(error => this.handleError(error, 'updatePurchaseOrderStatus'))
    );
  }

  // ============================================================================
  // Supplier Endpoints
  // ============================================================================

  /**
   * GET /api/suppliers
   * Get all suppliers
   * Requirements: 7.2, 7.5
   */
  getSuppliers(): Observable<Supplier[]> {
    return this.http.get<Supplier[]>(SUPPLIER_ENDPOINTS.getSuppliers()).pipe(
      retry(this.retryCount),
      catchError(error => this.handleError(error, 'getSuppliers'))
    );
  }

  /**
   * GET /api/suppliers/:supplierId
   * Get a single supplier by ID
   * Requirements: 7.2, 7.5
   */
  getSupplier(supplierId: string): Observable<Supplier> {
    const idValidation = validateId(supplierId, 'supplierId');
    if (!idValidation.valid) {
      return throwError(() => new Error(idValidation.errors.join('; ')));
    }

    return this.http.get<Supplier>(SUPPLIER_ENDPOINTS.getSupplier(supplierId)).pipe(
      retry(this.retryCount),
      catchError(error => this.handleError(error, 'getSupplier'))
    );
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private calculateReorderUrgency(recommendation: ReorderRecommendation): ReorderUrgency {
    const percentOfReorderPoint = (recommendation.currentQuantity / recommendation.reorderPoint) * 100;

    if (percentOfReorderPoint <= 0) {
      return ReorderUrgency.Critical;
    } else if (percentOfReorderPoint <= 25) {
      return ReorderUrgency.High;
    } else if (percentOfReorderPoint <= 50) {
      return ReorderUrgency.Medium;
    }
    return ReorderUrgency.Low;
  }

  private handleError(error: HttpErrorResponse, operation: string): Observable<never> {
    let message = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      message = `Client error: ${error.error.message}`;
    } else {
      switch (error.status) {
        case 400: message = 'Invalid material data'; break;
        case 403: message = 'Insufficient permissions'; break;
        case 404: message = 'Material or resource not found'; break;
        case 409: message = error.error?.message || 'Insufficient quantity or conflict'; break;
        case 502: message = 'Supplier integration failed'; break;
        default: message = `Server error: ${error.status}`;
      }
    }

    console.error(`MaterialsApiService.${operation}:`, message, error);
    return throwError(() => new Error(message));
  }
}
