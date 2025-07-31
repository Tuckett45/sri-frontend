import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { PreliminaryPunchList } from '../models/preliminary-punch-list.model';

@Injectable({
  providedIn: 'root'
})
export class PunchListStateService {
  unresolved$ = new BehaviorSubject<PreliminaryPunchList[]>([]);
  resolved$ = new BehaviorSubject<PreliminaryPunchList[]>([]);
  unresolvedPage = 0;
  resolvedPage = 0;
  pageSize = 10;
  setUnresolved(data: PreliminaryPunchList[], page?: number, size?: number): void {
    this.unresolved$.next(data);
    if (page !== undefined) {
      this.unresolvedPage = page;
    }
    if (size !== undefined) {
      this.pageSize = size;
    }
  }

  setResolved(data: PreliminaryPunchList[], page?: number, size?: number): void {
    this.resolved$.next(data);
    if (page !== undefined) {
      this.resolvedPage = page;
    }
    if (size !== undefined) {
      this.pageSize = size;
    }
  }

  reset(): void {
    this.unresolved$.next([]);
    this.resolved$.next([]);
    this.unresolvedPage = 0;
    this.resolvedPage = 0;
    this.pageSize = 10;
  }
}
