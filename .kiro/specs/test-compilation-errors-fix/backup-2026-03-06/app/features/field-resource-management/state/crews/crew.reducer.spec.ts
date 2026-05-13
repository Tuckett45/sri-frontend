/**
 * Crew Reducer Tests
 * Unit tests for crew state reducer
 */

import { crewReducer, initialState, crewAdapter } from './crew.reducer';
import * as CrewActions from './crew.actions';
import { Crew, CrewStatus } from '../../models/crew.model';
import { GeoLocation } from '../../models/time-entry.model';

describe('CrewReducer', () => {
  const mockCrew: Crew = {
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
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  const mockLocation: GeoLocation = {
    latitude: 30.2672,
    longitude: -97.7431,
    accuracy: 15
  };

  describe('Initial State', () => {
    it('should return the initial state', () => {
      const action = { type: 'Unknown' };
      const state = crewReducer(undefined, action);

      expect(state).toEqual(initialState);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.selectedId).toBeNull();
      expect(state.filters).toEqual({});
    });
  });

  describe('Load Crews', () => {
    it('should set loading to true on loadCrews', () => {
      const action = CrewActions.loadCrews({ filters: {} });
      const state = crewReducer(initialState, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should set filters on loadCrews', () => {
      const filters = { market: 'DALLAS', status: CrewStatus.Available };
      const action = CrewActions.loadCrews({ filters });
      const state = crewReducer(initialState, action);

      expect(state.filters).toEqual(filters);
    });

    it('should preserve existing filters if none provided', () => {
      const existingFilters = { market: 'AUSTIN' };
      const stateWithFilters = { ...initialState, filters: existingFilters };
      const action = CrewActions.loadCrews({});
      const state = crewReducer(stateWithFilters, action);

      expect(state.filters).toEqual(existingFilters);
    });

    it('should add all crews on loadCrewsSuccess', () => {
      const crews = [mockCrew];
      const action = CrewActions.loadCrewsSuccess({ crews });
      const state = crewReducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.ids.length).toBe(1);
      expect(state.entities[mockCrew.id]).toEqual(mockCrew);
    });

    it('should replace existing crews on loadCrewsSuccess', () => {
      const existingCrew: Crew = { ...mockCrew, id: 'crew-old' };
      const stateWithCrew = crewAdapter.addOne(existingCrew, initialState);
      const newCrews = [mockCrew];
      const action = CrewActions.loadCrewsSuccess({ crews: newCrews });
      const state = crewReducer(stateWithCrew, action);

      expect(state.ids.length).toBe(1);
      expect(state.ids[0]).toBe(mockCrew.id);
      expect(state.entities['crew-old']).toBeUndefined();
    });

    it('should set error on loadCrewsFailure', () => {
      const error = 'Failed to load crews';
      const action = CrewActions.loadCrewsFailure({ error });
      const state = crewReducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('Create Crew', () => {
    it('should set loading to true on createCrew', () => {
      const action = CrewActions.createCrew({ 
        crew: { name: 'Beta Team', leadTechnicianId: 'tech-004' } as any 
      });
      const state = crewReducer(initialState, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should add crew on createCrewSuccess', () => {
      const action = CrewActions.createCrewSuccess({ crew: mockCrew });
      const state = crewReducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.ids.length).toBe(1);
      expect(state.entities[mockCrew.id]).toEqual(mockCrew);
    });

    it('should set error on createCrewFailure', () => {
      const error = 'Failed to create crew';
      const action = CrewActions.createCrewFailure({ error });
      const state = crewReducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('Update Crew', () => {
    let stateWithCrew: any;

    beforeEach(() => {
      stateWithCrew = crewAdapter.addOne(mockCrew, initialState);
    });

    it('should set loading to true on updateCrew', () => {
      const action = CrewActions.updateCrew({ 
        id: mockCrew.id, 
        crew: { name: 'Updated Team' } as any 
      });
      const state = crewReducer(stateWithCrew, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should update crew on updateCrewSuccess', () => {
      const updatedCrew = { ...mockCrew, name: 'Updated Team' };
      const action = CrewActions.updateCrewSuccess({ crew: updatedCrew });
      const state = crewReducer(stateWithCrew, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.entities[mockCrew.id]?.name).toBe('Updated Team');
    });

    it('should set error on updateCrewFailure', () => {
      const error = 'Failed to update crew';
      const action = CrewActions.updateCrewFailure({ error });
      const state = crewReducer(stateWithCrew, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('Delete Crew', () => {
    let stateWithCrew: any;

    beforeEach(() => {
      stateWithCrew = crewAdapter.addOne(mockCrew, initialState);
    });

    it('should set loading to true on deleteCrew', () => {
      const action = CrewActions.deleteCrew({ id: mockCrew.id });
      const state = crewReducer(stateWithCrew, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should remove crew on deleteCrewSuccess', () => {
      const action = CrewActions.deleteCrewSuccess({ id: mockCrew.id });
      const state = crewReducer(stateWithCrew, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.ids.length).toBe(0);
      expect(state.entities[mockCrew.id]).toBeUndefined();
    });

    it('should clear selectedId if deleted crew was selected', () => {
      const stateWithSelection = { ...stateWithCrew, selectedId: mockCrew.id };
      const action = CrewActions.deleteCrewSuccess({ id: mockCrew.id });
      const state = crewReducer(stateWithSelection, action);

      expect(state.selectedId).toBeNull();
    });

    it('should preserve selectedId if different crew was deleted', () => {
      const stateWithSelection = { ...stateWithCrew, selectedId: 'other-id' };
      const action = CrewActions.deleteCrewSuccess({ id: mockCrew.id });
      const state = crewReducer(stateWithSelection, action);

      expect(state.selectedId).toBe('other-id');
    });

    it('should set error on deleteCrewFailure', () => {
      const error = 'Failed to delete crew';
      const action = CrewActions.deleteCrewFailure({ error });
      const state = crewReducer(stateWithCrew, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('Select Crew', () => {
    it('should set selectedId on selectCrew', () => {
      const action = CrewActions.selectCrew({ id: mockCrew.id });
      const state = crewReducer(initialState, action);

      expect(state.selectedId).toBe(mockCrew.id);
    });

    it('should clear selectedId when null is passed', () => {
      const stateWithSelection = { ...initialState, selectedId: mockCrew.id };
      const action = CrewActions.selectCrew({ id: null });
      const state = crewReducer(stateWithSelection, action);

      expect(state.selectedId).toBeNull();
    });
  });

  describe('Filters', () => {
    it('should set filters on setCrewFilters', () => {
      const filters = { market: 'DALLAS', status: CrewStatus.Available };
      const action = CrewActions.setCrewFilters({ filters });
      const state = crewReducer(initialState, action);

      expect(state.filters).toEqual(filters);
    });

    it('should clear filters on clearCrewFilters', () => {
      const stateWithFilters = { ...initialState, filters: { market: 'DALLAS' } };
      const action = CrewActions.clearCrewFilters();
      const state = crewReducer(stateWithFilters, action);

      expect(state.filters).toEqual({});
    });
  });

  describe('Update Crew Location', () => {
    let stateWithCrew: any;

    beforeEach(() => {
      stateWithCrew = crewAdapter.addOne(mockCrew, initialState);
    });

    it('should clear error on updateCrewLocation', () => {
      const stateWithError = { ...stateWithCrew, error: 'Previous error' };
      const action = CrewActions.updateCrewLocation({ 
        crewId: mockCrew.id, 
        location: mockLocation 
      });
      const state = crewReducer(stateWithError, action);

      expect(state.error).toBeNull();
    });

    it('should update crew location on updateCrewLocationSuccess', () => {
      const action = CrewActions.updateCrewLocationSuccess({ 
        crewId: mockCrew.id, 
        location: mockLocation 
      });
      const state = crewReducer(stateWithCrew, action);

      expect(state.error).toBeNull();
      expect(state.entities[mockCrew.id]?.currentLocation).toEqual(mockLocation);
      expect(state.entities[mockCrew.id]?.updatedAt).toBeDefined();
    });

    it('should set error on updateCrewLocationFailure', () => {
      const error = 'Failed to update location';
      const action = CrewActions.updateCrewLocationFailure({ error });
      const state = crewReducer(stateWithCrew, action);

      expect(state.error).toBe(error);
    });

    it('should preserve other crew properties when updating location', () => {
      const action = CrewActions.updateCrewLocationSuccess({ 
        crewId: mockCrew.id, 
        location: mockLocation 
      });
      const state = crewReducer(stateWithCrew, action);

      const updatedCrew = state.entities[mockCrew.id];
      expect(updatedCrew?.name).toBe(mockCrew.name);
      expect(updatedCrew?.leadTechnicianId).toBe(mockCrew.leadTechnicianId);
      expect(updatedCrew?.memberIds).toEqual(mockCrew.memberIds);
    });
  });

  describe('Assign Job to Crew', () => {
    let stateWithCrew: any;

    beforeEach(() => {
      stateWithCrew = crewAdapter.addOne(mockCrew, initialState);
    });

    it('should set loading to true on assignJobToCrew', () => {
      const action = CrewActions.assignJobToCrew({ 
        crewId: mockCrew.id, 
        jobId: 'job-456' 
      });
      const state = crewReducer(stateWithCrew, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should update crew with job on assignJobToCrewSuccess', () => {
      const crewWithJob = { ...mockCrew, activeJobId: 'job-456', status: CrewStatus.OnJob };
      const action = CrewActions.assignJobToCrewSuccess({ crew: crewWithJob });
      const state = crewReducer(stateWithCrew, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.entities[mockCrew.id]?.activeJobId).toBe('job-456');
      expect(state.entities[mockCrew.id]?.status).toBe(CrewStatus.OnJob);
    });

    it('should set error on assignJobToCrewFailure', () => {
      const error = 'Failed to assign job';
      const action = CrewActions.assignJobToCrewFailure({ error });
      const state = crewReducer(stateWithCrew, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('Unassign Job from Crew', () => {
    let stateWithCrewOnJob: any;

    beforeEach(() => {
      const crewOnJob = { ...mockCrew, activeJobId: 'job-456', status: CrewStatus.OnJob };
      stateWithCrewOnJob = crewAdapter.addOne(crewOnJob, initialState);
    });

    it('should set loading to true on unassignJobFromCrew', () => {
      const action = CrewActions.unassignJobFromCrew({ crewId: mockCrew.id });
      const state = crewReducer(stateWithCrewOnJob, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should remove job from crew on unassignJobFromCrewSuccess', () => {
      const crewWithoutJob = { ...mockCrew, activeJobId: undefined, status: CrewStatus.Available };
      const action = CrewActions.unassignJobFromCrewSuccess({ crew: crewWithoutJob });
      const state = crewReducer(stateWithCrewOnJob, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.entities[mockCrew.id]?.activeJobId).toBeUndefined();
      expect(state.entities[mockCrew.id]?.status).toBe(CrewStatus.Available);
    });

    it('should set error on unassignJobFromCrewFailure', () => {
      const error = 'Failed to unassign job';
      const action = CrewActions.unassignJobFromCrewFailure({ error });
      const state = crewReducer(stateWithCrewOnJob, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('Add Crew Member', () => {
    let stateWithCrew: any;

    beforeEach(() => {
      stateWithCrew = crewAdapter.addOne(mockCrew, initialState);
    });

    it('should set loading to true on addCrewMember', () => {
      const action = CrewActions.addCrewMember({ 
        crewId: mockCrew.id, 
        technicianId: 'tech-006' 
      });
      const state = crewReducer(stateWithCrew, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should add member to crew on addCrewMemberSuccess', () => {
      const crewWithNewMember = { 
        ...mockCrew, 
        memberIds: [...mockCrew.memberIds, 'tech-006'] 
      };
      const action = CrewActions.addCrewMemberSuccess({ crew: crewWithNewMember });
      const state = crewReducer(stateWithCrew, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.entities[mockCrew.id]?.memberIds).toContain('tech-006');
      expect(state.entities[mockCrew.id]?.memberIds.length).toBe(4);
    });

    it('should set error on addCrewMemberFailure', () => {
      const error = 'Failed to add member';
      const action = CrewActions.addCrewMemberFailure({ error });
      const state = crewReducer(stateWithCrew, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('Remove Crew Member', () => {
    let stateWithCrew: any;

    beforeEach(() => {
      stateWithCrew = crewAdapter.addOne(mockCrew, initialState);
    });

    it('should set loading to true on removeCrewMember', () => {
      const action = CrewActions.removeCrewMember({ 
        crewId: mockCrew.id, 
        technicianId: 'tech-002' 
      });
      const state = crewReducer(stateWithCrew, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should remove member from crew on removeCrewMemberSuccess', () => {
      const crewWithoutMember = { 
        ...mockCrew, 
        memberIds: mockCrew.memberIds.filter(id => id !== 'tech-002') 
      };
      const action = CrewActions.removeCrewMemberSuccess({ crew: crewWithoutMember });
      const state = crewReducer(stateWithCrew, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.entities[mockCrew.id]?.memberIds).not.toContain('tech-002');
      expect(state.entities[mockCrew.id]?.memberIds.length).toBe(2);
    });

    it('should set error on removeCrewMemberFailure', () => {
      const error = 'Failed to remove member';
      const action = CrewActions.removeCrewMemberFailure({ error });
      const state = crewReducer(stateWithCrew, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('Entity Adapter', () => {
    it('should sort crews by name', () => {
      const crew1: Crew = { ...mockCrew, id: '1', name: 'Charlie Team' };
      const crew2: Crew = { ...mockCrew, id: '2', name: 'Alpha Team' };
      const crew3: Crew = { ...mockCrew, id: '3', name: 'Bravo Team' };

      const action = CrewActions.loadCrewsSuccess({ 
        crews: [crew1, crew2, crew3] 
      });
      const state = crewReducer(initialState, action);

      // Should be sorted: Alpha, Bravo, Charlie
      expect(state.ids[0]).toBe('2'); // Alpha
      expect(state.ids[1]).toBe('3'); // Bravo
      expect(state.ids[2]).toBe('1'); // Charlie
    });
  });
});
