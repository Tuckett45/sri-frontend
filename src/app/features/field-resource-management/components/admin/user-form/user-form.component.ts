import { Component, OnInit, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserManagementService } from '../../../../../services/user-management.service';
import { User } from '../../../../../models/user.model';
import { UserRole } from '../../../../../models/role.enum';

/**
 * Component for creating and editing users (Admin only).
 * 
 * Features:
 * - User creation form with validation
 * - User editing form
 * - Required role selection dropdown
 * - Required market selection dropdown
 * - Form validation
 * - Permission configuration
 * - Notification preferences configuration
 */
@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.scss']
})
export class UserFormComponent implements OnInit, OnDestroy {
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() user: User | null = null;
  @Output() formSubmit = new EventEmitter<Partial<User>>();
  @Output() formCancel = new EventEmitter<void>();

  // Form fields
  formData: Partial<User> = {
    name: '',
    email: '',
    role: UserRole.User,
    market: '',
    company: '',
    isApproved: true
  };

  // Role options
  roleOptions: { value: UserRole; label: string }[] = [
    { value: UserRole.Admin, label: 'Admin' },
    { value: UserRole.CM, label: 'Construction Manager' },
    { value: UserRole.PM, label: 'Project Manager' },
    { value: UserRole.Technician, label: 'Technician' },
    { value: UserRole.DeploymentEngineer, label: 'Deployment Engineer' },
    { value: UserRole.DCOps, label: 'DC Operations' },
    { value: UserRole.OSPCoordinator, label: 'OSP Coordinator' },
    { value: UserRole.Controller, label: 'Controller' },
    { value: UserRole.VendorRep, label: 'Vendor Representative' },
    { value: UserRole.SRITech, label: 'SRI Tech' },
    { value: UserRole.HR, label: 'HR' },
    { value: UserRole.Client, label: 'Client' },
    { value: UserRole.User, label: 'User' },
    { value: UserRole.Temp, label: 'Temp' }
  ];

  // Market options (hardcoded for now, could be fetched from API)
  marketOptions: string[] = [
    'Atlanta',
    'Boston',
    'Chicago',
    'Dallas',
    'Denver',
    'Houston',
    'Los Angeles',
    'Miami',
    'New York',
    'Phoenix',
    'San Francisco',
    'Seattle',
    'RG'
  ];

  // Company options
  companyOptions: string[] = [
    'Company A',
    'Company B',
    'Company C',
    'Vendor 1',
    'Vendor 2'
  ];

  // Permission configuration
  permissions = {
    canCreateProjects: false,
    canEditProjects: false,
    canDeleteProjects: false,
    canManageUsers: false,
    canViewReports: false,
    canExportData: false,
    canApproveWorkflows: false,
    canManageResources: false
  };

  // Notification preferences
  notificationPreferences = {
    email: true,
    inApp: true,
    sms: false,
    approvalReminders: true,
    escalationAlerts: true,
    dailyDigest: false
  };

  // Form state
  submitting = false;
  error: string | null = null;
  validationErrors: Record<string, string> = {};

  private destroy$ = new Subject<void>();

  constructor(private userManagementService: UserManagementService) {}

  ngOnInit(): void {
    if (this.mode === 'edit' && this.user) {
      this.loadUserData();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load user data for editing
   */
  private loadUserData(): void {
    if (!this.user) return;

    this.formData = {
      name: this.user.name,
      email: this.user.email,
      role: this.user.role as UserRole,
      market: this.user.market,
      company: this.user.company,
      isApproved: this.user.isApproved
    };

    // Load permissions and notification preferences if available
    // These would typically come from the user object
    // For now, using defaults
  }

  /**
   * Validate form
   */
  private validateForm(): boolean {
    this.validationErrors = {};

    if (!this.formData.name || this.formData.name.trim().length === 0) {
      this.validationErrors['name'] = 'Name is required';
    }

    if (!this.formData.email || this.formData.email.trim().length === 0) {
      this.validationErrors['email'] = 'Email is required';
    } else if (!this.isValidEmail(this.formData.email)) {
      this.validationErrors['email'] = 'Invalid email format';
    }

    if (!this.formData.role) {
      this.validationErrors['role'] = 'Role is required';
    }

    if (!this.formData.market || this.formData.market.trim().length === 0) {
      this.validationErrors['market'] = 'Market is required';
    }

    if (!this.formData.company || this.formData.company.trim().length === 0) {
      this.validationErrors['company'] = 'Company is required';
    }

    return Object.keys(this.validationErrors).length === 0;
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Handle form submission
   */
  onSubmit(): void {
    if (!this.validateForm()) {
      return;
    }

    this.submitting = true;
    this.error = null;

    // Prepare user data with permissions and notification preferences
    const userData: Partial<User> = {
      ...this.formData,
      // Add permissions and notification preferences here
      // These would be added to the User model
    };

    if (this.mode === 'create') {
      this.createUser(userData);
    } else {
      this.updateUser(userData);
    }
  }

  /**
   * Create new user
   */
  private createUser(userData: Partial<User>): void {
    this.userManagementService.createUser(userData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          this.submitting = false;
          this.formSubmit.emit(user);
        },
        error: (err) => {
          this.submitting = false;
          this.error = err.message || 'Failed to create user. Please try again.';
          console.error('Error creating user:', err);
        }
      });
  }

  /**
   * Update existing user
   */
  private updateUser(userData: Partial<User>): void {
    if (!this.user) return;

    this.userManagementService.updateUser({
      userId: this.user.id,
      updates: userData,
      reason: 'User information updated by admin'
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          this.submitting = false;
          this.formSubmit.emit(user);
        },
        error: (err) => {
          this.submitting = false;
          this.error = err.message || 'Failed to update user. Please try again.';
          console.error('Error updating user:', err);
        }
      });
  }

  /**
   * Handle form cancellation
   */
  onCancel(): void {
    this.formCancel.emit();
  }

  /**
   * Get validation error for a field
   */
  getFieldError(field: string): string | null {
    return this.validationErrors[field] || null;
  }

  /**
   * Check if field has error
   */
  hasFieldError(field: string): boolean {
    return !!this.validationErrors[field];
  }

  /**
   * Update permissions based on role
   */
  onRoleChange(): void {
    // Auto-configure permissions based on role
    switch (this.formData.role) {
      case UserRole.Admin:
        this.permissions = {
          canCreateProjects: true,
          canEditProjects: true,
          canDeleteProjects: true,
          canManageUsers: true,
          canViewReports: true,
          canExportData: true,
          canApproveWorkflows: true,
          canManageResources: true
        };
        break;
      case UserRole.CM:
        this.permissions = {
          canCreateProjects: true,
          canEditProjects: true,
          canDeleteProjects: false,
          canManageUsers: false,
          canViewReports: true,
          canExportData: true,
          canApproveWorkflows: true,
          canManageResources: true
        };
        break;
      case UserRole.PM:
        this.permissions = {
          canCreateProjects: true,
          canEditProjects: true,
          canDeleteProjects: false,
          canManageUsers: false,
          canViewReports: true,
          canExportData: true,
          canApproveWorkflows: false,
          canManageResources: false
        };
        break;
      case UserRole.Technician:
        this.permissions = {
          canCreateProjects: false,
          canEditProjects: false,
          canDeleteProjects: false,
          canManageUsers: false,
          canViewReports: false,
          canExportData: false,
          canApproveWorkflows: false,
          canManageResources: false
        };
        break;
      default:
        this.permissions = {
          canCreateProjects: false,
          canEditProjects: false,
          canDeleteProjects: false,
          canManageUsers: false,
          canViewReports: false,
          canExportData: false,
          canApproveWorkflows: false,
          canManageResources: false
        };
    }
  }
}
