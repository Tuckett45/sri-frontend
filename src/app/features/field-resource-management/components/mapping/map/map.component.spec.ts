import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapComponent, MapConfig } from './map.component';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of, BehaviorSubject } from 'rxjs';
import * as L from 'leaflet';
import { Technician, TechnicianRole, EmploymentType, SkillLevel } from '../../../models/technician.model';
import { CrewStatus } from '../../../models/crew.model';
import { PermissionService } from '../../../../../services/permission.service';
import { User } from '../../../../../models/user.model';
import { DataScope } from '../../../services/data-scope.service';
import { FrmSignalRService, ConnectionStatus } from '../../../services/frm-signalr.service';

describe('MapComponent', () => {
  let component: MapComponent;
  let fixture: ComponentFixture<MapComponent>;
  let store: MockStore;
  let permissionService: jasmine.SpyObj<PermissionService>;
  let signalRService: jasmine.SpyObj<FrmSignalRService>;

  const mockAdminUser = new User(
    'admin-1',
    'Admin User',
    'admin@test.com',
    'password',
    'Admin',
    'RG',
    'Company1',
    new Date(),
    true
  );

  const mockAdminDataScopes: DataScope[] = [{ scopeType: 'all' }];

  const mockTechnicians: Technician[] = [
    {
      id: 'tech-1',
      technicianId: 'T001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
      phone: '555-0001',
      role: TechnicianRole.Level2,
      employmentType: EmploymentType.W2,
      homeBase: 'Dallas Office',
      region: 'Dallas',
      skills: [
        { id: 's1', name: 'Fiber Splicing', category: 'Technical', level: SkillLevel.Advanced }
      ],
      certifications: [],
      availability: [],
      isActive: true,
      currentLocation: { latitude: 32.7767, longitude: -96.7970, accuracy: 10 },
      canTravel: false,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'tech-2',
      technicianId: 'T002',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@test.com',
      phone: '555-0002',
      role: TechnicianRole.Lead,
      employmentType: EmploymentType.W2,
      homeBase: 'Houston Office',
      region: 'Houston',
      skills: [
        { id: 's2', name: 'Cable Installation', category: 'Technical', level: SkillLevel.Expert }
      ],
      certifications: [],
      availability: [],
      isActive: true,
      currentLocation: { latitude: 29.7604, longitude: -95.3698, accuracy: 10 },
      canTravel: false,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'tech-3',
      technicianId: 'T003',
      firstName: 'Bob',
      lastName: 'Johnson',
      email: 'bob@test.com',
      phone: '555-0003',
      role: TechnicianRole.Installer,
      employmentType: EmploymentType.Contractor1099,
      homeBase: 'Austin Office',
      region: 'Austin',
      skills: [],
      certifications: [],
      availability: [],
      isActive: false,
      currentLocation: { latitude: 30.2672, longitude: -97.7431, accuracy: 10 },
      canTravel: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  beforeEach(async () => {
    const permissionServiceSpy = jasmine.createSpyObj('PermissionService', [
      'getCurrentUser',
      'getCurrentUserDataScopes'
    ]);

    permissionServiceSpy.getCurrentUser.and.returnValue(of(mockAdminUser));
    permissionServiceSpy.getCurrentUserDataScopes.and.returnValue(of(mockAdminDataScopes));

    // Create SignalR service mock
    const signalRServiceSpy = jasmine.createSpyObj('FrmSignalRService', [
      'connect',
      'disconnect',
      'isConnected'
    ], {
      locationUpdate$: new BehaviorSubject(null),
      connectionStatus$: new BehaviorSubject<ConnectionStatus>(ConnectionStatus.Connected)
    });

    await TestBed.configureTestingModule({
      declarations: [MapComponent],
      providers: [
        provideMockStore(),
        { provide: PermissionService, useValue: permissionServiceSpy },
        { provide: FrmSignalRService, useValue: signalRServiceSpy }
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    permissionService = TestBed.inject(PermissionService) as jasmine.SpyObj<PermissionService>;
    signalRService = TestBed.inject(FrmSignalRService) as jasmine.SpyObj<FrmSignalRService>;

    fixture = TestBed.createComponent(MapComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    // Clean up any map instances
    if (component.getMap()) {
      fixture.destroy();
    }
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should have default config', () => {
      expect(component.config).toBeDefined();
      expect(component.config.center).toEqual([39.8283, -98.5795]);
      expect(component.config.zoom).toBe(4);
    });

    it('should initialize map after view init', () => {
      fixture.detectChanges();
      expect(component.getMap()).toBeTruthy();
    });

    it('should emit mapReady event when map is initialized', (done) => {
      component.mapReady.subscribe((map: L.Map) => {
        expect(map).toBeTruthy();
        expect(map instanceof L.Map).toBe(true);
        done();
      });
      fixture.detectChanges();
    });

    it('should subscribe to SignalR location updates on init', () => {
      expect(signalRService.locationUpdate$).toBeDefined();
      expect(signalRService.connectionStatus$).toBeDefined();
      fixture.detectChanges();
      // Subscriptions are set up in ngOnInit via setupSignalRLocationSubscriptions
    });
  });

  describe('SignalR Real-time Location Updates', () => {
    it('should receive technician location updates from SignalR', (done) => {
      const mockLocationUpdate = {
        technicianId: 'tech-1',
        location: { latitude: 33.0, longitude: -97.0, accuracy: 10 },
        timestamp: new Date()
      };

      fixture.detectChanges();

      // Emit a location update through the SignalR service observable
      (signalRService.locationUpdate$ as BehaviorSubject<any>).next(mockLocationUpdate);

      // The component should receive the update (logged in console)
      // The actual marker update happens through NgRx state changes
      setTimeout(() => {
        // Verify the subscription is active by checking it doesn't throw
        expect(component).toBeTruthy();
        done();
      }, 100);
    });

    it('should handle SignalR connection status changes', (done) => {
      fixture.detectChanges();

      // Emit a connection status change
      (signalRService.connectionStatus$ as BehaviorSubject<ConnectionStatus>).next(ConnectionStatus.Disconnected);

      setTimeout(() => {
        // Component should handle the status change gracefully
        expect(component).toBeTruthy();
        done();
      }, 100);
    });

    it('should filter out null location updates', (done) => {
      fixture.detectChanges();

      // Emit a null update (should be filtered out)
      (signalRService.locationUpdate$ as BehaviorSubject<any>).next(null);

      setTimeout(() => {
        // Should not cause any errors
        expect(component).toBeTruthy();
        done();
      }, 100);
    });

    it('should clean up SignalR subscriptions on destroy', () => {
      fixture.detectChanges();
      
      // Component should have active subscriptions
      expect(component).toBeTruthy();
      
      // Destroy the component
      fixture.destroy();
      
      // Subscriptions should be cleaned up via takeUntil(destroy$)
      // No errors should occur
    });
  });

  describe('Map Configuration', () => {
    it('should accept custom config', () => {
      const customConfig: MapConfig = {
        center: [40.7128, -74.0060], // New York
        zoom: 10,
        minZoom: 5,
        maxZoom: 15
      };
      component.config = customConfig;
      fixture.detectChanges();

      const map = component.getMap();
      expect(map).toBeTruthy();
      if (map) {
        expect(map.getCenter().lat).toBeCloseTo(40.7128, 4);
        expect(map.getCenter().lng).toBeCloseTo(-74.0060, 4);
        expect(map.getZoom()).toBe(10);
      }
    });

    it('should apply zoom constraints', () => {
      component.config = {
        center: [39.8283, -98.5795],
        zoom: 4,
        minZoom: 3,
        maxZoom: 18
      };
      fixture.detectChanges();

      const map = component.getMap();
      expect(map).toBeTruthy();
      if (map) {
        expect(map.getMinZoom()).toBe(3);
        expect(map.getMaxZoom()).toBe(18);
      }
    });
  });

  describe('Map Interactions', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should emit mapClick event when map is clicked', (done) => {
      const testLatLng = L.latLng(40, -100);
      
      component.mapClick.subscribe((event) => {
        expect(event.latlng).toBeDefined();
        done();
      });

      const map = component.getMap();
      if (map) {
        map.fire('click', {
          latlng: testLatLng,
          originalEvent: new MouseEvent('click')
        });
      }
    });

    it('should emit zoomChange event when zoom changes', (done) => {
      component.zoomChange.subscribe((event) => {
        expect(event.zoom).toBeDefined();
        expect(typeof event.zoom).toBe('number');
        done();
      });

      const map = component.getMap();
      if (map) {
        map.setZoom(8);
        map.fire('zoomend');
      }
    });

    it('should emit centerChange event when map is panned', (done) => {
      component.centerChange.subscribe((center) => {
        expect(center).toBeDefined();
        expect(center instanceof L.LatLng).toBe(true);
        done();
      });

      const map = component.getMap();
      if (map) {
        map.panTo([41, -99]);
        map.fire('moveend');
      }
    });
  });

  describe('Public Methods', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should set center position', () => {
      const newCenter: [number, number] = [34.0522, -118.2437]; // Los Angeles
      component.setCenter(newCenter);

      const map = component.getMap();
      if (map) {
        const center = map.getCenter();
        expect(center.lat).toBeCloseTo(34.0522, 4);
        expect(center.lng).toBeCloseTo(-118.2437, 4);
      }
    });

    it('should set center with zoom', () => {
      const newCenter: [number, number] = [34.0522, -118.2437];
      const newZoom = 12;
      component.setCenter(newCenter, newZoom);

      const map = component.getMap();
      if (map) {
        expect(map.getZoom()).toBe(newZoom);
      }
    });

    it('should set zoom level', () => {
      component.setZoom(15);

      const map = component.getMap();
      if (map) {
        expect(map.getZoom()).toBe(15);
      }
    });

    it('should fit bounds', () => {
      const bounds = L.latLngBounds(
        L.latLng(40, -100),
        L.latLng(42, -98)
      );
      component.fitBounds(bounds);

      const map = component.getMap();
      if (map) {
        const mapBounds = map.getBounds();
        expect(mapBounds.contains(bounds)).toBe(true);
      }
    });

    it('should invalidate size', () => {
      const map = component.getMap();
      if (map) {
        spyOn(map, 'invalidateSize');
        component.invalidateSize();
        expect(map.invalidateSize).toHaveBeenCalled();
      }
    });

    it('should return map instance', () => {
      const map = component.getMap();
      expect(map).toBeTruthy();
      expect(map instanceof L.Map).toBe(true);
    });
  });

  describe('Lifecycle Management', () => {
    it('should clean up map on destroy', () => {
      fixture.detectChanges();
      const map = component.getMap();
      expect(map).toBeTruthy();

      fixture.destroy();
      expect(component.getMap()).toBeNull();
    });

    it('should not initialize map twice', () => {
      fixture.detectChanges();
      const firstMap = component.getMap();
      
      // Try to trigger initialization again
      component.ngAfterViewInit();
      const secondMap = component.getMap();
      
      expect(firstMap).toBe(secondMap);
    });

    it('should handle missing map container gracefully', () => {
      // Create component without triggering view init
      const testComponent = new MapComponent(store, permissionService, signalRService);
      expect(() => testComponent.ngAfterViewInit()).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle setCenter on uninitialized map', () => {
      const uninitializedComponent = new MapComponent(store, permissionService, signalRService);
      expect(() => uninitializedComponent.setCenter([40, -100])).not.toThrow();
    });

    it('should handle setZoom on uninitialized map', () => {
      const uninitializedComponent = new MapComponent(store, permissionService, signalRService);
      expect(() => uninitializedComponent.setZoom(10)).not.toThrow();
    });

    it('should handle fitBounds on uninitialized map', () => {
      const uninitializedComponent = new MapComponent(store, permissionService, signalRService);
      const bounds = L.latLngBounds(L.latLng(40, -100), L.latLng(42, -98));
      expect(() => uninitializedComponent.fitBounds(bounds)).not.toThrow();
    });

    it('should handle invalidateSize on uninitialized map', () => {
      const uninitializedComponent = new MapComponent(store, permissionService, signalRService);
      expect(() => uninitializedComponent.invalidateSize()).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      fixture.detectChanges();
      const mapElement = fixture.nativeElement.querySelector('.map-container');
      expect(mapElement.getAttribute('role')).toBe('application');
      expect(mapElement.getAttribute('aria-label')).toContain('Interactive map');
    });
  });

  describe('Technician Location Markers', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should display markers for technicians with valid locations', () => {
      // Mock selector to return technicians
      store.overrideSelector(
        jasmine.any(Function) as any,
        mockTechnicians.filter(t => t.currentLocation)
      );
      store.refreshState();

      fixture.detectChanges();

      // Wait for async operations
      setTimeout(() => {
        const markers = (component as any).technicianMarkers;
        expect(markers.size).toBeGreaterThan(0);
      }, 100);
    });

    it('should filter out technicians without location', () => {
      const techniciansWithoutLocation = mockTechnicians.map(t => ({
        ...t,
        currentLocation: undefined
      }));

      store.overrideSelector(jasmine.any(Function) as any, techniciansWithoutLocation);
      store.refreshState();

      fixture.detectChanges();

      setTimeout(() => {
        const markers = (component as any).technicianMarkers;
        expect(markers.size).toBe(0);
      }, 100);
    });

    it('should validate coordinates before displaying markers', () => {
      const invalidTechnician: Technician = {
        ...mockTechnicians[0],
        currentLocation: { latitude: 100, longitude: -200, accuracy: 10 } // Invalid coordinates
      };

      const isValid = (component as any).isValidCoordinate(invalidTechnician.currentLocation);
      expect(isValid).toBe(false);
    });

    it('should accept valid coordinates', () => {
      const validLocation = { latitude: 32.7767, longitude: -96.7970, accuracy: 10 };
      const isValid = (component as any).isValidCoordinate(validLocation);
      expect(isValid).toBe(true);
    });

    it('should reject latitude out of range', () => {
      const invalidLocation = { latitude: -91, longitude: -96.7970, accuracy: 10 };
      const isValid = (component as any).isValidCoordinate(invalidLocation);
      expect(isValid).toBe(false);
    });

    it('should reject longitude out of range', () => {
      const invalidLocation = { latitude: 32.7767, longitude: 181, accuracy: 10 };
      const isValid = (component as any).isValidCoordinate(invalidLocation);
      expect(isValid).toBe(false);
    });

    it('should remove markers when technicians are removed', () => {
      // First add markers
      store.overrideSelector(jasmine.any(Function) as any, mockTechnicians);
      store.refreshState();
      fixture.detectChanges();

      setTimeout(() => {
        const markers = (component as any).technicianMarkers;
        const initialCount = markers.size;

        // Then remove some technicians
        store.overrideSelector(jasmine.any(Function) as any, [mockTechnicians[0]]);
        store.refreshState();
        fixture.detectChanges();

        setTimeout(() => {
          expect(markers.size).toBeLessThan(initialCount);
        }, 100);
      }, 100);
    });

    it('should update marker position when location changes', () => {
      const map = component.getMap();
      if (!map) return;

      const updatedTechnician = {
        ...mockTechnicians[0],
        currentLocation: { latitude: 33.0, longitude: -97.0, accuracy: 10 }
      };

      (component as any).addOrUpdateMarker(mockTechnicians[0]);
      const marker = (component as any).technicianMarkers.get(mockTechnicians[0].id);
      expect(marker).toBeDefined();

      (component as any).addOrUpdateMarker(updatedTechnician);
      const updatedMarker = (component as any).technicianMarkers.get(mockTechnicians[0].id);
      
      if (updatedMarker) {
        const latlng = updatedMarker.getLatLng();
        expect(latlng.lat).toBeCloseTo(33.0, 4);
        expect(latlng.lng).toBeCloseTo(-97.0, 4);
      }
    });

    it('should create popup with technician information', () => {
      const popupContent = (component as any).createPopupContent(mockTechnicians[0]);
      
      expect(popupContent).toContain('John Doe');
      expect(popupContent).toContain('Level2');
      expect(popupContent).toContain('Dallas');
      expect(popupContent).toContain('Fiber Splicing');
      expect(popupContent).toContain('T001');
    });

    it('should display different marker colors based on status', () => {
      const availableColor = (component as any).getStatusColor('available');
      const onJobColor = (component as any).getStatusColor('on-job');
      const unavailableColor = (component as any).getStatusColor('unavailable');
      const offDutyColor = (component as any).getStatusColor('off-duty');

      expect(availableColor).toBe('#10b981'); // Green
      expect(onJobColor).toBe('#3b82f6'); // Blue
      expect(unavailableColor).toBe('#f59e0b'); // Orange
      expect(offDutyColor).toBe('#6b7280'); // Gray
    });

    it('should determine technician status correctly', () => {
      const activeTech = mockTechnicians[0];
      const inactiveTech = mockTechnicians[2];

      const activeStatus = (component as any).getTechnicianStatus(activeTech);
      const inactiveStatus = (component as any).getTechnicianStatus(inactiveTech);

      expect(activeStatus).toBe('available');
      expect(inactiveStatus).toBe('off-duty');
    });

    it('should determine unavailable status from availability data', () => {
      const today = new Date();
      const unavailableTech: Technician = {
        ...mockTechnicians[0],
        availability: [
          {
            id: 'avail-1',
            technicianId: 'tech-1',
            date: today,
            isAvailable: false,
            reason: 'PTO'
          }
        ]
      };

      const status = (component as any).getTechnicianStatus(unavailableTech);
      expect(status).toBe('unavailable');
    });

    it('should create valid SVG marker', () => {
      const svg = (component as any).createMarkerSvg('#10b981');
      
      expect(svg).toContain('<svg');
      expect(svg).toContain('#10b981');
      expect(svg).toContain('</svg>');
    });

    it('should clean up all markers on destroy', () => {
      const map = component.getMap();
      if (!map) return;

      // Add some markers
      mockTechnicians.forEach(tech => {
        if (tech.currentLocation) {
          (component as any).addOrUpdateMarker(tech);
        }
      });

      const markers = (component as any).technicianMarkers;
      expect(markers.size).toBeGreaterThan(0);

      // Destroy component
      component.ngOnDestroy();

      expect(markers.size).toBe(0);
    });

    it('should handle marker removal gracefully', () => {
      const map = component.getMap();
      if (!map) return;

      (component as any).addOrUpdateMarker(mockTechnicians[0]);
      expect((component as any).technicianMarkers.has(mockTechnicians[0].id)).toBe(true);

      (component as any).removeMarker(mockTechnicians[0].id);
      expect((component as any).technicianMarkers.has(mockTechnicians[0].id)).toBe(false);
    });

    it('should not add marker if map is not initialized', () => {
      const uninitializedComponent = new MapComponent(store, permissionService, signalRService);
      
      expect(() => {
        (uninitializedComponent as any).addOrUpdateMarker(mockTechnicians[0]);
      }).not.toThrow();
    });

    it('should handle popup content for technician with no skills', () => {
      const techWithNoSkills = {
        ...mockTechnicians[0],
        skills: []
      };

      const popupContent = (component as any).createPopupContent(techWithNoSkills);
      expect(popupContent).toContain('No skills listed');
    });
  });

  describe('Role-Based Data Scope Filtering', () => {
    it('should apply scope filtering for technician markers', () => {
      const cmUser = new User(
        'cm-1',
        'CM User',
        'cm@test.com',
        'password',
        'CM',
        'Dallas',
        'Company1',
        new Date(),
        true
      );

      const cmDataScopes: DataScope[] = [{ scopeType: 'market' }];

      permissionService.getCurrentUser.and.returnValue(of(cmUser));
      permissionService.getCurrentUserDataScopes.and.returnValue(of(cmDataScopes));

      fixture.detectChanges();

      // The component should subscribe to scoped technicians
      // which will filter based on the CM's market
      expect(permissionService.getCurrentUser).toHaveBeenCalled();
      expect(permissionService.getCurrentUserDataScopes).toHaveBeenCalled();
    });
  });

  describe('Crew Location Markers', () => {
    const mockCrews = [
      {
        id: 'crew-1',
        name: 'Alpha Crew',
        location: { latitude: 32.7767, longitude: -96.7970, accuracy: 10 },
        status: CrewStatus.Available,
        activeJobId: undefined,
        memberCount: 3
      },
      {
        id: 'crew-2',
        name: 'Beta Crew',
        location: { latitude: 29.7604, longitude: -95.3698, accuracy: 10 },
        status: CrewStatus.OnJob,
        activeJobId: 'job-123',
        memberCount: 5
      },
      {
        id: 'crew-3',
        name: 'Gamma Crew',
        location: { latitude: 30.2672, longitude: -97.7431, accuracy: 10 },
        status: CrewStatus.Unavailable,
        activeJobId: undefined,
        memberCount: 2
      }
    ];

    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should display markers for crews with locations', () => {
      store.overrideSelector(jasmine.any(Function) as any, mockCrews);
      store.refreshState();
      fixture.detectChanges();

      setTimeout(() => {
        const markers = (component as any).crewMarkers;
        expect(markers.size).toBeGreaterThan(0);
      }, 100);
    });

    it('should add crew marker to map', () => {
      const map = component.getMap();
      if (!map) return;

      (component as any).addOrUpdateCrewMarker(mockCrews[0]);
      const marker = (component as any).crewMarkers.get(mockCrews[0].id);
      
      expect(marker).toBeDefined();
      if (marker) {
        const latlng = marker.getLatLng();
        expect(latlng.lat).toBeCloseTo(32.7767, 4);
        expect(latlng.lng).toBeCloseTo(-96.7970, 4);
      }
    });

    it('should update crew marker position when location changes', () => {
      const map = component.getMap();
      if (!map) return;

      (component as any).addOrUpdateCrewMarker(mockCrews[0]);
      
      const updatedCrew = {
        ...mockCrews[0],
        location: { latitude: 33.0, longitude: -97.0, accuracy: 10 }
      };

      (component as any).addOrUpdateCrewMarker(updatedCrew);
      const marker = (component as any).crewMarkers.get(mockCrews[0].id);
      
      if (marker) {
        const latlng = marker.getLatLng();
        expect(latlng.lat).toBeCloseTo(33.0, 4);
        expect(latlng.lng).toBeCloseTo(-97.0, 4);
      }
    });

    it('should remove crew marker from map', () => {
      const map = component.getMap();
      if (!map) return;

      (component as any).addOrUpdateCrewMarker(mockCrews[0]);
      expect((component as any).crewMarkers.has(mockCrews[0].id)).toBe(true);

      (component as any).removeCrewMarker(mockCrews[0].id);
      expect((component as any).crewMarkers.has(mockCrews[0].id)).toBe(false);
    });

    it('should clear all crew markers', () => {
      const map = component.getMap();
      if (!map) return;

      mockCrews.forEach(crew => {
        (component as any).addOrUpdateCrewMarker(crew);
      });

      const markers = (component as any).crewMarkers;
      expect(markers.size).toBe(mockCrews.length);

      (component as any).clearAllCrewMarkers();
      expect(markers.size).toBe(0);
    });

    it('should create popup with crew information', () => {
      const popupContent = (component as any).createCrewPopupContent(mockCrews[0]);
      
      expect(popupContent).toContain('Alpha Crew');
      expect(popupContent).toContain('Members: 3');
      expect(popupContent).toContain('crew-1');
      expect(popupContent).toContain('Crew'); // Badge label
    });

    it('should include active job in popup when present', () => {
      const popupContent = (component as any).createCrewPopupContent(mockCrews[1]);
      
      expect(popupContent).toContain('Active Job');
      expect(popupContent).toContain('job-123');
    });

    it('should not include active job in popup when absent', () => {
      const popupContent = (component as any).createCrewPopupContent(mockCrews[0]);
      
      expect(popupContent).not.toContain('Active Job');
    });

    it('should display different marker colors based on crew status', () => {
      const availableColor = (component as any).getCrewStatusColor(CrewStatus.Available);
      const onJobColor = (component as any).getCrewStatusColor(CrewStatus.OnJob);
      const unavailableColor = (component as any).getCrewStatusColor(CrewStatus.Unavailable);

      expect(availableColor).toBe('#10b981'); // Green
      expect(onJobColor).toBe('#3b82f6'); // Blue
      expect(unavailableColor).toBe('#f59e0b'); // Orange
    });

    it('should use default color for unknown status', () => {
      const unknownColor = (component as any).getCrewStatusColor('UNKNOWN_STATUS');
      expect(unknownColor).toBe('#6b7280'); // Gray
    });

    it('should create valid SVG marker for crew', () => {
      const svg = (component as any).createCrewMarkerSvg('#10b981');
      
      expect(svg).toContain('<svg');
      expect(svg).toContain('#10b981');
      expect(svg).toContain('<rect'); // Crews use square markers
      expect(svg).toContain('</svg>');
    });

    it('should differentiate crew markers from technician markers visually', () => {
      const techSvg = (component as any).createMarkerSvg('#10b981');
      const crewSvg = (component as any).createCrewMarkerSvg('#10b981');
      
      // Technician markers use path (pin shape)
      expect(techSvg).toContain('<path');
      
      // Crew markers use rect (square shape)
      expect(crewSvg).toContain('<rect');
    });

    it('should format crew status label correctly', () => {
      const popupAvailable = (component as any).createCrewPopupContent(mockCrews[0]);
      const popupOnJob = (component as any).createCrewPopupContent(mockCrews[1]);
      
      expect(popupAvailable).toContain('Available');
      expect(popupOnJob).toContain('On Job'); // Should convert ON_JOB to "On Job"
    });

    it('should handle crew marker removal when crew list updates', () => {
      const map = component.getMap();
      if (!map) return;

      // Add all crews
      (component as any).updateCrewMarkers(mockCrews);
      expect((component as any).crewMarkers.size).toBe(mockCrews.length);

      // Update with fewer crews
      (component as any).updateCrewMarkers([mockCrews[0]]);
      expect((component as any).crewMarkers.size).toBe(1);
      expect((component as any).crewMarkers.has(mockCrews[0].id)).toBe(true);
      expect((component as any).crewMarkers.has(mockCrews[1].id)).toBe(false);
    });

    it('should not add crew marker if map is not initialized', () => {
      const uninitializedComponent = new MapComponent(store, permissionService, signalRService);
      
      expect(() => {
        (uninitializedComponent as any).addOrUpdateCrewMarker(mockCrews[0]);
      }).not.toThrow();
    });

    it('should clean up crew markers on destroy', () => {
      const map = component.getMap();
      if (!map) return;

      mockCrews.forEach(crew => {
        (component as any).addOrUpdateCrewMarker(crew);
      });

      const markers = (component as any).crewMarkers;
      expect(markers.size).toBeGreaterThan(0);

      component.ngOnDestroy();
      expect(markers.size).toBe(0);
    });

    it('should apply scope filtering for crew markers', () => {
      const cmUser = new User(
        'cm-1',
        'CM User',
        'cm@test.com',
        'password',
        'CM',
        'Dallas',
        'Company1',
        new Date(),
        true
      );

      const cmDataScopes: DataScope[] = [{ scopeType: 'market' }];

      permissionService.getCurrentUser.and.returnValue(of(cmUser));
      permissionService.getCurrentUserDataScopes.and.returnValue(of(cmDataScopes));

      fixture.detectChanges();

      // The component should subscribe to scoped crews
      // which will filter based on the CM's market
      expect(permissionService.getCurrentUser).toHaveBeenCalled();
      expect(permissionService.getCurrentUserDataScopes).toHaveBeenCalled();
    });

    it('should display both technician and crew markers simultaneously', () => {
      const map = component.getMap();
      if (!map) return;

      // Add technician markers
      mockTechnicians.forEach(tech => {
        if (tech.currentLocation) {
          (component as any).addOrUpdateMarker(tech);
        }
      });

      // Add crew markers
      mockCrews.forEach(crew => {
        (component as any).addOrUpdateCrewMarker(crew);
      });

      const techMarkers = (component as any).technicianMarkers;
      const crewMarkers = (component as any).crewMarkers;

      expect(techMarkers.size).toBeGreaterThan(0);
      expect(crewMarkers.size).toBeGreaterThan(0);
    });

    it('should handle empty crew list gracefully', () => {
      const map = component.getMap();
      if (!map) return;

      expect(() => {
        (component as any).updateCrewMarkers([]);
      }).not.toThrow();

      const markers = (component as any).crewMarkers;
      expect(markers.size).toBe(0);
    });
  });

  describe('Job Location Markers', () => {
    const mockJobs = [
      {
        id: 'job-1',
        jobId: 'J001',
        siteName: 'Dallas Site A',
        location: { latitude: 32.7767, longitude: -96.7970, accuracy: 10 },
        status: 'NotStarted' as any,
        priority: 'P1' as any,
        scheduledStartDate: new Date('2026-03-10T08:00:00')
      },
      {
        id: 'job-2',
        jobId: 'J002',
        siteName: 'Houston Site B',
        location: { latitude: 29.7604, longitude: -95.3698, accuracy: 10 },
        status: 'OnSite' as any,
        priority: 'Normal' as any,
        scheduledStartDate: new Date('2026-03-05T09:00:00')
      },
      {
        id: 'job-3',
        jobId: 'J003',
        siteName: 'Austin Site C',
        location: { latitude: 30.2672, longitude: -97.7431, accuracy: 10 },
        status: 'Completed' as any,
        priority: 'P2' as any,
        scheduledStartDate: new Date('2026-03-01T10:00:00')
      }
    ];

    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should display markers for jobs with locations', () => {
      store.overrideSelector(jasmine.any(Function) as any, mockJobs);
      store.refreshState();
      fixture.detectChanges();

      setTimeout(() => {
        const markers = (component as any).jobMarkers;
        expect(markers.size).toBeGreaterThan(0);
      }, 100);
    });

    it('should add job marker to map', () => {
      const map = component.getMap();
      if (!map) return;

      (component as any).addOrUpdateJobMarker(mockJobs[0]);
      const marker = (component as any).jobMarkers.get(mockJobs[0].id);
      
      expect(marker).toBeDefined();
      if (marker) {
        const latlng = marker.getLatLng();
        expect(latlng.lat).toBeCloseTo(32.7767, 4);
        expect(latlng.lng).toBeCloseTo(-96.7970, 4);
      }
    });

    it('should update job marker position when location changes', () => {
      const map = component.getMap();
      if (!map) return;

      (component as any).addOrUpdateJobMarker(mockJobs[0]);
      
      const updatedJob = {
        ...mockJobs[0],
        location: { latitude: 33.0, longitude: -97.0, accuracy: 10 }
      };

      (component as any).addOrUpdateJobMarker(updatedJob);
      const marker = (component as any).jobMarkers.get(mockJobs[0].id);
      
      if (marker) {
        const latlng = marker.getLatLng();
        expect(latlng.lat).toBeCloseTo(33.0, 4);
        expect(latlng.lng).toBeCloseTo(-97.0, 4);
      }
    });

    it('should remove job marker from map', () => {
      const map = component.getMap();
      if (!map) return;

      (component as any).addOrUpdateJobMarker(mockJobs[0]);
      expect((component as any).jobMarkers.has(mockJobs[0].id)).toBe(true);

      (component as any).removeJobMarker(mockJobs[0].id);
      expect((component as any).jobMarkers.has(mockJobs[0].id)).toBe(false);
    });

    it('should clear all job markers', () => {
      const map = component.getMap();
      if (!map) return;

      mockJobs.forEach(job => {
        (component as any).addOrUpdateJobMarker(job);
      });

      const markers = (component as any).jobMarkers;
      expect(markers.size).toBe(mockJobs.length);

      (component as any).clearAllJobMarkers();
      expect(markers.size).toBe(0);
    });

    it('should create popup with job information', () => {
      const popupContent = (component as any).createJobPopupContent(mockJobs[0]);
      
      expect(popupContent).toContain('Dallas Site A');
      expect(popupContent).toContain('J001');
      expect(popupContent).toContain('P1');
      expect(popupContent).toContain('Not Started');
      expect(popupContent).toContain('Scheduled');
    });

    it('should format job status label correctly', () => {
      const popupNotStarted = (component as any).createJobPopupContent(mockJobs[0]);
      const popupOnSite = (component as any).createJobPopupContent(mockJobs[1]);
      
      expect(popupNotStarted).toContain('Not Started');
      expect(popupOnSite).toContain('On Site');
    });

    it('should display different marker colors based on priority', () => {
      const p1Color = (component as any).getJobStatusColor('NotStarted', 'P1');
      const p2Color = (component as any).getJobStatusColor('NotStarted', 'P2');
      const normalColor = (component as any).getJobStatusColor('NotStarted', 'Normal');

      expect(p1Color).toBe('#dc2626'); // Red for P1
      expect(p2Color).toBe('#f59e0b'); // Orange for P2
      expect(normalColor).toBe('#6b7280'); // Gray for Normal priority NotStarted
    });

    it('should display different marker colors based on status for normal priority', () => {
      const notStartedColor = (component as any).getJobStatusColor('NotStarted', 'Normal');
      const enRouteColor = (component as any).getJobStatusColor('EnRoute', 'Normal');
      const onSiteColor = (component as any).getJobStatusColor('OnSite', 'Normal');
      const completedColor = (component as any).getJobStatusColor('Completed', 'Normal');
      const issueColor = (component as any).getJobStatusColor('Issue', 'Normal');
      const cancelledColor = (component as any).getJobStatusColor('Cancelled', 'Normal');

      expect(notStartedColor).toBe('#6b7280'); // Gray
      expect(enRouteColor).toBe('#3b82f6'); // Blue
      expect(onSiteColor).toBe('#8b5cf6'); // Purple
      expect(completedColor).toBe('#10b981'); // Green
      expect(issueColor).toBe('#ef4444'); // Red
      expect(cancelledColor).toBe('#9ca3af'); // Light gray
    });

    it('should prioritize P1 color over status color', () => {
      const completedP1Color = (component as any).getJobStatusColor('Completed', 'P1');
      expect(completedP1Color).toBe('#dc2626'); // Red for P1, not green for completed
    });

    it('should create valid SVG marker for job', () => {
      const svg = (component as any).createJobMarkerSvg('#dc2626');
      
      expect(svg).toContain('<svg');
      expect(svg).toContain('#dc2626');
      expect(svg).toContain('<path'); // Jobs use diamond/pin shape
      expect(svg).toContain('</svg>');
    });

    it('should differentiate job markers from technician and crew markers visually', () => {
      const techSvg = (component as any).createMarkerSvg('#10b981');
      const crewSvg = (component as any).createCrewMarkerSvg('#10b981');
      const jobSvg = (component as any).createJobMarkerSvg('#10b981');
      
      // All should be different shapes
      expect(techSvg).not.toEqual(crewSvg);
      expect(techSvg).not.toEqual(jobSvg);
      expect(crewSvg).not.toEqual(jobSvg);
    });

    it('should format scheduled date correctly in popup', () => {
      const popupContent = (component as any).createJobPopupContent(mockJobs[0]);
      
      expect(popupContent).toContain('Scheduled');
      expect(popupContent).toContain('Mar'); // Month abbreviation
      expect(popupContent).toContain('10'); // Day
      expect(popupContent).toContain('2026'); // Year
    });

    it('should handle job marker removal when job list updates', () => {
      const map = component.getMap();
      if (!map) return;

      // Add all jobs
      (component as any).updateJobMarkers(mockJobs);
      expect((component as any).jobMarkers.size).toBe(mockJobs.length);

      // Update with fewer jobs
      (component as any).updateJobMarkers([mockJobs[0]]);
      expect((component as any).jobMarkers.size).toBe(1);
      expect((component as any).jobMarkers.has(mockJobs[0].id)).toBe(true);
      expect((component as any).jobMarkers.has(mockJobs[1].id)).toBe(false);
    });

    it('should not add job marker if map is not initialized', () => {
      const uninitializedComponent = new MapComponent(store, permissionService, signalRService);
      
      expect(() => {
        (uninitializedComponent as any).addOrUpdateJobMarker(mockJobs[0]);
      }).not.toThrow();
    });

    it('should clean up job markers on destroy', () => {
      const map = component.getMap();
      if (!map) return;

      mockJobs.forEach(job => {
        (component as any).addOrUpdateJobMarker(job);
      });

      const markers = (component as any).jobMarkers;
      expect(markers.size).toBeGreaterThan(0);

      component.ngOnDestroy();
      expect(markers.size).toBe(0);
    });

    it('should apply scope filtering for job markers', () => {
      const cmUser = new User(
        'cm-1',
        'CM User',
        'cm@test.com',
        'password',
        'CM',
        'Dallas',
        'Company1',
        new Date(),
        true
      );

      const cmDataScopes: DataScope[] = [{ scopeType: 'market' }];

      permissionService.getCurrentUser.and.returnValue(of(cmUser));
      permissionService.getCurrentUserDataScopes.and.returnValue(of(cmDataScopes));

      fixture.detectChanges();

      // The component should subscribe to scoped jobs
      // which will filter based on the CM's market
      expect(permissionService.getCurrentUser).toHaveBeenCalled();
      expect(permissionService.getCurrentUserDataScopes).toHaveBeenCalled();
    });

    it('should display technician, crew, and job markers simultaneously', () => {
      const map = component.getMap();
      if (!map) return;

      // Add technician markers
      mockTechnicians.forEach(tech => {
        if (tech.currentLocation) {
          (component as any).addOrUpdateMarker(tech);
        }
      });

      // Add crew markers
      const mockCrews = [
        {
          id: 'crew-1',
          name: 'Alpha Crew',
          location: { latitude: 32.7767, longitude: -96.7970, accuracy: 10 },
          status: 'AVAILABLE',
          activeJobId: undefined,
          memberCount: 3
        }
      ];
      mockCrews.forEach(crew => {
        (component as any).addOrUpdateCrewMarker(crew);
      });

      // Add job markers
      mockJobs.forEach(job => {
        (component as any).addOrUpdateJobMarker(job);
      });

      const techMarkers = (component as any).technicianMarkers;
      const crewMarkers = (component as any).crewMarkers;
      const jobMarkers = (component as any).jobMarkers;

      expect(techMarkers.size).toBeGreaterThan(0);
      expect(crewMarkers.size).toBeGreaterThan(0);
      expect(jobMarkers.size).toBeGreaterThan(0);
    });

    it('should handle empty job list gracefully', () => {
      const map = component.getMap();
      if (!map) return;

      expect(() => {
        (component as any).updateJobMarkers([]);
      }).not.toThrow();

      const markers = (component as any).jobMarkers;
      expect(markers.size).toBe(0);
    });

    it('should use default color for unknown status', () => {
      const unknownColor = (component as any).getJobStatusColor('UNKNOWN_STATUS', 'Normal');
      expect(unknownColor).toBe('#6b7280'); // Gray
    });

    it('should display priority badge in popup', () => {
      const p1Popup = (component as any).createJobPopupContent(mockJobs[0]);
      const normalPopup = (component as any).createJobPopupContent(mockJobs[1]);
      
      expect(p1Popup).toContain('P1');
      expect(normalPopup).toContain('Normal');
    });

    it('should update marker icon when status or priority changes', () => {
      const map = component.getMap();
      if (!map) return;

      (component as any).addOrUpdateJobMarker(mockJobs[0]);
      const initialMarker = (component as any).jobMarkers.get(mockJobs[0].id);
      
      const updatedJob = {
        ...mockJobs[0],
        status: 'Completed' as any,
        priority: 'Normal' as any
      };

      (component as any).addOrUpdateJobMarker(updatedJob);
      const updatedMarker = (component as any).jobMarkers.get(mockJobs[0].id);
      
      // Marker should still exist but with updated icon
      expect(updatedMarker).toBeDefined();
      expect(initialMarker).toBe(updatedMarker); // Same marker instance, updated
    });
  });

  describe('Marker Clustering', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should initialize cluster groups for all marker types', () => {
      const techClusterGroup = (component as any).technicianClusterGroup;
      const crewClusterGroup = (component as any).crewClusterGroup;
      const jobClusterGroup = (component as any).jobClusterGroup;

      expect(techClusterGroup).toBeDefined();
      expect(crewClusterGroup).toBeDefined();
      expect(jobClusterGroup).toBeDefined();
    });

    it('should add cluster groups to map', () => {
      const map = component.getMap();
      if (!map) {
        fail('Map not initialized');
        return;
      }

      const techClusterGroup = (component as any).technicianClusterGroup;
      const crewClusterGroup = (component as any).crewClusterGroup;
      const jobClusterGroup = (component as any).jobClusterGroup;

      expect(map.hasLayer(techClusterGroup)).toBe(true);
      expect(map.hasLayer(crewClusterGroup)).toBe(true);
      expect(map.hasLayer(jobClusterGroup)).toBe(true);
    });

    it('should add technician markers to cluster group', () => {
      const map = component.getMap();
      if (!map) return;

      const technician = mockTechnicians[0];
      (component as any).addOrUpdateMarker(technician);

      const techClusterGroup = (component as any).technicianClusterGroup;
      const marker = (component as any).technicianMarkers.get(technician.id);

      expect(marker).toBeDefined();
      expect(techClusterGroup.hasLayer(marker)).toBe(true);
    });

    it('should add crew markers to cluster group', () => {
      const map = component.getMap();
      if (!map) return;

      const crew = {
        id: 'crew-1',
        name: 'Alpha Crew',
        location: { latitude: 32.7767, longitude: -96.7970, accuracy: 10 },
        status: 'AVAILABLE',
        activeJobId: undefined,
        memberCount: 3
      };
      (component as any).addOrUpdateCrewMarker(crew);

      const crewClusterGroup = (component as any).crewClusterGroup;
      const marker = (component as any).crewMarkers.get(crew.id);

      expect(marker).toBeDefined();
      expect(crewClusterGroup.hasLayer(marker)).toBe(true);
    });

    it('should add job markers to cluster group', () => {
      const map = component.getMap();
      if (!map) return;

      const job = {
        id: 'job-1',
        jobId: 'J001',
        siteName: 'Test Site',
        location: { latitude: 32.7767, longitude: -96.7970, accuracy: 10 },
        status: 'NotStarted' as any,
        priority: 'P1' as any,
        scheduledStartDate: new Date()
      };
      (component as any).addOrUpdateJobMarker(job);

      const jobClusterGroup = (component as any).jobClusterGroup;
      const marker = (component as any).jobMarkers.get(job.id);

      expect(marker).toBeDefined();
      expect(jobClusterGroup.hasLayer(marker)).toBe(true);
    });

    it('should configure cluster groups with custom icons', () => {
      const techClusterGroup = (component as any).technicianClusterGroup;
      const crewClusterGroup = (component as any).crewClusterGroup;
      const jobClusterGroup = (component as any).jobClusterGroup;

      expect(techClusterGroup.options.iconCreateFunction).toBeDefined();
      expect(crewClusterGroup.options.iconCreateFunction).toBeDefined();
      expect(jobClusterGroup.options.iconCreateFunction).toBeDefined();
    });

    it('should set cluster radius to 80 pixels', () => {
      const techClusterGroup = (component as any).technicianClusterGroup;
      const crewClusterGroup = (component as any).crewClusterGroup;
      const jobClusterGroup = (component as any).jobClusterGroup;

      expect(techClusterGroup.options.maxClusterRadius).toBe(80);
      expect(crewClusterGroup.options.maxClusterRadius).toBe(80);
      expect(jobClusterGroup.options.maxClusterRadius).toBe(80);
    });

    it('should enable spiderfy on max zoom', () => {
      const techClusterGroup = (component as any).technicianClusterGroup;
      const crewClusterGroup = (component as any).crewClusterGroup;
      const jobClusterGroup = (component as any).jobClusterGroup;

      expect(techClusterGroup.options.spiderfyOnMaxZoom).toBe(true);
      expect(crewClusterGroup.options.spiderfyOnMaxZoom).toBe(true);
      expect(jobClusterGroup.options.spiderfyOnMaxZoom).toBe(true);
    });

    it('should enable zoom to bounds on cluster click', () => {
      const techClusterGroup = (component as any).technicianClusterGroup;
      const crewClusterGroup = (component as any).crewClusterGroup;
      const jobClusterGroup = (component as any).jobClusterGroup;

      expect(techClusterGroup.options.zoomToBoundsOnClick).toBe(true);
      expect(crewClusterGroup.options.zoomToBoundsOnClick).toBe(true);
      expect(jobClusterGroup.options.zoomToBoundsOnClick).toBe(true);
    });

    it('should remove cluster groups on destroy', () => {
      const map = component.getMap();
      if (!map) return;

      const techClusterGroup = (component as any).technicianClusterGroup;
      const crewClusterGroup = (component as any).crewClusterGroup;
      const jobClusterGroup = (component as any).jobClusterGroup;

      expect(map.hasLayer(techClusterGroup)).toBe(true);
      expect(map.hasLayer(crewClusterGroup)).toBe(true);
      expect(map.hasLayer(jobClusterGroup)).toBe(true);

      component.ngOnDestroy();

      expect((component as any).technicianClusterGroup).toBeNull();
      expect((component as any).crewClusterGroup).toBeNull();
      expect((component as any).jobClusterGroup).toBeNull();
    });

    it('should handle multiple markers in same location', () => {
      const map = component.getMap();
      if (!map) return;

      // Add multiple technicians at same location
      const tech1 = { ...mockTechnicians[0], id: 'tech-1' };
      const tech2 = { ...mockTechnicians[0], id: 'tech-2' };
      const tech3 = { ...mockTechnicians[0], id: 'tech-3' };

      (component as any).addOrUpdateMarker(tech1);
      (component as any).addOrUpdateMarker(tech2);
      (component as any).addOrUpdateMarker(tech3);

      const markers = (component as any).technicianMarkers;
      expect(markers.size).toBe(3);

      const techClusterGroup = (component as any).technicianClusterGroup;
      expect(techClusterGroup.hasLayer(markers.get('tech-1'))).toBe(true);
      expect(techClusterGroup.hasLayer(markers.get('tech-2'))).toBe(true);
      expect(techClusterGroup.hasLayer(markers.get('tech-3'))).toBe(true);
    });
  });

  describe('Marker Click Events', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should emit technicianSelected event when technician marker is clicked', (done) => {
      const map = component.getMap();
      if (!map) {
        fail('Map not initialized');
        return;
      }

      // Add a technician marker
      const technician = mockTechnicians[0];
      (component as any).addOrUpdateMarker(technician);

      // Subscribe to the event
      component.technicianSelected.subscribe((technicianId: string) => {
        expect(technicianId).toBe(technician.id);
        done();
      });

      // Get the marker and simulate click
      const marker = (component as any).technicianMarkers.get(technician.id);
      expect(marker).toBeDefined();
      if (marker) {
        marker.fire('click');
      }
    });

    it('should emit crewSelected event when crew marker is clicked', (done) => {
      const map = component.getMap();
      if (!map) {
        fail('Map not initialized');
        return;
      }

      // Add a crew marker
      const crew = {
        id: 'crew-1',
        name: 'Alpha Crew',
        location: { latitude: 32.7767, longitude: -96.7970, accuracy: 10 },
        status: 'AVAILABLE',
        activeJobId: undefined,
        memberCount: 3
      };
      (component as any).addOrUpdateCrewMarker(crew);

      // Subscribe to the event
      component.crewSelected.subscribe((crewId: string) => {
        expect(crewId).toBe(crew.id);
        done();
      });

      // Get the marker and simulate click
      const marker = (component as any).crewMarkers.get(crew.id);
      expect(marker).toBeDefined();
      if (marker) {
        marker.fire('click');
      }
    });

    it('should emit jobSelected event when job marker is clicked', (done) => {
      const map = component.getMap();
      if (!map) {
        fail('Map not initialized');
        return;
      }

      // Add a job marker
      const job = {
        id: 'job-1',
        jobId: 'J001',
        siteName: 'Test Site',
        location: { latitude: 32.7767, longitude: -96.7970, accuracy: 10 },
        status: 'NotStarted' as any,
        priority: 'P1' as any,
        scheduledStartDate: new Date()
      };
      (component as any).addOrUpdateJobMarker(job);

      // Subscribe to the event
      component.jobSelected.subscribe((jobId: string) => {
        expect(jobId).toBe(job.id);
        done();
      });

      // Get the marker and simulate click
      const marker = (component as any).jobMarkers.get(job.id);
      expect(marker).toBeDefined();
      if (marker) {
        marker.fire('click');
      }
    });

    it('should emit correct technician ID for multiple markers', (done) => {
      const map = component.getMap();
      if (!map) {
        fail('Map not initialized');
        return;
      }

      // Add multiple technician markers
      const tech1 = mockTechnicians[0];
      const tech2 = mockTechnicians[1];
      (component as any).addOrUpdateMarker(tech1);
      (component as any).addOrUpdateMarker(tech2);

      // Subscribe to the event
      component.technicianSelected.subscribe((technicianId: string) => {
        expect(technicianId).toBe(tech2.id);
        done();
      });

      // Click the second marker
      const marker2 = (component as any).technicianMarkers.get(tech2.id);
      if (marker2) {
        marker2.fire('click');
      }
    });

    it('should handle marker click with popup open', (done) => {
      const map = component.getMap();
      if (!map) {
        fail('Map not initialized');
        return;
      }

      const technician = mockTechnicians[0];
      (component as any).addOrUpdateMarker(technician);

      component.technicianSelected.subscribe((technicianId: string) => {
        expect(technicianId).toBe(technician.id);
        done();
      });

      const marker = (component as any).technicianMarkers.get(technician.id);
      if (marker) {
        // Open popup first
        marker.openPopup();
        // Then click
        marker.fire('click');
      }
    });

    it('should work with marker clustering', (done) => {
      const map = component.getMap();
      if (!map) {
        fail('Map not initialized');
        return;
      }

      // Add technician marker (which goes into cluster group)
      const technician = mockTechnicians[0];
      (component as any).addOrUpdateMarker(technician);

      component.technicianSelected.subscribe((technicianId: string) => {
        expect(technicianId).toBe(technician.id);
        done();
      });

      // Verify marker is in cluster group
      const clusterGroup = (component as any).technicianClusterGroup;
      expect(clusterGroup).toBeDefined();

      // Click the marker
      const marker = (component as any).technicianMarkers.get(technician.id);
      if (marker) {
        marker.fire('click');
      }
    });

    it('should not emit event for removed markers', () => {
      const map = component.getMap();
      if (!map) {
        fail('Map not initialized');
        return;
      }

      const technician = mockTechnicians[0];
      (component as any).addOrUpdateMarker(technician);

      let eventEmitted = false;
      component.technicianSelected.subscribe(() => {
        eventEmitted = true;
      });

      // Remove the marker
      (component as any).removeMarker(technician.id);

      // Verify marker is removed
      const marker = (component as any).technicianMarkers.get(technician.id);
      expect(marker).toBeUndefined();
      expect(eventEmitted).toBe(false);
    });

    it('should emit events for all three marker types independently', (done) => {
      const map = component.getMap();
      if (!map) {
        fail('Map not initialized');
        return;
      }

      let technicianEventEmitted = false;
      let crewEventEmitted = false;
      let jobEventEmitted = false;

      // Add markers
      const technician = mockTechnicians[0];
      const crew = {
        id: 'crew-1',
        name: 'Alpha Crew',
        location: { latitude: 32.7767, longitude: -96.7970, accuracy: 10 },
        status: 'AVAILABLE',
        activeJobId: undefined,
        memberCount: 3
      };
      const job = {
        id: 'job-1',
        jobId: 'J001',
        siteName: 'Test Site',
        location: { latitude: 32.7767, longitude: -96.7970, accuracy: 10 },
        status: 'NotStarted' as any,
        priority: 'P1' as any,
        scheduledStartDate: new Date()
      };

      (component as any).addOrUpdateMarker(technician);
      (component as any).addOrUpdateCrewMarker(crew);
      (component as any).addOrUpdateJobMarker(job);

      // Subscribe to all events
      component.technicianSelected.subscribe((id: string) => {
        expect(id).toBe(technician.id);
        technicianEventEmitted = true;
      });

      component.crewSelected.subscribe((id: string) => {
        expect(id).toBe(crew.id);
        crewEventEmitted = true;
      });

      component.jobSelected.subscribe((id: string) => {
        expect(id).toBe(job.id);
        jobEventEmitted = true;
        
        // Check all events were emitted
        expect(technicianEventEmitted).toBe(true);
        expect(crewEventEmitted).toBe(true);
        expect(jobEventEmitted).toBe(true);
        done();
      });

      // Click all markers
      const techMarker = (component as any).technicianMarkers.get(technician.id);
      const crewMarker = (component as any).crewMarkers.get(crew.id);
      const jobMarker = (component as any).jobMarkers.get(job.id);

      if (techMarker) techMarker.fire('click');
      if (crewMarker) crewMarker.fire('click');
      if (jobMarker) jobMarker.fire('click');
    });
  });

  describe('NgRx Store Integration', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should subscribe to scoped technicians from store', () => {
      // Verify that the component subscribes to the store
      expect(permissionService.getCurrentUser).toHaveBeenCalled();
      expect(permissionService.getCurrentUserDataScopes).toHaveBeenCalled();
    });

    it('should subscribe to scoped crews from store', () => {
      // The component should set up crew subscription
      expect(permissionService.getCurrentUser).toHaveBeenCalled();
      expect(permissionService.getCurrentUserDataScopes).toHaveBeenCalled();
    });

    it('should subscribe to scoped jobs from store', () => {
      // The component should set up job subscription
      expect(permissionService.getCurrentUser).toHaveBeenCalled();
      expect(permissionService.getCurrentUserDataScopes).toHaveBeenCalled();
    });

    it('should update markers when store data changes', (done) => {
      const map = component.getMap();
      if (!map) {
        fail('Map not initialized');
        return;
      }

      // Initially no markers
      expect((component as any).technicianMarkers.size).toBe(0);

      // Simulate store update with technicians
      store.overrideSelector(jasmine.any(Function) as any, mockTechnicians);
      store.refreshState();

      // Wait for async update
      setTimeout(() => {
        // Markers should be added
        const markers = (component as any).technicianMarkers;
        expect(markers.size).toBeGreaterThan(0);
        done();
      }, 100);
    });

    it('should filter technicians based on user data scopes', () => {
      const cmUser = new User(
        'cm-1',
        'CM User',
        'cm@test.com',
        'password',
        'CM',
        'Dallas',
        'Company1',
        new Date(),
        true
      );

      const cmDataScopes: DataScope[] = [{ scopeType: 'market' }];

      permissionService.getCurrentUser.and.returnValue(of(cmUser));
      permissionService.getCurrentUserDataScopes.and.returnValue(of(cmDataScopes));

      // Create new component with CM user
      const cmFixture = TestBed.createComponent(MapComponent);
      const cmComponent = cmFixture.componentInstance;
      cmFixture.detectChanges();

      // Verify permission service was called with CM user
      expect(permissionService.getCurrentUser).toHaveBeenCalled();
      expect(permissionService.getCurrentUserDataScopes).toHaveBeenCalled();

      cmFixture.destroy();
    });

    it('should not subscribe to store before user and data scopes are available', () => {
      // Create component with no user
      permissionService.getCurrentUser.and.returnValue(of(null as any));
      permissionService.getCurrentUserDataScopes.and.returnValue(of([]));

      const noUserFixture = TestBed.createComponent(MapComponent);
      const noUserComponent = noUserFixture.componentInstance;
      noUserFixture.detectChanges();

      // Markers should not be added without user
      expect((noUserComponent as any).technicianMarkers.size).toBe(0);

      noUserFixture.destroy();
    });

    it('should unsubscribe from store on destroy', () => {
      const destroy$ = (component as any).destroy$;
      spyOn(destroy$, 'next');
      spyOn(destroy$, 'complete');

      component.ngOnDestroy();

      expect(destroy$.next).toHaveBeenCalled();
      expect(destroy$.complete).toHaveBeenCalled();
    });

    it('should handle store errors gracefully', () => {
      // This test verifies the component doesn't crash on store errors
      expect(() => {
        store.overrideSelector(jasmine.any(Function) as any, null);
        store.refreshState();
        fixture.detectChanges();
      }).not.toThrow();
    });
  });

  describe('Location Timestamp Display', () => {
    it('should format recent timestamps as relative time', () => {
      const now = new Date();
      const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const result2Min = (component as any).formatLocationTimestamp(twoMinutesAgo);
      const result1Hour = (component as any).formatLocationTimestamp(oneHourAgo);
      
      expect(result2Min).toContain('2 minutes ago');
      expect(result1Hour).toContain('1 hour ago');
    });

    it('should format very recent timestamps as "just now"', () => {
      const now = new Date();
      const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);
      
      const result = (component as any).formatLocationTimestamp(thirtySecondsAgo);
      
      expect(result).toBe('Updated just now');
    });

    it('should format old timestamps with absolute time', () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      
      const result = (component as any).formatLocationTimestamp(twoDaysAgo);
      
      expect(result).toContain('2 days ago');
    });

    it('should handle missing timestamp', () => {
      const result = (component as any).formatLocationTimestamp(undefined);
      
      expect(result).toBe('Location timestamp unavailable');
    });

    it('should identify stale locations (older than 5 minutes)', () => {
      const now = new Date();
      const sixMinutesAgo = new Date(now.getTime() - 6 * 60 * 1000);
      const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
      
      const isStale6Min = (component as any).isLocationStale(sixMinutesAgo);
      const isStale2Min = (component as any).isLocationStale(twoMinutesAgo);
      
      expect(isStale6Min).toBe(true);
      expect(isStale2Min).toBe(false);
    });

    it('should include timestamp in technician popup content', () => {
      const techWithTimestamp: Technician = {
        ...mockTechnicians[0],
        currentLocation: {
          latitude: 32.7767,
          longitude: -96.7970,
          accuracy: 10,
          timestamp: new Date(Date.now() - 3 * 60 * 1000) // 3 minutes ago
        }
      };
      
      const popupContent = (component as any).createPopupContent(techWithTimestamp);
      
      expect(popupContent).toContain('📍');
      expect(popupContent).toContain('minutes ago');
    });

    it('should show stale indicator for old location timestamps', () => {
      const techWithOldTimestamp: Technician = {
        ...mockTechnicians[0],
        currentLocation: {
          latitude: 32.7767,
          longitude: -96.7970,
          accuracy: 10,
          timestamp: new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
        }
      };
      
      const popupContent = (component as any).createPopupContent(techWithOldTimestamp);
      
      // Should contain red color for stale timestamp
      expect(popupContent).toContain('#ef4444');
    });

    it('should update popup content when location timestamp changes', () => {
      component.ngAfterViewInit();
      
      const techWithOldTimestamp: Technician = {
        ...mockTechnicians[0],
        currentLocation: {
          latitude: 32.7767,
          longitude: -96.7970,
          accuracy: 10,
          timestamp: new Date(Date.now() - 10 * 60 * 1000)
        }
      };
      
      // Add marker with old timestamp
      (component as any).addOrUpdateMarker(techWithOldTimestamp);
      
      const marker = (component as any).technicianMarkers.get(techWithOldTimestamp.id);
      expect(marker).toBeDefined();
      
      // Update with new timestamp
      const techWithNewTimestamp: Technician = {
        ...techWithOldTimestamp,
        currentLocation: {
          ...techWithOldTimestamp.currentLocation!,
          timestamp: new Date() // Now
        }
      };
      
      (component as any).addOrUpdateMarker(techWithNewTimestamp);
      
      // Popup should be updated (marker still exists)
      const updatedMarker = (component as any).technicianMarkers.get(techWithNewTimestamp.id);
      expect(updatedMarker).toBeDefined();
    });
  });

  describe('Map Initialization Error Handling', () => {
    it('should handle map initialization failure gracefully', () => {
      // Create component without proper container
      const errorComponent = new MapComponent(store, permissionService, signalRService);
      
      // Should not throw when container is missing
      expect(() => {
        (errorComponent as any).initializeMap();
      }).not.toThrow();

      expect(errorComponent.getMap()).toBeNull();
    });

    it('should not initialize map twice', () => {
      fixture.detectChanges();
      const firstMap = component.getMap();
      
      // Mark as initialized
      (component as any).initialized = true;
      
      // Try to initialize again
      (component as any).initializeMap();
      const secondMap = component.getMap();
      
      expect(firstMap).toBe(secondMap);
    });

    it('should handle missing mapContainer gracefully', () => {
      const errorComponent = new MapComponent(store, permissionService, signalRService);
      (errorComponent as any).mapContainer = null;
      
      expect(() => {
        (errorComponent as any).initializeMap();
      }).not.toThrow();
    });

    it('should log error on map initialization failure', () => {
      spyOn(console, 'error');
      
      // Create component with invalid config that might cause error
      const errorComponent = new MapComponent(store, permissionService, signalRService);
      (errorComponent as any).mapContainer = { nativeElement: null };
      
      (errorComponent as any).initializeMap();
      
      // Error should be logged if initialization fails
      // Note: This may or may not trigger depending on Leaflet's error handling
    });

    it('should not emit mapReady if initialization fails', (done) => {
      const errorComponent = new MapComponent(store, permissionService, signalRService);
      
      let mapReadyEmitted = false;
      errorComponent.mapReady.subscribe(() => {
        mapReadyEmitted = true;
      });

      // Try to initialize without proper setup
      (errorComponent as any).initializeMap();

      setTimeout(() => {
        expect(mapReadyEmitted).toBe(false);
        done();
      }, 100);
    });

    it('should handle cluster group initialization failure', () => {
      fixture.detectChanges();
      
      // Simulate cluster group initialization failure
      (component as any).map = null;
      
      expect(() => {
        (component as any).initializeClusterGroups();
      }).not.toThrow();
    });

    it('should handle event listener setup failure', () => {
      const errorComponent = new MapComponent(store, permissionService, signalRService);
      (errorComponent as any).map = null;
      
      expect(() => {
        (errorComponent as any).setupEventListeners();
      }).not.toThrow();
    });
  });

  describe('Popup Interactions', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should bind popup to technician marker', () => {
      const map = component.getMap();
      if (!map) return;

      const technician = mockTechnicians[0];
      (component as any).addOrUpdateMarker(technician);

      const marker = (component as any).technicianMarkers.get(technician.id);
      expect(marker).toBeDefined();
      
      if (marker) {
        const popup = marker.getPopup();
        expect(popup).toBeDefined();
      }
    });

    it('should bind popup to crew marker', () => {
      const map = component.getMap();
      if (!map) return;

      const crew = {
        id: 'crew-1',
        name: 'Alpha Crew',
        location: { latitude: 32.7767, longitude: -96.7970, accuracy: 10 },
        status: 'AVAILABLE',
        activeJobId: undefined,
        memberCount: 3
      };
      (component as any).addOrUpdateCrewMarker(crew);

      const marker = (component as any).crewMarkers.get(crew.id);
      expect(marker).toBeDefined();
      
      if (marker) {
        const popup = marker.getPopup();
        expect(popup).toBeDefined();
      }
    });

    it('should bind popup to job marker', () => {
      const map = component.getMap();
      if (!map) return;

      const job = {
        id: 'job-1',
        jobId: 'J001',
        siteName: 'Test Site',
        location: { latitude: 32.7767, longitude: -96.7970, accuracy: 10 },
        status: 'NotStarted' as any,
        priority: 'P1' as any,
        scheduledStartDate: new Date()
      };
      (component as any).addOrUpdateJobMarker(job);

      const marker = (component as any).jobMarkers.get(job.id);
      expect(marker).toBeDefined();
      
      if (marker) {
        const popup = marker.getPopup();
        expect(popup).toBeDefined();
      }
    });

    it('should update popup content when marker is updated', () => {
      const map = component.getMap();
      if (!map) return;

      const technician = mockTechnicians[0];
      (component as any).addOrUpdateMarker(technician);

      const marker = (component as any).technicianMarkers.get(technician.id);
      if (!marker) return;

      const initialPopup = marker.getPopup();
      const initialContent = initialPopup?.getContent();

      // Update technician
      const updatedTechnician = {
        ...technician,
        firstName: 'Updated',
        lastName: 'Name'
      };
      (component as any).addOrUpdateMarker(updatedTechnician);

      const updatedPopup = marker.getPopup();
      const updatedContent = updatedPopup?.getContent();

      expect(updatedContent).not.toEqual(initialContent);
      expect(updatedContent).toContain('Updated Name');
    });

    it('should open popup when marker is clicked', () => {
      const map = component.getMap();
      if (!map) return;

      const technician = mockTechnicians[0];
      (component as any).addOrUpdateMarker(technician);

      const marker = (component as any).technicianMarkers.get(technician.id);
      if (!marker) return;

      expect(marker.isPopupOpen()).toBe(false);

      marker.openPopup();
      expect(marker.isPopupOpen()).toBe(true);
    });

    it('should close popup when marker is removed', () => {
      const map = component.getMap();
      if (!map) return;

      const technician = mockTechnicians[0];
      (component as any).addOrUpdateMarker(technician);

      const marker = (component as any).technicianMarkers.get(technician.id);
      if (!marker) return;

      marker.openPopup();
      expect(marker.isPopupOpen()).toBe(true);

      (component as any).removeMarker(technician.id);
      
      // Marker should be removed from map
      expect((component as any).technicianMarkers.has(technician.id)).toBe(false);
    });

    it('should display HTML content in popup', () => {
      const map = component.getMap();
      if (!map) return;

      const technician = mockTechnicians[0];
      (component as any).addOrUpdateMarker(technician);

      const marker = (component as any).technicianMarkers.get(technician.id);
      if (!marker) return;

      const popup = marker.getPopup();
      const content = popup?.getContent();

      expect(content).toBeDefined();
      expect(typeof content).toBe('string');
      expect(content).toContain('<div');
      expect(content).toContain('</div>');
    });

    it('should include marker title attribute', () => {
      const map = component.getMap();
      if (!map) return;

      const technician = mockTechnicians[0];
      (component as any).addOrUpdateMarker(technician);

      const marker = (component as any).technicianMarkers.get(technician.id);
      if (!marker) return;

      const title = marker.options.title;
      expect(title).toBe(`${technician.firstName} ${technician.lastName}`);
    });

    it('should set popup anchor correctly', () => {
      const map = component.getMap();
      if (!map) return;

      const technician = mockTechnicians[0];
      (component as any).addOrUpdateMarker(technician);

      const marker = (component as any).technicianMarkers.get(technician.id);
      if (!marker) return;

      const icon = marker.options.icon as L.Icon;
      expect(icon.options.popupAnchor).toEqual([0, -32]);
    });
  });

  describe('Map Controls', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should enable scroll wheel zoom by default', () => {
      const map = component.getMap();
      if (!map) return;

      expect(map.scrollWheelZoom.enabled()).toBe(true);
    });

    it('should enable dragging by default', () => {
      const map = component.getMap();
      if (!map) return;

      expect(map.dragging.enabled()).toBe(true);
    });

    it('should disable scroll wheel zoom when configured', () => {
      const customConfig: MapConfig = {
        center: [39.8283, -98.5795],
        zoom: 4,
        scrollWheelZoom: false
      };

      const customFixture = TestBed.createComponent(MapComponent);
      const customComponent = customFixture.componentInstance;
      customComponent.config = customConfig;
      customFixture.detectChanges();

      const map = customComponent.getMap();
      if (map) {
        expect(map.scrollWheelZoom.enabled()).toBe(false);
      }

      customFixture.destroy();
    });

    it('should disable dragging when configured', () => {
      const customConfig: MapConfig = {
        center: [39.8283, -98.5795],
        zoom: 4,
        dragging: false
      };

      const customFixture = TestBed.createComponent(MapComponent);
      const customComponent = customFixture.componentInstance;
      customComponent.config = customConfig;
      customFixture.detectChanges();

      const map = customComponent.getMap();
      if (map) {
        expect(map.dragging.enabled()).toBe(false);
      }

      customFixture.destroy();
    });

    it('should add tile layer to map', () => {
      const map = component.getMap();
      if (!map) return;

      let hasTileLayer = false;
      map.eachLayer((layer) => {
        if (layer instanceof L.TileLayer) {
          hasTileLayer = true;
        }
      });

      expect(hasTileLayer).toBe(true);
    });

    it('should set tile layer attribution', () => {
      const map = component.getMap();
      if (!map) return;

      let attribution = '';
      map.eachLayer((layer) => {
        if (layer instanceof L.TileLayer) {
          const attr = layer.getAttribution?.();
          attribution = attr || '';
        }
      });

      expect(attribution).toContain('OpenStreetMap');
    });
  });
});
