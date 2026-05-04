/**
 * Unit tests for Technician Actions
 */

import * as TechnicianActions from './technician.actions';
import { Technician, TechnicianRole, EmploymentType } from '../../models/technician.model';
import { TechnicianFilters } from '../../models/dtos/filters.dto';
import { CreateTechnicianDto, UpdateTechnicianDto } from '../../models/dtos/technician.dto';
import { GeoLocation } from '../../models/time-entry.model';

describe('Technician Actions', () => {
  const mockTechnician: Technician = {
    id: 'tech-123',
    technicianId: 'T-001',
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
    canTravel: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockFilters: TechnicianFilters = {
    region: 'TX',
    role: TechnicianRole.Level2,
    isActive: true
  };

  const mockCreateDto: CreateTechnicianDto = {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    phone: '555-0200',
    role: TechnicianRole.Level1,
    employmentType: EmploymentType.W2,
    homeBase: 'Austin',
    region: 'TX'
  };

  const mockUpdateDto: UpdateTechnicianDto = {
    phone: '555-0300',
    homeBase: 'Houston'
  };

  const mockLocation: GeoLocation = {
    latitude: 32.7767,
    longitude: -96.7970,
    accuracy: 10
  };

  describe('Load Technicians Actions', () => {
    it('should create loadTechnicians action', () => {
      const action = TechnicianActions.loadTechnicians({ filters: mockFilters });
      expect(action.type).toBe('[Technician] Load Technicians');
      expect(action.filters).toEqual(mockFilters);
    });

    it('should create loadTechnicians action without filters', () => {
      const action = TechnicianActions.loadTechnicians({});
      expect(action.type).toBe('[Technician] Load Technicians');
      expect(action.filters).toBeUndefined();
    });

    it('should create loadTechniciansSuccess action', () => {
      const technicians = [mockTechnician];
      const action = TechnicianActions.loadTechniciansSuccess({ technicians });
      expect(action.type).toBe('[Technician] Load Technicians Success');
      expect(action.technicians).toEqual(technicians);
    });

    it('should create loadTechniciansFailure action', () => {
      const error = 'Failed to load technicians';
      const action = TechnicianActions.loadTechniciansFailure({ error });
      expect(action.type).toBe('[Technician] Load Technicians Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('Create Technician Actions', () => {
    it('should create createTechnician action', () => {
      const action = TechnicianActions.createTechnician({ technician: mockCreateDto });
      expect(action.type).toBe('[Technician] Create Technician');
      expect(action.technician).toEqual(mockCreateDto);
    });

    it('should create createTechnicianSuccess action', () => {
      const action = TechnicianActions.createTechnicianSuccess({ technician: mockTechnician });
      expect(action.type).toBe('[Technician] Create Technician Success');
      expect(action.technician).toEqual(mockTechnician);
    });

    it('should create createTechnicianFailure action', () => {
      const error = 'Failed to create technician';
      const action = TechnicianActions.createTechnicianFailure({ error });
      expect(action.type).toBe('[Technician] Create Technician Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('Update Technician Actions', () => {
    it('should create updateTechnician action', () => {
      const action = TechnicianActions.updateTechnician({ 
        id: mockTechnician.id, 
        technician: mockUpdateDto 
      });
      expect(action.type).toBe('[Technician] Update Technician');
      expect(action.id).toBe(mockTechnician.id);
      expect(action.technician).toEqual(mockUpdateDto);
    });

    it('should create updateTechnicianSuccess action', () => {
      const action = TechnicianActions.updateTechnicianSuccess({ technician: mockTechnician });
      expect(action.type).toBe('[Technician] Update Technician Success');
      expect(action.technician).toEqual(mockTechnician);
    });

    it('should create updateTechnicianFailure action', () => {
      const error = 'Failed to update technician';
      const action = TechnicianActions.updateTechnicianFailure({ error });
      expect(action.type).toBe('[Technician] Update Technician Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('Delete Technician Actions', () => {
    it('should create deleteTechnician action', () => {
      const action = TechnicianActions.deleteTechnician({ id: mockTechnician.id });
      expect(action.type).toBe('[Technician] Delete Technician');
      expect(action.id).toBe(mockTechnician.id);
    });

    it('should create deleteTechnicianSuccess action', () => {
      const action = TechnicianActions.deleteTechnicianSuccess({ id: mockTechnician.id });
      expect(action.type).toBe('[Technician] Delete Technician Success');
      expect(action.id).toBe(mockTechnician.id);
    });

    it('should create deleteTechnicianFailure action', () => {
      const error = 'Failed to delete technician';
      const action = TechnicianActions.deleteTechnicianFailure({ error });
      expect(action.type).toBe('[Technician] Delete Technician Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('Select Technician Actions', () => {
    it('should create selectTechnician action with id', () => {
      const action = TechnicianActions.selectTechnician({ id: mockTechnician.id });
      expect(action.type).toBe('[Technician] Select Technician');
      expect(action.id).toBe(mockTechnician.id);
    });

    it('should create selectTechnician action with null', () => {
      const action = TechnicianActions.selectTechnician({ id: null });
      expect(action.type).toBe('[Technician] Select Technician');
      expect(action.id).toBeNull();
    });
  });

  describe('Filter Actions', () => {
    it('should create setTechnicianFilters action', () => {
      const action = TechnicianActions.setTechnicianFilters({ filters: mockFilters });
      expect(action.type).toBe('[Technician] Set Filters');
      expect(action.filters).toEqual(mockFilters);
    });

    it('should create clearTechnicianFilters action', () => {
      const action = TechnicianActions.clearTechnicianFilters();
      expect(action.type).toBe('[Technician] Clear Filters');
    });
  });

  describe('Update Technician Location Actions', () => {
    it('should create updateTechnicianLocation action', () => {
      const action = TechnicianActions.updateTechnicianLocation({ 
        technicianId: mockTechnician.id, 
        location: mockLocation 
      });
      expect(action.type).toBe('[Technician] Update Technician Location');
      expect(action.technicianId).toBe(mockTechnician.id);
      expect(action.location).toEqual(mockLocation);
    });

    it('should create updateTechnicianLocationSuccess action', () => {
      const action = TechnicianActions.updateTechnicianLocationSuccess({ 
        technicianId: mockTechnician.id, 
        location: mockLocation 
      });
      expect(action.type).toBe('[Technician] Update Technician Location Success');
      expect(action.technicianId).toBe(mockTechnician.id);
      expect(action.location).toEqual(mockLocation);
    });

    it('should create updateTechnicianLocationFailure action', () => {
      const error = 'Failed to update technician location';
      const action = TechnicianActions.updateTechnicianLocationFailure({ error });
      expect(action.type).toBe('[Technician] Update Technician Location Failure');
      expect(action.error).toBe(error);
    });

    it('should validate location coordinates in action payload', () => {
      const validLocation: GeoLocation = {
        latitude: 45.5231,
        longitude: -122.6765,
        accuracy: 5
      };
      const action = TechnicianActions.updateTechnicianLocation({ 
        technicianId: mockTechnician.id, 
        location: validLocation 
      });
      expect(action.location.latitude).toBeGreaterThanOrEqual(-90);
      expect(action.location.latitude).toBeLessThanOrEqual(90);
      expect(action.location.longitude).toBeGreaterThanOrEqual(-180);
      expect(action.location.longitude).toBeLessThanOrEqual(180);
    });
  });
});
