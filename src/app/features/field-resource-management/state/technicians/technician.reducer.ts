/**
 * Technician Reducer
 * Manages technician state updates using EntityAdapter for normalized state
 */

import { createReducer, on } from '@ngrx/store';
import { EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { Technician } from '../../models/technician.model';
import { TechnicianState } from './technician.state';
import * as TechnicianActions from './technician.actions';

// Entity adapter for normalized state management
export const technicianAdapter: EntityAdapter<Technician> = createEntityAdapter<Technician>({
  selectId: (technician: Technician) => technician.id,
  sortComparer: (a: Technician, b: Technician) => 
    `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)
});

// Initial state
export const initialState: TechnicianState = technicianAdapter.getInitialState({
  selectedId: null,
  loading: false,
  error: null,
  filters: {}
});

// Reducer
export const technicianReducer = createReducer(
  initialState,

  // Load Technicians
  on(TechnicianActions.loadTechnicians, (state, { filters }) => ({
    ...state,
    loading: true,
    error: null,
    filters: filters || state.filters
  })),

  on(TechnicianActions.loadTechniciansSuccess, (state, { technicians }) =>
    technicianAdapter.setAll(technicians, {
      ...state,
      loading: false,
      error: null
    })
  ),

  on(TechnicianActions.loadTechniciansFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Create Technician
  on(TechnicianActions.createTechnician, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TechnicianActions.createTechnicianSuccess, (state, { technician, tempId }) => {
    // If tempId is provided (from optimistic create), remove the temp entity first
    const stateAfterRemoval = tempId
      ? technicianAdapter.removeOne(tempId, state)
      : state;
    return technicianAdapter.upsertOne(technician, {
      ...stateAfterRemoval,
      loading: false,
      error: null
    });
  }),

  on(TechnicianActions.createTechnicianFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Update Technician
  on(TechnicianActions.updateTechnician, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TechnicianActions.updateTechnicianSuccess, (state, { technician }) =>
    technicianAdapter.updateOne(
      { id: technician.id, changes: technician },
      {
        ...state,
        loading: false,
        error: null
      }
    )
  ),

  on(TechnicianActions.updateTechnicianFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Delete Technician
  on(TechnicianActions.deleteTechnician, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TechnicianActions.deleteTechnicianSuccess, (state, { id }) =>
    technicianAdapter.removeOne(id, {
      ...state,
      loading: false,
      error: null,
      selectedId: state.selectedId === id ? null : state.selectedId
    })
  ),

  on(TechnicianActions.deleteTechnicianFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Select Technician
  on(TechnicianActions.selectTechnician, (state, { id }) => ({
    ...state,
    selectedId: id
  })),

  // Set Filters
  on(TechnicianActions.setTechnicianFilters, (state, { filters }) => ({
    ...state,
    filters
  })),

  // Clear Filters
  on(TechnicianActions.clearTechnicianFilters, (state) => ({
    ...state,
    filters: {}
  })),

  // Clear Error
  on(TechnicianActions.clearTechnicianError, (state) => ({
    ...state,
    error: null
  })),

  // Update Technician Location (Real-time tracking)
  on(TechnicianActions.updateTechnicianLocation, (state) => ({
    ...state,
    error: null
  })),

  on(TechnicianActions.updateTechnicianLocationSuccess, (state, { technicianId, location }) =>
    technicianAdapter.updateOne(
      {
        id: technicianId,
        changes: {
          lastKnownLatitude: location.latitude,
          lastKnownLongitude: location.longitude,
          locationUpdatedAt: new Date(),
          updatedAt: new Date()
        }
      },
      {
        ...state,
        error: null
      }
    )
  ),

  on(TechnicianActions.updateTechnicianLocationFailure, (state, { error }) => ({
    ...state,
    error
  })),

  // Real-time availability update (clock-in/out)
  on(TechnicianActions.updateTechnicianAvailability, (state, { technicianId, isAvailable }) =>
    technicianAdapter.updateOne(
      {
        id: technicianId,
        changes: {
          isAvailable,
          updatedAt: new Date()
        }
      },
      {
        ...state,
        error: null
      }
    )
  ),

  // Optimistic Update Handlers
  on(TechnicianActions.updateTechnicianOptimistic, (state, { id, changes }) =>
    technicianAdapter.updateOne(
      { id, changes },
      {
        ...state,
        error: null
      }
    )
  ),

  on(TechnicianActions.rollbackTechnicianUpdate, (state, { id, originalData }) =>
    technicianAdapter.updateOne(
      { id, changes: originalData },
      {
        ...state,
        error: 'Update failed - changes reverted'
      }
    )
  ),

  on(TechnicianActions.createTechnicianOptimistic, (state, { technician }) =>
    technicianAdapter.addOne(technician, {
      ...state,
      error: null
    })
  ),

  on(TechnicianActions.rollbackTechnicianCreate, (state, { tempId }) =>
    technicianAdapter.removeOne(tempId, {
      ...state,
      error: 'Create failed - changes reverted'
    })
  ),

  on(TechnicianActions.deleteTechnicianOptimistic, (state, { id }) =>
    technicianAdapter.removeOne(id, {
      ...state,
      error: null
    })
  ),

  on(TechnicianActions.rollbackTechnicianDelete, (state, { originalData }) =>
    technicianAdapter.addOne(originalData, {
      ...state,
      error: 'Delete failed - changes reverted'
    })
  ),

  // Deactivate Technician
  on(TechnicianActions.deactivateTechnician, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TechnicianActions.deactivateTechnicianSuccess, (state, { technician }) =>
    technicianAdapter.updateOne(
      { id: technician.id, changes: technician },
      {
        ...state,
        loading: false,
        error: null
      }
    )
  ),

  on(TechnicianActions.deactivateTechnicianFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Reactivate Technician
  on(TechnicianActions.reactivateTechnician, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TechnicianActions.reactivateTechnicianSuccess, (state, { technician }) =>
    technicianAdapter.updateOne(
      { id: technician.id, changes: technician },
      {
        ...state,
        loading: false,
        error: null
      }
    )
  ),

  on(TechnicianActions.reactivateTechnicianFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  }))
);
