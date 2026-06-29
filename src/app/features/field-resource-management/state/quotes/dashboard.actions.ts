import { createAction, props } from '@ngrx/store';
import {
  BomTracking,
  BulkImportRecord,
  DashboardFilters,
  DashboardQuote,
  DashboardResponse,
  DashboardUser
} from '../../models/quote-workflow.model';

// Load Dashboard
export const loadDashboard = createAction(
  '[Dashboard] Load Dashboard',
  props<{ filters?: DashboardFilters }>()
);

export const loadDashboardSuccess = createAction(
  '[Dashboard] Load Dashboard Success',
  props<{ response: DashboardResponse }>()
);

export const loadDashboardFailure = createAction(
  '[Dashboard] Load Dashboard Failure',
  props<{ error: string }>()
);

// Update Filters
export const updateFilters = createAction(
  '[Dashboard] Update Filters',
  props<{ filters: DashboardFilters }>()
);

// Load Users
export const loadUsers = createAction('[Dashboard] Load Users');

export const loadUsersSuccess = createAction(
  '[Dashboard] Load Users Success',
  props<{ users: DashboardUser[] }>()
);

export const loadUsersFailure = createAction(
  '[Dashboard] Load Users Failure',
  props<{ error: string }>()
);

// Inline Edit
export const updateDashboardFields = createAction(
  '[Dashboard] Update Dashboard Fields',
  props<{ quoteId: string; fields: Partial<DashboardQuote> }>()
);

export const updateDashboardFieldsSuccess = createAction(
  '[Dashboard] Update Dashboard Fields Success',
  props<{ quote: DashboardQuote }>()
);

export const updateDashboardFieldsFailure = createAction(
  '[Dashboard] Update Dashboard Fields Failure',
  props<{ error: string }>()
);

// BOM Tracking
export const createBomTracking = createAction(
  '[Dashboard] Create BOM Tracking',
  props<{ quoteId: string; entry: Partial<BomTracking> }>()
);

export const createBomTrackingSuccess = createAction(
  '[Dashboard] Create BOM Tracking Success',
  props<{ quoteId: string; tracking: BomTracking }>()
);

export const createBomTrackingFailure = createAction(
  '[Dashboard] Create BOM Tracking Failure',
  props<{ error: string }>()
);


// Bulk Import RFPs
export const bulkImportRfps = createAction(
  '[Dashboard] Bulk Import RFPs',
  props<{ records: BulkImportRecord[] }>()
);

export const bulkImportRfpsSuccess = createAction(
  '[Dashboard] Bulk Import RFPs Success',
  props<{ importedCount: number; failedCount: number; errors: string[] }>()
);

export const bulkImportRfpsFailure = createAction(
  '[Dashboard] Bulk Import RFPs Failure',
  props<{ error: string }>()
);
