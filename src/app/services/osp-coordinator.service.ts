import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface CoordinatorStat {
  description: string;
  value: number;
}

@Injectable({
  providedIn: 'root'
})
export class OspCoordinatorService {
  constructor() {}

  getStats(): Observable<CoordinatorStat[]> {
    // In a real app this would be an HTTP request. Using static data for now.
    const stats: CoordinatorStat[] = [
      { description: 'Total Tickets', value: 25 },
      { description: 'Resolved Tickets', value: 20 },
      { description: 'Open Tickets', value: 5 }
    ];
    return of(stats);
  }

  getMetrics(): Observable<CoordinatorStat[]> {
    // Reusing the same interface for simplicity
    const metrics: CoordinatorStat[] = [
      { description: 'Inspections Completed', value: 12 },
      { description: 'Permits Awaiting Approval', value: 3 },
      { description: 'Field Visits Scheduled', value: 10 }
    ];
    return of(metrics);
  }
}
