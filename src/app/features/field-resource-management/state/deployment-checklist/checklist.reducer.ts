/**
 * Deployment Checklist Reducer
 * Manages deployment checklist state transitions for all actions
 */

import { createReducer, on } from '@ngrx/store';
import { ChecklistState, initialChecklistState } from './checklist.state';
import * as ChecklistActions from './checklist.actions';

export const checklistReducer = createReducer(
  initialChecklistState,

  // Load Checklist
  on(ChecklistActions.loadChecklist, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(ChecklistActions.loadChecklistSuccess, (state, { checklist }) => ({
    ...state,
    checklist,
    loading: false,
    error: null
  })),

  on(ChecklistActions.loadChecklistFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Save Phase
  on(ChecklistActions.savePhase, (state) => ({
    ...state,
    saving: true,
    error: null
  })),

  on(ChecklistActions.savePhaseSuccess, (state, { phase, data }) => {
    if (!state.checklist) {
      return { ...state, saving: false };
    }

    const phaseKeyMap: Record<string, string> = {
      jobDetails: 'jobDetails',
      preInstallation: 'preInstallation',
      eodReports: 'eodEntries',
      closeOut: 'closeOut'
    };

    const key = phaseKeyMap[phase];

    return {
      ...state,
      checklist: {
        ...state.checklist,
        [key]: data
      },
      saving: false,
      lastSavedAt: new Date().toISOString()
    };
  }),

  on(ChecklistActions.savePhaseFailure, (state, { error }) => ({
    ...state,
    saving: false,
    error
  })),

  // Add EOD Entry
  on(ChecklistActions.addEodEntry, (state) => ({
    ...state,
    saving: true,
    error: null
  })),

  on(ChecklistActions.addEodEntrySuccess, (state, { entry }) => {
    if (!state.checklist) {
      return { ...state, saving: false };
    }

    return {
      ...state,
      checklist: {
        ...state.checklist,
        eodEntries: [...state.checklist.eodEntries, entry]
      },
      saving: false,
      lastSavedAt: new Date().toISOString()
    };
  }),

  on(ChecklistActions.addEodEntryFailure, (state, { error }) => ({
    ...state,
    saving: false,
    error
  })),

  // Auto-create Checklist
  on(ChecklistActions.autoCreateChecklist, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(ChecklistActions.autoCreateChecklistSuccess, (state, { checklist }) => ({
    ...state,
    checklist,
    loading: false
  })),

  on(ChecklistActions.autoCreateChecklistFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // SignalR real-time update
  on(ChecklistActions.checklistUpdatedRemotely, (state, { checklist }) => ({
    ...state,
    checklist
  }))
);
