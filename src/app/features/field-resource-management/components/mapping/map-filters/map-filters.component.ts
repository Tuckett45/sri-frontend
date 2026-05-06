import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-map-filters',
  templateUrl: './map-filters.component.html',
  styleUrls: ['./map-filters.component.scss']
})
export class MapFiltersComponent implements OnInit, OnDestroy {
  @Output() filtersChanged = new EventEmitter<any>();
  form: FormGroup;
  statuses = ['available', 'assigned', 'on-break', 'off-duty'];
  markets: string[] = [];
  private destroy$ = new Subject<void>();

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      showTechnicians: [true],
      showJobs: [true],
      statuses: [[]],
      markets: [[]]
    });
  }

  ngOnInit(): void {
    this.form.valueChanges
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(v => this.filtersChanged.emit(v));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  resetFilters(): void {
    this.form.reset({ showTechnicians: true, showJobs: true, statuses: [], markets: [] });
  }
}
