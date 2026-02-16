/**
 * Reporting State Interface
 * Defines the shape of the reporting state slice in the NgRx store
 */

import { DashboardMetrics, UtilizationReport, PerformanceReport, KPI } from '../../models/reporting.model';

export interface ReportingState {
  dashboard: DashboardMetrics | null;
  utilization: UtilizationReport | null;
  performance: PerformanceReport | null;
  kpis: KPI[];
  loading: boolean;
  error: string | null;
}
