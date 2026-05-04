import { UserRole } from '../../../models/role.enum';

/** Quick action button configuration */
export interface QuickAction {
  label: string;
  icon: string;
  route?: string;
  action?: string;
  color: 'primary' | 'accent' | 'orange' | 'green';
  visible: boolean;
}

/** KPI display item */
export interface KpiItem {
  label: string;
  value: number | string;
  icon: string;
  trend?: 'positive' | 'negative' | 'neutral';
  color: 'primary' | 'success' | 'accent';
}

/** Approval counts for HR/Payroll dashboard */
export interface ApprovalCounts {
  pendingTimecards: number;
  pendingExpenses: number;
  pendingTravelRequests: number;
  pendingBreakRequests: number;
}

/** Pending timecard for review */
export interface PendingTimecard {
  id: string;
  technicianName: string;
  periodStart: Date;
  periodEnd: Date;
  totalHours: number;
  submittedAt: Date;
  status: string;
}

/** Pending expense for review */
export interface PendingExpense {
  id: string;
  submittedBy: string;
  amount: number;
  type: string;
  submittedAt: Date;
  description: string;
}

/** Travel/Break/PTO summary */
export interface TravelBreakPtoSummary {
  pendingTravelRequests: number;
  pendingBreakRequests: number;
  pendingPtoRequests: number;
}

/** Generic widget state wrapper */
export interface WidgetState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/** Role-to-dashboard mapping type */
export type DashboardView = 'technician' | 'admin' | 'cm' | 'hr-payroll' | 'default';

/** Returns true for field technician roles: Technician, DeploymentEngineer, SRITech */
export function isFieldRole(role: UserRole | null | undefined): boolean {
  return role === UserRole.Technician
    || role === UserRole.DeploymentEngineer
    || role === UserRole.SRITech;
}

/** Returns true for HR/Payroll roles: HR, Payroll */
export function isHrPayrollRole(role: UserRole | null | undefined): boolean {
  return role === UserRole.HR || role === UserRole.Payroll;
}

/** Maps a UserRole to the corresponding DashboardView */
export function resolveDashboardView(role: UserRole | null | undefined): DashboardView {
  if (role == null) return 'default';
  switch (role) {
    case UserRole.Technician:
    case UserRole.DeploymentEngineer:
    case UserRole.SRITech:
      return 'technician';
    case UserRole.Admin:
      return 'admin';
    case UserRole.CM:
      return 'cm';
    case UserRole.HR:
    case UserRole.Payroll:
      return 'hr-payroll';
    default:
      return 'default';
  }
}
