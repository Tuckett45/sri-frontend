/**
 * Technician Selectors
 * Provides memoized selectors for accessing technician state
 * 
 * All selectors use createSelector for automatic memoization:
 * - Results are cached based on input selector values
 * - Recomputation only occurs when inputs change
 * - Improves performance by avoiding unnecessary recalculations
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TechnicianState } from './technician.state';
import { technicianAdapter } from './technician.reducer';
import { Technician } from '../../models/technician.model';
import { User } from '../../../../models/user.model';
import { DataScope } from '../../services/data-scope.service';
import { determineScopeType } from '../shared/selector-helpers';

// Feature selector
export const selectTechnicianState = createFeatureSelector<TechnicianState>('technicians');

// Entity adapter selectors
const {
  selectIds,
  selectEntities,
  selectAll,
  selectTotal
} = technicianAdapter.getSelectors();

// Select all technicians
export const selectAllTechnicians = createSelector(
  selectTechnicianState,
  selectAll
);

// Select technician entities
export const selectTechnicianEntities = createSelector(
  selectTechnicianState,
  selectEntities
);

// Select technician by ID
export const selectTechnicianById = (id: string) => createSelector(
  selectTechnicianEntities,
  (entities) => entities[id]
);

// Select selected technician ID
export const selectSelectedTechnicianId = createSelector(
  selectTechnicianState,
  (state) => state.selectedId
);

// Select selected technician
export const selectSelectedTechnician = createSelector(
  selectTechnicianEntities,
  selectSelectedTechnicianId,
  (entities, selectedId) => selectedId ? entities[selectedId] : null
);

// Select loading state
export const selectTechniciansLoading = createSelector(
  selectTechnicianState,
  (state) => state.loading
);

// Select error state
export const selectTechniciansError = createSelector(
  selectTechnicianState,
  (state) => state.error
);

// Select filters
export const selectTechnicianFilters = createSelector(
  selectTechnicianState,
  (state) => state.filters
);

// Select total count
export const selectTechniciansTotal = createSelector(
  selectTechnicianState,
  selectTotal
);

// Select filtered technicians
export const selectFilteredTechnicians = createSelector(
  selectAllTechnicians,
  selectTechnicianFilters,
  (technicians, filters) => {
    let filtered = technicians;

    // Filter by search term
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(tech =>
        tech.firstName.toLowerCase().includes(searchLower) ||
        tech.lastName.toLowerCase().includes(searchLower) ||
        tech.id.toLowerCase().includes(searchLower) ||
        tech.email.toLowerCase().includes(searchLower)
      );
    }

    // Filter by role
    if (filters.role) {
      filtered = filtered.filter(tech => tech.role === filters.role);
    }

    // Filter by region
    if (filters.region) {
      filtered = filtered.filter(tech => tech.region === filters.region);
    }

    // Filter by active status
    if (filters.isActive !== undefined) {
      filtered = filtered.filter(tech => tech.isActive === filters.isActive);
    }

    return filtered;
  }
);

// Select active technicians
export const selectActiveTechnicians = createSelector(
  selectAllTechnicians,
  (technicians) => technicians.filter(tech => tech.isActive)
);

// Select technicians by role
export const selectTechniciansByRole = (role: string) => createSelector(
  selectAllTechnicians,
  (technicians) => technicians.filter(tech => tech.role === role)
);

// Select technicians by region
export const selectTechniciansByRegion = (region: string) => createSelector(
  selectAllTechnicians,
  (technicians) => technicians.filter(tech => tech.region === region)
);

// Select technicians with location
export const selectTechniciansWithLocation = createSelector(
  selectAllTechnicians,
  (technicians) => technicians.filter(tech =>
    tech.lastKnownLatitude != null && tech.lastKnownLongitude != null
  )
);

// Select technicians count by role
export const selectTechniciansCountByRole = createSelector(
  selectAllTechnicians,
  (technicians) => {
    const counts: Record<string, number> = {};
    technicians.forEach(tech => {
      counts[tech.role] = (counts[tech.role] || 0) + 1;
    });
    return counts;
  }
);

// Select technicians count by region
export const selectTechniciansCountByRegion = createSelector(
  selectAllTechnicians,
  (technicians) => {
    const counts: Record<string, number> = {};
    technicians.forEach(tech => {
      counts[tech.region] = (counts[tech.region] || 0) + 1;
    });
    return counts;
  }
);

// Select available technicians (active and isAvailable)
export const selectAvailableTechnicians = createSelector(
  selectAllTechnicians,
  (technicians) => technicians.filter(tech => tech.isActive && tech.isAvailable)
);

// Select all unique regions
export const selectAllUniqueRegions = createSelector(
  selectAllTechnicians,
  (technicians) => {
    const regions = new Set<string>();
    technicians.forEach(tech => regions.add(tech.region));
    return Array.from(regions).sort();
  }
);

// Select technicians by status
export const selectTechniciansByStatus = (status: 'available' | 'on-job' | 'unavailable' | 'off-duty') => createSelector(
  selectAllTechnicians,
  (technicians) => {
    return technicians.filter(tech => {
      if (status === 'off-duty') return !tech.isActive;
      if (!tech.isActive) return false;

      switch (status) {
        case 'available':
          return tech.isAvailable;
        case 'unavailable':
          return !tech.isAvailable;
        case 'on-job':
          // Would need assignment data - placeholder
          return false;
        default:
          return false;
      }
    });
  }
);

// Select technicians by market (for scope filtering)
export const selectTechniciansByMarket = (market: string) => createSelector(
  selectAllTechnicians,
  (technicians) => technicians.filter(tech => tech.region === market)
);

// Select technicians by company (for scope filtering)
export const selectTechniciansByCompany = (_company: string) => createSelector(
  selectAllTechnicians,
  (technicians) => {
    // Note: Technician model doesn't have company field yet
    return technicians;
  }
);

// Select technicians by market and company (for PM/Vendor scope)
export const selectTechniciansByMarketAndCompany = (market: string, _company: string) => createSelector(
  selectAllTechnicians,
  (technicians) => {
    // Note: Technician model doesn't have company field yet
    return technicians.filter(tech => tech.region === market);
  }
);

// Select technician IDs only (useful for performance)
export const selectTechnicianIds = createSelector(
  selectTechnicianState,
  selectIds
);

// Select technicians grouped by role
export const selectTechniciansGroupedByRole = createSelector(
  selectAllTechnicians,
  (technicians) => {
    const grouped: Record<string, Technician[]> = {};
    technicians.forEach(tech => {
      if (!grouped[tech.role]) {
        grouped[tech.role] = [];
      }
      grouped[tech.role].push(tech);
    });
    return grouped;
  }
);

// Select technicians grouped by region
export const selectTechniciansGroupedByRegion = createSelector(
  selectAllTechnicians,
  (technicians) => {
    const grouped: Record<string, Technician[]> = {};
    technicians.forEach(tech => {
      if (!grouped[tech.region]) {
        grouped[tech.region] = [];
      }
      grouped[tech.region].push(tech);
    });
    return grouped;
  }
);

// Select technicians with current location (for map display)
export const selectTechniciansForMap = createSelector(
  selectTechniciansWithLocation,
  (technicians) => technicians.map(tech => ({
    id: tech.id,
    name: `${tech.firstName} ${tech.lastName}`,
    latitude: tech.lastKnownLatitude!,
    longitude: tech.lastKnownLongitude!,
    role: tech.role,
    isActive: tech.isActive
  }))
);

// Select technician summary statistics
export const selectTechnicianStatistics = createSelector(
  selectAllTechnicians,
  (technicians) => {
    const total = technicians.length;
    let active = 0;
    const byRole: Record<string, number> = {};

    for (const tech of technicians) {
      if (tech.isActive) active++;
      byRole[tech.role] = (byRole[tech.role] || 0) + 1;
    }

    return {
      total,
      active,
      inactive: total - active,
      byRole
    };
  }
);

// Select if any technicians are loading
export const selectHasTechniciansLoading = createSelector(
  selectTechniciansLoading,
  (loading) => loading
);

// Select if technicians have error
export const selectHasTechniciansError = createSelector(
  selectTechniciansError,
  (error) => error !== null
);

// Select technicians view model (combines multiple pieces of state)
export const selectTechniciansViewModel = createSelector(
  selectFilteredTechnicians,
  selectTechniciansLoading,
  selectTechniciansError,
  selectTechnicianFilters,
  selectTechniciansTotal,
  (technicians, loading, error, filters, total) => ({
    technicians,
    loading,
    error,
    filters,
    total,
    filteredCount: technicians.length
  })
);


// ============================================================================
// SCOPE-FILTERED SELECTORS
// ============================================================================

/**
 * Select technicians filtered by user's data scope
 */
export const selectScopedTechnicians = (user: User, dataScopes: DataScope[]) => createSelector(
  selectAllTechnicians,
  (technicians) => {
    if (!user || !dataScopes || dataScopes.length === 0) {
      console.warn('selectScopedTechnicians: invalid user or dataScopes');
      return [];
    }

    const scopeType = determineScopeType(dataScopes);

    switch (scopeType) {
      case 'all':
        return technicians;
      case 'market':
        if (user.market === 'RG') return technicians;
        return technicians.filter(tech => tech.region === user.market);
      case 'company':
        return technicians.filter(tech => tech.region === user.market);
      case 'self':
        return technicians.filter(tech => tech.id === user.id);
      default:
        console.warn(`selectScopedTechnicians: unknown scope type '${scopeType}'`);
        return [];
    }
  }
);

/**
 * Select filtered technicians with scope filtering applied
 */
export const selectFilteredScopedTechnicians = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedTechnicians(user, dataScopes),
  selectTechnicianFilters,
  (scopedTechnicians, filters) => {
    let filtered = scopedTechnicians;

    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(tech =>
        tech.firstName.toLowerCase().includes(searchLower) ||
        tech.lastName.toLowerCase().includes(searchLower) ||
        tech.id.toLowerCase().includes(searchLower) ||
        tech.email.toLowerCase().includes(searchLower)
      );
    }

    if (filters.role) {
      filtered = filtered.filter(tech => tech.role === filters.role);
    }

    if (filters.region) {
      filtered = filtered.filter(tech => tech.region === filters.region);
    }

    if (filters.isActive !== undefined) {
      filtered = filtered.filter(tech => tech.isActive === filters.isActive);
    }

    return filtered;
  }
);

/**
 * Select active technicians with scope filtering
 */
export const selectScopedActiveTechnicians = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedTechnicians(user, dataScopes),
  (technicians) => technicians.filter(tech => tech.isActive)
);

/**
 * Select available technicians with scope filtering
 */
export const selectScopedAvailableTechnicians = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedTechnicians(user, dataScopes),
  (technicians) => technicians.filter(tech => tech.isActive && tech.isAvailable)
);

/**
 * Select technicians with location for map display, with scope filtering
 */
export const selectScopedTechniciansForMap = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedTechnicians(user, dataScopes),
  (technicians) => technicians
    .filter(tech => tech.lastKnownLatitude != null && tech.lastKnownLongitude != null)
    .map(tech => ({
      id: tech.id,
      name: `${tech.firstName} ${tech.lastName}`,
      latitude: tech.lastKnownLatitude!,
      longitude: tech.lastKnownLongitude!,
      role: tech.role,
      isActive: tech.isActive
    }))
);

/**
 * Select technician statistics with scope filtering
 */
export const selectScopedTechnicianStatistics = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedTechnicians(user, dataScopes),
  (technicians) => {
    const total = technicians.length;
    const active = technicians.filter(t => t.isActive).length;

    const byRole = technicians.reduce((acc, tech) => {
      acc[tech.role] = (acc[tech.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      active,
      inactive: total - active,
      byRole
    };
  }
);

/**
 * Select technicians view model with scope filtering
 */
export const selectScopedTechniciansViewModel = (user: User, dataScopes: DataScope[]) => createSelector(
  selectFilteredScopedTechnicians(user, dataScopes),
  selectTechniciansLoading,
  selectTechniciansError,
  selectTechnicianFilters,
  selectScopedTechnicians(user, dataScopes),
  (technicians, loading, error, filters, allScopedTechnicians) => ({
    technicians,
    loading,
    error,
    filters,
    total: allScopedTechnicians.length,
    filteredCount: technicians.length
  })
);

/**
 * Check if user can access a specific technician
 */
export const selectCanAccessTechnician = (technicianId: string, user: User, dataScopes: DataScope[]) => createSelector(
  selectTechnicianById(technicianId),
  (technician) => {
    if (!technician || !user || !dataScopes || dataScopes.length === 0) return false;

    const scopeType = determineScopeType(dataScopes);

    switch (scopeType) {
      case 'all':
        return true;
      case 'market':
        return user.market === 'RG' || technician.region === user.market;
      case 'company':
        return technician.region === user.market;
      case 'self':
        return technician.id === user.id;
      default:
        return false;
    }
  }
);

// Select available technicians count (active technicians)
export const selectAvailableTechniciansCount = createSelector(
  selectAllTechnicians,
  (technicians) => technicians.filter(tech => tech.isActive).length
);

// ============================================================================
// CROSS-REFERENCE SELECTORS (Technician → Crew → Job)
// ============================================================================

import { selectAllCrews } from '../crews/crew.selectors';
import { selectJobEntities } from '../jobs/job.selectors';

/**
 * Select a map of technician ID → current job name.
 * Joins through crews: technician is in crew.memberIds or crew.leadTechnicianId,
 * crew has activeJobId, job has client + siteName.
 */
export const selectTechnicianCurrentJobMap = createSelector(
  selectAllCrews,
  selectJobEntities,
  (crews, jobEntities): Record<string, string> => {
    const map: Record<string, string> = {};

    for (const crew of crews) {
      if (!crew.activeJobId) continue;
      const job = jobEntities[crew.activeJobId];
      if (!job) continue;

      const jobLabel = `${job.client} – ${job.siteName}`;
      const techIds = [crew.leadTechnicianId, ...crew.memberIds];

      for (const techId of techIds) {
        if (!map[techId]) {
          map[techId] = jobLabel;
        }
      }
    }

    return map;
  }
);

/**
 * Select a map of technician ID → crew name.
 * A technician belongs to a crew if they are the leadTechnicianId or in memberIds.
 */
export const selectTechnicianCrewMap = createSelector(
  selectAllCrews,
  (crews): Record<string, string> => {
    const map: Record<string, string> = {};

    for (const crew of crews) {
      const techIds = [crew.leadTechnicianId, ...crew.memberIds];
      for (const techId of techIds) {
        if (!map[techId]) {
          map[techId] = crew.name;
        }
      }
    }

    return map;
  }
);
