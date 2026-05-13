import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { OfflineIndicatorComponent } from './offline-indicator.component';
import { OfflineQueueService } from '../../../services/offline-queue.service';

describe('OfflineIndicatorComponent', () => {
  let component: OfflineIndicatorComponent;
  let fixture: ComponentFixture<OfflineIndicatorComponent>;
  let offlineQueueService: jasmine.SpyObj<OfflineQueueService>;

  beforeEach(async () => {
    const offlineQueueServiceSpy = jasmine.createSpyObj('OfflineQueueService', [
      'isCurrentlyOnline'
    ]);

    await TestBed.configureTestingModule({
      declarations: [OfflineIndicatorComponent],
      providers: [
        { provide: OfflineQueueService, useValue: offlineQueueServiceSpy }
      ]
    }).compileComponents();

    offlineQueueService = TestBed.inject(OfflineQueueService) as jasmine.SpyObj<OfflineQueueService>;
    fixture = TestBed.createComponent(OfflineIndicatorComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should initialize with online status when navigator is online', () => {
      offlineQueueService.isCurrentlyOnline.and.returnValue(true);
      
      fixture.detectChanges();
      
      expect(component.isOnline).toBe(true);
      expect(component.showIndicator).toBe(false);
    });

    it('should initialize with offline status when navigator is offline', () => {
      offlineQueueService.isCurrentlyOnline.and.returnValue(false);
      
      fixture.detectChanges();
      
      expect(component.isOnline).toBe(false);
      expect(component.showIndicator).toBe(true);
    });
  });

  describe('Online/Offline Events', () => {
    beforeEach(() => {
      offlineQueueService.isCurrentlyOnline.and.returnValue(true);
      fixture.detectChanges();
    });

    it('should update status when going offline', () => {
      expect(component.isOnline).toBe(true);
      
      // Simulate offline event
      window.dispatchEvent(new Event('offline'));
      
      expect(component.isOnline).toBe(false);
      expect(component.showIndicator).toBe(true);
    });

    it('should update status when coming back online', fakeAsync(() => {
      // Start offline
      component.isOnline = false;
      component.showIndicator = true;
      
      // Simulate online event
      window.dispatchEvent(new Event('online'));
      
      expect(component.isOnline).toBe(true);
      expect(component.showIndicator).toBe(true);
      
      // After 3 seconds, indicator should hide
      tick(3000);
      expect(component.showIndicator).toBe(false);
    }));
  });

  describe('Status Text', () => {
    it('should return online message when online', () => {
      component.isOnline = true;
      
      const statusText = component.getStatusText();
      
      expect(statusText).toBe('You are back online');
    });

    it('should return offline message when offline', () => {
      component.isOnline = false;
      
      const statusText = component.getStatusText();
      
      expect(statusText).toContain('offline');
      expect(statusText).toContain('synced');
    });
  });

  describe('Icon Name', () => {
    it('should return cloud_done icon when online', () => {
      component.isOnline = true;
      
      const iconName = component.getIconName();
      
      expect(iconName).toBe('cloud_done');
    });

    it('should return cloud_off icon when offline', () => {
      component.isOnline = false;
      
      const iconName = component.getIconName();
      
      expect(iconName).toBe('cloud_off');
    });
  });

  describe('Display Text', () => {
    it('should return "Back Online" when online', () => {
      component.isOnline = true;
      
      const displayText = component.getDisplayText();
      
      expect(displayText).toBe('Back Online');
    });

    it('should return "Offline Mode" when offline', () => {
      component.isOnline = false;
      
      const displayText = component.getDisplayText();
      
      expect(displayText).toBe('Offline Mode');
    });
  });

  describe('Component Cleanup', () => {
    it('should clean up on destroy', () => {
      offlineQueueService.isCurrentlyOnline.and.returnValue(true);
      fixture.detectChanges();
      
      spyOn(component['destroy$'], 'next');
      spyOn(component['destroy$'], 'complete');
      
      component.ngOnDestroy();
      
      expect(component['destroy$'].next).toHaveBeenCalled();
      expect(component['destroy$'].complete).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      offlineQueueService.isCurrentlyOnline.and.returnValue(false);
      fixture.detectChanges();
    });

    it('should have role="status" attribute', () => {
      const element = fixture.nativeElement.querySelector('.offline-indicator');
      
      expect(element.getAttribute('role')).toBe('status');
    });

    it('should have aria-live attribute when visible', () => {
      component.showIndicator = true;
      fixture.detectChanges();
      
      const element = fixture.nativeElement.querySelector('.offline-indicator');
      
      expect(element.getAttribute('aria-live')).toBe('polite');
    });

    it('should have aria-label with status text', () => {
      const element = fixture.nativeElement.querySelector('.offline-indicator');
      const ariaLabel = element.getAttribute('aria-label');
      
      expect(ariaLabel).toContain('offline');
    });

    it('should mark icon as aria-hidden', () => {
      const icon = fixture.nativeElement.querySelector('.indicator-icon');
      
      expect(icon.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('Visual States', () => {
    beforeEach(() => {
      offlineQueueService.isCurrentlyOnline.and.returnValue(true);
      fixture.detectChanges();
    });

    it('should apply online class when online', () => {
      component.isOnline = true;
      fixture.detectChanges();
      
      const element = fixture.nativeElement.querySelector('.offline-indicator');
      
      expect(element.classList.contains('online')).toBe(true);
      expect(element.classList.contains('offline')).toBe(false);
    });

    it('should apply offline class when offline', () => {
      component.isOnline = false;
      fixture.detectChanges();
      
      const element = fixture.nativeElement.querySelector('.offline-indicator');
      
      expect(element.classList.contains('offline')).toBe(true);
      expect(element.classList.contains('online')).toBe(false);
    });

    it('should apply visible class when showIndicator is true', () => {
      component.showIndicator = true;
      fixture.detectChanges();
      
      const element = fixture.nativeElement.querySelector('.offline-indicator');
      
      expect(element.classList.contains('visible')).toBe(true);
    });

    it('should not apply visible class when showIndicator is false', () => {
      component.showIndicator = false;
      fixture.detectChanges();
      
      const element = fixture.nativeElement.querySelector('.offline-indicator');
      
      expect(element.classList.contains('visible')).toBe(false);
    });
  });
});
