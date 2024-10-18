import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {
  resetPasswordForm!: FormGroup;
  resetSuccessful = false;
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
      newPassword: ['', [Validators.required]],
      confirmPassword: ['', [Validators.required]]
    }, { validator: this.passwordsMatch });
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
    this.authService.resetPassword(this.token, newPassword).subscribe(
      () => {
        this.toastr.success(
          'Password reset successfully! <a href="/login" class="toastr-link">Log in</a>',
          'Success', {
            enableHtml: true, // Allows HTML content in the message
            closeButton: true,
            timeOut: 5000
          }
        );
        this.resetSuccessful = true;
      },
      (error) => {
        this.toastr.error('Failed to reset password. Please try again.');
        console.error(error);
      }
    );
  }
}