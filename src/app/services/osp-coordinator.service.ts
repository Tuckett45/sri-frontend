import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { OspCoordinatorItem } from '../models/osp-coordinator-item.model';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
  providedIn: 'root'
})
export class OspCoordinatorService {
  private nextId = 1;
  private entriesSubject = new BehaviorSubject<OspCoordinatorItem[]>([{
    id: uuidv4(),
    segmentId: 'SEG-001',
    vendor: 'Congruex (SCI)',
    crew: '',
    materialOrder: '',
    date: '',
    workPackageCreated: '',
    amount: undefined,
    workPackageAmount: undefined,
    originalContinuingCost: undefined,
    highCostAnalysis: '',
    ntp: '',
    asbuiltSubmitted: '',
    coordinatorCloseout: '',
    amendmentVersion: undefined,
    amendmentAmount: undefined,
    continuingAmount: undefined,
    amendmentReason: '',
    adminAudit: undefined,
    adminAuditDate: '',
    pass: true,
    passFailReason: ''
  }]);

  constructor() {}

  getStats(): Observable<any[]> {
    // Placeholder for potential dashboard metrics
    return of([]);
  }

  getEntries(): Observable<OspCoordinatorItem[]> {
    return this.entriesSubject.asObservable();
  }

  addEntry(entry: OspCoordinatorItem): Observable<void> {
    entry.id = uuidv4();
    const current = this.entriesSubject.getValue();
    this.entriesSubject.next([...current, entry]);
    return of();
  }

  updateEntry(entry: OspCoordinatorItem): Observable<void> {
    const current = this.entriesSubject.getValue();
    const index = current.findIndex(m => m.id === entry.id);
    if (index !== -1) {
      current[index] = entry;
      this.entriesSubject.next([...current]);
    }
    return of();
  }

  deleteEntry(id: string): Observable<void> {
    const current = this.entriesSubject.getValue();
    this.entriesSubject.next(current.filter(m => m.id !== id));
    return of();
  }
}
