import { createReducer, on } from '@ngrx/store';
import { DashboardState, initialDashboardState } from './dashboard.state';
import * as DashboardActions from './dashboard.actions';
import { DashboardQuote } from '../../models/quote-workflow.model';

/**
 * Helper to update a quote record across all three record arrays.
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
    ...updateQuoteInArrays(state, quote),
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
