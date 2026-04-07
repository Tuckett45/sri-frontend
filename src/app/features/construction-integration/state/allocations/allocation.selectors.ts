import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AllocationState, allocationAdapter } from './allocation.state';
import { selectAllProjects } from '../projects/project.selectors';
import { Project, ProjectCategory, ResourceAllocation } from '../../models/construction.models';

export const selectAllocationState = createFeatureSelector<AllocationState>('constructionAllocations');

const { selectAll, selectEntities } = allocationAdapter.getSelectors(selectAllocationState);

export const selectAllAllocations = selectAll;
export const selectAllocationEntities = selectEntities;

export const selectSelectedYear = createSelector(
  selectAllocationState,
  state => state.selectedYear
);

export const selectAllocationsLoading = createSelector(
  selectAllocationState,
  state => state.loading
);

export const selectAllocationsSaving = createSelector(
  selectAllocationState,
  state => state.saving
);

export const selectAllocationsError = createSelector(
  selectAllocationState,
  state => state.error
);

// --- Grid types ---

export interface GridCell {
  month: number;
  headcount: number;
  allocationId: string | null;
}

export interface GridRow {
  project: Project;
  months: GridCell[];
  total: number;
}

export interface CategoryGroup {
  category: ProjectCategory;
  rows: GridRow[];
  monthTotals: number[];
}

export interface AllocationGrid {
  year: number;
  categories: CategoryGroup[];
}

// --- Grid builder ---

export function buildAllocationGrid(
  projects: Project[],
  allocations: ResourceAllocation[],
  year: number
): AllocationGrid {
  const allocationMap = new Map<string, ResourceAllocation>();
  for (const a of allocations) {
    allocationMap.set(`${a.projectId}_${a.month}`, a);
  }

  const categoryOrder: ProjectCategory[] = [
    ProjectCategory.BULK_LABOR_SUPPORT,
    ProjectCategory.HYPERSCALE_DEPLOYMENT
  ];

  const categories: CategoryGroup[] = categoryOrder.map(category => {
    const categoryProjects = projects.filter(p => p.category === category);
    const monthTotals = new Array<number>(12).fill(0);

    const rows: GridRow[] = categoryProjects.map(project => {
      const months: GridCell[] = [];
      let rowTotal = 0;

      for (let m = 1; m <= 12; m++) {
        const alloc = allocationMap.get(`${project.id}_${m}`);
        const headcount = alloc ? alloc.headcount : 0;
        months.push({
          month: m,
          headcount,
          allocationId: alloc ? alloc.id : null
        });
        rowTotal += headcount;
        monthTotals[m - 1] += headcount;
      }

      return { project, months, total: rowTotal };
    });

    return { category, rows, monthTotals };
  });

  return { year, categories };
}

// --- Memoized grid selector ---

export const selectAllocationGrid = createSelector(
  selectAllProjects,
  selectAllAllocations,
  selectSelectedYear,
  (projects, allocations, year) => buildAllocationGrid(projects, allocations, year)
);
