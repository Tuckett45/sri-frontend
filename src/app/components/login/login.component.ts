import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SecureAuthService } from '../../services/secure-auth.service';
import { RegisterModalComponent } from '../modals/register-modal/register-modal.component';
import { MatDialog } from '@angular/material/dialog';
import { ForgotPasswordModalComponent } from '../modals/forgot-password-modal/forgot-password-modal.component';
import { ToastrService } from 'ngx-toastr';
import { User } from 'src/app/models/user.model';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: false
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  userData!: User;
  private readonly secureAuthService = inject(SecureAuthService);

  constructor(private fb: FormBuilder, 
              private router: Router, 
              private authService: AuthService, 
              private dialog: MatDialog,
              private toastr: ToastrService) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  async ngOnInit(): Promise<void> {
    // Ensure both auth services are logged out
    await this.secureAuthService.logout();
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.authService.login(this.loginForm.value).subscribe({
        next: async (response) => {
          this.loadUserProfile();
          localStorage.setItem('loggedIn', 'true');
          
          // Force re-initialize SecureAuthService to pick up the new auth state
          console.log('🔐 Re-initializing SecureAuthService after login...');
          await this.secureAuthService.initialize(true);
          
          this.toastr.success('Login successful!', 'Success');
          if(this.userData.role == 'Temp'){
            this.router.navigate(['/street-sheet']);
          }
          else if(this.userData.role == 'OSP Coordinator'){
            this.router.navigate(['/osp-coordinator-tracker']);
          }
          else if(this.userData.role == 'Controller'){
            this.router.navigate(['/market-controller-tracker']);
          }else if(this.userData.role == 'HR'){
            this.router.navigate(['/expenses']);
          }
          else {
            this.router.navigate(['/preliminary-punch-list']);
          }
        },
        error: (error) => {
          this.toastr.error(error.error, 'error');
        }
      });
    }
  }

  loadUserProfile(): void {
    const userString = localStorage.getItem('user');
    if (userString) {
      const userObj = JSON.parse(userString);

      this.userData = new User(
          userObj.id,
          userObj.name,
          userObj.email,
          userObj.password,
          userObj.role,
          userObj.market,
          userObj.company,
          new Date(userObj.createdDate),
          userObj.isApproved,
          userObj.approvalToken
      );
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