import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PermissionErrorDisplayComponent } from './permission-error-display.component';

describe('PermissionErrorDisplayComponent', () => {
  let component: PermissionErrorDisplayComponent;
  let fixture: ComponentFixture<PermissionErrorDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PermissionErrorDisplayComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PermissionErrorDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('displayMessage', () => {
    it('should return custom message when provided', () => {
      component.message = 'Custom access denied message';
      expect(component.displayMessage).toBe('Custom access denied message');
    });

    it('should return default message when no custom message', () => {
      component.message = undefined;
      expect(component.displayMessage).toContain('You do not have permission');
    });
  });

  describe('Template rendering', () => {
    it('should display error title', () => {
      const title = fixture.nativeElement.querySelector('.error-title');
      expect(title.textContent).toContain('Access Denied');
    });

    it('should display error message', () => {
      component.message = 'Test error message';
      fixture.detectChanges();

      const message = fixture.nativeElement.querySelector('.error-message');
      expect(message.textContent).toContain('Test error message');
    });

    it('should display error icon', () => {
      const icon = fixture.nativeElement.querySelector('.error-icon svg');
      expect(icon).toBeTruthy();
    });

    it('should show back button when showBackButton is true', () => {
      component.showBackButton = true;
      fixture.detectChanges();

      const backButton = fixture.nativeElement.querySelector('.btn-secondary');
      expect(backButton).toBeTruthy();
      expect(backButton.textContent).toContain('Go Back');
    });

    it('should hide back button when showBackButton is false', () => {
      component.showBackButton = false;
      fixture.detectChanges();

      const backButton = fixture.nativeElement.querySelector('.btn-secondary');
      expect(backButton).toBeFalsy();
    });

    it('should show contact button when showContactButton is true', () => {
      component.showContactButton = true;
      fixture.detectChanges();

      const contactButton = fixture.nativeElement.querySelector('.btn-primary');
      expect(contactButton).toBeTruthy();
      expect(contactButton.textContent).toContain('Contact Administrator');
    });

    it('should hide contact button when showContactButton is false', () => {
      component.showContactButton = false;
      fixture.detectChanges();

      const contactButton = fixture.nativeElement.querySelector('.btn-primary');
      expect(contactButton).toBeFalsy();
    });
  });

  describe('Actions', () => {
    it('should call goBack when back button is clicked', () => {
      spyOn(window.history, 'back');
      component.showBackButton = true;
      fixture.detectChanges();

      const backButton = fixture.nativeElement.querySelector('.btn-secondary');
      backButton.click();

      expect(window.history.back).toHaveBeenCalled();
    });

    it('should call contactAdmin when contact button is clicked', () => {
      spyOn(console, 'log');
      component.showContactButton = true;
      fixture.detectChanges();

      const contactButton = fixture.nativeElement.querySelector('.btn-primary');
      contactButton.click();

      expect(console.log).toHaveBeenCalledWith('Contact admin requested');
    });
  });
});
