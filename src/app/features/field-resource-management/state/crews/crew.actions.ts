/**
 * Crew Actions
 * Defines all actions for crew state management
 */

import { createAction, props } from '@ngrx/store';
import { Crew } from '../../models/crew.model';
import { CrewFilters } from '../../models/dtos/filters.dto';
import { CreateCrewDto, UpdateCrewDto } from '../../models/dtos/crew.dto';
import { GeoLocation } from '../../models/time-entry.model';
import { LocationHistoryEntry, LocationHistoryFilters } from '../../models/location-history.model';

// Load Crews
export const loadCrews = createAction(
  '[Crew] Load Crews',
  props<{ filters?: CrewFilters }>()
);

export const loadCrewsSuccess = createAction(
  '[Crew] Load Crews Success',
  props<{ crews: Crew[] }>()
);

export const loadCrewsFailure = createAction(
  '[Crew] Load Crews Failure',
  props<{ error: string }>()
);

// Create Crew
export const createCrew = createAction(
  '[Crew] Create Crew',
  props<{ crew: CreateCrewDto }>()
);

export const createCrewSuccess = createAction(
  '[Crew] Create Crew Success',
  props<{ crew: Crew }>()
);

export const createCrewFailure = createAction(
  '[Crew] Create Crew Failure',
  props<{ error: string }>()
);

// Update Crew
export const updateCrew = createAction(
  '[Crew] Update Crew',
  props<{ id: string; crew: UpdateCrewDto }>()
);

export const updateCrewSuccess = createAction(
  '[Crew] Update Crew Success',
  props<{ crew: Crew }>()
);

export const updateCrewFailure = createAction(
  '[Crew] Update Crew Failure',
  props<{ error: string }>()
);

// Delete Crew
export const deleteCrew = createAction(
  '[Crew] Delete Crew',
  props<{ id: string }>()
);

export const deleteCrewSuccess = createAction(
  '[Crew] Delete Crew Success',
  props<{ id: string }>()
);

export const deleteCrewFailure = createAction(
  '[Crew] Delete Crew Failure',
  props<{ error: string }>()
);

// Select Crew
export const selectCrew = createAction(
  '[Crew] Select Crew',
  props<{ id: string | null }>()
);

// Set Filters
export const setCrewFilters = createAction(
  '[Crew] Set Filters',
  props<{ filters: CrewFilters }>()
);

// Clear Filters
export const clearCrewFilters = createAction(
  '[Crew] Clear Filters'
);

// Update Crew Location (Real-time tracking)
export const updateCrewLocation = createAction(
  '[Crew] Update Crew Location',
  props<{ crewId: string; location: GeoLocation }>()
);

export const updateCrewLocationSuccess = createAction(
  '[Crew] Update Crew Location Success',
  props<{ crewId: string; location: GeoLocation }>()
);

export const updateCrewLocationFailure = createAction(
  '[Crew] Update Crew Location Failure',
  props<{ error: string }>()
);

// Assign Job to Crew
export const assignJobToCrew = createAction(
  '[Crew] Assign Job to Crew',
  props<{ crewId: string; jobId: string }>()
);

export const assignJobToCrewSuccess = createAction(
  '[Crew] Assign Job to Crew Success',
  props<{ crew: Crew }>()
);

export const assignJobToCrewFailure = createAction(
  '[Crew] Assign Job to Crew Failure',
  props<{ error: string }>()
);

// Unassign Job from Crew
export const unassignJobFromCrew = createAction(
  '[Crew] Unassign Job from Crew',
  props<{ crewId: string }>()
);

export const unassignJobFromCrewSuccess = createAction(
  '[Crew] Unassign Job from Crew Success',
  props<{ crew: Crew }>()
);

export const unassignJobFromCrewFailure = createAction(
  '[Crew] Unassign Job from Crew Failure',
  props<{ error: string }>()
);

// Add Member to Crew
export const addCrewMember = createAction(
  '[Crew] Add Crew Member',
  props<{ crewId: string; technicianId: string }>()
);

export const addCrewMemberSuccess = createAction(
  '[Crew] Add Crew Member Success',
  props<{ crew: Crew }>()
);

export const addCrewMemberFailure = createAction(
  '[Crew] Add Crew Member Failure',
  props<{ error: string }>()
);

// Remove Member from Crew
export const removeCrewMember = createAction(
  '[Crew] Remove Crew Member',
  props<{ crewId: string; technicianId: string }>()
);

export const removeCrewMemberSuccess = createAction(
  '[Crew] Remove Crew Member Success',
  props<{ crew: Crew }>()
);

export const removeCrewMemberFailure = createAction(
  '[Crew] Remove Crew Member Failure',
  props<{ error: string }>()
);

// Load Crew Location History
export const loadCrewLocationHistory = createAction(
  '[Crew] Load Crew Location History',
  props<{ filters: LocationHistoryFilters }>()
);

export const loadCrewLocationHistorySuccess = createAction(
  '[Crew] Load Crew Location History Success',
  props<{ crewId: string; history: LocationHistoryEntry[] }>()
);

export const loadCrewLocationHistoryFailure = createAction(
  '[Crew] Load Crew Location History Failure',
  props<{ error: string }>()
);
