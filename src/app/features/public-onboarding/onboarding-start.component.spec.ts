import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { OnboardingStartComponent } from './onboarding-start.component';
import { PublicOnboardingService } from './public-onboarding.service';

describe('OnboardingStartComponent', () => {
  let component: OnboardingStartComponent;
  let fixture: ComponentFixture<OnboardingStartComponent>;
  let mockService: jasmine.SpyObj<PublicOnboardingService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    mockService = jasmine.createSpyObj('PublicOnboardingService', ['startSession']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    // Default: return a token
    mockService.startSession.and.returnValue(of({ token: 'test-token-123' }));

    await TestBed.configureTestingModule({
      declarations: [OnboardingStartComponent],
      providers: [
        { provide: PublicOnboardingService, useValue: mockService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OnboardingStartComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call startSession on init', () => {
    fixture.detectChanges(); // triggers ngOnInit
    expect(mockService.startSession).toHaveBeenCalled();
  });

  it('should navigate to /onboarding/apply/:token on success', () => {
    fixture.detectChanges();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/onboarding/apply', 'test-token-123']);
  });

  it('should show error state when service fails', () => {
    mockService.startSession.and.returnValue(throwError(() => new Error('fail')));
    fixture.detectChanges();
    expect(component.error).toBeTrue();
    expect(component.loading).toBeFalse();
  });

  it('should disable retry button for 3 seconds after error', fakeAsync(() => {
    mockService.startSession.and.returnValue(throwError(() => new Error('fail')));
    fixture.detectChanges();
    expect(component.retryDisabled).toBeTrue();
    tick(3000);
    expect(component.retryDisabled).toBeFalse();
  }));

  it('should retry when startOnboarding is called again', () => {
    mockService.startSession.and.returnValue(throwError(() => new Error('fail')));
    fixture.detectChanges();

    // Reset to succeed on retry
    mockService.startSession.and.returnValue(of({ token: 'retry-token' }));
    component.startOnboarding();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/onboarding/apply', 'retry-token']);
  });
});
