import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';

export interface CoordinatorStat {
  id: number;
  description: string;
  value: number;
}

@Injectable({
  providedIn: 'root'
})
export class OspCoordinatorService {
  private nextId = 1;
  private metricsSubject = new BehaviorSubject<CoordinatorStat[]>([
    { id: this.nextId++, description: 'Inspections Completed', value: 12 },
    { id: this.nextId++, description: 'Permits Awaiting Approval', value: 3 },
    { id: this.nextId++, description: 'Field Visits Scheduled', value: 10 }
  ]);

  constructor() {}

  getStats(): Observable<CoordinatorStat[]> {
    // In a real app this would be an HTTP request. Using static data for now.
    const stats: CoordinatorStat[] = [
      { id: 1, description: 'Total Tickets', value: 25 },
      { id: 2, description: 'Resolved Tickets', value: 20 },
      { id: 3, description: 'Open Tickets', value: 5 }
    ];
    return of(stats);
  }

  getMetrics(): Observable<CoordinatorStat[]> {
    return this.metricsSubject.asObservable();
  }

  addMetric(metric: CoordinatorStat): Observable<void> {
    metric.id = this.nextId++;
    const current = this.metricsSubject.getValue();
    this.metricsSubject.next([...current, metric]);
    return of();
  }

  updateMetric(metric: CoordinatorStat): Observable<void> {
    const current = this.metricsSubject.getValue();
    const index = current.findIndex(m => m.id === metric.id);
    if (index !== -1) {
      current[index] = metric;
      this.metricsSubject.next([...current]);
    }
    return of();
  }

  deleteMetric(id: number): Observable<void> {
    const current = this.metricsSubject.getValue();
    this.metricsSubject.next(current.filter(m => m.id !== id));
    return of();
  }
}
