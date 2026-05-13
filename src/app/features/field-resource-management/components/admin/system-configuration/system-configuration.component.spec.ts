import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { SystemConfigurationComponent } from './system-configuration.component';

describe('SystemConfigurationComponent', () => {
  let component: SystemConfigurationComponent;
  let fixture: ComponentFixture<SystemConfigurationComponent>;
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SystemConfigurationComponent ],
      imports: [
        ReactiveFormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatSlideToggleModule,
        MatButtonModule,
        MatIconModule,
        MatChipsModule,
        MatSnackBarModule,
        BrowserAnimationsModule
      ],
      providers: [
        provideMockStore()
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(SystemConfigurationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    expect(component.configForm.get('sessionTimeoutMinutes')?.value).toBe(30);
    expect(component.configForm.get('notificationsEnabled')?.value).toBe(true);
    expect(component.configForm.get('backupRetentionDays')?.value).toBe(30);
  });

  it('should validate session timeout range', () => {
    const control = component.configForm.get('sessionTimeoutMinutes');
    
    control?.setValue(3);
    expect(control?.hasError('min')).toBe(true);
    
    control?.setValue(500);
    expect(control?.hasError('max')).toBe(true);
    
    control?.setValue(30);
    expect(control?.valid).toBe(true);
  });

  it('should validate KPI target ranges', () => {
    const control = component.configForm.get('targetUtilizationRate');
    
    control?.setValue(-5);
    expect(control?.hasError('min')).toBe(true);
    
    control?.setValue(150);
    expect(control?.hasError('max')).toBe(true);
    
    control?.setValue(75);
    expect(control?.valid).toBe(true);
  });

  it('should reset to defaults', () => {
    component.configForm.patchValue({
      sessionTimeoutMinutes: 60,
      targetUtilizationRate: 80
    });
    
    component.onResetToDefaults();
    
    expect(component.configForm.get('sessionTimeoutMinutes')?.value).toBe(30);
    expect(component.configForm.get('targetUtilizationRate')?.value).toBe(75);
  });

  it('should not save invalid form', () => {
    component.configForm.patchValue({
      sessionTimeoutMinutes: 1000 // Invalid: exceeds max
    });
    
    component.onSave();
    
    expect(component.configForm.valid).toBe(false);
  });

  it('should return correct field error messages', () => {
    const control = component.configForm.get('sessionTimeoutMinutes');
    
    control?.setValue(null);
    expect(component.getFieldError('sessionTimeoutMinutes')).toContain('required');
    
    control?.setValue(1);
    expect(component.getFieldError('sessionTimeoutMinutes')).toContain('at least');
  });
});
