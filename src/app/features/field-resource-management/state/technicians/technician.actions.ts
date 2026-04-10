/**
 * Technician Actions
 * Defines all actions for technician state management
 */

import { createAction, props } from '@ngrx/store';
import { Technician } from '../../models/technician.model';
import { TechnicianFilters } from '../../models/dtos/filters.dto';
import { CreateTechnicianDto, UpdateTechnicianDto } from '../../models/dtos/technician.dto';
import { GeoLocation } from '../../models/time-entry.model';

// Load Technicians
export const loadTechnicians = createAction(
  '[Technician] Load Technicians',
  props<{ filters?: TechnicianFilters }>()
);

export const loadTechniciansSuccess = createAction(
  '[Technician] Load Technicians Success',
  props<{ technicians: Technician[] }>()
);

export const loadTechniciansFailure = createAction(
  '[Technician] Load Technicians Failure',
  props<{ error: string }>()
);

// Create Technician
export const createTechnician = createAction(
  '[Technician] Create Technician',
  props<{ technician: CreateTechnicianDto }>()
);

export const createTechnicianSuccess = createAction(
  '[Technician] Create Technician Success',
  props<{ technician: Technician }>()
);

export const createTechnicianFailure = createAction(
  '[Technician] Create Technician Failure',
  props<{ error: string }>()
);

// Update Technician
export const updateTechnician = createAction(
  '[Technician] Update Technician',
  props<{ id: string; technician: UpdateTechnicianDto }>()
);

export const updateTechnicianSuccess = createAction(
  '[Technician] Update Technician Success',
  props<{ technician: Technician }>()
);

export const updateTechnicianFailure = createAction(
  '[Technician] Update Technician Failure',
  props<{ error: string }>()
);

// Delete Technician
export const deleteTechnician = createAction(
  '[Technician] Delete Technician',
  props<{ id: string }>()
);

export const deleteTechnicianSuccess = createAction(
  '[Technician] Delete Technician Success',
  props<{ id: string }>()
);

export const deleteTechnicianFailure = createAction(
  '[Technician] Delete Technician Failure',
  props<{ error: string }>()
);

// Select Technician
export const selectTechnician = createAction(
  '[Technician] Select Technician',
  props<{ id: string | null }>()
);

// Set Filters
export const setTechnicianFilters = createAction(
  '[Technician] Set Filters',
  props<{ filters: TechnicianFilters }>()
);

// Clear Filters
export const clearTechnicianFilters = createAction(
  '[Technician] Clear Filters'
);

// Clear Error
export const clearTechnicianError = createAction(
  '[Technician] Clear Error'
);

// Update Technician Location (Real-time tracking)
export const updateTechnicianLocation = createAction(
  '[Technician] Update Technician Location',
  props<{ technicianId: string; location: GeoLocation }>()
);

export const updateTechnicianLocationSuccess = createAction(
  '[Technician] Update Technician Location Success',
  props<{ technicianId: string; location: GeoLocation }>()
);

export const updateTechnicianLocationFailure = createAction(
  '[Technician] Update Technician Location Failure',
  props<{ error: string }>()
);

// Optimistic Update Actions
export const updateTechnicianOptimistic = createAction(
  '[Technician] Update Technician Optimistic',
  props<{ id: string; changes: Partial<Technician>; originalData: Technician }>()
);

export const rollbackTechnicianUpdate = createAction(
  '[Technician] Rollback Technician Update',
  props<{ id: string; originalData: Technician }>()
);

export const createTechnicianOptimistic = createAction(
  '[Technician] Create Technician Optimistic',
  props<{ technician: Technician; tempId: string }>()
);

export const rollbackTechnicianCreate = createAction(
  '[Technician] Rollback Technician Create',
  props<{ tempId: string }>()
);

export const deleteTechnicianOptimistic = createAction(
  '[Technician] Delete Technician Optimistic',
  props<{ id: string; originalData: Technician }>()
);

export const rollbackTechnicianDelete = createAction(
  '[Technician] Rollback Technician Delete',
  props<{ originalData: Technician }>()
);

