/**
 * Reporting State Interface
 * Defines the shape of the reporting state slice in the NgRx store
 */

import { DashboardMetrics, UtilizationReport, PerformanceReport, KPI } from '../../models/reporting.model';
import { DateRange } from '../../models/assignment.model';

export interface ReportingState {
  dashboard: DashboardMetrics | null;
  utilization: UtilizationReport | null;
  performance: PerformanceReport | null;
  kpis: KPI[];
  dateRange: DateRange | null;
  loading: boolean;
  error: string | null;
}
