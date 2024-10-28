import { TestBed } from '@angular/core/testing';
import { AuthGuard } from './auth.guard';
import { CanActivate } from '@angular/router';

describe('AuthGuard', () => {
  let guard: AuthGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthGuard] // Provide the AuthGuard for dependency injection
    });
    guard = TestBed.inject(AuthGuard); // Inject the AuthGuard instance
  });

  it('should be created', () => {
    expect(guard).toBeTruthy(); // Check that the guard instance is created
  });

  // Add additional tests to check guard functionality
});