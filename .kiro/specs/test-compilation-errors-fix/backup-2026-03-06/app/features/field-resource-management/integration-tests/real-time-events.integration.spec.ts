/**
 * Real-time Events Integration Tests
 * Tests the integration between SignalR service and NgRx store for real-time event handling
 */

import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { FrmSignalRService, ConnectionStatus, LocationUpdate, JobStatusUpdate, Reassignment } from '../services/frm-signalr.service';
import { Assignment, AssignmentStatus } from '../models/assignment.model';
import { Job, JobStatus, JobType, Priority } from '../models/job.model';
import { Notification, NotificationType } from '../models/notification.model';
import { GeoLocation } from '../models/time-entry.model';
import * as TechnicianActions from '../state/technicians/technician.actions';
import * as JobActions from '../state/jobs/job.actions';
import * as AssignmentActions from '../state/assignments/assignment.actions';
import * as CrewActions from '../state/crews/crew.actions';
import * as NotificationActions from '../state/notifications/notification.actions';
import * as UIActions from '../state/ui/ui.actions';
import { take } from 'rxjs/operators';

describe('Real-time Events Integration Tests', () => {
  let service: FrmSignalRService;
  let store: MockStore;
  let mockHubConnection: jasmine.SpyObj<HubConnection>;
  let eventHandlers: Map<string, Function>;
  let dispatchSpy: jasmine.Spy;

  const initialState = {
    technicians: { entities: {}, ids: [], loading: false, error: null },
    jobs: { entities: {}, ids: [], loading: false, error: null },
    assignments: { entities: {}, ids: [], loading: false, error: null, conflicts: [] },
    crews: { entities: {}, ids: [], loading: false, error: null },
    notifications: { entities: {}, ids: [], unreadCount: 0 },
    ui: { connectionStatus: ConnectionStatus.Disconnected }
  };

  beforeEach(() => {
    eventHandlers = new Map<string, Function>();

    // Create mock hub connection
    mockHubConnection = jasmine.createSpyObj<HubConnection>(
      'HubConnection',
      ['start', 'stop', 'on', 'invoke', 'onclose', 'onreconnecting', 'onreconnected']
    );

    // Mock the 'on' method to capture event handlers
    mockHubConnection.on.and.callFake((eventName: string, handler: Function) => {
      eventHandlers.set(eventName, handler);
      return mockHubConnection;
    });

    mockHubConnection.start.and.returnValue(Promise.resolve());
    mockHubConnection.stop.and.returnValue(Promise.resolve());
    mockHubConnection.invoke.and.returnValue(Promise.resolve());

    // Spy on HubConnectionBuilder
    spyOn(HubConnectionBuilder.prototype, 'withUrl').and.returnValue(
      HubConnectionBuilder.prototype
    );
    spyOn(HubConnectionBuilder.prototype, 'withAutomaticReconnect').and.returnValue(
      HubConnectionBuilder.prototype
    );
    spyOn(HubConnectionBuilder.prototype, 'configureLogging').and.returnValue(
      HubConnectionBuilder.prototype
    );
    spyOn(HubConnectionBuilder.prototype, 'build').and.returnValue(mockHubConnection);

    TestBed.configureTestingModule({
      providers: [
        FrmSignalRService,
        provideMockStore({ initialState })
      ]
    });

    service = TestBed.inject(FrmSignalRService);
    store = TestBed.inject(MockStore);
    dispatchSpy = spyOn(store, 'dispatch');
  });

  afterEach(() => {
    eventHandlers.clear();
  });

  describe('Connection Management Integration', () => {
    it('should establish connection and update UI state', fakeAsync(async () => {
      await service.connect();
      tick();

      expect(mockHubConnection.start).toHaveBeenCalled();
      expect(service.getConnectionStatus()).toBe(ConnectionStatus.Connected);
      expect(dispatchSpy).toHaveBeenCalledWith(UIActions.connectionEstablished());
    }));

    it('should handle connection loss and dispatch UI action', fakeAsync(() => {
      service.connect();
      tick();

      const onCloseHandler = mockHubConnection.onclose.calls.mostRecent().args[0];
      onCloseHandler(new Error('Connection lost'));
      tick();

      expect(service.getConnectionStatus()).toBe(ConnectionStatus.Disconnected);
      expect(dispatchSpy).toHaveBeenCalledWith(
        UIActions.connectionLost({ error: 'Connection lost' })
      );
    }));

    it('should handle reconnection and resubscribe to technicians', fakeAsync(async () => {
      await service.connect();
      tick();

      service.subscribeToTechnicianUpdates('tech-123');
      tick();

      const onReconnectedHandler = mockHubConnection.onreconnected.calls.mostRecent().args[0];
      onReconnectedHandler('new-connection-id');
      tick();

      expect(service.getConnectionStatus()).toBe(ConnectionStatus.Connected);
      expect(dispatchSpy).toHaveBeenCalledWith(UIActions.connectionEstablished());
      expect(dispatchSpy).toHaveBeenCalledWith({ type: '[SignalR] Reconnected' });
      
      expect(mockHubConnection.invoke).toHaveBeenCalledWith(
        'SubscribeToTechnicianUpdates',
        'tech-123'
      );
    }));
  });

  describe('Location Update Event Integration', () => {
    beforeEach(fakeAsync(async () => {
      await service.connect();
      tick();
      dispatchSpy.calls.reset();
    }));

    it('should receive location update and dispatch to store', fakeAsync(() => {
      const locationUpdate: LocationUpdate = {
        technicianId: 'tech-123',
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10
        },
        timestamp: new Date()
      };

      const handler = eventHandlers.get('LocationUpdate');
      expect(handler).toBeDefined();
      handler!(locationUpdate);
      tick();

      expect(dispatchSpy).toHaveBeenCalledWith(
        TechnicianActions.updateTechnicianLocationSuccess({
          technicianId: locationUpdate.technicianId,
          location: locationUpdate.location
        })
      );
    }));

    it('should emit location update through observable', fakeAsync(() => {
      const locationUpdate: LocationUpdate = {
        technicianId: 'tech-456',
        location: {
          latitude: 34.0522,
          longitude: -118.2437,
          accuracy: 15
        },
        timestamp: new Date()
      };

      let receivedUpdate: LocationUpdate | null = null;
      service.locationUpdate$.pipe(take(2)).subscribe(update => {
        receivedUpdate = update;
      });

      const handler = eventHandlers.get('LocationUpdate');
      handler!(locationUpdate);
      tick();

      expect(receivedUpdate).toBeTruthy();
      expect(receivedUpdate?.technicianId).toBe(locationUpdate.technicianId);
    }));

    it('should reject invalid location coordinates', fakeAsync(() => {
      const invalidUpdate: LocationUpdate = {
        technicianId: 'tech-789',
        location: {
          latitude: 91, // Invalid: > 90
          longitude: -74.0060,
          accuracy: 10
        },
        timestamp: new Date()
      };

      const handler = eventHandlers.get('LocationUpdate');
      handler!(invalidUpdate);
      tick();

      expect(dispatchSpy).not.toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: TechnicianActions.updateTechnicianLocationSuccess.type
        })
      );
    }));
  });

  describe('Assignment Created Event Integration', () => {
    beforeEach(fakeAsync(async () => {
      await service.connect();
      tick();
      dispatchSpy.calls.reset();
    }));

    it('should receive assignment created and dispatch to store', fakeAsync(() => {
      const assignment: Assignment = {
        id: 'assign-123',
        jobId: 'job-456',
        technicianId: 'tech-789',
        assignedBy: 'cm-001',
        assignedAt: new Date(),
        status: AssignmentStatus.Assigned,
        isActive: true
      };

      const handler = eventHandlers.get('AssignmentCreated');
      expect(handler).toBeDefined();
      handler!(assignment);
      tick();

      expect(dispatchSpy).toHaveBeenCalledWith(
        AssignmentActions.assignTechnicianSuccess({ assignment })
      );

      expect(dispatchSpy).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: NotificationActions.addNotification.type
        })
      );
    }));

    it('should emit assignment through observable', fakeAsync(() => {
      const assignment: Assignment = {
        id: 'assign-456',
        jobId: 'job-789',
        technicianId: 'tech-012',
        assignedBy: 'cm-002',
        assignedAt: new Date(),
        status: AssignmentStatus.Assigned,
        isActive: true
      };

      let receivedAssignment: Assignment | null = null;
      service.jobAssigned$.pipe(take(2)).subscribe(a => {
        receivedAssignment = a;
      });

      const handler = eventHandlers.get('AssignmentCreated');
      handler!(assignment);
      tick();

      expect(receivedAssignment).toBeTruthy();
      expect(receivedAssignment?.id).toBe(assignment.id);
    }));
  });

  describe('Assignment Status Changed Event Integration', () => {
    beforeEach(fakeAsync(async () => {
      await service.connect();
      tick();
      dispatchSpy.calls.reset();
    }));

    it('should receive assignment status change and dispatch to store', fakeAsync(() => {
      const assignment: Assignment = {
        id: 'assign-123',
        jobId: 'job-456',
        technicianId: 'tech-789',
        assignedBy: 'cm-001',
        assignedAt: new Date(),
        status: AssignmentStatus.Accepted,
        isActive: true
      };

      const handler = eventHandlers.get('AssignmentStatusChanged');
      expect(handler).toBeDefined();
      handler!(assignment);
      tick();

      expect(dispatchSpy).toHaveBeenCalledWith(
        AssignmentActions.updateAssignmentSuccess({ assignment })
      );
    }));

    it('should reject assignment with invalid status', fakeAsync(() => {
      const invalidAssignment = {
        id: 'assign-456',
        jobId: 'job-789',
        technicianId: 'tech-012',
        assignedBy: 'cm-002',
        assignedAt: new Date(),
        status: 'INVALID_STATUS',
        isActive: true
      };

      const handler = eventHandlers.get('AssignmentStatusChanged');
      handler!(invalidAssignment);
      tick();

      expect(dispatchSpy).not.toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: AssignmentActions.updateAssignmentSuccess.type
        })
      );
    }));
  });

  describe('Job Status Changed Event Integration', () => {
    beforeEach(fakeAsync(async () => {
      await service.connect();
      tick();
      dispatchSpy.calls.reset();
    }));

    it('should receive job status change and dispatch to store', fakeAsync(() => {
      const job: Job = {
        id: 'job-123',
        jobId: 'J-001',
        client: 'Test Client',
        siteName: 'Test Site',
        siteAddress: {
          street: '123 Main St',
          city: 'Dallas',
          state: 'TX',
          zipCode: '75201'
        },
        jobType: JobType.Install,
        priority: Priority.P1,
        status: JobStatus.OnSite,
        scopeDescription: 'Install equipment',
        requiredSkills: [],
        requiredCrewSize: 2,
        estimatedLaborHours: 4,
        scheduledStartDate: new Date(),
        scheduledEndDate: new Date(),
        attachments: [],
        notes: [],
        market: 'DALLAS',
        company: 'ACME_CORP',
        createdBy: 'cm-001',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const update: JobStatusUpdate = { job };

      const handler = eventHandlers.get('JobStatusChanged');
      expect(handler).toBeDefined();
      handler!(update);
      tick();

      expect(dispatchSpy).toHaveBeenCalledWith(
        JobActions.updateJobStatusSuccess({ job })
      );
    }));
  });

  describe('Job Reassigned Event Integration', () => {
    beforeEach(fakeAsync(async () => {
      await service.connect();
      tick();
      dispatchSpy.calls.reset();
    }));

    it('should receive job reassignment and reload assignments', fakeAsync(() => {
      const reassignment: Reassignment = {
        jobId: 'job-123',
        fromTechnicianId: 'tech-456',
        toTechnicianId: 'tech-789',
        reassignedBy: 'cm-001',
        reassignedAt: new Date(),
        reason: 'Skill mismatch'
      };

      const handler = eventHandlers.get('JobReassigned');
      expect(handler).toBeDefined();
      handler!(reassignment);
      tick();

      expect(dispatchSpy).toHaveBeenCalledWith(
        AssignmentActions.loadAssignments({
          filters: { jobId: reassignment.jobId }
        })
      );
    }));
  });

  describe('Notification Event Integration', () => {
    beforeEach(fakeAsync(async () => {
      await service.connect();
      tick();
      dispatchSpy.calls.reset();
    }));

    it('should receive notification and dispatch to store', fakeAsync(() => {
      const notification: Notification = {
        id: 'notif-123',
        type: NotificationType.JobAssignment,
        message: 'You have been assigned to a new job',
        isRead: false,
        createdAt: new Date(),
        timestamp: new Date(),
        userId: 'tech-123',
        relatedEntityId: 'job-456',
        relatedEntityType: 'job'
      };

      const handler = eventHandlers.get('Notification');
      expect(handler).toBeDefined();
      handler!(notification);
      tick();

      expect(dispatchSpy).toHaveBeenCalledWith(
        NotificationActions.addNotification({ notification })
      );
    }));
  });

  describe('Crew Location Update Event Integration', () => {
    beforeEach(fakeAsync(async () => {
      await service.connect();
      tick();
      dispatchSpy.calls.reset();
    }));

    it('should receive crew location update and dispatch to store', fakeAsync(() => {
      const update = {
        crewId: 'crew-123',
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10
        },
        timestamp: new Date()
      };

      const handler = eventHandlers.get('CrewLocationUpdate');
      expect(handler).toBeDefined();
      handler!(update);
      tick();

      expect(dispatchSpy).toHaveBeenCalledWith(
        CrewActions.updateCrewLocationSuccess({
          crewId: update.crewId,
          location: update.location
        })
      );
    }));

    it('should reject crew location update with invalid coordinates', fakeAsync(() => {
      const invalidUpdate = {
        crewId: 'crew-456',
        location: {
          latitude: -91, // Invalid: < -90
          longitude: -74.0060,
          accuracy: 10
        },
        timestamp: new Date()
      };

      const handler = eventHandlers.get('CrewLocationUpdate');
      handler!(invalidUpdate);
      tick();

      expect(dispatchSpy).not.toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: CrewActions.updateCrewLocationSuccess.type
        })
      );
    }));
  });

  describe('Multiple Event Handling Integration', () => {
    beforeEach(fakeAsync(async () => {
      await service.connect();
      tick();
      dispatchSpy.calls.reset();
    }));

    it('should handle multiple events in sequence', fakeAsync(() => {
      // Event 1: Location update
      const locationUpdate: LocationUpdate = {
        technicianId: 'tech-123',
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10
        },
        timestamp: new Date()
      };

      const locationHandler = eventHandlers.get('LocationUpdate');
      locationHandler!(locationUpdate);
      tick();

      // Event 2: Assignment created
      const assignment: Assignment = {
        id: 'assign-123',
        jobId: 'job-456',
        technicianId: 'tech-123',
        assignedBy: 'cm-001',
        assignedAt: new Date(),
        status: AssignmentStatus.Assigned,
        isActive: true
      };

      const assignmentHandler = eventHandlers.get('AssignmentCreated');
      assignmentHandler!(assignment);
      tick();

      expect(dispatchSpy).toHaveBeenCalledWith(
        TechnicianActions.updateTechnicianLocationSuccess({
          technicianId: locationUpdate.technicianId,
          location: locationUpdate.location
        })
      );

      expect(dispatchSpy).toHaveBeenCalledWith(
        AssignmentActions.assignTechnicianSuccess({ assignment })
      );

      expect(dispatchSpy.calls.count()).toBeGreaterThanOrEqual(3);
    }));
  });

  describe('Disconnection and Cleanup Integration', () => {
    it('should clear event subjects on disconnect', fakeAsync(async () => {
      await service.connect();
      tick();

      const locationUpdate: LocationUpdate = {
        technicianId: 'tech-123',
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10
        },
        timestamp: new Date()
      };

      const handler = eventHandlers.get('LocationUpdate');
      handler!(locationUpdate);
      tick();

      await service.disconnect();
      tick();

      let lastLocationUpdate: LocationUpdate | null = undefined!;
      service.locationUpdate$.pipe(take(1)).subscribe(update => {
        lastLocationUpdate = update;
      });
      tick();

      expect(lastLocationUpdate).toBeNull();
    }));
  });
});
