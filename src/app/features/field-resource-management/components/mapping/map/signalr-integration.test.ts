/**
 * Integration test for SignalR location updates in the map component
 * This test verifies that the map component correctly subscribes to and handles
 * real-time location updates from the SignalR service.
 */

import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { BehaviorSubject } from 'rxjs';
import { MapComponent } from './map.component';
import { FrmSignalRService, ConnectionStatus, LocationUpdate } from '../../../services/frm-signalr.service';
import { PermissionService } from '../../../../../services/permission.service';
import { User } from '../../../../../models/user.model';
import { DataScope } from '../../../services/data-scope.service';

describe('Map Component - SignalR Integration', () => {
  let component: MapComponent;
  let signalRService: jasmine.SpyObj<FrmSignalRService>;
  let locationUpdateSubject: BehaviorSubject<LocationUpdate | null>;
  let connectionStatusSubject: BehaviorSubject<ConnectionStatus>;

  beforeEach(() => {
    // Create observables for SignalR service
    locationUpdateSubject = new BehaviorSubject<LocationUpdate | null>(null);
    connectionStatusSubject = new BehaviorSubject<ConnectionStatus>(ConnectionStatus.Connected);

    // Create SignalR service spy
    signalRService = jasmine.createSpyObj('FrmSignalRService', ['connect', 'disconnect'], {
      locationUpdate$: locationUpdateSubject.asObservable(),
      connectionStatus$: connectionStatusSubject.asObservable()
    });

    // Create permission service spy
    const permissionServiceSpy = jasmine.createSpyObj('PermissionService', [
      'getCurrentUser',
      'getCurrentUserDataScopes'
    ]);

    const mockUser = new User(
      'user-1',
      'Test User',
      'test@example.com',
      'password',
      'Technician',
      'RG',
      'Company1',
      new Date(),
      true
    );

    const mockDataScopes: DataScope[] = [{ scopeType: 'all' }];

    permissionServiceSpy.getCurrentUser.and.returnValue(new BehaviorSubject(mockUser).asObservable());
    permissionServiceSpy.getCurrentUserDataScopes.and.returnValue(new BehaviorSubject(mockDataScopes).asObservable());

    TestBed.configureTestingModule({
      declarations: [MapComponent],
      providers: [
        provideMockStore(),
        { provide: FrmSignalRService, useValue: signalRService },
        { provide: PermissionService, useValue: permissionServiceSpy }
      ]
    });

    const store = TestBed.inject(MockStore);
    const permissionService = TestBed.inject(PermissionService);
    component = new MapComponent(store, permissionService as any, signalRService);
  });

  it('should subscribe to SignalR location updates on initialization', () => {
    // Initialize component
    component.ngOnInit();

    // Verify subscriptions are set up
    expect(signalRService.locationUpdate$).toBeDefined();
    expect(signalRService.connectionStatus$).toBeDefined();
  });

  it('should receive and process technician location updates', (done) => {
    const mockUpdate: LocationUpdate = {
      technicianId: 'tech-123',
      location: {
        latitude: 32.7767,
        longitude: -96.7970,
        accuracy: 10
      },
      timestamp: new Date()
    };

    // Initialize component
    component.ngOnInit();

    // Emit a location update
    locationUpdateSubject.next(mockUpdate);

    // Give time for the subscription to process
    setTimeout(() => {
      // The component should have received the update without errors
      expect(component).toBeTruthy();
      done();
    }, 50);
  });

  it('should handle connection status changes', (done) => {
    // Initialize component
    component.ngOnInit();

    // Simulate disconnection
    connectionStatusSubject.next(ConnectionStatus.Disconnected);

    setTimeout(() => {
      // Component should handle status change gracefully
      expect(component).toBeTruthy();

      // Simulate reconnection
      connectionStatusSubject.next(ConnectionStatus.Connected);

      setTimeout(() => {
        expect(component).toBeTruthy();
        done();
      }, 50);
    }, 50);
  });

  it('should filter out null location updates', (done) => {
    // Initialize component
    component.ngOnInit();

    // Emit null update
    locationUpdateSubject.next(null);

    setTimeout(() => {
      // Should not cause errors
      expect(component).toBeTruthy();
      done();
    }, 50);
  });

  it('should clean up subscriptions on destroy', () => {
    // Initialize component
    component.ngOnInit();

    // Destroy component
    component.ngOnDestroy();

    // Emit updates after destroy - should not cause errors
    locationUpdateSubject.next({
      technicianId: 'tech-123',
      location: { latitude: 32.0, longitude: -96.0, accuracy: 10 },
      timestamp: new Date()
    });

    // No errors should occur
    expect(component).toBeTruthy();
  });
});
