import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';

import { AuthService } from '../../../../services/auth.service';
import { CsvExportService } from '../../services/csv-export.service';
import { ProjectCategory, ResourceAllocation } from '../../models/construction.models';
import * as ProjectActions from '../../state/projects/project.actions';
import * as AllocationActions from '../../state/allocations/allocation.actions';
import {
  selectAllocationGrid,
  selectSelectedYear,
  selectAllocationsLoading,
  selectAllocationsSaving,
  selectAllocationsError,
  AllocationGrid,
  GridCell,
  CategoryGroup
} from '../../state/allocations/allocation.selectors';
import { selectAllProjects } from '../../state/projects/project.selectors';
import { selectAllAllocations } from '../../state/allocations/allocation.selectors';

@Component({
  selector: 'app-forecast-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './forecast-dashboard.component.html',
  styleUrls: ['./forecast-dashboard.component.scss']
})
export class ForecastDashboardComponent implements OnInit {
  readonly MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  isAdmin = false;
  grid$: Observable<AllocationGrid>;
  selectedYear$: Observable<number>;
  loading$: Observable<boolean>;
  saving$: Observable<boolean>;
  error$: Observable<string | null>;

  editingCell: { projectId: string; month: number } | null = null;
  editValue = '';

  constructor(
    private store: Store,
    private authService: AuthService,
    private csvExportService: CsvExportService
  ) {
    this.isAdmin = this.authService.isAdmin();
    this.grid$ = this.store.select(selectAllocationGrid);
    this.selectedYear$ = this.store.select(selectSelectedYear);
    this.loading$ = this.store.select(selectAllocationsLoading);
    this.saving$ = this.store.select(selectAllocationsSaving);
    this.error$ = this.store.select(selectAllocationsError);
  }

  ngOnInit(): void {
    this.store.dispatch(ProjectActions.loadProjects());
    const currentYear = new Date().getFullYear();
    this.store.dispatch(AllocationActions.loadAllocations({ year: currentYear }));
  }

  onYearChange(year: number): void {
    this.store.dispatch(AllocationActions.selectYear({ year }));
    this.store.dispatch(AllocationActions.loadAllocations({ year }));
  }

  getCategoryLabel(category: ProjectCategory): string {
    return category === ProjectCategory.BULK_LABOR_SUPPORT
      ? 'Bulk Labor Support'
      : 'Hyperscale Deployment';
  }

  startEdit(projectId: string, cell: GridCell): void {
    if (!this.isAdmin) return;
    this.editingCell = { projectId, month: cell.month };
    this.editValue = cell.headcount > 0 ? String(cell.headcount) : '';
  }

  cancelEdit(): void {
    this.editingCell = null;
    this.editValue = '';
  }

  isEditing(projectId: string, month: number): boolean {
    return this.editingCell?.projectId === projectId && this.editingCell?.month === month;
  }

  saveEdit(cell: GridCell, projectId: string, year: number): void {
    const parsed = Number(this.editValue);
    if (this.editValue === '' || isNaN(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
      // reject non-numeric / negative / non-integer
      return;
    }

    const previousAllocation: ResourceAllocation = {
      id: cell.allocationId || '',
      projectId,
      year,
      month: cell.month,
      headcount: cell.headcount
    };

    const updatedAllocation: ResourceAllocation = {
      ...previousAllocation,
      headcount: parsed
    };

    this.store.dispatch(AllocationActions.updateAllocation({
      allocation: updatedAllocation,
      previousAllocation
    }));

    this.editingCell = null;
    this.editValue = '';
  }

  exportForecast(grid: AllocationGrid): void {
    const projects = grid.categories.flatMap(c => c.rows.map(r => r.project));
    const allocations = grid.categories.flatMap(c =>
      c.rows.flatMap(r =>
        r.months
          .filter(m => m.headcount > 0)
          .map(m => ({
            id: m.allocationId || '',
            projectId: r.project.id,
            year: grid.year,
            month: m.month,
            headcount: m.headcount
          }))
      )
    );
    this.csvExportService.exportForecast(projects, allocations, grid.year);
  }

  getYearOptions(currentYear: number): number[] {
    return [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2];
  }
}
