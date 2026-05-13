import { DateRange } from '../features/field-resource-management/models/assignment.model';

/**
 * Project status report data
 */
export interface ProjectStatusReport {
  reportId: string;
  generatedAt: Date;
  dateRange: DateRange;
  market?: string;
  projects: ProjectStatus[];
  summary: ProjectSummary;
}

export interface ProjectStatus {
  projectId: string;
  projectName: string;
  market: string;
  status: 'active' | 'completed' | 'on_hold' | 'cancelled';
  progress: number;
  startDate: Date;
  endDate?: Date;
  assignedTechnicians: number;
  completedTasks: number;
  totalTasks: number;
  budget: number;
  actualCost: number;
}

export interface ProjectSummary {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  averageProgress: number;
  totalBudget: number;
  totalActualCost: number;
}

/**
 * Technician performance metrics
 */
export interface TechnicianPerformanceMetrics {
  reportId: string;
  generatedAt: Date;
  dateRange: DateRange;
  market?: string;
  technicians: TechnicianPerformance[];
  summary: PerformanceSummary;
}

export interface TechnicianPerformance {
  technicianId: string;
  technicianName: string;
  market: string;
  completedJobs: number;
  totalHours: number;
  utilizationRate: number;
  averageJobDuration: number;
  onTimeCompletionRate: number;
  customerRating: number;
  certifications: string[];
}

export interface PerformanceSummary {
  totalTechnicians: number;
  averageUtilization: number;
  averageOnTimeRate: number;
  averageCustomerRating: number;
  totalHoursWorked: number;
}

/**
 * Time and billing report
 */
export interface TimeBillingReport {
  reportId: string;
  generatedAt: Date;
  dateRange: DateRange;
  market?: string;
  entries: BillingEntry[];
  summary: BillingSummary;
}

export interface BillingEntry {
  entryId: string;
  projectId: string;
  projectName: string;
  technicianId: string;
  technicianName: string;
  market: string;
  date: Date;
  hours: number;
  hourlyRate: number;
  totalAmount: number;
  billable: boolean;
  approved: boolean;
}

export interface BillingSummary {
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  totalRevenue: number;
  approvedRevenue: number;
  pendingRevenue: number;
}

/**
 * Trend analysis data
 */
export interface TrendAnalysis {
  reportId: string;
  generatedAt: Date;
  dateRange: DateRange;
  market?: string;
  metric: string;
  dataPoints: TrendDataPoint[];
  insights: TrendInsight[];
}

export interface TrendDataPoint {
  date: Date;
  value: number;
  label?: string;
}

export interface TrendInsight {
  type: 'increase' | 'decrease' | 'stable' | 'anomaly';
  description: string;
  percentage?: number;
  significance: 'high' | 'medium' | 'low';
}

/**
 * Recurring report configuration
 */
export interface RecurringReportConfig {
  id: string;
  reportType: ReportType;
  name: string;
  description?: string;
  schedule: ReportSchedule;
  filters: ReportFilters;
  recipients: string[];
  format: 'pdf' | 'csv' | 'excel';
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  lastRun?: Date;
  nextRun?: Date;
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  time: string; // HH:mm format
  timezone: string;
}

export interface ReportFilters {
  dateRange?: DateRange;
  market?: string;
  projectId?: string;
  technicianId?: string;
  status?: string;
  [key: string]: any;
}

/**
 * Comparative analytics for Admin
 */
export interface ComparativeAnalytics {
  reportId: string;
  generatedAt: Date;
  dateRange: DateRange;
  markets: MarketComparison[];
  summary: ComparativeSummary;
}

export interface MarketComparison {
  market: string;
  activeProjects: number;
  totalTechnicians: number;
  utilizationRate: number;
  revenue: number;
  customerSatisfaction: number;
  onTimeCompletionRate: number;
  rank: number;
}

export interface ComparativeSummary {
  totalMarkets: number;
  bestPerformingMarket: string;
  worstPerformingMarket: string;
  averageUtilization: number;
  totalRevenue: number;
  recommendations: string[];
}

/**
 * Report types
 */
export enum ReportType {
  ProjectStatus = 'project_status',
  TechnicianPerformance = 'technician_performance',
  TimeBilling = 'time_billing',
  TrendAnalysis = 'trend_analysis',
  ComparativeAnalytics = 'comparative_analytics'
}

/**
 * Data export request
 */
export interface DataExportRequest {
  dataType: string;
  filters: ReportFilters;
  format: 'csv' | 'excel' | 'json';
  includeHeaders: boolean;
  columns?: string[];
}

/**
 * Data export response
 */
export interface DataExportResponse {
  exportId: string;
  fileName: string;
  fileSize: number;
  downloadUrl: string;
  expiresAt: Date;
}

/**
 * Custom report builder configuration (Admin only)
 */
export interface CustomReportConfig {
  id?: string;
  name: string;
  description?: string;
  dataSource: string;
  columns: ReportColumn[];
  filters: ReportFilters;
  groupBy?: string[];
  sortBy?: ReportSort[];
  aggregations?: ReportAggregation[];
  createdBy?: string;
  createdAt?: Date;
  isPublic?: boolean;
}

export interface ReportColumn {
  field: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  format?: string;
  visible: boolean;
}

export interface ReportSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface ReportAggregation {
  field: string;
  function: 'sum' | 'avg' | 'min' | 'max' | 'count';
  label: string;
}
