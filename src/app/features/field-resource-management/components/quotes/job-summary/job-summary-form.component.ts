import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-job-summary-form',
  templateUrl: './job-summary-form.component.html',
  styleUrls: ['./job-summary-form.component.scss']
})
export class JobSummaryFormComponent implements OnInit {
  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      estimatedHours: [0, [Validators.required, Validators.min(0)]],
      laborRate: [75, [Validators.required, Validators.min(0)]],
      numTechnicians: [1, [Validators.required, Validators.min(1)]],
      durationDays: [1, [Validators.required, Validators.min(1)]],
      travelEstimate: [0, Validators.min(0)],
      notes: ['']
    });
  }

  ngOnInit(): void {}

  get totalLaborCost(): number {
    const { estimatedHours, laborRate, numTechnicians, travelEstimate } = this.form.value;
    return (estimatedHours * laborRate * numTechnicians) + (travelEstimate || 0);
  }

  save(): void {
    if (this.form.valid) {
      console.log('Labor estimate saved:', { ...this.form.value, totalLaborCost: this.totalLaborCost });
    }
  }
}
