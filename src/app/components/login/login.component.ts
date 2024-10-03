import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RegisterModalComponent } from '../register-modal/register-modal.component';
import { MatDialog } from '@angular/material/dialog';
import { ForgotPasswordModalComponent } from '../forgot-password-modal/forgot-password-modal.component';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;

  constructor(private fb: FormBuilder, 
              private router: Router, 
              private authService: AuthService, 
              private dialog: MatDialog) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    // Ensure user is logged out when accessing /login
    this.authService.logout();
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      const email = this.loginForm.get('email')?.value;
      const password = this.loginForm.get('password')?.value;

      if (email === 'admin@example.com' && password === 'password123') {
        this.authService.login();
        this.router.navigate(['/overview']);
      } else {
        alert('Invalid credentials');
      }
    }
  }

  openForgotPasswordModal(): void {
    this.dialog.open(ForgotPasswordModalComponent, {
      width: '500px',
    });
  }

  openRegisterModal(): void {
    this.dialog.open(RegisterModalComponent, {
      width: '500px'
    });
  }
}