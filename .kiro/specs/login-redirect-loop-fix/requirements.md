# Login Redirect Loop Fix - Requirements

## Problem Statement
Users are getting stuck in a redirect loop after logging in. The application has two authentication services (`AuthService` and `SecureAuthService`) that are not properly synchronized, causing race conditions during the login flow.

## Root Cause Analysis

### Current Architecture Issues
1. **Dual Auth Services**: Both `AuthService` and `SecureAuthService` exist, with `SecureAuthService` extending `AuthService`
2. **Inconsistent State**: `AuthGuard` checks `AuthService.isLoggedIn()` but login flow uses both services
3. **Timing Issues**: 
   - `LoginComponent.ngOnInit()` calls `secureAuthService.logout()` 
   - After successful login, it calls `secureAuthService.initialize(true)`
   - Navigation happens before auth state is fully synchronized
4. **Race Condition**: The guard checks auth status before the secure auth service finishes initialization

### Current Flow (Broken)
```
1. User submits login form
2. AuthService.login() succeeds → sets localStorage['loggedIn'] = 'true'
3. LoginComponent calls secureAuthService.initialize(true)
4. LoginComponent calls router.navigate(['/some-route'])
5. AuthGuard.canActivate() checks authService.isLoggedIn()
   - Sometimes returns true (if localStorage is set)
   - Sometimes returns false (if timing is off)
6. If false → redirects to /login
7. Loop continues
```

## User Stories

### 1. Successful Login Flow
**As a** user  
**I want to** log in successfully and be redirected to my role-specific page  
**So that** I can access the application without getting stuck in a loop

**Acceptance Criteria:**
- 1.1 User enters valid credentials and clicks login
- 1.2 Authentication completes successfully
- 1.3 User is redirected to the appropriate page based on their role
- 1.4 No redirect loops occur
- 1.5 Auth state is consistent across all services
- 1.6 Navigation happens only after auth state is fully synchronized

### 2. Auth Guard Protection
**As a** developer  
**I want** the auth guard to reliably check authentication status  
**So that** protected routes are only accessible to authenticated users

**Acceptance Criteria:**
- 2.1 AuthGuard checks a single source of truth for auth status
- 2.2 AuthGuard waits for auth initialization to complete
- 2.3 AuthGuard correctly redirects unauthenticated users to login
- 2.4 AuthGuard allows authenticated users to access protected routes
- 2.5 No race conditions between guard checks and auth state updates

### 3. Login Component Initialization
**As a** developer  
**I want** the login component to properly initialize without interfering with auth state  
**So that** users can log in without unexpected logouts

**Acceptance Criteria:**
- 3.1 Login component does NOT call logout() in ngOnInit()
- 3.2 Login component only initializes the form
- 3.3 Existing auth state is preserved when navigating to login page
- 3.4 Only explicit logout actions clear auth state

### 4. Auth Service Synchronization
**As a** developer  
**I want** both auth services to maintain consistent state  
**So that** there are no conflicts or race conditions

**Acceptance Criteria:**
- 4.1 SecureAuthService properly extends AuthService
- 4.2 Both services share the same auth state
- 4.3 State changes in one service are reflected in the other
- 4.4 No duplicate state management
- 4.5 Single source of truth for authentication status

## Technical Requirements

### 1. Remove Logout from Login Component
- Remove `await this.secureAuthService.logout()` from `LoginComponent.ngOnInit()`
- Only initialize the form in ngOnInit()
- Let explicit logout actions handle clearing auth state

### 2. Synchronize Auth State
- Ensure `SecureAuthService.initialize()` updates parent `AuthService` state
- Make sure `localStorage['loggedIn']` is set before navigation
- Ensure `loggedInStatus` BehaviorSubject is updated

### 3. Fix Navigation Timing
- Wait for `secureAuthService.initialize()` to complete before navigation
- Ensure auth state is fully synchronized before calling `router.navigate()`
- Add proper async/await handling

### 4. Update Auth Guard (Optional Enhancement)
- Consider making AuthGuard async to wait for auth initialization
- Add timeout to prevent infinite waiting
- Provide better error handling

## Edge Cases

### 1. User Already Logged In
- If user navigates to /login while already authenticated
- Should redirect to their role-specific page
- Should NOT clear existing auth state

### 2. Expired Session
- If session expires while user is active
- Should redirect to login
- Should show appropriate message

### 3. Concurrent Login Attempts
- If user opens multiple tabs and logs in
- Auth state should sync across tabs
- No conflicts or race conditions

### 4. Page Refresh
- If user refreshes page after login
- Auth state should be restored from localStorage
- User should remain logged in

## Success Criteria

1. ✅ Users can log in successfully without redirect loops
2. ✅ Navigation to role-specific pages works correctly
3. ✅ Auth guard reliably protects routes
4. ✅ No race conditions in auth state management
5. ✅ Auth state is consistent across both services
6. ✅ Page refresh preserves auth state
7. ✅ Logout works correctly and clears all auth state

## Out of Scope

- Complete refactoring to single auth service (future enhancement)
- Token refresh mechanism (future enhancement)
- Multi-factor authentication (future enhancement)
- Session management across multiple devices (future enhancement)

## Dependencies

- Angular Router
- RxJS BehaviorSubject
- LocalStorage API
- AuthService
- SecureAuthService
- AuthGuard

## Testing Strategy

### Unit Tests
- Test LoginComponent without logout in ngOnInit
- Test AuthGuard with various auth states
- Test SecureAuthService initialization
- Test auth state synchronization

### Integration Tests
- Test complete login flow
- Test navigation after login
- Test auth guard with protected routes
- Test page refresh scenarios

### Manual Testing
- Test login with different user roles
- Test navigation to various protected routes
- Test page refresh after login
- Test logout and re-login
- Test multiple tabs/windows

## Notes

- This is a critical bug affecting user experience
- Should be prioritized for immediate fix
- Consider long-term refactoring to single auth service
- Document the dual auth service architecture for future developers
