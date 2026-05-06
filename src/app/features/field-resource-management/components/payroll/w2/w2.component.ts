import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-w2',
  templateUrl: './w2.component.html',
  styleUrls: ['./w2.component.scss']
})
export class W2Component implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  taxYears = [2024, 2023, 2022, 2021];
  selectedYear: number = 2024;
  displayedColumns = ['year', 'employer', 'grossWages', 'federalWithheld', 'actions'];

  w2Forms: any[] = [];

  get filteredForms(): any[] {
    return this.w2Forms.filter(f => f.year === this.selectedYear);
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
