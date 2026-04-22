/**
 * Technician Reducer Tests
 * Unit tests for technician state reducer
 */

import { technicianReducer, initialState, technicianAdapter } from './technician.reducer';
import * as TechnicianActions from './technician.actions';
import { Technician, TechnicianRole, EmploymentType } from '../../models/technician.model';
import { GeoLocation } from '../../models/time-entry.model';

describe('TechnicianReducer', () => {
  const mockTechnician: Technician = {
    id: 'tech-1',
    technicianId: 'T001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '555-0100',
    role: TechnicianRole.Level2,
    employmentType: EmploymentType.W2,
    homeBase: 'Dallas',
    region: 'TX',
    skills: [],
    certifications: [],
    availability: [],
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  const mockLocation: GeoLocation = {
    latitude: 32.7767,
    longitude: -96.7970,
    accuracy: 10
  };

  describe('Initial State', () => {
    it('should return the initial state', () => {
      const action = { type: 'Unknown' };
      const state = technicianReducer(undefined, action);

      expect(state).toEqual(initialState);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.selectedId).toBeNull();
      expect(state.filters).toEqual({});
    });
  });

  describe('Load Technicians', () => {
    it('should set loading to true on loadTechnicians', () => {
      const action = TechnicianActions.loadTechnicians({ filters: {} });
      const state = technicianReducer(initialState, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should set filters on loadTechnicians', () => {
      const filters = { region: 'TX', isActive: true };
      const action = TechnicianActions.loadTechnicians({ filters });
      const state = technicianReducer(initialState, action);

      expect(state.filters).toEqual(filters);
    });

    it('should add all technicians on loadTechniciansSuccess', () => {
      const technicians = [mockTechnician];
      const action = TechnicianActions.loadTechniciansSuccess({ technicians });
      const state = technicianReducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.ids.length).toBe(1);
      expect(state.entities[mockTechnician.id]).toEqual(mockTechnician);
    });

    it('should set error on loadTechniciansFailure', () => {
      const error = 'Failed to load technicians';
      const action = TechnicianActions.loadTechniciansFailure({ error });
      const state = technicianReducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('Create Technician', () => {
    it('should set loading to true on createTechnician', () => {
      const action = TechnicianActions.createTechnician({ 
        technician: { firstName: 'Jane', lastName: 'Smith' } as any 
      });
      const state = technicianReducer(initialState, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should add technician on createTechnicianSuccess', () => {
      const action = TechnicianActions.createTechnicianSuccess({ technician: mockTechnician });
      const state = technicianReducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.ids.length).toBe(1);
      expect(state.entities[mockTechnician.id]).toEqual(mockTechnician);
    });

    it('should set error on createTechnicianFailure', () => {
      const error = 'Failed to create technician';
      const action = TechnicianActions.createTechnicianFailure({ error });
      const state = technicianReducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('Update Technician', () => {
    let stateWithTechnician: any;

    beforeEach(() => {
      stateWithTechnician = technicianAdapter.addOne(mockTechnician, initialState);
    });

    it('should set loading to true on updateTechnician', () => {
      const action = TechnicianActions.updateTechnician({ 
        id: mockTechnician.id, 
        technician: { firstName: 'Jane' } as any 
      });
      const state = technicianReducer(stateWithTechnician, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should update technician on updateTechnicianSuccess', () => {
      const updatedTechnician = { ...mockTechnician, firstName: 'Jane' };
      const action = TechnicianActions.updateTechnicianSuccess({ technician: updatedTechnician });
      const state = technicianReducer(stateWithTechnician, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.entities[mockTechnician.id]?.firstName).toBe('Jane');
    });

    it('should set error on updateTechnicianFailure', () => {
      const error = 'Failed to update technician';
      const action = TechnicianActions.updateTechnicianFailure({ error });
      const state = technicianReducer(stateWithTechnician, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('Delete Technician', () => {
    let stateWithTechnician: any;

    beforeEach(() => {
      stateWithTechnician = technicianAdapter.addOne(mockTechnician, initialState);
    });

    it('should set loading to true on deleteTechnician', () => {
      const action = TechnicianActions.deleteTechnician({ id: mockTechnician.id });
      const state = technicianReducer(stateWithTechnician, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should remove technician on deleteTechnicianSuccess', () => {
      const action = TechnicianActions.deleteTechnicianSuccess({ id: mockTechnician.id });
      const state = technicianReducer(stateWithTechnician, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.ids.length).toBe(0);
      expect(state.entities[mockTechnician.id]).toBeUndefined();
    });

    it('should clear selectedId if deleted technician was selected', () => {
      const stateWithSelection = { ...stateWithTechnician, selectedId: mockTechnician.id };
      const action = TechnicianActions.deleteTechnicianSuccess({ id: mockTechnician.id });
      const state = technicianReducer(stateWithSelection, action);

      expect(state.selectedId).toBeNull();
    });

    it('should preserve selectedId if different technician was deleted', () => {
      const stateWithSelection = { ...stateWithTechnician, selectedId: 'other-id' };
      const action = TechnicianActions.deleteTechnicianSuccess({ id: mockTechnician.id });
      const state = technicianReducer(stateWithSelection, action);

      expect(state.selectedId).toBe('other-id');
    });

    it('should set error on deleteTechnicianFailure', () => {
      const error = 'Failed to delete technician';
      const action = TechnicianActions.deleteTechnicianFailure({ error });
      const state = technicianReducer(stateWithTechnician, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('Select Technician', () => {
    it('should set selectedId on selectTechnician', () => {
      const action = TechnicianActions.selectTechnician({ id: mockTechnician.id });
      const state = technicianReducer(initialState, action);

      expect(state.selectedId).toBe(mockTechnician.id);
    });

    it('should clear selectedId when null is passed', () => {
      const stateWithSelection = { ...initialState, selectedId: mockTechnician.id };
      const action = TechnicianActions.selectTechnician({ id: null });
      const state = technicianReducer(stateWithSelection, action);

      expect(state.selectedId).toBeNull();
    });
  });

  describe('Filters', () => {
    it('should set filters on setTechnicianFilters', () => {
      const filters = { region: 'TX', isActive: true };
      const action = TechnicianActions.setTechnicianFilters({ filters });
      const state = technicianReducer(initialState, action);

      expect(state.filters).toEqual(filters);
    });

    it('should clear filters on clearTechnicianFilters', () => {
      const stateWithFilters = { ...initialState, filters: { region: 'TX' } };
      const action = TechnicianActions.clearTechnicianFilters();
      const state = technicianReducer(stateWithFilters, action);

      expect(state.filters).toEqual({});
    });
  });

  describe('Update Technician Location', () => {
    let stateWithTechnician: any;

    beforeEach(() => {
      stateWithTechnician = technicianAdapter.addOne(mockTechnician, initialState);
    });

    it('should clear error on updateTechnicianLocation', () => {
      const stateWithError = { ...stateWithTechnician, error: 'Previous error' };
      const action = TechnicianActions.updateTechnicianLocation({ 
        technicianId: mockTechnician.id, 
        location: mockLocation 
      });
      const state = technicianReducer(stateWithError, action);

      expect(state.error).toBeNull();
    });

    it('should update technician location on updateTechnicianLocationSuccess', () => {
      const action = TechnicianActions.updateTechnicianLocationSuccess({ 
        technicianId: mockTechnician.id, 
        location: mockLocation 
      });
      const state = technicianReducer(stateWithTechnician, action);

      expect(state.error).toBeNull();
      expect(state.entities[mockTechnician.id]?.currentLocation).toEqual(mockLocation);
      expect(state.entities[mockTechnician.id]?.updatedAt).toBeDefined();
    });

    it('should set error on updateTechnicianLocationFailure', () => {
      const error = 'Failed to update location';
      const action = TechnicianActions.updateTechnicianLocationFailure({ error });
      const state = technicianReducer(stateWithTechnician, action);

      expect(state.error).toBe(error);
    });

    it('should preserve other technician properties when updating location', () => {
      const action = TechnicianActions.updateTechnicianLocationSuccess({ 
        technicianId: mockTechnician.id, 
        location: mockLocation 
      });
      const state = technicianReducer(stateWithTechnician, action);

      const updatedTechnician = state.entities[mockTechnician.id];
      expect(updatedTechnician?.firstName).toBe(mockTechnician.firstName);
      expect(updatedTechnician?.lastName).toBe(mockTechnician.lastName);
      expect(updatedTechnician?.email).toBe(mockTechnician.email);
    });
  });

  describe('Entity Adapter', () => {
    it('should sort technicians by last name then first name', () => {
      const tech1: Technician = { ...mockTechnician, id: '1', firstName: 'Alice', lastName: 'Smith' };
      const tech2: Technician = { ...mockTechnician, id: '2', firstName: 'Bob', lastName: 'Jones' };
      const tech3: Technician = { ...mockTechnician, id: '3', firstName: 'Charlie', lastName: 'Smith' };

      const action = TechnicianActions.loadTechniciansSuccess({ 
        technicians: [tech2, tech3, tech1] 
      });
      const state = technicianReducer(initialState, action);

      // Should be sorted: Jones Bob, Smith Alice, Smith Charlie
      expect(state.ids[0]).toBe('2'); // Jones
      expect(state.ids[1]).toBe('1'); // Smith Alice
      expect(state.ids[2]).toBe('3'); // Smith Charlie
    });
  });
});
