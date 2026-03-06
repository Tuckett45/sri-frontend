import { Injectable, inject, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ConfigurationService } from './configuration.service';
import { User } from '../models/user.model';
import { LoginModel } from '../models/login-model.model';
import { StatePersistenceService } from '../features/field-resource-management/services/state-persistence.service';
import {
  AuthResult,
  SecureAuthState,
  SecureAuthConfig,
  AuthMethod,
  AuthError,
  AuthErrorType,
  DEFAULT_SECURE_AUTH_CONFIG,
  STORAGE_SECURITY_LEVELS
} from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class SecureAuthService extends AuthService implements OnDestroy {
  private readonly configService = inject(ConfigurationService);
  
  private authConfig: SecureAuthConfig = DEFAULT_SECURE_AUTH_CONFIG;
  private authState$ = new BehaviorSubject<SecureAuthState>({
    isAuthenticated: false,
    user: null,
    tokenExpiresAt: null,
    lastValidated: null,
    sessionId: null,
    authMethod: AuthMethod.MEMORY_ONLY
  });
  
  private authError$ = new BehaviorSubject<AuthError | null>(null);
  private tokenValidationTimer?: number;
  private sessionWarningTimer?: number;
  private memoryOnlyToken: string | null = null;
  private currentAuthMethod: AuthMethod = AuthMethod.MEMORY_ONLY;

  constructor(
    router: Router, 
    http: HttpClient,
    statePersistenceService: StatePersistenceService
  ) {
    super(router, http, statePersistenceService);
    // Don't initialize immediately - wait for explicit initialization
  }

  /**
   * Initialize secure authentication - should be called after ConfigurationService is ready
   * @param force - Force re-initialization even if already authenticated
   */
  async initialize(force: boolean = false): Promise<void> {
    if (this.authState$.value.isAuthenticated && !force) {
      console.log('🔐 SecureAuthService already initialized');
      return;
    }

    try {
      console.log('🔐 Initializing SecureAuthService...');
      
      // Wait for configuration to be available
      const config = await firstValueFrom(this.configService.getConfig());
      if (config) {
        // Update auth config based on runtime configuration
        this.authConfig = {
          ...DEFAULT_SECURE_AUTH_CONFIG,
          // Could be overridden by runtime config in the future
        };
      }

      // Determine the best available authentication method
      this.currentAuthMethod = this.determineBestAuthMethod();
      console.log(`🔐 Using authentication method: ${this.currentAuthMethod}`);

      // Load existing authentication state
      await this.loadExistingAuthState();

      // Start token validation if authenticated
      if (this.authState$.value.isAuthenticated) {
        this.startTokenValidation();
      }

      console.log('✅ SecureAuthService initialized successfully', {
        isAuthenticated: this.authState$.value.isAuthenticated,
        user: this.authState$.value.user?.email
      });

    } catch (error) {
      console.error('❌ Failed to initialize secure authentication:', error);
      this.handleAuthError({
        type: AuthErrorType.VALIDATION_ERROR,
        message: 'Failed to initialize secure authentication',
        timestamp: new Date(),
        recoverable: true,
        context: { error }
      });
    }
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  /**
   * Enhanced login with secure token storage
   * Maintains compatibility with parent class Observable interface
   */
  override login(credentials: LoginModel): Observable<any> {
    // Convert Promise to Observable for compatibility
    return new Observable(observer => {
      this.secureLogin(credentials).then(result => {
        if (result.success) {
          observer.next(result.user);
          observer.complete();
        } else {
          observer.error(new Error(result.error));
        }
      }).catch(error => {
        observer.error(error);
      });
    });
  }

  /**
   * Secure login implementation
   */
  async secureLogin(credentials: LoginModel): Promise<AuthResult> {
    try {
      console.log('🔐 Starting secure login process...');
      this.authError$.next(null);

      // Get configuration for API calls
      const config = this.configService.getCurrentConfig();
      const apiUrl = config?.apiBaseUrl || 'https://sri-api.azurewebsites.net/api';

      const httpOptions = {
        headers: new HttpHeaders({
          'Content-Type': 'application/json'
          // Note: No hardcoded API subscription key - will be added by interceptor
        }),
        withCredentials: true // Enable cookies for HTTP-only cookie support
      };

      const loginResponse = await firstValueFrom(this.http.post<any>(`${apiUrl}/auth/login`, credentials, httpOptions));

      if (!loginResponse) {
        throw new Error('Empty login response');
      }

      // Extract token and user information
      let token = loginResponse?.token ?? loginResponse?.accessToken ?? null;
      const user = loginResponse.user || loginResponse;
      const expiresAt = loginResponse.expiresAt ? new Date(loginResponse.expiresAt) : this.calculateTokenExpiry();
      const sessionId = loginResponse.sessionId || this.generateSessionId();

      // Some backends rely solely on HTTP-only cookies and don't return a token.
      // In that case, treat it as cookie-based auth and continue without failing.
      if (!token) {
        console.warn('No authentication token received; assuming HTTP-only cookie auth.');
        this.currentAuthMethod = AuthMethod.HTTP_ONLY_COOKIES;
        token = 'http-only-cookie';
      }

      // Store authentication data securely
      await this.storeAuthData(token, user, expiresAt, sessionId);

      // Update authentication state
      const authState: SecureAuthState = {
        isAuthenticated: true,
        user: user,
        tokenExpiresAt: expiresAt,
        lastValidated: new Date(),
        sessionId: sessionId,
        authMethod: this.currentAuthMethod
      };

      this.authState$.next(authState);

      // Update parent class state for backward compatibility
      this.setUser(user);
      this.setUserRole(this.resolveRole(user));
      this.loggedInStatus.next(true);

      // Start token validation
      this.startTokenValidation();

      console.log('✅ Secure login successful');
      return {
        success: true,
        user: user,
        token: token,
        expiresAt: expiresAt,
        sessionId: sessionId
      };

    } catch (error) {
      console.error('❌ Secure login failed:', error);
      
      const authError: AuthError = {
        type: error instanceof HttpErrorResponse && error.status === 401 
          ? AuthErrorType.UNAUTHORIZED 
          : AuthErrorType.NETWORK_ERROR,
        message: error instanceof Error ? error.message : 'Login failed',
        timestamp: new Date(),
        recoverable: true,
        context: { credentials: { email: credentials.email } }
      };

      this.authError$.next(authError);

      return {
        success: false,
        error: authError.message
      };
    }
  }

  /**
   * Enhanced logout with secure cleanup
   */
  override async logout(): Promise<void> {
    try {
      console.log('🔐 Starting secure logout process...');

      // Clear timers
      this.clearTimers();

      // Clear all stored authentication data
      await this.clearAllAuthData();

      // Reset authentication state
      this.authState$.next({
        isAuthenticated: false,
        user: null,
        tokenExpiresAt: null,
        lastValidated: null,
        sessionId: null,
        authMethod: this.currentAuthMethod
      });

      // Update parent class state for backward compatibility
      this.currentUser = null;
      this.loggedInStatus.next(false);

      // Clear any errors
      this.authError$.next(null);

      console.log('✅ Secure logout completed');

      // Navigate to login
      this.router.navigate(['/login']);

    } catch (error) {
      console.error('❌ Error during secure logout:', error);
      // Even if cleanup fails, ensure user is logged out
      this.router.navigate(['/login']);
    }
  }

  /**
   * Get authentication headers for HTTP requests
   */
  getAuthHeaders(): Observable<HttpHeaders> {
    return this.authState$.pipe(
      switchMap(async (state) => {
        if (!state.isAuthenticated) {
          return new HttpHeaders();
        }

        const token = await this.getStoredToken();
        if (!token) {
          return new HttpHeaders();
        }

        return new HttpHeaders({
          'Authorization': `Bearer ${token}`,
          'X-Session-ID': state.sessionId || ''
        });
      })
    );
  }

  /**
   * Validate token expiration
   */
  async validateTokenExpiration(): Promise<boolean> {
    try {
      const state = this.authState$.value;
      if (!state.isAuthenticated) {
        console.log('🔐 Token validation skipped - user not authenticated');
        return false;
      }

      // For HTTP-only cookie auth, we can't validate expiration client-side
      if (this.currentAuthMethod === AuthMethod.HTTP_ONLY_COOKIES) {
        console.log('🔐 Token validation skipped - using HTTP-only cookies');
        // Update last validated time
        this.authState$.next({
          ...state,
          lastValidated: new Date()
        });
        return true;
      }

      if (!state.tokenExpiresAt) {
        console.warn('⚠️ No token expiration time available - assuming valid');
        // Update last validated time
        this.authState$.next({
          ...state,
          lastValidated: new Date()
        });
        return true;
      }

      const now = new Date();
      const timeUntilExpiry = state.tokenExpiresAt.getTime() - now.getTime();

      // Token is expired
      if (timeUntilExpiry <= 0) {
        console.warn('⚠️ Token has expired');
        await this.handleTokenExpiry();
        return false;
      }

      // Token expires soon - show warning
      if (timeUntilExpiry <= this.authConfig.sessionTimeoutWarning) {
        this.showSessionTimeoutWarning(timeUntilExpiry);
      }

      // Update last validated time
      this.authState$.next({
        ...state,
        lastValidated: now
      });

      console.log('✅ Token validation successful, expires in:', Math.ceil(timeUntilExpiry / (60 * 1000)), 'minutes');
      return true;

    } catch (error) {
      console.error('❌ Token validation failed:', error);
      // Don't logout on validation errors - just log and continue
      return true; // Return true to prevent logout on validation errors
    }
  }

  /**
   * Get current authentication state
   */
  getAuthState(): Observable<SecureAuthState> {
    return this.authState$.asObservable();
  }

  /**
   * Get current authentication error
   */
  getAuthError(): Observable<AuthError | null> {
    return this.authError$.asObservable();
  }

  /**
   * Check if user is authenticated (enhanced version)
   */
  isAuthenticated(): Observable<boolean> {
    return this.authState$.pipe(
      switchMap(async (state) => {
        if (!state.isAuthenticated) {
          return false;
        }

        // Validate token if it's been a while since last validation
        const timeSinceValidation = state.lastValidated 
          ? new Date().getTime() - state.lastValidated.getTime()
          : Infinity;

        if (timeSinceValidation > this.authConfig.tokenValidationInterval) {
          return await this.validateTokenExpiration();
        }

        return true;
      })
    );
  }

  /**
   * Override parent getAccessToken with secure implementation
   */
  override async getAccessToken(): Promise<string | null> {
    const state = this.authState$.value;
    if (!state.isAuthenticated) {
      return null;
    }

    // Validate token before returning
    const isValid = await this.validateTokenExpiration();
    if (!isValid) {
      return null;
    }

    return await this.getStoredToken();
  }

  /**
   * Determine the best available authentication method
   */
  private determineBestAuthMethod(): AuthMethod {
    // Check each method in order of security preference
    for (const method of STORAGE_SECURITY_LEVELS) {
      if (this.isAuthMethodSupported(method)) {
        return method;
      }
    }

    // Fallback to memory-only (least persistent but most secure)
    return AuthMethod.MEMORY_ONLY;
  }

  /**
   * Check if an authentication method is supported
   */
  private isAuthMethodSupported(method: AuthMethod): boolean {
    switch (method) {
      case AuthMethod.HTTP_ONLY_COOKIES:
        // Check if cookies are enabled and we're on HTTPS (in production)
        return typeof document !== 'undefined' && 
               navigator.cookieEnabled && 
               (location.protocol === 'https:' || location.hostname === 'localhost');
      
      case AuthMethod.SECURE_STORAGE:
        // Check if we have access to secure storage APIs
        return typeof window !== 'undefined' && 
               'crypto' in window && 
               'localStorage' in window;
      
      case AuthMethod.SESSION_STORAGE:
        return typeof window !== 'undefined' && 'sessionStorage' in window;
      
      case AuthMethod.MEMORY_ONLY:
        return true; // Always supported
      
      default:
        return false;
    }
  }

  /**
   * Store authentication data using the current method
   */
  private async storeAuthData(token: string, user: User, expiresAt: Date, sessionId: string): Promise<void> {
    switch (this.currentAuthMethod) {
      case AuthMethod.HTTP_ONLY_COOKIES:
        // For HTTP-only cookies, the server should set the cookie
        // We just store user data and session info
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('sessionId', sessionId);
        localStorage.setItem('loggedIn', 'true');
        break;

      case AuthMethod.SECURE_STORAGE:
        // Use encrypted storage (simplified for now)
        const encryptedToken = btoa(token); // Basic encoding - could be enhanced
        localStorage.setItem(`${this.authConfig.secureStoragePrefix}token`, encryptedToken);
        localStorage.setItem(`${this.authConfig.secureStoragePrefix}user`, JSON.stringify(user));
        localStorage.setItem(`${this.authConfig.secureStoragePrefix}expires`, expiresAt.toISOString());
        localStorage.setItem(`${this.authConfig.secureStoragePrefix}session`, sessionId);
        localStorage.setItem('loggedIn', 'true');
        break;

      case AuthMethod.SESSION_STORAGE:
        // Fallback to session storage (less secure)
        sessionStorage.setItem('authToken', token);
        sessionStorage.setItem('user', JSON.stringify(user));
        sessionStorage.setItem('expiresAt', expiresAt.toISOString());
        sessionStorage.setItem('sessionId', sessionId);
        localStorage.setItem('loggedIn', 'true');
        break;

      case AuthMethod.MEMORY_ONLY:
        // Store only in memory (most secure but not persistent)
        this.memoryOnlyToken = token;
        // Still store user info for app functionality
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('loggedIn', 'true');
        break;
    }
  }

  /**
   * Get stored token using the current method
   */
  private async getStoredToken(): Promise<string | null> {
    switch (this.currentAuthMethod) {
      case AuthMethod.HTTP_ONLY_COOKIES:
        // Token should be in HTTP-only cookie, not accessible to JS
        // Return a placeholder - actual auth will be handled by cookies
        return 'http-only-cookie';

      case AuthMethod.SECURE_STORAGE:
        const encryptedToken = localStorage.getItem(`${this.authConfig.secureStoragePrefix}token`);
        return encryptedToken ? atob(encryptedToken) : null;

      case AuthMethod.SESSION_STORAGE:
        return sessionStorage.getItem('authToken');

      case AuthMethod.MEMORY_ONLY:
        return this.memoryOnlyToken;

      default:
        return null;
    }
  }

  /**
   * Load existing authentication state
   */
  private async loadExistingAuthState(): Promise<void> {
    try {
      console.log('🔐 Loading existing auth state...');
      
      // Check if user was previously logged in
      const wasLoggedIn = localStorage.getItem('loggedIn') === 'true';
      console.log('🔐 Was logged in:', wasLoggedIn);
      
      if (!wasLoggedIn) {
        console.log('🔐 No previous login state found');
        return;
      }

      const userString = localStorage.getItem('user');
      if (!userString) {
        console.warn('⚠️ Login state found but no user data');
        return;
      }

      const user = JSON.parse(userString);
      console.log('🔐 User data loaded:', { email: user.email, role: user.role });
      
      const token = await this.getStoredToken();
      const usingCookieAuth = this.currentAuthMethod === AuthMethod.HTTP_ONLY_COOKIES;
      console.log('🔐 Auth method:', this.currentAuthMethod);
      console.log('🔐 Token available:', !!token);

      if (!token && !usingCookieAuth) {
        console.warn('⚠️ Persisted login state found without a token. Clearing stale auth data.');
        await this.clearAllAuthData();
        return;
      }

      if (usingCookieAuth && (!token || token === 'http-only-cookie')) {
        const sessionId = localStorage.getItem('sessionId');
        if (!sessionId) {
          console.warn('⚠️ Missing session identifier for cookie-based auth. Clearing stale auth data.');
          await this.clearAllAuthData();
          return;
        }

        console.log('✅ Restoring HTTP-only cookie auth session');
        
        // For HTTP-only cookies we cannot read the token; mark as authenticated and validate on first API call
        this.authState$.next({
          isAuthenticated: true,
          user: user,
          tokenExpiresAt: null, // Will be determined on first validation
          lastValidated: null,
          sessionId: sessionId,
          authMethod: this.currentAuthMethod
        });

        // Update parent class state
        this.setUser(user);
        this.setUserRole(this.resolveRole(user));
        this.loggedInStatus.next(true);
        
        console.log('✅ HTTP-only cookie auth state restored');
        return;
      }

      // For other methods, check expiration
      let expiresAt: Date | null = null;
      if (this.currentAuthMethod === AuthMethod.SECURE_STORAGE) {
        const expiresString = localStorage.getItem(`${this.authConfig.secureStoragePrefix}expires`);
        expiresAt = expiresString ? new Date(expiresString) : null;
      } else if (this.currentAuthMethod === AuthMethod.SESSION_STORAGE) {
        const expiresString = sessionStorage.getItem('expiresAt');
        expiresAt = expiresString ? new Date(expiresString) : null;
      }

      console.log('🔐 Token expires at:', expiresAt);

      // Check if token is expired
      if (expiresAt && expiresAt.getTime() <= new Date().getTime()) {
        console.warn('⚠️ Stored token has expired');
        await this.clearAllAuthData();
        return;
      }

      // Restore authentication state
      this.authState$.next({
        isAuthenticated: true,
        user: user,
        tokenExpiresAt: expiresAt,
        lastValidated: new Date(),
        sessionId: localStorage.getItem('sessionId'),
        authMethod: this.currentAuthMethod
      });

      // Update parent class state
      this.setUser(user);
      this.setUserRole(this.resolveRole(user));
      this.loggedInStatus.next(true);

      console.log('✅ Restored authentication state successfully');

    } catch (error) {
      console.error('❌ Failed to load existing auth state:', error);
      await this.clearAllAuthData();
    }
  }

  /**
   * Clear all authentication data
   */
  private async clearAllAuthData(): Promise<void> {
    // Clear localStorage
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('user');
    localStorage.removeItem('sessionId');

    // Clear secure storage
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.authConfig.secureStoragePrefix)) {
        localStorage.removeItem(key);
      }
    });

    // Clear session storage
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('expiresAt');
    sessionStorage.removeItem('sessionId');

    // Clear memory
    this.memoryOnlyToken = null;

    // Clear parent class storage
    super.clearStorage();
  }

  /**
   * Start token validation timer
   */
  private startTokenValidation(): void {
    this.clearTimers();

    this.tokenValidationTimer = window.setInterval(async () => {
      await this.validateTokenExpiration();
    }, this.authConfig.tokenValidationInterval);
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.tokenValidationTimer) {
      clearInterval(this.tokenValidationTimer);
      this.tokenValidationTimer = undefined;
    }

    if (this.sessionWarningTimer) {
      clearTimeout(this.sessionWarningTimer);
      this.sessionWarningTimer = undefined;
    }
  }

  /**
   * Handle token expiry
   */
  private async handleTokenExpiry(): Promise<void> {
    console.warn('🔐 Token expired - logging out user');
    
    this.handleAuthError({
      type: AuthErrorType.TOKEN_EXPIRED,
      message: 'Your session has expired. Please log in again.',
      timestamp: new Date(),
      recoverable: false
    });

    await this.logout();
  }

  /**
   * Show session timeout warning
   */
  private showSessionTimeoutWarning(timeUntilExpiry: number): void {
    const minutes = Math.ceil(timeUntilExpiry / (60 * 1000));
    console.warn(`⚠️ Session expires in ${minutes} minutes`);
    
    // Could emit an event or show a toast notification here
    // For now, just log the warning
  }

  /**
   * Handle authentication errors
   */
  private handleAuthError(error: AuthError): void {
    this.authError$.next(error);
    console.error('🚨 Authentication Error:', error);
  }

  /**
   * Calculate token expiry time (default 8 hours)
   */
  private calculateTokenExpiry(): Date {
    return new Date(Date.now() + this.authConfig.maxSessionDuration);
  }

  /**
   * Generate a session ID
   */
  private generateSessionId(): string {
    return 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
  }
}
