import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-rfp-intake-form',
  templateUrl: './rfp-intake-form.component.html',
  styleUrls: ['./rfp-intake-form.component.scss']
})
export class RfpIntakeFormComponent implements OnInit {
  @Output() submitted = new EventEmitter<any>();
  @Output() cancelled = new EventEmitter<void>();

  form: FormGroup;
  projectTypes = ['Installation', 'Maintenance', 'Upgrade', 'Assessment', 'Repair'];
  urgencyLevels = ['Standard', 'Expedited', 'Emergency'];

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      clientName: ['', Validators.required],
      clientEmail: ['', [Validators.required, Validators.email]],
      clientPhone: [''],
      projectType: ['Installation', Validators.required],
      projectTitle: ['', Validators.required],
      siteAddress: [''],
      siteCity: [''],
      siteState: [''],
      estimatedStartDate: [''],
      urgency: ['Standard'],
      scopeDescription: ['', Validators.required],
      specialRequirements: [''],
      estimatedBudget: [null]
    });
  }

  ngOnInit(): void {}

  submit(): void {
    if (this.form.valid) {
      this.submitted.emit(this.form.value);
    }
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
