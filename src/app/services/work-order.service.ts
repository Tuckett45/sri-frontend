import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environments';
import {
  WorkOrder,
  WorkOrderListItem,
  CreateWorkOrderRequest,
  UpdateWorkOrderRequest
} from '../models/work-order.model';
import { WorkOrderStatus, WorkOrderPriority } from '../models/technician-status.enum';

@Injectable({
  providedIn: 'root'
})
export class WorkOrderService {
  private readonly baseUrl = `${environment.apiUrl}/workorders`;
  
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': environment.apiSubscriptionKey
    })
  };

  constructor(private http: HttpClient) {}

  getAllWorkOrders(
    status?: WorkOrderStatus,
    priority?: WorkOrderPriority,
    assignedOnly?: boolean
  ): Observable<WorkOrderListItem[]> {
    let params = new HttpParams();
    
    if (status) {
      params = params.set('status', status);
    }
    if (priority !== undefined) {
      params = params.set('priority', priority.toString());
    }
    if (assignedOnly !== undefined) {
      params = params.set('assignedOnly', assignedOnly.toString());
    }

    return this.http.get<WorkOrderListItem[]>(this.baseUrl, {
      ...this.httpOptions,
      params
    });
  }

  getWorkOrderById(id: string): Observable<WorkOrder> {
    return this.http.get<WorkOrder>(`${this.baseUrl}/${id}`, this.httpOptions);
  }

  getUnassignedWorkOrders(): Observable<WorkOrderListItem[]> {
    return this.http.get<WorkOrderListItem[]>(
      `${this.baseUrl}/unassigned`,
      this.httpOptions
    );
  }

  getOverdueWorkOrders(): Observable<WorkOrderListItem[]> {
    return this.http.get<WorkOrderListItem[]>(
      `${this.baseUrl}/overdue`,
      this.httpOptions
    );
  }

  getWorkOrdersByTechnician(technicianId: string): Observable<WorkOrder[]> {
    return this.http.get<WorkOrder[]>(
      `${this.baseUrl}/technician/${technicianId}`,
      this.httpOptions
    );
  }

  createWorkOrder(request: CreateWorkOrderRequest): Observable<WorkOrder> {
    return this.http.post<WorkOrder>(this.baseUrl, request, this.httpOptions);
  }

  updateWorkOrder(id: string, request: UpdateWorkOrderRequest): Observable<WorkOrder> {
    return this.http.put<WorkOrder>(
      `${this.baseUrl}/${id}`,
      request,
      this.httpOptions
    );
  }

  deleteWorkOrder(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`, this.httpOptions);
  }

  uploadAttachment(workOrderId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    const headers = new HttpHeaders({
      'Ocp-Apim-Subscription-Key': environment.apiSubscriptionKey
    });

    return this.http.post(
      `${this.baseUrl}/${workOrderId}/attachments`,
      formData,
      { headers }
    );
  }
}
