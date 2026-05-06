import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-incident-reports',
  templateUrl: './incident-reports.component.html',
  styleUrls: ['./incident-reports.component.scss']
})
export class IncidentReportsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  incidents: any[] = [];
  showForm = false;
  incidentForm!: FormGroup;
  displayedColumns = ['incidentDate', 'location', 'severity', 'description', 'actions'];

  severityOptions = ['Minor', 'Moderate', 'Major'];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.incidentForm = this.fb.group({
      incidentDate: [new Date(), Validators.required],
      location: ['', Validators.required],
      description: ['', Validators.required],
      severity: ['Minor', Validators.required]
    });
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
    if (!this.showForm) {
      this.incidentForm.reset({ severity: 'Minor', incidentDate: new Date() });
    }
  }

  onSubmit(): void {
    if (this.incidentForm.valid) {
      this.incidents = [{ ...this.incidentForm.value, id: Date.now() }, ...this.incidents];
      this.showForm = false;
      this.incidentForm.reset({ severity: 'Minor', incidentDate: new Date() });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
