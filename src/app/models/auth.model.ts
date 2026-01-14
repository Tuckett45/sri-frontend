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
  secureStoragePrefix: 'sri_secure_'
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