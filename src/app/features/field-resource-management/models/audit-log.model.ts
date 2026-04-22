export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  user: string;
  actionType: AuditActionType;
  entity: string;
  entityId: string;
  details: any;
  ipAddress: string;
  userAgent: string;
}

export type AuditActionType = 
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'ASSIGN'
  | 'REASSIGN'
  | 'STATUS_CHANGE'
  | 'CLOCK_IN'
  | 'CLOCK_OUT'
  | 'LOGIN'
  | 'LOGOUT'
  | 'CONFIG_CHANGE';

export interface AuditLogFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  user?: string;
  actionType?: AuditActionType;
  entity?: string;
}
