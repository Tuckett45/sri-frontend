import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-forgot-password-modal',
  templateUrl: './forgot-password-modal.component.html',
  styleUrls: ['./forgot-password-modal.component.scss']
})
export class ForgotPasswordModalComponent {
  forgotPasswordForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ForgotPasswordModalComponent>
  ) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit(): void {
    if (this.forgotPasswordForm.valid) {
      // Password reset logic goes here (e.g., API call)
      console.log('Forgot Password Form Data:', this.forgotPasswordForm.value);
      this.dialogRef.close(this.forgotPasswordForm.value);
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}