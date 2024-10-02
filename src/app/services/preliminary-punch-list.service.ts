import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { PreliminaryPunchList } from 'src/app/models/preliminary-punch-list.model';

@Injectable({
  providedIn: 'root'
})
export class PreliminaryPunchListService {
  // Use a BehaviorSubject to keep the list of entries and allow components to subscribe to changes
  private punchListEntriesSubject: BehaviorSubject<PreliminaryPunchList[]> = new BehaviorSubject<PreliminaryPunchList[]>([]);
  
  constructor() {}

  // Get the current value of the entries
  getEntries(): Observable<PreliminaryPunchList[]> {
    return this.punchListEntriesSubject.asObservable();
  }

  // Add a new entry to the list
  addEntry(entry: PreliminaryPunchList): void {
    const currentEntries = this.punchListEntriesSubject.value;
    this.punchListEntriesSubject.next([...currentEntries, entry]);
  }

  // Update an existing entry in the list
  updateEntry(index: number, updatedEntry: PreliminaryPunchList): void {
    const currentEntries = [...this.punchListEntriesSubject.value];
    currentEntries[index] = updatedEntry;
    this.punchListEntriesSubject.next(currentEntries);
  }

  // Remove an entry by index
  removeEntry(index: number): void {
    const currentEntries = [...this.punchListEntriesSubject.value];
    currentEntries.splice(index, 1);
    this.punchListEntriesSubject.next(currentEntries);
  }
}