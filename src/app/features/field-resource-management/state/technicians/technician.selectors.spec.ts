/**
 * Technician Selectors Unit Tests
 * Tests all selectors for technician state management including scope filtering
 */

import { Technician, TechnicianRole, EmploymentType, CertificationStatus, SkillLevel } from '../../models/technician.model';
import { TechnicianState } from './technician.state';
import { User } from '../../../../models/user.model';
import { DataScope } from '../../services/data-scope.service';
import * as TechnicianSelectors from './technician.selectors';

describe('Technician Selectors', () => {
  const mockTechnician1: Technician = {
    id: 'tech-1',
    technicianId: 'T001',
    firstName: 'Alice',
    lastName: 'Smith',
    email: 'alice.smith@example.com',
    phone: '555-0100',
    role: TechnicianRole.Level2,
    employmentType: EmploymentType.W2,
    homeBase: 'Dallas',
    region: 'TX',
    skills: [
      { id: 'skill-1', name: 'Fiber Splicing', category: 'Installation', level: SkillLevel.Advanced },
      { id: 'skill-2', name: 'OTDR Testing', category: 'Testing', level: SkillLevel.Intermediate }
    ],
    certifications: [
      {
        id: 'cert-1',
        name: 'Fiber Optics Certification',
        issueDate: new Date('2023-01-01'),
        expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        status: CertificationStatus.Active
      }
    ],
    availability: [],
    isActive: true,
    currentLocation: { latitude: 32.7767, longitude: -96.7970, accuracy: 10 },
    createdAt: new Date('2024-01-01'),
    company: 'TEST_COMPANY',    updatedAt: new Date('2024-01-01')
  };

  const mockTechnician2: Technician = {
    id: 'tech-2',
    technicianId: 'T002',
    firstName: 'Bob',
    lastName: 'Jones',
    email: 'bob.jones@example.com',
    phone: '555-0200',
    role: TechnicianRole.Installer,
    employmentType: EmploymentType.Contractor1099,
    homeBase: 'Austin',
    region: 'TX',
    skills: [
      { id: 'skill-3', name: 'Cable Installation', category: 'Installation', level: SkillLevel.Intermediate }
    ],
    certifications: [
      {
        id: 'cert-2',
        name: 'Safety Certification',
        issueDate: new Date('2024-01-01'),
        expirationDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
        status: CertificationStatus.ExpiringSoon
      }
    ],
    availability: [
      {
        id: 'avail-1',
        technicianId: 'tech-2',
        date: new Date(),
        isAvailable: false,
        reason: 'PTO'
      }
    ],
    isActive: true,
    createdAt: new Date('2024-01-02'),
    company: 'TEST_COMPANY',    updatedAt: new Date('2024-01-02')
  };

  const mockTechnician3: Technician = {
    id: 'tech-3',
    technicianId: 'T003',
    firstName: 'Charlie',
    lastName: 'Smith',
    email: 'charlie.smith@example.com',
    phone: '555-0300',
    role: TechnicianRole.Lead,
    employmentType: EmploymentType.W2,
    homeBase: 'Houston',
    region: 'CA',
    skills: [
      { id: 'skill-1', name: 'Fiber Splicing', category: 'Installation', level: SkillLevel.Advanced },
      { id: 'skill-4', name: 'Project Management', category: 'Management', level: SkillLevel.Expert }
    ],
    certifications: [
      {
        id: 'cert-3',
        name: 'Expired Certification',
        issueDate: new Date('2020-01-01'),
        expirationDate: new Date('2023-01-01'),
        status: CertificationStatus.Expired
      }
    ],
    availability: [],
    isActive: false,
    createdAt: new Date('2024-01-03'),
    company: 'TEST_COMPANY',    updatedAt: new Date('2024-01-03')
  };

  const mockState: TechnicianState = {
    ids: ['tech-1', 'tech-2', 'tech-3'],
    entities: {
      'tech-1': mockTechnician1,
      'tech-2': mockTechnician2,
      'tech-3': mockTechnician3
    },
    selectedId: null,
    loading: false,
    error: null,
    filters: {}
  };

  const mockAdminUser: User = new User(
    'admin-1',
    'Admin User',
    'admin@example.com',
    'password',
    'Admin',
    'RG',
    'Company A',
    new Date(),
    true
  );

  const mockCMUser: User = new User(
    'cm-1',
    'CM User',
    'cm@example.com',
    'password',
    'CM',
    'TX',
    'Company A',
    new Date(),
    true
  );

  const mockPMUser: User = new User(
    'pm-1',
    'PM User',
    'pm@example.com',
    'password',
    'PM',
    'TX',
    'Company A',
    new Date(),
    true
  );

  const mockTechnicianUser: User = new User(
    'tech-1',
    'Technician User',
    'tech@example.com',
    'password',
    'Technician',
    'TX',
    'Company A',
    new Date(),
    true
  );

  const adminScopes: DataScope[] = [{ scopeType: 'all' }];
  const cmScopes: DataScope[] = [{ scopeType: 'market' }];
  const pmScopes: DataScope[] = [{ scopeType: 'company' }];
  const technicianScopes: DataScope[] = [{ scopeType: 'self' }];

  describe('Basic Selectors', () => {
    it('should select technician state', () => {
      const result = TechnicianSelectors.selectTechnicianState.projector(mockState);
      expect(result).toEqual(mockState);
    });

    it('should select all technicians', () => {
      const result = TechnicianSelectors.selectAllTechnicians.projector(mockState);
      expect(result).toEqual([mockTechnician1, mockTechnician2, mockTechnician3]);
    });

    it('should select technician entities', () => {
      const result = TechnicianSelectors.selectTechnicianEntities.projector(mockState);
      expect(result).toEqual(mockState.entities);
    });

    it('should select technician by ID', () => {
      const result = TechnicianSelectors.selectTechnicianById('tech-1').projector(mockState.entities);
      expect(result).toEqual(mockTechnician1);
    });

    it('should return undefined for non-existent technician ID', () => {
      const result = TechnicianSelectors.selectTechnicianById('non-existent').projector(mockState.entities);
      expect(result).toBeUndefined();
    });

    it('should select selected technician ID', () => {
      const stateWithSelection = { ...mockState, selectedId: 'tech-1' };
      const result = TechnicianSelectors.selectSelectedTechnicianId.projector(stateWithSelection);
      expect(result).toBe('tech-1');
    });

    it('should select selected technician', () => {
      const result = TechnicianSelectors.selectSelectedTechnician.projector(mockState.entities, 'tech-1');
      expect(result).toEqual(mockTechnician1);
    });

    it('should return null when no technician is selected', () => {
      const result = TechnicianSelectors.selectSelectedTechnician.projector(mockState.entities, null);
      expect(result).toBeNull();
    });

    it('should select loading state', () => {
      const result = TechnicianSelectors.selectTechniciansLoading.projector(mockState);
      expect(result).toBe(false);
    });

    it('should select error state', () => {
      const result = TechnicianSelectors.selectTechniciansError.projector(mockState);
      expect(result).toBeNull();
    });

    it('should select filters', () => {
      const stateWithFilters = { ...mockState, filters: { region: 'TX' } };
      const result = TechnicianSelectors.selectTechnicianFilters.projector(stateWithFilters);
      expect(result).toEqual({ region: 'TX' });
    });

    it('should select total count', () => {
      const result = TechnicianSelectors.selectTechniciansTotal.projector(mockState);
      expect(result).toBe(3);
    });

    it('should select technician IDs', () => {
      const result = TechnicianSelectors.selectTechnicianIds.projector(mockState);
      expect(result).toEqual(['tech-1', 'tech-2', 'tech-3']);
    });
  });

  describe('Filtered Selectors', () => {
    it('should filter technicians by search term (firstName)', () => {
      const filters = { searchTerm: 'alice' };
      const result = TechnicianSelectors.selectFilteredTechnicians.projector(
        [mockTechnician1, mockTechnician2, mockTechnician3],
        filters
      );
      expect(result).toEqual([mockTechnician1]);
    });

    it('should filter technicians by search term (lastName)', () => {
      const filters = { searchTerm: 'jones' };
      const result = TechnicianSelectors.selectFilteredTechnicians.projector(
        [mockTechnician1, mockTechnician2, mockTechnician3],
        filters
      );
      expect(result).toEqual([mockTechnician2]);
    });

    it('should filter technicians by search term (technicianId)', () => {
      const filters = { searchTerm: 'T001' };
      const result = TechnicianSelectors.selectFilteredTechnicians.projector(
        [mockTechnician1, mockTechnician2, mockTechnician3],
        filters
      );
      expect(result).toEqual([mockTechnician1]);
    });

    it('should filter technicians by search term (email)', () => {
      const filters = { searchTerm: 'bob.jones' };
      const result = TechnicianSelectors.selectFilteredTechnicians.projector(
        [mockTechnician1, mockTechnician2, mockTechnician3],
        filters
      );
      expect(result).toEqual([mockTechnician2]);
    });

    it('should filter technicians by role', () => {
      const filters = { role: TechnicianRole.Installer };
      const result = TechnicianSelectors.selectFilteredTechnicians.projector(
        [mockTechnician1, mockTechnician2, mockTechnician3],
        filters
      );
      expect(result).toEqual([mockTechnician2]);
    });

    it('should filter technicians by skills', () => {
      const filters = { skills: ['Fiber Splicing'] };
      const result = TechnicianSelectors.selectFilteredTechnicians.projector(
        [mockTechnician1, mockTechnician2, mockTechnician3],
        filters
      );
      expect(result).toEqual([mockTechnician1, mockTechnician3]);
    });

    it('should filter technicians by region', () => {
      const filters = { region: 'TX' };
      const result = TechnicianSelectors.selectFilteredTechnicians.projector(
        [mockTechnician1, mockTechnician2, mockTechnician3],
        filters
      );
      expect(result).toEqual([mockTechnician1, mockTechnician2]);
    });

    it('should filter technicians by active status', () => {
      const filters = { isActive: true };
      const result = TechnicianSelectors.selectFilteredTechnicians.projector(
        [mockTechnician1, mockTechnician2, mockTechnician3],
        filters
      );
      expect(result).toEqual([mockTechnician1, mockTechnician2]);
    });

    it('should apply multiple filters', () => {
      const filters = { region: 'TX', role: TechnicianRole.Level2 };
      const result = TechnicianSelectors.selectFilteredTechnicians.projector(
        [mockTechnician1, mockTechnician2, mockTechnician3],
        filters
      );
      expect(result).toEqual([mockTechnician1]);
    });

    it('should return all technicians when no filters applied', () => {
      const filters = {};
      const result = TechnicianSelectors.selectFilteredTechnicians.projector(
        [mockTechnician1, mockTechnician2, mockTechnician3],
        filters
      );
      expect(result).toEqual([mockTechnician1, mockTechnician2, mockTechnician3]);
    });
  });

  describe('Specialized Selectors', () => {
    it('should select active technicians', () => {
      const result = TechnicianSelectors.selectActiveTechnicians.projector(
        [mockTechnician1, mockTechnician2, mockTechnician3]
      );
      expect(result).toEqual([mockTechnician1, mockTechnician2]);
    });

    it('should select technicians by role', () => {
      const result = TechnicianSelectors.selectTechniciansByRole(TechnicianRole.Level2).projector(
        [mockTechnician1, mockTechnician2, mockTechnician3]
      );
      expect(result).toEqual([mockTechnician1]);
    });

    it('should select technicians by skill', () => {
      const result = TechnicianSelectors.selectTechniciansBySkill('Fiber Splicing').projector(
        [mockTechnician1, mockTechnician2, mockTechnician3]
      );
      expect(result).toEqual([mockTechnician1, mockTechnician3]);
    });

    it('should select technicians with expiring certifications', () => {
      const result = TechnicianSelectors.selectTechniciansWithExpiringCertifications.projector(
        [mockTechnician1, mockTechnician2, mockTechnician3]
      );
      expect(result).toEqual([mockTechnician2]);
    });

    it('should select technicians by region', () => {
      const result = TechnicianSelectors.selectTechniciansByRegion('TX').projector(
        [mockTechnician1, mockTechnician2, mockTechnician3]
      );
      expect(result).toEqual([mockTechnician1, mockTechnician2]);
    });

    it('should select technicians by employment type', () => {
      const result = TechnicianSelectors.selectTechniciansByEmploymentType(EmploymentType.W2).projector(
        [mockTechnician1, mockTechnician2, mockTechnician3]
      );
      expect(result).toEqual([mockTechnician1, mockTechnician3]);
    });

    it('should select technicians with location', () => {
      const result = TechnicianSelectors.selectTechniciansWithLocation.projector(
        [mockTechnician1, mockTechnician2, mockTechnician3]
      );
      expect(result).toEqual([mockTechnician1]);
    });

    it('should select available technicians', () => {
      const result = TechnicianSelectors.selectAvailableTechnicians.projector(
        [mockTechnician1, mockTechnician2, mockTechnician3]
      );
      expect(result).toEqual([mockTechnician1]);
    });

    it('should select technicians with multiple skills', () => {
      const result = TechnicianSelectors.selectTechniciansWithMultipleSkills.projector(
        [mockTechnician1, mockTechnician2, mockTechnician3]
      );
      expect(result).toEqual([mockTechnician1, mockTechnician3]);
    });

    it('should select technicians by skill category', () => {
      const result = TechnicianSelectors.selectTechniciansBySkillCategory('Installation').projector(
        [mockTechnician1, mockTechnician2, mockTechnician3]
      );
      expect(result).toEqual([mockTechnician1, mockTechnician2, mockTechnician3]);
    });

    it('should select technicians with expired certifications', () => {
      const result = TechnicianSelectors.selectTechniciansWithExpiredCertifications.projector(
        [mockTechnician1, mockTechnician2, mockTechnician3]
      );
      expect(result).toEqual([mockTechnician3]);
    });
  });

  describe('Aggregate Selectors', () => {
    it('should count technicians by role', () => {
      const result = TechnicianSelectors.selectTechniciansCountByRole.projector(
        [mockTechnician1, mockTechnician2, mockTechnician3]
      );
      expect(result).toEqual({
        [TechnicianRole.Level2]: 1,
        [TechnicianRole.Installer]: 1,
        [TechnicianRole.Lead]: 1
      });
    });

    it('should count technicians by region', () => {
      const result = TechnicianSelectors.selectTechniciansCountByRegion.projector(
        [mockTechnician1, mockTechnician2, mockTechnician3]
      );
      expect(result).toEqual({
        'TX': 2,
        'CA': 1
      });
    });

    it('should select all unique skills', () => {
      const result = TechnicianSelectors.selectAllUniqueSkills.projector(
        [mockTechnician1, mockTechnician2, mockTechnician3]
      );
      expect(result.length).toBe(4);
      expect(result.map(s => s.name)).toContain('Fiber Splicing');
      expect(result.map(s => s.name)).toContain('OTDR Testing');
      expect(result.map(s => s.name)).toContain('Cable Installation');
      expect(result.map(s => s.name)).toContain('Project Management');
    });

    it('should select all unique regions', () => {
      const result = TechnicianSelectors.selectAllUniqueRegions.projector(
        [mockTechnician1, mockTechnician2, mockTechnician3]
      );
      expect(result).toEqual(['CA', 'TX']);
    });

    it('should group technicians by role', () => {
      const result = TechnicianSelectors.selectTechniciansGroupedByRole.projector(
        [mockTechnician1, mockTechnician2, mockTechnician3]
      );
      expect(result[TechnicianRole.Level2]).toEqual([mockTechnician1]);
      expect(result[TechnicianRole.Installer]).toEqual([mockTechnician2]);
      expect(result[TechnicianRole.Lead]).toEqual([mockTechnician3]);
    });

    it('should group technicians by region', () => {
      const result = TechnicianSelectors.selectTechniciansGroupedByRegion.projector(
        [mockTechnician1, mockTechnician2, mockTechnician3]
      );
      expect(result['TX']).toEqual([mockTechnician1, mockTechnician2]);
      expect(result['CA']).toEqual([mockTechnician3]);
    });

    it('should select technicians for map display', () => {
      const result = TechnicianSelectors.selectTechniciansForMap.projector(
        [mockTechnician1]
      );
      expect(result).toEqual([{
        id: 'tech-1',
        name: 'Alice Smith',
        location: { latitude: 32.7767, longitude: -96.7970, accuracy: 10 },
        role: TechnicianRole.Level2,
        isActive: true
      }]);
    });

    it('should calculate technician statistics', () => {
      const result = TechnicianSelectors.selectTechnicianStatistics.projector(
        [mockTechnician1, mockTechnician2, mockTechnician3]
      );
      expect(result.total).toBe(3);
      expect(result.active).toBe(2);
      expect(result.inactive).toBe(1);
      expect(result.withExpiredCertifications).toBe(1);
      expect(result.byRole[TechnicianRole.Level2]).toBe(1);
      expect(result.byEmploymentType[EmploymentType.W2]).toBe(2);
    });

    it('should select technicians needing attention', () => {
      const result = TechnicianSelectors.selectTechniciansNeedingAttention.projector(
        [mockTechnician3],
        [mockTechnician2]
      );
      expect(result.count).toBe(2);
      expect(result.expiredCount).toBe(1);
      expect(result.expiringCount).toBe(1);
      expect(result.technicians).toContain(mockTechnician2);
      expect(result.technicians).toContain(mockTechnician3);
    });
  });

  describe('View Model Selectors', () => {
    it('should select technicians view model', () => {
      const filters = { region: 'TX' };
      const result = TechnicianSelectors.selectTechniciansViewModel.projector(
        [mockTechnician1, mockTechnician2],
        false,
        null,
        filters,
        3
      );
      expect(result).toEqual({
        technicians: [mockTechnician1, mockTechnician2],
        loading: false,
        error: null,
        filters: filters,
        total: 3,
        filteredCount: 2
      });
    });

    it('should handle loading state in view model', () => {
      const result = TechnicianSelectors.selectTechniciansViewModel.projector(
        [],
        true,
        null,
        {},
        0
      );
      expect(result.loading).toBe(true);
      expect(result.technicians).toEqual([]);
    });

    it('should handle error state in view model', () => {
      const error = 'Failed to load technicians';
      const result = TechnicianSelectors.selectTechniciansViewModel.projector(
        [],
        false,
        error,
        {},
        0
      );
      expect(result.error).toBe(error);
    });
  });

  describe('Status Selectors', () => {
    it('should check if technicians are loading', () => {
      const result = TechnicianSelectors.selectHasTechniciansLoading.projector(true);
      expect(result).toBe(true);
    });

    it('should check if technicians have error', () => {
      const result = TechnicianSelectors.selectHasTechniciansError.projector('Error message');
      expect(result).toBe(true);
    });

    it('should return false when no error', () => {
      const result = TechnicianSelectors.selectHasTechniciansError.projector(null);
      expect(result).toBe(false);
    });
  });

  describe('Scope-Filtered Selectors', () => {
    describe('selectScopedTechnicians', () => {
      it('should return all technicians for Admin user', () => {
        const result = TechnicianSelectors.selectScopedTechnicians(mockAdminUser, adminScopes).projector(
          [mockTechnician1, mockTechnician2, mockTechnician3]
        );
        expect(result).toEqual([mockTechnician1, mockTechnician2, mockTechnician3]);
      });

      it('should filter by market for CM user', () => {
        const result = TechnicianSelectors.selectScopedTechnicians(mockCMUser, cmScopes).projector(
          [mockTechnician1, mockTechnician2, mockTechnician3]
        );
        expect(result).toEqual([mockTechnician1, mockTechnician2]);
      });

      it('should return all technicians for RG market CM', () => {
        const rgCMUser = new User('cm-2', 'RG CM', 'rgcm@example.com', 'password', 'CM', 'RG', 'Company A', new Date(), true);
        const result = TechnicianSelectors.selectScopedTechnicians(rgCMUser, cmScopes).projector(
          [mockTechnician1, mockTechnician2, mockTechnician3]
        );
        expect(result).toEqual([mockTechnician1, mockTechnician2, mockTechnician3]);
      });

      it('should filter by market for PM user', () => {
        const result = TechnicianSelectors.selectScopedTechnicians(mockPMUser, pmScopes).projector(
          [mockTechnician1, mockTechnician2, mockTechnician3]
        );
        expect(result).toEqual([mockTechnician1, mockTechnician2]);
      });

      it('should return only self for Technician user', () => {
        const result = TechnicianSelectors.selectScopedTechnicians(mockTechnicianUser, technicianScopes).projector(
          [mockTechnician1, mockTechnician2, mockTechnician3]
        );
        expect(result).toEqual([mockTechnician1]);
      });

      it('should return empty array for invalid user', () => {
        spyOn(console, 'warn');
        const result = TechnicianSelectors.selectScopedTechnicians(null as any, adminScopes).projector(
          [mockTechnician1, mockTechnician2, mockTechnician3]
        );
        expect(result).toEqual([]);
      });

      it('should return empty array for empty dataScopes', () => {
        spyOn(console, 'warn');
        const result = TechnicianSelectors.selectScopedTechnicians(mockAdminUser, []).projector(
          [mockTechnician1, mockTechnician2, mockTechnician3]
        );
        expect(result).toEqual([]);
      });
    });

    describe('selectFilteredScopedTechnicians', () => {
      it('should apply both scope and UI filters', () => {
        const filters = { role: TechnicianRole.Level2 };
        const result = TechnicianSelectors.selectFilteredScopedTechnicians(mockCMUser, cmScopes).projector(
          [mockTechnician1, mockTechnician2],
          filters
        );
        expect(result).toEqual([mockTechnician1]);
      });

      it('should apply search filter on scoped technicians', () => {
        const filters = { searchTerm: 'alice' };
        const result = TechnicianSelectors.selectFilteredScopedTechnicians(mockCMUser, cmScopes).projector(
          [mockTechnician1, mockTechnician2],
          filters
        );
        expect(result).toEqual([mockTechnician1]);
      });

      it('should apply skills filter on scoped technicians', () => {
        const filters = { skills: ['Fiber Splicing'] };
        const result = TechnicianSelectors.selectFilteredScopedTechnicians(mockAdminUser, adminScopes).projector(
          [mockTechnician1, mockTechnician2, mockTechnician3],
          filters
        );
        expect(result).toEqual([mockTechnician1, mockTechnician3]);
      });

      it('should apply active status filter on scoped technicians', () => {
        const filters = { isActive: true };
        const result = TechnicianSelectors.selectFilteredScopedTechnicians(mockAdminUser, adminScopes).projector(
          [mockTechnician1, mockTechnician2, mockTechnician3],
          filters
        );
        expect(result).toEqual([mockTechnician1, mockTechnician2]);
      });
    });

    describe('selectScopedActiveTechnicians', () => {
      it('should return active technicians within scope', () => {
        const result = TechnicianSelectors.selectScopedActiveTechnicians(mockCMUser, cmScopes).projector(
          [mockTechnician1, mockTechnician2, mockTechnician3]
        );
        expect(result).toEqual([mockTechnician1, mockTechnician2]);
      });

      it('should filter out inactive technicians', () => {
        const result = TechnicianSelectors.selectScopedActiveTechnicians(mockAdminUser, adminScopes).projector(
          [mockTechnician1, mockTechnician2, mockTechnician3]
        );
        expect(result).toEqual([mockTechnician1, mockTechnician2]);
      });
    });

    describe('selectScopedAvailableTechnicians', () => {
      it('should return available technicians within scope', () => {
        const result = TechnicianSelectors.selectScopedAvailableTechnicians(mockCMUser, cmScopes).projector(
          [mockTechnician1, mockTechnician2]
        );
        expect(result).toEqual([mockTechnician1]);
      });

      it('should exclude technicians on PTO', () => {
        const result = TechnicianSelectors.selectScopedAvailableTechnicians(mockAdminUser, adminScopes).projector(
          [mockTechnician1, mockTechnician2, mockTechnician3]
        );
        expect(result).toEqual([mockTechnician1]);
      });
    });

    describe('selectScopedTechniciansForMap', () => {
      it('should return technicians with location within scope', () => {
        const result = TechnicianSelectors.selectScopedTechniciansForMap(mockCMUser, cmScopes).projector(
          [mockTechnician1, mockTechnician2]
        );
        expect(result).toEqual([{
          id: 'tech-1',
          name: 'Alice Smith',
          location: { latitude: 32.7767, longitude: -96.7970, accuracy: 10 },
          role: TechnicianRole.Level2,
          isActive: true
        }]);
      });

      it('should exclude technicians without location', () => {
        const result = TechnicianSelectors.selectScopedTechniciansForMap(mockAdminUser, adminScopes).projector(
          [mockTechnician1, mockTechnician2, mockTechnician3]
        );
        expect(result.length).toBe(1);
        expect(result[0].id).toBe('tech-1');
      });
    });

    describe('selectScopedTechnicianStatistics', () => {
      it('should calculate statistics for scoped technicians', () => {
        const result = TechnicianSelectors.selectScopedTechnicianStatistics(mockCMUser, cmScopes).projector(
          [mockTechnician1, mockTechnician2]
        );
        expect(result.total).toBe(2);
        expect(result.active).toBe(2);
        expect(result.inactive).toBe(0);
      });

      it('should include expired certifications count', () => {
        const result = TechnicianSelectors.selectScopedTechnicianStatistics(mockAdminUser, adminScopes).projector(
          [mockTechnician1, mockTechnician2, mockTechnician3]
        );
        expect(result.withExpiredCertifications).toBe(1);
      });
    });

    describe('selectScopedTechniciansViewModel', () => {
      it('should create view model with scoped data', () => {
        const filters = { region: 'TX' };
        const result = TechnicianSelectors.selectScopedTechniciansViewModel(mockCMUser, cmScopes).projector(
          [mockTechnician1],
          false,
          null,
          filters,
          [mockTechnician1, mockTechnician2]
        );
        expect(result.technicians).toEqual([mockTechnician1]);
        expect(result.total).toBe(2);
        expect(result.filteredCount).toBe(1);
      });
    });

    describe('selectCanAccessTechnician', () => {
      it('should allow Admin to access any technician', () => {
        const result = TechnicianSelectors.selectCanAccessTechnician('tech-1', mockAdminUser, adminScopes).projector(
          mockTechnician1
        );
        expect(result).toBe(true);
      });

      it('should allow CM to access technician in their market', () => {
        const result = TechnicianSelectors.selectCanAccessTechnician('tech-1', mockCMUser, cmScopes).projector(
          mockTechnician1
        );
        expect(result).toBe(true);
      });

      it('should deny CM access to technician outside their market', () => {
        const result = TechnicianSelectors.selectCanAccessTechnician('tech-3', mockCMUser, cmScopes).projector(
          mockTechnician3
        );
        expect(result).toBe(false);
      });

      it('should allow Technician to access themselves', () => {
        const result = TechnicianSelectors.selectCanAccessTechnician('tech-1', mockTechnicianUser, technicianScopes).projector(
          mockTechnician1
        );
        expect(result).toBe(true);
      });

      it('should deny Technician access to other technicians', () => {
        const result = TechnicianSelectors.selectCanAccessTechnician('tech-2', mockTechnicianUser, technicianScopes).projector(
          mockTechnician2
        );
        expect(result).toBe(false);
      });

      it('should return false for null technician', () => {
        const result = TechnicianSelectors.selectCanAccessTechnician('non-existent', mockAdminUser, adminScopes).projector(
          undefined
        );
        expect(result).toBe(false);
      });
    });
  });

  describe('Memoization Behavior', () => {
    it('should memoize selector results', () => {
      const selector = TechnicianSelectors.selectAllTechnicians;
      const result1 = selector.projector(mockState);
      const result2 = selector.projector(mockState);
      expect(result1).toBe(result2);
    });

    it('should recompute when input changes', () => {
      const selector = TechnicianSelectors.selectFilteredTechnicians;
      const filters1 = { region: 'TX' };
      const filters2 = { region: 'CA' };
      
      const result1 = selector.projector([mockTechnician1, mockTechnician2, mockTechnician3], filters1);
      const result2 = selector.projector([mockTechnician1, mockTechnician2, mockTechnician3], filters2);
      
      expect(result1).not.toEqual(result2);
      expect(result1.length).toBe(2);
      expect(result2.length).toBe(1);
    });

    it('should memoize complex selectors', () => {
      const selector = TechnicianSelectors.selectTechnicianStatistics;
      const technicians = [mockTechnician1, mockTechnician2, mockTechnician3];
      
      const result1 = selector.projector(technicians);
      const result2 = selector.projector(technicians);
      
      expect(result1).toBe(result2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty technician list', () => {
      const result = TechnicianSelectors.selectAllTechnicians.projector({
        ...mockState,
        ids: [],
        entities: {}
      });
      expect(result).toEqual([]);
    });

    it('should handle null selectedId', () => {
      const result = TechnicianSelectors.selectSelectedTechnician.projector(mockState.entities, null);
      expect(result).toBeNull();
    });

    it('should handle empty filters', () => {
      const result = TechnicianSelectors.selectFilteredTechnicians.projector(
        [mockTechnician1, mockTechnician2, mockTechnician3],
        {}
      );
      expect(result.length).toBe(3);
    });

    it('should handle technicians with no skills', () => {
      const techWithNoSkills = { ...mockTechnician1, skills: [] };
      const result = TechnicianSelectors.selectTechniciansBySkill('Fiber Splicing').projector(
        [techWithNoSkills]
      );
      expect(result).toEqual([]);
    });

    it('should handle technicians with no certifications', () => {
      const techWithNoCerts = { ...mockTechnician1, certifications: [] };
      const result = TechnicianSelectors.selectTechniciansWithExpiredCertifications.projector(
        [techWithNoCerts]
      );
      expect(result).toEqual([]);
    });

    it('should handle technicians with no location', () => {
      const techWithNoLocation = { ...mockTechnician1, currentLocation: undefined };
      const result = TechnicianSelectors.selectTechniciansWithLocation.projector(
        [techWithNoLocation]
      );
      expect(result).toEqual([]);
    });

    it('should handle null location', () => {
      const techWithNullLocation = { ...mockTechnician1, currentLocation: undefined };
      const result = TechnicianSelectors.selectTechniciansWithLocation.projector(
        [techWithNullLocation]
      );
      expect(result).toEqual([]);
    });

    it('should handle empty search term', () => {
      const filters = { searchTerm: '' };
      const result = TechnicianSelectors.selectFilteredTechnicians.projector(
        [mockTechnician1, mockTechnician2, mockTechnician3],
        filters
      );
      expect(result.length).toBe(3);
    });

    it('should handle case-insensitive search', () => {
      const filters = { searchTerm: 'ALICE' };
      const result = TechnicianSelectors.selectFilteredTechnicians.projector(
        [mockTechnician1, mockTechnician2, mockTechnician3],
        filters
      );
      expect(result).toEqual([mockTechnician1]);
    });

    it('should handle multiple skills filter with no matches', () => {
      const filters = { skills: ['Non-existent Skill'] };
      const result = TechnicianSelectors.selectFilteredTechnicians.projector(
        [mockTechnician1, mockTechnician2, mockTechnician3],
        filters
      );
      expect(result).toEqual([]);
    });

    it('should handle technicians needing certification renewal with no matches', () => {
      const result = TechnicianSelectors.selectTechniciansNeedingCertificationRenewal.projector(
        [mockTechnician1]
      );
      expect(result).toEqual([]);
    });

    it('should handle technicians by status with off-duty', () => {
      const result = TechnicianSelectors.selectTechniciansByStatus('off-duty').projector(
        [mockTechnician1, mockTechnician2, mockTechnician3]
      );
      expect(result).toEqual([mockTechnician3]);
    });
  });
});
