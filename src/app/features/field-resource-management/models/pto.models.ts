/**
 * PTO (Paid Time Off) Request Models
 *
 * Models, enums, DTOs, and constants for the PTO request management feature.
 */

/**
 * Status of a PTO request in the approval workflow
 */
export enum RequestStatus {
  Pending_Manager_Approval = 'Pending_Manager_Approval',
  Pending_Backoffice_Approval = 'Pending_Backoffice_Approval',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Cancelled = 'Cancelled'
}

/**
 * A category of time off available for selection
 */
export interface LeaveType {
  id: string;
  name: string;
  isPredefined: boolean;
  isActive: boolean;
}

/**
 * A PTO request submitted by an employee
 */
export interface PtoRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  managerId: string;
  managerName: string;
  startDate: string;
  endDate: string;
  requestType: string;
  reason: string | null;
  status: RequestStatus;
  totalDays?: number;
  approvalHistory?: ApprovalEntry[];
  createdAt: string;
  updatedAt: string;
}

/**
 * A record of a status change in the approval workflow
 */
export interface ApprovalEntry {
  id: string;
  requestId: string;
  action: ApprovalAction;
  performedBy: string;
  performedByName: string;
  performedAt: string;
  reason: string | null;
  fromStatus: RequestStatus;
  toStatus: RequestStatus;
}

/**
 * Actions that can be performed on a PTO request
 */
export type ApprovalAction =
  | 'submitted'
  | 'manager_approved'
  | 'manager_rejected'
  | 'backoffice_approved'
  | 'backoffice_rejected'
  | 'cancelled';

/**
 * Roles that interact with the PTO workflow
 */
export type UserRole = 'employee' | 'manager' | 'backoffice';

/**
 * DTO for creating a new PTO request
 */
export interface CreatePtoRequestDto {
  employeeId: string;
  startDate: string;
  endDate: string;
  requestType: string;
  reason?: string;
}

/**
 * DTO for rejecting a PTO request
 */
export interface RejectPtoRequestDto {
  reason: string;
}

/**
 * Result of a validation check
 */
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Valid status transitions for the PTO workflow state machine.
 * Terminal statuses (Approved, Rejected, Cancelled) have no valid transitions.
 */
export const VALID_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  [RequestStatus.Pending_Manager_Approval]: [
    RequestStatus.Pending_Backoffice_Approval,
    RequestStatus.Rejected,
    RequestStatus.Cancelled
  ],
  [RequestStatus.Pending_Backoffice_Approval]: [
    RequestStatus.Approved,
    RequestStatus.Rejected,
    RequestStatus.Cancelled
  ],
  [RequestStatus.Approved]: [],
  [RequestStatus.Rejected]: [],
  [RequestStatus.Cancelled]: []
};

/**
 * Predefined leave types available in all configurations
 */
export const PREDEFINED_LEAVE_TYPES: LeaveType[] = [
  { id: 'vacation', name: 'Vacation', isPredefined: true, isActive: true },
  { id: 'sick-leave', name: 'Sick Leave', isPredefined: true, isActive: true },
  { id: 'personal-day', name: 'Personal Day', isPredefined: true, isActive: true },
  { id: 'bereavement', name: 'Bereavement', isPredefined: true, isActive: true },
  { id: 'jury-duty', name: 'Jury Duty', isPredefined: true, isActive: true }
];
