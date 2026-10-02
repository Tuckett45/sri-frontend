import { Injectable, inject, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
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
  SessionEndReason,
  SessionWarning,
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

  // --- Idle / inactivity tracking ---
  /** Storage key for persisting the last-activity timestamp across tabs/reloads. */
  private static readonly LAST_ACTIVITY_KEY = 'sri_last_activity';
  /** Emits a warning when the session is about to end; null clears any active warning. */
  private sessionWarning$ = new BehaviorSubject<SessionWarning | null>(null);
  /** Epoch ms of the most recent user activity. */
  private lastActivity = Date.now();
  /** Epoch ms at which the throttled activity recorder may fire again. */
  private nextActivityRecordAt = 0;
  /** Interval that polls idle time and drives the warning/logout flow. */
  private idleCheckTimer?: number;
  /** Whether the idle warning is currently showing (prevents duplicate emissions). */
  private idleWarningActive = false;
  /** Guards against concurrent/duplicate session-end flows (e.g. two 401s). */
  private sessionEnding = false;
  /** DOM activity event names we listen to in order to reset the idle timer. */
  private readonly activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'] as const;
  /** Bound handler reference so listeners can be added and removed symmetrically. */
  private readonly activityHandler = (): void => this.recordActivity();
  /** Bound handler that re-checks for a stale session when a tab regains focus. */
  private readonly visibilityHandler = (): void => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      void this.checkIdleState();
      // Also confirm with the server, which is authoritative on idle/expiry.
      void this.validateServerSession();
    }
  };

  // --- Server-side session sync ---
  /** Interval that periodically validates the session with the backend. */
  private serverValidationTimer?: number;
  /** How often (ms) to validate the session against the server. */
  private readonly serverValidationInterval = 60 * 1000;
  /** Epoch ms at which a throttled server heartbeat may fire again. */
  private nextHeartbeatAt = 0;
  /** Minimum interval (ms) between server heartbeats triggered by activity. */
  private readonly heartbeatThrottle = 60 * 1000;

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

      // Reject stale logins: a persisted session whose last activity is older
      // than the idle window should not be silently restored.
      if (this.authState$.value.isAuthenticated && this.isPersistedSessionStale()) {
        console.warn('🔐 Persisted session is stale (idle window elapsed). Terminating.');
        await this.endSession(SessionEndReason.STALE_LOGIN);
        return;
      }

      // Start validation + idle monitoring if authenticated
      if (this.authState$.value.isAuthenticated) {
        this.startTokenValidation();
        this.startIdleMonitoring();
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

      // Start token validation + idle monitoring
      this.sessionEnding = false;
      this.startTokenValidation();
      this.recordActivity(true);
      this.startIdleMonitoring();

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

      // Revoke the server-side session before clearing local state (needs the
      // current sessionId). Best-effort — never blocks local logout.
      await this.revokeServerSession();

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

      // Clear any errors and dismiss any active session warning
      this.authError$.next(null);
      this.clearSessionWarning();

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
   * Get authentication headers for HTTP requests.
   * Uses take(1) to snapshot the current auth state so the returned observable
   * completes after a single emission — preventing the BehaviorSubject from
   * re-triggering HTTP requests via switchMap in interceptors.
   */
  getAuthHeaders(): Observable<HttpHeaders> {
    return this.authState$.pipe(
      take(1),
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
          'X-Session-ID': state.sessionId || '',
          'Ocp-Apim-Subscription-Key': 'ffd675634ab645d7845640bb88d672d8'
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
   * Check if user is authenticated (enhanced version).
   * Uses take(1) to snapshot the current state and avoid re-triggering on state updates.
   */
  isAuthenticated(): Observable<boolean> {
    return this.authState$.pipe(
      take(1),
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

    // Clear persisted idle-activity marker
    try {
      localStorage.removeItem(SecureAuthService.LAST_ACTIVITY_KEY);
    } catch {
      // Ignore storage access errors (e.g. privacy mode)
    }

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

    this.stopIdleMonitoring();
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
   * Show a session-timeout warning triggered by the absolute token lifetime
   * approaching expiry (distinct from idle timeout). Emits on the shared
   * warning channel so the UI can prompt the user.
   */
  private showSessionTimeoutWarning(timeUntilExpiry: number): void {
    const minutes = Math.ceil(timeUntilExpiry / (60 * 1000));
    console.warn(`⚠️ Session (token) expires in ${minutes} minutes`);

    // Token lifetime cannot be extended client-side (no refresh token), so the
    // user cannot keep the session alive here — they can only acknowledge it.
    this.sessionWarning$.next({
      reason: SessionEndReason.TOKEN_EXPIRED,
      msUntilLogout: Math.max(0, timeUntilExpiry),
      canExtend: false
    });
  }

  // ---------------------------------------------------------------------------
  // Idle / inactivity session management
  // ---------------------------------------------------------------------------

  /**
   * Observable stream of session warnings. The UI (AppComponent) subscribes to
   * this to show a countdown dialog. Emits `null` when any active warning is
   * dismissed (session extended) or resolved (logout).
   */
  getSessionWarning(): Observable<SessionWarning | null> {
    return this.sessionWarning$.asObservable();
  }

  /**
   * Extend / refresh the current session in response to explicit user intent
   * (e.g. clicking "Stay logged in"). Resets the idle timer and clears the
   * active warning. Returns false if there is no authenticated session.
   */
  extendSession(): boolean {
    if (!this.authState$.value.isAuthenticated) {
      return false;
    }
    this.recordActivity(true);
    this.idleWarningActive = false;
    this.clearSessionWarning();
    console.log('🔐 Session extended by user activity');
    return true;
  }

  /**
   * Entry point for the HTTP interceptor to report a 401 on any API call so a
   * server-invalidated session (idle/expired) ends the client session too.
   */
  async notifyUnauthorized(error: HttpErrorResponse): Promise<void> {
    await this.handleServerSessionError(error);
  }

  /**
   * Record user activity and reset the idle countdown. Throttled via
   * `activityThrottle` so high-frequency events (mousemove/scroll) are cheap.
   * @param force bypass the throttle (used on login / explicit extend).
   */
  recordActivity(force: boolean = false): void {
    const now = Date.now();
    if (!force && now < this.nextActivityRecordAt) {
      return;
    }
    this.nextActivityRecordAt = now + this.authConfig.activityThrottle;
    this.lastActivity = now;

    try {
      localStorage.setItem(SecureAuthService.LAST_ACTIVITY_KEY, String(now));
    } catch {
      // Ignore storage access errors (e.g. privacy mode)
    }

    // If a warning is showing and the user interacted, keep the session alive.
    if (this.idleWarningActive) {
      this.idleWarningActive = false;
      this.clearSessionWarning();
    }

    // Inform the server of activity (throttled) so its LastActivityAt tracks
    // genuine use. Forced calls (login / explicit extend) always send one.
    if (force || now >= this.nextHeartbeatAt) {
      this.nextHeartbeatAt = now + this.heartbeatThrottle;
      void this.sendHeartbeat();
    }
  }

  // ---------------------------------------------------------------------------
  // Server-side session synchronisation
  // ---------------------------------------------------------------------------

  /**
   * Resolve the API base URL from runtime configuration, with a sensible default.
   */
  private getApiBaseUrl(): string {
    const config = this.configService.getCurrentConfig();
    return config?.apiBaseUrl || 'https://sri-api.azurewebsites.net/api';
  }

  /**
   * Whether the server round-trips make sense: we must be authenticated and
   * hold a real server-issued session id (not the cookie placeholder).
   */
  private hasServerSession(): boolean {
    const state = this.authState$.value;
    return state.isAuthenticated && !!state.sessionId;
  }

  /**
   * Send an activity heartbeat to the backend. The X-Session-ID header is added
   * by the HTTP interceptor from the current auth state. A 401 means the server
   * already ended the session (idle/expired); we end it locally with its reason.
   */
  private async sendHeartbeat(): Promise<void> {
    if (!this.hasServerSession()) {
      return;
    }
    try {
      await firstValueFrom(
        this.http.post(`${this.getApiBaseUrl()}/auth/session/heartbeat`, {}, { withCredentials: true })
      );
    } catch (error) {
      await this.handleServerSessionError(error);
    }
  }

  /**
   * Validate the session with the backend without recording activity. On a
   * session_invalid 401 the server-provided reason drives the local logout.
   */
  private async validateServerSession(): Promise<void> {
    if (!this.hasServerSession()) {
      return;
    }
    try {
      await firstValueFrom(
        this.http.get(`${this.getApiBaseUrl()}/auth/session/validate`, { withCredentials: true })
      );
    } catch (error) {
      await this.handleServerSessionError(error);
    }
  }

  /**
   * Map a failed session API call to a local session end. Only a 401 is treated
   * as the server ending the session; transient/network errors are ignored so a
   * blip doesn't log the user out.
   */
  private async handleServerSessionError(error: unknown): Promise<void> {
    const status = (error as HttpErrorResponse)?.status;
    if (status !== 401) {
      // Network / server hiccup — don't force a logout on a transient failure.
      return;
    }

    const body: any = (error as HttpErrorResponse)?.error;
    const reason = this.mapServerReason(body?.reason);
    console.warn('🔐 Server reported session invalid:', body?.reason ?? 'unknown');
    await this.endSession(reason);
  }

  /**
   * Translate a backend session reason ('Idle' | 'Expired' | 'Logout') into the
   * client SessionEndReason used for messaging.
   */
  private mapServerReason(reason: string | undefined): SessionEndReason {
    switch (reason) {
      case 'Idle':
        return SessionEndReason.IDLE;
      case 'Expired':
        return SessionEndReason.STALE_LOGIN;
      default:
        return SessionEndReason.TOKEN_EXPIRED;
    }
  }

  /**
   * Tell the backend to revoke the current session. Best-effort: failures are
   * swallowed so local logout always proceeds.
   */
  private async revokeServerSession(): Promise<void> {
    if (!this.hasServerSession()) {
      return;
    }
    try {
      await firstValueFrom(
        this.http.post(`${this.getApiBaseUrl()}/auth/session/logout`, {}, { withCredentials: true })
      );
    } catch {
      // Ignore — the session will expire server-side regardless.
    }
  }

  /**
   * Start periodic server-side session validation.
   */
  private startServerValidation(): void {
    this.stopServerValidation();
    if (typeof window === 'undefined') {
      return;
    }
    this.serverValidationTimer = window.setInterval(() => {
      void this.validateServerSession();
    }, this.serverValidationInterval);
  }

  private stopServerValidation(): void {
    if (this.serverValidationTimer) {
      clearInterval(this.serverValidationTimer);
      this.serverValidationTimer = undefined;
    }
  }

  /**
   * Begin monitoring for user inactivity: attach activity listeners and start
   * the polling timer that drives the warning and auto-logout.
   */
  private startIdleMonitoring(): void {
    this.stopIdleMonitoring();

    if (typeof window === 'undefined') {
      return;
    }

    for (const evt of this.activityEvents) {
      window.addEventListener(evt, this.activityHandler, { passive: true });
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.visibilityHandler);
    }

    // Poll at a fraction of the warning duration (min 1s) so the countdown and
    // the auto-logout fire promptly without a heavyweight timer.
    const pollInterval = Math.max(1000, Math.floor(this.authConfig.idleWarningDuration / 4));
    this.idleCheckTimer = window.setInterval(() => {
      void this.checkIdleState();
    }, pollInterval);

    // The backend is authoritative on idle/expiry — poll it periodically too.
    this.startServerValidation();
  }

  /**
   * Remove activity listeners and stop the idle polling timer.
   */
  private stopIdleMonitoring(): void {
    if (typeof window !== 'undefined') {
      for (const evt of this.activityEvents) {
        window.removeEventListener(evt, this.activityHandler);
      }
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
    if (this.idleCheckTimer) {
      clearInterval(this.idleCheckTimer);
      this.idleCheckTimer = undefined;
    }
    this.stopServerValidation();
    this.idleWarningActive = false;
  }

  /**
   * Evaluate how long the user has been idle and act accordingly:
   * - past the idle timeout  -> terminate the session (idle logout)
   * - within the warning band -> emit/refresh a countdown warning
   * - otherwise              -> ensure no stale warning is showing
   */
  private async checkIdleState(): Promise<void> {
    if (!this.authState$.value.isAuthenticated) {
      return;
    }

    // Use the most recent activity across tabs (persisted value may be newer).
    const persisted = this.readPersistedLastActivity();
    if (persisted && persisted > this.lastActivity) {
      this.lastActivity = persisted;
    }

    const idleFor = Date.now() - this.lastActivity;
    const { idleTimeout, idleWarningDuration } = this.authConfig;

    if (idleFor >= idleTimeout) {
      console.warn('🔐 User idle beyond timeout — ending session');
      await this.endSession(SessionEndReason.IDLE);
      return;
    }

    const msUntilLogout = idleTimeout - idleFor;
    if (msUntilLogout <= idleWarningDuration) {
      // Within the warning window: emit (or refresh) the countdown.
      this.idleWarningActive = true;
      this.sessionWarning$.next({
        reason: SessionEndReason.IDLE,
        msUntilLogout,
        canExtend: true
      });
    } else if (this.idleWarningActive) {
      // User became active again before timeout; dismiss the warning.
      this.idleWarningActive = false;
      this.clearSessionWarning();
    }
  }

  /**
   * Determine whether a just-restored persisted session is stale — i.e. the
   * last recorded activity is older than the idle timeout, meaning the user
   * was away long enough that the session should not be trusted.
   */
  private isPersistedSessionStale(): boolean {
    const persisted = this.readPersistedLastActivity();
    if (persisted === null) {
      // No activity marker (fresh login path or first run): treat as active.
      this.lastActivity = Date.now();
      return false;
    }
    this.lastActivity = persisted;
    return Date.now() - persisted >= this.authConfig.idleTimeout;
  }

  /**
   * Read and parse the persisted last-activity timestamp, or null if absent/invalid.
   */
  private readPersistedLastActivity(): number | null {
    try {
      const raw = localStorage.getItem(SecureAuthService.LAST_ACTIVITY_KEY);
      if (!raw) {
        return null;
      }
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  /**
   * Centralised session termination used by idle timeout and stale-login
   * detection. Records the reason as an auth error and performs a full logout.
   */
  private async endSession(reason: SessionEndReason): Promise<void> {
    // Guard against duplicate end flows (e.g. heartbeat and an API call both 401).
    if (this.sessionEnding || !this.authState$.value.isAuthenticated) {
      return;
    }
    this.sessionEnding = true;

    const message = reason === SessionEndReason.IDLE
      ? 'You were signed out due to inactivity. Please log in again.'
      : 'Your previous session expired. Please log in again.';

    this.handleAuthError({
      type: AuthErrorType.SESSION_TIMEOUT,
      message,
      timestamp: new Date(),
      recoverable: false,
      context: { reason }
    });

    this.clearSessionWarning();
    try {
      await this.logout();
    } finally {
      this.sessionEnding = false;
    }
  }

  /**
   * Clear any active session warning on the stream.
   */
  private clearSessionWarning(): void {
    if (this.sessionWarning$.value !== null) {
      this.sessionWarning$.next(null);
    }
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
