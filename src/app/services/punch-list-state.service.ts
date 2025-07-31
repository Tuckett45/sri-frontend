import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { PreliminaryPunchList } from '../models/preliminary-punch-list.model';

@Injectable({
  providedIn: 'root'
})
export class PunchListStateService {
  unresolved$ = new BehaviorSubject<PreliminaryPunchList[]>([]);
  resolved$ = new BehaviorSubject<PreliminaryPunchList[]>([]);

  setUnresolved(data: PreliminaryPunchList[]): void {
    this.unresolved$.next(data);
  }

  setResolved(data: PreliminaryPunchList[]): void {
    this.resolved$.next(data);
  }

  reset(): void {
    this.unresolved$.next([]);
    this.resolved$.next([]);
  }
}
