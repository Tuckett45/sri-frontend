import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Observable } from 'rxjs';
import { Store } from '@ngrx/store';
import { StateTransition } from '../../models/state-visualization.models';
import { selectSortedTransitions, selectStateHistoryLoading } from '../../state/state-history/state-history.selectors';
import { loadStateTransitions } from '../../state/state-history/state-history.actions';

@Component({
  selector: 'app-state-timeline',
  templateUrl: './state-timeline.component.html',
  styleUrls: ['./state-timeline.component.scss']
})
export class StateTimelineComponent implements OnInit {
  @Input() entityId!: string;
  @Input() entityType!: string;
  @Output() transitionSelected = new EventEmitter<StateTransition>();

  // Observables
  timeline$!: Observable<StateTransition[]>;
  loading$!: Observable<boolean>;

  // Display options
  groupByDate: boolean = true;
  showMetadata: boolean = true;
  compactView: boolean = false;

  // Filtering
  filteredTimeline: StateTransition[] = [];
  dateRangeStart: Date | null = null;
  dateRangeEnd: Date | null = null;
  selectedUserId: string | null = null;

  constructor(private store: Store) {}

  ngOnInit(): void {
    this.loadTimeline();
    this.timeline$ = this.store.select(selectSortedTransitions);
    this.loading$ = this.store.select(selectStateHistoryLoading);

    // Subscribe to timeline changes for filtering
    this.timeline$.subscribe(transitions => {
      this.filteredTimeline = this.applyFilters(transitions);
    });
  }

  loadTimeline(): void {
    if (this.entityId && this.entityType) {
      this.store.dispatch(loadStateTransitions({ 
        entityId: this.entityId, 
        entityType: this.entityType 
      }));
    }
  }

  filterByDateRange(start: Date, end: Date): void {
    this.dateRangeStart = start;
    this.dateRangeEnd = end;
    this.timeline$.subscribe(transitions => {
      this.filteredTimeline = this.applyFilters(transitions);
    });
  }

  filterByUser(userId: string): void {
    this.selectedUserId = userId;
    this.timeline$.subscribe(transitions => {
      this.filteredTimeline = this.applyFilters(transitions);
    });
  }

  clearFilters(): void {
    this.dateRangeStart = null;
    this.dateRangeEnd = null;
    this.selectedUserId = null;
    this.timeline$.subscribe(transitions => {
      this.filteredTimeline = this.applyFilters(transitions);
    });
  }

  private applyFilters(transitions: StateTransition[]): StateTransition[] {
    let filtered = [...transitions];

    // Filter by date range
    if (this.dateRangeStart && this.dateRangeEnd) {
      filtered = filtered.filter(t => {
        const transitionDate = new Date(t.timestamp);
        return transitionDate >= this.dateRangeStart! && transitionDate <= this.dateRangeEnd!;
      });
    }

    // Filter by user
    if (this.selectedUserId) {
      filtered = filtered.filter(t => t.userId === this.selectedUserId);
    }

    return filtered;
  }

  exportTimeline(format: 'csv' | 'json'): void {
    if (format === 'csv') {
      this.exportAsCSV();
    } else {
      this.exportAsJSON();
    }
  }

  private exportAsCSV(): void {
    const headers = ['Timestamp', 'From State', 'To State', 'Trigger', 'User', 'Reason'];
    const rows = this.filteredTimeline.map(t => [
      new Date(t.timestamp).toISOString(),
      t.fromState,
      t.toState,
      t.trigger,
      t.userName,
      t.reason || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    this.downloadFile(csvContent, 'state-timeline.csv', 'text/csv');
  }

  private exportAsJSON(): void {
    const jsonContent = JSON.stringify(this.filteredTimeline, null, 2);
    this.downloadFile(jsonContent, 'state-timeline.json', 'application/json');
  }

  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  onTransitionClick(transition: StateTransition): void {
    this.transitionSelected.emit(transition);
  }

  toggleGroupByDate(): void {
    this.groupByDate = !this.groupByDate;
  }

  toggleMetadata(): void {
    this.showMetadata = !this.showMetadata;
  }

  toggleCompactView(): void {
    this.compactView = !this.compactView;
  }

  getGroupedTimeline(): { date: string; transitions: StateTransition[] }[] {
    if (!this.groupByDate) {
      return [];
    }

    const grouped = new Map<string, StateTransition[]>();
    
    this.filteredTimeline.forEach(transition => {
      const date = new Date(transition.timestamp).toLocaleDateString();
      if (!grouped.has(date)) {
        grouped.set(date, []);
      }
      grouped.get(date)!.push(transition);
    });

    return Array.from(grouped.entries()).map(([date, transitions]) => ({
      date,
      transitions
    }));
  }

  getUniqueUsers(): { userId: string; userName: string }[] {
    const users = new Map<string, string>();
    this.filteredTimeline.forEach(t => {
      if (!users.has(t.userId)) {
        users.set(t.userId, t.userName);
      }
    });
    return Array.from(users.entries()).map(([userId, userName]) => ({ userId, userName }));
  }

  formatTimestamp(timestamp: Date): string {
    return new Date(timestamp).toLocaleString();
  }

  formatDate(timestamp: Date): string {
    return new Date(timestamp).toLocaleDateString();
  }

  formatTime(timestamp: Date): string {
    return new Date(timestamp).toLocaleTimeString();
  }
}
