import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of, throwError } from 'rxjs';
import { TimeTrackerComponent } from './time-tracker.component';
import { Job, JobStatus, JobType, Priority } from '../../../models/job.model';
import { TimeEntry, GeoLocation } from '../../../models/time-entry.model';
import { GeolocationService, GeolocationErrorType } from '../../../services/geolocation.service';
import { clockIn, clockOut, updateTimeEntry } from '../../../state/time-entries/time-entry.actions';
import { selectActiveEntry } from '../../../state/time-entries/time-entry.selectors';

describe('TimeTrackerComponent', () => {
  let component: TimeTrackerComponent;
  let fixture: ComponentFixture<TimeTrackerComponent>;
  let store: MockStore;
  let geolocationService: jasmine.SpyObj<GeolocationService>;

  const mockJob: Job = {
    id: '1',
    jobId: 'JOB-001',
    client: 'Test Client',
    siteName: 'Test Site',
    siteAddress: {
      street: '123 Main St',
      city: 'Test City',
      state: 'TS',
      zipCode: '12345'
    },
    jobType: JobType.Install,
    priority: Priority.Normal,
    status: JobStatus.OnSite,
    scopeDescription: 'Test job',
    requiredSkills: [],
    requiredCrewSize: 1,
    estimatedLaborHours: 4,
    scheduledStartDate: new Date(),
    scheduledEndDate: new Date(),
    attachments: [],
    notes: [],
    createdBy: 'test-user',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockLocation: GeoLocation = {
    latitude: 37.7749,
    longitude: -122.4194,
    accuracy: 10
  };

  const mockTimeEntry: TimeEntry = {
    id: 'te-1',
    jobId: '1',
    technicianId: 'tech-1',
    clockInTime: new Date(),
    clockInLocation: mockLocation,
    isManuallyAdjusted: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(async () => {
    const geoServiceSpy = jasmine.createSpyObj('GeolocationService', [
      'getCurrentPositionWithFallback',
      'calculateDistance',
      'formatLocation'
    ]);

    await TestBed.configureTestingModule({
      declarations: [TimeTrackerComponent],
      providers: [
        provideMockStore({
          selectors: [
            { selector: selectActiveEntry, value: null }
          ]
        }),
        { provide: GeolocationService, useValue: geoServiceSpy }
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    geolocationService = TestBed.inject(GeolocationService) as jasmine.SpyObj<GeolocationService>;
    fixture = TestBed.createComponent(TimeTrackerComponent);
    component = fixture.componentInstance;
    component.job = mockJob;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should subscribe to active time entry on init', () => {
    store.overrideSelector(selectActiveEntry, mockTimeEntry);
    store.refreshState();
    fixture.detectChanges();

    expect(component.activeTimeEntry).toEqual(mockTimeEntry);
    expect(component.isClockedIn).toBe(true);
  });

  it('should not be clocked in when no active entry', () => {
    store.overrideSelector(selectActiveEntry, null);
    store.refreshState();
    fixture.detectChanges();

    expect(component.isClockedIn).toBe(false);
  });

  it('should not be clocked in when active entry is for different job', () => {
    const differentJobEntry = { ...mockTimeEntry, jobId: 'different-job' };
    store.overrideSelector(selectActiveEntry, differentJobEntry);
    store.refreshState();
    fixture.detectChanges();

    expect(component.isClockedIn).toBe(false);
  });

  it('should clock in with location', async () => {
    geolocationService.getCurrentPositionWithFallback.and.returnValue(of(mockLocation));
    const dispatchSpy = spyOn(store, 'dispatch');

    await component.onClockIn();

    expect(geolocationService.getCurrentPositionWithFallback).toHaveBeenCalled();
    expect(dispatchSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        type: clockIn.type,
        jobId: mockJob.id,
        location: mockLocation
      })
    );
    expect(component.locationStatus).toBe(component.LocationStatus.Success);
  });

  it('should clock in without location on error', async () => {
    const error = {
      type: GeolocationErrorType.PermissionDenied,
      message: 'Permission denied'
    };
    geolocationService.getCurrentPositionWithFallback.and.returnValue(throwError(() => error));
    const dispatchSpy = spyOn(store, 'dispatch');

    await component.onClockIn();

    expect(dispatchSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        type: clockIn.type,
        jobId: mockJob.id
      })
    );
    expect(component.locationStatus).toBe(component.LocationStatus.Failed);
    expect(component.locationError).toBe(error.message);
  });

  it('should clock out with location', async () => {
    component.activeTimeEntry = mockTimeEntry;
    geolocationService.getCurrentPositionWithFallback.and.returnValue(of(mockLocation));
    const dispatchSpy = spyOn(store, 'dispatch');

    await component.onClockOut();

    expect(geolocationService.getCurrentPositionWithFallback).toHaveBeenCalled();
    expect(dispatchSpy).toHaveBeenCalledWith(
      clockOut({
        timeEntryId: mockTimeEntry.id,
        location: mockLocation
      })
    );
  });

  it('should calculate mileage on clock out', async () => {
    component.activeTimeEntry = mockTimeEntry;
    const clockOutLocation: GeoLocation = {
      latitude: 37.7849,
      longitude: -122.4094,
      accuracy: 10
    };
    
    geolocationService.getCurrentPositionWithFallback.and.returnValue(of(clockOutLocation));
    geolocationService.calculateDistance.and.returnValue(1609.34); // 1 mile in meters

    await component.onClockOut();

    expect(geolocationService.calculateDistance).toHaveBeenCalledWith(
      mockTimeEntry.clockInLocation!,
      clockOutLocation
    );
    expect(component.calculatedMileage).toBeCloseTo(1, 1);
  });

  it('should not clock out when no active entry', async () => {
    component.activeTimeEntry = null;
    const dispatchSpy = spyOn(store, 'dispatch');

    await component.onClockOut();

    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('should update elapsed time correctly', () => {
    const clockInTime = new Date();
    clockInTime.setHours(clockInTime.getHours() - 2);
    clockInTime.setMinutes(clockInTime.getMinutes() - 30);
    clockInTime.setSeconds(clockInTime.getSeconds() - 45);

    component.activeTimeEntry = {
      ...mockTimeEntry,
      clockInTime
    };
    component.isClockedIn = true;

    component['updateElapsedTime']();

    expect(component.elapsedTime).toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  it('should pad numbers correctly', () => {
    expect(component['pad'](5)).toBe('05');
    expect(component['pad'](15)).toBe('15');
    expect(component['pad'](0)).toBe('00');
  });

  it('should convert meters to miles correctly', () => {
    const meters = 1609.34; // 1 mile
    const miles = component['metersToMiles'](meters);
    expect(miles).toBeCloseTo(1, 2);
  });

  it('should show manual mileage entry on location error', async () => {
    const error = {
      type: GeolocationErrorType.PermissionDenied,
      message: 'Permission denied'
    };
    geolocationService.getCurrentPositionWithFallback.and.returnValue(throwError(() => error));

    await component.onClockIn();

    expect(component.showManualMileageEntry).toBe(true);
  });

  it('should save manual mileage', () => {
    component.activeTimeEntry = mockTimeEntry;
    component.manualMileage = 25.5;
    const dispatchSpy = spyOn(store, 'dispatch');

    component.saveManualMileage();

    expect(dispatchSpy).toHaveBeenCalledWith(
      updateTimeEntry({
        id: mockTimeEntry.id,
        timeEntry: {
          mileage: 25.5
        }
      })
    );
    expect(component.calculatedMileage).toBe(25.5);
    expect(component.showManualMileageEntry).toBe(false);
  });

  it('should cancel manual mileage entry', () => {
    component.manualMileage = 10;
    component.showManualMileageEntry = true;

    component.cancelManualMileage();

    expect(component.showManualMileageEntry).toBe(false);
    expect(component.manualMileage).toBe(null);
  });

  it('should retry location capture', () => {
    geolocationService.getCurrentPositionWithFallback.and.returnValue(of(mockLocation));

    component.retryLocationCapture();

    expect(geolocationService.getCurrentPositionWithFallback).toHaveBeenCalled();
    expect(component.locationStatus).toBe(component.LocationStatus.Success);
  });

  it('should get correct location status icon', () => {
    component.locationStatus = component.LocationStatus.Pending;
    expect(component.locationStatusIcon).toBe('location_searching');

    component.locationStatus = component.LocationStatus.Success;
    expect(component.locationStatusIcon).toBe('location_on');

    component.locationStatus = component.LocationStatus.Failed;
    expect(component.locationStatusIcon).toBe('location_off');
  });

  it('should get correct location status color', () => {
    component.locationStatus = component.LocationStatus.Pending;
    expect(component.locationStatusColor).toBe('accent');

    component.locationStatus = component.LocationStatus.Success;
    expect(component.locationStatusColor).toBe('primary');

    component.locationStatus = component.LocationStatus.Failed;
    expect(component.locationStatusColor).toBe('warn');
  });

  it('should format mileage correctly', () => {
    component.calculatedMileage = null;
    expect(component.formattedMileage).toBe('N/A');

    component.calculatedMileage = 25.567;
    expect(component.formattedMileage).toBe('25.57 mi');
  });

  it('should format location correctly', () => {
    component.currentLocation = null;
    expect(component.formattedLocation).toBe('N/A');

    component.currentLocation = mockLocation;
    geolocationService.formatLocation.and.returnValue('37.7749° N, 122.4194° W');
    expect(component.formattedLocation).toBe('37.7749° N, 122.4194° W');
  });

  it('should show manual time adjustment for admin', () => {
    component.isAdmin = true;
    component.activeTimeEntry = mockTimeEntry;
    component.isClockedIn = true;

    component.onManualTimeAdjustment();

    expect(component.showManualTimeAdjustment).toBe(true);
  });

  it('should not show manual time adjustment for non-admin', () => {
    component.isAdmin = false;
    component.activeTimeEntry = mockTimeEntry;

    component.onManualTimeAdjustment();

    expect(component.showManualTimeAdjustment).toBe(false);
  });
});
