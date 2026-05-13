/**
 * Travel Reducer
 * Manages travel state updates using EntityAdapter for normalized state
 */

import { createReducer, on } from '@ngrx/store';
import { EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { TravelProfile, GeocodingStatus } from '../../models/travel.model';
import { TravelState } from './travel.state';
import * as TravelActions from './travel.actions';

// Entity adapter for normalized state management
export const travelAdapter: EntityAdapter<TravelProfile> = createEntityAdapter<TravelProfile>({
  selectId: (profile: TravelProfile) => profile.technicianId,
  sortComparer: (a: TravelProfile, b: TravelProfile) => {
    // Sort by travel willingness first, then by geocoding status
    if (a.willingToTravel !== b.willingToTravel) {
      return a.willingToTravel ? -1 : 1;
    }
    
    const statusOrder = {
      [GeocodingStatus.Success]: 0,
      [GeocodingStatus.Pending]: 1,
      [GeocodingStatus.NotGeocoded]: 2,
      [GeocodingStatus.Failed]: 3
    };
    
    return statusOrder[a.geocodingStatus] - statusOrder[b.geocodingStatus];
  }
});

// Initial state
export const initialState: TravelState = {
  profiles: travelAdapter.getInitialState(),
  distances: {},
  perDiemConfig: {
    minimumDistanceMiles: 50,
    ratePerMile: 0.655,
    flatRateAmount: null
  },
  loading: false,
  error: null,
  geocodingInProgress: new Set<string>(),
  selectedTechnicianId: null
};

// Reducer
export const travelReducer = createReducer(
  initialState,

  // Load Travel Profile
  on(TravelActions.loadTravelProfile, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  // Create Travel Profile
  on(TravelActions.createTravelProfile, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TravelActions.createTravelProfileSuccess, (state, { profile }) => ({
    ...state,
    profiles: travelAdapter.upsertOne(profile, state.profiles),
    loading: false,
    error: null
  })),

  on(TravelActions.createTravelProfileFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  on(TravelActions.loadTravelProfileSuccess, (state, { profile }) => ({
    ...state,
    profiles: travelAdapter.upsertOne(profile, state.profiles),
    loading: false,
    error: null
  })),

  on(TravelActions.loadTravelProfileFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Load Multiple Travel Profiles
  on(TravelActions.loadTravelProfiles, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TravelActions.loadTravelProfilesSuccess, (state, { profiles }) => ({
    ...state,
    profiles: travelAdapter.upsertMany(profiles, state.profiles),
    loading: false,
    error: null
  })),

  on(TravelActions.loadTravelProfilesFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Load All Travel Profiles
  on(TravelActions.loadAllTravelProfiles, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TravelActions.loadAllTravelProfilesSuccess, (state, { profiles }) => ({
    ...state,
    profiles: travelAdapter.upsertMany(profiles, state.profiles),
    loading: false,
    error: null
  })),

  on(TravelActions.loadAllTravelProfilesFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Update Travel Flag
  on(TravelActions.updateTravelFlag, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TravelActions.updateTravelFlagSuccess, (state, { profile }) => ({
    ...state,
    profiles: travelAdapter.updateOne(
      { id: profile.technicianId, changes: profile },
      state.profiles
    ),
    loading: false,
    error: null
  })),

  on(TravelActions.updateTravelFlagFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Update Home Address
  on(TravelActions.updateHomeAddress, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TravelActions.updateHomeAddressSuccess, (state, { profile }) => ({
    ...state,
    profiles: travelAdapter.updateOne(
      { id: profile.technicianId, changes: profile },
      state.profiles
    ),
    loading: false,
    error: null
  })),

  on(TravelActions.updateHomeAddressFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Geocoding Actions
  on(TravelActions.startGeocoding, (state, { technicianId }) => {
    const newGeocodingInProgress = new Set(state.geocodingInProgress);
    newGeocodingInProgress.add(technicianId);
    
    return {
      ...state,
      profiles: travelAdapter.updateOne(
        {
          id: technicianId,
          changes: {
            geocodingStatus: GeocodingStatus.Pending,
            geocodingError: null
          }
        },
        state.profiles
      ),
      geocodingInProgress: newGeocodingInProgress
    };
  }),

  on(TravelActions.geocodingSuccess, (state, { technicianId, coordinates }) => {
    const newGeocodingInProgress = new Set(state.geocodingInProgress);
    newGeocodingInProgress.delete(technicianId);
    
    return {
      ...state,
      profiles: travelAdapter.updateOne(
        {
          id: technicianId,
          changes: {
            homeCoordinates: coordinates,
            geocodingStatus: GeocodingStatus.Success,
            geocodingError: null,
            lastGeocodedAt: new Date()
          }
        },
        state.profiles
      ),
      geocodingInProgress: newGeocodingInProgress
    };
  }),

  on(TravelActions.geocodingFailure, (state, { technicianId, error }) => {
    const newGeocodingInProgress = new Set(state.geocodingInProgress);
    newGeocodingInProgress.delete(technicianId);
    
    return {
      ...state,
      profiles: travelAdapter.updateOne(
        {
          id: technicianId,
          changes: {
            geocodingStatus: GeocodingStatus.Failed,
            geocodingError: error
          }
        },
        state.profiles
      ),
      geocodingInProgress: newGeocodingInProgress
    };
  }),

  on(TravelActions.updateGeocodingStatus, (state, { technicianId, status, error }) => ({
    ...state,
    profiles: travelAdapter.updateOne(
      {
        id: technicianId,
        changes: {
          geocodingStatus: status,
          geocodingError: error || null
        }
      },
      state.profiles
    )
  })),

  // Calculate Distances
  on(TravelActions.calculateDistances, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TravelActions.calculateDistancesSuccess, (state, { jobId, distances }) => ({
    ...state,
    distances: {
      ...state.distances,
      [jobId]: distances
    },
    loading: false,
    error: null
  })),

  on(TravelActions.calculateDistancesFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Clear Distances
  on(TravelActions.clearDistances, (state, { jobId }) => {
    const newDistances = { ...state.distances };
    delete newDistances[jobId];
    
    return {
      ...state,
      distances: newDistances
    };
  }),

  // Update Per Diem Config
  on(TravelActions.updatePerDiemConfig, (state, { config }) => ({
    ...state,
    perDiemConfig: config
  })),

  // Update Travel Preferences
  on(TravelActions.updateTravelPreferences, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TravelActions.updateTravelPreferencesSuccess, (state, { profile }) => ({
    ...state,
    profiles: travelAdapter.updateOne(
      { id: profile.technicianId, changes: profile },
      state.profiles
    ),
    loading: false,
    error: null
  })),

  on(TravelActions.updateTravelPreferencesFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Select Technician
  on(TravelActions.selectTechnician, (state, { technicianId }) => ({
    ...state,
    selectedTechnicianId: technicianId
  })),

  // Clear Travel Error
  on(TravelActions.clearTravelError, (state) => ({
    ...state,
    error: null
  })),

  // Optimistic Update Handlers
  on(TravelActions.updateTravelFlagOptimistic, (state, { technicianId, willing }) => ({
    ...state,
    profiles: travelAdapter.updateOne(
      {
        id: technicianId,
        changes: {
          willingToTravel: willing,
          updatedAt: new Date()
        }
      },
      state.profiles
    ),
    error: null
  })),

  on(TravelActions.rollbackTravelFlagUpdate, (state, { originalProfile }) => ({
    ...state,
    profiles: travelAdapter.updateOne(
      { id: originalProfile.technicianId, changes: originalProfile },
      state.profiles
    ),
    error: 'Travel flag update failed - changes reverted'
  })),

  on(TravelActions.updateHomeAddressOptimistic, (state, { technicianId, address }) => ({
    ...state,
    profiles: travelAdapter.updateOne(
      {
        id: technicianId,
        changes: {
          homeAddress: address,
          geocodingStatus: GeocodingStatus.Pending,
          geocodingError: null,
          updatedAt: new Date()
        }
      },
      state.profiles
    ),
    error: null
  })),

  on(TravelActions.rollbackHomeAddressUpdate, (state, { originalProfile }) => ({
    ...state,
    profiles: travelAdapter.updateOne(
      { id: originalProfile.technicianId, changes: originalProfile },
      state.profiles
    ),
    error: 'Home address update failed - changes reverted'
  }))
);
