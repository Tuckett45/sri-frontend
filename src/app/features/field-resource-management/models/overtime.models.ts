/**
 * Overtime Request Models
 *
 * Models, enums, DTOs, and constants for the Overtime request management feature.
 * Based on the SRI Employee Overtime Request Form.
 */

/**
 * Status of an overtime request in the approval workflow
 */
export enum OvertimeRequestStatus {
  Pending_Manager_Approval = 'Pending_Manager_Approval',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Cancelled = 'Cancelled'
}

/**
 * Markets supported by the organization
 */
export enum SupportedMarket {
  Utah = 'Utah',
  Texas = 'Texas',
  Arizona = 'Arizona',
  Nevada = 'Nevada',
  Regional = 'Regional',
  Tennessee = 'Tennessee',
  Georgia = 'Georgia',
  California = 'California',
  Expansion = 'Expansion',
  Colorado = 'Colorado'
}

/**
 * Departments available for selection
 */
export enum Department {
  Construction = 'Construction',
  Engineering = 'Engineering',
  Operations = 'Operations',
  Sales = 'Sales',
  CustomerService = 'Customer Service',
  Warehouse = 'Warehouse',
  Administration = 'Administration',
  Finance = 'Finance',
  IT = 'IT',
  HumanResources = 'Human Resources'
}

/**
 * Duration representation for overtime (hours and minutes)
 */
export interface OvertimeDuration {
  hours: number;
  minutes: number;
}

/**
 * An overtime request submitted by an employee
 */
export interface OvertimeRequest {
  id: string;
  employeeId: string;
  employeeFullName: string;
  department: string;
  market: SupportedMarket;
  emailedSriLead: boolean;
  sriLeadName: string;
  approvalStatus: OvertimeRequestStatus;
  submissionDate: string;
  overtimeStartDate: string;
  estimatedHours: number;
  estimatedMinutes: number;
  estimatedDuration: OvertimeDuration;
  justification: string;
  managerId: string;
  managerName: string;
  approvalHistory: OvertimeApprovalEntry[];
  createdAt: string;
  updatedAt: string;
}

/**
 * A record of a status change in the overtime approval workflow
 */
export interface OvertimeApprovalEntry {
  id: string;
  requestId: string;
  action: OvertimeApprovalAction;
  performedBy: string;
  performedByName: string;
  performedAt: string;
  reason: string | null;
  fromStatus: OvertimeRequestStatus;
  toStatus: OvertimeRequestStatus;
}

/**
 * Actions that can be performed on an overtime request
 */
export type OvertimeApprovalAction =
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'cancelled';

/**
 * DTO for creating a new overtime request
 * NOTE: Backend expects flat estimatedHours/estimatedMinutes, not a nested object
 */
export interface CreateOvertimeRequestDto {
  employeeFullName: string;
  department: string;
  market: SupportedMarket;
  emailedSriLead: boolean;
  sriLeadName: string;
  isPreApproved: boolean;
  submissionDate: string;
  overtimeStartDate: string;
  estimatedHours: number;
  estimatedMinutes: number;
  justification: string;
}

/**
 * DTO for rejecting an overtime request
 */
export interface RejectOvertimeRequestDto {
  reason: string;
}

/**
 * Valid status transitions for the overtime workflow state machine
 */
export const OVERTIME_VALID_TRANSITIONS: Record<OvertimeRequestStatus, OvertimeRequestStatus[]> = {
  [OvertimeRequestStatus.Pending_Manager_Approval]: [
    OvertimeRequestStatus.Approved,
    OvertimeRequestStatus.Rejected,
    OvertimeRequestStatus.Cancelled
  ],
  [OvertimeRequestStatus.Approved]: [],
  [OvertimeRequestStatus.Rejected]: [],
  [OvertimeRequestStatus.Cancelled]: []
};

/**
 * List of supported markets for form selection
 */
export const SUPPORTED_MARKETS: { value: SupportedMarket; label: string }[] = [
  { value: SupportedMarket.Utah, label: 'Utah' },
  { value: SupportedMarket.Texas, label: 'Texas' },
  { value: SupportedMarket.Arizona, label: 'Arizona' },
  { value: SupportedMarket.Nevada, label: 'Nevada' },
  { value: SupportedMarket.Regional, label: 'Regional' },
  { value: SupportedMarket.Tennessee, label: 'Tennessee' },
  { value: SupportedMarket.Georgia, label: 'Georgia' },
  { value: SupportedMarket.California, label: 'California' },
  { value: SupportedMarket.Expansion, label: 'Expansion' },
  { value: SupportedMarket.Colorado, label: 'Colorado' }
];

/**
 * List of departments for form selection
 */
export const DEPARTMENTS: { value: string; label: string }[] = [
  { value: Department.Construction, label: 'Construction' },
  { value: Department.Engineering, label: 'Engineering' },
  { value: Department.Operations, label: 'Operations' },
  { value: Department.Sales, label: 'Sales' },
  { value: Department.CustomerService, label: 'Customer Service' },
  { value: Department.Warehouse, label: 'Warehouse' },
  { value: Department.Administration, label: 'Administration' },
  { value: Department.Finance, label: 'Finance' },
  { value: Department.IT, label: 'IT' },
  { value: Department.HumanResources, label: 'Human Resources' }
];
