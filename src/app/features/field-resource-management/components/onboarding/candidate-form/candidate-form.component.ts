import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-candidate-form',
  templateUrl: './candidate-form.component.html',
  styleUrls: ['./candidate-form.component.scss']
})
export class CandidateFormComponent implements OnInit {
  form: FormGroup;
  isEdit = false;
  statuses = ['Applied', 'Screening', 'Offer', 'Pre-Employment', 'Onboarding', 'Active'];

  constructor(private fb: FormBuilder, private router: Router, private route: ActivatedRoute) {
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      position: ['', Validators.required],
      startDate: [''],
      status: ['Applied', Validators.required]
    });
  }

  ngOnInit(): void {
    this.isEdit = !!this.route.snapshot.params['id'];
  }

  save(): void {
    if (this.form.valid) {
      console.log('Saving candidate:', this.form.value);
      this.router.navigate(['/field-resource-management/onboarding/candidates']);
    }
  }

  cancel(): void {
    this.router.navigate(['/field-resource-management/onboarding/candidates']);
  }
}
