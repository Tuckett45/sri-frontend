/**
 * Travel Actions
 * Defines all actions for travel state management
 */

import { createAction, props } from '@ngrx/store';
import { 
  TravelProfile, 
  TechnicianDistance, 
  Address, 
  Coordinates, 
  GeocodingStatus,
  PerDiemConfig 
} from '../../models/travel.model';

// Load Travel Profile
export const loadTravelProfile = createAction(
  '[Travel] Load Travel Profile',
  props<{ technicianId: string }>()
);

export const loadTravelProfileSuccess = createAction(
  '[Travel] Load Travel Profile Success',
  props<{ profile: TravelProfile }>()
);

export const loadTravelProfileFailure = createAction(
  '[Travel] Load Travel Profile Failure',
  props<{ error: string }>()
);

// Load Multiple Travel Profiles
export const loadTravelProfiles = createAction(
  '[Travel] Load Travel Profiles',
  props<{ technicianIds: string[] }>()
);

export const loadTravelProfilesSuccess = createAction(
  '[Travel] Load Travel Profiles Success',
  props<{ profiles: TravelProfile[] }>()
);

export const loadTravelProfilesFailure = createAction(
  '[Travel] Load Travel Profiles Failure',
  props<{ error: string }>()
);

// Load All Travel Profiles
export const loadAllTravelProfiles = createAction(
  '[Travel] Load All Travel Profiles'
);

export const loadAllTravelProfilesSuccess = createAction(
  '[Travel] Load All Travel Profiles Success',
  props<{ profiles: TravelProfile[] }>()
);

export const loadAllTravelProfilesFailure = createAction(
  '[Travel] Load All Travel Profiles Failure',
  props<{ error: string }>()
);

// Update Travel Flag
export const updateTravelFlag = createAction(
  '[Travel] Update Travel Flag',
  props<{ technicianId: string; willing: boolean }>()
);

export const updateTravelFlagSuccess = createAction(
  '[Travel] Update Travel Flag Success',
  props<{ profile: TravelProfile }>()
);

export const updateTravelFlagFailure = createAction(
  '[Travel] Update Travel Flag Failure',
  props<{ error: string }>()
);

// Update Home Address
export const updateHomeAddress = createAction(
  '[Travel] Update Home Address',
  props<{ technicianId: string; address: Address }>()
);

export const updateHomeAddressSuccess = createAction(
  '[Travel] Update Home Address Success',
  props<{ profile: TravelProfile }>()
);

export const updateHomeAddressFailure = createAction(
  '[Travel] Update Home Address Failure',
  props<{ error: string }>()
);

// Geocoding Actions
export const startGeocoding = createAction(
  '[Travel] Start Geocoding',
  props<{ technicianId: string }>()
);

export const geocodingSuccess = createAction(
  '[Travel] Geocoding Success',
  props<{ technicianId: string; coordinates: Coordinates }>()
);

export const geocodingFailure = createAction(
  '[Travel] Geocoding Failure',
  props<{ technicianId: string; error: string }>()
);

export const updateGeocodingStatus = createAction(
  '[Travel] Update Geocoding Status',
  props<{ technicianId: string; status: GeocodingStatus; error?: string | null }>()
);

// Calculate Distances
export const calculateDistances = createAction(
  '[Travel] Calculate Distances',
  props<{ jobId: string; technicianIds?: string[] }>()
);

export const calculateDistancesSuccess = createAction(
  '[Travel] Calculate Distances Success',
  props<{ jobId: string; distances: TechnicianDistance[] }>()
);

export const calculateDistancesFailure = createAction(
  '[Travel] Calculate Distances Failure',
  props<{ error: string }>()
);

// Clear Distances
export const clearDistances = createAction(
  '[Travel] Clear Distances',
  props<{ jobId: string }>()
);

// Update Per Diem Config
export const updatePerDiemConfig = createAction(
  '[Travel] Update Per Diem Config',
  props<{ config: PerDiemConfig }>()
);

// Select Technician
export const selectTechnician = createAction(
  '[Travel] Select Technician',
  props<{ technicianId: string }>()
);

// Clear Travel Error
export const clearTravelError = createAction(
  '[Travel] Clear Travel Error'
);

// Optimistic Update Actions
export const updateTravelFlagOptimistic = createAction(
  '[Travel] Update Travel Flag Optimistic',
  props<{ technicianId: string; willing: boolean }>()
);

export const rollbackTravelFlagUpdate = createAction(
  '[Travel] Rollback Travel Flag Update',
  props<{ originalProfile: TravelProfile }>()
);

export const updateHomeAddressOptimistic = createAction(
  '[Travel] Update Home Address Optimistic',
  props<{ technicianId: string; address: Address }>()
);

export const rollbackHomeAddressUpdate = createAction(
  '[Travel] Rollback Home Address Update',
  props<{ originalProfile: TravelProfile }>()
);
