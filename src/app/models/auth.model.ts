/**
 * Enhanced authentication models for secure authentication
 */

import { User } from './user.model';

export interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  expiresAt?: Date;
  error?: string;
  requiresPasswordChange?: boolean;
  sessionId?: string;
}

export interface SecureAuthState {
  isAuthenticated: boolean;
  user: User | null;
  tokenExpiresAt: Date | null;
  lastValidated: Date | null;
  sessionId: string | null;
  authMethod: AuthMethod;
}

export enum AuthMethod {
  HTTP_ONLY_COOKIES = 'HTTP_ONLY_COOKIES',
  SECURE_STORAGE = 'SECURE_STORAGE',
  SESSION_STORAGE = 'SESSION_STORAGE', // Fallback only
  MEMORY_ONLY = 'MEMORY_ONLY' // Most secure fallback
}

export interface SecureAuthConfig {
  useHttpOnlyCookies: boolean;
  tokenValidationInterval: number; // milliseconds
  sessionTimeoutWarning: number; // milliseconds before expiry to warn
  maxSessionDuration: number; // milliseconds
  enableAutoRefresh: boolean;
  secureStoragePrefix: string;
  /** Idle duration (ms) with no user activity before the session is terminated. */
  idleTimeout: number;
  /** How long (ms) before the idle timeout to show the countdown warning dialog. */
  idleWarningDuration: number;
  /** Minimum interval (ms) between recorded activity events, to throttle listeners. */
  activityThrottle: number;
}

/**
 * Reason a session warning / termination was raised.
 */
export enum SessionEndReason {
  /** User has been inactive for the configured idle period. */
  IDLE = 'IDLE',
  /** The auth token / backend session has expired (absolute lifetime reached). */
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  /** A persisted login was found but is stale (idle window elapsed while away). */
  STALE_LOGIN = 'STALE_LOGIN'
}

/**
 * Emitted while a session is about to end so the UI can warn the user and
 * optionally let them extend it.
 */
export interface SessionWarning {
  reason: SessionEndReason;
  /** Milliseconds remaining until the session is terminated automatically. */
  msUntilLogout: number;
  /** Whether the user is allowed to extend / keep the session alive. */
  canExtend: boolean;
}

export interface TokenValidationResult {
  isValid: boolean;
  expiresAt: Date | null;
  needsRefresh: boolean;
  error?: string;
}

export interface AuthError {
  type: AuthErrorType;
  message: string;
  timestamp: Date;
  recoverable: boolean;
  context?: Record<string, any>;
}

export enum AuthErrorType {
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  SESSION_TIMEOUT = 'SESSION_TIMEOUT',
  STORAGE_ERROR = 'STORAGE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}

export interface SessionInfo {
  sessionId: string;
  userId: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  isActive: boolean;
}

/**
 * Default secure authentication configuration
 */
export const DEFAULT_SECURE_AUTH_CONFIG: SecureAuthConfig = {
  useHttpOnlyCookies: true,
  tokenValidationInterval: 5 * 60 * 1000, // 5 minutes
  sessionTimeoutWarning: 10 * 60 * 1000, // 10 minutes before expiry
  maxSessionDuration: 8 * 60 * 60 * 1000, // 8 hours
  enableAutoRefresh: true,
  secureStoragePrefix: 'sri_secure_',
  idleTimeout: 30 * 60 * 1000, // 30 minutes of inactivity
  idleWarningDuration: 60 * 1000, // warn 60 seconds before logout
  activityThrottle: 1000 // record activity at most once per second
};

/**
 * Storage security levels (in order of preference)
 */
export const STORAGE_SECURITY_LEVELS = [
  AuthMethod.HTTP_ONLY_COOKIES,
  AuthMethod.SECURE_STORAGE,
  AuthMethod.MEMORY_ONLY,
  AuthMethod.SESSION_STORAGE // Last resort
] as const;