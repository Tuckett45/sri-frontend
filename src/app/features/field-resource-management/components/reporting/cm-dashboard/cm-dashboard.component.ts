import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-cm-dashboard',
  templateUrl: './cm-dashboard.component.html',
  styleUrls: ['./cm-dashboard.component.scss']
})
export class CMDashboardComponent implements OnInit, OnDestroy {
  markets: any[] = [];
  activeProjects: any[] = [];
  pipelinePhases = [
    { phase: 'Pre-Construction', count: 0 },
    { phase: 'In Progress', count: 0 },
    { phase: 'Punch List', count: 0 },
    { phase: 'Complete', count: 0 }
  ];
  private destroy$ = new Subject<void>();

  constructor(private store: Store) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
