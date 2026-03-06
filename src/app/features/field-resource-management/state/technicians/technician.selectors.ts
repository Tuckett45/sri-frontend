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
import { Technician, Skill, TechnicianRole, EmploymentType } from '../../models/technician.model';
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
        tech.technicianId.toLowerCase().includes(searchLower) ||
        tech.email.toLowerCase().includes(searchLower)
      );
    }

    // Filter by role
    if (filters.role) {
      filtered = filtered.filter(tech => tech.role === filters.role);
    }

    // Filter by skills
    if (filters.skills && filters.skills.length > 0) {
      filtered = filtered.filter(tech =>
        filters.skills!.some(skillName =>
          tech.skills.some(techSkill => techSkill.name === skillName)
        )
      );
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

// Select technicians by skill
export const selectTechniciansBySkill = (skillName: string) => createSelector(
  selectAllTechnicians,
  (technicians) => technicians.filter(tech =>
    tech.skills.some(skill => skill.name === skillName)
  )
);

// Memoized date thresholds selector - reused by multiple certification selectors
// Optimized: Calculate once and share across selectors
const selectCertificationDateThresholds = createSelector(
  () => true, // Dummy input to trigger memoization
  () => {
    const now = new Date();
    const nowTime = now.getTime();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const thirtyDaysTime = thirtyDaysFromNow.getTime();
    
    return { nowTime, thirtyDaysTime };
  }
);

// Select technicians with expiring certifications
// Optimized: Reuses memoized date thresholds
export const selectTechniciansWithExpiringCertifications = createSelector(
  selectAllTechnicians,
  selectCertificationDateThresholds,
  (technicians, { nowTime, thirtyDaysTime }) => {
    return technicians.filter(tech =>
      tech.certifications.some(cert => {
        const expirationTime = new Date(cert.expirationDate).getTime();
        return expirationTime <= thirtyDaysTime && expirationTime > nowTime;
      })
    );
  }
);

// Select technicians by region
export const selectTechniciansByRegion = (region: string) => createSelector(
  selectAllTechnicians,
  (technicians) => technicians.filter(tech => tech.region === region)
);

// Select technicians by employment type
export const selectTechniciansByEmploymentType = (employmentType: string) => createSelector(
  selectAllTechnicians,
  (technicians) => technicians.filter(tech => tech.employmentType === employmentType)
);

// Select technicians with location
export const selectTechniciansWithLocation = createSelector(
  selectAllTechnicians,
  (technicians) => technicians.filter(tech => tech.currentLocation !== undefined && tech.currentLocation !== null)
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

// Memoized today timestamp selector - reused by multiple selectors
// Optimized: Calculate once and share across selectors
const selectTodayTimestamp = createSelector(
  () => true, // Dummy input to trigger memoization
  () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.getTime();
  }
);

// Select available technicians (active and not on PTO/sick)
// Optimized: Reuses memoized today timestamp
export const selectAvailableTechnicians = createSelector(
  selectAllTechnicians,
  selectTodayTimestamp,
  (technicians, todayTime) => {
    return technicians.filter(tech => {
      if (!tech.isActive) return false;
      
      // Check if technician has availability record for today
      const todayAvailability = tech.availability.find(avail => {
        const availDate = new Date(avail.date);
        availDate.setHours(0, 0, 0, 0);
        return availDate.getTime() === todayTime;
      });
      
      // If no availability record, assume available
      // If availability record exists, check isAvailable flag
      return !todayAvailability || todayAvailability.isAvailable;
    });
  }
);

// Select technicians with multiple skills
export const selectTechniciansWithMultipleSkills = createSelector(
  selectAllTechnicians,
  (technicians) => technicians.filter(tech => tech.skills.length > 1)
);

// Select technicians by skill category
export const selectTechniciansBySkillCategory = (category: string) => createSelector(
  selectAllTechnicians,
  (technicians) => technicians.filter(tech =>
    tech.skills.some(skill => skill.category === category)
  )
);

// Select all unique skills across all technicians
export const selectAllUniqueSkills = createSelector(
  selectAllTechnicians,
  (technicians) => {
    const skillsMap = new Map<string, Skill>();
    technicians.forEach(tech => {
      tech.skills.forEach(skill => {
        if (!skillsMap.has(skill.id)) {
          skillsMap.set(skill.id, skill);
        }
      });
    });
    return Array.from(skillsMap.values());
  }
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

// Select technicians needing certification renewal (within 30 days)
// Optimized: Reuses memoized date thresholds
export const selectTechniciansNeedingCertificationRenewal = createSelector(
  selectAllTechnicians,
  selectCertificationDateThresholds,
  (technicians, { nowTime, thirtyDaysTime }) => {
    return technicians
      .map(tech => ({
        technician: tech,
        expiringCerts: tech.certifications.filter(cert => {
          const expirationTime = new Date(cert.expirationDate).getTime();
          return expirationTime > nowTime && expirationTime <= thirtyDaysTime;
        })
      }))
      .filter(item => item.expiringCerts.length > 0);
  }
);

// Memoized current timestamp selector - reused by multiple selectors
// Optimized: Calculate once and share across selectors
const selectCurrentTimestamp = createSelector(
  () => true, // Dummy input to trigger memoization
  () => new Date().getTime()
);

// Select technicians with expired certifications
// Optimized: Reuses memoized current timestamp
export const selectTechniciansWithExpiredCertifications = createSelector(
  selectAllTechnicians,
  selectCurrentTimestamp,
  (technicians, nowTime) => {
    return technicians.filter(tech =>
      tech.certifications.some(cert => {
        const expirationTime = new Date(cert.expirationDate).getTime();
        return expirationTime < nowTime;
      })
    );
  }
);

// Select technicians by status (based on availability)
export const selectTechniciansByStatus = (status: 'available' | 'on-job' | 'unavailable' | 'off-duty') => createSelector(
  selectAllTechnicians,
  (technicians) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return technicians.filter(tech => {
      if (status === 'off-duty') {
        return !tech.isActive;
      }

      if (!tech.isActive) {
        return false;
      }

      const todayAvailability = tech.availability.find(avail => {
        const availDate = new Date(avail.date);
        availDate.setHours(0, 0, 0, 0);
        return availDate.getTime() === today.getTime();
      });

      switch (status) {
        case 'available':
          return !todayAvailability || todayAvailability.isAvailable;
        case 'unavailable':
          return todayAvailability && !todayAvailability.isAvailable;
        case 'on-job':
          // This would need assignment data - placeholder for now
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
export const selectTechniciansByCompany = (company: string) => createSelector(
  selectAllTechnicians,
  (technicians) => {
    // Note: Technician model doesn't have company field yet
    // This selector is prepared for when company field is added
    return technicians;
  }
);

// Select technicians by market and company (for PM/Vendor scope)
export const selectTechniciansByMarketAndCompany = (market: string, company: string) => createSelector(
  selectAllTechnicians,
  (technicians) => {
    // Note: Technician model doesn't have company field yet
    // This selector is prepared for when company field is added
    return technicians.filter(tech => tech.region === market);
  }
);

// Select technician IDs only (useful for performance)
export const selectTechnicianIds = createSelector(
  selectTechnicianState,
  selectIds
);

// Select technicians with specific skill level
export const selectTechniciansBySkillLevel = (skillName: string, minLevel: number) => createSelector(
  selectAllTechnicians,
  (technicians) => technicians.filter(tech =>
    tech.skills.some(skill => 
      skill.name === skillName && 
      // Assuming skill has a level property that will be added
      true
    )
  )
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
    location: tech.currentLocation!,
    role: tech.role,
    isActive: tech.isActive
  }))
);

// Select technician summary statistics
// Optimized: Single pass through technicians array, reuses memoized timestamp
export const selectTechnicianStatistics = createSelector(
  selectAllTechnicians,
  selectCurrentTimestamp,
  (technicians, nowTime) => {
    const total = technicians.length;
    
    let active = 0;
    let withExpiredCerts = 0;
    const byRole: Record<string, number> = {};
    const byEmploymentType: Record<string, number> = {};
    
    // Single pass through technicians
    for (const tech of technicians) {
      if (tech.isActive) active++;
      
      byRole[tech.role] = (byRole[tech.role] || 0) + 1;
      byEmploymentType[tech.employmentType] = (byEmploymentType[tech.employmentType] || 0) + 1;
      
      if (tech.certifications.some(cert => new Date(cert.expirationDate).getTime() < nowTime)) {
        withExpiredCerts++;
      }
    }

    return {
      total,
      active,
      inactive: total - active,
      byRole,
      byEmploymentType,
      withExpiredCertifications: withExpiredCerts
    };
  }
);

// Select technicians needing attention (expired certs or expiring soon)
export const selectTechniciansNeedingAttention = createSelector(
  selectTechniciansWithExpiredCertifications,
  selectTechniciansWithExpiringCertifications,
  (expired, expiring) => {
    const expiredIds = new Set(expired.map(t => t.id));
    const expiringIds = new Set(expiring.map(t => t.id));
    const allIds = new Set([...expiredIds, ...expiringIds]);
    
    return {
      count: allIds.size,
      expiredCount: expiredIds.size,
      expiringCount: expiringIds.size,
      technicians: [...expired, ...expiring.filter(t => !expiredIds.has(t.id))]
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
// These selectors apply role-based data scope filtering according to the
// filterDataByScope algorithm from the design document.
//
// Usage: Components should inject DataScopeService and pass user + dataScopes
// to these selector factories.
// ============================================================================

/**
 * Select technicians filtered by user's data scope
 * 
 * Applies role-based filtering:
 * - Admin: sees all technicians
 * - CM: sees technicians in their market (or all if RG market)
 * - PM/Vendor: sees technicians in their company AND market
 * - Technician: sees only themselves
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns scope-filtered technicians
 * 
 * Note: Technician model uses 'region' field which maps to 'market' in scope filtering
 * Note: Technician model doesn't have 'company' field yet - will be added in future
 */
export const selectScopedTechnicians = (user: User, dataScopes: DataScope[]) => createSelector(
  selectAllTechnicians,
  (technicians) => {
    if (!user || !dataScopes || dataScopes.length === 0) {
      console.warn('selectScopedTechnicians: invalid user or dataScopes');
      return [];
    }

    // Determine scope type
    const scopeType = determineScopeType(dataScopes);

    // Apply scope filtering
    switch (scopeType) {
      case 'all':
        // Admin: see all technicians
        return technicians;

      case 'market':
        // CM: see technicians in their market (or all if RG market)
        if (user.market === 'RG') {
          return technicians;
        }
        // Filter by market (using region field as market)
        return technicians.filter(tech => tech.region === user.market);

      case 'company':
        // PM/Vendor: see technicians in their company AND market
        // Note: Technician model doesn't have company field yet
        // For now, just filter by market
        return technicians.filter(tech => tech.region === user.market);

      case 'self':
        // Technician: see only themselves
        return technicians.filter(tech => tech.id === user.id);

      default:
        console.warn(`selectScopedTechnicians: unknown scope type '${scopeType}'`);
        return [];
    }
  }
);

/**
 * Select filtered technicians with scope filtering applied
 * 
 * Combines UI filters (search, role, skills, etc.) with role-based scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns filtered and scoped technicians
 */
export const selectFilteredScopedTechnicians = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedTechnicians(user, dataScopes),
  selectTechnicianFilters,
  (scopedTechnicians, filters) => {
    let filtered = scopedTechnicians;

    // Apply UI filters on top of scope filtering
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(tech =>
        tech.firstName.toLowerCase().includes(searchLower) ||
        tech.lastName.toLowerCase().includes(searchLower) ||
        tech.technicianId.toLowerCase().includes(searchLower) ||
        tech.email.toLowerCase().includes(searchLower)
      );
    }

    if (filters.role) {
      filtered = filtered.filter(tech => tech.role === filters.role);
    }

    if (filters.skills && filters.skills.length > 0) {
      filtered = filtered.filter(tech =>
        filters.skills!.some(skillName =>
          tech.skills.some(techSkill => techSkill.name === skillName)
        )
      );
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
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns active technicians within user's scope
 */
export const selectScopedActiveTechnicians = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedTechnicians(user, dataScopes),
  (technicians) => technicians.filter(tech => tech.isActive)
);

/**
 * Select available technicians with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns available technicians within user's scope
 */
export const selectScopedAvailableTechnicians = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedTechnicians(user, dataScopes),
  (technicians) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return technicians.filter(tech => {
      if (!tech.isActive) return false;
      
      const todayAvailability = tech.availability.find(avail => {
        const availDate = new Date(avail.date);
        availDate.setHours(0, 0, 0, 0);
        return availDate.getTime() === today.getTime();
      });
      
      return !todayAvailability || todayAvailability.isAvailable;
    });
  }
);

/**
 * Select technicians with location for map display, with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns technicians with location within user's scope
 */
export const selectScopedTechniciansForMap = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedTechnicians(user, dataScopes),
  (technicians) => technicians
    .filter(tech => tech.currentLocation !== undefined && tech.currentLocation !== null)
    .map(tech => ({
      id: tech.id,
      name: `${tech.firstName} ${tech.lastName}`,
      location: tech.currentLocation!,
      role: tech.role,
      isActive: tech.isActive
    }))
);

/**
 * Select technician statistics with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns statistics for technicians within user's scope
 */
export const selectScopedTechnicianStatistics = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedTechnicians(user, dataScopes),
  (technicians) => {
    const total = technicians.length;
    const active = technicians.filter(t => t.isActive).length;
    const inactive = total - active;
    
    const byRole = technicians.reduce((acc, tech) => {
      acc[tech.role] = (acc[tech.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byEmploymentType = technicians.reduce((acc, tech) => {
      acc[tech.employmentType] = (acc[tech.employmentType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const withExpiredCerts = technicians.filter(tech => {
      const now = new Date();
      return tech.certifications.some(cert => {
        const expirationDate = new Date(cert.expirationDate);
        return expirationDate < now;
      });
    }).length;

    return {
      total,
      active,
      inactive,
      byRole,
      byEmploymentType,
      withExpiredCertifications: withExpiredCerts
    };
  }
);

/**
 * Select technicians view model with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns view model with scoped technicians
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
 * 
 * @param technicianId - ID of technician to check
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns boolean indicating if user can access technician
 */
export const selectCanAccessTechnician = (technicianId: string, user: User, dataScopes: DataScope[]) => createSelector(
  selectTechnicianById(technicianId),
  (technician) => {
    if (!technician || !user || !dataScopes || dataScopes.length === 0) {
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
        return technician.region === user.market;

      case 'company':
        // Note: Technician model doesn't have company field yet
        return technician.region === user.market;

      case 'self':
        return technician.id === user.id;

      default:
        return false;
    }
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
// Note: determineScopeType helper function has been moved to shared/selector-helpers.ts
// to avoid code duplication across selector files.

