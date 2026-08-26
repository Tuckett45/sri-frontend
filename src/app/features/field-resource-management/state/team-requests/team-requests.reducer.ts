/**
 * Team Requests Reducer
 * Manages team PTO and overtime request state using EntityAdapters for normalized state.
 * Keeps team data separate from personal request state to prevent overwriting.
 */

import { createReducer, on } from '@ngrx/store';
import { EntityAdapter, EntityState, createEntityAdapter } from '@ngrx/entity';
import { PtoRequest } from '../../models/pto.models';
import { OvertimeRequest } from '../../models/overtime.models';
import * as TeamRequestsActions from './team-requests.actions';
import { DirectReport } from './team-requests.actions';

// Feature key for store registration
export const TEAM_REQUESTS_FEATURE_KEY = 'teamRequests';

// ─── State Interfaces ───────────────────────────────────────────────────────────

export interface TeamPtoState extends EntityState<PtoRequest> {
  loading: boolean;
  error: string | null;
}

export interface TeamOvertimeState extends EntityState<OvertimeRequest> {
  loading: boolean;
  error: string | null;
}

export interface TeamRequestsState {
  teamPto: TeamPtoState;
  teamOvertime: TeamOvertimeState;
  directReports: DirectReport[];
  directReportsLoading: boolean;
  directReportsError: string | null;
}

// ─── Entity Adapters ────────────────────────────────────────────────────────────

export const teamPtoAdapter: EntityAdapter<PtoRequest> = createEntityAdapter<PtoRequest>({
  selectId: (request: PtoRequest) => request.id,
  sortComparer: (a: PtoRequest, b: PtoRequest) =>
    new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
});

export const teamOvertimeAdapter: EntityAdapter<OvertimeRequest> = createEntityAdapter<OvertimeRequest>({
  selectId: (request: OvertimeRequest) => request.id,
  sortComparer: (a: OvertimeRequest, b: OvertimeRequest) =>
    new Date(b.overtimeStartDate).getTime() - new Date(a.overtimeStartDate).getTime()
});

// ─── Initial State ──────────────────────────────────────────────────────────────

export const initialTeamPtoState: TeamPtoState = teamPtoAdapter.getInitialState({
  loading: false,
  error: null
});

export const initialTeamOvertimeState: TeamOvertimeState = teamOvertimeAdapter.getInitialState({
  loading: false,
  error: null
});

export const initialState: TeamRequestsState = {
  teamPto: initialTeamPtoState,
  teamOvertime: initialTeamOvertimeState,
  directReports: [],
  directReportsLoading: false,
  directReportsError: null
};

// ─── Reducer ────────────────────────────────────────────────────────────────────

export const teamRequestsReducer = createReducer(
  initialState,

  // ─── Load Team PTO Requests ─────────────────────────────────────────────────

  on(TeamRequestsActions.loadTeamPtoRequests, (state) => ({
    ...state,
    teamPto: {
      ...state.teamPto,
      loading: true,
      error: null
    }
  })),

  on(TeamRequestsActions.loadTeamPtoRequestsSuccess, (state, { requests }) => ({
    ...state,
    teamPto: teamPtoAdapter.setAll(requests, {
      ...state.teamPto,
      loading: false,
      error: null
    })
  })),

  on(TeamRequestsActions.loadTeamPtoRequestsFailure, (state, { error }) => ({
    ...state,
    teamPto: {
      ...state.teamPto,
      loading: false,
      error
    }
  })),

  // ─── Load Team Overtime Requests ────────────────────────────────────────────

  on(TeamRequestsActions.loadTeamOvertimeRequests, (state) => ({
    ...state,
    teamOvertime: {
      ...state.teamOvertime,
      loading: true,
      error: null
    }
  })),

  on(TeamRequestsActions.loadTeamOvertimeRequestsSuccess, (state, { requests }) => ({
    ...state,
    teamOvertime: teamOvertimeAdapter.setAll(requests, {
      ...state.teamOvertime,
      loading: false,
      error: null
    })
  })),

  on(TeamRequestsActions.loadTeamOvertimeRequestsFailure, (state, { error }) => ({
    ...state,
    teamOvertime: {
      ...state.teamOvertime,
      loading: false,
      error
    }
  })),

  // ─── Load Direct Reports ────────────────────────────────────────────────────

  on(TeamRequestsActions.loadDirectReports, (state) => ({
    ...state,
    directReportsLoading: true,
    directReportsError: null
  })),

  on(TeamRequestsActions.loadDirectReportsSuccess, (state, { directReports }) => ({
    ...state,
    directReports,
    directReportsLoading: false,
    directReportsError: null
  })),

  on(TeamRequestsActions.loadDirectReportsFailure, (state, { error }) => ({
    ...state,
    directReportsLoading: false,
    directReportsError: error
  })),

  // ─── Clear Team Data ────────────────────────────────────────────────────────

  on(TeamRequestsActions.clearTeamData, () => ({
    ...initialState
  }))
);
