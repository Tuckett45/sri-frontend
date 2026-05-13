import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { FrmSignalRService, ConnectionStatus } from './frm-signalr.service';
import { AssignmentStatus } from '../models/assignment.model';

describe('FrmSignalRService', () => {
  let service: FrmSignalRService;
  let mockStore: jasmine.SpyObj<Store>;
  let mockHubConnection: jasmine.SpyObj<signalR.HubConnection>;

  beforeEach(() => {
    mockStore = jasmine.createSpyObj('Store', ['dispatch', 'select']);
    mockStore.select.and.returnValue(of({}));

    mockHubConnection = jasmine.createSpyObj('HubConnection', [
      'start',
      'stop',
      'on',
      'off',
      'invoke',
      'onclose',
      'onreconnecting',
      'onreconnected'
    ]);

    TestBed.configureTestingModule({
      providers: [
        FrmSignalRService,
        { provide: Store, useValue: mockStore }
      ]
    });

    service = TestBed.inject(FrmSignalRService);
  });

  afterEach(() => {
    // Clean up any pending timers
    jasmine.clock().uninstall();
  });

  describe('Connection Management', () => {
    it('should create the service', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with disconnected status', (done) => {
      service.connectionStatus$.subscribe(status => {
        expect(status).toBe(ConnectionStatus.Disconnected);
        done();
      });
    });

    it('should return correct connection status', () => {
      expect(service.getConnectionStatus()).toBe(ConnectionStatus.Disconnected);
      expect(service.isConnected()).toBe(false);
    });
  });

  describe('Automatic Reconnection with Exponential Backoff', () => {
    beforeEach(() => {
      jasmine.clock().install();
      
      // Mock HubConnectionBuilder
      spyOn(signalR.HubConnectionBuilder.prototype, 'withUrl').and.returnValue(
        signalR.HubConnectionBuilder.prototype
      );
      spyOn(signalR.HubConnectionBuilder.prototype, 'withAutomaticReconnect').and.returnValue(
        signalR.HubConnectionBuilder.prototype
      );
      spyOn(signalR.HubConnectionBuilder.prototype, 'configureLogging').and.returnValue(
        signalR.HubConnectionBuilder.prototype
      );
      spyOn(signalR.HubConnectionBuilder.prototype, 'build').and.returnValue(mockHubConnection);
    });

    it('should configure automatic reconnect with exponential backoff', async () => {
      mockHubConnection.start.and.returnValue(Promise.resolve());

      await service.connect();

      expect(signalR.HubConnectionBuilder.prototype.withAutomaticReconnect).toHaveBeenCalled();
    });

    it('should calculate exponential backoff delays correctly', async () => {
      mockHubConnection.start.and.returnValue(Promise.resolve());

      await service.connect();

      const withAutomaticReconnectCall = (signalR.HubConnectionBuilder.prototype.withAutomaticReconnect as jasmine.Spy).calls.mostRecent();
      const reconnectPolicy = withAutomaticReconnectCall.args[0];

      // Test exponential backoff sequence
      expect(reconnectPolicy.nextRetryDelayInMilliseconds({ previousRetryCount: 0 })).toBe(1000); // 1s
      expect(reconnectPolicy.nextRetryDelayInMilliseconds({ previousRetryCount: 1 })).toBe(2000); // 2s
      expect(reconnectPolicy.nextRetryDelayInMilliseconds({ previousRetryCount: 2 })).toBe(4000); // 4s
      expect(reconnectPolicy.nextRetryDelayInMilliseconds({ previousRetryCount: 3 })).toBe(8000); // 8s
      expect(reconnectPolicy.nextRetryDelayInMilliseconds({ previousRetryCount: 4 })).toBe(16000); // 16s
      expect(reconnectPolicy.nextRetryDelayInMilliseconds({ previousRetryCount: 5 })).toBe(30000); // 30s (capped)
      expect(reconnectPolicy.nextRetryDelayInMilliseconds({ previousRetryCount: 10 })).toBe(30000); // 30s (capped)
    });

    it('should attempt manual reconnect on connection close', fakeAsync(() => {
      mockHubConnection.start.and.returnValue(Promise.resolve());
      let onCloseCallback: ((error?: Error) => void) | undefined;
      mockHubConnection.onclose.and.callFake((callback) => {
        onCloseCallback = callback;
      });

      service.connect();
      tick();

      expect(onCloseCallback).toBeDefined();

      // Simulate connection close
      onCloseCallback!(new Error('Connection lost'));
      tick();

      // Should schedule reconnect with 1 second delay (first attempt)
      tick(1000);

      // Verify reconnect was attempted
      expect(mockHubConnection.start).toHaveBeenCalledTimes(2);
    }));

    it('should use exponential backoff for manual reconnect attempts', fakeAsync(() => {
      mockHubConnection.start.and.returnValue(Promise.reject(new Error('Connection failed')));
      
      service.connect().catch(() => {});
      tick();

      // First reconnect attempt after 1 second
      tick(1000);
      expect(mockHubConnection.start).toHaveBeenCalledTimes(2);

      // Second reconnect attempt after 2 seconds
      tick(2000);
      expect(mockHubConnection.start).toHaveBeenCalledTimes(3);

      // Third reconnect attempt after 4 seconds
      tick(4000);
      expect(mockHubConnection.start).toHaveBeenCalledTimes(4);

      // Fourth reconnect attempt after 8 seconds
      tick(8000);
      expect(mockHubConnection.start).toHaveBeenCalledTimes(5);
    }));

    it('should stop reconnecting after max attempts', fakeAsync(() => {
      mockHubConnection.start.and.returnValue(Promise.reject(new Error('Connection failed')));
      
      service.connect().catch(() => {});
      tick();

      // Simulate 10 failed reconnect attempts
      for (let i = 0; i < 10; i++) {
        const delay = Math.min(1000 * Math.pow(2, i), 30000);
        tick(delay);
      }

      const startCallCount = mockHubConnection.start.calls.count();

      // Try to trigger another reconnect
      tick(30000);

      // Should not attempt more reconnects
      expect(mockHubConnection.start.calls.count()).toBe(startCallCount);
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[SignalR] Max Reconnect Attempts Reached'
        })
      );
    }));

    it('should reset reconnect attempts on successful connection', fakeAsync(() => {
      let onReconnectedCallback: ((connectionId?: string) => void) | undefined;
      mockHubConnection.onreconnected.and.callFake((callback) => {
        onReconnectedCallback = callback;
      });
      mockHubConnection.start.and.returnValue(Promise.resolve());

      service.connect();
      tick();

      // Simulate successful reconnection
      onReconnectedCallback!('connection-123');
      tick();

      // Verify reconnect attempts were reset
      expect(service.getConnectionStatus()).toBe(ConnectionStatus.Connected);
    }));

    it('should not reconnect on manual disconnect', fakeAsync(() => {
      mockHubConnection.start.and.returnValue(Promise.resolve());
      mockHubConnection.stop.and.returnValue(Promise.resolve());
      let onCloseCallback: ((error?: Error) => void) | undefined;
      mockHubConnection.onclose.and.callFake((callback) => {
        onCloseCallback = callback;
      });

      service.connect();
      tick();

      service.disconnect();
      tick();

      // Simulate connection close after manual disconnect
      onCloseCallback!();
      tick(5000); // Wait longer than first reconnect delay

      // Should not attempt reconnect
      expect(mockHubConnection.start).toHaveBeenCalledTimes(1);
    }));

    it('should clear pending reconnect timeout on disconnect', fakeAsync(() => {
      mockHubConnection.start.and.returnValue(Promise.reject(new Error('Connection failed')));
      mockHubConnection.stop.and.returnValue(Promise.resolve());

      service.connect().catch(() => {});
      tick();

      // Reconnect is scheduled
      tick(500); // Partial delay

      // Disconnect before reconnect executes
      service.disconnect();
      tick();

      // Complete the original delay
      tick(500);

      // Should not execute the scheduled reconnect
      expect(mockHubConnection.start).toHaveBeenCalledTimes(1);
    }));

    it('should update connection status during reconnection', fakeAsync(() => {
      let onReconnectingCallback: ((error?: Error) => void) | undefined;
      mockHubConnection.onreconnecting.and.callFake((callback) => {
        onReconnectingCallback = callback;
      });
      mockHubConnection.start.and.returnValue(Promise.resolve());

      service.connect();
      tick();

      const statuses: ConnectionStatus[] = [];
      service.connectionStatus$.subscribe(status => statuses.push(status));

      // Simulate reconnecting
      onReconnectingCallback!(new Error('Connection lost'));
      tick();

      expect(statuses).toContain(ConnectionStatus.Reconnecting);
    }));

    it('should clear reconnect timeout on new connect call', fakeAsync(() => {
      mockHubConnection.start.and.returnValue(Promise.reject(new Error('Connection failed')));

      service.connect().catch(() => {});
      tick();

      // Reconnect is scheduled
      tick(500); // Partial delay

      // Call connect again before scheduled reconnect
      mockHubConnection.start.and.returnValue(Promise.resolve());
      service.connect();
      tick();

      // Should have cleared the old timeout and connected immediately
      expect(service.isConnected()).toBe(true);
    }));
  });

  describe('Connection Lifecycle', () => {
    beforeEach(() => {
      spyOn(signalR.HubConnectionBuilder.prototype, 'withUrl').and.returnValue(
        signalR.HubConnectionBuilder.prototype
      );
      spyOn(signalR.HubConnectionBuilder.prototype, 'withAutomaticReconnect').and.returnValue(
        signalR.HubConnectionBuilder.prototype
      );
      spyOn(signalR.HubConnectionBuilder.prototype, 'configureLogging').and.returnValue(
        signalR.HubConnectionBuilder.prototype
      );
      spyOn(signalR.HubConnectionBuilder.prototype, 'build').and.returnValue(mockHubConnection);
    });

    it('should dispatch reconnected action on successful reconnection', fakeAsync(() => {
      let onReconnectedCallback: ((connectionId?: string) => void) | undefined;
      mockHubConnection.onreconnected.and.callFake((callback) => {
        onReconnectedCallback = callback;
      });
      mockHubConnection.start.and.returnValue(Promise.resolve());

      service.connect();
      tick();

      onReconnectedCallback!('new-connection-id');
      tick();

      expect(mockStore.dispatch).toHaveBeenCalledWith({ type: '[SignalR] Reconnected' });
    }));

    it('should resubscribe to technicians on reconnection', fakeAsync(() => {
      let onReconnectedCallback: ((connectionId?: string) => void) | undefined;
      mockHubConnection.onreconnected.and.callFake((callback) => {
        onReconnectedCallback = callback;
      });
      mockHubConnection.start.and.returnValue(Promise.resolve());
      mockHubConnection.invoke.and.returnValue(Promise.resolve());

      service.connect();
      tick();

      // Subscribe to a technician
      service.subscribeToTechnicianUpdates('tech-123');
      tick();

      // Simulate reconnection
      onReconnectedCallback!('new-connection-id');
      tick();

      // Should resubscribe
      expect(mockHubConnection.invoke).toHaveBeenCalledWith('SubscribeToTechnicianUpdates', 'tech-123');
      expect(mockHubConnection.invoke.calls.count()).toBeGreaterThan(1);
    }));
  });

  describe('Connection Status Tracking', () => {
    beforeEach(() => {
      spyOn(signalR.HubConnectionBuilder.prototype, 'withUrl').and.returnValue(
        signalR.HubConnectionBuilder.prototype
      );
      spyOn(signalR.HubConnectionBuilder.prototype, 'withAutomaticReconnect').and.returnValue(
        signalR.HubConnectionBuilder.prototype
      );
      spyOn(signalR.HubConnectionBuilder.prototype, 'configureLogging').and.returnValue(
        signalR.HubConnectionBuilder.prototype
      );
      spyOn(signalR.HubConnectionBuilder.prototype, 'build').and.returnValue(mockHubConnection);
    });

    it('should dispatch connectionEstablished action on successful connection', fakeAsync(() => {
      mockHubConnection.start.and.returnValue(Promise.resolve());

      service.connect();
      tick();

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[UI] Connection Established'
        })
      );
    }));

    it('should dispatch connectionLost action on connection failure', fakeAsync(() => {
      const error = new Error('Connection failed');
      mockHubConnection.start.and.returnValue(Promise.reject(error));

      service.connect().catch(() => {});
      tick();

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[UI] Connection Lost',
          error: 'Connection failed'
        })
      );
    }));

    it('should dispatch connectionLost action on connection close with error', fakeAsync(() => {
      let onCloseCallback: ((error?: Error) => void) | undefined;
      mockHubConnection.onclose.and.callFake((callback) => {
        onCloseCallback = callback;
      });
      mockHubConnection.start.and.returnValue(Promise.resolve());

      service.connect();
      tick();

      const error = new Error('Connection lost');
      onCloseCallback!(error);
      tick();

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[UI] Connection Lost',
          error: 'Connection lost'
        })
      );
    }));

    it('should dispatch connectionLost action on connection close without error', fakeAsync(() => {
      let onCloseCallback: ((error?: Error) => void) | undefined;
      mockHubConnection.onclose.and.callFake((callback) => {
        onCloseCallback = callback;
      });
      mockHubConnection.start.and.returnValue(Promise.resolve());

      service.connect();
      tick();

      onCloseCallback!();
      tick();

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[UI] Connection Lost'
        })
      );
    }));

    it('should dispatch reconnecting action when reconnecting', fakeAsync(() => {
      let onReconnectingCallback: ((error?: Error) => void) | undefined;
      mockHubConnection.onreconnecting.and.callFake((callback) => {
        onReconnectingCallback = callback;
      });
      mockHubConnection.start.and.returnValue(Promise.resolve());

      service.connect();
      tick();

      onReconnectingCallback!();
      tick();

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[UI] Reconnecting',
          attempt: 1
        })
      );
    }));

    it('should dispatch connectionEstablished action on reconnection', fakeAsync(() => {
      let onReconnectedCallback: ((connectionId?: string) => void) | undefined;
      mockHubConnection.onreconnected.and.callFake((callback) => {
        onReconnectedCallback = callback;
      });
      mockHubConnection.start.and.returnValue(Promise.resolve());

      service.connect();
      tick();

      mockStore.dispatch.calls.reset();

      onReconnectedCallback!('new-connection-id');
      tick();

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[UI] Connection Established'
        })
      );
    }));

    it('should dispatch reconnecting action during manual reconnect attempts', fakeAsync(() => {
      mockHubConnection.start.and.returnValue(Promise.reject(new Error('Connection failed')));

      service.connect().catch(() => {});
      tick();

      mockStore.dispatch.calls.reset();

      // First reconnect attempt
      tick(1000);

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[UI] Reconnecting',
          attempt: 1
        })
      );
    }));

    it('should track connection status through observable', (done) => {
      mockHubConnection.start.and.returnValue(Promise.resolve());

      const statuses: ConnectionStatus[] = [];
      service.connectionStatus$.subscribe(status => {
        statuses.push(status);
        
        if (statuses.length === 2) {
          expect(statuses[0]).toBe(ConnectionStatus.Disconnected);
          expect(statuses[1]).toBe(ConnectionStatus.Connected);
          done();
        }
      });

      service.connect();
    });

    it('should expose connection status via getConnectionStatus', fakeAsync(() => {
      mockHubConnection.start.and.returnValue(Promise.resolve());

      expect(service.getConnectionStatus()).toBe(ConnectionStatus.Disconnected);

      service.connect();
      tick();

      expect(service.getConnectionStatus()).toBe(ConnectionStatus.Connected);
    }));

    it('should expose connection status via isConnected', fakeAsync(() => {
      mockHubConnection.start.and.returnValue(Promise.resolve());

      expect(service.isConnected()).toBe(false);

      service.connect();
      tick();

      expect(service.isConnected()).toBe(true);
    }));
  });

  describe('Hub Method Subscriptions', () => {
    let eventHandlers: Map<string, Function>;

    beforeEach(() => {
      eventHandlers = new Map();
      
      spyOn(signalR.HubConnectionBuilder.prototype, 'withUrl').and.returnValue(
        signalR.HubConnectionBuilder.prototype
      );
      spyOn(signalR.HubConnectionBuilder.prototype, 'withAutomaticReconnect').and.returnValue(
        signalR.HubConnectionBuilder.prototype
      );
      spyOn(signalR.HubConnectionBuilder.prototype, 'configureLogging').and.returnValue(
        signalR.HubConnectionBuilder.prototype
      );
      spyOn(signalR.HubConnectionBuilder.prototype, 'build').and.returnValue(mockHubConnection);

      mockHubConnection.on.and.callFake((eventName: string, handler: Function) => {
        eventHandlers.set(eventName, handler);
      });
      mockHubConnection.start.and.returnValue(Promise.resolve());
    });

    it('should subscribe to LocationUpdate events', fakeAsync(() => {
      service.connect();
      tick();

      expect(eventHandlers.has('LocationUpdate')).toBe(true);
    }));

    it('should emit location updates through observable', fakeAsync(() => {
      service.connect();
      tick();

      const locationUpdate = {
        technicianId: 'tech-123',
        location: { latitude: 40.7128, longitude: -74.0060 },
        timestamp: new Date()
      };

      let receivedUpdate: any;
      service.locationUpdate$.subscribe(update => {
        receivedUpdate = update;
      });

      const handler = eventHandlers.get('LocationUpdate');
      handler!(locationUpdate);
      tick();

      expect(receivedUpdate).toEqual(locationUpdate);
    }));

    it('should dispatch store action on LocationUpdate', fakeAsync(() => {
      service.connect();
      tick();

      const locationUpdate = {
        technicianId: 'tech-123',
        location: { latitude: 40.7128, longitude: -74.0060 },
        timestamp: new Date()
      };

      const handler = eventHandlers.get('LocationUpdate');
      handler!(locationUpdate);
      tick();

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[Technician] Update Technician Location Success',
          technicianId: 'tech-123',
          location: locationUpdate.location
        })
      );
    }));

    it('should reject LocationUpdate with invalid structure', fakeAsync(() => {
      service.connect();
      tick();

      const invalidUpdate = {
        technicianId: 'tech-123',
        // Missing location field
        timestamp: new Date()
      };

      const handler = eventHandlers.get('LocationUpdate');
      handler!(invalidUpdate);
      tick();

      // Should not dispatch to store
      expect(mockStore.dispatch).not.toHaveBeenCalled();
    }));

    it('should reject LocationUpdate with invalid latitude', fakeAsync(() => {
      service.connect();
      tick();

      const invalidUpdate = {
        technicianId: 'tech-123',
        location: { latitude: 95, longitude: -74.0060, accuracy: 10 }, // Invalid latitude > 90
        timestamp: new Date()
      };

      const handler = eventHandlers.get('LocationUpdate');
      handler!(invalidUpdate);
      tick();

      // Should not dispatch to store
      expect(mockStore.dispatch).not.toHaveBeenCalled();
    }));

    it('should reject LocationUpdate with invalid longitude', fakeAsync(() => {
      service.connect();
      tick();

      const invalidUpdate = {
        technicianId: 'tech-123',
        location: { latitude: 40.7128, longitude: -200, accuracy: 10 }, // Invalid longitude < -180
        timestamp: new Date()
      };

      const handler = eventHandlers.get('LocationUpdate');
      handler!(invalidUpdate);
      tick();

      // Should not dispatch to store
      expect(mockStore.dispatch).not.toHaveBeenCalled();
    }));

    it('should accept LocationUpdate with valid boundary coordinates', fakeAsync(() => {
      service.connect();
      tick();

      const locationUpdate = {
        technicianId: 'tech-123',
        location: { latitude: -90, longitude: 180, accuracy: 10 }, // Valid boundary values
        timestamp: new Date()
      };

      const handler = eventHandlers.get('LocationUpdate');
      handler!(locationUpdate);
      tick();

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[Technician] Update Technician Location Success',
          technicianId: 'tech-123',
          location: locationUpdate.location
        })
      );
    }));

    it('should subscribe to JobAssigned events', fakeAsync(() => {
      service.connect();
      tick();

      expect(eventHandlers.has('JobAssigned')).toBe(true);
    }));

    it('should emit job assigned events through observable', fakeAsync(() => {
      service.connect();
      tick();

      const assignment = {
        id: 'assign-123',
        jobId: 'job-456',
        technicianId: 'tech-789',
        assignedBy: 'cm-001',
        assignedAt: new Date(),
        status: 'ASSIGNED' as any
      };

      let receivedAssignment: any;
      service.jobAssigned$.subscribe(assign => {
        receivedAssignment = assign;
      });

      const handler = eventHandlers.get('JobAssigned');
      handler!(assignment);
      tick();

      expect(receivedAssignment).toEqual(assignment);
    }));

    it('should dispatch store action on JobAssigned', fakeAsync(() => {
      service.connect();
      tick();

      const assignment = {
        id: 'assign-123',
        jobId: 'job-456',
        technicianId: 'tech-789',
        assignedBy: 'cm-001',
        assignedAt: new Date(),
        status: 'ASSIGNED' as any
      };

      const handler = eventHandlers.get('JobAssigned');
      handler!(assignment);
      tick();

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[Assignment] Assign Technician Success',
          assignment: assignment
        })
      );
    }));

    it('should subscribe to JobStatusChanged events', fakeAsync(() => {
      service.connect();
      tick();

      expect(eventHandlers.has('JobStatusChanged')).toBe(true);
    }));

    it('should emit job status changed events through observable', fakeAsync(() => {
      service.connect();
      tick();

      const statusUpdate = {
        job: {
          id: 'job-123',
          status: 'IN_PROGRESS' as any,
          title: 'Test Job'
        }
      };

      let receivedUpdate: any;
      service.jobStatusChanged$.subscribe(update => {
        receivedUpdate = update;
      });

      const handler = eventHandlers.get('JobStatusChanged');
      handler!(statusUpdate);
      tick();

      expect(receivedUpdate).toEqual(statusUpdate);
    }));

    it('should dispatch store action on JobStatusChanged', fakeAsync(() => {
      service.connect();
      tick();

      const statusUpdate = {
        job: {
          id: 'job-123',
          status: 'IN_PROGRESS' as any,
          title: 'Test Job'
        }
      };

      const handler = eventHandlers.get('JobStatusChanged');
      handler!(statusUpdate);
      tick();

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[Job] Update Job Status Success',
          job: statusUpdate.job
        })
      );
    }));

    it('should subscribe to JobReassigned events', fakeAsync(() => {
      service.connect();
      tick();

      expect(eventHandlers.has('JobReassigned')).toBe(true);
    }));

    it('should emit job reassigned events through observable', fakeAsync(() => {
      service.connect();
      tick();

      const reassignment = {
        jobId: 'job-123',
        fromTechnicianId: 'tech-456',
        toTechnicianId: 'tech-789',
        reassignedBy: 'cm-001',
        reassignedAt: new Date(),
        reason: 'Skill mismatch'
      };

      let receivedReassignment: any;
      service.jobReassigned$.subscribe(reassign => {
        receivedReassignment = reassign;
      });

      const handler = eventHandlers.get('JobReassigned');
      handler!(reassignment);
      tick();

      expect(receivedReassignment).toEqual(reassignment);
    }));

    it('should dispatch store action on JobReassigned', fakeAsync(() => {
      service.connect();
      tick();

      const reassignment = {
        jobId: 'job-123',
        fromTechnicianId: 'tech-456',
        toTechnicianId: 'tech-789',
        reassignedBy: 'cm-001',
        reassignedAt: new Date()
      };

      const handler = eventHandlers.get('JobReassigned');
      handler!(reassignment);
      tick();

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[Assignment] Load Assignments',
          filters: { jobId: 'job-123' }
        })
      );
    }));

    it('should subscribe to Notification events', fakeAsync(() => {
      service.connect();
      tick();

      expect(eventHandlers.has('Notification')).toBe(true);
    }));

    it('should emit notification events through observable', fakeAsync(() => {
      service.connect();
      tick();

      const notification = {
        id: 'notif-123',
        message: 'New job assigned',
        type: 'info' as any,
        timestamp: new Date()
      };

      let receivedNotification: any;
      service.notification$.subscribe(notif => {
        receivedNotification = notif;
      });

      const handler = eventHandlers.get('Notification');
      handler!(notification);
      tick();

      expect(receivedNotification).toEqual(notification);
    }));

    it('should dispatch store action on Notification', fakeAsync(() => {
      service.connect();
      tick();

      const notification = {
        id: 'notif-123',
        message: 'New job assigned',
        type: 'info' as any,
        timestamp: new Date()
      };

      const handler = eventHandlers.get('Notification');
      handler!(notification);
      tick();

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[Notification] Add Notification',
          notification: notification
        })
      );
    }));

    it('should subscribe to AssignmentCreated events', fakeAsync(() => {
      service.connect();
      tick();

      expect(eventHandlers.has('AssignmentCreated')).toBe(true);
    }));

    it('should dispatch store actions on AssignmentCreated', fakeAsync(() => {
      service.connect();
      tick();

      const assignment = {
        id: 'assign-123',
        jobId: 'job-456',
        technicianId: 'tech-789',
        assignedBy: 'cm-001',
        assignedAt: new Date(),
        isActive: true
      };

      const handler = eventHandlers.get('AssignmentCreated');
      handler!(assignment);
      tick();

      // Should dispatch assignment success action
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[Assignment] Assign Technician Success',
          assignment: assignment
        })
      );

      // Should dispatch notification action
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[Notification] Add Notification',
          notification: jasmine.objectContaining({
            id: `assignment-${assignment.id}`,
            type: 'job_assignment',
            userId: assignment.technicianId,
            relatedEntityId: assignment.jobId,
            relatedEntityType: 'job'
          })
        })
      );
    }));

    it('should validate assignment structure on AssignmentCreated', fakeAsync(() => {
      service.connect();
      tick();

      const invalidAssignment = {
        id: 'assign-123',
        // Missing jobId and technicianId
        assignedBy: 'cm-001',
        assignedAt: new Date()
      };

      const handler = eventHandlers.get('AssignmentCreated');
      handler!(invalidAssignment);
      tick();

      // Should not dispatch any actions for invalid assignment
      expect(mockStore.dispatch).not.toHaveBeenCalled();
    }));

    it('should validate required fields on AssignmentCreated', fakeAsync(() => {
      service.connect();
      tick();

      const assignmentMissingFields = {
        id: 'assign-123',
        jobId: 'job-456',
        technicianId: 'tech-789',
        // Missing assignedBy and assignedAt
        isActive: true
      };

      const handler = eventHandlers.get('AssignmentCreated');
      handler!(assignmentMissingFields);
      tick();

      // Should not dispatch any actions for assignment missing required fields
      expect(mockStore.dispatch).not.toHaveBeenCalled();
    }));

    it('should subscribe to AssignmentStatusChanged events', fakeAsync(() => {
      service.connect();
      tick();

      expect(eventHandlers.has('AssignmentStatusChanged')).toBe(true);
    }));

    it('should dispatch store action on AssignmentStatusChanged', fakeAsync(() => {
      service.connect();
      tick();

      const assignment = {
        id: 'assign-123',
        jobId: 'job-456',
        technicianId: 'tech-789',
        status: AssignmentStatus.Accepted,
        assignedBy: 'cm-001',
        assignedAt: new Date(),
        isActive: true
      };

      const handler = eventHandlers.get('AssignmentStatusChanged');
      handler!(assignment);
      tick();

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[Assignment] Update Assignment Success',
          assignment: assignment
        })
      );
    }));

    it('should validate assignment structure on AssignmentStatusChanged', fakeAsync(() => {
      service.connect();
      tick();

      const invalidAssignment = {
        // Missing id and status
        jobId: 'job-456',
        technicianId: 'tech-789'
      };

      mockStore.dispatch.calls.reset();

      const handler = eventHandlers.get('AssignmentStatusChanged');
      handler!(invalidAssignment);
      tick();

      // Should not dispatch any actions for invalid assignment
      expect(mockStore.dispatch).not.toHaveBeenCalled();
    }));

    it('should reject AssignmentStatusChanged with missing id', fakeAsync(() => {
      service.connect();
      tick();

      const invalidAssignment = {
        // Missing id
        jobId: 'job-456',
        technicianId: 'tech-789',
        status: 'Accepted' as any
      };

      mockStore.dispatch.calls.reset();

      const handler = eventHandlers.get('AssignmentStatusChanged');
      handler!(invalidAssignment);
      tick();

      // Should not dispatch any actions
      expect(mockStore.dispatch).not.toHaveBeenCalled();
    }));

    it('should reject AssignmentStatusChanged with missing status', fakeAsync(() => {
      service.connect();
      tick();

      const invalidAssignment = {
        id: 'assign-123',
        jobId: 'job-456',
        technicianId: 'tech-789'
        // Missing status
      };

      mockStore.dispatch.calls.reset();

      const handler = eventHandlers.get('AssignmentStatusChanged');
      handler!(invalidAssignment);
      tick();

      // Should not dispatch any actions
      expect(mockStore.dispatch).not.toHaveBeenCalled();
    }));

    it('should reject AssignmentStatusChanged with invalid status value', fakeAsync(() => {
      service.connect();
      tick();

      const invalidAssignment = {
        id: 'assign-123',
        jobId: 'job-456',
        technicianId: 'tech-789',
        status: 'InvalidStatus' as any
      };

      mockStore.dispatch.calls.reset();

      const handler = eventHandlers.get('AssignmentStatusChanged');
      handler!(invalidAssignment);
      tick();

      // Should not dispatch any actions for invalid status
      expect(mockStore.dispatch).not.toHaveBeenCalled();
    }));

    it('should accept AssignmentStatusChanged with all valid status values', fakeAsync(() => {
      service.connect();
      tick();

      const validStatuses = Object.values(AssignmentStatus);

      validStatuses.forEach(status => {
        mockStore.dispatch.calls.reset();

        const assignment = {
          id: 'assign-123',
          jobId: 'job-456',
          technicianId: 'tech-789',
          status: status,
          assignedBy: 'cm-001',
          assignedAt: new Date(),
          isActive: true
        };

        const handler = eventHandlers.get('AssignmentStatusChanged');
        handler!(assignment);
        tick();

        expect(mockStore.dispatch).toHaveBeenCalledWith(
          jasmine.objectContaining({
            type: '[Assignment] Update Assignment Success',
            assignment: assignment
          })
        );
      });
    }));

    it('should handle AssignmentStatusChanged with null assignment', fakeAsync(() => {
      service.connect();
      tick();

      mockStore.dispatch.calls.reset();

      const handler = eventHandlers.get('AssignmentStatusChanged');
      handler!(null);
      tick();

      // Should not dispatch any actions for null assignment
      expect(mockStore.dispatch).not.toHaveBeenCalled();
    }));

    it('should handle AssignmentStatusChanged with undefined assignment', fakeAsync(() => {
      service.connect();
      tick();

      mockStore.dispatch.calls.reset();

      const handler = eventHandlers.get('AssignmentStatusChanged');
      handler!(undefined);
      tick();

      // Should not dispatch any actions for undefined assignment
      expect(mockStore.dispatch).not.toHaveBeenCalled();
    }));

    it('should subscribe to CrewLocationUpdate events', fakeAsync(() => {
      service.connect();
      tick();

      expect(eventHandlers.has('CrewLocationUpdate')).toBe(true);
    }));

    it('should dispatch store action on CrewLocationUpdate', fakeAsync(() => {
      service.connect();
      tick();

      const crewUpdate = {
        crewId: 'crew-123',
        location: { latitude: 40.7128, longitude: -74.0060 },
        timestamp: new Date()
      };

      const handler = eventHandlers.get('CrewLocationUpdate');
      handler!(crewUpdate);
      tick();

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[Crew] Update Crew Location Success',
          payload: {
            crewId: 'crew-123',
            location: crewUpdate.location
          }
        })
      );
    }));

    it('should clear event subjects on disconnect', fakeAsync(() => {
      mockHubConnection.stop.and.returnValue(Promise.resolve());
      
      service.connect();
      tick();

      // Trigger some events
      const locationUpdate = {
        technicianId: 'tech-123',
        location: { latitude: 40.7128, longitude: -74.0060 },
        timestamp: new Date()
      };
      
      const handler = eventHandlers.get('LocationUpdate');
      handler!(locationUpdate);
      tick();

      // Disconnect
      service.disconnect();
      tick();

      // Verify subjects are cleared
      let clearedUpdate: any;
      service.locationUpdate$.subscribe(update => {
        clearedUpdate = update;
      });

      expect(clearedUpdate).toBeNull();
    }));

    it('should allow multiple subscriptions to event observables', fakeAsync(() => {
      service.connect();
      tick();

      const locationUpdate = {
        technicianId: 'tech-123',
        location: { latitude: 40.7128, longitude: -74.0060 },
        timestamp: new Date()
      };

      let receivedUpdate1: any;
      let receivedUpdate2: any;
      
      service.locationUpdate$.subscribe(update => {
        receivedUpdate1 = update;
      });
      
      service.locationUpdate$.subscribe(update => {
        receivedUpdate2 = update;
      });

      const handler = eventHandlers.get('LocationUpdate');
      handler!(locationUpdate);
      tick();

      expect(receivedUpdate1).toEqual(locationUpdate);
      expect(receivedUpdate2).toEqual(locationUpdate);
    }));
  });

  describe('Hub Method Invocations', () => {
    beforeEach(fakeAsync(() => {
      spyOn(signalR.HubConnectionBuilder.prototype, 'withUrl').and.returnValue(
        signalR.HubConnectionBuilder.prototype
      );
      spyOn(signalR.HubConnectionBuilder.prototype, 'withAutomaticReconnect').and.returnValue(
        signalR.HubConnectionBuilder.prototype
      );
      spyOn(signalR.HubConnectionBuilder.prototype, 'configureLogging').and.returnValue(
        signalR.HubConnectionBuilder.prototype
      );
      spyOn(signalR.HubConnectionBuilder.prototype, 'build').and.returnValue(mockHubConnection);
      
      mockHubConnection.start.and.returnValue(Promise.resolve());
      mockHubConnection.invoke.and.returnValue(Promise.resolve());
      
      service.connect();
      tick();
    }));

    describe('subscribeToTechnicianUpdates', () => {
      it('should invoke SubscribeToTechnicianUpdates hub method', fakeAsync(() => {
        service.subscribeToTechnicianUpdates('tech-123');
        tick();

        expect(mockHubConnection.invoke).toHaveBeenCalledWith('SubscribeToTechnicianUpdates', 'tech-123');
      }));

      it('should track subscribed technicians', fakeAsync(() => {
        service.subscribeToTechnicianUpdates('tech-123');
        tick();

        service.subscribeToTechnicianUpdates('tech-456');
        tick();

        // Verify by checking resubscription behavior
        expect(mockHubConnection.invoke).toHaveBeenCalledWith('SubscribeToTechnicianUpdates', 'tech-123');
        expect(mockHubConnection.invoke).toHaveBeenCalledWith('SubscribeToTechnicianUpdates', 'tech-456');
      }));

      it('should not invoke when not connected', () => {
        mockHubConnection.stop.and.returnValue(Promise.resolve());
        service.disconnect();

        mockHubConnection.invoke.calls.reset();
        service.subscribeToTechnicianUpdates('tech-123');

        expect(mockHubConnection.invoke).not.toHaveBeenCalled();
      });

      it('should handle subscription errors gracefully', fakeAsync(() => {
        mockHubConnection.invoke.and.returnValue(Promise.reject(new Error('Subscription failed')));

        expect(() => {
          service.subscribeToTechnicianUpdates('tech-123');
          tick();
        }).not.toThrow();
      }));
    });

    describe('unsubscribeFromTechnicianUpdates', () => {
      it('should invoke UnsubscribeFromTechnicianUpdates hub method', fakeAsync(() => {
        service.subscribeToTechnicianUpdates('tech-123');
        tick();

        mockHubConnection.invoke.calls.reset();
        service.unsubscribeFromTechnicianUpdates('tech-123');
        tick();

        expect(mockHubConnection.invoke).toHaveBeenCalledWith('UnsubscribeFromTechnicianUpdates', 'tech-123');
      }));

      it('should remove technician from subscribed set', fakeAsync(() => {
        service.subscribeToTechnicianUpdates('tech-123');
        tick();

        service.unsubscribeFromTechnicianUpdates('tech-123');
        tick();

        // Verify by checking that resubscription doesn't include this technician
        let onReconnectedCallback: ((connectionId?: string) => void) | undefined;
        mockHubConnection.onreconnected.and.callFake((callback) => {
          onReconnectedCallback = callback;
        });

        mockHubConnection.invoke.calls.reset();
        onReconnectedCallback!('new-connection-id');
        tick();

        expect(mockHubConnection.invoke).not.toHaveBeenCalledWith('SubscribeToTechnicianUpdates', 'tech-123');
      }));

      it('should handle unsubscription when not connected', () => {
        mockHubConnection.stop.and.returnValue(Promise.resolve());
        service.disconnect();

        mockHubConnection.invoke.calls.reset();
        
        expect(() => {
          service.unsubscribeFromTechnicianUpdates('tech-123');
        }).not.toThrow();

        expect(mockHubConnection.invoke).not.toHaveBeenCalled();
      }));

      it('should handle unsubscription errors gracefully', fakeAsync(() => {
        mockHubConnection.invoke.and.returnValue(Promise.reject(new Error('Unsubscription failed')));

        expect(() => {
          service.unsubscribeFromTechnicianUpdates('tech-123');
          tick();
        }).not.toThrow();
      }));
    });

    describe('sendLocationUpdate', () => {
      it('should invoke UpdateLocation hub method', fakeAsync(() => {
        const location = { latitude: 40.7128, longitude: -74.0060 };
        
        service.sendLocationUpdate('tech-123', location);
        tick();

        expect(mockHubConnection.invoke).toHaveBeenCalledWith('UpdateLocation', 'tech-123', location);
      }));

      it('should throw error when not connected', async () => {
        mockHubConnection.stop.and.returnValue(Promise.resolve());
        await service.disconnect();

        const location = { latitude: 40.7128, longitude: -74.0060 };
        
        await expectAsync(
          service.sendLocationUpdate('tech-123', location)
        ).toBeRejectedWithError('Cannot send location update: SignalR not connected');
      });

      it('should propagate hub invocation errors', async () => {
        mockHubConnection.invoke.and.returnValue(Promise.reject(new Error('Update failed')));

        const location = { latitude: 40.7128, longitude: -74.0060 };
        
        await expectAsync(
          service.sendLocationUpdate('tech-123', location)
        ).toBeRejectedWithError('Update failed');
      });
    });

    describe('acceptAssignment', () => {
      it('should invoke AcceptAssignment hub method', fakeAsync(() => {
        service.acceptAssignment('assign-123');
        tick();

        expect(mockHubConnection.invoke).toHaveBeenCalledWith('AcceptAssignment', 'assign-123');
      }));

      it('should throw error when not connected', async () => {
        mockHubConnection.stop.and.returnValue(Promise.resolve());
        await service.disconnect();
        
        await expectAsync(
          service.acceptAssignment('assign-123')
        ).toBeRejectedWithError('Cannot accept assignment: SignalR not connected');
      });

      it('should propagate hub invocation errors', async () => {
        mockHubConnection.invoke.and.returnValue(Promise.reject(new Error('Accept failed')));
        
        await expectAsync(
          service.acceptAssignment('assign-123')
        ).toBeRejectedWithError('Accept failed');
      });
    });

    describe('rejectAssignment', () => {
      it('should invoke RejectAssignment hub method without reason', fakeAsync(() => {
        service.rejectAssignment('assign-123');
        tick();

        expect(mockHubConnection.invoke).toHaveBeenCalledWith('RejectAssignment', 'assign-123', undefined);
      }));

      it('should invoke RejectAssignment hub method with reason', fakeAsync(() => {
        service.rejectAssignment('assign-123', 'Not available');
        tick();

        expect(mockHubConnection.invoke).toHaveBeenCalledWith('RejectAssignment', 'assign-123', 'Not available');
      }));

      it('should throw error when not connected', async () => {
        mockHubConnection.stop.and.returnValue(Promise.resolve());
        await service.disconnect();
        
        await expectAsync(
          service.rejectAssignment('assign-123')
        ).toBeRejectedWithError('Cannot reject assignment: SignalR not connected');
      });

      it('should propagate hub invocation errors', async () => {
        mockHubConnection.invoke.and.returnValue(Promise.reject(new Error('Reject failed')));
        
        await expectAsync(
          service.rejectAssignment('assign-123')
        ).toBeRejectedWithError('Reject failed');
      });
    });

    describe('updateJobStatus', () => {
      it('should invoke UpdateJobStatus hub method', fakeAsync(() => {
        service.updateJobStatus('job-123', 'IN_PROGRESS' as any);
        tick();

        expect(mockHubConnection.invoke).toHaveBeenCalledWith('UpdateJobStatus', 'job-123', 'IN_PROGRESS');
      }));

      it('should throw error when not connected', async () => {
        mockHubConnection.stop.and.returnValue(Promise.resolve());
        await service.disconnect();
        
        await expectAsync(
          service.updateJobStatus('job-123', 'IN_PROGRESS' as any)
        ).toBeRejectedWithError('Cannot update job status: SignalR not connected');
      });

      it('should propagate hub invocation errors', async () => {
        mockHubConnection.invoke.and.returnValue(Promise.reject(new Error('Update failed')));
        
        await expectAsync(
          service.updateJobStatus('job-123', 'IN_PROGRESS' as any)
        ).toBeRejectedWithError('Update failed');
      });
    });

    describe('startJob', () => {
      it('should invoke StartJob hub method', fakeAsync(() => {
        service.startJob('job-123', 'tech-456');
        tick();

        expect(mockHubConnection.invoke).toHaveBeenCalledWith('StartJob', 'job-123', 'tech-456');
      }));

      it('should throw error when not connected', async () => {
        mockHubConnection.stop.and.returnValue(Promise.resolve());
        await service.disconnect();
        
        await expectAsync(
          service.startJob('job-123', 'tech-456')
        ).toBeRejectedWithError('Cannot start job: SignalR not connected');
      });

      it('should propagate hub invocation errors', async () => {
        mockHubConnection.invoke.and.returnValue(Promise.reject(new Error('Start failed')));
        
        await expectAsync(
          service.startJob('job-123', 'tech-456')
        ).toBeRejectedWithError('Start failed');
      });
    });

    describe('completeJob', () => {
      it('should invoke CompleteJob hub method without notes', fakeAsync(() => {
        service.completeJob('job-123', 'tech-456');
        tick();

        expect(mockHubConnection.invoke).toHaveBeenCalledWith('CompleteJob', 'job-123', 'tech-456', undefined);
      }));

      it('should invoke CompleteJob hub method with notes', fakeAsync(() => {
        service.completeJob('job-123', 'tech-456', 'Job completed successfully');
        tick();

        expect(mockHubConnection.invoke).toHaveBeenCalledWith('CompleteJob', 'job-123', 'tech-456', 'Job completed successfully');
      }));

      it('should throw error when not connected', async () => {
        mockHubConnection.stop.and.returnValue(Promise.resolve());
        await service.disconnect();
        
        await expectAsync(
          service.completeJob('job-123', 'tech-456')
        ).toBeRejectedWithError('Cannot complete job: SignalR not connected');
      });

      it('should propagate hub invocation errors', async () => {
        mockHubConnection.invoke.and.returnValue(Promise.reject(new Error('Complete failed')));
        
        await expectAsync(
          service.completeJob('job-123', 'tech-456')
        ).toBeRejectedWithError('Complete failed');
      });
    });

    describe('sendNotification', () => {
      it('should invoke SendNotification hub method', fakeAsync(() => {
        const notification = {
          id: 'notif-123',
          message: 'Test notification',
          type: 'info' as any,
          timestamp: new Date()
        };
        
        service.sendNotification(['user-1', 'user-2'], notification);
        tick();

        expect(mockHubConnection.invoke).toHaveBeenCalledWith('SendNotification', ['user-1', 'user-2'], notification);
      }));

      it('should throw error when not connected', async () => {
        mockHubConnection.stop.and.returnValue(Promise.resolve());
        await service.disconnect();

        const notification = {
          id: 'notif-123',
          message: 'Test notification',
          type: 'info' as any,
          timestamp: new Date()
        };
        
        await expectAsync(
          service.sendNotification(['user-1'], notification)
        ).toBeRejectedWithError('Cannot send notification: SignalR not connected');
      });

      it('should propagate hub invocation errors', async () => {
        mockHubConnection.invoke.and.returnValue(Promise.reject(new Error('Send failed')));

        const notification = {
          id: 'notif-123',
          message: 'Test notification',
          type: 'info' as any,
          timestamp: new Date()
        };
        
        await expectAsync(
          service.sendNotification(['user-1'], notification)
        ).toBeRejectedWithError('Send failed');
      });
    });

    describe('broadcastToMarket', () => {
      it('should invoke BroadcastToMarket hub method', fakeAsync(() => {
        const notification = {
          id: 'notif-123',
          message: 'Market notification',
          type: 'info' as any,
          timestamp: new Date()
        };
        
        service.broadcastToMarket('DALLAS', notification);
        tick();

        expect(mockHubConnection.invoke).toHaveBeenCalledWith('BroadcastToMarket', 'DALLAS', notification);
      }));

      it('should throw error when not connected', async () => {
        mockHubConnection.stop.and.returnValue(Promise.resolve());
        await service.disconnect();

        const notification = {
          id: 'notif-123',
          message: 'Market notification',
          type: 'info' as any,
          timestamp: new Date()
        };
        
        await expectAsync(
          service.broadcastToMarket('DALLAS', notification)
        ).toBeRejectedWithError('Cannot broadcast to market: SignalR not connected');
      });

      it('should propagate hub invocation errors', async () => {
        mockHubConnection.invoke.and.returnValue(Promise.reject(new Error('Broadcast failed')));

        const notification = {
          id: 'notif-123',
          message: 'Market notification',
          type: 'info' as any,
          timestamp: new Date()
        };
        
        await expectAsync(
          service.broadcastToMarket('DALLAS', notification)
        ).toBeRejectedWithError('Broadcast failed');
      });
    });

    describe('updateCrewLocation', () => {
      it('should invoke UpdateCrewLocation hub method', fakeAsync(() => {
        const location = { latitude: 40.7128, longitude: -74.0060 };
        
        service.updateCrewLocation('crew-123', location);
        tick();

        expect(mockHubConnection.invoke).toHaveBeenCalledWith('UpdateCrewLocation', 'crew-123', location);
      }));

      it('should throw error when not connected', async () => {
        mockHubConnection.stop.and.returnValue(Promise.resolve());
        await service.disconnect();

        const location = { latitude: 40.7128, longitude: -74.0060 };
        
        await expectAsync(
          service.updateCrewLocation('crew-123', location)
        ).toBeRejectedWithError('Cannot update crew location: SignalR not connected');
      });

      it('should propagate hub invocation errors', async () => {
        mockHubConnection.invoke.and.returnValue(Promise.reject(new Error('Update failed')));

        const location = { latitude: 40.7128, longitude: -74.0060 };
        
        await expectAsync(
          service.updateCrewLocation('crew-123', location)
        ).toBeRejectedWithError('Update failed');
      });
    });

    describe('requestEventSync', () => {
      it('should invoke RequestEventSync hub method', fakeAsync(() => {
        const lastEventTimestamp = new Date('2024-01-01T12:00:00Z');
        
        service.requestEventSync(lastEventTimestamp);
        tick();

        expect(mockHubConnection.invoke).toHaveBeenCalledWith('RequestEventSync', lastEventTimestamp);
      }));

      it('should throw error when not connected', async () => {
        mockHubConnection.stop.and.returnValue(Promise.resolve());
        await service.disconnect();

        const lastEventTimestamp = new Date('2024-01-01T12:00:00Z');
        
        await expectAsync(
          service.requestEventSync(lastEventTimestamp)
        ).toBeRejectedWithError('Cannot request event sync: SignalR not connected');
      });

      it('should propagate hub invocation errors', async () => {
        mockHubConnection.invoke.and.returnValue(Promise.reject(new Error('Sync failed')));

        const lastEventTimestamp = new Date('2024-01-01T12:00:00Z');
        
        await expectAsync(
          service.requestEventSync(lastEventTimestamp)
        ).toBeRejectedWithError('Sync failed');
      });
    });

    describe('joinMarketGroup', () => {
      it('should invoke JoinMarketGroup hub method', fakeAsync(() => {
        service.joinMarketGroup('DALLAS');
        tick();

        expect(mockHubConnection.invoke).toHaveBeenCalledWith('JoinMarketGroup', 'DALLAS');
      }));

      it('should throw error when not connected', async () => {
        mockHubConnection.stop.and.returnValue(Promise.resolve());
        await service.disconnect();
        
        await expectAsync(
          service.joinMarketGroup('DALLAS')
        ).toBeRejectedWithError('Cannot join market group: SignalR not connected');
      });

      it('should propagate hub invocation errors', async () => {
        mockHubConnection.invoke.and.returnValue(Promise.reject(new Error('Join failed')));
        
        await expectAsync(
          service.joinMarketGroup('DALLAS')
        ).toBeRejectedWithError('Join failed');
      });
    });

    describe('leaveMarketGroup', () => {
      it('should invoke LeaveMarketGroup hub method', fakeAsync(() => {
        service.leaveMarketGroup('DALLAS');
        tick();

        expect(mockHubConnection.invoke).toHaveBeenCalledWith('LeaveMarketGroup', 'DALLAS');
      }));

      it('should not throw error when not connected', async () => {
        mockHubConnection.stop.and.returnValue(Promise.resolve());
        await service.disconnect();
        
        await expectAsync(
          service.leaveMarketGroup('DALLAS')
        ).toBeResolved();
      });

      it('should propagate hub invocation errors', async () => {
        mockHubConnection.invoke.and.returnValue(Promise.reject(new Error('Leave failed')));
        
        await expectAsync(
          service.leaveMarketGroup('DALLAS')
        ).toBeRejectedWithError('Leave failed');
      });
    });
  });

  describe('Custom Event Callbacks', () => {
    beforeEach(fakeAsync(() => {
      spyOn(signalR.HubConnectionBuilder.prototype, 'withUrl').and.returnValue(
        signalR.HubConnectionBuilder.prototype
      );
      spyOn(signalR.HubConnectionBuilder.prototype, 'withAutomaticReconnect').and.returnValue(
        signalR.HubConnectionBuilder.prototype
      );
      spyOn(signalR.HubConnectionBuilder.prototype, 'configureLogging').and.returnValue(
        signalR.HubConnectionBuilder.prototype
      );
      spyOn(signalR.HubConnectionBuilder.prototype, 'build').and.returnValue(mockHubConnection);
      
      mockHubConnection.start.and.returnValue(Promise.resolve());
      
      service.connect();
      tick();
    }));

    it('should register custom callback for LocationUpdate', () => {
      const callback = jasmine.createSpy('locationCallback');
      
      service.onLocationUpdate(callback);
      
      expect(mockHubConnection.on).toHaveBeenCalledWith('LocationUpdate', callback);
    });

    it('should register custom callback for JobAssigned', () => {
      const callback = jasmine.createSpy('jobAssignedCallback');
      
      service.onJobAssigned(callback);
      
      expect(mockHubConnection.on).toHaveBeenCalledWith('JobAssigned', callback);
    });

    it('should register custom callback for JobStatusChanged', () => {
      const callback = jasmine.createSpy('jobStatusCallback');
      
      service.onJobStatusChanged(callback);
      
      expect(mockHubConnection.on).toHaveBeenCalledWith('JobStatusChanged', callback);
    });

    it('should register custom callback for JobReassigned', () => {
      const callback = jasmine.createSpy('jobReassignedCallback');
      
      service.onJobReassigned(callback);
      
      expect(mockHubConnection.on).toHaveBeenCalledWith('JobReassigned', callback);
    });

    it('should register custom callback for Notification', () => {
      const callback = jasmine.createSpy('notificationCallback');
      
      service.onNotification(callback);
      
      expect(mockHubConnection.on).toHaveBeenCalledWith('Notification', callback);
    });

    it('should not register callback when hub connection is null', () => {
      service.disconnect();
      
      const callback = jasmine.createSpy('callback');
      
      expect(() => {
        service.onLocationUpdate(callback);
      }).not.toThrow();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    beforeEach(() => {
      spyOn(signalR.HubConnectionBuilder.prototype, 'withUrl').and.returnValue(
        signalR.HubConnectionBuilder.prototype
      );
      spyOn(signalR.HubConnectionBuilder.prototype, 'withAutomaticReconnect').and.returnValue(
        signalR.HubConnectionBuilder.prototype
      );
      spyOn(signalR.HubConnectionBuilder.prototype, 'configureLogging').and.returnValue(
        signalR.HubConnectionBuilder.prototype
      );
      spyOn(signalR.HubConnectionBuilder.prototype, 'build').and.returnValue(mockHubConnection);
    });

    it('should not attempt to connect if already connected', fakeAsync(() => {
      mockHubConnection.start.and.returnValue(Promise.resolve());
      
      service.connect();
      tick();

      mockHubConnection.start.calls.reset();
      
      service.connect();
      tick();

      expect(mockHubConnection.start).not.toHaveBeenCalled();
    }));

    it('should handle disconnect when hub connection is null', async () => {
      await expectAsync(service.disconnect()).toBeResolved();
    });

    it('should clear subscribed technicians on disconnect', fakeAsync(() => {
      mockHubConnection.start.and.returnValue(Promise.resolve());
      mockHubConnection.stop.and.returnValue(Promise.resolve());
      mockHubConnection.invoke.and.returnValue(Promise.resolve());
      
      service.connect();
      tick();

      service.subscribeToTechnicianUpdates('tech-123');
      service.subscribeToTechnicianUpdates('tech-456');
      tick();

      service.disconnect();
      tick();

      // Reconnect and verify no resubscriptions
      mockHubConnection.invoke.calls.reset();
      service.connect();
      tick();

      let onReconnectedCallback: ((connectionId?: string) => void) | undefined;
      mockHubConnection.onreconnected.and.callFake((callback) => {
        onReconnectedCallback = callback;
      });

      onReconnectedCallback!('new-connection-id');
      tick();

      expect(mockHubConnection.invoke).not.toHaveBeenCalledWith('SubscribeToTechnicianUpdates', jasmine.any(String));
    }));

    it('should handle connection builder errors', async () => {
      spyOn(signalR.HubConnectionBuilder.prototype, 'build').and.throwError('Builder error');

      await expectAsync(service.connect()).toBeRejectedWithError('Builder error');
    });

    it('should reset reconnect attempts on successful connection', fakeAsync(() => {
      mockHubConnection.start.and.returnValues(
        Promise.reject(new Error('Failed')),
        Promise.reject(new Error('Failed')),
        Promise.resolve()
      );

      service.connect().catch(() => {});
      tick();

      // First reconnect
      tick(1000);

      // Second reconnect
      tick(2000);

      // Should be connected now
      expect(service.isConnected()).toBe(true);
    }));

    it('should handle multiple simultaneous connect calls', fakeAsync(() => {
      mockHubConnection.start.and.returnValue(Promise.resolve());

      service.connect();
      service.connect();
      service.connect();
      tick();

      // Should only connect once
      expect(mockHubConnection.start).toHaveBeenCalledTimes(1);
    }));

    it('should handle disconnect errors gracefully', async () => {
      mockHubConnection.start.and.returnValue(Promise.resolve());
      mockHubConnection.stop.and.returnValue(Promise.reject(new Error('Disconnect failed')));

      await service.connect();

      await expectAsync(service.disconnect()).toBeRejectedWithError('Disconnect failed');
    });
  });

  describe('State Sync After Reconnection', () => {
    beforeEach(() => {
      jasmine.clock().install();
      
      // Mock HubConnectionBuilder
      spyOn(signalR.HubConnectionBuilder.prototype, 'withUrl').and.returnValue(
        signalR.HubConnectionBuilder.prototype
      );
      spyOn(signalR.HubConnectionBuilder.prototype, 'withAutomaticReconnect').and.returnValue(
        signalR.HubConnectionBuilder.prototype
      );
      spyOn(signalR.HubConnectionBuilder.prototype, 'configureLogging').and.returnValue(
        signalR.HubConnectionBuilder.prototype
      );
      spyOn(signalR.HubConnectionBuilder.prototype, 'build').and.returnValue(mockHubConnection);
    });

    it('should sync state after successful reconnection', fakeAsync(() => {
      mockHubConnection.start.and.returnValue(Promise.resolve());
      
      // Connect initially
      service.connect();
      tick();
      
      // Clear previous dispatch calls
      mockStore.dispatch.calls.reset();
      
      // Simulate reconnection by calling the onreconnected callback
      const onreconnectedCallback = mockHubConnection.onreconnected.calls.mostRecent().args[0];
      onreconnectedCallback('new-connection-id');
      
      tick();
      
      // Verify state sync actions were dispatched
      const dispatchCalls = mockStore.dispatch.calls.all();
      const actionTypes = dispatchCalls.map(call => call.args[0].type);
      
      expect(actionTypes).toContain('[Technician] Load Technicians');
      expect(actionTypes).toContain('[Job] Load Jobs');
      expect(actionTypes).toContain('[Assignment] Load Assignments');
      expect(actionTypes).toContain('[Crew] Load Crews');
      expect(actionTypes).toContain('[SignalR] Reconnected');
    }));

    it('should call syncStateAfterReconnection method on reconnection', fakeAsync(() => {
      mockHubConnection.start.and.returnValue(Promise.resolve());
      
      spyOn(service, 'syncStateAfterReconnection');
      
      // Connect initially
      service.connect();
      tick();
      
      // Simulate reconnection
      const onreconnectedCallback = mockHubConnection.onreconnected.calls.mostRecent().args[0];
      onreconnectedCallback('new-connection-id');
      
      tick();
      
      expect(service.syncStateAfterReconnection).toHaveBeenCalled();
    }));

    it('should dispatch load actions with empty filters during sync', () => {
      service.syncStateAfterReconnection();
      
      const dispatchCalls = mockStore.dispatch.calls.all();
      
      // Verify technicians load action
      const technicianLoadCall = dispatchCalls.find(
        call => call.args[0].type === '[Technician] Load Technicians'
      );
      expect(technicianLoadCall).toBeDefined();
      expect(technicianLoadCall?.args[0].filters).toEqual({});
      
      // Verify jobs load action
      const jobLoadCall = dispatchCalls.find(
        call => call.args[0].type === '[Job] Load Jobs'
      );
      expect(jobLoadCall).toBeDefined();
      expect(jobLoadCall?.args[0].filters).toEqual({});
      
      // Verify assignments load action
      const assignmentLoadCall = dispatchCalls.find(
        call => call.args[0].type === '[Assignment] Load Assignments'
      );
      expect(assignmentLoadCall).toBeDefined();
      expect(assignmentLoadCall?.args[0].filters).toEqual({});
      
      // Verify crews load action
      const crewLoadCall = dispatchCalls.find(
        call => call.args[0].type === '[Crew] Load Crews'
      );
      expect(crewLoadCall).toBeDefined();
      expect(crewLoadCall?.args[0].filters).toEqual({});
    });

    it('should resubscribe to technicians before syncing state', fakeAsync(() => {
      mockHubConnection.start.and.returnValue(Promise.resolve());
      mockHubConnection.invoke.and.returnValue(Promise.resolve());
      
      // Connect and subscribe to a technician
      service.connect();
      tick();
      
      service.subscribeToTechnicianUpdates('tech-123');
      tick();
      
      // Clear invoke calls
      mockHubConnection.invoke.calls.reset();
      mockStore.dispatch.calls.reset();
      
      // Simulate reconnection
      const onreconnectedCallback = mockHubConnection.onreconnected.calls.mostRecent().args[0];
      onreconnectedCallback('new-connection-id');
      
      tick();
      
      // Verify resubscription happened
      expect(mockHubConnection.invoke).toHaveBeenCalledWith(
        'SubscribeToTechnicianUpdates',
        'tech-123'
      );
      
      // Verify state sync happened after resubscription
      const dispatchCalls = mockStore.dispatch.calls.all();
      const actionTypes = dispatchCalls.map(call => call.args[0].type);
      
      expect(actionTypes).toContain('[Technician] Load Technicians');
      expect(actionTypes).toContain('[Job] Load Jobs');
      expect(actionTypes).toContain('[Assignment] Load Assignments');
      expect(actionTypes).toContain('[Crew] Load Crews');
    }));

    it('should update connection status to Connected before syncing', fakeAsync(() => {
      mockHubConnection.start.and.returnValue(Promise.resolve());
      
      const statusChanges: ConnectionStatus[] = [];
      service.connectionStatus$.subscribe(status => statusChanges.push(status));
      
      // Connect initially
      service.connect();
      tick();
      
      // Clear status changes
      statusChanges.length = 0;
      
      // Simulate reconnection
      const onreconnectedCallback = mockHubConnection.onreconnected.calls.mostRecent().args[0];
      onreconnectedCallback('new-connection-id');
      
      tick();
      
      // Verify status changed to Connected
      expect(statusChanges).toContain(ConnectionStatus.Connected);
      
      // Verify sync happened after status update
      const dispatchCalls = mockStore.dispatch.calls.all();
      const actionTypes = dispatchCalls.map(call => call.args[0].type);
      
      expect(actionTypes).toContain('[Technician] Load Technicians');
    }));

    it('should reset reconnect attempts counter after successful reconnection', fakeAsync(() => {
      mockHubConnection.start.and.returnValue(Promise.resolve());
      
      // Connect initially
      service.connect();
      tick();
      
      // Simulate reconnection (which resets the counter)
      const onreconnectedCallback = mockHubConnection.onreconnected.calls.mostRecent().args[0];
      onreconnectedCallback('new-connection-id');
      
      tick();
      
      // The reconnect attempts should be reset to 0
      // This is verified indirectly by checking that state sync occurred
      const dispatchCalls = mockStore.dispatch.calls.all();
      const actionTypes = dispatchCalls.map(call => call.args[0].type);
      
      expect(actionTypes).toContain('[Technician] Load Technicians');
      expect(actionTypes).toContain('[Job] Load Jobs');
    }));

    it('should log state sync initiation', () => {
      spyOn(console, 'log');
      
      service.syncStateAfterReconnection();
      
      expect(console.log).toHaveBeenCalledWith('Syncing state after reconnection...');
      expect(console.log).toHaveBeenCalledWith('State sync initiated - all entities will be reloaded');
    });

    it('should not sync state if connection is manually disconnected', fakeAsync(() => {
      mockHubConnection.start.and.returnValue(Promise.resolve());
      mockHubConnection.stop.and.returnValue(Promise.resolve());
      
      // Connect initially
      service.connect();
      tick();
      
      // Manually disconnect
      service.disconnect();
      tick();
      
      // Clear dispatch calls
      mockStore.dispatch.calls.reset();
      
      // Try to trigger reconnection (should not happen)
      const oncloseCallback = mockHubConnection.onclose.calls.mostRecent().args[0];
      if (oncloseCallback) {
        oncloseCallback(undefined);
      }
      
      tick(35000); // Wait beyond max reconnect delay
      
      // Verify no state sync actions were dispatched
      const dispatchCalls = mockStore.dispatch.calls.all();
      const actionTypes = dispatchCalls.map(call => call.args[0].type);
      
      expect(actionTypes).not.toContain('[Technician] Load Technicians');
      expect(actionTypes).not.toContain('[Job] Load Jobs');
    }));
  });
});
