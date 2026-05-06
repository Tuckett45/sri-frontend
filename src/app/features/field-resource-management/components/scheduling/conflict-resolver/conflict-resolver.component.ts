import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export interface SchedulingConflict {
  id: string;
  description: string;
  affectedTechnicians: string[];
  affectedJobs: string[];
  resolutionOptions: { label: string; action: string }[];
  resolved: boolean;
}

@Component({
  selector: 'app-conflict-resolver',
  templateUrl: './conflict-resolver.component.html',
  styleUrls: ['./conflict-resolver.component.scss']
})
export class ConflictResolverComponent implements OnInit, OnDestroy {
  conflicts: SchedulingConflict[] = [];
  resolving = false;
  private destroy$ = new Subject<void>();

  constructor(private store: Store) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  autoResolve(conflict: SchedulingConflict): void {
    conflict.resolved = true;
  }

  manualResolve(conflict: SchedulingConflict, option: { label: string; action: string }): void {
    conflict.resolved = true;
  }

  autoResolveAll(): void {
    this.conflicts.forEach(c => (c.resolved = true));
  }

  get unresolvedCount(): number {
    return this.conflicts.filter(c => !c.resolved).length;
  }
}
