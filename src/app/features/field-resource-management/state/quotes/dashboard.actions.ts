import { createAction, props } from '@ngrx/store';
import {
  BomTracking,
  BulkImportRecord,
  DashboardFilters,
  DashboardQuote,
  DashboardResponse,
  DashboardUser,
  RfpNote
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


// Delete RFP
export const deleteRfp = createAction(
  '[Dashboard] Delete RFP',
  props<{ quoteId: string }>()
);

export const deleteRfpSuccess = createAction(
  '[Dashboard] Delete RFP Success',
  props<{ quoteId: string }>()
);

export const deleteRfpFailure = createAction(
  '[Dashboard] Delete RFP Failure',
  props<{ error: string }>()
);



// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

// Load Notes
export const loadNotes = createAction(
  '[Dashboard] Load Notes',
  props<{ quoteId: string }>()
);

export const loadNotesSuccess = createAction(
  '[Dashboard] Load Notes Success',
  props<{ quoteId: string; notes: RfpNote[] }>()
);

export const loadNotesFailure = createAction(
  '[Dashboard] Load Notes Failure',
  props<{ error: string }>()
);

// Add Note
export const addNote = createAction(
  '[Dashboard] Add Note',
  props<{ quoteId: string; content: string }>()
);

export const addNoteSuccess = createAction(
  '[Dashboard] Add Note Success',
  props<{ quoteId: string; note: RfpNote }>()
);

export const addNoteFailure = createAction(
  '[Dashboard] Add Note Failure',
  props<{ error: string }>()
);

// Update Note
export const updateNote = createAction(
  '[Dashboard] Update Note',
  props<{ quoteId: string; noteId: string; content: string }>()
);

export const updateNoteSuccess = createAction(
  '[Dashboard] Update Note Success',
  props<{ quoteId: string; note: RfpNote }>()
);

export const updateNoteFailure = createAction(
  '[Dashboard] Update Note Failure',
  props<{ error: string }>()
);

// Toggle Pin
export const toggleNotePin = createAction(
  '[Dashboard] Toggle Note Pin',
  props<{ quoteId: string; noteId: string; isPinned: boolean }>()
);

export const toggleNotePinSuccess = createAction(
  '[Dashboard] Toggle Note Pin Success',
  props<{ quoteId: string; note: RfpNote }>()
);

export const toggleNotePinFailure = createAction(
  '[Dashboard] Toggle Note Pin Failure',
  props<{ error: string }>()
);

// Delete Note
export const deleteNote = createAction(
  '[Dashboard] Delete Note',
  props<{ quoteId: string; noteId: string }>()
);

export const deleteNoteSuccess = createAction(
  '[Dashboard] Delete Note Success',
  props<{ quoteId: string; noteId: string }>()
);

export const deleteNoteFailure = createAction(
  '[Dashboard] Delete Note Failure',
  props<{ error: string }>()
);
