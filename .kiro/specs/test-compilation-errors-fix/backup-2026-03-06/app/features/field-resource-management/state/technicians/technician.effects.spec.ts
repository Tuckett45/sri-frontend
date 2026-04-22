/**
 * Technician Effects Unit Tests
 * Tests all effects for technician state management
 */

import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of, throwError } from 'rxjs';
import { TechnicianEffects } from './technician.effects';
import { TechnicianService } from '../../services/technician.service';
import * as TechnicianActions from './technician.actions';
import { Technician, TechnicianRole, EmploymentType } from '../../models/technician.model';
import { GeoLocation } from '../../models/time-entry.model';

describe('TechnicianEffects', () => {
  let actions$: Observable<any>;
  let effects: TechnicianEffects;
  let technicianService: jasmine.SpyObj<TechnicianService>;

  const mockTechnician: Technician = {
    id: 'tech-123',
    technicianId: 'TECH-001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '555-0100',
    role: TechnicianRole.Installer,
    employmentType: EmploymentType.W2,
    homeBase: 'Dallas Office',
    region: 'DALLAS',
    skills: [],
    certifications: [],
    availability: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockLocation: GeoLocation = {
    latitude: 32.7767,
    longitude: -96.7970,
    accuracy: 10
  };

  beforeEach(() => {
    const technicianServiceSpy = jasmine.createSpyObj('TechnicianService', [
      'getTechnicians',
      'createTechnician',
      'updateTechnician',
      'deleteTechnician'
    ]);

    TestBed.configureTestingModule({
      providers: [
        TechnicianEffects,
        provideMockActions(() => actions$),
        { provide: TechnicianService, useValue: technicianServiceSpy }
      ]
    });

    effects = TestBed.inject(TechnicianEffects);
    technicianService = TestBed.inject(TechnicianService) as jasmine.SpyObj<TechnicianService>;
  });

  describe('loadTechnicians$', () => {
    it('should return loadTechniciansSuccess action on successful load', (done) => {
      const technicians = [mockTechnician];
      const filters = { region: 'DALLAS' };
      const action = TechnicianActions.loadTechnicians({ filters });
      const outcome = TechnicianActions.loadTechniciansSuccess({ technicians });

      actions$ = of(action);
      technicianService.getTechnicians.and.returnValue(of(technicians));

      effects.loadTechnicians$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(technicianService.getTechnicians).toHaveBeenCalledWith(filters);
        done();
      });
    });

    it('should return loadTechniciansFailure action on error', (done) => {
      const filters = { region: 'DALLAS' };
      const action = TechnicianActions.loadTechnicians({ filters });
      const error = new Error('Failed to load technicians');
      const outcome = TechnicianActions.loadTechniciansFailure({ 
        error: 'Failed to load technicians' 
      });

      actions$ = of(action);
      technicianService.getTechnicians.and.returnValue(throwError(() => error));

      effects.loadTechnicians$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(technicianService.getTechnicians).toHaveBeenCalledWith(filters);
        done();
      });
    });

    it('should handle load without filters', (done) => {
      const technicians = [mockTechnician];
      const action = TechnicianActions.loadTechnicians({ filters: undefined });
      const outcome = TechnicianActions.loadTechniciansSuccess({ technicians });

      actions$ = of(action);
      technicianService.getTechnicians.and.returnValue(of(technicians));

      effects.loadTechnicians$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(technicianService.getTechnicians).toHaveBeenCalledWith(undefined);
        done();
      });
    });

    it('should handle empty technician list', (done) => {
      const technicians: Technician[] = [];
      const action = TechnicianActions.loadTechnicians({ filters: undefined });
      const outcome = TechnicianActions.loadTechniciansSuccess({ technicians });

      actions$ = of(action);
      technicianService.getTechnicians.and.returnValue(of(technicians));

      effects.loadTechnicians$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('createTechnician$', () => {
    it('should return createTechnicianSuccess action on successful creation', (done) => {
      const createDto = {
        technicianId: 'TECH-002',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '555-0100',
        role: TechnicianRole.Installer,
        employmentType: EmploymentType.W2,
        homeBase: 'Dallas Office',
        region: 'DALLAS'
      };
      const action = TechnicianActions.createTechnician({ technician: createDto });
      const outcome = TechnicianActions.createTechnicianSuccess({ 
        technician: mockTechnician 
      });

      actions$ = of(action);
      technicianService.createTechnician.and.returnValue(of(mockTechnician));

      effects.createTechnician$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(technicianService.createTechnician).toHaveBeenCalledWith(createDto);
        done();
      });
    });

    it('should return createTechnicianFailure action on error', (done) => {
      const createDto = {
        technicianId: 'TECH-002',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '555-0100',
        role: TechnicianRole.Installer,
        employmentType: EmploymentType.W2,
        homeBase: 'Dallas Office',
        region: 'DALLAS'
      };
      const action = TechnicianActions.createTechnician({ technician: createDto });
      const error = new Error('Failed to create technician');
      const outcome = TechnicianActions.createTechnicianFailure({ 
        error: 'Failed to create technician' 
      });

      actions$ = of(action);
      technicianService.createTechnician.and.returnValue(throwError(() => error));

      effects.createTechnician$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(technicianService.createTechnician).toHaveBeenCalledWith(createDto);
        done();
      });
    });

    it('should handle validation errors', (done) => {
      const createDto = {
        technicianId: 'TECH-002',
        firstName: '',
        lastName: '',
        email: 'invalid-email',
        phone: '555-0100',
        role: TechnicianRole.Installer,
        employmentType: EmploymentType.W2,
        homeBase: 'Dallas Office',
        region: 'DALLAS'
      };
      const action = TechnicianActions.createTechnician({ technician: createDto });
      const error = new Error('Validation failed');
      const outcome = TechnicianActions.createTechnicianFailure({ 
        error: 'Validation failed' 
      });

      actions$ = of(action);
      technicianService.createTechnician.and.returnValue(throwError(() => error));

      effects.createTechnician$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('updateTechnician$', () => {
    it('should return updateTechnicianSuccess action on successful update', (done) => {
      const updateDto = {
        firstName: 'Jane',
        lastName: 'Smith'
      };
      const updatedTechnician = { ...mockTechnician, ...updateDto };
      const action = TechnicianActions.updateTechnician({ 
        id: mockTechnician.id, 
        technician: updateDto 
      });
      const outcome = TechnicianActions.updateTechnicianSuccess({ 
        technician: updatedTechnician 
      });

      actions$ = of(action);
      technicianService.updateTechnician.and.returnValue(of(updatedTechnician));

      effects.updateTechnician$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(technicianService.updateTechnician).toHaveBeenCalledWith(
          mockTechnician.id, 
          updateDto
        );
        done();
      });
    });

    it('should return updateTechnicianFailure action on error', (done) => {
      const updateDto = {
        firstName: 'Jane',
        lastName: 'Smith'
      };
      const action = TechnicianActions.updateTechnician({ 
        id: mockTechnician.id, 
        technician: updateDto 
      });
      const error = new Error('Failed to update technician');
      const outcome = TechnicianActions.updateTechnicianFailure({ 
        error: 'Failed to update technician' 
      });

      actions$ = of(action);
      technicianService.updateTechnician.and.returnValue(throwError(() => error));

      effects.updateTechnician$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(technicianService.updateTechnician).toHaveBeenCalledWith(
          mockTechnician.id, 
          updateDto
        );
        done();
      });
    });

    it('should handle permission errors', (done) => {
      const updateDto = {
        firstName: 'Jane',
        lastName: 'Smith'
      };
      const action = TechnicianActions.updateTechnician({ 
        id: mockTechnician.id, 
        technician: updateDto 
      });
      const error = new Error('Access denied. You do not have permission to perform this action.');
      const outcome = TechnicianActions.updateTechnicianFailure({ 
        error: 'Access denied. You do not have permission to perform this action.' 
      });

      actions$ = of(action);
      technicianService.updateTechnician.and.returnValue(throwError(() => error));

      effects.updateTechnician$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should handle not found errors', (done) => {
      const updateDto = {
        firstName: 'Jane',
        lastName: 'Smith'
      };
      const action = TechnicianActions.updateTechnician({ 
        id: 'non-existent-id', 
        technician: updateDto 
      });
      const error = new Error('Technician not found.');
      const outcome = TechnicianActions.updateTechnicianFailure({ 
        error: 'Technician not found.' 
      });

      actions$ = of(action);
      technicianService.updateTechnician.and.returnValue(throwError(() => error));

      effects.updateTechnician$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('deleteTechnician$', () => {
    it('should return deleteTechnicianSuccess action on successful deletion', (done) => {
      const action = TechnicianActions.deleteTechnician({ id: mockTechnician.id });
      const outcome = TechnicianActions.deleteTechnicianSuccess({ id: mockTechnician.id });

      actions$ = of(action);
      technicianService.deleteTechnician.and.returnValue(of(void 0));

      effects.deleteTechnician$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(technicianService.deleteTechnician).toHaveBeenCalledWith(mockTechnician.id);
        done();
      });
    });

    it('should return deleteTechnicianFailure action on error', (done) => {
      const action = TechnicianActions.deleteTechnician({ id: mockTechnician.id });
      const error = new Error('Failed to delete technician');
      const outcome = TechnicianActions.deleteTechnicianFailure({ 
        error: 'Failed to delete technician' 
      });

      actions$ = of(action);
      technicianService.deleteTechnician.and.returnValue(throwError(() => error));

      effects.deleteTechnician$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(technicianService.deleteTechnician).toHaveBeenCalledWith(mockTechnician.id);
        done();
      });
    });

    it('should handle permission errors on delete', (done) => {
      const action = TechnicianActions.deleteTechnician({ id: mockTechnician.id });
      const error = new Error('Access denied. You do not have permission to perform this action.');
      const outcome = TechnicianActions.deleteTechnicianFailure({ 
        error: 'Access denied. You do not have permission to perform this action.' 
      });

      actions$ = of(action);
      technicianService.deleteTechnician.and.returnValue(throwError(() => error));

      effects.deleteTechnician$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('updateTechnicianLocation$', () => {
    it('should return updateTechnicianLocationSuccess action on successful location update', (done) => {
      const action = TechnicianActions.updateTechnicianLocation({ 
        technicianId: mockTechnician.id, 
        location: mockLocation 
      });
      const outcome = TechnicianActions.updateTechnicianLocationSuccess({ 
        technicianId: mockTechnician.id, 
        location: mockLocation 
      });

      actions$ = of(action);
      technicianService.updateTechnician.and.returnValue(of(mockTechnician));

      effects.updateTechnicianLocation$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(technicianService.updateTechnician).toHaveBeenCalledWith(
          mockTechnician.id,
          { currentLocation: mockLocation }
        );
        done();
      });
    });

    it('should return updateTechnicianLocationFailure action on error', (done) => {
      const action = TechnicianActions.updateTechnicianLocation({ 
        technicianId: mockTechnician.id, 
        location: mockLocation 
      });
      const error = new Error('Failed to update technician location');
      const outcome = TechnicianActions.updateTechnicianLocationFailure({ 
        error: 'Failed to update technician location' 
      });

      actions$ = of(action);
      technicianService.updateTechnician.and.returnValue(throwError(() => error));

      effects.updateTechnicianLocation$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should handle invalid location coordinates', (done) => {
      const invalidLocation: GeoLocation = {
        latitude: 200, // Invalid latitude
        longitude: -96.7970,
        accuracy: 10
      };
      const action = TechnicianActions.updateTechnicianLocation({ 
        technicianId: mockTechnician.id, 
        location: invalidLocation 
      });
      const error = new Error('Invalid location coordinates');
      const outcome = TechnicianActions.updateTechnicianLocationFailure({ 
        error: 'Invalid location coordinates' 
      });

      actions$ = of(action);
      technicianService.updateTechnician.and.returnValue(throwError(() => error));

      effects.updateTechnicianLocation$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should handle network errors during location update', (done) => {
      const action = TechnicianActions.updateTechnicianLocation({ 
        technicianId: mockTechnician.id, 
        location: mockLocation 
      });
      const error = new Error('Network error');
      const outcome = TechnicianActions.updateTechnicianLocationFailure({ 
        error: 'Network error' 
      });

      actions$ = of(action);
      technicianService.updateTechnician.and.returnValue(throwError(() => error));

      effects.updateTechnicianLocation$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('logErrors$', () => {
    it('should log errors without dispatching actions', (done) => {
      spyOn(console, 'error');
      const error = 'Test error message';
      const action = TechnicianActions.loadTechniciansFailure({ error });

      actions$ = of(action);

      effects.logErrors$.subscribe(() => {
        expect(console.error).toHaveBeenCalledWith('Technician Effect Error:', error);
        done();
      });
    });

    it('should log create errors', (done) => {
      spyOn(console, 'error');
      const error = 'Create error';
      const action = TechnicianActions.createTechnicianFailure({ error });

      actions$ = of(action);

      effects.logErrors$.subscribe(() => {
        expect(console.error).toHaveBeenCalledWith('Technician Effect Error:', error);
        done();
      });
    });

    it('should log update errors', (done) => {
      spyOn(console, 'error');
      const error = 'Update error';
      const action = TechnicianActions.updateTechnicianFailure({ error });

      actions$ = of(action);

      effects.logErrors$.subscribe(() => {
        expect(console.error).toHaveBeenCalledWith('Technician Effect Error:', error);
        done();
      });
    });

    it('should log delete errors', (done) => {
      spyOn(console, 'error');
      const error = 'Delete error';
      const action = TechnicianActions.deleteTechnicianFailure({ error });

      actions$ = of(action);

      effects.logErrors$.subscribe(() => {
        expect(console.error).toHaveBeenCalledWith('Technician Effect Error:', error);
        done();
      });
    });

    it('should log location update errors', (done) => {
      spyOn(console, 'error');
      const error = 'Location update error';
      const action = TechnicianActions.updateTechnicianLocationFailure({ error });

      actions$ = of(action);

      effects.logErrors$.subscribe(() => {
        expect(console.error).toHaveBeenCalledWith('Technician Effect Error:', error);
        done();
      });
    });
  });
});
