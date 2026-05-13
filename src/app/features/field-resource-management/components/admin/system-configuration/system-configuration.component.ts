import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Store } from '@ngrx/store';
import { SystemConfiguration } from '../../../models/system-configuration.model';

@Component({
  selector: 'app-system-configuration',
  templateUrl: './system-configuration.component.html',
  styleUrls: ['./system-configuration.component.scss']
})
export class SystemConfigurationComponent implements OnInit {
  configForm: FormGroup;
  defaultConfig: SystemConfiguration;

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private snackBar: MatSnackBar
  ) {
    this.configForm = this.fb.group({
      // Session settings
      sessionTimeoutMinutes: [30, [Validators.required, Validators.min(5), Validators.max(480)]],
      
      // Notification settings
      notificationsEnabled: [true],
      emailNotificationsEnabled: [true],
      inAppNotificationsEnabled: [true],
      
      // Backup settings
      backupRetentionDays: [30, [Validators.required, Validators.min(7), Validators.max(365)]],
      autoBackupEnabled: [true],
      
      // KPI settings
      targetUtilizationRate: [75, [Validators.required, Validators.min(0), Validators.max(100)]],
      targetScheduleAdherence: [95, [Validators.required, Validators.min(0), Validators.max(100)]],
      targetTimeEntryCompletion: [100, [Validators.required, Validators.min(0), Validators.max(100)]],
      
      // Job status settings
      jobStatusValues: [['NotStarted', 'EnRoute', 'OnSite', 'Completed', 'Issue', 'Cancelled']],
      delayReasonCodes: [['Traffic', 'Equipment Issue', 'Weather', 'Customer Unavailable', 'Other']]
    });

    this.defaultConfig = this.getDefaultConfiguration();
  }

  ngOnInit(): void {
    // Load current configuration from state
    // this.store.select(selectSystemConfiguration).subscribe(config => {
    //   if (config) {
    //     this.configForm.patchValue(config);
    //   }
    // });
  }

  onSave(): void {
    if (this.configForm.valid) {
      const config: SystemConfiguration = this.configForm.value;
      
      // Dispatch action to save configuration
      // this.store.dispatch(updateSystemConfiguration({ config }));
      
      this.snackBar.open('Configuration saved successfully', 'Close', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });
    } else {
      this.snackBar.open('Please fix validation errors', 'Close', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });
    }
  }

  onResetToDefaults(): void {
    this.configForm.patchValue(this.defaultConfig);
    this.snackBar.open('Configuration reset to defaults', 'Close', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }

  private getDefaultConfiguration(): SystemConfiguration {
    return {
      sessionTimeoutMinutes: 30,
      notificationsEnabled: true,
      emailNotificationsEnabled: true,
      inAppNotificationsEnabled: true,
      backupRetentionDays: 30,
      autoBackupEnabled: true,
      targetUtilizationRate: 75,
      targetScheduleAdherence: 95,
      targetTimeEntryCompletion: 100,
      jobStatusValues: ['NotStarted', 'EnRoute', 'OnSite', 'Completed', 'Issue', 'Cancelled'],
      delayReasonCodes: ['Traffic', 'Equipment Issue', 'Weather', 'Customer Unavailable', 'Other']
    };
  }

  getFieldError(fieldName: string): string {
    const control = this.configForm.get(fieldName);
    if (control?.hasError('required')) {
      return 'This field is required';
    }
    if (control?.hasError('min')) {
      return `Value must be at least ${control.errors?.['min'].min}`;
    }
    if (control?.hasError('max')) {
      return `Value must be at most ${control.errors?.['max'].max}`;
    }
    return '';
  }
}
