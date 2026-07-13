import { createReducer, on } from '@ngrx/store';
import { DashboardState, initialDashboardState } from './dashboard.state';
import * as DashboardActions from './dashboard.actions';
import { DashboardQuote } from '../../models/quote-workflow.model';

/**
 * Helper to determine which phase a quote belongs to based on its workflowStatus.
 */
function getQuotePhase(quote: DashboardQuote): 'rfp' | 'poTracking' | 'projectTracking' {
  const rfpStatuses = ['Draft', 'Quote_Submitted', 'Job_Summary_In_Progress'];
  const poStatuses = ['PO_Tracking', 'PO_Received', 'Quote_Assembled', 'Quote_Delivered'];
  const projectStatuses = ['Project_Active', 'Closed_Out', 'Quote_Converted'];

  if (projectStatuses.includes(quote.workflowStatus || '')) return 'projectTracking';
  if (poStatuses.includes(quote.workflowStatus || '')) return 'poTracking';
  return 'rfp';
}

/**
 * Helper to remove a quote from all three arrays by ID.
 */
function removeQuoteFromAllArrays(state: DashboardState, quoteId: string): DashboardState {
  return {
    ...state,
    rfpRecords: state.rfpRecords.filter(q => q.id !== quoteId),
    poTrackingRecords: state.poTrackingRecords.filter(q => q.id !== quoteId),
    projectTrackingRecords: state.projectTrackingRecords.filter(q => q.id !== quoteId)
  };
}

/**
 * Helper to place an updated quote into the correct phase array based on its workflowStatus.
 * Removes it from all arrays first, then inserts into the correct one.
 */
function recategorizeQuote(state: DashboardState, updatedQuote: DashboardQuote): DashboardState {
  const cleaned = removeQuoteFromAllArrays(state, updatedQuote.id);
  const phase = getQuotePhase(updatedQuote);

  switch (phase) {
    case 'rfp':
      return { ...cleaned, rfpRecords: [updatedQuote, ...cleaned.rfpRecords] };
    case 'poTracking':
      return { ...cleaned, poTrackingRecords: [updatedQuote, ...cleaned.poTrackingRecords] };
    case 'projectTracking':
      return { ...cleaned, projectTrackingRecords: [updatedQuote, ...cleaned.projectTrackingRecords] };
  }
}

/**
 * Helper to update a quote record across all three record arrays (without moving it).
 */
function updateQuoteInArrays(state: DashboardState, updatedQuote: DashboardQuote): DashboardState {
  const updateArray = (arr: DashboardQuote[]) =>
    arr.map(q => q.id === updatedQuote.id ? updatedQuote : q);

  return {
    ...state,
    rfpRecords: updateArray(state.rfpRecords),
    poTrackingRecords: updateArray(state.poTrackingRecords),
    projectTrackingRecords: updateArray(state.projectTrackingRecords)
  };
}

export const dashboardReducer = createReducer(
  initialDashboardState,

  // Load Dashboard
  on(DashboardActions.loadDashboard, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(DashboardActions.loadDashboardSuccess, (state, { response }) => ({
    ...state,
    rfpRecords: response.rfpRecords,
    poTrackingRecords: response.poTrackingRecords,
    projectTrackingRecords: response.projectTrackingRecords,
    loading: false,
    error: null
  })),

  on(DashboardActions.loadDashboardFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Update Filters
  on(DashboardActions.updateFilters, (state, { filters }) => ({
    ...state,
    filters
  })),

  // Load Users
  on(DashboardActions.loadUsersSuccess, (state, { users }) => ({
    ...state,
    users
  })),

  // Inline Edit
  on(DashboardActions.updateDashboardFields, (state) => ({
    ...state,
    saving: true,
    error: null
  })),

  on(DashboardActions.updateDashboardFieldsSuccess, (state, { quote }) => ({
    ...recategorizeQuote(state, quote),
    saving: false,
    error: null
  })),

  on(DashboardActions.updateDashboardFieldsFailure, (state, { error }) => ({
    ...state,
    saving: false,
    error
  })),

  // BOM Tracking
  on(DashboardActions.createBomTracking, (state) => ({
    ...state,
    saving: true,
    error: null
  })),

  on(DashboardActions.createBomTrackingSuccess, (state, { quoteId, tracking }) => {
    const projectTrackingRecords = state.projectTrackingRecords.map(q => {
      if (q.id === quoteId) {
        return { ...q, bomTrackings: [...q.bomTrackings, tracking] };
      }
      return q;
    });
    return {
      ...state,
      projectTrackingRecords,
      saving: false,
      error: null
    };
  }),

  on(DashboardActions.createBomTrackingFailure, (state, { error }) => ({
    ...state,
    saving: false,
    error
  })),

  // Delete RFP
  on(DashboardActions.deleteRfpSuccess, (state, { quoteId }) => ({
    ...state,
    rfpRecords: state.rfpRecords.filter(q => q.id !== quoteId),
    poTrackingRecords: state.poTrackingRecords.filter(q => q.id !== quoteId),
    projectTrackingRecords: state.projectTrackingRecords.filter(q => q.id !== quoteId)
  })),

  // ─── Notes ────────────────────────────────────────────────────────────────

  // Load Notes Success
  on(DashboardActions.loadNotesSuccess, (state, { quoteId, notes }) => {
    return updateNotesInArrays(state, quoteId, notes);
  }),

  // Add Note Success
  on(DashboardActions.addNoteSuccess, (state, { quoteId, note }) => {
    return addNoteToArrays(state, quoteId, note);
  }),

  // Update Note Success
  on(DashboardActions.updateNoteSuccess, (state, { quoteId, note }) => {
    return updateNoteInArrays(state, quoteId, note);
  }),

  // Toggle Pin Success
  on(DashboardActions.toggleNotePinSuccess, (state, { quoteId, note }) => {
    return updateNoteInArrays(state, quoteId, note);
  }),

  // Delete Note Success
  on(DashboardActions.deleteNoteSuccess, (state, { quoteId, noteId }) => {
    return deleteNoteFromArrays(state, quoteId, noteId);
  })
);

// ─── Notes Helpers ──────────────────────────────────────────────────────────

function updateNotesInArrays(state: DashboardState, quoteId: string, notes: any[]): DashboardState {
  const updateArray = (arr: DashboardQuote[]) =>
    arr.map(q => q.id === quoteId ? { ...q, notes } : q);
  return {
    ...state,
    rfpRecords: updateArray(state.rfpRecords),
    poTrackingRecords: updateArray(state.poTrackingRecords),
    projectTrackingRecords: updateArray(state.projectTrackingRecords)
  };
}

function addNoteToArrays(state: DashboardState, quoteId: string, note: any): DashboardState {
  const updateArray = (arr: DashboardQuote[]) =>
    arr.map(q => q.id === quoteId ? { ...q, notes: [...(q.notes || []), note] } : q);
  return {
    ...state,
    rfpRecords: updateArray(state.rfpRecords),
    poTrackingRecords: updateArray(state.poTrackingRecords),
    projectTrackingRecords: updateArray(state.projectTrackingRecords)
  };
}

function updateNoteInArrays(state: DashboardState, quoteId: string, updatedNote: any): DashboardState {
  const updateArray = (arr: DashboardQuote[]) =>
    arr.map(q => {
      if (q.id === quoteId) {
        const notes = (q.notes || []).map(n => n.id === updatedNote.id ? updatedNote : n);
        return { ...q, notes };
      }
      return q;
    });
  return {
    ...state,
    rfpRecords: updateArray(state.rfpRecords),
    poTrackingRecords: updateArray(state.poTrackingRecords),
    projectTrackingRecords: updateArray(state.projectTrackingRecords)
  };
}

function deleteNoteFromArrays(state: DashboardState, quoteId: string, noteId: string): DashboardState {
  const updateArray = (arr: DashboardQuote[]) =>
    arr.map(q => {
      if (q.id === quoteId) {
        const notes = (q.notes || []).filter(n => n.id !== noteId);
        return { ...q, notes };
      }
      return q;
    });
  return {
    ...state,
    rfpRecords: updateArray(state.rfpRecords),
    poTrackingRecords: updateArray(state.poTrackingRecords),
    projectTrackingRecords: updateArray(state.projectTrackingRecords)
  };
}
