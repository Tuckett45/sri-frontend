import { UserRole } from './role.enum';
import { User } from './user.model';

export interface UserManagementFilters {
  role?: UserRole;
  market?: string;
  isApproved?: boolean;
  searchTerm?: string;
}

export interface UserUpdateRequest {
  userId: string;
  updates: Partial<User>;
  reason?: string;
}

export interface BulkUserOperation {
  operation: 'activate' | 'deactivate' | 'change_role' | 'change_market';
  userIds: string[];
  newValue?: any;
  reason: string;
}

export interface BulkOperationResult {
  successCount: number;
  failureCount: number;
  errors: Array<{ userId: string; error: string }>;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  performedBy: string;
  timestamp: Date;
  details: Record<string, any>;
  reason?: string;
}

export interface PasswordResetResponse {
  temporaryPassword: string;
  expiresAt: Date;
}
