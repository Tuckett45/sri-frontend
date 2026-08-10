import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
  standalone: false
})
export class ResetPasswordComponent implements OnInit {
  resetPasswordForm!: FormGroup;
  resetSuccessful = false;
  tokenValid = false;
  tokenChecked = false;
  tokenError = '';
  token!: string;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    // Get the token from the query parameters
    this.token = this.route.snapshot.queryParams['token'];

    this.resetPasswordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validator: this.passwordsMatch });

    // Validate token on page load
    if (!this.token) {
      this.tokenChecked = true;
      this.tokenValid = false;
      this.tokenError = 'No reset token provided. Please request a new password reset link.';
      return;
    }

    this.authService.validateResetToken(this.token).subscribe({
      next: () => {
        this.tokenChecked = true;
        this.tokenValid = true;
      },
      error: (err) => {
        this.tokenChecked = true;
        this.tokenValid = false;
        if (err.status === 400) {
          this.tokenError = 'This password reset link has expired or is invalid. Please request a new one.';
        } else {
          this.tokenError = 'Unable to verify your reset link. Please try again later.';
        }
      }
    });
  }

  // Custom validator to check if passwords match
  passwordsMatch(group: FormGroup): any {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  }

  onSubmit(): void {
    if (this.resetPasswordForm.invalid) {
      return;
    }

    const newPassword = this.resetPasswordForm.get('newPassword')?.value;

    // Call the backend to reset the password
    this.authService.resetPassword(this.token, newPassword).subscribe({
      next: () => {
        this.toastr.success(
          'Password reset successfully! <a href="/login" class="toastr-link">Log in</a>',
          'Success', {
            enableHtml: true,
            closeButton: true,
            timeOut: 5000
          }
        );
        this.resetSuccessful = true;
      },
      error: (err) => {
        if (err.status === 400) {
          this.toastr.error('Your reset link has expired. Please request a new password reset.');
        } else if (err.status === 500) {
          this.toastr.error('A server error occurred. Please try again later.');
        } else {
          this.toastr.error('Failed to reset password. Please try again.');
        }
      }
    });
  }
}