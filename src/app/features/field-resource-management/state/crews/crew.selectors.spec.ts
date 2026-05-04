/**
 * Crew Selectors Unit Tests
 * Tests all selectors for crew state management
 */

import * as fromCrewSelectors from './crew.selectors';
import { CrewState } from './crew.state';
import { Crew, CrewStatus } from '../../models/crew.model';
import { User } from '../../../../models/user.model';
import { DataScope } from '../../services/data-scope.service';
import { crewAdapter } from './crew.reducer';

describe('Crew Selectors', () => {
  const mockCrew1: Crew = {
    id: 'crew-1',
    name: 'Alpha Team',
    leadTechnicianId: 'tech-001',
    memberIds: ['tech-001', 'tech-002', 'tech-003'],
    market: 'DALLAS',
    company: 'ACME_CORP',
    status: CrewStatus.Available,
    currentLocation: {
      latitude: 32.7767,
      longitude: -96.7970,
      accuracy: 10
    },
    activeJobId: undefined,
    createdAt: new Date('2024-01-01'),    updatedAt: new Date('2024-01-01')
  };

  const mockCrew2: Crew = {
    id: 'crew-2',
    name: 'Bravo Team',
    leadTechnicianId: 'tech-004',
    memberIds: ['tech-004', 'tech-005'],
    market: 'AUSTIN',
    company: 'ACME_CORP',
    status: CrewStatus.OnJob,
    currentLocation: {
      latitude: 30.2672,
      longitude: -97.7431,
      accuracy: 15
    },
    activeJobId: 'job-123',
    createdAt: new Date('2024-01-02'),    updatedAt: new Date('2024-01-02')
  };

  const mockCrew3: Crew = {
    id: 'crew-3',
    name: 'Charlie Team',
    leadTechnicianId: 'tech-006',
    memberIds: ['tech-006', 'tech-007', 'tech-008'],
    market: 'DALLAS',
    company: 'BETA_CORP',
    status: CrewStatus.Unavailable,
    currentLocation: undefined,
    activeJobId: undefined,
    createdAt: new Date('2024-01-03'),    updatedAt: new Date('2024-01-03')
  };

  const mockAdminUser: User = {
    id: 'user-admin',
    email: 'admin@example.com',
    role: 'Admin',
    market: 'ALL',
    company: 'INTERNAL',
    name: 'Admin User',
    password: 'password123',
    createdDate: new Date(),
    isApproved: true
  };

  const mockCMUser: User = {
    id: 'user-cm',
    email: 'cm@example.com',
    role: 'ConstructionManager',
    market: 'DALLAS',
    company: 'INTERNAL',
    name: 'CM User',
    password: 'password123',
    createdDate: new Date(),
    isApproved: true
  };

  const mockPMUser: User = {
    id: 'user-pm',
    email: 'pm@example.com',
    role: 'ProjectManager',
    market: 'DALLAS',
    company: 'ACME_CORP',
    name: 'PM User',
    password: 'password123',
    createdDate: new Date(),
    isApproved: true
  };

  const mockTechUser: User = {
    id: 'tech-001',
    email: 'tech@example.com',
    role: 'Technician',
    market: 'DALLAS',
    company: 'ACME_CORP',
    name: 'Tech User',
    password: 'password123',
    createdDate: new Date(),
    isApproved: true
  };

  const adminDataScopes: DataScope[] = [{ scopeType: 'all', scopeValues: [] }];
  const cmDataScopes: DataScope[] = [{ scopeType: 'market', scopeValues: ['DALLAS'] }];
  const pmDataScopes: DataScope[] = [{ scopeType: 'company', scopeValues: ['ACME_CORP'] }];
  const techDataScopes: DataScope[] = [{ scopeType: 'self', scopeValues: ['tech-001'] }];

  let initialState: CrewState;

  beforeEach(() => {
    initialState = crewAdapter.setAll(
      [mockCrew1, mockCrew2, mockCrew3],
      {
        selectedId: null,
        loading: false,
        error: null,
        filters: {}
      }
    );
  });

  describe('Basic Selectors', () => {
    it('should select all crews', () => {
      const result = fromCrewSelectors.selectAllCrews.projector(initialState);
      expect(result.length).toBe(3);
      expect(result).toContain(mockCrew1);
      expect(result).toContain(mockCrew2);
      expect(result).toContain(mockCrew3);
    });

    it('should select crew entities', () => {
      const result = fromCrewSelectors.selectCrewEntities.projector(initialState);
      expect(result[mockCrew1.id]).toEqual(mockCrew1);
      expect(result[mockCrew2.id]).toEqual(mockCrew2);
      expect(result[mockCrew3.id]).toEqual(mockCrew3);
    });

    it('should select crew by id', () => {
      const entities = fromCrewSelectors.selectCrewEntities.projector(initialState);
      const result = fromCrewSelectors.selectCrewById(mockCrew1.id).projector(entities);
      expect(result).toEqual(mockCrew1);
    });

    it('should select loading state', () => {
      const result = fromCrewSelectors.selectCrewsLoading.projector(initialState);
      expect(result).toBe(false);
    });

    it('should select error state', () => {
      const result = fromCrewSelectors.selectCrewsError.projector(initialState);
      expect(result).toBeNull();
    });

    it('should select filters', () => {
      const result = fromCrewSelectors.selectCrewFilters.projector(initialState);
      expect(result).toEqual({});
    });

    it('should select total count', () => {
      const result = fromCrewSelectors.selectCrewsTotal.projector(initialState);
      expect(result).toBe(3);
    });
  });

  describe('Selection Selectors', () => {
    it('should select selected crew id', () => {
      const stateWithSelection = { ...initialState, selectedId: mockCrew1.id };
      const result = fromCrewSelectors.selectSelectedCrewId.projector(stateWithSelection);
      expect(result).toBe(mockCrew1.id);
    });

    it('should select selected crew', () => {
      const entities = fromCrewSelectors.selectCrewEntities.projector(initialState);
      const result = fromCrewSelectors.selectSelectedCrew.projector(entities, mockCrew1.id);
      expect(result).toEqual(mockCrew1);
    });

    it('should return null when no crew is selected', () => {
      const entities = fromCrewSelectors.selectCrewEntities.projector(initialState);
      const result = fromCrewSelectors.selectSelectedCrew.projector(entities, null);
      expect(result).toBeNull();
    });
  });

  describe('Filter Selectors', () => {
    it('should filter crews by search term', () => {
      const crews = [mockCrew1, mockCrew2, mockCrew3];
      const filters = { searchTerm: 'alpha' };
      const result = fromCrewSelectors.selectFilteredCrews.projector(crews, filters);
      expect(result.length).toBe(1);
      expect(result[0]).toEqual(mockCrew1);
    });

    it('should filter crews by status', () => {
      const crews = [mockCrew1, mockCrew2, mockCrew3];
      const filters = { status: CrewStatus.Available };
      const result = fromCrewSelectors.selectFilteredCrews.projector(crews, filters);
      expect(result.length).toBe(1);
      expect(result[0]).toEqual(mockCrew1);
    });

    it('should filter crews by market', () => {
      const crews = [mockCrew1, mockCrew2, mockCrew3];
      const filters = { market: 'DALLAS' };
      const result = fromCrewSelectors.selectFilteredCrews.projector(crews, filters);
      expect(result.length).toBe(2);
      expect(result).toContain(mockCrew1);
      expect(result).toContain(mockCrew3);
    });

    it('should filter crews by company', () => {
      const crews = [mockCrew1, mockCrew2, mockCrew3];
      const filters = { company: 'ACME_CORP' };
      const result = fromCrewSelectors.selectFilteredCrews.projector(crews, filters);
      expect(result.length).toBe(2);
      expect(result).toContain(mockCrew1);
      expect(result).toContain(mockCrew2);
    });

    it('should filter crews by lead technician', () => {
      const crews = [mockCrew1, mockCrew2, mockCrew3];
      const filters = { leadTechnicianId: 'tech-001' };
      const result = fromCrewSelectors.selectFilteredCrews.projector(crews, filters);
      expect(result.length).toBe(1);
      expect(result[0]).toEqual(mockCrew1);
    });

    it('should filter crews by member', () => {
      const crews = [mockCrew1, mockCrew2, mockCrew3];
      const filters = { memberId: 'tech-002' };
      const result = fromCrewSelectors.selectFilteredCrews.projector(crews, filters);
      expect(result.length).toBe(1);
      expect(result[0]).toEqual(mockCrew1);
    });

    it('should apply multiple filters', () => {
      const crews = [mockCrew1, mockCrew2, mockCrew3];
      const filters = { market: 'DALLAS', status: CrewStatus.Available };
      const result = fromCrewSelectors.selectFilteredCrews.projector(crews, filters);
      expect(result.length).toBe(1);
      expect(result[0]).toEqual(mockCrew1);
    });
  });

  describe('Status Selectors', () => {
    it('should select crews by status', () => {
      const crews = [mockCrew1, mockCrew2, mockCrew3];
      const result = fromCrewSelectors.selectCrewsByStatus(CrewStatus.Available).projector(crews);
      expect(result.length).toBe(1);
      expect(result[0]).toEqual(mockCrew1);
    });

    it('should select available crews', () => {
      const crews = [mockCrew1, mockCrew2, mockCrew3];
      const result = fromCrewSelectors.selectAvailableCrews.projector(crews);
      expect(result.length).toBe(1);
      expect(result[0]).toEqual(mockCrew1);
    });

    it('should select crews on job', () => {
      const crews = [mockCrew1, mockCrew2, mockCrew3];
      const result = fromCrewSelectors.selectCrewsOnJob.projector(crews);
      expect(result.length).toBe(1);
      expect(result[0]).toEqual(mockCrew2);
    });

    it('should select unavailable crews', () => {
      const crews = [mockCrew1, mockCrew2, mockCrew3];
      const result = fromCrewSelectors.selectUnavailableCrews.projector(crews);
      expect(result.length).toBe(1);
      expect(result[0]).toEqual(mockCrew3);
    });
  });

  describe('Market and Company Selectors', () => {
    it('should select crews by market', () => {
      const crews = [mockCrew1, mockCrew2, mockCrew3];
      const result = fromCrewSelectors.selectCrewsByMarket('DALLAS').projector(crews);
      expect(result.length).toBe(2);
      expect(result).toContain(mockCrew1);
      expect(result).toContain(mockCrew3);
    });

    it('should select crews by company', () => {
      const crews = [mockCrew1, mockCrew2, mockCrew3];
      const result = fromCrewSelectors.selectCrewsByCompany('ACME_CORP').projector(crews);
      expect(result.length).toBe(2);
      expect(result).toContain(mockCrew1);
      expect(result).toContain(mockCrew2);
    });

    it('should select crews by market and company', () => {
      const crews = [mockCrew1, mockCrew2, mockCrew3];
      const result = fromCrewSelectors.selectCrewsByMarketAndCompany('DALLAS', 'ACME_CORP').projector(crews);
      expect(result.length).toBe(1);
      expect(result[0]).toEqual(mockCrew1);
    });
  });

  describe('Technician-based Selectors', () => {
    it('should select crews by lead technician', () => {
      const crews = [mockCrew1, mockCrew2, mockCrew3];
      const result = fromCrewSelectors.selectCrewsByLeadTechnician('tech-001').projector(crews);
      expect(result.length).toBe(1);
      expect(result[0]).toEqual(mockCrew1);
    });

    it('should select crews by member', () => {
      const crews = [mockCrew1, mockCrew2, mockCrew3];
      const result = fromCrewSelectors.selectCrewsByMember('tech-002').projector(crews);
      expect(result.length).toBe(1);
      expect(result[0]).toEqual(mockCrew1);
    });
  });

  describe('Job-based Selectors', () => {
    it('should select crews with active job', () => {
      const crews = [mockCrew1, mockCrew2, mockCrew3];
      const result = fromCrewSelectors.selectCrewsWithActiveJob.projector(crews);
      expect(result.length).toBe(1);
      expect(result[0]).toEqual(mockCrew2);
    });

    it('should select crews without active job', () => {
      const crews = [mockCrew1, mockCrew2, mockCrew3];
      const result = fromCrewSelectors.selectCrewsWithoutActiveJob.projector(crews);
      expect(result.length).toBe(2);
      expect(result).toContain(mockCrew1);
      expect(result).toContain(mockCrew3);
    });

    it('should select crew by active job', () => {
      const crews = [mockCrew1, mockCrew2, mockCrew3];
      const result = fromCrewSelectors.selectCrewByActiveJob('job-123').projector(crews);
      expect(result).toEqual(mockCrew2);
    });
  });

  describe('Location-based Selectors', () => {
    it('should select crews with location', () => {
      const crews = [mockCrew1, mockCrew2, mockCrew3];
      const result = fromCrewSelectors.selectCrewsWithLocation.projector(crews);
      expect(result.length).toBe(2);
      expect(result).toContain(mockCrew1);
      expect(result).toContain(mockCrew2);
    });

    it('should select crews for map display', () => {
      const crews = [mockCrew1, mockCrew2, mockCrew3];
      const result = fromCrewSelectors.selectCrewsForMap.projector(crews);
      expect(result.length).toBe(2);
      expect(result[0].id).toBe(mockCrew1.id);
      expect(result[0].location).toEqual(mockCrew1.currentLocation);
      expect(result[0].memberCount).toBe(3);
    });
  });

  describe('Statistics Selectors', () => {
    it('should count crews by status', () => {
      const crews = [mockCrew1, mockCrew2, mockCrew3];
      const result = fromCrewSelectors.selectCrewsCountByStatus.projector(crews);
      expect(result[CrewStatus.Available]).toBe(1);
      expect(result[CrewStatus.OnJob]).toBe(1);
      expect(result[CrewStatus.Unavailable]).toBe(1);
    });

    it('should count crews by market', () => {
      const crews = [mockCrew1, mockCrew2, mockCrew3];
      const result = fromCrewSelectors.selectCrewsCountByMarket.projector(crews);
      expect(result['DALLAS']).toBe(2);
      expect(result['AUSTIN']).toBe(1);
    });

    it('should count crews by company', () => {
      const crews = [mockCrew1, mockCrew2, mockCrew3];
      const result = fromCrewSelectors.selectCrewsCountByCompany.projector(crews);
      expect(result['ACME_CORP']).toBe(2);
      expect(result['BETA_CORP']).toBe(1);
    });

    it('should group crews by status', () => {
      const crews = [mockCrew1, mockCrew2, mockCrew3];
      const result = fromCrewSelectors.selectCrewsGroupedByStatus.projector(crews);
      expect(result[CrewStatus.Available].length).toBe(1);
      expect(result[CrewStatus.OnJob].length).toBe(1);
      expect(result[CrewStatus.Unavailable].length).toBe(1);
    });

    it('should group crews by market', () => {
      const crews = [mockCrew1, mockCrew2, mockCrew3];
      const result = fromCrewSelectors.selectCrewsGroupedByMarket.projector(crews);
      expect(result['DALLAS'].length).toBe(2);
      expect(result['AUSTIN'].length).toBe(1);
    });

    it('should group crews by company', () => {
      const crews = [mockCrew1, mockCrew2, mockCrew3];
      const result = fromCrewSelectors.selectCrewsGroupedByCompany.projector(crews);
      expect(result['ACME_CORP'].length).toBe(2);
      expect(result['BETA_CORP'].length).toBe(1);
    });

    it('should select all unique markets', () => {
      const crews = [mockCrew1, mockCrew2, mockCrew3];
      const result = fromCrewSelectors.selectAllUniqueMarkets.projector(crews);
      expect(result.length).toBe(2);
      expect(result).toContain('DALLAS');
      expect(result).toContain('AUSTIN');
    });

    it('should select all unique companies', () => {
      const crews = [mockCrew1, mockCrew2, mockCrew3];
      const result = fromCrewSelectors.selectAllUniqueCompanies.projector(crews);
      expect(result.length).toBe(2);
      expect(result).toContain('ACME_CORP');
      expect(result).toContain('BETA_CORP');
    });

    it('should calculate crew statistics', () => {
      const crews = [mockCrew1, mockCrew2, mockCrew3];
      const result = fromCrewSelectors.selectCrewStatistics.projector(crews);
      expect(result.total).toBe(3);
      expect(result.byStatus[CrewStatus.Available]).toBe(1);
      expect(result.byMarket['DALLAS']).toBe(2);
      expect(result.byCompany['ACME_CORP']).toBe(2);
      expect(result.withActiveJob).toBe(1);
      expect(result.withLocation).toBe(2);
      expect(result.averageMemberCount).toBeCloseTo(2.67, 2);
    });
  });

  describe('Utility Selectors', () => {
    it('should select crew IDs', () => {
      const result = fromCrewSelectors.selectCrewIds.projector(initialState);
      expect(result.length).toBe(3);
      expect(result).toContain(mockCrew1.id);
      expect(result).toContain(mockCrew2.id);
      expect(result).toContain(mockCrew3.id);
    });

    it('should check if crews are loading', () => {
      const result = fromCrewSelectors.selectHasCrewsLoading.projector(false);
      expect(result).toBe(false);
    });

    it('should check if crews have error', () => {
      const result = fromCrewSelectors.selectHasCrewsError.projector(null);
      expect(result).toBe(false);
    });

    it('should select crews view model', () => {
      const crews = [mockCrew1, mockCrew2, mockCrew3];
      const filters = {};
      const result = fromCrewSelectors.selectCrewsViewModel.projector(
        crews,
        false,
        null,
        filters,
        3
      );
      expect(result.crews).toEqual(crews);
      expect(result.loading).toBe(false);
      expect(result.error).toBeNull();
      expect(result.total).toBe(3);
      expect(result.filteredCount).toBe(3);
    });
  });

  describe('Crew Member Selectors', () => {
    it('should select crew member count', () => {
      const crew = mockCrew1;
      const result = fromCrewSelectors.selectCrewMemberCount(mockCrew1.id).projector(crew);
      expect(result).toBe(3);
    });

    it('should return 0 for non-existent crew', () => {
      const result = fromCrewSelectors.selectCrewMemberCount('non-existent').projector(undefined);
      expect(result).toBe(0);
    });

    it('should check if crew has specific member', () => {
      const crew = mockCrew1;
      const result = fromCrewSelectors.selectCrewHasMember(mockCrew1.id, 'tech-002').projector(crew);
      expect(result).toBe(true);
    });

    it('should return false if crew does not have member', () => {
      const crew = mockCrew1;
      const result = fromCrewSelectors.selectCrewHasMember(mockCrew1.id, 'tech-999').projector(crew);
      expect(result).toBe(false);
    });

    it('should check if technician is crew lead', () => {
      const crew = mockCrew1;
      const result = fromCrewSelectors.selectIsCrewLead(mockCrew1.id, 'tech-001').projector(crew);
      expect(result).toBe(true);
    });

    it('should return false if technician is not crew lead', () => {
      const crew = mockCrew1;
      const result = fromCrewSelectors.selectIsCrewLead(mockCrew1.id, 'tech-002').projector(crew);
      expect(result).toBe(false);
    });
  });

  describe('Crews Needing Attention Selector', () => {
    it('should select crews needing attention', () => {
      const crews = [mockCrew1, mockCrew2, mockCrew3];
      const result = fromCrewSelectors.selectCrewsNeedingAttention.projector(crews);
      expect(result.count).toBe(1);
      expect(result.unavailableCount).toBe(1);
      expect(result.withoutLocationCount).toBe(0);
      expect(result.crews).toContain(mockCrew3);
    });

    it('should identify crews on job without location', () => {
      const crewOnJobNoLocation = { ...mockCrew2, currentLocation: undefined };
      const crews = [mockCrew1, crewOnJobNoLocation, mockCrew3];
      const result = fromCrewSelectors.selectCrewsNeedingAttention.projector(crews);
      expect(result.withoutLocationCount).toBe(1);
      expect(result.crews).toContain(crewOnJobNoLocation);
    });
  });

  describe('Scope-Filtered Selectors', () => {
    describe('Admin Scope (all)', () => {
      it('should return all crews for admin', () => {
        const crews = [mockCrew1, mockCrew2, mockCrew3];
        const result = fromCrewSelectors.selectScopedCrews(mockAdminUser, adminDataScopes).projector(crews);
        expect(result.length).toBe(3);
        expect(result).toContain(mockCrew1);
        expect(result).toContain(mockCrew2);
        expect(result).toContain(mockCrew3);
      });

      it('should return all crews for admin in statistics', () => {
        const crews = [mockCrew1, mockCrew2, mockCrew3];
        const result = fromCrewSelectors.selectScopedCrewStatistics(mockAdminUser, adminDataScopes).projector(crews);
        expect(result.total).toBe(3);
      });
    });

    describe('CM Scope (market)', () => {
      it('should return only market crews for CM', () => {
        const crews = [mockCrew1, mockCrew2, mockCrew3];
        const result = fromCrewSelectors.selectScopedCrews(mockCMUser, cmDataScopes).projector(crews);
        expect(result.length).toBe(2);
        expect(result).toContain(mockCrew1);
        expect(result).toContain(mockCrew3);
        expect(result).not.toContain(mockCrew2);
      });

      it('should return all crews for RG market CM', () => {
        const rgCMUser = { ...mockCMUser, market: 'RG' };
        const crews = [mockCrew1, mockCrew2, mockCrew3];
        const result = fromCrewSelectors.selectScopedCrews(rgCMUser, cmDataScopes).projector(crews);
        expect(result.length).toBe(3);
      });

      it('should filter available crews by market for CM', () => {
        const crews = [mockCrew1, mockCrew2, mockCrew3];
        const result = fromCrewSelectors.selectScopedAvailableCrews(mockCMUser, cmDataScopes).projector(crews);
        expect(result.length).toBe(1);
        expect(result[0]).toEqual(mockCrew1);
      });
    });

    describe('PM Scope (company + market)', () => {
      it('should return only company and market crews for PM', () => {
        const crews = [mockCrew1, mockCrew2, mockCrew3];
        const result = fromCrewSelectors.selectScopedCrews(mockPMUser, pmDataScopes).projector(crews);
        expect(result.length).toBe(1);
        expect(result[0]).toEqual(mockCrew1);
      });

      it('should not return crews from different market', () => {
        const crews = [mockCrew1, mockCrew2, mockCrew3];
        const result = fromCrewSelectors.selectScopedCrews(mockPMUser, pmDataScopes).projector(crews);
        expect(result).not.toContain(mockCrew2);
      });

      it('should not return crews from different company', () => {
        const crews = [mockCrew1, mockCrew2, mockCrew3];
        const result = fromCrewSelectors.selectScopedCrews(mockPMUser, pmDataScopes).projector(crews);
        expect(result).not.toContain(mockCrew3);
      });
    });

    describe('Technician Scope (self)', () => {
      it('should return only crews where technician is lead', () => {
        const crews = [mockCrew1, mockCrew2, mockCrew3];
        const result = fromCrewSelectors.selectScopedCrews(mockTechUser, techDataScopes).projector(crews);
        expect(result.length).toBe(1);
        expect(result[0]).toEqual(mockCrew1);
      });

      it('should return crews where technician is member', () => {
        const techUser2 = { ...mockTechUser, id: 'tech-002' };
        const crews = [mockCrew1, mockCrew2, mockCrew3];
        const result = fromCrewSelectors.selectScopedCrews(techUser2, techDataScopes).projector(crews);
        expect(result.length).toBe(1);
        expect(result[0]).toEqual(mockCrew1);
      });

      it('should return empty array for technician not in any crew', () => {
        const techUser999 = { ...mockTechUser, id: 'tech-999' };
        const crews = [mockCrew1, mockCrew2, mockCrew3];
        const result = fromCrewSelectors.selectScopedCrews(techUser999, techDataScopes).projector(crews);
        expect(result.length).toBe(0);
      });
    });

    describe('Filtered Scoped Selectors', () => {
      it('should apply filters on top of scope filtering', () => {
        const crews = [mockCrew1, mockCrew2, mockCrew3];
        const filters = { status: CrewStatus.Available };
        const result = fromCrewSelectors.selectFilteredScopedCrews(mockCMUser, cmDataScopes).projector(
          crews.filter(c => c.market === mockCMUser.market),
          filters
        );
        expect(result.length).toBe(1);
        expect(result[0]).toEqual(mockCrew1);
      });

      it('should combine search and scope filtering', () => {
        const crews = [mockCrew1, mockCrew2, mockCrew3];
        const filters = { searchTerm: 'alpha' };
        const scopedCrews = crews.filter(c => c.market === mockCMUser.market);
        const result = fromCrewSelectors.selectFilteredScopedCrews(mockCMUser, cmDataScopes).projector(
          scopedCrews,
          filters
        );
        expect(result.length).toBe(1);
        expect(result[0]).toEqual(mockCrew1);
      });
    });

    describe('Scoped Crews for Map', () => {
      it('should return map data for scoped crews with location', () => {
        const crews = [mockCrew1, mockCrew2, mockCrew3];
        const scopedCrews = crews.filter(c => c.market === mockCMUser.market);
        const result = fromCrewSelectors.selectScopedCrewsForMap(mockCMUser, cmDataScopes).projector(scopedCrews);
        expect(result.length).toBe(1);
        expect(result[0].id).toBe(mockCrew1.id);
        expect(result[0].location).toEqual(mockCrew1.currentLocation);
      });
    });

    describe('Can Access Crew', () => {
      it('should allow admin to access any crew', () => {
        const result = fromCrewSelectors.selectCanAccessCrew(mockCrew1.id, mockAdminUser, adminDataScopes).projector(mockCrew1);
        expect(result).toBe(true);
      });

      it('should allow CM to access crew in their market', () => {
        const result = fromCrewSelectors.selectCanAccessCrew(mockCrew1.id, mockCMUser, cmDataScopes).projector(mockCrew1);
        expect(result).toBe(true);
      });

      it('should not allow CM to access crew in different market', () => {
        const result = fromCrewSelectors.selectCanAccessCrew(mockCrew2.id, mockCMUser, cmDataScopes).projector(mockCrew2);
        expect(result).toBe(false);
      });

      it('should allow PM to access crew in their company and market', () => {
        const result = fromCrewSelectors.selectCanAccessCrew(mockCrew1.id, mockPMUser, pmDataScopes).projector(mockCrew1);
        expect(result).toBe(true);
      });

      it('should not allow PM to access crew in different company', () => {
        const result = fromCrewSelectors.selectCanAccessCrew(mockCrew3.id, mockPMUser, pmDataScopes).projector(mockCrew3);
        expect(result).toBe(false);
      });

      it('should allow technician to access their own crew', () => {
        const result = fromCrewSelectors.selectCanAccessCrew(mockCrew1.id, mockTechUser, techDataScopes).projector(mockCrew1);
        expect(result).toBe(true);
      });

      it('should not allow technician to access other crews', () => {
        const result = fromCrewSelectors.selectCanAccessCrew(mockCrew2.id, mockTechUser, techDataScopes).projector(mockCrew2);
        expect(result).toBe(false);
      });

      it('should return false for null crew', () => {
        const result = fromCrewSelectors.selectCanAccessCrew('non-existent', mockAdminUser, adminDataScopes).projector(undefined);
        expect(result).toBe(false);
      });
    });

    describe('User-specific Crew Selectors', () => {
      it('should select crews where user is lead', () => {
        const crews = [mockCrew1, mockCrew2, mockCrew3];
        const scopedCrews = [mockCrew1];
        const result = fromCrewSelectors.selectCrewsWhereUserIsLead(mockTechUser, techDataScopes).projector(scopedCrews);
        expect(result.length).toBe(1);
        expect(result[0]).toEqual(mockCrew1);
      });

      it('should select crews where user is member but not lead', () => {
        const techUser2 = { ...mockTechUser, id: 'tech-002' };
        const crews = [mockCrew1, mockCrew2, mockCrew3];
        const scopedCrews = [mockCrew1];
        const result = fromCrewSelectors.selectCrewsWhereUserIsMember(techUser2, techDataScopes).projector(scopedCrews);
        expect(result.length).toBe(1);
        expect(result[0]).toEqual(mockCrew1);
      });
    });

    describe('Scoped Crews Needing Attention', () => {
      it('should return scoped crews needing attention', () => {
        const crews = [mockCrew1, mockCrew2, mockCrew3];
        const scopedCrews = crews.filter(c => c.market === mockCMUser.market);
        const result = fromCrewSelectors.selectScopedCrewsNeedingAttention(mockCMUser, cmDataScopes).projector(scopedCrews);
        expect(result.count).toBe(1);
        expect(result.crews).toContain(mockCrew3);
      });
    });

    describe('Scoped View Model', () => {
      it('should create view model with scoped data', () => {
        const crews = [mockCrew1];
        const filters = {};
        const allScopedCrews = [mockCrew1, mockCrew3];
        const result = fromCrewSelectors.selectScopedCrewsViewModel(mockCMUser, cmDataScopes).projector(
          crews,
          false,
          null,
          filters,
          allScopedCrews
        );
        expect(result.crews).toEqual(crews);
        expect(result.total).toBe(2);
        expect(result.filteredCount).toBe(1);
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty crews array', () => {
        const crews: Crew[] = [];
        const result = fromCrewSelectors.selectScopedCrews(mockAdminUser, adminDataScopes).projector(crews);
        expect(result.length).toBe(0);
      });

      it('should handle invalid user', () => {
        const crews = [mockCrew1, mockCrew2, mockCrew3];
        const result = fromCrewSelectors.selectScopedCrews(null as any, adminDataScopes).projector(crews);
        expect(result.length).toBe(0);
      });

      it('should handle empty data scopes', () => {
        const crews = [mockCrew1, mockCrew2, mockCrew3];
        const result = fromCrewSelectors.selectScopedCrews(mockAdminUser, []).projector(crews);
        expect(result.length).toBe(0);
      });
    });
  });
});
