import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-system-configuration',
  templateUrl: './system-configuration.component.html',
  styleUrls: ['./system-configuration.component.scss']
})
export class SystemConfigurationComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  generalForm!: FormGroup;
  notificationsForm!: FormGroup;
  integrationsForm!: FormGroup;

  timezones = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'];
  dateFormats = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.generalForm = this.fb.group({
      companyName: [''],
      timezone: ['America/New_York'],
      dateFormat: ['MM/DD/YYYY']
    });

    this.notificationsForm = this.fb.group({
      emailEnabled: [true],
      smsEnabled: [false]
    });

    this.integrationsForm = this.fb.group({
      apiUrl: [''],
      signalrEnabled: [false]
    });
  }

  saveGeneral(): void { console.log('General saved', this.generalForm.value); }
  saveNotifications(): void { console.log('Notifications saved', this.notificationsForm.value); }
  saveIntegrations(): void { console.log('Integrations saved', this.integrationsForm.value); }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
