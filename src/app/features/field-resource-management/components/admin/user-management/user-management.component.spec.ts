import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { UserManagementComponent } from './user-management.component';
import { UserManagementService } from '../../../../../services/user-management.service';
import { AuthService } from '../../../../../services/auth.service';
import { User } from '../../../../../models/user.model';
import { UserRole } from '../../../../../models/role.enum';

describe('UserManagementComponent', () => {
  let component: UserManagementComponent;
  let fixture: ComponentFixture<UserManagementComponent>;
  let userManagementService: jasmine.SpyObj<UserManagementService>;
  let authService: jasmine.SpyObj<AuthService>;

  const mockUsers: User[] = [
    new User(
      '1',
      'John Doe',
      'john@example.com',
      'password',
      UserRole.CM,
      'Atlanta',
      'Company A',
      new Date(),
      true
    ),
    new User(
      '2',
      'Jane Smith',
      'jane@example.com',
      'password',
      UserRole.Admin,
      'Boston',
      'Company B',
      new Date(),
      false
    )
  ];

  beforeEach(async () => {
    const userManagementServiceSpy = jasmine.createSpyObj('UserManagementService', [
      'getUsers',
      'createUser',
      'updateUser',
      'deactivateUser',
      'resetUserPassword'
    ]);
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['isAdmin']);

    await TestBed.configureTestingModule({
      imports: [UserManagementComponent, HttpClientTestingModule, FormsModule],
      providers: [
        { provide: UserManagementService, useValue: userManagementServiceSpy },
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    userManagementService = TestBed.inject(UserManagementService) as jasmine.SpyObj<UserManagementService>;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;

    authService.isAdmin.and.returnValue(true);
    userManagementService.getUsers.and.returnValue(of(mockUsers));

    fixture = TestBed.createComponent(UserManagementComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load users on init', () => {
    fixture.detectChanges();

    expect(userManagementService.getUsers).toHaveBeenCalled();
    expect(component.users.length).toBe(2);
    expect(component.filteredUsers.length).toBe(2);
  });

  it('should extract pending approvals', () => {
    fixture.detectChanges();

    expect(component.pendingApprovals.length).toBe(1);
    expect(component.pendingApprovals[0].email).toBe('jane@example.com');
  });

  it('should filter users by role', () => {
    fixture.detectChanges();

    component.selectedRole = UserRole.CM;
    component.applyFilters();

    expect(component.filteredUsers.length).toBe(1);
    expect(component.filteredUsers[0].role).toBe(UserRole.CM);
  });

  it('should filter users by search term', () => {
    fixture.detectChanges();

    component.searchTerm = 'john';
    component.applyFilters();

    expect(component.filteredUsers.length).toBe(1);
    expect(component.filteredUsers[0].name).toBe('John Doe');
  });

  it('should open create user modal', () => {
    component.openCreateUserModal();

    expect(component.showUserModal).toBe(true);
    expect(component.modalMode).toBe('create');
    expect(component.selectedUser).toBeNull();
  });

  it('should open edit user modal', () => {
    const user = mockUsers[0];
    component.openEditUserModal(user);

    expect(component.showUserModal).toBe(true);
    expect(component.modalMode).toBe('edit');
    expect(component.selectedUser).toBe(user);
  });

  it('should deactivate user with reason', () => {
    userManagementService.deactivateUser.and.returnValue(of(void 0));
    fixture.detectChanges();

    component.userToDeactivate = mockUsers[0];
    component.deactivateReason = 'Test reason';
    component.deactivateUser();

    expect(userManagementService.deactivateUser).toHaveBeenCalledWith('1', 'Test reason');
  });

  it('should not deactivate user without reason', () => {
    spyOn(window, 'alert');
    component.userToDeactivate = mockUsers[0];
    component.deactivateReason = '';
    component.deactivateUser();

    expect(userManagementService.deactivateUser).not.toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith('Deactivation reason is required');
  });

  it('should reset user password', () => {
    const mockResponse = { temporaryPassword: 'temp123', expiresAt: new Date() };
    userManagementService.resetUserPassword.and.returnValue(of(mockResponse));

    component.userForPasswordReset = mockUsers[0];
    component.resetPassword();

    expect(userManagementService.resetUserPassword).toHaveBeenCalledWith('1');
    expect(component.temporaryPassword).toBe('temp123');
  });

  it('should handle error when loading users', () => {
    userManagementService.getUsers.and.returnValue(
      throwError(() => new Error('Failed to load'))
    );

    fixture.detectChanges();

    expect(component.error).toBe('Failed to load users. Please try again.');
  });

  it('should show error if not admin', () => {
    authService.isAdmin.and.returnValue(false);
    
    // Recreate component with new mock value
    fixture = TestBed.createComponent(UserManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.error).toBe('Unauthorized: Admin access required');
  });
});
