/**
 * Technician Selectors
 * Provides memoized selectors for accessing technician state
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TechnicianState } from './technician.state';
import { technicianAdapter } from './technician.reducer';
import { Technician } from '../../models/technician.model';

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

// Select technicians with expiring certifications
export const selectTechniciansWithExpiringCertifications = createSelector(
  selectAllTechnicians,
  (technicians) => {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    return technicians.filter(tech =>
      tech.certifications.some(cert => {
        const expirationDate = new Date(cert.expirationDate);
        return expirationDate <= thirtyDaysFromNow && expirationDate > new Date();
      })
    );
  }
);
