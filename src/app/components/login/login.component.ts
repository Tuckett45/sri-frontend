import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SecureAuthService } from '../../services/secure-auth.service';
import { RegisterModalComponent } from '../modals/register-modal/register-modal.component';
import { MatDialog } from '@angular/material/dialog';
import { ForgotPasswordModalComponent } from '../modals/forgot-password-modal/forgot-password-modal.component';
import { ToastrService } from 'ngx-toastr';
import { User } from 'src/app/models/user.model';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: false
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  userData!: User;
  isSubmitting = false;
  private readonly secureAuthService = inject(SecureAuthService);

  constructor(private fb: FormBuilder, 
              private router: Router, 
              private dialog: MatDialog,
              private toastr: ToastrService) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    // Just initialize the form - don't clear auth state
    // Auth state should only be cleared by explicit logout actions
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;

    this.secureAuthService.login(this.loginForm.value)
      .pipe(finalize(() => this.isSubmitting = false))
      .subscribe({
        next: async (response) => {
          const user = (response as any)?.user ?? response;
          if (user) {
            // Persist normalized user with resolved role so downstream reads are consistent
            const normalized = this.hydrateUser(user);
            localStorage.setItem('user', JSON.stringify(normalized));
            this.userData = normalized;
          } else {
            // Ensure userData is at least an empty shell to avoid template null refs
            this.userData = this.hydrateUser({});
          }
          
          // Ensure localStorage is set before proceeding
          localStorage.setItem('loggedIn', 'true');
          
          // Ensure secure auth state is fully synchronized
          console.log('🔐 Synchronizing SecureAuthService after login...');
          await this.secureAuthService.initialize(true);
          await new Promise(resolve => setTimeout(resolve, 50));
          
          this.toastr.success('Login successful!', 'Success');
          
          // Navigate based on role
          await this.navigateByRole(this.userData?.role);
        },
        error: (error) => {
          localStorage.removeItem('loggedIn');
          sessionStorage.removeItem('authToken');
          this.toastr.error(error?.error || 'Login failed', 'Error');
        }
      });
  }

  loadUserProfile(): void {
    const userString = localStorage.getItem('user');
    if (userString) {
      const userObj = JSON.parse(userString);

      this.userData = this.hydrateUser(userObj);
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

  private async navigateByRole(role: string | undefined): Promise<void> {
    if (!role) {
      await this.router.navigate(['/preliminary-punch-list'], { replaceUrl: true });
      return;
    }
    switch (role) {
      case 'Temp':
        await this.router.navigate(['/street-sheet'], { replaceUrl: true });
        return;
      case 'OSP Coordinator':
        await this.router.navigate(['/osp-coordinator-tracker'], { replaceUrl: true });
        return;
      case 'Controller':
        await this.router.navigate(['/market-controller-tracker'], { replaceUrl: true });
        return;
      case 'HR':
      case 'Payroll':
        await this.router.navigate(['/field-resource-management/dashboard'], { replaceUrl: true });
        return;
      default:
        await this.router.navigate(['/preliminary-punch-list'], { replaceUrl: true });
        return;
    }
  }

  private hydrateUser(userObj: any): User {
    const resolvedRole = this.resolveRole(userObj);
    return new User(
      userObj?.id ?? '',
      userObj?.name ?? '',
      userObj?.email ?? '',
      userObj?.password ?? '',
      resolvedRole,
      userObj?.market ?? '',
      userObj?.company ?? '',
      userObj?.createdDate ? new Date(userObj.createdDate) : new Date(),
      userObj?.isApproved ?? false,
      userObj?.approvalToken ?? ''
    );
  }

  private resolveRole(payload: any): string {
    if (!payload) return '';
    const candidates = [
      payload.role,
      payload.Role,
      payload.userRole,
      payload.roleName,
      payload.role_type,
      payload.roleType
    ];
    for (const val of candidates) {
      if (typeof val === 'string' && val.trim().length) {
        return val;
      }
    }
    const rolesArray = payload.roles || payload.Roles || payload.userRoles;
    if (Array.isArray(rolesArray) && rolesArray.length && typeof rolesArray[0] === 'string') {
      return rolesArray[0];
    }
    return '';
  }
}
