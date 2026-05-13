import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserManagementService } from '../../../../../services/user-management.service';
import { AuthService } from '../../../../../services/auth.service';
import { User } from '../../../../../models/user.model';
import { UserRole } from '../../../../../models/role.enum';
import { UserManagementFilters } from '../../../../../models/user-management.model';
import { UserFormComponent } from '../user-form/user-form.component';

/**
 * Component for managing users (Admin only).
 * 
 * Features:
 * - Display user list with filtering
 * - Search by name, email, role
 * - Filter by role, market, approval status
 * - Create user button and modal
 * - Edit user functionality
 * - Deactivate user functionality with reason input
 * - Password reset functionality
 * - Pending user approvals section
 */
@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, UserFormComponent],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss']
})
export class UserManagementComponent implements OnInit, OnDestroy {
  users: User[] = [];
  filteredUsers: User[] = [];
  pendingApprovals: User[] = [];
  loading = false;
  error: string | null = null;

  // Filter options
  searchTerm = '';
  selectedRole: UserRole | 'all' = 'all';
  selectedMarket: string | 'all' = 'all';
  selectedApprovalStatus: 'all' | 'approved' | 'pending' = 'all';

  // Available markets for filtering
  availableMarkets: string[] = [];

  // Role options
  roleOptions: { value: UserRole | 'all'; label: string }[] = [
    { value: 'all', label: 'All Roles' },
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

  // Modal state
  showUserModal = false;
  modalMode: 'create' | 'edit' = 'create';
  selectedUser: User | null = null;

  // Deactivate modal state
  showDeactivateModal = false;
  userToDeactivate: User | null = null;
  deactivateReason = '';
  processingDeactivate = false;

  // Password reset modal state
  showPasswordResetModal = false;
  userForPasswordReset: User | null = null;
  temporaryPassword: string | null = null;
  processingPasswordReset = false;

  private destroy$ = new Subject<void>();

  constructor(
    private userManagementService: UserManagementService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    if (!this.checkAdminAccess()) {
      return; // Don't load users if not admin
    }
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Check if current user has admin access
   * @returns true if user is admin, false otherwise
   */
  private checkAdminAccess(): boolean {
    if (!this.authService.isAdmin()) {
      this.error = 'Unauthorized: Admin access required';
      return false;
    }
    return true;
  }

  /**
   * Load all users
   */
  loadUsers(): void {
    this.loading = true;
    this.error = null;

    this.userManagementService.getUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users) => {
          this.users = users;
          this.extractAvailableMarkets();
          this.extractPendingApprovals();
          this.applyFilters();
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Failed to load users. Please try again.';
          console.error('Error loading users:', err);
          this.loading = false;
        }
      });
  }

  /**
   * Extract unique markets from users for filter dropdown
   */
  private extractAvailableMarkets(): void {
    const markets = new Set(this.users.map(user => user.market).filter(m => m));
    this.availableMarkets = Array.from(markets).sort();
  }

  /**
   * Extract pending user approvals
   */
  private extractPendingApprovals(): void {
    this.pendingApprovals = this.users.filter(user => !user.isApproved);
  }

  /**
   * Apply filters to the user list
   */
  applyFilters(): void {
    const filters: UserManagementFilters = {};

    if (this.selectedRole !== 'all') {
      filters.role = this.selectedRole;
    }

    if (this.selectedMarket !== 'all') {
      filters.market = this.selectedMarket;
    }

    if (this.selectedApprovalStatus !== 'all') {
      filters.isApproved = this.selectedApprovalStatus === 'approved';
    }

    if (this.searchTerm.trim()) {
      filters.searchTerm = this.searchTerm.trim();
    }

    // Apply filters locally for immediate feedback
    let filtered = [...this.users];

    if (filters.role) {
      filtered = filtered.filter(user => user.role === filters.role);
    }

    if (filters.market) {
      filtered = filtered.filter(user => user.market === filters.market);
    }

    if (filters.isApproved !== undefined) {
      filtered = filtered.filter(user => user.isApproved === filters.isApproved);
    }

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term)
      );
    }

    this.filteredUsers = filtered;
  }

  /**
   * Open create user modal
   */
  openCreateUserModal(): void {
    this.modalMode = 'create';
    this.selectedUser = null;
    this.showUserModal = true;
  }

  /**
   * Open edit user modal
   */
  openEditUserModal(user: User): void {
    this.modalMode = 'edit';
    this.selectedUser = user;
    this.showUserModal = true;
  }

  /**
   * Close user modal
   */
  closeUserModal(): void {
    this.showUserModal = false;
    this.selectedUser = null;
  }

  /**
   * Handle user form submission
   */
  onUserFormSubmit(user: Partial<User>): void {
    this.closeUserModal();
    this.loadUsers(); // Reload users after create/update
  }

  /**
   * Open deactivate user modal
   */
  openDeactivateModal(user: User): void {
    this.userToDeactivate = user;
    this.deactivateReason = '';
    this.showDeactivateModal = true;
  }

  /**
   * Close deactivate modal
   */
  closeDeactivateModal(): void {
    this.showDeactivateModal = false;
    this.userToDeactivate = null;
    this.deactivateReason = '';
  }

  /**
   * Deactivate user
   */
  deactivateUser(): void {
    if (!this.userToDeactivate || !this.deactivateReason.trim()) {
      alert('Deactivation reason is required');
      return;
    }

    this.processingDeactivate = true;

    this.userManagementService.deactivateUser(
      this.userToDeactivate.id,
      this.deactivateReason
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.processingDeactivate = false;
          this.closeDeactivateModal();
          this.loadUsers(); // Reload users
        },
        error: (err) => {
          this.processingDeactivate = false;
          alert('Failed to deactivate user. Please try again.');
          console.error('Error deactivating user:', err);
        }
      });
  }

  /**
   * Open password reset modal
   */
  openPasswordResetModal(user: User): void {
    this.userForPasswordReset = user;
    this.temporaryPassword = null;
    this.showPasswordResetModal = true;
  }

  /**
   * Close password reset modal
   */
  closePasswordResetModal(): void {
    this.showPasswordResetModal = false;
    this.userForPasswordReset = null;
    this.temporaryPassword = null;
  }

  /**
   * Reset user password
   */
  resetPassword(): void {
    if (!this.userForPasswordReset) {
      return;
    }

    this.processingPasswordReset = true;

    this.userManagementService.resetUserPassword(this.userForPasswordReset.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.temporaryPassword = response.temporaryPassword;
          this.processingPasswordReset = false;
        },
        error: (err) => {
          this.processingPasswordReset = false;
          alert('Failed to reset password. Please try again.');
          console.error('Error resetting password:', err);
        }
      });
  }

  /**
   * Copy temporary password to clipboard
   */
  copyPasswordToClipboard(): void {
    if (this.temporaryPassword) {
      navigator.clipboard.writeText(this.temporaryPassword).then(() => {
        alert('Password copied to clipboard');
      });
    }
  }

  /**
   * Approve pending user
   */
  approvePendingUser(user: User): void {
    if (confirm(`Approve user ${user.name}?`)) {
      this.userManagementService.updateUser({
        userId: user.id,
        updates: { isApproved: true },
        reason: 'User approved by admin'
      })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadUsers();
          },
          error: (err) => {
            alert('Failed to approve user. Please try again.');
            console.error('Error approving user:', err);
          }
        });
    }
  }

  /**
   * Get display label for role
   */
  getRoleLabel(role: string): string {
    const roleOption = this.roleOptions.find(opt => opt.value === role);
    return roleOption ? roleOption.label : role;
  }

  /**
   * Format date for display
   */
  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(date));
  }
}
