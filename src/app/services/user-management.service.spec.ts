import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UserManagementService } from './user-management.service';
import { AuthService } from './auth.service';
import { User } from '../models/user.model';
import { UserRole } from '../models/role.enum';
import {
  UserManagementFilters,
  UserUpdateRequest,
  BulkUserOperation,
  BulkOperationResult,
  AuditLogEntry,
  PasswordResetResponse
} from '../models/user-management.model';
import { environment } from '../../environments/environments';

describe('UserManagementService', () => {
  let service: UserManagementService;
  let httpMock: HttpTestingController;
  let authService: jasmine.SpyObj<AuthService>;
  const apiUrl = `${environment.apiUrl}/user-management`;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['isAdmin']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        UserManagementService,
        { provide: AuthService, useValue: authServiceSpy }
      ]
    });

    service = TestBed.inject(UserManagementService);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Authorization', () => {
    it('should throw error when non-admin tries to access getUsers', () => {
      authService.isAdmin.and.returnValue(false);

      expect(() => service.getUsers()).toThrowError('Unauthorized: Admin access required');
    });

    it('should throw error when non-admin tries to access createUser', () => {
      authService.isAdmin.and.returnValue(false);
      const user: Partial<User> = {
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.CM,
        market: 'Market1'
      };

      expect(() => service.createUser(user)).toThrowError('Unauthorized: Admin access required');
    });

    it('should throw error when non-admin tries to access updateUser', () => {
      authService.isAdmin.and.returnValue(false);
      const request: UserUpdateRequest = {
        userId: '123',
        updates: { name: 'Updated Name' }
      };

      expect(() => service.updateUser(request)).toThrowError('Unauthorized: Admin access required');
    });

    it('should throw error when non-admin tries to access deactivateUser', () => {
      authService.isAdmin.and.returnValue(false);

      expect(() => service.deactivateUser('123', 'reason')).toThrowError('Unauthorized: Admin access required');
    });

    it('should throw error when non-admin tries to access resetUserPassword', () => {
      authService.isAdmin.and.returnValue(false);

      expect(() => service.resetUserPassword('123')).toThrowError('Unauthorized: Admin access required');
    });

    it('should throw error when non-admin tries to access executeBulkOperation', () => {
      authService.isAdmin.and.returnValue(false);
      const operation: BulkUserOperation = {
        operation: 'deactivate',
        userIds: ['123'],
        reason: 'test'
      };

      expect(() => service.executeBulkOperation(operation)).toThrowError('Unauthorized: Admin access required');
    });

    it('should throw error when non-admin tries to access getUserAuditLog', () => {
      authService.isAdmin.and.returnValue(false);

      expect(() => service.getUserAuditLog('123')).toThrowError('Unauthorized: Admin access required');
    });
  });

  describe('getUsers', () => {
    it('should retrieve all users without filters', (done) => {
      authService.isAdmin.and.returnValue(true);
      const mockUsers: User[] = [
        new User('1', 'User 1', 'user1@test.com', 'pass', UserRole.CM, 'Market1', 'Company1', new Date(), true),
        new User('2', 'User 2', 'user2@test.com', 'pass', UserRole.Admin, 'Market2', 'Company2', new Date(), true)
      ];

      service.getUsers().subscribe(users => {
        expect(users).toEqual(mockUsers);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/users`);
      expect(req.request.method).toBe('GET');
      req.flush(mockUsers);
    });

    it('should retrieve users with role filter', (done) => {
      authService.isAdmin.and.returnValue(true);
      const filters: UserManagementFilters = { role: UserRole.CM };
      const mockUsers: User[] = [
        new User('1', 'CM User', 'cm@test.com', 'pass', UserRole.CM, 'Market1', 'Company1', new Date(), true)
      ];

      service.getUsers(filters).subscribe(users => {
        expect(users).toEqual(mockUsers);
        done();
      });

      const req = httpMock.expectOne(req => req.url === `${apiUrl}/users` && req.params.has('role'));
      expect(req.request.params.get('role')).toBe(UserRole.CM);
      req.flush(mockUsers);
    });

    it('should retrieve users with market filter', (done) => {
      authService.isAdmin.and.returnValue(true);
      const filters: UserManagementFilters = { market: 'Market1' };
      const mockUsers: User[] = [
        new User('1', 'User 1', 'user1@test.com', 'pass', UserRole.CM, 'Market1', 'Company1', new Date(), true)
      ];

      service.getUsers(filters).subscribe(users => {
        expect(users).toEqual(mockUsers);
        done();
      });

      const req = httpMock.expectOne(req => req.url === `${apiUrl}/users` && req.params.has('market'));
      expect(req.request.params.get('market')).toBe('Market1');
      req.flush(mockUsers);
    });

    it('should retrieve users with approval status filter', (done) => {
      authService.isAdmin.and.returnValue(true);
      const filters: UserManagementFilters = { isApproved: false };
      const mockUsers: User[] = [
        new User('1', 'Pending User', 'pending@test.com', 'pass', UserRole.CM, 'Market1', 'Company1', new Date(), false)
      ];

      service.getUsers(filters).subscribe(users => {
        expect(users).toEqual(mockUsers);
        done();
      });

      const req = httpMock.expectOne(req => req.url === `${apiUrl}/users` && req.params.has('isApproved'));
      expect(req.request.params.get('isApproved')).toBe('false');
      req.flush(mockUsers);
    });

    it('should retrieve users with search term filter', (done) => {
      authService.isAdmin.and.returnValue(true);
      const filters: UserManagementFilters = { searchTerm: 'john' };
      const mockUsers: User[] = [
        new User('1', 'John Doe', 'john@test.com', 'pass', UserRole.CM, 'Market1', 'Company1', new Date(), true)
      ];

      service.getUsers(filters).subscribe(users => {
        expect(users).toEqual(mockUsers);
        done();
      });

      const req = httpMock.expectOne(req => req.url === `${apiUrl}/users` && req.params.has('search'));
      expect(req.request.params.get('search')).toBe('john');
      req.flush(mockUsers);
    });

    it('should retrieve users with multiple filters', (done) => {
      authService.isAdmin.and.returnValue(true);
      const filters: UserManagementFilters = {
        role: UserRole.CM,
        market: 'Market1',
        isApproved: true,
        searchTerm: 'john'
      };
      const mockUsers: User[] = [
        new User('1', 'John Doe', 'john@test.com', 'pass', UserRole.CM, 'Market1', 'Company1', new Date(), true)
      ];

      service.getUsers(filters).subscribe(users => {
        expect(users).toEqual(mockUsers);
        done();
      });

      const req = httpMock.expectOne(req => 
        req.url === `${apiUrl}/users` && 
        req.params.has('role') && 
        req.params.has('market') &&
        req.params.has('isApproved') &&
        req.params.has('search')
      );
      req.flush(mockUsers);
    });
  });

  describe('createUser', () => {
    it('should create a new user with required fields', (done) => {
      authService.isAdmin.and.returnValue(true);
      const newUser: Partial<User> = {
        email: 'newuser@test.com',
        name: 'New User',
        role: UserRole.CM,
        market: 'Market1',
        company: 'Company1'
      };
      const createdUser = new User(
        '123',
        'New User',
        'newuser@test.com',
        'temppass',
        UserRole.CM,
        'Market1',
        'Company1',
        new Date(),
        false
      );

      service.createUser(newUser).subscribe(user => {
        expect(user).toEqual(createdUser);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/users`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newUser);
      req.flush(createdUser);
    });

    it('should return error when email is missing', (done) => {
      authService.isAdmin.and.returnValue(true);
      const invalidUser: Partial<User> = {
        name: 'New User',
        role: UserRole.CM,
        market: 'Market1'
      };

      service.createUser(invalidUser).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toContain('Missing required fields');
          done();
        }
      });
    });

    it('should return error when name is missing', (done) => {
      authService.isAdmin.and.returnValue(true);
      const invalidUser: Partial<User> = {
        email: 'test@test.com',
        role: UserRole.CM,
        market: 'Market1'
      };

      service.createUser(invalidUser).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toContain('Missing required fields');
          done();
        }
      });
    });

    it('should return error when role is missing', (done) => {
      authService.isAdmin.and.returnValue(true);
      const invalidUser: Partial<User> = {
        email: 'test@test.com',
        name: 'Test User',
        market: 'Market1'
      };

      service.createUser(invalidUser).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toContain('Missing required fields');
          done();
        }
      });
    });

    it('should return error when market is missing', (done) => {
      authService.isAdmin.and.returnValue(true);
      const invalidUser: Partial<User> = {
        email: 'test@test.com',
        name: 'Test User',
        role: UserRole.CM
      };

      service.createUser(invalidUser).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toContain('Missing required fields');
          done();
        }
      });
    });
  });

  describe('updateUser', () => {
    it('should update user with valid request', (done) => {
      authService.isAdmin.and.returnValue(true);
      const request: UserUpdateRequest = {
        userId: '123',
        updates: { name: 'Updated Name', market: 'Market2' },
        reason: 'Market reassignment'
      };
      const updatedUser = new User(
        '123',
        'Updated Name',
        'user@test.com',
        'pass',
        UserRole.CM,
        'Market2',
        'Company1',
        new Date(),
        true
      );

      service.updateUser(request).subscribe(user => {
        expect(user).toEqual(updatedUser);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/users/123`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({
        updates: request.updates,
        reason: request.reason
      });
      req.flush(updatedUser);
    });

    it('should update user without reason', (done) => {
      authService.isAdmin.and.returnValue(true);
      const request: UserUpdateRequest = {
        userId: '123',
        updates: { name: 'Updated Name' }
      };
      const updatedUser = new User(
        '123',
        'Updated Name',
        'user@test.com',
        'pass',
        UserRole.CM,
        'Market1',
        'Company1',
        new Date(),
        true
      );

      service.updateUser(request).subscribe(user => {
        expect(user).toEqual(updatedUser);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/users/123`);
      expect(req.request.method).toBe('PUT');
      req.flush(updatedUser);
    });

    it('should return error when userId is missing', (done) => {
      authService.isAdmin.and.returnValue(true);
      const request: UserUpdateRequest = {
        userId: '',
        updates: { name: 'Updated Name' }
      };

      service.updateUser(request).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toContain('User ID is required');
          done();
        }
      });
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate user with valid userId and reason', (done) => {
      authService.isAdmin.and.returnValue(true);

      service.deactivateUser('123', 'User left company').subscribe(() => {
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/users/123/deactivate`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ reason: 'User left company' });
      req.flush(null);
    });

    it('should return error when userId is missing', (done) => {
      authService.isAdmin.and.returnValue(true);

      service.deactivateUser('', 'reason').subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toContain('User ID is required');
          done();
        }
      });
    });

    it('should return error when reason is missing', (done) => {
      authService.isAdmin.and.returnValue(true);

      service.deactivateUser('123', '').subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toContain('Reason for deactivation is required');
          done();
        }
      });
    });

    it('should return error when reason is only whitespace', (done) => {
      authService.isAdmin.and.returnValue(true);

      service.deactivateUser('123', '   ').subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toContain('Reason for deactivation is required');
          done();
        }
      });
    });
  });

  describe('resetUserPassword', () => {
    it('should reset user password and return temporary password', (done) => {
      authService.isAdmin.and.returnValue(true);
      const mockResponse: PasswordResetResponse = {
        temporaryPassword: 'TempPass123!',
        expiresAt: new Date('2024-12-31')
      };

      service.resetUserPassword('123').subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/users/123/reset-password`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(mockResponse);
    });

    it('should return error when userId is missing', (done) => {
      authService.isAdmin.and.returnValue(true);

      service.resetUserPassword('').subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toContain('User ID is required');
          done();
        }
      });
    });
  });

  describe('executeBulkOperation', () => {
    it('should execute bulk deactivate operation', (done) => {
      authService.isAdmin.and.returnValue(true);
      const operation: BulkUserOperation = {
        operation: 'deactivate',
        userIds: ['123', '456', '789'],
        reason: 'Department restructuring'
      };
      const mockResult: BulkOperationResult = {
        successCount: 3,
        failureCount: 0,
        errors: []
      };

      service.executeBulkOperation(operation).subscribe(result => {
        expect(result).toEqual(mockResult);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/users/bulk`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(operation);
      req.flush(mockResult);
    });

    it('should execute bulk activate operation', (done) => {
      authService.isAdmin.and.returnValue(true);
      const operation: BulkUserOperation = {
        operation: 'activate',
        userIds: ['123', '456'],
        reason: 'Reactivating users'
      };
      const mockResult: BulkOperationResult = {
        successCount: 2,
        failureCount: 0,
        errors: []
      };

      service.executeBulkOperation(operation).subscribe(result => {
        expect(result).toEqual(mockResult);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/users/bulk`);
      req.flush(mockResult);
    });

    it('should execute bulk change_role operation', (done) => {
      authService.isAdmin.and.returnValue(true);
      const operation: BulkUserOperation = {
        operation: 'change_role',
        userIds: ['123', '456'],
        newValue: UserRole.PM,
        reason: 'Promotion to PM'
      };
      const mockResult: BulkOperationResult = {
        successCount: 2,
        failureCount: 0,
        errors: []
      };

      service.executeBulkOperation(operation).subscribe(result => {
        expect(result).toEqual(mockResult);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/users/bulk`);
      req.flush(mockResult);
    });

    it('should execute bulk change_market operation', (done) => {
      authService.isAdmin.and.returnValue(true);
      const operation: BulkUserOperation = {
        operation: 'change_market',
        userIds: ['123', '456'],
        newValue: 'Market2',
        reason: 'Market reassignment'
      };
      const mockResult: BulkOperationResult = {
        successCount: 2,
        failureCount: 0,
        errors: []
      };

      service.executeBulkOperation(operation).subscribe(result => {
        expect(result).toEqual(mockResult);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/users/bulk`);
      req.flush(mockResult);
    });

    it('should handle partial failures in bulk operation', (done) => {
      authService.isAdmin.and.returnValue(true);
      const operation: BulkUserOperation = {
        operation: 'deactivate',
        userIds: ['123', '456', '789'],
        reason: 'Test'
      };
      const mockResult: BulkOperationResult = {
        successCount: 2,
        failureCount: 1,
        errors: [{ userId: '789', error: 'User not found' }]
      };

      service.executeBulkOperation(operation).subscribe(result => {
        expect(result.successCount).toBe(2);
        expect(result.failureCount).toBe(1);
        expect(result.errors.length).toBe(1);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/users/bulk`);
      req.flush(mockResult);
    });

    it('should return error when userIds array is empty', (done) => {
      authService.isAdmin.and.returnValue(true);
      const operation: BulkUserOperation = {
        operation: 'deactivate',
        userIds: [],
        reason: 'Test'
      };

      service.executeBulkOperation(operation).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toContain('At least one user ID is required');
          done();
        }
      });
    });

    it('should return error when reason is missing', (done) => {
      authService.isAdmin.and.returnValue(true);
      const operation: BulkUserOperation = {
        operation: 'deactivate',
        userIds: ['123'],
        reason: ''
      };

      service.executeBulkOperation(operation).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toContain('Reason for bulk operation is required');
          done();
        }
      });
    });

    it('should return error for invalid operation type', (done) => {
      authService.isAdmin.and.returnValue(true);
      const operation: any = {
        operation: 'invalid_operation',
        userIds: ['123'],
        reason: 'Test'
      };

      service.executeBulkOperation(operation).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toContain('Invalid operation');
          done();
        }
      });
    });

    it('should return error when newValue is missing for change_role', (done) => {
      authService.isAdmin.and.returnValue(true);
      const operation: BulkUserOperation = {
        operation: 'change_role',
        userIds: ['123'],
        reason: 'Test'
      };

      service.executeBulkOperation(operation).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toContain('New value is required for change_role operation');
          done();
        }
      });
    });

    it('should return error when newValue is missing for change_market', (done) => {
      authService.isAdmin.and.returnValue(true);
      const operation: BulkUserOperation = {
        operation: 'change_market',
        userIds: ['123'],
        reason: 'Test'
      };

      service.executeBulkOperation(operation).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toContain('New value is required for change_market operation');
          done();
        }
      });
    });
  });

  describe('getUserAuditLog', () => {
    it('should retrieve audit log for user', (done) => {
      authService.isAdmin.and.returnValue(true);
      const mockAuditLog: AuditLogEntry[] = [
        {
          id: '1',
          userId: '123',
          action: 'user_created',
          performedBy: 'admin1',
          timestamp: new Date('2024-01-01'),
          details: { role: UserRole.CM, market: 'Market1' }
        },
        {
          id: '2',
          userId: '123',
          action: 'role_changed',
          performedBy: 'admin2',
          timestamp: new Date('2024-02-01'),
          details: { oldRole: UserRole.CM, newRole: UserRole.PM },
          reason: 'Promotion'
        }
      ];

      service.getUserAuditLog('123').subscribe(entries => {
        expect(entries.length).toBe(2);
        expect(entries[0].action).toBe('user_created');
        expect(entries[1].action).toBe('role_changed');
        expect(entries[0].timestamp instanceof Date).toBe(true);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/users/123/audit-log`);
      expect(req.request.method).toBe('GET');
      req.flush(mockAuditLog);
    });

    it('should return empty array when no audit log entries exist', (done) => {
      authService.isAdmin.and.returnValue(true);

      service.getUserAuditLog('123').subscribe(entries => {
        expect(entries.length).toBe(0);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/users/123/audit-log`);
      req.flush([]);
    });

    it('should return error when userId is missing', (done) => {
      authService.isAdmin.and.returnValue(true);

      service.getUserAuditLog('').subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toContain('User ID is required');
          done();
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle HTTP error responses', (done) => {
      authService.isAdmin.and.returnValue(true);

      service.getUsers().subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/users`);
      req.flush({ message: 'Server error' }, { status: 500, statusText: 'Internal Server Error' });
    });

    it('should handle network errors', (done) => {
      authService.isAdmin.and.returnValue(true);

      service.getUsers().subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toContain('Error');
          done();
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/users`);
      req.error(new ErrorEvent('Network error'));
    });
  });
});
