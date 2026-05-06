import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-credential-form',
  templateUrl: './credential-form.component.html',
  styleUrls: ['./credential-form.component.scss']
})
export class CredentialFormComponent implements OnInit {
  form: FormGroup;
  isEdit = false;
  selectedFile: File | null = null;

  constructor(private fb: FormBuilder, private router: Router, private route: ActivatedRoute) {
    this.form = this.fb.group({
      credentialName: ['', Validators.required],
      issuingOrganization: ['', Validators.required],
      issueDate: ['', Validators.required],
      expirationDate: [''],
      credentialNumber: [''],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.isEdit = !!this.route.snapshot.params['id'];
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) { this.selectedFile = input.files[0]; }
  }

  save(): void {
    if (this.form.valid) {
      console.log('Saving credential:', this.form.value, 'File:', this.selectedFile?.name);
      this.router.navigate(['/field-resource-management/onboarding/credentials']);
    }
  }

  cancel(): void { this.router.navigate(['/field-resource-management/onboarding/credentials']); }
}
