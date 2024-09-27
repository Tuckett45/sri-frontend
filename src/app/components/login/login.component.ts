import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginForm: FormGroup;

  constructor(private fb: FormBuilder, private router: Router) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      // In real applications, authentication logic (e.g., API call) would go here.
      const email = this.loginForm.get('email')?.value;
      const password = this.loginForm.get('password')?.value;
      
      // Simple example: authenticate and navigate
      if (email === 'admin@example.com' && password === 'password123') {
        localStorage.setItem('loggedIn', 'true');
        this.router.navigate(['/overview']); // Navigate to dashboard
      } else {
        alert('Invalid credentials');
      }
    }
  }
}