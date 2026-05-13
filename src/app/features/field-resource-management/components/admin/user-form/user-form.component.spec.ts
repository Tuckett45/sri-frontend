import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { UserFormComponent } from './user-form.component';
import { UserManagementService } from '../../../../../services/user-management.service';
import { User } from '../../../../../models/user.model';
import { UserRole } from '../../../../../models/role.enum';

describe('UserFormComponent', () => {
  let component: UserFormComponent;
  let fixture: ComponentFixture<UserFormComponent>;
  let userManagementService: jasmine.SpyObj<UserManagementService>;

  const mockUser: User = new User(
    '1',
    'John Doe',
    'john@example.com',
    'password',
    UserRole.CM,
    'Atlanta',
    'Company A',
    new Date(),
    true
  );

  beforeEach(async () => {
    const userManagementServiceSpy = jasmine.createSpyObj('UserManagementService', [
      'createUser',
      'updateUser'
    ]);

    await TestBed.configureTestingModule({
      imports: [UserFormComponent, HttpClientTestingModule, FormsModule],
      providers: [
        { provide: UserManagementService, useValue: userManagementServiceSpy }
      ]
    }).compileComponents();

    userManagementService = TestBed.inject(UserManagementService) as jasmine.SpyObj<UserManagementService>;

    fixture = TestBed.createComponent(UserFormComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default form data in create mode', () => {
    component.mode = 'create';
    fixture.detectChanges();

    expect(component.formData.name).toBe('');
    expect(component.formData.email).toBe('');
    expect(component.formData.role).toBe(UserRole.User);
    expect(component.formData.isApproved).toBe(true);
  });

  it('should load user data in edit mode', () => {
    component.mode = 'edit';
    component.user = mockUser;
    fixture.detectChanges();

    expect(component.formData.name).toBe('John Doe');
    expect(component.formData.email).toBe('john@example.com');
    expect(component.formData.role).toBe(UserRole.CM);
    expect(component.formData.market).toBe('Atlanta');
  });

  it('should validate required fields', () => {
    component.formData = {
      name: '',
      email: '',
      role: undefined,
      market: '',
      company: ''
    };

    component.onSubmit();

    expect(component.validationErrors['name']).toBe('Name is required');
    expect(component.validationErrors['email']).toBe('Email is required');
    expect(component.validationErrors['role']).toBe('Role is required');
    expect(component.validationErrors['market']).toBe('Market is required');
    expect(component.validationErrors['company']).toBe('Company is required');
  });

  it('should validate email format', () => {
    component.formData = {
      name: 'Test User',
      email: 'invalid-email',
      role: UserRole.User,
      market: 'Atlanta',
      company: 'Company A'
    };

    component.onSubmit();

    expect(component.validationErrors['email']).toBe('Invalid email format');
  });

  it('should create user when form is valid', () => {
    userManagementService.createUser.and.returnValue(of(mockUser));

    component.mode = 'create';
    component.formData = {
      name: 'John Doe',
      email: 'john@example.com',
      role: UserRole.CM,
      market: 'Atlanta',
      company: 'Company A',
      isApproved: true
    };

    spyOn(component.formSubmit, 'emit');
    component.onSubmit();

    expect(userManagementService.createUser).toHaveBeenCalled();
    expect(component.formSubmit.emit).toHaveBeenCalledWith(mockUser);
  });

  it('should update user when form is valid in edit mode', () => {
    userManagementService.updateUser.and.returnValue(of(mockUser));

    component.mode = 'edit';
    component.user = mockUser;
    component.formData = {
      name: 'John Doe Updated',
      email: 'john@example.com',
      role: UserRole.CM,
      market: 'Atlanta',
      company: 'Company A',
      isApproved: true
    };

    spyOn(component.formSubmit, 'emit');
    component.onSubmit();

    expect(userManagementService.updateUser).toHaveBeenCalled();
    expect(component.formSubmit.emit).toHaveBeenCalledWith(mockUser);
  });

  it('should emit cancel event', () => {
    spyOn(component.formCancel, 'emit');
    component.onCancel();

    expect(component.formCancel.emit).toHaveBeenCalled();
  });

  it('should update permissions when role changes', () => {
    component.formData.role = UserRole.Admin;
    component.onRoleChange();

    expect(component.permissions.canManageUsers).toBe(true);
    expect(component.permissions.canDeleteProjects).toBe(true);
  });

  it('should set CM permissions correctly', () => {
    component.formData.role = UserRole.CM;
    component.onRoleChange();

    expect(component.permissions.canCreateProjects).toBe(true);
    expect(component.permissions.canApproveWorkflows).toBe(true);
    expect(component.permissions.canManageUsers).toBe(false);
    expect(component.permissions.canDeleteProjects).toBe(false);
  });

  it('should set Technician permissions correctly', () => {
    component.formData.role = UserRole.Technician;
    component.onRoleChange();

    expect(component.permissions.canCreateProjects).toBe(false);
    expect(component.permissions.canEditProjects).toBe(false);
    expect(component.permissions.canManageUsers).toBe(false);
  });

  it('should handle create user error', () => {
    userManagementService.createUser.and.returnValue(
      throwError(() => new Error('Failed to create user'))
    );

    component.mode = 'create';
    component.formData = {
      name: 'John Doe',
      email: 'john@example.com',
      role: UserRole.CM,
      market: 'Atlanta',
      company: 'Company A'
    };

    component.onSubmit();

    expect(component.error).toBe('Failed to create user');
  });
});
