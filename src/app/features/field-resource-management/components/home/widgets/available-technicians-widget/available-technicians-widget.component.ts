import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges
} from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { selectActiveTechnicians, selectTechniciansLoading, selectTechniciansError, selectTechniciansTotal } from '../../../../state/technicians/technician.selectors';
import { selectActiveAssignments } from '../../../../state/assignments/assignment.selectors';
import { Technician } from '../../../../models/technician.model';

@Component({
  selector: 'app-available-technicians-widget',
  templateUrl: './available-technicians-widget.component.html',
  styleUrls: ['./available-technicians-widget.component.scss']
})
export class AvailableTechniciansWidgetComponent implements OnInit, OnChanges, OnDestroy {
  /** Optional: when provided, only show technicians whose IDs are in this list */
  @Input() technicianIds: string[] | null = null;
  @Output() technicianSelected = new EventEmitter<string>();

  availableTechnicians$!: Observable<Technician[]>;
  availableCount$!: Observable<number>;
  totalCount$!: Observable<number>;
  loading$!: Observable<boolean>;
  error: string | null = null;

  // Pagination
  pageSize = 5;
  pageIndex = 0;

  private technicianIds$ = new BehaviorSubject<string[] | null>(null);
  private destroy$ = new Subject<void>();

  constructor(private store: Store) {}

  ngOnInit(): void {
    this.loading$ = this.store.select(selectTechniciansLoading);

    this.store.select(selectTechniciansError)
      .pipe(takeUntil(this.destroy$))
      .subscribe(err => this.error = err);

    this.availableTechnicians$ = combineLatest([
      this.store.select(selectActiveTechnicians),
      this.store.select(selectActiveAssignments),
      this.technicianIds$
    ]).pipe(
      map(([technicians, activeAssignments, teamIds]) => {
        const assignedTechIds = new Set(
          activeAssignments.map(a => a.technicianId)
        );
        let available = technicians.filter(t => !assignedTechIds.has(t.id));
        // Filter to team members only if technicianIds provided
        if (teamIds && teamIds.length > 0) {
          const teamSet = new Set(teamIds);
          available = available.filter(t => teamSet.has(t.id));
        }
        return available;
      })
    );

    this.availableCount$ = this.availableTechnicians$.pipe(
      map(techs => techs.length)
    );

    this.totalCount$ = this.store.select(selectTechniciansTotal);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['technicianIds']) {
      this.technicianIds$.next(this.technicianIds);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onTechnicianClick(id: string): void {
    this.technicianSelected.emit(id);
  }

  retry(): void {
    this.error = null;
  }

  onPageChange(event: any): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }
}
