/**
 * Travel Selectors
 * Provides memoized selectors for accessing travel state
 * 
 * All selectors use createSelector for automatic memoization:
 * - Results are cached based on input selector values
 * - Recomputation only occurs when inputs change
 * - Improves performance by avoiding unnecessary recalculations
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TravelState } from './travel.state';
import { travelAdapter } from './travel.reducer';
import { TravelProfile, GeocodingStatus, TechnicianDistance } from '../../models/travel.model';

// Feature selector
export const selectTravelState = createFeatureSelector<TravelState>('travel');

// Select profiles EntityState
export const selectProfilesState = createSelector(
  selectTravelState,
  (state) => state.profiles
);

// Entity adapter selectors
const {
  selectIds,
  selectEntities,
  selectAll,
  selectTotal
} = travelAdapter.getSelectors(selectProfilesState);

// Select all travel profiles
export const selectAllTravelProfiles = createSelector(
  selectTravelState,
  selectAll
);

// Select travel profile entities
export const selectTravelProfileEntities = createSelector(
  selectTravelState,
  selectEntities
);

// Select travel profile by technician ID
export const selectTravelProfile = (technicianId: string) => createSelector(
  selectTravelProfileEntities,
  (entities) => entities[technicianId] || null
);

// Select selected technician ID
export const selectSelectedTechnicianId = createSelector(
  selectTravelState,
  (state) => state.selectedTechnicianId
);

// Select selected travel profile
export const selectSelectedTravelProfile = createSelector(
  selectTravelProfileEntities,
  selectSelectedTechnicianId,
  (entities, selectedTechnicianId) => 
    selectedTechnicianId ? entities[selectedTechnicianId] || null : null
);

// Select loading state
export const selectTravelLoading = createSelector(
  selectTravelState,
  (state) => state.loading
);

// Select error state
export const selectTravelError = createSelector(
  selectTravelState,
  (state) => state.error
);

// Select per diem config
export const selectPerDiemConfig = createSelector(
  selectTravelState,
  (state) => state.perDiemConfig
);

// Select geocoding in progress set
export const selectGeocodingInProgress = createSelector(
  selectTravelState,
  (state) => state.geocodingInProgress
);

// Select if technician is being geocoded
export const selectIsGeocodingInProgress = (technicianId: string) => createSelector(
  selectGeocodingInProgress,
  (inProgress) => inProgress.has(technicianId)
);

// Select total count
export const selectTravelProfilesTotal = createSelector(
  selectProfilesState,
  selectTotal
);

// Select geocoding status for a technician
export const selectGeocodingStatus = (technicianId: string) => createSelector(
  selectTravelProfile(technicianId),
  (profile) => profile?.geocodingStatus || GeocodingStatus.NotGeocoded
);

// Select geocoding error for a technician
export const selectGeocodingError = (technicianId: string) => createSelector(
  selectTravelProfile(technicianId),
  (profile) => profile?.geocodingError || null
);

// Select profiles by travel willingness
export const selectProfilesByTravelWillingness = (willing: boolean) => createSelector(
  selectAllTravelProfiles,
  (profiles) => profiles.filter(profile => profile.willingToTravel === willing)
);

// Select technicians willing to travel
export const selectWillingToTravelProfiles = createSelector(
  selectAllTravelProfiles,
  (profiles) => profiles.filter(profile => profile.willingToTravel)
);

// Select technicians not willing to travel
export const selectNotWillingToTravelProfiles = createSelector(
  selectAllTravelProfiles,
  (profiles) => profiles.filter(profile => !profile.willingToTravel)
);

// Select profiles by geocoding status
export const selectProfilesByGeocodingStatus = (status: GeocodingStatus) => createSelector(
  selectAllTravelProfiles,
  (profiles) => profiles.filter(profile => profile.geocodingStatus === status)
);

// Select successfully geocoded profiles
export const selectGeocodedProfiles = createSelector(
  selectAllTravelProfiles,
  (profiles) => profiles.filter(profile => 
    profile.geocodingStatus === GeocodingStatus.Success && 
    profile.homeCoordinates !== null
  )
);

// Select profiles needing geocoding
export const selectProfilesNeedingGeocoding = createSelector(
  selectAllTravelProfiles,
  (profiles) => profiles.filter(profile => 
    profile.geocodingStatus === GeocodingStatus.NotGeocoded ||
    profile.geocodingStatus === GeocodingStatus.Failed
  )
);

// Select profiles with geocoding errors
export const selectProfilesWithGeocodingErrors = createSelector(
  selectAllTravelProfiles,
  (profiles) => profiles.filter(profile => 
    profile.geocodingStatus === GeocodingStatus.Failed
  )
);

// Select distances for a job
export const selectDistancesForJob = (jobId: string) => createSelector(
  selectTravelState,
  (state) => state.distances[jobId] || []
);

// Select technicians with distance for a job (optionally filtered by travel willingness)
export const selectTechniciansWithDistance = (jobId: string, travelRequired: boolean = false) => createSelector(
  selectDistancesForJob(jobId),
  (distances) => {
    if (travelRequired) {
      return distances.filter(d => d.willingToTravel);
    }
    return distances;
  }
);

// Select technicians sorted by distance for a job
export const selectTechniciansSortedByDistance = (jobId: string, travelRequired: boolean = false) => createSelector(
  selectTechniciansWithDistance(jobId, travelRequired),
  (distances) => {
    return [...distances].sort((a, b) => {
      // Handle null distances (put them at the end)
      if (a.distanceMiles === null && b.distanceMiles === null) return 0;
      if (a.distanceMiles === null) return 1;
      if (b.distanceMiles === null) return -1;
      
      return a.distanceMiles - b.distanceMiles;
    });
  }
);

// Select per diem eligible technicians for a job
export const selectPerDiemEligibleTechnicians = (jobId: string) => createSelector(
  selectDistancesForJob(jobId),
  (distances) => distances.filter(d => d.perDiemEligible)
);

// Select distance calculation loading state
export const selectDistanceCalculationLoading = createSelector(
  selectTravelLoading,
  (loading) => loading
);

// Select travel statistics
export const selectTravelStatistics = createSelector(
  selectAllTravelProfiles,
  (profiles) => {
    const total = profiles.length;
    
    const willingToTravel = profiles.filter(p => p.willingToTravel).length;
    const notWillingToTravel = total - willingToTravel;
    
    const byGeocodingStatus: Record<GeocodingStatus, number> = {
      [GeocodingStatus.NotGeocoded]: 0,
      [GeocodingStatus.Pending]: 0,
      [GeocodingStatus.Success]: 0,
      [GeocodingStatus.Failed]: 0
    };
    
    profiles.forEach(profile => {
      byGeocodingStatus[profile.geocodingStatus] = 
        (byGeocodingStatus[profile.geocodingStatus] || 0) + 1;
    });
    
    const geocodedPercentage = total > 0
      ? Math.round((byGeocodingStatus[GeocodingStatus.Success] / total) * 100)
      : 0;
    
    return {
      total,
      willingToTravel,
      notWillingToTravel,
      willingToTravelPercentage: total > 0 ? Math.round((willingToTravel / total) * 100) : 0,
      byGeocodingStatus,
      geocodedPercentage,
      needingGeocoding: byGeocodingStatus[GeocodingStatus.NotGeocoded] + 
                        byGeocodingStatus[GeocodingStatus.Failed]
    };
  }
);

// Select travel profile view model for a technician
export const selectTravelProfileViewModel = (technicianId: string) => createSelector(
  selectTravelProfile(technicianId),
  selectIsGeocodingInProgress(technicianId),
  selectTravelLoading,
  selectTravelError,
  (profile, geocodingInProgress, loading, error) => ({
    profile,
    geocodingInProgress,
    loading,
    error,
    hasCoordinates: profile?.homeCoordinates !== null,
    isGeocoded: profile?.geocodingStatus === GeocodingStatus.Success,
    hasGeocodingError: profile?.geocodingStatus === GeocodingStatus.Failed
  })
);

// Select job assignment view model with distances
export const selectJobAssignmentViewModel = (jobId: string, travelRequired: boolean = false) => createSelector(
  selectTechniciansSortedByDistance(jobId, travelRequired),
  selectPerDiemEligibleTechnicians(jobId),
  selectDistanceCalculationLoading,
  selectTravelError,
  selectPerDiemConfig,
  (technicians, perDiemEligible, loading, error, perDiemConfig) => ({
    technicians,
    perDiemEligible,
    loading,
    error,
    perDiemConfig,
    hasTechnicians: technicians.length > 0,
    perDiemEligibleCount: perDiemEligible.length
  })
);

// Select profiles grouped by geocoding status
export const selectProfilesGroupedByGeocodingStatus = createSelector(
  selectAllTravelProfiles,
  (profiles) => {
    const grouped: Record<GeocodingStatus, TravelProfile[]> = {
      [GeocodingStatus.NotGeocoded]: [],
      [GeocodingStatus.Pending]: [],
      [GeocodingStatus.Success]: [],
      [GeocodingStatus.Failed]: []
    };
    
    profiles.forEach(profile => {
      if (!grouped[profile.geocodingStatus]) {
        grouped[profile.geocodingStatus] = [];
      }
      grouped[profile.geocodingStatus].push(profile);
    });
    
    return grouped;
  }
);

// Select profile count by geocoding status
export const selectProfileCountByGeocodingStatus = createSelector(
  selectAllTravelProfiles,
  (profiles) => {
    const counts: Record<GeocodingStatus, number> = {
      [GeocodingStatus.NotGeocoded]: 0,
      [GeocodingStatus.Pending]: 0,
      [GeocodingStatus.Success]: 0,
      [GeocodingStatus.Failed]: 0
    };
    
    profiles.forEach(profile => {
      counts[profile.geocodingStatus] = (counts[profile.geocodingStatus] || 0) + 1;
    });
    
    return counts;
  }
);

// Select if any profiles are loading
export const selectHasProfilesLoading = createSelector(
  selectTravelLoading,
  (loading) => loading
);

// Select if profiles have error
export const selectHasProfilesError = createSelector(
  selectTravelError,
  (error) => error !== null
);

// Select profile IDs only (useful for performance)
export const selectTravelProfileIds = createSelector(
  selectProfilesState,
  selectIds
);

// Select technicians with geocoded addresses (for distance calculations)
export const selectTechniciansWithGeocodedAddresses = createSelector(
  selectAllTravelProfiles,
  (profiles) => profiles.filter(profile => 
    profile.geocodingStatus === GeocodingStatus.Success &&
    profile.homeCoordinates !== null
  )
);

// Select travel dashboard view model
export const selectTravelDashboardViewModel = createSelector(
  selectTravelStatistics,
  selectProfilesNeedingGeocoding,
  selectProfilesWithGeocodingErrors,
  selectTravelLoading,
  selectTravelError,
  (statistics, needingGeocoding, withErrors, loading, error) => ({
    statistics,
    needingGeocoding,
    withErrors,
    loading,
    error
  })
);

// Select if technician can be assigned to travel job
export const selectCanAssignToTravelJob = (technicianId: string) => createSelector(
  selectTravelProfile(technicianId),
  (profile) => {
    if (!profile) return false;
    
    return profile.willingToTravel && 
           profile.geocodingStatus === GeocodingStatus.Success &&
           profile.homeCoordinates !== null;
  }
);

// Select technicians available for travel jobs
export const selectTechniciansAvailableForTravel = createSelector(
  selectAllTravelProfiles,
  (profiles) => profiles.filter(profile => 
    profile.willingToTravel &&
    profile.geocodingStatus === GeocodingStatus.Success &&
    profile.homeCoordinates !== null
  )
);

// Select count of technicians available for travel
export const selectTravelAvailableCount = createSelector(
  selectTechniciansAvailableForTravel,
  (profiles) => profiles.length
);
