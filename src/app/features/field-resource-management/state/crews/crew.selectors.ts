/**
 * Crew Selectors
 * Provides memoized selectors for accessing crew state
 * 
 * All selectors use createSelector for automatic memoization:
 * - Results are cached based on input selector values
 * - Recomputation only occurs when inputs change
 * - Improves performance by avoiding unnecessary recalculations
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { CrewState } from './crew.state';
import { crewAdapter } from './crew.reducer';
import { Crew, CrewStatus } from '../../models/crew.model';
import { User } from '../../../../models/user.model';
import { DataScope } from '../../services/data-scope.service';
import { determineScopeType } from '../shared/selector-helpers';

// Feature selector
export const selectCrewState = createFeatureSelector<CrewState>('crews');

// Entity adapter selectors
const {
  selectIds,
  selectEntities,
  selectAll,
  selectTotal
} = crewAdapter.getSelectors();

// Select all crews
export const selectAllCrews = createSelector(
  selectCrewState,
  selectAll
);

// Select crew entities
export const selectCrewEntities = createSelector(
  selectCrewState,
  selectEntities
);

// Select crew by ID
export const selectCrewById = (id: string) => createSelector(
  selectCrewEntities,
  (entities) => entities[id]
);

// Select selected crew ID
export const selectSelectedCrewId = createSelector(
  selectCrewState,
  (state) => state.selectedId
);

// Select selected crew
export const selectSelectedCrew = createSelector(
  selectCrewEntities,
  selectSelectedCrewId,
  (entities, selectedId) => selectedId ? entities[selectedId] : null
);

// Select loading state
export const selectCrewsLoading = createSelector(
  selectCrewState,
  (state) => state.loading
);

// Select error state
export const selectCrewsError = createSelector(
  selectCrewState,
  (state) => state.error
);

// Select filters
export const selectCrewFilters = createSelector(
  selectCrewState,
  (state) => state.filters
);

// Select total count
export const selectCrewsTotal = createSelector(
  selectCrewState,
  selectTotal
);

// Select filtered crews
export const selectFilteredCrews = createSelector(
  selectAllCrews,
  selectCrewFilters,
  (crews, filters) => {
    let filtered = crews;

    // Filter by search term
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(crew =>
        crew.name.toLowerCase().includes(searchLower) ||
        crew.id.toLowerCase().includes(searchLower)
      );
    }

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(crew => crew.status === filters.status);
    }

    // Filter by market
    if (filters.market) {
      filtered = filtered.filter(crew => crew.market === filters.market);
    }

    // Filter by company
    if (filters.company) {
      filtered = filtered.filter(crew => crew.company === filters.company);
    }

    // Filter by lead technician
    if (filters.leadTechnicianId) {
      filtered = filtered.filter(crew => crew.leadTechnicianId === filters.leadTechnicianId);
    }

    // Filter by member (crew contains specific technician)
    if (filters.memberId) {
      filtered = filtered.filter(crew =>
        crew.memberIds.includes(filters.memberId!)
      );
    }

    return filtered;
  }
);

// Select crews by status
export const selectCrewsByStatus = (status: CrewStatus) => createSelector(
  selectAllCrews,
  (crews) => crews.filter(crew => crew.status === status)
);

// Select available crews
export const selectAvailableCrews = createSelector(
  selectAllCrews,
  (crews) => crews.filter(crew => crew.status === CrewStatus.Available)
);

// Select crews on job
export const selectCrewsOnJob = createSelector(
  selectAllCrews,
  (crews) => crews.filter(crew => crew.status === CrewStatus.OnJob)
);

// Select unavailable crews
export const selectUnavailableCrews = createSelector(
  selectAllCrews,
  (crews) => crews.filter(crew => crew.status === CrewStatus.Unavailable)
);

// Select crews by market
export const selectCrewsByMarket = (market: string) => createSelector(
  selectAllCrews,
  (crews) => crews.filter(crew => crew.market === market)
);

// Select crews by company
export const selectCrewsByCompany = (company: string) => createSelector(
  selectAllCrews,
  (crews) => crews.filter(crew => crew.company === company)
);

// Select crews by market and company (for PM/Vendor scoping)
export const selectCrewsByMarketAndCompany = (market: string, company: string) => createSelector(
  selectAllCrews,
  (crews) => crews.filter(crew => crew.market === market && crew.company === company)
);

// Select crews by lead technician
export const selectCrewsByLeadTechnician = (technicianId: string) => createSelector(
  selectAllCrews,
  (crews) => crews.filter(crew => crew.leadTechnicianId === technicianId)
);

// Select crews containing specific member
export const selectCrewsByMember = (technicianId: string) => createSelector(
  selectAllCrews,
  (crews) => crews.filter(crew => crew.memberIds.includes(technicianId))
);

// Select crews with active job
export const selectCrewsWithActiveJob = createSelector(
  selectAllCrews,
  (crews) => crews.filter(crew => crew.activeJobId !== undefined && crew.activeJobId !== null)
);

// Select crews without active job
export const selectCrewsWithoutActiveJob = createSelector(
  selectAllCrews,
  (crews) => crews.filter(crew => !crew.activeJobId)
);

// Select crews with location
export const selectCrewsWithLocation = createSelector(
  selectAllCrews,
  (crews) => crews.filter(crew => crew.currentLocation !== undefined && crew.currentLocation !== null)
);

// Select crews for map display
export const selectCrewsForMap = createSelector(
  selectCrewsWithLocation,
  (crews) => crews.map(crew => ({
    id: crew.id,
    name: crew.name,
    location: crew.currentLocation!,
    status: crew.status,
    activeJobId: crew.activeJobId,
    memberCount: crew.memberIds.length
  }))
);

// Select crews count by status
export const selectCrewsCountByStatus = createSelector(
  selectAllCrews,
  (crews) => {
    const counts: Record<CrewStatus, number> = {
      [CrewStatus.Available]: 0,
      [CrewStatus.OnJob]: 0,
      [CrewStatus.Unavailable]: 0
    };
    crews.forEach(crew => {
      counts[crew.status] = (counts[crew.status] || 0) + 1;
    });
    return counts;
  }
);

// Select crews count by market
export const selectCrewsCountByMarket = createSelector(
  selectAllCrews,
  (crews) => {
    const counts: Record<string, number> = {};
    crews.forEach(crew => {
      counts[crew.market] = (counts[crew.market] || 0) + 1;
    });
    return counts;
  }
);

// Select crews count by company
export const selectCrewsCountByCompany = createSelector(
  selectAllCrews,
  (crews) => {
    const counts: Record<string, number> = {};
    crews.forEach(crew => {
      counts[crew.company] = (counts[crew.company] || 0) + 1;
    });
    return counts;
  }
);

// Select crews grouped by status
export const selectCrewsGroupedByStatus = createSelector(
  selectAllCrews,
  (crews) => {
    const grouped: Record<CrewStatus, Crew[]> = {
      [CrewStatus.Available]: [],
      [CrewStatus.OnJob]: [],
      [CrewStatus.Unavailable]: []
    };
    crews.forEach(crew => {
      if (!grouped[crew.status]) {
        grouped[crew.status] = [];
      }
      grouped[crew.status].push(crew);
    });
    return grouped;
  }
);

// Select crews grouped by market
export const selectCrewsGroupedByMarket = createSelector(
  selectAllCrews,
  (crews) => {
    const grouped: Record<string, Crew[]> = {};
    crews.forEach(crew => {
      if (!grouped[crew.market]) {
        grouped[crew.market] = [];
      }
      grouped[crew.market].push(crew);
    });
    return grouped;
  }
);

// Select crews grouped by company
export const selectCrewsGroupedByCompany = createSelector(
  selectAllCrews,
  (crews) => {
    const grouped: Record<string, Crew[]> = {};
    crews.forEach(crew => {
      if (!grouped[crew.company]) {
        grouped[crew.company] = [];
      }
      grouped[crew.company].push(crew);
    });
    return grouped;
  }
);

// Select all unique markets
export const selectAllUniqueMarkets = createSelector(
  selectAllCrews,
  (crews) => {
    const markets = new Set<string>();
    crews.forEach(crew => markets.add(crew.market));
    return Array.from(markets).sort();
  }
);

// Select all unique companies
export const selectAllUniqueCompanies = createSelector(
  selectAllCrews,
  (crews) => {
    const companies = new Set<string>();
    crews.forEach(crew => companies.add(crew.company));
    return Array.from(companies).sort();
  }
);

// Select crew statistics
// Optimized: Single pass through crews array
export const selectCrewStatistics = createSelector(
  selectAllCrews,
  (crews) => {
    const total = crews.length;
    
    const byStatus: Record<CrewStatus, number> = {
      [CrewStatus.Available]: 0,
      [CrewStatus.OnJob]: 0,
      [CrewStatus.Unavailable]: 0
    };
    const byMarket: Record<string, number> = {};
    const byCompany: Record<string, number> = {};
    
    let withActiveJob = 0;
    let withLocation = 0;
    let totalMemberCount = 0;
    
    // Single pass through crews
    for (const crew of crews) {
      byStatus[crew.status] = (byStatus[crew.status] || 0) + 1;
      byMarket[crew.market] = (byMarket[crew.market] || 0) + 1;
      byCompany[crew.company] = (byCompany[crew.company] || 0) + 1;
      
      if (crew.activeJobId) withActiveJob++;
      if (crew.currentLocation) withLocation++;
      totalMemberCount += crew.memberIds.length;
    }

    const averageMemberCount = total > 0 ? totalMemberCount / total : 0;

    return {
      total,
      byStatus,
      byMarket,
      byCompany,
      withActiveJob,
      withLocation,
      averageMemberCount: Math.round(averageMemberCount * 100) / 100
    };
  }
);

// Select crew IDs only (useful for performance)
export const selectCrewIds = createSelector(
  selectCrewState,
  selectIds
);

// Select if any crews are loading
export const selectHasCrewsLoading = createSelector(
  selectCrewsLoading,
  (loading) => loading
);

// Select if crews have error
export const selectHasCrewsError = createSelector(
  selectCrewsError,
  (error) => error !== null
);

// Select crews view model (combines multiple pieces of state)
export const selectCrewsViewModel = createSelector(
  selectFilteredCrews,
  selectCrewsLoading,
  selectCrewsError,
  selectCrewFilters,
  selectCrewsTotal,
  (crews, loading, error, filters, total) => ({
    crews,
    loading,
    error,
    filters,
    total,
    filteredCount: crews.length
  })
);

// Select crew by active job
export const selectCrewByActiveJob = (jobId: string) => createSelector(
  selectAllCrews,
  (crews) => crews.find(crew => crew.activeJobId === jobId)
);

// Select crews needing attention (unavailable or without location)
export const selectCrewsNeedingAttention = createSelector(
  selectAllCrews,
  (crews) => {
    const unavailable = crews.filter(c => c.status === CrewStatus.Unavailable);
    const withoutLocation = crews.filter(c => !c.currentLocation && c.status === CrewStatus.OnJob);
    
    const unavailableIds = new Set(unavailable.map(c => c.id));
    const withoutLocationIds = new Set(withoutLocation.map(c => c.id));
    const allIds = new Set([...unavailableIds, ...withoutLocationIds]);
    
    return {
      count: allIds.size,
      unavailableCount: unavailableIds.size,
      withoutLocationCount: withoutLocationIds.size,
      crews: [...unavailable, ...withoutLocation.filter(c => !unavailableIds.has(c.id))]
    };
  }
);

// Select crew member count
export const selectCrewMemberCount = (crewId: string) => createSelector(
  selectCrewById(crewId),
  (crew) => crew ? crew.memberIds.length : 0
);

// Select if crew has specific member
export const selectCrewHasMember = (crewId: string, technicianId: string) => createSelector(
  selectCrewById(crewId),
  (crew) => crew ? crew.memberIds.includes(technicianId) : false
);

// Select if crew is lead by specific technician
export const selectIsCrewLead = (crewId: string, technicianId: string) => createSelector(
  selectCrewById(crewId),
  (crew) => crew ? crew.leadTechnicianId === technicianId : false
);

// ============================================================================
// SCOPE-FILTERED SELECTORS
// ============================================================================
// These selectors apply role-based data scope filtering according to the
// filterDataByScope algorithm from the design document.
//
// Usage: Components should inject DataScopeService and pass user + dataScopes
// to these selector factories.
// ============================================================================

/**
 * Select crews filtered by user's data scope
 * 
 * Applies role-based filtering:
 * - Admin: sees all crews
 * - CM: sees crews in their market (or all if RG market)
 * - PM/Vendor: sees crews in their company AND market
 * - Technician: sees only crews they are part of
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns scope-filtered crews
 */
export const selectScopedCrews = (user: User, dataScopes: DataScope[]) => createSelector(
  selectAllCrews,
  (crews) => {
    if (!user || !dataScopes || dataScopes.length === 0) {
      console.warn('selectScopedCrews: invalid user or dataScopes');
      return [];
    }

    // Determine scope type
    const scopeType = determineScopeType(dataScopes);

    // Apply scope filtering
    switch (scopeType) {
      case 'all':
        // Admin: see all crews
        return crews;

      case 'market':
        // CM: see crews in their market (or all if RG market)
        if (user.market === 'RG') {
          return crews;
        }
        return crews.filter(crew => crew.market === user.market);

      case 'company':
        // PM/Vendor: see crews in their company AND market
        return crews.filter(crew =>
          crew.company === user.company && crew.market === user.market
        );

      case 'self':
        // Technician: see only crews they are part of (as lead or member)
        return crews.filter(crew =>
          crew.leadTechnicianId === user.id || crew.memberIds.includes(user.id)
        );

      default:
        console.warn(`selectScopedCrews: unknown scope type '${scopeType}'`);
        return [];
    }
  }
);

/**
 * Select filtered crews with scope filtering applied
 * 
 * Combines UI filters (search, status, market, etc.) with role-based scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns filtered and scoped crews
 */
export const selectFilteredScopedCrews = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedCrews(user, dataScopes),
  selectCrewFilters,
  (scopedCrews, filters) => {
    let filtered = scopedCrews;

    // Apply UI filters on top of scope filtering
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(crew =>
        crew.name.toLowerCase().includes(searchLower) ||
        crew.id.toLowerCase().includes(searchLower)
      );
    }

    if (filters.status) {
      filtered = filtered.filter(crew => crew.status === filters.status);
    }

    if (filters.market) {
      filtered = filtered.filter(crew => crew.market === filters.market);
    }

    if (filters.company) {
      filtered = filtered.filter(crew => crew.company === filters.company);
    }

    if (filters.leadTechnicianId) {
      filtered = filtered.filter(crew => crew.leadTechnicianId === filters.leadTechnicianId);
    }

    if (filters.memberId) {
      filtered = filtered.filter(crew => crew.memberIds.includes(filters.memberId!));
    }

    return filtered;
  }
);

/**
 * Select available crews with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns available crews within user's scope
 */
export const selectScopedAvailableCrews = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedCrews(user, dataScopes),
  (crews) => crews.filter(crew => crew.status === CrewStatus.Available)
);

/**
 * Select crews on job with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns crews on job within user's scope
 */
export const selectScopedCrewsOnJob = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedCrews(user, dataScopes),
  (crews) => crews.filter(crew => crew.status === CrewStatus.OnJob)
);

/**
 * Select crews with location for map display, with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns crews with location within user's scope
 */
export const selectScopedCrewsForMap = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedCrews(user, dataScopes),
  (crews) => crews
    .filter(crew => crew.currentLocation !== undefined && crew.currentLocation !== null)
    .map(crew => ({
      id: crew.id,
      name: crew.name,
      location: crew.currentLocation!,
      status: crew.status,
      activeJobId: crew.activeJobId,
      memberCount: crew.memberIds.length
    }))
);

/**
 * Select crew statistics with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns statistics for crews within user's scope
 */
export const selectScopedCrewStatistics = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedCrews(user, dataScopes),
  (crews) => {
    const total = crews.length;
    const byStatus = crews.reduce((acc, crew) => {
      acc[crew.status] = (acc[crew.status] || 0) + 1;
      return acc;
    }, {} as Record<CrewStatus, number>);

    const byMarket = crews.reduce((acc, crew) => {
      acc[crew.market] = (acc[crew.market] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byCompany = crews.reduce((acc, crew) => {
      acc[crew.company] = (acc[crew.company] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const withActiveJob = crews.filter(c => c.activeJobId).length;
    const withLocation = crews.filter(c => c.currentLocation).length;

    const averageMemberCount = total > 0
      ? crews.reduce((sum, crew) => sum + crew.memberIds.length, 0) / total
      : 0;

    return {
      total,
      byStatus,
      byMarket,
      byCompany,
      withActiveJob,
      withLocation,
      averageMemberCount: Math.round(averageMemberCount * 100) / 100
    };
  }
);

/**
 * Select crews view model with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns view model with scoped crews
 */
export const selectScopedCrewsViewModel = (user: User, dataScopes: DataScope[]) => createSelector(
  selectFilteredScopedCrews(user, dataScopes),
  selectCrewsLoading,
  selectCrewsError,
  selectCrewFilters,
  selectScopedCrews(user, dataScopes),
  (crews, loading, error, filters, allScopedCrews) => ({
    crews,
    loading,
    error,
    filters,
    total: allScopedCrews.length,
    filteredCount: crews.length
  })
);

/**
 * Check if user can access a specific crew
 * 
 * @param crewId - ID of crew to check
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns boolean indicating if user can access crew
 */
export const selectCanAccessCrew = (crewId: string, user: User, dataScopes: DataScope[]) => createSelector(
  selectCrewById(crewId),
  (crew) => {
    if (!crew || !user || !dataScopes || dataScopes.length === 0) {
      return false;
    }

    const scopeType = determineScopeType(dataScopes);

    switch (scopeType) {
      case 'all':
        return true;

      case 'market':
        if (user.market === 'RG') {
          return true;
        }
        return crew.market === user.market;

      case 'company':
        return crew.company === user.company && crew.market === user.market;

      case 'self':
        return crew.leadTechnicianId === user.id || crew.memberIds.includes(user.id);

      default:
        return false;
    }
  }
);

/**
 * Select crews where user is lead technician
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns crews where user is lead
 */
export const selectCrewsWhereUserIsLead = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedCrews(user, dataScopes),
  (crews) => crews.filter(crew => crew.leadTechnicianId === user.id)
);

/**
 * Select crews where user is member (but not lead)
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns crews where user is member
 */
export const selectCrewsWhereUserIsMember = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedCrews(user, dataScopes),
  (crews) => crews.filter(crew =>
    crew.memberIds.includes(user.id) && crew.leadTechnicianId !== user.id
  )
);

/**
 * Select crews needing attention with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns crews needing attention within user's scope
 */
export const selectScopedCrewsNeedingAttention = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedCrews(user, dataScopes),
  (crews) => {
    const unavailable = crews.filter(c => c.status === CrewStatus.Unavailable);
    const withoutLocation = crews.filter(c => !c.currentLocation && c.status === CrewStatus.OnJob);
    
    const unavailableIds = new Set(unavailable.map(c => c.id));
    const withoutLocationIds = new Set(withoutLocation.map(c => c.id));
    const allIds = new Set([...unavailableIds, ...withoutLocationIds]);
    
    return {
      count: allIds.size,
      unavailableCount: unavailableIds.size,
      withoutLocationCount: withoutLocationIds.size,
      crews: [...unavailable, ...withoutLocation.filter(c => !unavailableIds.has(c.id))]
    };
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
// Note: determineScopeType helper function has been moved to shared/selector-helpers.ts
// to avoid code duplication across selector files.

// Location History Selectors

/**
 * Select location history loading state
 */
export const selectLocationHistoryLoading = createSelector(
  selectCrewState,
  (state) => state.locationHistoryLoading
);

/**
 * Select location history error
 */
export const selectLocationHistoryError = createSelector(
  selectCrewState,
  (state) => state.locationHistoryError
);

/**
 * Select all location history
 */
export const selectAllLocationHistory = createSelector(
  selectCrewState,
  (state) => state.locationHistory
);

/**
 * Select location history for a specific crew
 */
export const selectCrewLocationHistory = (crewId: string) => createSelector(
  selectAllLocationHistory,
  (history) => history[crewId] || []
);
