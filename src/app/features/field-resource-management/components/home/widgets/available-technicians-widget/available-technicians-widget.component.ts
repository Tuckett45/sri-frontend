import {
  Component,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy
} from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject, combineLatest } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { selectActiveTechnicians, selectTechniciansLoading, selectTechniciansError } from '../../../../state/technicians/technician.selectors';
import { selectActiveAssignments } from '../../../../state/assignments/assignment.selectors';
import { Technician } from '../../../../models/technician.model';

@Component({
  selector: 'app-available-technicians-widget',
  templateUrl: './available-technicians-widget.component.html',
  styleUrls: ['./available-technicians-widget.component.scss']
})
export class AvailableTechniciansWidgetComponent implements OnInit, OnDestroy {
  @Output() technicianSelected = new EventEmitter<string>();

  availableTechnicians$!: Observable<Technician[]>;
  availableCount$!: Observable<number>;
  loading$!: Observable<boolean>;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(private store: Store) {}

  ngOnInit(): void {
    this.loading$ = this.store.select(selectTechniciansLoading);

    this.store.select(selectTechniciansError)
      .pipe(takeUntil(this.destroy$))
      .subscribe(err => this.error = err);

    this.availableTechnicians$ = combineLatest([
      this.store.select(selectActiveTechnicians),
      this.store.select(selectActiveAssignments)
    ]).pipe(
      map(([technicians, activeAssignments]) => {
        const assignedTechIds = new Set(
          activeAssignments.map(a => a.technicianId)
        );
        return technicians.filter(t => !assignedTechIds.has(t.id));
      })
    );

    this.availableCount$ = this.availableTechnicians$.pipe(
      map(techs => techs.length)
    );
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
}
