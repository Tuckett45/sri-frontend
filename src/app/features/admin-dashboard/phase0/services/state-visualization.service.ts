import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { StateHistory, StateTransition } from '../models/state-visualization.models';

@Injectable({
  providedIn: 'root'
})
export class StateVisualizationService {
  private readonly API_BASE = '/api/state';

  constructor(private http: HttpClient) {}

  getStateHistory(entityId: string, entityType: string): Observable<StateHistory> {
    return this.http.get<StateHistory>(`${this.API_BASE}/history/${entityType}/${entityId}`).pipe(
      catchError(error => {
        console.error('Error loading state history:', error);
        throw error;
      })
    );
  }

  getStateTransitions(
    entityId: string,
    entityType: string,
    filters?: { startDate?: Date; endDate?: Date; userId?: string }
  ): Observable<StateTransition[]> {
    const params: any = {};
    
    if (filters) {
      if (filters.startDate) params.startDate = filters.startDate.toISOString();
      if (filters.endDate) params.endDate = filters.endDate.toISOString();
      if (filters.userId) params.userId = filters.userId;
    }

    return this.http.get<StateTransition[]>(
      `${this.API_BASE}/transitions/${entityType}/${entityId}`,
      { params }
    ).pipe(
      catchError(error => {
        console.error('Error loading state transitions:', error);
        throw error;
      })
    );
  }

  exportStateDiagram(entityId: string, entityType: string, format: 'svg' | 'png'): Observable<Blob> {
    return this.http.get(`${this.API_BASE}/diagram/${entityType}/${entityId}/export`, {
      params: { format },
      responseType: 'blob'
    }).pipe(
      catchError(error => {
        console.error('Error exporting state diagram:', error);
        throw error;
      })
    );
  }
}
