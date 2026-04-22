/**
 * Crew Reducer
 * Manages crew state updates using EntityAdapter for normalized state
 */

import { createReducer, on } from '@ngrx/store';
import { EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { Crew } from '../../models/crew.model';
import { CrewState } from './crew.state';
import * as CrewActions from './crew.actions';

// Entity adapter for normalized state management
export const crewAdapter: EntityAdapter<Crew> = createEntityAdapter<Crew>({
  selectId: (crew: Crew) => crew.id,
  sortComparer: (a: Crew, b: Crew) => a.name.localeCompare(b.name)
});

// Initial state
export const initialState: CrewState = crewAdapter.getInitialState({
  selectedId: null,
  loading: false,
  error: null,
  filters: {},
  locationHistory: {},
  locationHistoryLoading: false,
  locationHistoryError: null
});

// Reducer
export const crewReducer = createReducer(
  initialState,

  // Load Crews
  on(CrewActions.loadCrews, (state, { filters }) => ({
    ...state,
    loading: true,
    error: null,
    filters: filters || state.filters
  })),

  on(CrewActions.loadCrewsSuccess, (state, { crews }) =>
    crewAdapter.setAll(crews, {
      ...state,
      loading: false,
      error: null
    })
  ),

  on(CrewActions.loadCrewsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Create Crew
  on(CrewActions.createCrew, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(CrewActions.createCrewSuccess, (state, { crew }) =>
    crewAdapter.addOne(crew, {
      ...state,
      loading: false,
      error: null
    })
  ),

  on(CrewActions.createCrewFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Update Crew
  on(CrewActions.updateCrew, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(CrewActions.updateCrewSuccess, (state, { crew }) =>
    crewAdapter.updateOne(
      { id: crew.id, changes: crew },
      {
        ...state,
        loading: false,
        error: null
      }
    )
  ),

  on(CrewActions.updateCrewFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Delete Crew
  on(CrewActions.deleteCrew, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(CrewActions.deleteCrewSuccess, (state, { id }) =>
    crewAdapter.removeOne(id, {
      ...state,
      loading: false,
      error: null,
      selectedId: state.selectedId === id ? null : state.selectedId
    })
  ),

  on(CrewActions.deleteCrewFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Select Crew
  on(CrewActions.selectCrew, (state, { id }) => ({
    ...state,
    selectedId: id
  })),

  // Set Filters
  on(CrewActions.setCrewFilters, (state, { filters }) => ({
    ...state,
    filters
  })),

  // Clear Filters
  on(CrewActions.clearCrewFilters, (state) => ({
    ...state,
    filters: {}
  })),

  // Update Crew Location (Real-time tracking)
  on(CrewActions.updateCrewLocation, (state) => ({
    ...state,
    error: null
  })),

  on(CrewActions.updateCrewLocationSuccess, (state, { crewId, location }) =>
    crewAdapter.updateOne(
      {
        id: crewId,
        changes: {
          currentLocation: location,
          updatedAt: new Date()
        }
      },
      {
        ...state,
        error: null
      }
    )
  ),

  on(CrewActions.updateCrewLocationFailure, (state, { error }) => ({
    ...state,
    error
  })),

  // Assign Job to Crew
  on(CrewActions.assignJobToCrew, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(CrewActions.assignJobToCrewSuccess, (state, { crew }) =>
    crewAdapter.updateOne(
      { id: crew.id, changes: crew },
      {
        ...state,
        loading: false,
        error: null
      }
    )
  ),

  on(CrewActions.assignJobToCrewFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Unassign Job from Crew
  on(CrewActions.unassignJobFromCrew, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(CrewActions.unassignJobFromCrewSuccess, (state, { crew }) =>
    crewAdapter.updateOne(
      { id: crew.id, changes: crew },
      {
        ...state,
        loading: false,
        error: null
      }
    )
  ),

  on(CrewActions.unassignJobFromCrewFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Add Crew Member
  on(CrewActions.addCrewMember, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(CrewActions.addCrewMemberSuccess, (state, { crew }) =>
    crewAdapter.updateOne(
      { id: crew.id, changes: crew },
      {
        ...state,
        loading: false,
        error: null
      }
    )
  ),

  on(CrewActions.addCrewMemberFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Remove Crew Member
  on(CrewActions.removeCrewMember, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(CrewActions.removeCrewMemberSuccess, (state, { crew }) =>
    crewAdapter.updateOne(
      { id: crew.id, changes: crew },
      {
        ...state,
        loading: false,
        error: null
      }
    )
  ),

  on(CrewActions.removeCrewMemberFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Load Crew Location History
  on(CrewActions.loadCrewLocationHistory, (state) => ({
    ...state,
    locationHistoryLoading: true,
    locationHistoryError: null
  })),

  on(CrewActions.loadCrewLocationHistorySuccess, (state, { crewId, history }) => ({
    ...state,
    locationHistory: {
      ...state.locationHistory,
      [crewId]: history
    },
    locationHistoryLoading: false,
    locationHistoryError: null
  })),

  on(CrewActions.loadCrewLocationHistoryFailure, (state, { error }) => ({
    ...state,
    locationHistoryLoading: false,
    locationHistoryError: error
  }))
);
