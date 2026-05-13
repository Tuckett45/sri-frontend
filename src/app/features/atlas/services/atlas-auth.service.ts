import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { AtlasConfigService } from './atlas-config.service';

/**
 * ATLAS authentication token information
 */
export interface AtlasToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  tokenType: string;
  scope?: string;
}

/**
 * ATLAS authentication state
 */
export interface AtlasAuthState {
  isAuthenticated: boolean;
  token: AtlasToken | null;
  lastRefreshed: Date | null;
  sessionId: string | null;
}

/**
 * AtlasAuthService
 * 
 * Manages ATLAS access tokens with secure session storage and automatic refresh.
 * Provides methods to obtain, store, and refresh ATLAS access tokens.
 * 
 * Requirements: 2.1, 2.2, 2.3, 12.1
 */
@Injectable({
  providedIn: 'root'
})
export class AtlasAuthService {
  private readonly SESSION_STORAGE_KEY = 'atlas_auth_token';
  private readonly SESSION_ID_KEY = 'atlas_session_id';
  private readonly REFRESH_BUFFER_MS = 5 * 60 * 1000; // Refresh 5 minutes before expiry

  private authState$ = new BehaviorSubject<AtlasAuthState>({
    isAuthenticated: false,
    token: null,
    lastRefreshed: null,
    sessionId: null
  });

  private refreshTimer?: number;

  constructor(
    private http: HttpClient,
    private configService: AtlasConfigService
  ) {
    this.initializeFromStorage();
  }

  /**
   * Get the current authentication state as an observable
   */
  get authState(): Observable<AtlasAuthState> {
    return this.authState$.asObservable();
  }

  /**
   * Get the current authentication state synchronously
   */
  get currentAuthState(): AtlasAuthState {
    return this.authState$.value;
  }

  /**
   * Check if user is authenticated with ATLAS
   */
  isAuthenticated(): boolean {
    const state = this.authState$.value;
    if (!state.isAuthenticated || !state.token) {
      return false;
    }

    // Check if token is expired
    const now = new Date();
    if (state.token.expiresAt <= now) {
      return false;
    }

    return true;
  }

  /**
   * Obtain ATLAS access token
   * Requirements: 2.1
   * 
   * @param credentials - User credentials or existing auth token
   * @returns Promise resolving to ATLAS token
   */
  async obtainToken(credentials?: { username: string; password: string } | { arkToken: string }): Promise<AtlasToken> {
    try {
      const baseUrl = this.configService.getBaseUrl();
      const endpoint = `${baseUrl}/auth/token`;

      const headers = new HttpHeaders({
        'Content-Type': 'application/json'
      });

      // Request body depends on credential type
      const body = credentials || {};

      const response = await firstValueFrom(
        this.http.post<any>(endpoint, body, { headers })
      );

      const token: AtlasToken = {
        accessToken: response.access_token || response.accessToken,
        refreshToken: response.refresh_token || response.refreshToken,
        expiresAt: this.parseExpiryDate(response.expires_in || response.expiresIn),
        tokenType: response.token_type || response.tokenType || 'Bearer',
        scope: response.scope
      };

      // Store token securely (Requirement 2.2)
      this.storeToken(token);

      // Schedule automatic refresh (Requirement 2.3)
      this.scheduleTokenRefresh(token);

      return token;
    } catch (error) {
      console.error('Failed to obtain ATLAS token:', error);
      throw new Error('Failed to obtain ATLAS access token');
    }
  }

  /**
   * Get the current access token
   * Requirements: 2.2, 2.10
   * 
   * @returns The current access token or null if not authenticated
   */
  async getAccessToken(): Promise<string | null> {
    const state = this.authState$.value;

    if (!state.isAuthenticated || !state.token) {
      return null;
    }

    // Check if token is expired or about to expire (Requirement 2.10)
    const now = new Date();
    const timeUntilExpiry = state.token.expiresAt.getTime() - now.getTime();

    if (timeUntilExpiry <= 0) {
      // Token is expired, try to refresh
      console.warn('ATLAS token expired, attempting refresh');
      try {
        const newToken = await this.refreshToken();
        return newToken.accessToken;
      } catch (error) {
        console.error('Failed to refresh expired token:', error);
        this.clearToken();
        return null;
      }
    }

    // If token expires soon, refresh proactively (Requirement 2.3)
    if (timeUntilExpiry <= this.REFRESH_BUFFER_MS) {
      console.log('ATLAS token expiring soon, refreshing proactively');
      this.refreshToken().catch(error => {
        console.error('Proactive token refresh failed:', error);
      });
    }

    return state.token.accessToken;
  }

  /**
   * Refresh the ATLAS access token
   * Requirements: 2.3
   * 
   * @returns Promise resolving to new ATLAS token
   */
  async refreshToken(): Promise<AtlasToken> {
    const state = this.authState$.value;

    if (!state.token?.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const baseUrl = this.configService.getBaseUrl();
      const endpoint = `${baseUrl}/auth/refresh`;

      const headers = new HttpHeaders({
        'Content-Type': 'application/json'
      });

      const body = {
        refresh_token: state.token.refreshToken
      };

      const response = await firstValueFrom(
        this.http.post<any>(endpoint, body, { headers })
      );

      const newToken: AtlasToken = {
        accessToken: response.access_token || response.accessToken,
        refreshToken: response.refresh_token || response.refreshToken || state.token.refreshToken,
        expiresAt: this.parseExpiryDate(response.expires_in || response.expiresIn),
        tokenType: response.token_type || response.tokenType || 'Bearer',
        scope: response.scope || state.token.scope
      };

      // Store refreshed token (Requirement 2.2)
      this.storeToken(newToken);

      // Schedule next refresh (Requirement 2.3)
      this.scheduleTokenRefresh(newToken);

      console.log('ATLAS token refreshed successfully');
      return newToken;
    } catch (error) {
      console.error('Failed to refresh ATLAS token:', error);
      // Clear token on refresh failure
      this.clearToken();
      throw new Error('Failed to refresh ATLAS access token');
    }
  }

  /**
   * Revoke the ATLAS token and clear session
   * Requirements: 2.6
   */
  async revokeToken(): Promise<void> {
    const state = this.authState$.value;

    if (state.token) {
      try {
        const baseUrl = this.configService.getBaseUrl();
        const endpoint = `${baseUrl}/auth/revoke`;

        const headers = new HttpHeaders({
          'Content-Type': 'application/json',
          'Authorization': `${state.token.tokenType} ${state.token.accessToken}`
        });

        await firstValueFrom(
          this.http.post(endpoint, {}, { headers })
        );

        console.log('ATLAS token revoked successfully');
      } catch (error) {
        console.error('Failed to revoke ATLAS token:', error);
        // Continue with local cleanup even if revocation fails
      }
    }

    // Clear local token storage (Requirement 2.6)
    this.clearToken();
  }

  /**
   * Store token securely in session storage
   * Requirements: 2.2, 12.1
   * 
   * @param token - ATLAS token to store
   */
  private storeToken(token: AtlasToken): void {
    try {
      // Use session storage for secure token storage (Requirement 2.2, 12.1)
      const tokenData = {
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        expiresAt: token.expiresAt.toISOString(),
        tokenType: token.tokenType,
        scope: token.scope
      };

      sessionStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(tokenData));

      // Generate and store session ID if not exists
      let sessionId = sessionStorage.getItem(this.SESSION_ID_KEY);
      if (!sessionId) {
        sessionId = this.generateSessionId();
        sessionStorage.setItem(this.SESSION_ID_KEY, sessionId);
      }

      // Update authentication state
      this.authState$.next({
        isAuthenticated: true,
        token: token,
        lastRefreshed: new Date(),
        sessionId: sessionId
      });

      console.log('ATLAS token stored securely in session storage');
    } catch (error) {
      console.error('Failed to store ATLAS token:', error);
      throw new Error('Failed to store ATLAS token securely');
    }
  }

  /**
   * Load token from session storage on initialization
   * Requirements: 2.2
   */
  private initializeFromStorage(): void {
    try {
      const tokenData = sessionStorage.getItem(this.SESSION_STORAGE_KEY);
      const sessionId = sessionStorage.getItem(this.SESSION_ID_KEY);

      if (!tokenData) {
        return;
      }

      const parsed = JSON.parse(tokenData);
      const token: AtlasToken = {
        accessToken: parsed.accessToken,
        refreshToken: parsed.refreshToken,
        expiresAt: new Date(parsed.expiresAt),
        tokenType: parsed.tokenType,
        scope: parsed.scope
      };

      // Check if token is still valid
      const now = new Date();
      if (token.expiresAt <= now) {
        console.warn('Stored ATLAS token is expired, clearing');
        this.clearToken();
        return;
      }

      // Restore authentication state
      this.authState$.next({
        isAuthenticated: true,
        token: token,
        lastRefreshed: new Date(),
        sessionId: sessionId
      });

      // Schedule automatic refresh (Requirement 2.3)
      this.scheduleTokenRefresh(token);

      console.log('ATLAS authentication state restored from session storage');
    } catch (error) {
      console.error('Failed to initialize ATLAS auth from storage:', error);
      this.clearToken();
    }
  }

  /**
   * Clear token from session storage
   * Requirements: 2.6
   */
  private clearToken(): void {
    // Clear refresh timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = undefined;
    }

    // Clear session storage (Requirement 2.6)
    sessionStorage.removeItem(this.SESSION_STORAGE_KEY);
    sessionStorage.removeItem(this.SESSION_ID_KEY);

    // Reset authentication state
    this.authState$.next({
      isAuthenticated: false,
      token: null,
      lastRefreshed: null,
      sessionId: null
    });

    console.log('ATLAS token cleared from session storage');
  }

  /**
   * Schedule automatic token refresh
   * Requirements: 2.3
   * 
   * @param token - Current ATLAS token
   */
  private scheduleTokenRefresh(token: AtlasToken): void {
    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    // Calculate time until refresh (refresh before expiry)
    const now = new Date();
    const timeUntilExpiry = token.expiresAt.getTime() - now.getTime();
    const refreshTime = Math.max(0, timeUntilExpiry - this.REFRESH_BUFFER_MS);

    console.log(`Scheduling ATLAS token refresh in ${Math.round(refreshTime / 1000)} seconds`);

    // Schedule refresh (Requirement 2.3)
    this.refreshTimer = window.setTimeout(async () => {
      try {
        await this.refreshToken();
      } catch (error) {
        console.error('Automatic token refresh failed:', error);
        this.clearToken();
      }
    }, refreshTime);
  }

  /**
   * Parse expiry date from expires_in seconds or ISO date string
   * 
   * @param expiresIn - Expiry time in seconds or ISO date string
   * @returns Expiry date
   */
  private parseExpiryDate(expiresIn: number | string): Date {
    if (typeof expiresIn === 'number') {
      // expires_in is in seconds
      return new Date(Date.now() + expiresIn * 1000);
    } else if (typeof expiresIn === 'string') {
      // Try to parse as ISO date
      return new Date(expiresIn);
    } else {
      // Default to 1 hour expiry
      return new Date(Date.now() + 3600 * 1000);
    }
  }

  /**
   * Generate a unique session ID
   * 
   * @returns Session ID string
   */
  private generateSessionId(): string {
    return 'atlas_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
  }
}
