/**
 * Unit tests for Crew Actions
 */

import * as CrewActions from './crew.actions';
import { Crew, CrewStatus } from '../../models/crew.model';
import { CrewFilters } from '../../models/dtos/filters.dto';
import { CreateCrewDto, UpdateCrewDto } from '../../models/dtos/crew.dto';
import { GeoLocation } from '../../models/time-entry.model';

describe('Crew Actions', () => {
  const mockCrew: Crew = {
    id: 'crew-123',
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

  const mockFilters: CrewFilters = {
    market: 'DALLAS',
    status: CrewStatus.Available,
    company: 'ACME_CORP'
  };

  const mockCreateDto: CreateCrewDto = {
    name: 'Beta Team',
    leadTechnicianId: 'tech-004',
    memberIds: ['tech-004', 'tech-005'],
    market: 'AUSTIN',
    company: 'ACME_CORP'
  };

  const mockUpdateDto: UpdateCrewDto = {
    name: 'Alpha Team Updated',
    status: CrewStatus.OnJob
  };

  const mockLocation: GeoLocation = {
    latitude: 30.2672,
    longitude: -97.7431,
    accuracy: 15
  };

  describe('Load Crews Actions', () => {
    it('should create loadCrews action', () => {
      const action = CrewActions.loadCrews({ filters: mockFilters });
      expect(action.type).toBe('[Crew] Load Crews');
      expect(action.filters).toEqual(mockFilters);
    });

    it('should create loadCrews action without filters', () => {
      const action = CrewActions.loadCrews({});
      expect(action.type).toBe('[Crew] Load Crews');
      expect(action.filters).toBeUndefined();
    });

    it('should create loadCrewsSuccess action', () => {
      const crews = [mockCrew];
      const action = CrewActions.loadCrewsSuccess({ crews });
      expect(action.type).toBe('[Crew] Load Crews Success');
      expect(action.crews).toEqual(crews);
    });

    it('should create loadCrewsFailure action', () => {
      const error = 'Failed to load crews';
      const action = CrewActions.loadCrewsFailure({ error });
      expect(action.type).toBe('[Crew] Load Crews Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('Create Crew Actions', () => {
    it('should create createCrew action', () => {
      const action = CrewActions.createCrew({ crew: mockCreateDto });
      expect(action.type).toBe('[Crew] Create Crew');
      expect(action.crew).toEqual(mockCreateDto);
    });

    it('should create createCrewSuccess action', () => {
      const action = CrewActions.createCrewSuccess({ crew: mockCrew });
      expect(action.type).toBe('[Crew] Create Crew Success');
      expect(action.crew).toEqual(mockCrew);
    });

    it('should create createCrewFailure action', () => {
      const error = 'Failed to create crew';
      const action = CrewActions.createCrewFailure({ error });
      expect(action.type).toBe('[Crew] Create Crew Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('Update Crew Actions', () => {
    it('should create updateCrew action', () => {
      const action = CrewActions.updateCrew({ 
        id: mockCrew.id, 
        crew: mockUpdateDto 
      });
      expect(action.type).toBe('[Crew] Update Crew');
      expect(action.id).toBe(mockCrew.id);
      expect(action.crew).toEqual(mockUpdateDto);
    });

    it('should create updateCrewSuccess action', () => {
      const action = CrewActions.updateCrewSuccess({ crew: mockCrew });
      expect(action.type).toBe('[Crew] Update Crew Success');
      expect(action.crew).toEqual(mockCrew);
    });

    it('should create updateCrewFailure action', () => {
      const error = 'Failed to update crew';
      const action = CrewActions.updateCrewFailure({ error });
      expect(action.type).toBe('[Crew] Update Crew Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('Delete Crew Actions', () => {
    it('should create deleteCrew action', () => {
      const action = CrewActions.deleteCrew({ id: mockCrew.id });
      expect(action.type).toBe('[Crew] Delete Crew');
      expect(action.id).toBe(mockCrew.id);
    });

    it('should create deleteCrewSuccess action', () => {
      const action = CrewActions.deleteCrewSuccess({ id: mockCrew.id });
      expect(action.type).toBe('[Crew] Delete Crew Success');
      expect(action.id).toBe(mockCrew.id);
    });

    it('should create deleteCrewFailure action', () => {
      const error = 'Failed to delete crew';
      const action = CrewActions.deleteCrewFailure({ error });
      expect(action.type).toBe('[Crew] Delete Crew Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('Select Crew Actions', () => {
    it('should create selectCrew action with id', () => {
      const action = CrewActions.selectCrew({ id: mockCrew.id });
      expect(action.type).toBe('[Crew] Select Crew');
      expect(action.id).toBe(mockCrew.id);
    });

    it('should create selectCrew action with null', () => {
      const action = CrewActions.selectCrew({ id: null });
      expect(action.type).toBe('[Crew] Select Crew');
      expect(action.id).toBeNull();
    });
  });

  describe('Filter Actions', () => {
    it('should create setCrewFilters action', () => {
      const action = CrewActions.setCrewFilters({ filters: mockFilters });
      expect(action.type).toBe('[Crew] Set Filters');
      expect(action.filters).toEqual(mockFilters);
    });

    it('should create clearCrewFilters action', () => {
      const action = CrewActions.clearCrewFilters();
      expect(action.type).toBe('[Crew] Clear Filters');
    });
  });

  describe('Update Crew Location Actions', () => {
    it('should create updateCrewLocation action', () => {
      const action = CrewActions.updateCrewLocation({ 
        crewId: mockCrew.id, 
        location: mockLocation 
      });
      expect(action.type).toBe('[Crew] Update Crew Location');
      expect(action.crewId).toBe(mockCrew.id);
      expect(action.location).toEqual(mockLocation);
    });

    it('should create updateCrewLocationSuccess action', () => {
      const action = CrewActions.updateCrewLocationSuccess({ 
        crewId: mockCrew.id, 
        location: mockLocation 
      });
      expect(action.type).toBe('[Crew] Update Crew Location Success');
      expect(action.crewId).toBe(mockCrew.id);
      expect(action.location).toEqual(mockLocation);
    });

    it('should create updateCrewLocationFailure action', () => {
      const error = 'Failed to update crew location';
      const action = CrewActions.updateCrewLocationFailure({ error });
      expect(action.type).toBe('[Crew] Update Crew Location Failure');
      expect(action.error).toBe(error);
    });

    it('should validate location coordinates in action payload', () => {
      const validLocation: GeoLocation = {
        latitude: 45.5231,
        longitude: -122.6765,
        accuracy: 5
      };
      const action = CrewActions.updateCrewLocation({ 
        crewId: mockCrew.id, 
        location: validLocation 
      });
      expect(action.location.latitude).toBeGreaterThanOrEqual(-90);
      expect(action.location.latitude).toBeLessThanOrEqual(90);
      expect(action.location.longitude).toBeGreaterThanOrEqual(-180);
      expect(action.location.longitude).toBeLessThanOrEqual(180);
    });
  });

  describe('Assign Job to Crew Actions', () => {
    it('should create assignJobToCrew action', () => {
      const jobId = 'job-456';
      const action = CrewActions.assignJobToCrew({ 
        crewId: mockCrew.id, 
        jobId 
      });
      expect(action.type).toBe('[Crew] Assign Job to Crew');
      expect(action.crewId).toBe(mockCrew.id);
      expect(action.jobId).toBe(jobId);
    });

    it('should create assignJobToCrewSuccess action', () => {
      const crewWithJob = { ...mockCrew, activeJobId: 'job-456' };
      const action = CrewActions.assignJobToCrewSuccess({ crew: crewWithJob });
      expect(action.type).toBe('[Crew] Assign Job to Crew Success');
      expect(action.crew).toEqual(crewWithJob);
    });

    it('should create assignJobToCrewFailure action', () => {
      const error = 'Failed to assign job to crew';
      const action = CrewActions.assignJobToCrewFailure({ error });
      expect(action.type).toBe('[Crew] Assign Job to Crew Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('Unassign Job from Crew Actions', () => {
    it('should create unassignJobFromCrew action', () => {
      const action = CrewActions.unassignJobFromCrew({ crewId: mockCrew.id });
      expect(action.type).toBe('[Crew] Unassign Job from Crew');
      expect(action.crewId).toBe(mockCrew.id);
    });

    it('should create unassignJobFromCrewSuccess action', () => {
      const crewWithoutJob = { ...mockCrew, activeJobId: undefined };
      const action = CrewActions.unassignJobFromCrewSuccess({ crew: crewWithoutJob });
      expect(action.type).toBe('[Crew] Unassign Job from Crew Success');
      expect(action.crew).toEqual(crewWithoutJob);
    });

    it('should create unassignJobFromCrewFailure action', () => {
      const error = 'Failed to unassign job from crew';
      const action = CrewActions.unassignJobFromCrewFailure({ error });
      expect(action.type).toBe('[Crew] Unassign Job from Crew Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('Add Crew Member Actions', () => {
    it('should create addCrewMember action', () => {
      const technicianId = 'tech-006';
      const action = CrewActions.addCrewMember({ 
        crewId: mockCrew.id, 
        technicianId 
      });
      expect(action.type).toBe('[Crew] Add Crew Member');
      expect(action.crewId).toBe(mockCrew.id);
      expect(action.technicianId).toBe(technicianId);
    });

    it('should create addCrewMemberSuccess action', () => {
      const crewWithNewMember = { 
        ...mockCrew, 
        memberIds: [...mockCrew.memberIds, 'tech-006'] 
      };
      const action = CrewActions.addCrewMemberSuccess({ crew: crewWithNewMember });
      expect(action.type).toBe('[Crew] Add Crew Member Success');
      expect(action.crew).toEqual(crewWithNewMember);
    });

    it('should create addCrewMemberFailure action', () => {
      const error = 'Failed to add crew member';
      const action = CrewActions.addCrewMemberFailure({ error });
      expect(action.type).toBe('[Crew] Add Crew Member Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('Remove Crew Member Actions', () => {
    it('should create removeCrewMember action', () => {
      const technicianId = 'tech-002';
      const action = CrewActions.removeCrewMember({ 
        crewId: mockCrew.id, 
        technicianId 
      });
      expect(action.type).toBe('[Crew] Remove Crew Member');
      expect(action.crewId).toBe(mockCrew.id);
      expect(action.technicianId).toBe(technicianId);
    });

    it('should create removeCrewMemberSuccess action', () => {
      const crewWithoutMember = { 
        ...mockCrew, 
        memberIds: mockCrew.memberIds.filter(id => id !== 'tech-002') 
      };
      const action = CrewActions.removeCrewMemberSuccess({ crew: crewWithoutMember });
      expect(action.type).toBe('[Crew] Remove Crew Member Success');
      expect(action.crew).toEqual(crewWithoutMember);
    });

    it('should create removeCrewMemberFailure action', () => {
      const error = 'Failed to remove crew member';
      const action = CrewActions.removeCrewMemberFailure({ error });
      expect(action.type).toBe('[Crew] Remove Crew Member Failure');
      expect(action.error).toBe(error);
    });
  });
});
