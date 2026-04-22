/**
 * Crew Effects Unit Tests
 * Tests all effects for crew state management
 */

import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of, throwError } from 'rxjs';
import { CrewEffects } from './crew.effects';
import { CrewService } from '../../services/crew.service';
import * as CrewActions from './crew.actions';
import { Crew, CrewStatus } from '../../models/crew.model';
import { GeoLocation } from '../../models/time-entry.model';

describe('CrewEffects', () => {
  let actions$: Observable<any>;
  let effects: CrewEffects;
  let crewService: jasmine.SpyObj<CrewService>;

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
    createdAt: new Date(),    updatedAt: new Date()
  };

  const mockLocation: GeoLocation = {
    latitude: 30.2672,
    longitude: -97.7431,
    accuracy: 15
  };

  beforeEach(() => {
    const crewServiceSpy = jasmine.createSpyObj('CrewService', [
      'getCrews',
      'createCrew',
      'updateCrew',
      'deleteCrew',
      'updateCrewLocation',
      'assignJobToCrew',
      'unassignJobFromCrew',
      'addCrewMember',
      'removeCrewMember'
    ]);

    TestBed.configureTestingModule({
      providers: [
        CrewEffects,
        provideMockActions(() => actions$),
        { provide: CrewService, useValue: crewServiceSpy }
      ]
    });

    effects = TestBed.inject(CrewEffects);
    crewService = TestBed.inject(CrewService) as jasmine.SpyObj<CrewService>;
  });

  describe('loadCrews$', () => {
    it('should return loadCrewsSuccess action on successful load', (done) => {
      const crews = [mockCrew];
      const filters = { market: 'DALLAS' };
      const action = CrewActions.loadCrews({ filters });
      const outcome = CrewActions.loadCrewsSuccess({ crews });

      actions$ = of(action);
      crewService.getCrews.and.returnValue(of(crews));

      effects.loadCrews$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(crewService.getCrews).toHaveBeenCalledWith(filters);
        done();
      });
    });

    it('should return loadCrewsFailure action on error', (done) => {
      const filters = { market: 'DALLAS' };
      const action = CrewActions.loadCrews({ filters });
      const error = new Error('Failed to load crews');
      const outcome = CrewActions.loadCrewsFailure({ 
        error: 'Failed to load crews' 
      });

      actions$ = of(action);
      crewService.getCrews.and.returnValue(throwError(() => error));

      effects.loadCrews$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(crewService.getCrews).toHaveBeenCalledWith(filters);
        done();
      });
    });

    it('should handle load without filters', (done) => {
      const crews = [mockCrew];
      const action = CrewActions.loadCrews({ filters: undefined });
      const outcome = CrewActions.loadCrewsSuccess({ crews });

      actions$ = of(action);
      crewService.getCrews.and.returnValue(of(crews));

      effects.loadCrews$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(crewService.getCrews).toHaveBeenCalledWith(undefined);
        done();
      });
    });

    it('should handle empty crew list', (done) => {
      const crews: Crew[] = [];
      const action = CrewActions.loadCrews({ filters: undefined });
      const outcome = CrewActions.loadCrewsSuccess({ crews });

      actions$ = of(action);
      crewService.getCrews.and.returnValue(of(crews));

      effects.loadCrews$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('createCrew$', () => {
    it('should return createCrewSuccess action on successful creation', (done) => {
      const createDto = {
        name: 'Beta Team',
        leadTechnicianId: 'tech-004',
        memberIds: ['tech-004', 'tech-005'],
        market: 'AUSTIN',
        company: 'ACME_CORP'
      };
      const action = CrewActions.createCrew({ crew: createDto });
      const outcome = CrewActions.createCrewSuccess({ crew: mockCrew });

      actions$ = of(action);
      crewService.createCrew.and.returnValue(of(mockCrew));

      effects.createCrew$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(crewService.createCrew).toHaveBeenCalledWith(createDto);
        done();
      });
    });

    it('should return createCrewFailure action on error', (done) => {
      const createDto = {
        name: 'Beta Team',
        leadTechnicianId: 'tech-004',
        memberIds: ['tech-004', 'tech-005'],
        market: 'AUSTIN',
        company: 'ACME_CORP'
      };
      const action = CrewActions.createCrew({ crew: createDto });
      const error = new Error('Failed to create crew');
      const outcome = CrewActions.createCrewFailure({ 
        error: 'Failed to create crew' 
      });

      actions$ = of(action);
      crewService.createCrew.and.returnValue(throwError(() => error));

      effects.createCrew$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(crewService.createCrew).toHaveBeenCalledWith(createDto);
        done();
      });
    });

    it('should handle validation errors', (done) => {
      const createDto = {
        name: '',
        leadTechnicianId: '',
        memberIds: [],
        market: 'AUSTIN',
        company: 'ACME_CORP'
      };
      const action = CrewActions.createCrew({ crew: createDto });
      const error = new Error('Validation failed');
      const outcome = CrewActions.createCrewFailure({ 
        error: 'Validation failed' 
      });

      actions$ = of(action);
      crewService.createCrew.and.returnValue(throwError(() => error));

      effects.createCrew$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('updateCrew$', () => {
    it('should return updateCrewSuccess action on successful update', (done) => {
      const updateDto = {
        name: 'Updated Team',
        status: CrewStatus.OnJob
      };
      const updatedCrew = { ...mockCrew, ...updateDto };
      const action = CrewActions.updateCrew({ 
        id: mockCrew.id, 
        crew: updateDto 
      });
      const outcome = CrewActions.updateCrewSuccess({ crew: updatedCrew });

      actions$ = of(action);
      crewService.updateCrew.and.returnValue(of(updatedCrew));

      effects.updateCrew$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(crewService.updateCrew).toHaveBeenCalledWith(
          mockCrew.id, 
          updateDto
        );
        done();
      });
    });

    it('should return updateCrewFailure action on error', (done) => {
      const updateDto = {
        name: 'Updated Team'
      };
      const action = CrewActions.updateCrew({ 
        id: mockCrew.id, 
        crew: updateDto 
      });
      const error = new Error('Failed to update crew');
      const outcome = CrewActions.updateCrewFailure({ 
        error: 'Failed to update crew' 
      });

      actions$ = of(action);
      crewService.updateCrew.and.returnValue(throwError(() => error));

      effects.updateCrew$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(crewService.updateCrew).toHaveBeenCalledWith(
          mockCrew.id, 
          updateDto
        );
        done();
      });
    });

    it('should handle permission errors', (done) => {
      const updateDto = {
        name: 'Updated Team'
      };
      const action = CrewActions.updateCrew({ 
        id: mockCrew.id, 
        crew: updateDto 
      });
      const error = new Error('Access denied. You do not have permission to perform this action.');
      const outcome = CrewActions.updateCrewFailure({ 
        error: 'Access denied. You do not have permission to perform this action.' 
      });

      actions$ = of(action);
      crewService.updateCrew.and.returnValue(throwError(() => error));

      effects.updateCrew$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should handle not found errors', (done) => {
      const updateDto = {
        name: 'Updated Team'
      };
      const action = CrewActions.updateCrew({ 
        id: 'non-existent-id', 
        crew: updateDto 
      });
      const error = new Error('Crew not found.');
      const outcome = CrewActions.updateCrewFailure({ 
        error: 'Crew not found.' 
      });

      actions$ = of(action);
      crewService.updateCrew.and.returnValue(throwError(() => error));

      effects.updateCrew$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('deleteCrew$', () => {
    it('should return deleteCrewSuccess action on successful deletion', (done) => {
      const action = CrewActions.deleteCrew({ id: mockCrew.id });
      const outcome = CrewActions.deleteCrewSuccess({ id: mockCrew.id });

      actions$ = of(action);
      crewService.deleteCrew.and.returnValue(of(void 0));

      effects.deleteCrew$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(crewService.deleteCrew).toHaveBeenCalledWith(mockCrew.id);
        done();
      });
    });

    it('should return deleteCrewFailure action on error', (done) => {
      const action = CrewActions.deleteCrew({ id: mockCrew.id });
      const error = new Error('Failed to delete crew');
      const outcome = CrewActions.deleteCrewFailure({ 
        error: 'Failed to delete crew' 
      });

      actions$ = of(action);
      crewService.deleteCrew.and.returnValue(throwError(() => error));

      effects.deleteCrew$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(crewService.deleteCrew).toHaveBeenCalledWith(mockCrew.id);
        done();
      });
    });

    it('should handle permission errors on delete', (done) => {
      const action = CrewActions.deleteCrew({ id: mockCrew.id });
      const error = new Error('Access denied. You do not have permission to perform this action.');
      const outcome = CrewActions.deleteCrewFailure({ 
        error: 'Access denied. You do not have permission to perform this action.' 
      });

      actions$ = of(action);
      crewService.deleteCrew.and.returnValue(throwError(() => error));

      effects.deleteCrew$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('updateCrewLocation$', () => {
    it('should return updateCrewLocationSuccess action on successful location update', (done) => {
      const action = CrewActions.updateCrewLocation({ 
        crewId: mockCrew.id, 
        location: mockLocation 
      });
      const outcome = CrewActions.updateCrewLocationSuccess({ 
        crewId: mockCrew.id, 
        location: mockLocation 
      });

      actions$ = of(action);
      crewService.updateCrewLocation.and.returnValue(of(void 0));

      effects.updateCrewLocation$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(crewService.updateCrewLocation).toHaveBeenCalledWith(
          mockCrew.id,
          mockLocation
        );
        done();
      });
    });

    it('should return updateCrewLocationFailure action on error', (done) => {
      const action = CrewActions.updateCrewLocation({ 
        crewId: mockCrew.id, 
        location: mockLocation 
      });
      const error = new Error('Failed to update crew location');
      const outcome = CrewActions.updateCrewLocationFailure({ 
        error: 'Failed to update crew location' 
      });

      actions$ = of(action);
      crewService.updateCrewLocation.and.returnValue(throwError(() => error));

      effects.updateCrewLocation$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should handle invalid location coordinates', (done) => {
      const invalidLocation: GeoLocation = {
        latitude: 200,
        longitude: -96.7970,
        accuracy: 10
      };
      const action = CrewActions.updateCrewLocation({ 
        crewId: mockCrew.id, 
        location: invalidLocation 
      });
      const error = new Error('Invalid location coordinates');
      const outcome = CrewActions.updateCrewLocationFailure({ 
        error: 'Invalid location coordinates' 
      });

      actions$ = of(action);
      crewService.updateCrewLocation.and.returnValue(throwError(() => error));

      effects.updateCrewLocation$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should handle network errors during location update', (done) => {
      const action = CrewActions.updateCrewLocation({ 
        crewId: mockCrew.id, 
        location: mockLocation 
      });
      const error = new Error('Network error');
      const outcome = CrewActions.updateCrewLocationFailure({ 
        error: 'Network error' 
      });

      actions$ = of(action);
      crewService.updateCrewLocation.and.returnValue(throwError(() => error));

      effects.updateCrewLocation$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('assignJobToCrew$', () => {
    it('should return assignJobToCrewSuccess action on successful assignment', (done) => {
      const jobId = 'job-456';
      const crewWithJob = { ...mockCrew, activeJobId: jobId, status: CrewStatus.OnJob };
      const action = CrewActions.assignJobToCrew({ 
        crewId: mockCrew.id, 
        jobId 
      });
      const outcome = CrewActions.assignJobToCrewSuccess({ crew: crewWithJob });

      actions$ = of(action);
      crewService.assignJobToCrew.and.returnValue(of(crewWithJob));

      effects.assignJobToCrew$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(crewService.assignJobToCrew).toHaveBeenCalledWith(
          mockCrew.id,
          jobId
        );
        done();
      });
    });

    it('should return assignJobToCrewFailure action on error', (done) => {
      const jobId = 'job-456';
      const action = CrewActions.assignJobToCrew({ 
        crewId: mockCrew.id, 
        jobId 
      });
      const error = new Error('Failed to assign job to crew');
      const outcome = CrewActions.assignJobToCrewFailure({ 
        error: 'Failed to assign job to crew' 
      });

      actions$ = of(action);
      crewService.assignJobToCrew.and.returnValue(throwError(() => error));

      effects.assignJobToCrew$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should handle crew already on job error', (done) => {
      const jobId = 'job-456';
      const action = CrewActions.assignJobToCrew({ 
        crewId: mockCrew.id, 
        jobId 
      });
      const error = new Error('Crew is already assigned to another job');
      const outcome = CrewActions.assignJobToCrewFailure({ 
        error: 'Crew is already assigned to another job' 
      });

      actions$ = of(action);
      crewService.assignJobToCrew.and.returnValue(throwError(() => error));

      effects.assignJobToCrew$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('unassignJobFromCrew$', () => {
    it('should return unassignJobFromCrewSuccess action on successful unassignment', (done) => {
      const crewWithoutJob = { ...mockCrew, activeJobId: undefined, status: CrewStatus.Available };
      const action = CrewActions.unassignJobFromCrew({ crewId: mockCrew.id });
      const outcome = CrewActions.unassignJobFromCrewSuccess({ crew: crewWithoutJob });

      actions$ = of(action);
      crewService.unassignJobFromCrew.and.returnValue(of(crewWithoutJob));

      effects.unassignJobFromCrew$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(crewService.unassignJobFromCrew).toHaveBeenCalledWith(mockCrew.id);
        done();
      });
    });

    it('should return unassignJobFromCrewFailure action on error', (done) => {
      const action = CrewActions.unassignJobFromCrew({ crewId: mockCrew.id });
      const error = new Error('Failed to unassign job from crew');
      const outcome = CrewActions.unassignJobFromCrewFailure({ 
        error: 'Failed to unassign job from crew' 
      });

      actions$ = of(action);
      crewService.unassignJobFromCrew.and.returnValue(throwError(() => error));

      effects.unassignJobFromCrew$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('addCrewMember$', () => {
    it('should return addCrewMemberSuccess action on successful addition', (done) => {
      const technicianId = 'tech-006';
      const crewWithNewMember = { 
        ...mockCrew, 
        memberIds: [...mockCrew.memberIds, technicianId] 
      };
      const action = CrewActions.addCrewMember({ 
        crewId: mockCrew.id, 
        technicianId 
      });
      const outcome = CrewActions.addCrewMemberSuccess({ crew: crewWithNewMember });

      actions$ = of(action);
      crewService.addCrewMember.and.returnValue(of(crewWithNewMember));

      effects.addCrewMember$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(crewService.addCrewMember).toHaveBeenCalledWith(
          mockCrew.id,
          technicianId
        );
        done();
      });
    });

    it('should return addCrewMemberFailure action on error', (done) => {
      const technicianId = 'tech-006';
      const action = CrewActions.addCrewMember({ 
        crewId: mockCrew.id, 
        technicianId 
      });
      const error = new Error('Failed to add crew member');
      const outcome = CrewActions.addCrewMemberFailure({ 
        error: 'Failed to add crew member' 
      });

      actions$ = of(action);
      crewService.addCrewMember.and.returnValue(throwError(() => error));

      effects.addCrewMember$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should handle member already in crew error', (done) => {
      const technicianId = 'tech-001';
      const action = CrewActions.addCrewMember({ 
        crewId: mockCrew.id, 
        technicianId 
      });
      const error = new Error('Technician is already a member of this crew');
      const outcome = CrewActions.addCrewMemberFailure({ 
        error: 'Technician is already a member of this crew' 
      });

      actions$ = of(action);
      crewService.addCrewMember.and.returnValue(throwError(() => error));

      effects.addCrewMember$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('removeCrewMember$', () => {
    it('should return removeCrewMemberSuccess action on successful removal', (done) => {
      const technicianId = 'tech-002';
      const crewWithoutMember = { 
        ...mockCrew, 
        memberIds: mockCrew.memberIds.filter(id => id !== technicianId) 
      };
      const action = CrewActions.removeCrewMember({ 
        crewId: mockCrew.id, 
        technicianId 
      });
      const outcome = CrewActions.removeCrewMemberSuccess({ crew: crewWithoutMember });

      actions$ = of(action);
      crewService.removeCrewMember.and.returnValue(of(crewWithoutMember));

      effects.removeCrewMember$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(crewService.removeCrewMember).toHaveBeenCalledWith(
          mockCrew.id,
          technicianId
        );
        done();
      });
    });

    it('should return removeCrewMemberFailure action on error', (done) => {
      const technicianId = 'tech-002';
      const action = CrewActions.removeCrewMember({ 
        crewId: mockCrew.id, 
        technicianId 
      });
      const error = new Error('Failed to remove crew member');
      const outcome = CrewActions.removeCrewMemberFailure({ 
        error: 'Failed to remove crew member' 
      });

      actions$ = of(action);
      crewService.removeCrewMember.and.returnValue(throwError(() => error));

      effects.removeCrewMember$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should handle cannot remove lead technician error', (done) => {
      const technicianId = 'tech-001';
      const action = CrewActions.removeCrewMember({ 
        crewId: mockCrew.id, 
        technicianId 
      });
      const error = new Error('Cannot remove lead technician from crew');
      const outcome = CrewActions.removeCrewMemberFailure({ 
        error: 'Cannot remove lead technician from crew' 
      });

      actions$ = of(action);
      crewService.removeCrewMember.and.returnValue(throwError(() => error));

      effects.removeCrewMember$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('logErrors$', () => {
    it('should log errors without dispatching actions', (done) => {
      spyOn(console, 'error');
      const error = 'Test error message';
      const action = CrewActions.loadCrewsFailure({ error });

      actions$ = of(action);

      effects.logErrors$.subscribe(() => {
        expect(console.error).toHaveBeenCalledWith('Crew Effect Error:', error);
        done();
      });
    });

    it('should log create errors', (done) => {
      spyOn(console, 'error');
      const error = 'Create error';
      const action = CrewActions.createCrewFailure({ error });

      actions$ = of(action);

      effects.logErrors$.subscribe(() => {
        expect(console.error).toHaveBeenCalledWith('Crew Effect Error:', error);
        done();
      });
    });

    it('should log update errors', (done) => {
      spyOn(console, 'error');
      const error = 'Update error';
      const action = CrewActions.updateCrewFailure({ error });

      actions$ = of(action);

      effects.logErrors$.subscribe(() => {
        expect(console.error).toHaveBeenCalledWith('Crew Effect Error:', error);
        done();
      });
    });

    it('should log delete errors', (done) => {
      spyOn(console, 'error');
      const error = 'Delete error';
      const action = CrewActions.deleteCrewFailure({ error });

      actions$ = of(action);

      effects.logErrors$.subscribe(() => {
        expect(console.error).toHaveBeenCalledWith('Crew Effect Error:', error);
        done();
      });
    });

    it('should log location update errors', (done) => {
      spyOn(console, 'error');
      const error = 'Location update error';
      const action = CrewActions.updateCrewLocationFailure({ error });

      actions$ = of(action);

      effects.logErrors$.subscribe(() => {
        expect(console.error).toHaveBeenCalledWith('Crew Effect Error:', error);
        done();
      });
    });

    it('should log job assignment errors', (done) => {
      spyOn(console, 'error');
      const error = 'Job assignment error';
      const action = CrewActions.assignJobToCrewFailure({ error });

      actions$ = of(action);

      effects.logErrors$.subscribe(() => {
        expect(console.error).toHaveBeenCalledWith('Crew Effect Error:', error);
        done();
      });
    });

    it('should log member management errors', (done) => {
      spyOn(console, 'error');
      const error = 'Member management error';
      const action = CrewActions.addCrewMemberFailure({ error });

      actions$ = of(action);

      effects.logErrors$.subscribe(() => {
        expect(console.error).toHaveBeenCalledWith('Crew Effect Error:', error);
        done();
      });
    });
  });
});
