import { Injectable } from '@angular/core';

/**
 * Authentication Token Service
 * 
 * Manages JWT token storage and retrieval.
 * Provides secure token handling with sessionStorage.
 * 
 * Note: HttpOnly cookies are preferred for production but require backend support.
 * This implementation uses sessionStorage as a fallback.
 * 
 * Requirements: 1.1-1.5
 */
@Injectable({
  providedIn: 'root'
})
export class AuthTokenService {
  private readonly TOKEN_KEY = 'frm_auth_token';
  private readonly REFRESH_TOKEN_KEY = 'frm_refresh_token';
  private readonly TOKEN_EXPIRY_KEY = 'frm_token_expiry';

  constructor() {}

  /**
   * Store authentication token securely
   * Uses sessionStorage for security (cleared when browser closes)
   * 
   * @param token - JWT access token
   * @param refreshToken - JWT refresh token (optional)
   * @param expiresIn - Token expiration time in seconds
   */
  setToken(token: string, refreshToken?: string, expiresIn?: number): void {
    try {
      sessionStorage.setItem(this.TOKEN_KEY, token);
      
      if (refreshToken) {
        sessionStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
      }

      if (expiresIn) {
        const expiryTime = Date.now() + (expiresIn * 1000);
        sessionStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString());
      }
    } catch (error) {
      console.error('Failed to store token:', error);
    }
  }

  /**
   * Get authentication token
   * 
   * @returns JWT access token or null if not found
   */
  getToken(): string | null {
    try {
      return sessionStorage.getItem(this.TOKEN_KEY);
    } catch (error) {
      console.error('Failed to retrieve token:', error);
      return null;
    }
  }

  /**
   * Get refresh token
   * 
   * @returns JWT refresh token or null if not found
   */
  getRefreshToken(): string | null {
    try {
      return sessionStorage.getItem(this.REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to retrieve refresh token:', error);
      return null;
    }
  }

  /**
   * Check if token exists
   * 
   * @returns True if token exists
   */
  hasToken(): boolean {
    return this.getToken() !== null;
  }

  /**
   * Check if token is expired
   * 
   * @returns True if token is expired
   */
  isTokenExpired(): boolean {
    try {
      const expiryTime = sessionStorage.getItem(this.TOKEN_EXPIRY_KEY);
      
      if (!expiryTime) {
        // If no expiry time stored, check token payload
        return this.isTokenExpiredFromPayload();
      }

      return Date.now() >= parseInt(expiryTime, 10);
    } catch (error) {
      console.error('Failed to check token expiration:', error);
      return true;
    }
  }

  /**
   * Check if token is expired by decoding JWT payload
   * 
   * @returns True if token is expired
   */
  private isTokenExpiredFromPayload(): boolean {
    const token = this.getToken();
    
    if (!token) {
      return true;
    }

    try {
      const payload = this.decodeToken(token);
      
      if (!payload || !payload.exp) {
        return false; // Can't determine, assume not expired
      }

      // JWT exp is in seconds, Date.now() is in milliseconds
      return Date.now() >= payload.exp * 1000;
    } catch (error) {
      console.error('Failed to decode token:', error);
      return true;
    }
  }

  /**
   * Decode JWT token payload
   * 
   * @param token - JWT token to decode
   * @returns Decoded payload or null
   */
  private decodeToken(token: string): any {
    try {
      const parts = token.split('.');
      
      if (parts.length !== 3) {
        return null;
      }

      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch (error) {
      console.error('Failed to decode token:', error);
      return null;
    }
  }

  /**
   * Get token expiration time
   * 
   * @returns Expiration time as Date or null
   */
  getTokenExpiry(): Date | null {
    try {
      const expiryTime = sessionStorage.getItem(this.TOKEN_EXPIRY_KEY);
      
      if (expiryTime) {
        return new Date(parseInt(expiryTime, 10));
      }

      // Try to get from token payload
      const token = this.getToken();
      if (token) {
        const payload = this.decodeToken(token);
        if (payload && payload.exp) {
          return new Date(payload.exp * 1000);
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to get token expiry:', error);
      return null;
    }
  }

  /**
   * Clear all authentication tokens
   * Call this on logout
   */
  clearTokens(): void {
    try {
      sessionStorage.removeItem(this.TOKEN_KEY);
      sessionStorage.removeItem(this.REFRESH_TOKEN_KEY);
      sessionStorage.removeItem(this.TOKEN_EXPIRY_KEY);
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }

  /**
   * Get user information from token
   * 
   * @returns User info from token payload or null
   */
  getUserFromToken(): any {
    const token = this.getToken();
    
    if (!token) {
      return null;
    }

    try {
      const payload = this.decodeToken(token);
      return payload;
    } catch (error) {
      console.error('Failed to get user from token:', error);
      return null;
    }
  }

  /**
   * Check if user has specific role
   * 
   * @param role - Role to check
   * @returns True if user has the role
   */
  hasRole(role: string): boolean {
    const user = this.getUserFromToken();
    
    if (!user || !user.role) {
      return false;
    }

    if (Array.isArray(user.role)) {
      return user.role.includes(role);
    }

    return user.role === role;
  }

  /**
   * Get time until token expires in milliseconds
   * 
   * @returns Milliseconds until expiration or 0 if expired
   */
  getTimeUntilExpiry(): number {
    const expiry = this.getTokenExpiry();
    
    if (!expiry) {
      return 0;
    }

    const timeUntilExpiry = expiry.getTime() - Date.now();
    return Math.max(0, timeUntilExpiry);
  }

  /**
   * Check if token will expire soon (within 5 minutes)
   * 
   * @returns True if token expires within 5 minutes
   */
  isTokenExpiringSoon(): boolean {
    const timeUntilExpiry = this.getTimeUntilExpiry();
    const fiveMinutes = 5 * 60 * 1000;
    return timeUntilExpiry > 0 && timeUntilExpiry < fiveMinutes;
  }
}
