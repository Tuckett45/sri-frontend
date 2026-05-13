import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { of, throwError, from } from 'rxjs';
import { LocationTrackingToggleComponent } from './location-tracking-toggle.component';
import { GeolocationService, GeolocationError, GeolocationErrorType } from '../../../services/geolocation.service';
import { GeoLocation } from '../../../models/time-entry.model';

describe('LocationTrackingToggleComponent', () => {
  let component: LocationTrackingToggleComponent;
  let fixture: ComponentFixture<LocationTrackingToggleComponent>;
  let geolocationService: jasmine.SpyObj<GeolocationService>;

  const mockLocation: GeoLocation = {
    latitude: 37.7749,
    longitude: -122.4194,
    accuracy: 10
  };

  const mockError: GeolocationError = {
    type: GeolocationErrorType.PermissionDenied,
    message: 'Location permission denied'
  };

  beforeEach(async () => {
    const geolocationServiceSpy = jasmine.createSpyObj('GeolocationService', [
      'isGeolocationSupported',
      'requestPermission',
      'getCurrentPositionWithFallback',
      'clearWatch',
      'formatLocation'
    ]);

    await TestBed.configureTestingModule({
      declarations: [LocationTrackingToggleComponent],
      imports: [
        MatSlideToggleModule,
        MatIconModule,
        FormsModule
      ],
      providers: [
        { provide: GeolocationService, useValue: geolocationServiceSpy }
      ]
    }).compileComponents();

    geolocationService = TestBed.inject(GeolocationService) as jasmine.SpyObj<GeolocationService>;
    fixture = TestBed.createComponent(LocationTrackingToggleComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    // Clean up any intervals
    if (component['updateIntervalId']) {
      clearInterval(component['updateIntervalId']);
    }
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should check if geolocation is supported on init', () => {
      geolocationService.isGeolocationSupported.and.returnValue(true);
      geolocationService.requestPermission.and.returnValue(of('granted' as PermissionState));

      component.ngOnInit();

      expect(geolocationService.isGeolocationSupported).toHaveBeenCalled();
      expect(component.isGeolocationSupported).toBe(true);
    });

    it('should handle unsupported geolocation', () => {
      geolocationService.isGeolocationSupported.and.returnValue(false);

      component.ngOnInit();

      expect(component.isGeolocationSupported).toBe(false);
      expect(component.status.error).toBeDefined();
      expect(component.status.error?.type).toBe(GeolocationErrorType.NotSupported);
    });

    it('should check permission state on init', () => {
      geolocationService.isGeolocationSupported.and.returnValue(true);
      geolocationService.requestPermission.and.returnValue(of('granted' as PermissionState));

      component.ngOnInit();

      expect(geolocationService.requestPermission).toHaveBeenCalled();
      expect(component.permissionState).toBe('granted');
    });

    it('should auto-start tracking if configured', fakeAsync(() => {
      geolocationService.isGeolocationSupported.and.returnValue(true);
      geolocationService.requestPermission.and.returnValue(of('granted' as PermissionState));
      geolocationService.getCurrentPositionWithFallback.and.returnValue(of(mockLocation));

      component.autoStart = true;
      component.ngOnInit();
      tick();

      expect(component.status.enabled).toBe(true);
      expect(component.status.currentLocation).toEqual(mockLocation);
    }));
  });

  describe('Toggle Tracking', () => {
    beforeEach(() => {
      geolocationService.isGeolocationSupported.and.returnValue(true);
      geolocationService.requestPermission.and.returnValue(of('granted' as PermissionState));
    });

    it('should start tracking when toggle is called and tracking is disabled', fakeAsync(() => {
      geolocationService.getCurrentPositionWithFallback.and.returnValue(of(mockLocation));

      component.ngOnInit();
      component.toggleTracking();
      tick();

      expect(component.status.enabled).toBe(true);
      expect(component.status.currentLocation).toEqual(mockLocation);
    }));

    it('should stop tracking when toggle is called and tracking is enabled', fakeAsync(() => {
      geolocationService.getCurrentPositionWithFallback.and.returnValue(of(mockLocation));

      component.ngOnInit();
      component.toggleTracking();
      tick();

      expect(component.status.enabled).toBe(true);

      component.toggleTracking();
      tick();

      expect(component.status.enabled).toBe(false);
    }));
  });

  describe('Start Tracking', () => {
    beforeEach(() => {
      geolocationService.isGeolocationSupported.and.returnValue(true);
      geolocationService.requestPermission.and.returnValue(of('granted' as PermissionState));
    });

    it('should get initial position and start periodic updates', fakeAsync(() => {
      geolocationService.getCurrentPositionWithFallback.and.returnValue(of(mockLocation));

      component.ngOnInit();
      component.startTracking();
      tick();

      expect(geolocationService.getCurrentPositionWithFallback).toHaveBeenCalled();
      expect(component.status.enabled).toBe(true);
      expect(component.status.currentLocation).toEqual(mockLocation);
      expect(component.status.lastUpdate).toBeDefined();
    }));

    it('should emit trackingStatusChange event when tracking starts', fakeAsync(() => {
      geolocationService.getCurrentPositionWithFallback.and.returnValue(of(mockLocation));
      spyOn(component.trackingStatusChange, 'emit');

      component.ngOnInit();
      component.startTracking();
      tick();

      expect(component.trackingStatusChange.emit).toHaveBeenCalledWith(
        jasmine.objectContaining({
          enabled: true,
          currentLocation: mockLocation
        })
      );
    }));

    it('should emit locationUpdate event when location is obtained', fakeAsync(() => {
      geolocationService.getCurrentPositionWithFallback.and.returnValue(of(mockLocation));
      spyOn(component.locationUpdate, 'emit');

      component.ngOnInit();
      component.startTracking();
      tick();

      expect(component.locationUpdate.emit).toHaveBeenCalledWith(mockLocation);
    }));

    it('should handle error when getting initial position fails', fakeAsync(() => {
      geolocationService.getCurrentPositionWithFallback.and.returnValue(throwError(() => mockError));
      spyOn(component.trackingError, 'emit');

      component.ngOnInit();
      component.startTracking();
      tick();

      expect(component.status.enabled).toBe(false);
      expect(component.status.error).toEqual(mockError);
      expect(component.trackingError.emit).toHaveBeenCalledWith(mockError);
    }));

    it('should not start tracking if geolocation is not supported', () => {
      geolocationService.isGeolocationSupported.and.returnValue(false);
      spyOn(component.trackingError, 'emit');

      component.ngOnInit();
      component.startTracking();

      expect(geolocationService.getCurrentPositionWithFallback).not.toHaveBeenCalled();
      expect(component.status.enabled).toBe(false);
    });

    it('should not start tracking if already enabled', fakeAsync(() => {
      geolocationService.getCurrentPositionWithFallback.and.returnValue(of(mockLocation));

      component.ngOnInit();
      component.startTracking();
      tick();

      const callCount = geolocationService.getCurrentPositionWithFallback.calls.count();

      component.startTracking();
      tick();

      expect(geolocationService.getCurrentPositionWithFallback.calls.count()).toBe(callCount);
    }));
  });

  describe('Stop Tracking', () => {
    beforeEach(() => {
      geolocationService.isGeolocationSupported.and.returnValue(true);
      geolocationService.requestPermission.and.returnValue(of('granted' as PermissionState));
    });

    it('should clear watch and interval when stopping', fakeAsync(() => {
      geolocationService.getCurrentPositionWithFallback.and.returnValue(of(mockLocation));

      component.ngOnInit();
      component.startTracking();
      tick();

      component.stopTracking();

      expect(component.status.enabled).toBe(false);
      expect(component['watchId']).toBeNull();
      expect(component['updateIntervalId']).toBeNull();
    }));

    it('should emit trackingStatusChange event when tracking stops', fakeAsync(() => {
      geolocationService.getCurrentPositionWithFallback.and.returnValue(of(mockLocation));
      const emitSpy = spyOn(component.trackingStatusChange, 'emit');

      component.ngOnInit();
      component.startTracking();
      tick();

      emitSpy.calls.reset();

      component.stopTracking();

      expect(emitSpy).toHaveBeenCalledWith(
        jasmine.objectContaining({
          enabled: false
        })
      );
    }));

    it('should preserve location data when stopping', fakeAsync(() => {
      geolocationService.getCurrentPositionWithFallback.and.returnValue(of(mockLocation));

      component.ngOnInit();
      component.startTracking();
      tick();

      const lastLocation = component.status.currentLocation;
      const lastUpdate = component.status.lastUpdate;

      component.stopTracking();

      expect(component.status.currentLocation).toEqual(lastLocation);
      expect(component.status.lastUpdate).toEqual(lastUpdate);
    }));
  });

  describe('Periodic Updates', () => {
    beforeEach(() => {
      geolocationService.isGeolocationSupported.and.returnValue(true);
      geolocationService.requestPermission.and.returnValue(of('granted' as PermissionState));
    });

    it('should update location periodically', fakeAsync(() => {
      const updatedLocation: GeoLocation = {
        latitude: 37.7750,
        longitude: -122.4195,
        accuracy: 15
      };

      geolocationService.getCurrentPositionWithFallback.and.returnValues(
        of(mockLocation),
        of(updatedLocation)
      );

      component.updateInterval = 1000; // 1 second for testing
      component.ngOnInit();
      component.startTracking();
      tick(1);

      expect(component.status.currentLocation).toEqual(mockLocation);

      tick(1000);

      expect(component.status.currentLocation).toEqual(updatedLocation);
    }));

    it('should handle errors during periodic updates', fakeAsync(() => {
      geolocationService.getCurrentPositionWithFallback.and.returnValues(
        of(mockLocation),
        throwError(() => mockError)
      );
      spyOn(component.trackingError, 'emit');

      component.updateInterval = 1000;
      component.ngOnInit();
      component.startTracking();
      tick(1);

      tick(1000);

      expect(component.status.enabled).toBe(false);
      expect(component.status.error).toEqual(mockError);
      expect(component.trackingError.emit).toHaveBeenCalledWith(mockError);
    }));
  });

  describe('Status Properties', () => {
    it('should return correct status icon for enabled state', () => {
      component.status = { enabled: true };
      expect(component.statusIcon).toBe('location_on');
    });

    it('should return correct status icon for disabled state', () => {
      component.status = { enabled: false };
      expect(component.statusIcon).toBe('location_off');
    });

    it('should return error icon when there is an error', () => {
      component.status = { enabled: false, error: mockError };
      expect(component.statusIcon).toBe('error');
    });

    it('should return correct status text for enabled state', () => {
      component.status = { enabled: true };
      expect(component.statusText).toBe('Tracking Enabled');
    });

    it('should return correct status text for disabled state', () => {
      component.status = { enabled: false };
      expect(component.statusText).toBe('Tracking Disabled');
    });

    it('should return error text when there is an error', () => {
      component.status = { enabled: false, error: mockError };
      expect(component.statusText).toBe('Location Error');
    });

    it('should return correct status color for enabled state', () => {
      component.status = { enabled: true };
      expect(component.statusColor).toBe('primary');
    });

    it('should return correct status color for disabled state', () => {
      component.status = { enabled: false };
      expect(component.statusColor).toBe('accent');
    });

    it('should return warn color when there is an error', () => {
      component.status = { enabled: false, error: mockError };
      expect(component.statusColor).toBe('warn');
    });
  });

  describe('Display Formatting', () => {
    it('should format last update time correctly for recent updates', () => {
      component.status = {
        enabled: true,
        lastUpdate: new Date()
      };

      expect(component.lastUpdateText).toBe('Just now');
    });

    it('should format last update time correctly for updates minutes ago', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      component.status = {
        enabled: true,
        lastUpdate: fiveMinutesAgo
      };

      expect(component.lastUpdateText).toBe('5 minutes ago');
    });

    it('should return "Never" when there is no last update', () => {
      component.status = { enabled: false };
      expect(component.lastUpdateText).toBe('Never');
    });

    it('should format location text using geolocation service', () => {
      geolocationService.formatLocation.and.returnValue('37.7749° N, 122.4194° W');
      component.status = {
        enabled: true,
        currentLocation: mockLocation
      };

      expect(component.locationText).toBe('37.7749° N, 122.4194° W');
      expect(geolocationService.formatLocation).toHaveBeenCalledWith(mockLocation);
    });

    it('should return "No location" when there is no current location', () => {
      component.status = { enabled: false };
      expect(component.locationText).toBe('No location');
    });

    it('should format accuracy text correctly', () => {
      component.status = {
        enabled: true,
        currentLocation: mockLocation
      };

      expect(component.accuracyText).toBe('±10m');
    });

    it('should return "Unknown" when accuracy is not available', () => {
      component.status = {
        enabled: true,
        currentLocation: { latitude: 0, longitude: 0, accuracy: 0 }
      };

      expect(component.accuracyText).toBe('Unknown');
    });
  });

  describe('Component Cleanup', () => {
    it('should stop tracking and clean up on destroy', fakeAsync(() => {
      geolocationService.isGeolocationSupported.and.returnValue(true);
      geolocationService.requestPermission.and.returnValue(of('granted' as PermissionState));
      geolocationService.getCurrentPositionWithFallback.and.returnValue(of(mockLocation));

      component.ngOnInit();
      component.startTracking();
      tick();

      expect(component.status.enabled).toBe(true);

      component.ngOnDestroy();

      expect(component.status.enabled).toBe(false);
      expect(component['watchId']).toBeNull();
      expect(component['updateIntervalId']).toBeNull();
    }));
  });

  describe('Permission Handling', () => {
    it('should show error when permission is denied on init', () => {
      geolocationService.isGeolocationSupported.and.returnValue(true);
      geolocationService.requestPermission.and.returnValue(of('denied' as PermissionState));
      
      component.ngOnInit();
      
      expect(component.permissionState).toBe('denied');
      expect(component.status.error).toBeDefined();
      expect(component.status.error?.type).toBe(GeolocationErrorType.PermissionDenied);
    });

    it('should handle permission check failure gracefully', () => {
      geolocationService.isGeolocationSupported.and.returnValue(true);
      geolocationService.requestPermission.and.returnValue(throwError(() => new Error('Permission API not supported')));
      
      component.ngOnInit();
      
      expect(component.permissionState).toBe('prompt');
    });

    it('should request permission before starting tracking', fakeAsync(() => {
      geolocationService.isGeolocationSupported.and.returnValue(true);
      const permissionSpy = geolocationService.requestPermission.and.returnValue(of('granted' as PermissionState));
      geolocationService.getCurrentPositionWithFallback.and.returnValue(of(mockLocation));
      
      component.ngOnInit();
      component.startTracking();
      tick();
      
      expect(permissionSpy).toHaveBeenCalled();
      expect(component.permissionState).toBe('granted');
      expect(component.status.enabled).toBe(true);
    }));

    it('should not start tracking when permission is denied', fakeAsync(() => {
      geolocationService.isGeolocationSupported.and.returnValue(true);
      geolocationService.requestPermission.and.returnValue(of('denied' as PermissionState));
      const getCurrentSpy = geolocationService.getCurrentPositionWithFallback;
      
      component.ngOnInit();
      component.startTracking();
      tick();
      
      expect(component.permissionState).toBe('denied');
      expect(component.status.enabled).toBe(false);
      expect(component.status.error).toBeDefined();
      expect(getCurrentSpy).not.toHaveBeenCalled();
    }));

    it('should update permission state to granted after successful location retrieval', fakeAsync(() => {
      geolocationService.isGeolocationSupported.and.returnValue(true);
      geolocationService.requestPermission.and.returnValue(of('prompt' as PermissionState));
      geolocationService.getCurrentPositionWithFallback.and.returnValue(of(mockLocation));
      
      component.ngOnInit();
      component.startTracking();
      tick();
      
      expect(component.permissionState).toBe('granted');
      expect(component.status.enabled).toBe(true);
    }));

    it('should update permission state to denied on permission error', fakeAsync(() => {
      geolocationService.isGeolocationSupported.and.returnValue(true);
      geolocationService.requestPermission.and.returnValue(of('prompt' as PermissionState));
      const permissionError: GeolocationError = {
        type: GeolocationErrorType.PermissionDenied,
        message: 'Permission denied'
      };
      geolocationService.getCurrentPositionWithFallback.and.returnValue(throwError(() => permissionError));
      
      component.ngOnInit();
      component.startTracking();
      tick();
      
      expect(component.permissionState).toBe('denied');
      expect(component.status.enabled).toBe(false);
      expect(component.status.error).toEqual(permissionError);
    }));

    it('should proceed with location request if permission check fails', fakeAsync(() => {
      geolocationService.isGeolocationSupported.and.returnValue(true);
      geolocationService.requestPermission.and.returnValue(throwError(() => new Error('Permission API error')));
      const getCurrentSpy = geolocationService.getCurrentPositionWithFallback.and.returnValue(of(mockLocation));
      
      component.ngOnInit();
      component.startTracking();
      tick();
      
      expect(getCurrentSpy).toHaveBeenCalled();
      expect(component.status.enabled).toBe(true);
    }));
  });

  describe('Permission Status Display', () => {
    it('should return correct permission status text for granted', () => {
      component.permissionState = 'granted';
      expect(component.permissionStatusText).toBe('Location access granted');
    });

    it('should return correct permission status text for denied', () => {
      component.permissionState = 'denied';
      expect(component.permissionStatusText).toBe('Location access blocked');
    });

    it('should return correct permission status text for prompt', () => {
      component.permissionState = 'prompt';
      expect(component.permissionStatusText).toBe('Location access not yet requested');
    });

    it('should identify when permission is blocked', () => {
      component.permissionState = 'denied';
      expect(component.isPermissionBlocked).toBe(true);
      
      component.permissionState = 'granted';
      expect(component.isPermissionBlocked).toBe(false);
    });

    it('should identify when permission needs to be requested', () => {
      component.permissionState = 'prompt';
      expect(component.needsPermissionRequest).toBe(true);
      
      component.permissionState = 'granted';
      expect(component.needsPermissionRequest).toBe(false);
    });

    it('should provide user-friendly error message for permission denied', () => {
      component.status = {
        enabled: false,
        error: {
          type: GeolocationErrorType.PermissionDenied,
          message: 'Permission denied'
        }
      };
      
      const message = component.userFriendlyErrorMessage;
      expect(message).toContain('Location access is blocked');
      expect(message).toContain('browser\'s address bar');
    });

    it('should provide user-friendly error message for position unavailable', () => {
      component.status = {
        enabled: false,
        error: {
          type: GeolocationErrorType.PositionUnavailable,
          message: 'Position unavailable'
        }
      };
      
      const message = component.userFriendlyErrorMessage;
      expect(message).toContain('Unable to determine your location');
      expect(message).toContain('Location services are enabled');
    });

    it('should provide user-friendly error message for timeout', () => {
      component.status = {
        enabled: false,
        error: {
          type: GeolocationErrorType.Timeout,
          message: 'Timeout'
        }
      };
      
      const message = component.userFriendlyErrorMessage;
      expect(message).toContain('Location request timed out');
      expect(message).toContain('GPS signal');
    });

    it('should provide user-friendly error message for not supported', () => {
      component.status = {
        enabled: false,
        error: {
          type: GeolocationErrorType.NotSupported,
          message: 'Not supported'
        }
      };
      
      const message = component.userFriendlyErrorMessage;
      expect(message).toContain('does not support location tracking');
      expect(message).toContain('modern browser');
    });

    it('should return undefined when there is no error', () => {
      component.status = {
        enabled: true
      };
      
      expect(component.userFriendlyErrorMessage).toBeUndefined();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      geolocationService.isGeolocationSupported.and.returnValue(true);
      geolocationService.requestPermission.and.returnValue(of('granted' as PermissionState));

      component.ngOnInit();
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.location-tracking-toggle');
      expect(container.getAttribute('role')).toBe('region');
      expect(container.getAttribute('aria-label')).toContain('Location tracking control');
    });

    it('should announce errors with aria-live', fakeAsync(() => {
      geolocationService.isGeolocationSupported.and.returnValue(true);
      geolocationService.requestPermission.and.returnValue(of('granted' as PermissionState));
      geolocationService.getCurrentPositionWithFallback.and.returnValue(throwError(() => mockError));

      component.ngOnInit();
      component.startTracking();
      tick();
      fixture.detectChanges();

      const errorInfo = fixture.nativeElement.querySelector('.error-info');
      expect(errorInfo.getAttribute('role')).toBe('alert');
      expect(errorInfo.getAttribute('aria-live')).toBe('assertive');
    }));
  });

  describe('Error Message Display (Requirement 4.4.4)', () => {
    it('should display user-friendly error messages for all error types', () => {
      const errorTypes = [
        GeolocationErrorType.PermissionDenied,
        GeolocationErrorType.PositionUnavailable,
        GeolocationErrorType.Timeout,
        GeolocationErrorType.NotSupported
      ];

      errorTypes.forEach(errorType => {
        component.status = {
          enabled: false,
          error: {
            type: errorType,
            message: 'Error'
          }
        };

        const message = component.userFriendlyErrorMessage;
        expect(message).toBeDefined();
        expect(message!.length).toBeGreaterThan(0);
      });
    });

    it('should provide actionable guidance in error messages', () => {
      component.status = {
        enabled: false,
        error: {
          type: GeolocationErrorType.PermissionDenied,
          message: 'Permission denied'
        }
      };

      const message = component.userFriendlyErrorMessage;
      expect(message).toContain('To enable tracking');
      expect(message).toContain('Click');
    });

    it('should emit trackingError event with error details', fakeAsync(() => {
      geolocationService.isGeolocationSupported.and.returnValue(true);
      geolocationService.requestPermission.and.returnValue(of('granted' as PermissionState));
      geolocationService.getCurrentPositionWithFallback.and.returnValue(throwError(() => mockError));
      
      const errorSpy = spyOn(component.trackingError, 'emit');

      component.ngOnInit();
      component.startTracking();
      tick();

      expect(errorSpy).toHaveBeenCalledWith(mockError);
      expect(component.status.error).toEqual(mockError);
    }));

    it('should clear error when tracking successfully starts after error', fakeAsync(() => {
      geolocationService.isGeolocationSupported.and.returnValue(true);
      geolocationService.requestPermission.and.returnValue(of('granted' as PermissionState));
      
      // First attempt fails
      geolocationService.getCurrentPositionWithFallback.and.returnValue(throwError(() => mockError));
      component.ngOnInit();
      component.startTracking();
      tick();
      
      expect(component.status.error).toEqual(mockError);
      
      // Second attempt succeeds
      geolocationService.getCurrentPositionWithFallback.and.returnValue(of(mockLocation));
      component.startTracking();
      tick();
      
      expect(component.status.error).toBeUndefined();
      expect(component.status.enabled).toBe(true);
    }));
  });

  describe('Loading Indicators (Requirement 4.4.5)', () => {
    it('should show loading state while waiting for initial position', fakeAsync(() => {
      geolocationService.isGeolocationSupported.and.returnValue(true);
      geolocationService.requestPermission.and.returnValue(of('granted' as PermissionState));
      
      // Simulate delayed response
      let resolveLocation: (value: GeoLocation) => void;
      const locationPromise = new Promise<GeoLocation>((resolve) => {
        resolveLocation = resolve;
      });
      geolocationService.getCurrentPositionWithFallback.and.returnValue(from(locationPromise));

      component.ngOnInit();
      component.startTracking();
      tick();

      // Should not be enabled yet
      expect(component.status.enabled).toBe(false);
      expect(component.status.currentLocation).toBeUndefined();

      // Resolve the location
      resolveLocation!(mockLocation);
      tick();

      // Now should be enabled
      expect(component.status.enabled).toBe(true);
      expect(component.status.currentLocation).toEqual(mockLocation);
    }));

    it('should update lastUpdate timestamp on each location update', fakeAsync(() => {
      geolocationService.isGeolocationSupported.and.returnValue(true);
      geolocationService.requestPermission.and.returnValue(of('granted' as PermissionState));
      geolocationService.getCurrentPositionWithFallback.and.returnValue(of(mockLocation));

      component.ngOnInit();
      component.startTracking();
      tick();

      const firstUpdate = component.status.lastUpdate;
      expect(firstUpdate).toBeDefined();

      // Wait a bit and trigger another update
      tick(100);
      
      const updatedLocation: GeoLocation = {
        latitude: 37.7750,
        longitude: -122.4195,
        accuracy: 15
      };
      geolocationService.getCurrentPositionWithFallback.and.returnValue(of(updatedLocation));
      
      component['updateLocation']();
      tick();

      const secondUpdate = component.status.lastUpdate;
      expect(secondUpdate).toBeDefined();
      expect(secondUpdate!.getTime()).toBeGreaterThan(firstUpdate!.getTime());
    }));

    it('should emit locationUpdate event for each successful update', fakeAsync(() => {
      geolocationService.isGeolocationSupported.and.returnValue(true);
      geolocationService.requestPermission.and.returnValue(of('granted' as PermissionState));
      
      const locations = [mockLocation, { ...mockLocation, latitude: 37.7750 }];
      geolocationService.getCurrentPositionWithFallback.and.returnValues(
        of(locations[0]),
        of(locations[1])
      );

      const locationSpy = spyOn(component.locationUpdate, 'emit');

      component.updateInterval = 1000;
      component.ngOnInit();
      component.startTracking();
      tick();

      expect(locationSpy).toHaveBeenCalledWith(locations[0]);

      tick(1000);

      expect(locationSpy).toHaveBeenCalledWith(locations[1]);
      expect(locationSpy).toHaveBeenCalledTimes(2);
    }));
  });

  describe('Privacy Preservation (Requirement 1.6.8)', () => {
    it('should stop tracking when disabled to preserve privacy', fakeAsync(() => {
      geolocationService.isGeolocationSupported.and.returnValue(true);
      geolocationService.requestPermission.and.returnValue(of('granted' as PermissionState));
      geolocationService.getCurrentPositionWithFallback.and.returnValue(of(mockLocation));

      component.ngOnInit();
      component.startTracking();
      tick();

      expect(component.status.enabled).toBe(true);

      // Disable tracking
      component.stopTracking();

      expect(component.status.enabled).toBe(false);
      expect(component['updateIntervalId']).toBeNull();
      expect(component['watchId']).toBeNull();
    }));

    it('should not send location updates when tracking is disabled', fakeAsync(() => {
      geolocationService.isGeolocationSupported.and.returnValue(true);
      geolocationService.requestPermission.and.returnValue(of('granted' as PermissionState));
      geolocationService.getCurrentPositionWithFallback.and.returnValue(of(mockLocation));

      const locationSpy = spyOn(component.locationUpdate, 'emit');

      component.updateInterval = 1000;
      component.ngOnInit();
      component.startTracking();
      tick();

      locationSpy.calls.reset();

      // Stop tracking
      component.stopTracking();
      tick(2000); // Wait for what would be 2 update intervals

      // No location updates should be emitted
      expect(locationSpy).not.toHaveBeenCalled();
    }));

    it('should preserve last known location when tracking is stopped', fakeAsync(() => {
      geolocationService.isGeolocationSupported.and.returnValue(true);
      geolocationService.requestPermission.and.returnValue(of('granted' as PermissionState));
      geolocationService.getCurrentPositionWithFallback.and.returnValue(of(mockLocation));

      component.ngOnInit();
      component.startTracking();
      tick();

      const lastLocation = component.status.currentLocation;
      const lastUpdate = component.status.lastUpdate;

      component.stopTracking();

      // Location data should be preserved but tracking disabled
      expect(component.status.enabled).toBe(false);
      expect(component.status.currentLocation).toEqual(lastLocation);
      expect(component.status.lastUpdate).toEqual(lastUpdate);
    }));

    it('should allow re-enabling tracking after it was disabled', fakeAsync(() => {
      geolocationService.isGeolocationSupported.and.returnValue(true);
      geolocationService.requestPermission.and.returnValue(of('granted' as PermissionState));
      geolocationService.getCurrentPositionWithFallback.and.returnValue(of(mockLocation));

      component.ngOnInit();
      
      // Enable tracking
      component.startTracking();
      tick();
      expect(component.status.enabled).toBe(true);

      // Disable tracking
      component.stopTracking();
      expect(component.status.enabled).toBe(false);

      // Re-enable tracking
      component.startTracking();
      tick();
      expect(component.status.enabled).toBe(true);
    }));
  });

  describe('Input Configuration', () => {
    it('should respect custom updateInterval', fakeAsync(() => {
      geolocationService.isGeolocationSupported.and.returnValue(true);
      geolocationService.requestPermission.and.returnValue(of('granted' as PermissionState));
      geolocationService.getCurrentPositionWithFallback.and.returnValue(of(mockLocation));

      component.updateInterval = 500; // 500ms
      component.ngOnInit();
      component.startTracking();
      tick();

      const callCount = geolocationService.getCurrentPositionWithFallback.calls.count();

      tick(500);

      expect(geolocationService.getCurrentPositionWithFallback.calls.count()).toBe(callCount + 1);
    }));

    it('should not auto-start when autoStart is false', () => {
      geolocationService.isGeolocationSupported.and.returnValue(true);
      geolocationService.requestPermission.and.returnValue(of('granted' as PermissionState));

      component.autoStart = false;
      component.ngOnInit();

      expect(component.status.enabled).toBe(false);
      expect(geolocationService.getCurrentPositionWithFallback).not.toHaveBeenCalled();
    });

    it('should auto-start when autoStart is true', fakeAsync(() => {
      geolocationService.isGeolocationSupported.and.returnValue(true);
      geolocationService.requestPermission.and.returnValue(of('granted' as PermissionState));
      geolocationService.getCurrentPositionWithFallback.and.returnValue(of(mockLocation));

      component.autoStart = true;
      component.ngOnInit();
      tick();

      expect(component.status.enabled).toBe(true);
      expect(geolocationService.getCurrentPositionWithFallback).toHaveBeenCalled();
    }));
  });

  describe('Edge Cases', () => {
    it('should handle multiple rapid toggle calls gracefully', fakeAsync(() => {
      geolocationService.isGeolocationSupported.and.returnValue(true);
      geolocationService.requestPermission.and.returnValue(of('granted' as PermissionState));
      geolocationService.getCurrentPositionWithFallback.and.returnValue(of(mockLocation));

      component.ngOnInit();

      // Rapid toggles
      component.toggleTracking();
      component.toggleTracking();
      component.toggleTracking();
      tick();

      // Should end up in disabled state (3 toggles)
      expect(component.status.enabled).toBe(false);
    }));

    it('should handle location updates with zero accuracy', () => {
      const zeroAccuracyLocation: GeoLocation = {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 0
      };

      component.status = {
        enabled: true,
        currentLocation: zeroAccuracyLocation
      };

      expect(component.accuracyText).toBe('Unknown');
    });

    it('should handle location updates with very high accuracy values', () => {
      const highAccuracyLocation: GeoLocation = {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 9999.99
      };

      component.status = {
        enabled: true,
        currentLocation: highAccuracyLocation
      };

      expect(component.accuracyText).toBe('±10000m');
    });

    it('should handle component destruction while location request is pending', fakeAsync(() => {
      geolocationService.isGeolocationSupported.and.returnValue(true);
      geolocationService.requestPermission.and.returnValue(of('granted' as PermissionState));
      
      // Simulate delayed response
      const locationPromise = new Promise<GeoLocation>((resolve) => {
        setTimeout(() => resolve(mockLocation), 1000);
      });
      geolocationService.getCurrentPositionWithFallback.and.returnValue(from(locationPromise));

      component.ngOnInit();
      component.startTracking();
      tick(100);

      // Destroy component before location resolves
      component.ngOnDestroy();
      tick(1000);

      // Should not throw errors
      expect(component.status.enabled).toBe(false);
    }));

    it('should handle negative latitude and longitude values', () => {
      const negativeLocation: GeoLocation = {
        latitude: -37.7749,
        longitude: -122.4194,
        accuracy: 10
      };

      geolocationService.formatLocation.and.returnValue('37.7749° S, 122.4194° W');
      component.status = {
        enabled: true,
        currentLocation: negativeLocation
      };

      expect(component.locationText).toBe('37.7749° S, 122.4194° W');
    });
  });
});
