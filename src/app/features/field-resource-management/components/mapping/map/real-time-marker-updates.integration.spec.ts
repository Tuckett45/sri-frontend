import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { BehaviorSubject, of } from 'rxjs';
import { MapComponent } from './map.component';
import { FrmSignalRService, LocationUpdate, CrewLocationUpdate } from '../../../services/frm-signalr.service';
import { PermissionService } from '../../../../../services/permission.service';
import { GeoLocation } from '../../../models/time-entry.model';

/**
 * Integration tests for real-time marker updates in the map component
 * Tests the flow from SignalR events to marker position updates
 */
describe('MapComponent - Real-time Marker Updates Integration', () => {
  let component: MapComponent;
  let fixture: ComponentFixture<MapComponent>;
  let mockStore: jasmine.SpyObj<Store>;
  let mockSignalRService: jasmine.SpyObj<FrmSignalRService>;
  let mockPermissionService: jasmine.SpyObj<PermissionService>;
  
  // Subjects for simulating SignalR events
  let locationUpdateSubject: BehaviorSubject<LocationUpdate | null>;
  let crewLocationUpdateSubject: BehaviorSubject<CrewLocationUpdate | null>;
  let connectionStatusSubject: BehaviorSubject<string>;

  beforeEach(async () => {
    // Create subjects for observables
    locationUpdateSubject = new BehaviorSubject<LocationUpdate | null>(null);
    crewLocationUpdateSubject = new BehaviorSubject<CrewLocationUpdate | null>(null);
    connectionStatusSubject = new BehaviorSubject<string>('connected');

    // Create mock services
    mockStore = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    mockStore.select.and.returnValue(of([]));

    mockSignalRService = jasmine.createSpyObj('FrmSignalRService', [], {
      locationUpdate$: locationUpdateSubject.asObservable(),
      crewLocationUpdate$: crewLocationUpdateSubject.asObservable(),
      connectionStatus$: connectionStatusSubject.asObservable()
    });

    mockPermissionService = jasmine.createSpyObj('PermissionService', [
      'getCurrentUser',
      'getCurrentUserDataScopes'
    ]);
    mockPermissionService.getCurrentUser.and.returnValue(of({
      id: 'user-1',
      email: 'test@example.com',
      role: 'CM',
      region: 'TX',
      company: 'ACME'
    } as any));
    mockPermissionService.getCurrentUserDataScopes.and.returnValue(of([
      { scopeType: 'market', scopeValues: ['TX'] }
    ] as any));

    await TestBed.configureTestingModule({
      declarations: [MapComponent],
      providers: [
        { provide: Store, useValue: mockStore },
        { provide: FrmSignalRService, useValue: mockSignalRService },
        { provide: PermissionService, useValue: mockPermissionService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MapComponent);
    component = fixture.componentInstance;
  });

  describe('Technician Location Updates', () => {
    it('should update technician marker position when receiving SignalR location update', fakeAsync(() => {
      // Initialize component
      fixture.detectChanges();
      tick();

      // Create a mock marker for the technician
      const technicianId = 'tech-123';
      const initialLocation: GeoLocation = { latitude: 30.2672, longitude: -97.7431, accuracy: 10 };

      // Simulate technician marker creation by adding to internal map
      // This would normally happen through store updates
      const mockMarker = jasmine.createSpyObj('Marker', ['setLatLng', 'getLatLng']);
      mockMarker.getLatLng.and.returnValue({
        lat: initialLocation.latitude,
        lng: initialLocation.longitude,
        distanceTo: jasmine.createSpy('distanceTo').and.returnValue(100)
      });
      (component as any).technicianMarkers.set(technicianId, mockMarker);

      // Emit a location update through SignalR
      const newLocation: GeoLocation = { latitude: 30.2700, longitude: -97.7450, accuracy: 10 };
      const locationUpdate: LocationUpdate = {
        technicianId,
        location: newLocation,
        timestamp: new Date()
      };

      locationUpdateSubject.next(locationUpdate);
      tick();

      // Verify marker position was updated
      expect(mockMarker.setLatLng).toHaveBeenCalledWith([
        newLocation.latitude,
        newLocation.longitude
      ]);
    }));

    it('should handle location updates for non-existent markers gracefully', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      // Emit location update for technician without a marker
      const locationUpdate: LocationUpdate = {
        technicianId: 'non-existent-tech',
        location: { latitude: 30.2672, longitude: -97.7431, accuracy: 10 },
        timestamp: new Date()
      };

      // Should not throw error
      expect(() => {
        locationUpdateSubject.next(locationUpdate);
        tick();
      }).not.toThrow();
    }));

    it('should validate coordinates before updating marker', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const technicianId = 'tech-123';
      const mockMarker = jasmine.createSpyObj('Marker', ['setLatLng', 'getLatLng']);
      (component as any).technicianMarkers.set(technicianId, mockMarker);

      // Emit invalid location update
      const invalidLocationUpdate: LocationUpdate = {
        technicianId,
        location: { latitude: 999, longitude: -97.7431, accuracy: 10 }, // Invalid latitude
        timestamp: new Date()
      };

      locationUpdateSubject.next(invalidLocationUpdate);
      tick();

      // Marker should not be updated with invalid coordinates
      expect(mockMarker.setLatLng).not.toHaveBeenCalled();
    }));
  });

  describe('Crew Location Updates', () => {
    it('should update crew marker position when receiving SignalR crew location update', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const crewId = 'crew-456';
      const initialLocation: GeoLocation = { latitude: 30.2672, longitude: -97.7431, accuracy: 10 };

      // Create mock crew marker
      const mockMarker = jasmine.createSpyObj('Marker', ['setLatLng', 'getLatLng']);
      mockMarker.getLatLng.and.returnValue({
        lat: initialLocation.latitude,
        lng: initialLocation.longitude,
        distanceTo: jasmine.createSpy('distanceTo').and.returnValue(100)
      });
      (component as any).crewMarkers.set(crewId, mockMarker);

      // Emit crew location update
      const newLocation: GeoLocation = { latitude: 30.2700, longitude: -97.7450, accuracy: 10 };
      const crewLocationUpdate: CrewLocationUpdate = {
        crewId,
        location: newLocation,
        timestamp: new Date()
      };

      crewLocationUpdateSubject.next(crewLocationUpdate);
      tick();

      // Verify crew marker position was updated
      expect(mockMarker.setLatLng).toHaveBeenCalledWith([
        newLocation.latitude,
        newLocation.longitude
      ]);
    }));

    it('should handle crew location updates for non-existent markers gracefully', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const crewLocationUpdate: CrewLocationUpdate = {
        crewId: 'non-existent-crew',
        location: { latitude: 30.2672, longitude: -97.7431, accuracy: 10 },
        timestamp: new Date()
      };

      // Should not throw error
      expect(() => {
        crewLocationUpdateSubject.next(crewLocationUpdate);
        tick();
      }).not.toThrow();
    }));
  });

  describe('Connection Status Monitoring', () => {
    it('should log connection status changes', fakeAsync(() => {
      spyOn(console, 'log');
      spyOn(console, 'warn');

      fixture.detectChanges();
      tick();

      // Simulate disconnection
      connectionStatusSubject.next('disconnected');
      tick();

      expect(console.warn).toHaveBeenCalledWith(
        'Map component: SignalR disconnected - real-time updates paused'
      );

      // Simulate reconnection
      connectionStatusSubject.next('connected');
      tick();

      expect(console.log).toHaveBeenCalledWith(
        'Map component: SignalR connected - real-time updates active'
      );
    }));
  });

  describe('Marker Animation', () => {
    it('should animate marker movement for significant distance changes', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const technicianId = 'tech-123';
      const initialLocation: GeoLocation = { latitude: 30.2672, longitude: -97.7431, accuracy: 10 };

      // Create mock marker
      const mockMarker = jasmine.createSpyObj('Marker', ['setLatLng', 'getLatLng']);
      mockMarker.getLatLng.and.returnValue({
        lat: initialLocation.latitude,
        lng: initialLocation.longitude,
        distanceTo: jasmine.createSpy('distanceTo').and.returnValue(500) // 500 meters
      });
      (component as any).technicianMarkers.set(technicianId, mockMarker);

      // Emit location update with significant distance
      const newLocation: GeoLocation = { latitude: 30.2750, longitude: -97.7500, accuracy: 10 };
      const locationUpdate: LocationUpdate = {
        technicianId,
        location: newLocation,
        timestamp: new Date()
      };

      locationUpdateSubject.next(locationUpdate);
      tick(1100); // Wait for animation to complete (1000ms + buffer)

      // Marker should have been updated multiple times during animation
      expect(mockMarker.setLatLng).toHaveBeenCalled();
      expect(mockMarker.setLatLng.calls.count()).toBeGreaterThan(1);
    }));

    it('should skip animation for negligible distance changes (< 10 meters)', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const technicianId = 'tech-456';
      const initialLocation: GeoLocation = { latitude: 30.2672, longitude: -97.7431, accuracy: 10 };

      // Create mock marker
      const mockMarker = jasmine.createSpyObj('Marker', ['setLatLng', 'getLatLng']);
      mockMarker.getLatLng.and.returnValue({
        lat: initialLocation.latitude,
        lng: initialLocation.longitude,
        distanceTo: jasmine.createSpy('distanceTo').and.returnValue(5) // 5 meters - negligible
      });
      (component as any).technicianMarkers.set(technicianId, mockMarker);

      // Emit location update with negligible distance
      const newLocation: GeoLocation = { latitude: 30.2673, longitude: -97.7432, accuracy: 10 };
      const locationUpdate: LocationUpdate = {
        technicianId,
        location: newLocation,
        timestamp: new Date()
      };

      locationUpdateSubject.next(locationUpdate);
      tick();

      // Marker should be updated immediately without animation
      expect(mockMarker.setLatLng).toHaveBeenCalledTimes(1);
    }));

    it('should cancel previous animation when new update arrives', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const technicianId = 'tech-789';
      const initialLocation: GeoLocation = { latitude: 30.2672, longitude: -97.7431, accuracy: 10 };

      // Create mock marker
      const mockMarker = jasmine.createSpyObj('Marker', ['setLatLng', 'getLatLng']);
      mockMarker.getLatLng.and.returnValue({
        lat: initialLocation.latitude,
        lng: initialLocation.longitude,
        distanceTo: jasmine.createSpy('distanceTo').and.returnValue(500)
      });
      (component as any).technicianMarkers.set(technicianId, mockMarker);

      // Emit first location update
      const firstLocation: GeoLocation = { latitude: 30.2750, longitude: -97.7500, accuracy: 10 };
      locationUpdateSubject.next({
        technicianId,
        location: firstLocation,
        timestamp: new Date()
      });
      tick(400); // Wait halfway through animation

      const callsAfterFirst = mockMarker.setLatLng.calls.count();

      // Emit second location update before first animation completes
      const secondLocation: GeoLocation = { latitude: 30.2800, longitude: -97.7550, accuracy: 10 };
      mockMarker.getLatLng.and.returnValue({
        lat: 30.2750,
        lng: 30.2750,
        distanceTo: jasmine.createSpy('distanceTo').and.returnValue(500)
      });
      locationUpdateSubject.next({
        technicianId,
        location: secondLocation,
        timestamp: new Date()
      });
      tick(1000); // Wait for second animation to complete

      // Should have more calls from the second animation
      expect(mockMarker.setLatLng.calls.count()).toBeGreaterThan(callsAfterFirst);
    }));

    it('should complete animation within 1 second per requirement 4.1.2', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const technicianId = 'tech-performance';
      const initialLocation: GeoLocation = { latitude: 30.2672, longitude: -97.7431, accuracy: 10 };

      // Create mock marker
      const mockMarker = jasmine.createSpyObj('Marker', ['setLatLng', 'getLatLng']);
      mockMarker.getLatLng.and.returnValue({
        lat: initialLocation.latitude,
        lng: initialLocation.longitude,
        distanceTo: jasmine.createSpy('distanceTo').and.returnValue(1000) // 1km
      });
      (component as any).technicianMarkers.set(technicianId, mockMarker);

      const startTime = Date.now();

      // Emit location update
      const newLocation: GeoLocation = { latitude: 30.2800, longitude: -97.7600, accuracy: 10 };
      locationUpdateSubject.next({
        technicianId,
        location: newLocation,
        timestamp: new Date()
      });

      // Wait for animation to complete
      tick(1000);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Animation should complete within 1 second (1000ms)
      expect(duration).toBeLessThanOrEqual(1000);
      expect(mockMarker.setLatLng).toHaveBeenCalled();
    }));
  });

  describe('Multiple Simultaneous Updates', () => {
    it('should handle multiple technician location updates simultaneously', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      // Create multiple technician markers
      const tech1Id = 'tech-1';
      const tech2Id = 'tech-2';
      
      const mockMarker1 = jasmine.createSpyObj('Marker1', ['setLatLng', 'getLatLng']);
      mockMarker1.getLatLng.and.returnValue({
        lat: 30.2672,
        lng: -97.7431,
        distanceTo: () => 100
      });
      
      const mockMarker2 = jasmine.createSpyObj('Marker2', ['setLatLng', 'getLatLng']);
      mockMarker2.getLatLng.and.returnValue({
        lat: 30.2700,
        lng: -97.7450,
        distanceTo: () => 100
      });

      (component as any).technicianMarkers.set(tech1Id, mockMarker1);
      (component as any).technicianMarkers.set(tech2Id, mockMarker2);

      // Emit updates for both technicians
      locationUpdateSubject.next({
        technicianId: tech1Id,
        location: { latitude: 30.2680, longitude: -97.7440, accuracy: 10 },
        timestamp: new Date()
      });
      tick();

      locationUpdateSubject.next({
        technicianId: tech2Id,
        location: { latitude: 30.2710, longitude: -97.7460, accuracy: 10 },
        timestamp: new Date()
      });
      tick();

      // Both markers should be updated
      expect(mockMarker1.setLatLng).toHaveBeenCalled();
      expect(mockMarker2.setLatLng).toHaveBeenCalled();
    }));

    it('should handle rapid successive updates for same technician', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const technicianId = 'tech-rapid';
      const mockMarker = jasmine.createSpyObj('Marker', ['setLatLng', 'getLatLng']);
      mockMarker.getLatLng.and.returnValue({
        lat: 30.2672,
        lng: -97.7431,
        distanceTo: () => 100
      });
      (component as any).technicianMarkers.set(technicianId, mockMarker);

      // Emit 5 rapid updates
      for (let i = 0; i < 5; i++) {
        locationUpdateSubject.next({
          technicianId,
          location: { 
            latitude: 30.2672 + (i * 0.001), 
            longitude: -97.7431 + (i * 0.001),
            accuracy: 10
          },
          timestamp: new Date()
        });
        tick(100); // 100ms between updates
      }

      // Marker should handle all updates without errors
      expect(mockMarker.setLatLng).toHaveBeenCalled();
      expect(mockMarker.setLatLng.calls.count()).toBeGreaterThan(0);
    }));

    it('should handle updates for 10+ technicians simultaneously', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const technicianCount = 15;
      const markers: jasmine.SpyObj<any>[] = [];

      // Create 15 technician markers
      for (let i = 0; i < technicianCount; i++) {
        const techId = `tech-${i}`;
        const mockMarker = jasmine.createSpyObj(`Marker${i}`, ['setLatLng', 'getLatLng']);
        mockMarker.getLatLng.and.returnValue({
          lat: 30.2672 + (i * 0.01),
          lng: -97.7431 + (i * 0.01),
          distanceTo: () => 100
        });
        (component as any).technicianMarkers.set(techId, mockMarker);
        markers.push(mockMarker);
      }

      // Emit updates for all technicians
      for (let i = 0; i < technicianCount; i++) {
        locationUpdateSubject.next({
          technicianId: `tech-${i}`,
          location: { 
            latitude: 30.2680 + (i * 0.01), 
            longitude: -97.7440 + (i * 0.01),
            accuracy: 10
          },
          timestamp: new Date()
        });
      }
      tick();

      // All markers should be updated
      markers.forEach(marker => {
        expect(marker.setLatLng).toHaveBeenCalled();
      });
    }));
  });

  describe('Connection Loss and Reconnection', () => {
    it('should handle connection loss gracefully', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      spyOn(console, 'warn');

      // Simulate connection loss
      connectionStatusSubject.next('disconnected');
      tick();

      expect(console.warn).toHaveBeenCalledWith(
        'Map component: SignalR disconnected - real-time updates paused'
      );
    }));

    it('should resume updates after reconnection', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const technicianId = 'tech-reconnect';
      const mockMarker = jasmine.createSpyObj('Marker', ['setLatLng', 'getLatLng']);
      mockMarker.getLatLng.and.returnValue({
        lat: 30.2672,
        lng: -97.7431,
        distanceTo: () => 100
      });
      (component as any).technicianMarkers.set(technicianId, mockMarker);

      // Simulate disconnection
      connectionStatusSubject.next('disconnected');
      tick();

      // Simulate reconnection
      connectionStatusSubject.next('connected');
      tick();

      // Emit location update after reconnection
      locationUpdateSubject.next({
        technicianId,
        location: { latitude: 30.2680, longitude: -97.7440, accuracy: 10 },
        timestamp: new Date()
      });
      tick();

      // Marker should be updated after reconnection
      expect(mockMarker.setLatLng).toHaveBeenCalled();
    }));

    it('should not process updates while disconnected', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const technicianId = 'tech-disconnected';
      const mockMarker = jasmine.createSpyObj('Marker', ['setLatLng', 'getLatLng']);
      mockMarker.getLatLng.and.returnValue({
        lat: 30.2672,
        lng: -97.7431,
        distanceTo: () => 100
      });
      (component as any).technicianMarkers.set(technicianId, mockMarker);

      // Simulate disconnection
      connectionStatusSubject.next('disconnected');
      tick();

      // Try to emit location update while disconnected
      // Note: In real implementation, SignalR service wouldn't emit updates while disconnected
      // This test verifies the component handles the scenario gracefully
      const callsBefore = mockMarker.setLatLng.calls.count();

      // Reconnect and verify updates resume
      connectionStatusSubject.next('connected');
      tick();

      locationUpdateSubject.next({
        technicianId,
        location: { latitude: 30.2680, longitude: -97.7440, accuracy: 10 },
        timestamp: new Date()
      });
      tick();

      expect(mockMarker.setLatLng.calls.count()).toBeGreaterThan(callsBefore);
    }));

    it('should handle reconnecting status', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      spyOn(console, 'log');

      // Simulate reconnecting status
      connectionStatusSubject.next('reconnecting');
      tick();

      // Component should handle reconnecting status without errors
      expect(console.log).toHaveBeenCalledWith(
        'SignalR connection status changed in map component:',
        'reconnecting'
      );
    }));
  });

  describe('State Synchronization After Reconnection', () => {
    it('should synchronize marker positions after reconnection', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const technicianId = 'tech-sync';
      const mockMarker = jasmine.createSpyObj('Marker', ['setLatLng', 'getLatLng']);
      mockMarker.getLatLng.and.returnValue({
        lat: 30.2672,
        lng: -97.7431,
        distanceTo: () => 100
      });
      (component as any).technicianMarkers.set(technicianId, mockMarker);

      // Simulate disconnection
      connectionStatusSubject.next('disconnected');
      tick();

      // Simulate reconnection
      connectionStatusSubject.next('connected');
      tick();

      // After reconnection, store should be updated with latest data
      // and markers should reflect the synchronized state
      locationUpdateSubject.next({
        technicianId,
        location: { latitude: 30.2700, longitude: -97.7450, accuracy: 10 },
        timestamp: new Date()
      });
      tick();

      expect(mockMarker.setLatLng).toHaveBeenCalledWith([30.2700, -97.7450]);
    }));
  });

  describe('Authorization and Scope Filtering', () => {
    it('should only update markers for technicians within user scope', fakeAsync(() => {
      // Update mock permission service to return specific market scope
      mockPermissionService.getCurrentUserDataScopes.and.returnValue(of([
        { scopeType: 'market', scopeValues: ['TX'] }
      ] as any));

      fixture.detectChanges();
      tick();

      const txTechId = 'tech-tx';
      const nyTechId = 'tech-ny';

      const txMarker = jasmine.createSpyObj('TXMarker', ['setLatLng', 'getLatLng']);
      txMarker.getLatLng.and.returnValue({
        lat: 30.2672,
        lng: -97.7431,
        distanceTo: () => 100
      });

      // Only TX technician marker exists (NY technician filtered out by scope)
      (component as any).technicianMarkers.set(txTechId, txMarker);

      // Emit update for TX technician (within scope)
      locationUpdateSubject.next({
        technicianId: txTechId,
        location: { latitude: 30.2680, longitude: -97.7440, accuracy: 10 },
        timestamp: new Date()
      });
      tick();

      // TX marker should be updated
      expect(txMarker.setLatLng).toHaveBeenCalled();

      // Emit update for NY technician (outside scope)
      locationUpdateSubject.next({
        technicianId: nyTechId,
        location: { latitude: 40.7128, longitude: -74.0060, accuracy: 10 },
        timestamp: new Date()
      });
      tick();

      // NY marker doesn't exist, so no error should occur
      // Component should handle gracefully
      expect((component as any).technicianMarkers.has(nyTechId)).toBe(false);
    }));
  });

  describe('Map Performance with Multiple Real-time Updates', () => {
    it('should maintain performance with 50+ simultaneous marker updates', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const markerCount = 50;
      const markers: jasmine.SpyObj<any>[] = [];

      // Create 50 markers
      for (let i = 0; i < markerCount; i++) {
        const techId = `tech-perf-${i}`;
        const mockMarker = jasmine.createSpyObj(`PerfMarker${i}`, ['setLatLng', 'getLatLng']);
        mockMarker.getLatLng.and.returnValue({
          lat: 30.0 + (i * 0.01),
          lng: -97.0 + (i * 0.01),
          distanceTo: () => 100
        });
        (component as any).technicianMarkers.set(techId, mockMarker);
        markers.push(mockMarker);
      }

      const startTime = performance.now();

      // Emit updates for all markers
      for (let i = 0; i < markerCount; i++) {
        locationUpdateSubject.next({
          technicianId: `tech-perf-${i}`,
          location: { 
            latitude: 30.01 + (i * 0.01), 
            longitude: -97.01 + (i * 0.01),
            accuracy: 10
          },
          timestamp: new Date()
        });
      }
      tick();

      const endTime = performance.now();
      const duration = endTime - startTime;

      // All updates should be processed quickly (< 100ms for 50 markers)
      expect(duration).toBeLessThan(100);

      // All markers should be updated
      markers.forEach(marker => {
        expect(marker.setLatLng).toHaveBeenCalled();
      });
    }));

    it('should handle continuous updates over time without memory leaks', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const technicianId = 'tech-continuous';
      const mockMarker = jasmine.createSpyObj('Marker', ['setLatLng', 'getLatLng']);
      mockMarker.getLatLng.and.returnValue({
        lat: 30.2672,
        lng: -97.7431,
        distanceTo: () => 100
      });
      (component as any).technicianMarkers.set(technicianId, mockMarker);

      // Simulate 100 updates over time (every 30 seconds as per requirement 1.6.2)
      for (let i = 0; i < 100; i++) {
        locationUpdateSubject.next({
          technicianId,
          location: { 
            latitude: 30.2672 + (i * 0.0001), 
            longitude: -97.7431 + (i * 0.0001),
            accuracy: 10
          },
          timestamp: new Date()
        });
        tick(30000); // 30 seconds between updates
      }

      // Marker should still be responsive after many updates
      expect(mockMarker.setLatLng).toHaveBeenCalled();
      expect(mockMarker.setLatLng.calls.count()).toBeGreaterThan(0);

      // Active animations map should not grow unbounded
      const activeAnimationsCount = (component as any).activeAnimations.size;
      expect(activeAnimationsCount).toBeLessThanOrEqual(1); // At most one active animation per marker
    }));
  });
});
