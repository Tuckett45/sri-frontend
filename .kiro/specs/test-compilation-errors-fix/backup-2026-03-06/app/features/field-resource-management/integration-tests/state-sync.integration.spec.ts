/**
 * State Synchronization Integration Tests
 * Tests the integration between SignalR reconnection and NgRx state synchronization
 * Validates that state is properly synced after connection loss and recovery
 */

import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { FrmSignalRService, ConnectionStatus, LocationUpdate } from '../services/frm-signalr.service';
import { Assignment, AssignmentStatus } from '../models/assignment.model';
import { Job, JobStatus, JobType, Priority } from '../models/job.model';
import { GeoLocation } from '../models/time-entry.model';
import * as TechnicianActions from '../state/technicians/technician.actions';
import * as JobActions from '../state/jobs/job.actions';
import * as AssignmentActions from '../state/assignments/assignment.actions';
import * as CrewActions from '../state/crews/crew.actions';
import * as UIActions from '../state/ui/ui.actions';
import { take } from 'rxjs/operators';

describe('State Synchronization Integration Tests', () => {
  let service: FrmSignalRService;
  let store: MockStore;
  let mockHubConnection: jasmine.SpyObj<HubConnection>;
  let eventHandlers: Map<string, Function>;
  let dispatchSpy: jasmine.Spy;
  let onCloseCallback: ((error?: Error) => void) | null;
  let onReconnectedCallback: ((connectionId?: string) => void) | null;
  let onReconnectingCallback: ((error?: Error) => void) | null;

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
    onCloseCallback = null;
    onReconnectedCallback = null;
    onReconnectingCallback = null;

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

    // Mock lifecycle callbacks
    mockHubConnection.onclose.and.callFake((callback: (error?: Error) => void) => {
      onCloseCallback = callback;
      return mockHubConnection;
    });

    mockHubConnection.onreconnected.and.callFake((callback: (connectionId?: string) => void) => {
      onReconnectedCallback = callback;
      return mockHubConnection;
    });

    mockHubConnection.onreconnecting.and.callFake((callback: (error?: Error) => void) => {
      onReconnectingCallback = callback;
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
    onCloseCallback = null;
    onReconnectedCallback = null;
    onReconnectingCallback = null;
  });

  describe('Full State Reload After Reconnection', () => {
    it('should reload all entities after reconnection', fakeAsync(async () => {
      // Connect initially
      await service.connect();
      tick();
      dispatchSpy.calls.reset();

      // Simulate reconnection
      if (onReconnectedCallback) {
        onReconnectedCallback('new-connection-id');
      }
      tick();

      // Verify all entity types are reloaded
      expect(dispatchSpy).toHaveBeenCalledWith(
        TechnicianActions.loadTechnicians({ filters: {} })
      );
      expect(dispatchSpy).toHaveBeenCalledWith(
        JobActions.loadJobs({ filters: {} })
      );
      expect(dispatchSpy).toHaveBeenCalledWith(
        AssignmentActions.loadAssignments({ filters: {} })
      );
      expect(dispatchSpy).toHaveBeenCalledWith(
        CrewActions.loadCrews({ filters: {} })
      );
    }));

    it('should dispatch reconnected action to store', fakeAsync(async () => {
      await service.connect();
      tick();
      dispatchSpy.calls.reset();

      if (onReconnectedCallback) {
        onReconnectedCallback('new-connection-id');
      }
      tick();

      expect(dispatchSpy).toHaveBeenCalledWith({ type: '[SignalR] Reconnected' });
    }));

    it('should update connection status to connected', fakeAsync(async () => {
      await service.connect();
      tick();

      // Simulate disconnection
      if (onCloseCallback) {
        onCloseCallback(new Error('Connection lost'));
      }
      tick();

      expect(service.getConnectionStatus()).toBe(ConnectionStatus.Disconnected);

      // Simulate reconnection
      if (onReconnectedCallback) {
        onReconnectedCallback('new-connection-id');
      }
      tick();

      expect(service.getConnectionStatus()).toBe(ConnectionStatus.Connected);
    }));
  });

  describe('Missed Events Recovery', () => {
    it('should request missed events when last event timestamp exists', fakeAsync(async () => {
      // Enable missed event recovery
      service.setMissedEventRecoveryEnabled(true);

      // Connect and receive an event to set last timestamp
      await service.connect();
      tick();

      const locationUpdate: LocationUpdate = {
        technicianId: 'tech-123',
        location: { latitude: 40.7128, longitude: -74.0060, accuracy: 10 },
        timestamp: new Date('2024-01-01T10:00:00Z')
      };

      const handler = eventHandlers.get('LocationUpdate');
      handler!(locationUpdate);
      tick();

      expect(service.getLastEventTimestamp()).toBeTruthy();

      // Simulate disconnection and reconnection
      if (onCloseCallback) {
        onCloseCallback(new Error('Connection lost'));
      }
      tick();

      dispatchSpy.calls.reset();

      if (onReconnectedCallback) {
        onReconnectedCallback('new-connection-id');
      }
      tick();

      // Verify event sync was requested
      expect(mockHubConnection.invoke).toHaveBeenCalledWith(
        'RequestEventSync',
        jasmine.any(Date)
      );
    }));

    it('should process missed location update events', fakeAsync(async () => {
      await service.connect();
      tick();
      dispatchSpy.calls.reset();

      const missedEvents = [
        {
          type: 'LocationUpdate',
          timestamp: new Date('2024-01-01T10:05:00Z'),
          data: {
            technicianId: 'tech-456',
            location: { latitude: 34.0522, longitude: -118.2437, accuracy: 15 }
          }
        }
      ];

      const syncResponse = {
        events: missedEvents,
        fromTimestamp: new Date('2024-01-01T10:00:00Z'),
        toTimestamp: new Date('2024-01-01T10:05:00Z'),
        eventCount: 1
      };

      const handler = eventHandlers.get('EventSyncResponse');
      expect(handler).toBeDefined();
      handler!(syncResponse);
      tick();

      expect(dispatchSpy).toHaveBeenCalledWith(
        TechnicianActions.updateTechnicianLocationSuccess({
          technicianId: 'tech-456',
          location: { latitude: 34.0522, longitude: -118.2437, accuracy: 15 }
        })
      );
    }));

    it('should process missed assignment created events', fakeAsync(async () => {
      await service.connect();
      tick();
      dispatchSpy.calls.reset();

      const missedAssignment: Assignment = {
        id: 'assign-789',
        jobId: 'job-012',
        technicianId: 'tech-345',
        assignedBy: 'cm-001',
        assignedAt: new Date('2024-01-01T10:05:00Z'),
        status: AssignmentStatus.Assigned,
        isActive: true
      };

      const syncResponse = {
        events: [
          {
            type: 'AssignmentCreated',
            timestamp: new Date('2024-01-01T10:05:00Z'),
            data: missedAssignment
          }
        ],
        fromTimestamp: new Date('2024-01-01T10:00:00Z'),
        toTimestamp: new Date('2024-01-01T10:05:00Z'),
        eventCount: 1
      };

      const handler = eventHandlers.get('EventSyncResponse');
      handler!(syncResponse);
      tick();

      expect(dispatchSpy).toHaveBeenCalledWith(
        AssignmentActions.assignTechnicianSuccess({ assignment: missedAssignment })
      );
    }));

    it('should process missed job status changed events', fakeAsync(async () => {
      await service.connect();
      tick();
      dispatchSpy.calls.reset();

      const missedJob: Job = {
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
        status: JobStatus.Completed,
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

      const syncResponse = {
        events: [
          {
            type: 'JobStatusChanged',
            timestamp: new Date('2024-01-01T10:05:00Z'),
            data: { job: missedJob }
          }
        ],
        fromTimestamp: new Date('2024-01-01T10:00:00Z'),
        toTimestamp: new Date('2024-01-01T10:05:00Z'),
        eventCount: 1
      };

      const handler = eventHandlers.get('EventSyncResponse');
      handler!(syncResponse);
      tick();

      expect(dispatchSpy).toHaveBeenCalledWith(
        JobActions.updateJobStatusSuccess({ job: missedJob })
      );
    }));

    it('should process multiple missed events in order', fakeAsync(async () => {
      await service.connect();
      tick();
      dispatchSpy.calls.reset();

      const syncResponse = {
        events: [
          {
            type: 'LocationUpdate',
            timestamp: new Date('2024-01-01T10:01:00Z'),
            data: {
              technicianId: 'tech-123',
              location: { latitude: 40.7128, longitude: -74.0060, accuracy: 10 }
            }
          },
          {
            type: 'AssignmentCreated',
            timestamp: new Date('2024-01-01T10:02:00Z'),
            data: {
              id: 'assign-456',
              jobId: 'job-789',
              technicianId: 'tech-123',
              assignedBy: 'cm-001',
              assignedAt: new Date('2024-01-01T10:02:00Z'),
              status: AssignmentStatus.Assigned,
              isActive: true
            }
          },
          {
            type: 'AssignmentStatusChanged',
            timestamp: new Date('2024-01-01T10:03:00Z'),
            data: {
              id: 'assign-456',
              jobId: 'job-789',
              technicianId: 'tech-123',
              assignedBy: 'cm-001',
              assignedAt: new Date('2024-01-01T10:02:00Z'),
              status: AssignmentStatus.Accepted,
              isActive: true
            }
          }
        ],
        fromTimestamp: new Date('2024-01-01T10:00:00Z'),
        toTimestamp: new Date('2024-01-01T10:03:00Z'),
        eventCount: 3
      };

      const handler = eventHandlers.get('EventSyncResponse');
      handler!(syncResponse);
      tick();

      // Verify all three events were processed
      expect(dispatchSpy).toHaveBeenCalledWith(
        TechnicianActions.updateTechnicianLocationSuccess(jasmine.any(Object))
      );
      expect(dispatchSpy).toHaveBeenCalledWith(
        AssignmentActions.assignTechnicianSuccess(jasmine.any(Object))
      );
      expect(dispatchSpy).toHaveBeenCalledWith(
        AssignmentActions.updateAssignmentSuccess(jasmine.any(Object))
      );
    }));

    it('should handle empty missed events response', fakeAsync(async () => {
      await service.connect();
      tick();
      dispatchSpy.calls.reset();

      const syncResponse = {
        events: [],
        fromTimestamp: new Date('2024-01-01T10:00:00Z'),
        toTimestamp: new Date('2024-01-01T10:05:00Z'),
        eventCount: 0
      };

      const handler = eventHandlers.get('EventSyncResponse');
      handler!(syncResponse);
      tick();

      // Should not dispatch any entity update actions
      expect(dispatchSpy).not.toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: jasmine.stringMatching(/technician|job|assignment|crew/i)
        })
      );
    }));

    it('should fall back to full reload if missed event recovery fails', fakeAsync(async () => {
      service.setMissedEventRecoveryEnabled(true);

      await service.connect();
      tick();

      // Set a last event timestamp
      const locationUpdate: LocationUpdate = {
        technicianId: 'tech-123',
        location: { latitude: 40.7128, longitude: -74.0060, accuracy: 10 },
        timestamp: new Date('2024-01-01T10:00:00Z')
      };

      const handler = eventHandlers.get('LocationUpdate');
      handler!(locationUpdate);
      tick();

      // Make RequestEventSync fail
      mockHubConnection.invoke.and.callFake((method: string) => {
        if (method === 'RequestEventSync') {
          return Promise.reject(new Error('Event sync failed'));
        }
        return Promise.resolve();
      });

      dispatchSpy.calls.reset();

      // Simulate reconnection
      if (onReconnectedCallback) {
        onReconnectedCallback('new-connection-id');
      }
      tick();
      flush();

      // Should fall back to full reload
      expect(dispatchSpy).toHaveBeenCalledWith(
        TechnicianActions.loadTechnicians({ filters: {} })
      );
      expect(dispatchSpy).toHaveBeenCalledWith(
        JobActions.loadJobs({ filters: {} })
      );
    }));
  });

  describe('Last Event Timestamp Tracking', () => {
    it('should update last event timestamp on location update', fakeAsync(async () => {
      await service.connect();
      tick();

      const timestamp1 = new Date('2024-01-01T10:00:00Z');
      const locationUpdate1: LocationUpdate = {
        technicianId: 'tech-123',
        location: { latitude: 40.7128, longitude: -74.0060, accuracy: 10 },
        timestamp: timestamp1
      };

      const handler = eventHandlers.get('LocationUpdate');
      handler!(locationUpdate1);
      tick();

      expect(service.getLastEventTimestamp()).toEqual(timestamp1);

      // Receive a more recent event
      const timestamp2 = new Date('2024-01-01T10:05:00Z');
      const locationUpdate2: LocationUpdate = {
        technicianId: 'tech-456',
        location: { latitude: 34.0522, longitude: -118.2437, accuracy: 15 },
        timestamp: timestamp2
      };

      handler!(locationUpdate2);
      tick();

      expect(service.getLastEventTimestamp()).toEqual(timestamp2);
    }));

    it('should not update last event timestamp with older events', fakeAsync(async () => {
      await service.connect();
      tick();

      const timestamp1 = new Date('2024-01-01T10:05:00Z');
      const locationUpdate1: LocationUpdate = {
        technicianId: 'tech-123',
        location: { latitude: 40.7128, longitude: -74.0060, accuracy: 10 },
        timestamp: timestamp1
      };

      const handler = eventHandlers.get('LocationUpdate');
      handler!(locationUpdate1);
      tick();

      expect(service.getLastEventTimestamp()).toEqual(timestamp1);

      // Receive an older event
      const timestamp2 = new Date('2024-01-01T10:00:00Z');
      const locationUpdate2: LocationUpdate = {
        technicianId: 'tech-456',
        location: { latitude: 34.0522, longitude: -118.2437, accuracy: 15 },
        timestamp: timestamp2
      };

      handler!(locationUpdate2);
      tick();

      // Should still be the first timestamp
      expect(service.getLastEventTimestamp()).toEqual(timestamp1);
    }));

    it('should track timestamp across different event types', fakeAsync(async () => {
      await service.connect();
      tick();

      // Location update
      const timestamp1 = new Date('2024-01-01T10:00:00Z');
      const locationUpdate: LocationUpdate = {
        technicianId: 'tech-123',
        location: { latitude: 40.7128, longitude: -74.0060, accuracy: 10 },
        timestamp: timestamp1
      };

      const locationHandler = eventHandlers.get('LocationUpdate');
      locationHandler!(locationUpdate);
      tick();

      expect(service.getLastEventTimestamp()).toEqual(timestamp1);

      // Assignment created (more recent)
      const timestamp2 = new Date('2024-01-01T10:05:00Z');
      const assignment: Assignment = {
        id: 'assign-123',
        jobId: 'job-456',
        technicianId: 'tech-789',
        assignedBy: 'cm-001',
        assignedAt: timestamp2,
        status: AssignmentStatus.Assigned,
        isActive: true
      };

      const assignmentHandler = eventHandlers.get('AssignmentCreated');
      assignmentHandler!(assignment);
      tick();

      expect(service.getLastEventTimestamp()).toEqual(timestamp2);
    }));
  });

  describe('Technician Subscription Resubscription', () => {
    it('should resubscribe to technicians after reconnection', fakeAsync(async () => {
      await service.connect();
      tick();

      // Subscribe to technicians
      service.subscribeToTechnicianUpdates('tech-123');
      service.subscribeToTechnicianUpdates('tech-456');
      tick();

      expect(mockHubConnection.invoke).toHaveBeenCalledWith(
        'SubscribeToTechnicianUpdates',
        'tech-123'
      );
      expect(mockHubConnection.invoke).toHaveBeenCalledWith(
        'SubscribeToTechnicianUpdates',
        'tech-456'
      );

      mockHubConnection.invoke.calls.reset();

      // Simulate reconnection
      if (onReconnectedCallback) {
        onReconnectedCallback('new-connection-id');
      }
      tick();

      // Should resubscribe to both technicians
      expect(mockHubConnection.invoke).toHaveBeenCalledWith(
        'SubscribeToTechnicianUpdates',
        'tech-123'
      );
      expect(mockHubConnection.invoke).toHaveBeenCalledWith(
        'SubscribeToTechnicianUpdates',
        'tech-456'
      );
    }));

    it('should not resubscribe if no technicians were subscribed', fakeAsync(async () => {
      await service.connect();
      tick();

      mockHubConnection.invoke.calls.reset();

      // Simulate reconnection without any subscriptions
      if (onReconnectedCallback) {
        onReconnectedCallback('new-connection-id');
      }
      tick();

      // Should not call SubscribeToTechnicianUpdates
      const subscribeCall = mockHubConnection.invoke.calls.all().find(
        call => call.args[0] === 'SubscribeToTechnicianUpdates'
      );
      expect(subscribeCall).toBeUndefined();
    }));
  });

  describe('Connection Status During Sync', () => {
    it('should maintain connected status during state sync', fakeAsync(async () => {
      await service.connect();
      tick();

      expect(service.getConnectionStatus()).toBe(ConnectionStatus.Connected);

      // Simulate reconnection
      if (onReconnectedCallback) {
        onReconnectedCallback('new-connection-id');
      }
      tick();

      // Should still be connected during sync
      expect(service.getConnectionStatus()).toBe(ConnectionStatus.Connected);
    }));

    it('should emit connection status changes through observable', fakeAsync(async () => {
      const statusChanges: ConnectionStatus[] = [];
      service.connectionStatus$.subscribe(status => {
        statusChanges.push(status);
      });

      await service.connect();
      tick();

      // Simulate disconnection
      if (onCloseCallback) {
        onCloseCallback(new Error('Connection lost'));
      }
      tick();

      // Simulate reconnection
      if (onReconnectedCallback) {
        onReconnectedCallback('new-connection-id');
      }
      tick();

      expect(statusChanges).toContain(ConnectionStatus.Disconnected);
      expect(statusChanges).toContain(ConnectionStatus.Connected);
      expect(statusChanges[statusChanges.length - 1]).toBe(ConnectionStatus.Connected);
    }));
  });

  describe('Manual Missed Event Recovery', () => {
    it('should allow manual trigger of missed event recovery', fakeAsync(async () => {
      await service.connect();
      tick();

      const fromTimestamp = new Date('2024-01-01T10:00:00Z');

      await service.triggerMissedEventRecovery(fromTimestamp);
      tick();

      expect(mockHubConnection.invoke).toHaveBeenCalledWith(
        'RequestEventSync',
        fromTimestamp
      );
    }));

    it('should throw error if not connected when triggering recovery', fakeAsync(async () => {
      const fromTimestamp = new Date('2024-01-01T10:00:00Z');

      let error: Error | null = null;
      try {
        await service.triggerMissedEventRecovery(fromTimestamp);
      } catch (e) {
        error = e as Error;
      }

      expect(error).toBeTruthy();
      expect(error?.message).toContain('not connected');
    }));
  });

  describe('Missed Event Recovery Toggle', () => {
    it('should perform full reload when missed event recovery is disabled', fakeAsync(async () => {
      service.setMissedEventRecoveryEnabled(false);

      await service.connect();
      tick();

      // Set a last event timestamp
      const locationUpdate: LocationUpdate = {
        technicianId: 'tech-123',
        location: { latitude: 40.7128, longitude: -74.0060, accuracy: 10 },
        timestamp: new Date('2024-01-01T10:00:00Z')
      };

      const handler = eventHandlers.get('LocationUpdate');
      handler!(locationUpdate);
      tick();

      dispatchSpy.calls.reset();

      // Simulate reconnection
      if (onReconnectedCallback) {
        onReconnectedCallback('new-connection-id');
      }
      tick();

      // Should NOT request event sync
      const syncCall = mockHubConnection.invoke.calls.all().find(
        call => call.args[0] === 'RequestEventSync'
      );
      expect(syncCall).toBeUndefined();

      // Should perform full reload instead
      expect(dispatchSpy).toHaveBeenCalledWith(
        TechnicianActions.loadTechnicians({ filters: {} })
      );
    }));

    it('should request event sync when recovery is enabled', fakeAsync(async () => {
      service.setMissedEventRecoveryEnabled(true);

      await service.connect();
      tick();

      // Set a last event timestamp
      const locationUpdate: LocationUpdate = {
        technicianId: 'tech-123',
        location: { latitude: 40.7128, longitude: -74.0060, accuracy: 10 },
        timestamp: new Date('2024-01-01T10:00:00Z')
      };

      const handler = eventHandlers.get('LocationUpdate');
      handler!(locationUpdate);
      tick();

      // Simulate reconnection
      if (onReconnectedCallback) {
        onReconnectedCallback('new-connection-id');
      }
      tick();

      // Should request event sync
      expect(mockHubConnection.invoke).toHaveBeenCalledWith(
        'RequestEventSync',
        jasmine.any(Date)
      );
    }));
  });

  describe('UI State Integration During Sync', () => {
    it('should dispatch connection established action on reconnection', fakeAsync(async () => {
      await service.connect();
      tick();
      dispatchSpy.calls.reset();

      if (onReconnectedCallback) {
        onReconnectedCallback('new-connection-id');
      }
      tick();

      expect(dispatchSpy).toHaveBeenCalledWith(UIActions.connectionEstablished());
    }));

    it('should dispatch reconnecting action during reconnection attempt', fakeAsync(async () => {
      await service.connect();
      tick();
      dispatchSpy.calls.reset();

      if (onReconnectingCallback) {
        onReconnectingCallback(new Error('Reconnecting'));
      }
      tick();

      expect(dispatchSpy).toHaveBeenCalledWith(
        UIActions.reconnecting({ attempt: jasmine.any(Number) })
      );
    }));
  });

  describe('Crew Location Updates During Sync', () => {
    it('should process missed crew location updates', fakeAsync(async () => {
      await service.connect();
      tick();
      dispatchSpy.calls.reset();

      const syncResponse = {
        events: [
          {
            type: 'CrewLocationUpdate',
            timestamp: new Date('2024-01-01T10:05:00Z'),
            data: {
              crewId: 'crew-123',
              location: { latitude: 40.7128, longitude: -74.0060, accuracy: 10 }
            }
          }
        ],
        fromTimestamp: new Date('2024-01-01T10:00:00Z'),
        toTimestamp: new Date('2024-01-01T10:05:00Z'),
        eventCount: 1
      };

      const handler = eventHandlers.get('EventSyncResponse');
      handler!(syncResponse);
      tick();

      expect(dispatchSpy).toHaveBeenCalledWith(
        CrewActions.updateCrewLocationSuccess({
          crewId: 'crew-123',
          location: { latitude: 40.7128, longitude: -74.0060, accuracy: 10 }
        })
      );
    }));
  });
});
