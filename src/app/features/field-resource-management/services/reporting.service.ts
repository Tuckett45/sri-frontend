import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, retry, map } from 'rxjs/operators';
import { 
  DashboardMetrics, 
  UtilizationReport, 
  PerformanceReport, 
  KPI,
  KPIMetrics,
  TechnicianUtilization,
  TechnicianPerformance,
  JobCostBreakdown,
  BudgetComparison,
  LaborCosts,
  MaterialCosts,
  TravelCosts,
  TechnicianLaborCost,
  MaterialCostItem,
  TechnicianTravelCost,
  BudgetVarianceReport,
  TravelCostReport,
  MaterialUsageReport
} from '../models/reporting.model';
import { DateRange, Assignment } from '../models/assignment.model';
import { TechnicianRole, Technician } from '../models/technician.model';
import { JobType, Priority, Job, JobStatus } from '../models/job.model';
import { JobBudget, BudgetStatus } from '../models/budget.model';
import { CacheService } from './cache.service';
import { DataScope } from './data-scope.service';
import { environment } from '../../../../environments/environments';

/**
 * Export format options
 */
export enum ExportFormat {
  CSV = 'csv',
  PDF = 'pdf'
}

/**
 * Report type options
 */
export enum ReportType {
  Utilization = 'utilization',
  Performance = 'performance',
  Dashboard = 'dashboard',
  ScheduleAdherence = 'schedule-adherence'
}

/**
 * Filters for utilization reports
 */
export interface UtilizationFilters {
  dateRange: DateRange;
  technicianId?: string;
  role?: TechnicianRole;
  region?: string;
}

/**
 * Filters for performance reports
 */
export interface PerformanceFilters {
  dateRange: DateRange;
  jobType?: JobType;
  priority?: Priority;
  client?: string;
  region?: string;
}

/**
 * Schedule adherence metrics
 */
export interface AdherenceMetrics {
  dateRange: DateRange;
  totalJobs: number;
  onTimeJobs: number;
  lateJobs: number;
  adherencePercentage: number;
  averageDelay: number;
}

/**
 * Service for managing reporting and analytics operations
 * Handles HTTP communication with the backend API for reporting-related operations
 * 
 * Caching Strategy:
 * - Dashboard metrics: 5 minute TTL
 * - Reports: 1 minute TTL
 * - KPIs: 5 minute TTL
 * 
 * Cache is automatically invalidated when data changes.
 */
@Injectable({
  providedIn: 'root'
})
export class ReportingService {
  private readonly apiUrl = `${environment.apiUrl}/reports`;
  private readonly retryCount = 2;

  // Cache TTL constants (in milliseconds)
  private readonly DASHBOARD_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly REPORT_CACHE_TTL = 1 * 60 * 1000;    // 1 minute
  private readonly KPI_CACHE_TTL = 5 * 60 * 1000;       // 5 minutes

  constructor(
    private http: HttpClient,
    private cacheService: CacheService
  ) {}

  /**
   * Retrieves dashboard metrics including KPIs and summary data
   * Cached for 5 minutes
   * @returns Observable of dashboard metrics
   */
  getDashboardMetrics(): Observable<DashboardMetrics> {
    return this.cacheService.get(
      'dashboard-metrics',
      () => this.http.get<DashboardMetrics>(`${this.apiUrl}/dashboard`)
        .pipe(
          retry(this.retryCount),
          catchError(this.handleError)
        ),
      this.DASHBOARD_CACHE_TTL
    );
  }

  /**
   * Retrieves technician utilization report with filters
   * Cached for 1 minute per unique filter combination
   * @param filters Utilization report filters
   * @returns Observable of utilization report
   */
  getTechnicianUtilization(filters: UtilizationFilters): Observable<UtilizationReport> {
    const cacheKey = `utilization-${JSON.stringify(filters)}`;
    
    return this.cacheService.get(
      cacheKey,
      () => {
        let params = new HttpParams()
          .set('startDate', filters.dateRange.startDate.toISOString())
          .set('endDate', filters.dateRange.endDate.toISOString());

        if (filters.technicianId) {
          params = params.set('technicianId', filters.technicianId);
        }
        if (filters.role) {
          params = params.set('role', filters.role);
        }
        if (filters.region) {
          params = params.set('region', filters.region);
        }

        return this.http.get<UtilizationReport>(`${this.apiUrl}/utilization`, { params })
          .pipe(
            retry(this.retryCount),
            catchError(this.handleError)
          );
      },
      this.REPORT_CACHE_TTL
    );
  }

  /**
   * Retrieves job performance report with filters
   * Cached for 1 minute per unique filter combination
   * @param filters Performance report filters
   * @returns Observable of performance report
   */
  getJobPerformance(filters: PerformanceFilters): Observable<PerformanceReport> {
    const cacheKey = `performance-${JSON.stringify(filters)}`;
    
    return this.cacheService.get(
      cacheKey,
      () => {
        let params = new HttpParams()
          .set('startDate', filters.dateRange.startDate.toISOString())
          .set('endDate', filters.dateRange.endDate.toISOString());

        if (filters.jobType) {
          params = params.set('jobType', filters.jobType);
        }
        if (filters.priority) {
          params = params.set('priority', filters.priority);
        }
        if (filters.client) {
          params = params.set('client', filters.client);
        }
        if (filters.region) {
          params = params.set('region', filters.region);
        }

        return this.http.get<PerformanceReport>(`${this.apiUrl}/performance`, { params })
          .pipe(
            retry(this.retryCount),
            catchError(this.handleError)
          );
      },
      this.REPORT_CACHE_TTL
    );
  }

  /**
   * Retrieves key performance indicators
   * Cached for 5 minutes
   * @returns Observable of KPI array
   */
  getKPIs(): Observable<KPI[]> {
    return this.cacheService.get(
      'kpis',
      () => this.http.get<KPI[]>(`${this.apiUrl}/kpis`)
        .pipe(
          retry(this.retryCount),
          catchError(this.handleError)
        ),
      this.KPI_CACHE_TTL
    );
  }

  /**
   * Exports a report in the specified format
   * @param reportType Type of report to export
   * @param filters Report-specific filters
   * @param format Export format (CSV or PDF)
   * @returns Observable of Blob containing the exported file
   */
  exportReport(reportType: ReportType, filters: any, format: ExportFormat): Observable<Blob> {
    let params = new HttpParams().set('format', format);

    // Add filters to params based on report type
    if (filters.dateRange) {
      params = params.set('startDate', filters.dateRange.startDate.toISOString());
      params = params.set('endDate', filters.dateRange.endDate.toISOString());
    }

    // Add additional filters
    Object.keys(filters).forEach(key => {
      if (key !== 'dateRange' && filters[key] !== undefined && filters[key] !== null) {
        params = params.set(key, filters[key].toString());
      }
    });

    return this.http.get(`${this.apiUrl}/export/${reportType}`, {
      params,
      responseType: 'blob'
    })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Retrieves schedule adherence metrics for a date range
   * @param dateRange Date range to analyze
   * @returns Observable of adherence metrics
   */
  getScheduleAdherence(dateRange: DateRange): Observable<AdherenceMetrics> {
    const params = new HttpParams()
      .set('startDate', dateRange.startDate.toISOString())
      .set('endDate', dateRange.endDate.toISOString());

    return this.http.get<AdherenceMetrics>(`${this.apiUrl}/schedule-adherence`, { params })
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Handles HTTP errors
   * @param error HTTP error response
   * @returns Observable error
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      
      // Provide more specific error messages based on status code
      switch (error.status) {
        case 400:
          errorMessage = 'Invalid request. Please check your input.';
          break;
        case 401:
          errorMessage = 'Unauthorized. Please log in.';
          break;
        case 403:
          errorMessage = 'Access denied. You do not have permission to view reports.';
          break;
        case 404:
          errorMessage = 'Report not found.';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later.';
          break;
        case 503:
          errorMessage = 'Report generation service unavailable. Please try again later.';
          break;
      }
    }
    
    console.error(errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }

  /**
   * Generate performance report from jobs, technicians, and assignments data
   * 
   * This function performs client-side calculation of job performance metrics
   * based on the provided jobs, technicians, and assignments within a specified date range.
   * 
   * FORMAL SPECIFICATIONS:
   * 
   * Preconditions:
   * - jobs is a valid array of Job objects (may be empty)
   * - technicians is a valid array of Technician objects (may be empty)
   * - assignments is a valid array of Assignment objects (may be empty)
   * - dateRange.startDate is before or equal to dateRange.endDate
   * - All jobs, technicians, and assignments are already filtered by user's data scope
   * 
   * Postconditions:
   * - Returns PerformanceReport object with calculated values
   * - All percentage values are between 0 and 100
   * - All count values are non-negative integers
   * - All hour values are non-negative
   * - Calculations are based only on data within dateRange
   * - If no data exists for dateRange, returns report with zero values
   * - Original input arrays are not mutated
   * - topPerformers array is sorted by jobsCompleted descending
   * - scheduleAdherence is the percentage of jobs completed on time
   * 
   * Loop Invariants:
   * - When iterating through jobs: all processed jobs have been categorized correctly
   * - When calculating technician performance: all metrics are non-negative
   * - All intermediate calculations maintain numerical precision
   * 
   * @param jobs - Array of Job objects to analyze
   * @param technicians - Array of Technician objects to analyze
   * @param assignments - Array of Assignment objects linking technicians to jobs
   * @param dateRange - Date range for filtering jobs
   * @returns PerformanceReport object with job performance data
   */
  generatePerformanceReport(
    jobs: Job[],
    technicians: Technician[],
    assignments: Assignment[],
    dateRange: DateRange
  ): PerformanceReport {
    // Validate preconditions
    if (!jobs || !Array.isArray(jobs)) {
      throw new Error('jobs must be a valid array');
    }
    if (!technicians || !Array.isArray(technicians)) {
      throw new Error('technicians must be a valid array');
    }
    if (!assignments || !Array.isArray(assignments)) {
      throw new Error('assignments must be a valid array');
    }
    if (!dateRange || !dateRange.startDate || !dateRange.endDate) {
      throw new Error('dateRange must have valid startDate and endDate');
    }
    if (dateRange.startDate > dateRange.endDate) {
      throw new Error('dateRange.startDate must be before or equal to dateRange.endDate');
    }

    // Filter jobs within date range
    const jobsInRange = this.filterJobsByDateRange(jobs, dateRange);

    // Create a map of jobs by ID for quick lookup
    const jobsById = new Map<string, Job>();
    jobsInRange.forEach(job => jobsById.set(job.id, job));

    // Initialize counters (Loop Invariant: all counters start at 0)
    let totalJobsCompleted = 0;
    let totalJobsOpen = 0;
    let totalLaborHours = 0;
    let completedJobsCount = 0;
    let onTimeCompletions = 0;
    const jobsByType: Record<JobType, number> = {} as Record<JobType, number>;

    // Initialize all job types to 0
    Object.values(JobType).forEach(type => {
      jobsByType[type] = 0;
    });

    // Calculate job metrics (Loop Invariant: running totals are accurate)
    for (const job of jobsInRange) {
      // Count by type
      if (job.jobType) {
        jobsByType[job.jobType] = (jobsByType[job.jobType] || 0) + 1;
      }

      // Count by status
      if (job.status === JobStatus.Completed) {
        totalJobsCompleted++;
        completedJobsCount++;

        // Calculate labor hours for completed jobs
        if (job.actualStartDate && job.actualEndDate) {
          const jobHours = this.calculateJobDuration(job);
          totalLaborHours += jobHours;

          // Check if completed on time
          if (job.scheduledEndDate && job.actualEndDate <= job.scheduledEndDate) {
            onTimeCompletions++;
          }
        }
      } else if (job.status !== JobStatus.Cancelled) {
        // Count non-cancelled, non-completed jobs as open
        totalJobsOpen++;
      }
    }

    // Calculate average labor hours
    const averageLaborHours = completedJobsCount > 0 
      ? totalLaborHours / completedJobsCount 
      : 0;

    // Calculate schedule adherence (percentage of completed jobs that were on time)
    const scheduleAdherence = completedJobsCount > 0 
      ? (onTimeCompletions / completedJobsCount) * 100 
      : 0;

    // Calculate technician performance metrics
    const technicianPerformanceMap = new Map<string, {
      jobsCompleted: number;
      totalHours: number;
      onTimeCount: number;
    }>();

    // Initialize performance data for all technicians
    technicians.forEach(tech => {
      technicianPerformanceMap.set(tech.id, {
        jobsCompleted: 0,
        totalHours: 0,
        onTimeCount: 0
      });
    });

    // Filter active assignments for jobs in range
    const activeAssignments = assignments.filter(a => 
      a.isActive && jobsById.has(a.jobId)
    );

    // Loop Invariant: all metrics are non-negative
    for (const assignment of activeAssignments) {
      const job = jobsById.get(assignment.jobId);
      
      if (job && job.status === JobStatus.Completed) {
        const perfData = technicianPerformanceMap.get(assignment.technicianId);
        
        if (perfData) {
          perfData.jobsCompleted++;

          // Add hours for this job
          if (job.actualStartDate && job.actualEndDate) {
            const jobHours = this.calculateJobDuration(job);
            perfData.totalHours += jobHours;

            // Check if on time
            if (job.scheduledEndDate && job.actualEndDate <= job.scheduledEndDate) {
              perfData.onTimeCount++;
            }
          }
        }
      }
    }

    // Build technician performance array
    const topPerformers: TechnicianPerformance[] = [];

    for (const technician of technicians) {
      const perfData = technicianPerformanceMap.get(technician.id);
      
      if (perfData && perfData.jobsCompleted > 0) {
        const averageJobDuration = perfData.totalHours / perfData.jobsCompleted;
        const onTimeCompletionRate = (perfData.onTimeCount / perfData.jobsCompleted) * 100;

        topPerformers.push({
          technician,
          jobsCompleted: Math.max(0, perfData.jobsCompleted),
          totalHours: Math.max(0, perfData.totalHours),
          averageJobDuration: Math.max(0, averageJobDuration),
          onTimeCompletionRate: Math.min(100, Math.max(0, onTimeCompletionRate))
        });
      }
    }

    // Sort top performers by jobs completed (descending)
    topPerformers.sort((a, b) => b.jobsCompleted - a.jobsCompleted);

    // Ensure all postconditions are met
    const report: PerformanceReport = {
      dateRange,
      totalJobsCompleted: Math.max(0, totalJobsCompleted),
      totalJobsOpen: Math.max(0, totalJobsOpen),
      averageLaborHours: Math.max(0, averageLaborHours),
      scheduleAdherence: Math.min(100, Math.max(0, scheduleAdherence)),
      jobsByType,
      topPerformers
    };

    // Validate postconditions
    this.validatePerformanceReport(report);

    return report;
  }

  /**
   * Validate that PerformanceReport object meets all postconditions
   * @param report - PerformanceReport object to validate
   * @throws Error if validation fails
   */
  private validatePerformanceReport(report: PerformanceReport): void {
    // Count values must be non-negative integers
    if (report.totalJobsCompleted < 0 || !Number.isInteger(report.totalJobsCompleted)) {
      throw new Error(`totalJobsCompleted must be a non-negative integer, got ${report.totalJobsCompleted}`);
    }
    if (report.totalJobsOpen < 0 || !Number.isInteger(report.totalJobsOpen)) {
      throw new Error(`totalJobsOpen must be a non-negative integer, got ${report.totalJobsOpen}`);
    }

    // Hour values must be non-negative
    if (report.averageLaborHours < 0) {
      throw new Error(`averageLaborHours must be non-negative, got ${report.averageLaborHours}`);
    }

    // Schedule adherence must be between 0 and 100
    if (report.scheduleAdherence < 0 || report.scheduleAdherence > 100) {
      throw new Error(`scheduleAdherence must be between 0 and 100, got ${report.scheduleAdherence}`);
    }

    // Validate each technician performance
    for (const techPerf of report.topPerformers) {
      // Jobs completed must be non-negative integer
      if (techPerf.jobsCompleted < 0 || !Number.isInteger(techPerf.jobsCompleted)) {
        throw new Error(`jobsCompleted must be a non-negative integer, got ${techPerf.jobsCompleted}`);
      }

      // Hour values must be non-negative
      if (techPerf.totalHours < 0) {
        throw new Error(`totalHours must be non-negative, got ${techPerf.totalHours}`);
      }
      if (techPerf.averageJobDuration < 0) {
        throw new Error(`averageJobDuration must be non-negative, got ${techPerf.averageJobDuration}`);
      }

      // On-time completion rate must be between 0 and 100
      if (techPerf.onTimeCompletionRate < 0 || techPerf.onTimeCompletionRate > 100) {
        throw new Error(`onTimeCompletionRate must be between 0 and 100, got ${techPerf.onTimeCompletionRate}`);
      }
    }

    // Verify topPerformers is sorted by jobsCompleted descending
    for (let i = 1; i < report.topPerformers.length; i++) {
      if (report.topPerformers[i].jobsCompleted > report.topPerformers[i - 1].jobsCompleted) {
        throw new Error('topPerformers must be sorted by jobsCompleted descending');
      }
    }
  }

  // ============================================================================
  // JOB COST REPORT METHODS (Task 20.3)
  // ============================================================================

  /**
   * Retrieves job cost report from the API
   * @param jobId Job ID to get cost report for
   * @returns Observable of JobCostBreakdown
   */
  getJobCostReport(jobId: string): Observable<JobCostBreakdown> {
    const cacheKey = `job-cost-${jobId}`;
    return this.cacheService.get(
      cacheKey,
      () => this.http.get<JobCostBreakdown>(`${this.apiUrl}/job-cost/${jobId}`)
        .pipe(
          retry(this.retryCount),
          catchError(this.handleError)
        ),
      this.REPORT_CACHE_TTL
    );
  }

  /**
   * Retrieves budget comparison data for a job
   * @param jobId Job ID to get budget comparison for
   * @returns Observable of BudgetComparison
   */
  getBudgetComparison(jobId: string): Observable<BudgetComparison> {
    const cacheKey = `budget-comparison-${jobId}`;
    return this.cacheService.get(
      cacheKey,
      () => this.http.get<BudgetComparison>(`${this.apiUrl}/budget-comparison/${jobId}`)
        .pipe(
          retry(this.retryCount),
          catchError(this.handleError)
        ),
      this.REPORT_CACHE_TTL
    );
  }

  /**
   * Retrieves budget variance report across all jobs
   * @param dateRange Optional date range filter
   * @returns Observable of budget variance data
   */
  getBudgetVarianceReport(dateRange?: DateRange): Observable<BudgetVarianceReport> {
    const cacheKey = `budget-variance-${dateRange ? JSON.stringify(dateRange) : 'all'}`;
    return this.cacheService.get(
      cacheKey,
      () => {
        let params = new HttpParams();
        if (dateRange) {
          params = params
            .set('startDate', dateRange.startDate.toISOString())
            .set('endDate', dateRange.endDate.toISOString());
        }
        return this.http.get<BudgetVarianceReport>(`${this.apiUrl}/budget-variance`, { params })
          .pipe(
            retry(this.retryCount),
            catchError(this.handleError)
          );
      },
      this.REPORT_CACHE_TTL
    );
  }

  /**
   * Retrieves travel cost report
   * @param dateRange Optional date range filter
   * @returns Observable of travel cost data
   */
  getTravelCostReport(dateRange?: DateRange): Observable<TravelCostReport> {
    const cacheKey = `travel-cost-${dateRange ? JSON.stringify(dateRange) : 'all'}`;
    return this.cacheService.get(
      cacheKey,
      () => {
        let params = new HttpParams();
        if (dateRange) {
          params = params
            .set('startDate', dateRange.startDate.toISOString())
            .set('endDate', dateRange.endDate.toISOString());
        }
        return this.http.get<TravelCostReport>(`${this.apiUrl}/travel-costs`, { params })
          .pipe(
            retry(this.retryCount),
            catchError(this.handleError)
          );
      },
      this.REPORT_CACHE_TTL
    );
  }

  /**
   * Retrieves material usage report
   * @param dateRange Optional date range filter
   * @returns Observable of material usage data
   */
  getMaterialUsageReport(dateRange?: DateRange): Observable<MaterialUsageReport> {
    const cacheKey = `material-usage-${dateRange ? JSON.stringify(dateRange) : 'all'}`;
    return this.cacheService.get(
      cacheKey,
      () => {
        let params = new HttpParams();
        if (dateRange) {
          params = params
            .set('startDate', dateRange.startDate.toISOString())
            .set('endDate', dateRange.endDate.toISOString());
        }
        return this.http.get<MaterialUsageReport>(`${this.apiUrl}/material-usage`, { params })
          .pipe(
            retry(this.retryCount),
            catchError(this.handleError)
          );
      },
      this.REPORT_CACHE_TTL
    );
  }

  /**
   * Export job cost report as PDF or Excel
   * @param jobId Job ID to export report for
   * @param format Export format ('pdf' or 'excel')
   * @returns Observable of Blob containing the exported file
   */
  exportJobCostReport(jobId: string, format: 'pdf' | 'excel'): Observable<Blob> {
    const params = new HttpParams().set('format', format);
    return this.http.get(`${this.apiUrl}/job-cost/${jobId}/export`, {
      params,
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Generate a job cost breakdown from local data
   * Used for client-side aggregation when API data is not available
   */
  generateJobCostBreakdown(
    jobId: string,
    laborData: TechnicianLaborCost[],
    materialData: MaterialCostItem[],
    travelData: TechnicianTravelCost[],
    allocatedBudget: number
  ): JobCostBreakdown {
    const laborCosts: LaborCosts = {
      totalHours: laborData.reduce((sum, t) => sum + t.hours, 0),
      totalRoundedHours: laborData.reduce((sum, t) => sum + t.roundedHours, 0),
      averageHourlyRate: laborData.length > 0
        ? laborData.reduce((sum, t) => sum + t.hourlyRate, 0) / laborData.length
        : 0,
      totalCost: laborData.reduce((sum, t) => sum + t.totalCost, 0),
      byTechnician: laborData
    };

    const materialCosts: MaterialCosts = {
      totalCost: materialData.reduce((sum, m) => sum + m.totalCost, 0),
      byMaterial: materialData
    };

    const travelCosts: TravelCosts = {
      totalCost: travelData.reduce((sum, t) => sum + t.perDiemAmount, 0),
      byTechnician: travelData
    };

    const totalCosts = laborCosts.totalCost + materialCosts.totalCost + travelCosts.totalCost;
    const budgetVariance = allocatedBudget - totalCosts;
    const budgetVariancePercent = allocatedBudget > 0
      ? (budgetVariance / allocatedBudget) * 100
      : 0;

    return {
      jobId,
      laborCosts,
      materialCosts,
      travelCosts,
      totalCosts,
      budgetVariance,
      budgetVariancePercent
    };
  }

  /**
   * Generate a budget comparison from a JobBudget
   */
  generateBudgetComparison(budget: JobBudget, totalActualCost: number): BudgetComparison {
    const allocatedBudget = budget.allocatedHours;
    const variance = allocatedBudget - totalActualCost;
    const variancePercent = allocatedBudget > 0
      ? (variance / allocatedBudget) * 100
      : 0;

    return {
      allocatedBudget,
      actualCost: totalActualCost,
      variance,
      variancePercent,
      status: budget.status
    };
  }

  /**
   * Invalidate all reporting caches
   * Call this when data changes that affects reports
   */
  invalidateCache(): void {
    this.cacheService.invalidatePattern(/^(dashboard|utilization|performance|kpis|adherence)/);
    console.log('[ReportingService] All caches invalidated');
  }

  /**
   * Invalidate specific report cache
   */
  invalidateReportCache(reportType: 'dashboard' | 'utilization' | 'performance' | 'kpis' | 'adherence'): void {
    this.cacheService.invalidatePattern(new RegExp(`^${reportType}`));
    console.log(`[ReportingService] ${reportType} cache invalidated`);
  }

  /**
   * Generate utilization report from technicians, jobs, and assignments data
   * 
   * This function performs client-side calculation of technician utilization
   * based on the provided technicians, jobs, and assignments within a specified date range.
   * 
   * FORMAL SPECIFICATIONS:
   * 
   * Preconditions:
   * - technicians is a valid array of Technician objects (may be empty)
   * - jobs is a valid array of Job objects (may be empty)
   * - assignments is a valid array of Assignment objects (may be empty)
   * - dateRange.startDate is before or equal to dateRange.endDate
   * - All technicians, jobs, and assignments are already filtered by user's data scope
   * 
   * Postconditions:
   * - Returns UtilizationReport object with calculated values
   * - All utilizationRate values are between 0 and 100
   * - All hour values are non-negative
   * - All count values are non-negative integers
   * - Calculations are based only on data within dateRange
   * - If no data exists for dateRange, returns report with zero values
   * - Original input arrays are not mutated
   * - averageUtilization is the mean of all technician utilization rates
   * 
   * Loop Invariants:
   * - When iterating through technicians: all processed technicians have valid utilization data
   * - When calculating hours: sum of worked hours does not exceed available hours per technician
   * - All intermediate calculations maintain numerical precision
   * 
   * @param technicians - Array of Technician objects to analyze
   * @param jobs - Array of Job objects to analyze
   * @param assignments - Array of Assignment objects linking technicians to jobs
   * @param dateRange - Date range for filtering jobs and calculating availability
   * @returns UtilizationReport object with technician utilization data
   */
  generateUtilizationReport(
    technicians: Technician[],
    jobs: Job[],
    assignments: Assignment[],
    dateRange: DateRange
  ): UtilizationReport {
    // Validate preconditions
    if (!technicians || !Array.isArray(technicians)) {
      throw new Error('technicians must be a valid array');
    }
    if (!jobs || !Array.isArray(jobs)) {
      throw new Error('jobs must be a valid array');
    }
    if (!assignments || !Array.isArray(assignments)) {
      throw new Error('assignments must be a valid array');
    }
    if (!dateRange || !dateRange.startDate || !dateRange.endDate) {
      throw new Error('dateRange must have valid startDate and endDate');
    }
    if (dateRange.startDate > dateRange.endDate) {
      throw new Error('dateRange.startDate must be before or equal to dateRange.endDate');
    }

    // Create a map of jobs by ID for quick lookup
    const jobsById = new Map<string, Job>();
    jobs.forEach(job => jobsById.set(job.id, job));

    // Filter jobs within date range
    const jobsInRange = this.filterJobsByDateRange(jobs, dateRange);

    // Create a set of job IDs in range for quick lookup
    const jobIdsInRange = new Set(jobsInRange.map(j => j.id));

    // Filter active assignments for jobs in range
    const activeAssignments = assignments.filter(a => 
      a.isActive && jobIdsInRange.has(a.jobId)
    );

    // Calculate days in range for available hours calculation
    const daysInRange = this.calculateDaysInRange(dateRange.startDate, dateRange.endDate);
    const HOURS_PER_DAY = 8; // Standard workday

    // Build utilization data for each technician
    const technicianUtilizations: TechnicianUtilization[] = [];
    let totalUtilizationSum = 0;

    // Loop Invariant: all processed technicians have valid utilization data
    for (const technician of technicians) {
      // Calculate available hours based on date range
      // Only count active technicians
      const availableHours = technician.isActive 
        ? daysInRange * HOURS_PER_DAY 
        : 0;

      // Find assignments for this technician
      const technicianAssignments = activeAssignments.filter(a => 
        a.technicianId === technician.id
      );

      // Calculate worked hours from assigned jobs
      let workedHours = 0;
      let jobsCompleted = 0;

      // Loop Invariant: sum of worked hours does not exceed available hours
      for (const assignment of technicianAssignments) {
        const job = jobsById.get(assignment.jobId);
        
        if (job) {
          // Calculate hours for this job
          if (job.status === JobStatus.Completed && job.actualStartDate && job.actualEndDate) {
            // Use actual hours for completed jobs
            const jobHours = this.calculateJobDuration(job);
            workedHours += jobHours;
            jobsCompleted++;
          } else if (job.status !== JobStatus.Cancelled) {
            // Use estimated hours for non-completed, non-cancelled jobs
            workedHours += job.estimatedLaborHours || 0;
          }
        }
      }

      // Ensure worked hours don't exceed available hours (cap at 100% utilization)
      workedHours = Math.min(workedHours, availableHours);

      // Calculate utilization rate (percentage)
      const utilizationRate = availableHours > 0 
        ? Math.min(100, (workedHours / availableHours) * 100)
        : 0;

      // Add to results
      technicianUtilizations.push({
        technician,
        availableHours: Math.max(0, availableHours),
        workedHours: Math.max(0, workedHours),
        utilizationRate: Math.min(100, Math.max(0, utilizationRate)),
        jobsCompleted: Math.max(0, jobsCompleted)
      });

      totalUtilizationSum += utilizationRate;
    }

    // Calculate average utilization across all technicians
    const averageUtilization = technicians.length > 0 
      ? totalUtilizationSum / technicians.length 
      : 0;

    // Ensure all postconditions are met
    const report: UtilizationReport = {
      dateRange,
      technicians: technicianUtilizations,
      averageUtilization: Math.min(100, Math.max(0, averageUtilization))
    };

    // Validate postconditions
    this.validateUtilizationReport(report);

    return report;
  }
  /**
   * Generate performance report from jobs, technicians, and assignments data
   *
   * This function performs client-side calculation of job performance metrics
   * based on the provided jobs, technicians, and assignments within a specified date range.
   *
   * FORMAL SPECIFICATIONS:
   *
   * Preconditions:
   * - jobs is a valid array of Job objects (may be empty)
   * - technicians is a valid array of Technician objects (may be empty)
   * - assignments is a valid array of Assignment objects (may be empty)
   * - dateRange.startDate is before or equal to dateRange.endDate
   * - All jobs, technicians, and assignments are already filtered by user's data scope
   *
   * Postconditions:
   * - Returns PerformanceReport object with calculated values
   * - All percentage values are between 0 and 100
   * - All count values are non-negative integers
   * - All hour values are non-negative
   * - Calculations are based only on data within dateRange
   * - If no data exists for dateRange, returns report with zero values
   * - Original input arrays are not mutated
   * - topPerformers array is sorted by jobsCompleted descending
   * - scheduleAdherence is the percentage of jobs completed on time
   *
   * Loop Invariants:
   * - When iterating through jobs: all processed jobs have been categorized correctly
   * - When calculating technician performance: all metrics are non-negative
   * - All intermediate calculations maintain numerical precision
   *
   * @param jobs - Array of Job objects to analyze
   * @param technicians - Array of Technician objects to analyze
   * @param assignments - Array of Assignment objects linking technicians to jobs
  /**
   * Validate that UtilizationReport object meets all postconditions
   * @param report - UtilizationReport object to validate
   * @throws Error if validation fails
   */
  private validateUtilizationReport(report: UtilizationReport): void {
    // Average utilization must be between 0 and 100
    if (report.averageUtilization < 0 || report.averageUtilization > 100) {
      throw new Error(`averageUtilization must be between 0 and 100, got ${report.averageUtilization}`);
    }

    // Validate each technician utilization
    for (const techUtil of report.technicians) {
      // Utilization rate must be between 0 and 100
      if (techUtil.utilizationRate < 0 || techUtil.utilizationRate > 100) {
        throw new Error(`utilizationRate must be between 0 and 100, got ${techUtil.utilizationRate}`);
      }

      // Hour values must be non-negative
      if (techUtil.availableHours < 0) {
        throw new Error(`availableHours must be non-negative, got ${techUtil.availableHours}`);
      }
      if (techUtil.workedHours < 0) {
        throw new Error(`workedHours must be non-negative, got ${techUtil.workedHours}`);
      }

      // Worked hours should not exceed available hours
      if (techUtil.workedHours > techUtil.availableHours) {
        throw new Error(`workedHours (${techUtil.workedHours}) cannot exceed availableHours (${techUtil.availableHours})`);
      }

      // Jobs completed must be non-negative integer
      if (techUtil.jobsCompleted < 0 || !Number.isInteger(techUtil.jobsCompleted)) {
        throw new Error(`jobsCompleted must be a non-negative integer, got ${techUtil.jobsCompleted}`);
      }
    }
  }

  /**
   * Calculate KPI metrics from jobs and technicians data
   * 
   * This function performs client-side calculation of key performance indicators
   * based on the provided jobs and technicians within a specified date range.
   * 
   * FORMAL SPECIFICATIONS:
   * 
   * Preconditions:
   * - jobs is a valid array of Job objects (may be empty)
   * - technicians is a valid array of Technician objects (may be empty)
   * - dateRange.startDate is before or equal to dateRange.endDate
   * - userScope contains valid scope definitions
   * - All jobs and technicians are already filtered by user's data scope
   * 
   * Postconditions:
   * - Returns KPIMetrics object with calculated values
   * - All percentage values are between 0 and 100
   * - All count values are non-negative integers
   * - Calculations are based only on data within dateRange
   * - If no data exists for dateRange, returns metrics with zero values
   * - Original input arrays are not mutated
   * 
   * Loop Invariants:
   * - When iterating through jobs: running totals (completed, in-progress, etc.) 
   *   are accurate for all processed jobs
   * - When calculating utilization: sum of technician hours does not exceed 
   *   total available hours
   * - All intermediate calculations maintain numerical precision
   * 
   * @param jobs - Array of Job objects to analyze
   * @param technicians - Array of Technician objects to analyze
   * @param dateRange - Date range for filtering jobs
   * @param userScope - Data scope for the current user (for validation)
   * @returns KPIMetrics object with calculated performance indicators
   */
  calculateKPIMetrics(
    jobs: Job[],
    technicians: Technician[],
    dateRange: DateRange,
    userScope: DataScope[]
  ): KPIMetrics {
    // Validate preconditions
    if (!jobs || !Array.isArray(jobs)) {
      throw new Error('jobs must be a valid array');
    }
    if (!technicians || !Array.isArray(technicians)) {
      throw new Error('technicians must be a valid array');
    }
    if (!dateRange || !dateRange.startDate || !dateRange.endDate) {
      throw new Error('dateRange must have valid startDate and endDate');
    }
    if (dateRange.startDate > dateRange.endDate) {
      throw new Error('dateRange.startDate must be before or equal to dateRange.endDate');
    }
    if (!userScope || !Array.isArray(userScope)) {
      throw new Error('userScope must be a valid array');
    }

    // Filter jobs within date range (using consistent overlap logic)
    const jobsInRange = this.filterJobsByDateRange(jobs, dateRange);

    // Initialize counters (Loop Invariant: all counters start at 0)
    let totalJobs = 0;
    let completedJobs = 0;
    let inProgressJobs = 0;
    let notStartedJobs = 0;
    let cancelledJobs = 0;
    let totalEstimatedHours = 0;
    let totalActualHours = 0;
    let onTimeCompletions = 0;

    // Calculate job metrics (Loop Invariant: running totals are accurate)
    for (const job of jobsInRange) {
      totalJobs++;
      totalEstimatedHours += job.estimatedLaborHours || 0;

      switch (job.status) {
        case JobStatus.Completed:
          completedJobs++;
          if (job.actualEndDate && job.scheduledEndDate) {
            totalActualHours += this.calculateJobDuration(job);
            // Check if completed on time
            if (job.actualEndDate <= job.scheduledEndDate) {
              onTimeCompletions++;
            }
          }
          break;
        case JobStatus.OnSite:
        case JobStatus.EnRoute:
          inProgressJobs++;
          break;
        case JobStatus.NotStarted:
          notStartedJobs++;
          break;
        case JobStatus.Cancelled:
          cancelledJobs++;
          break;
      }
    }

    // Calculate technician utilization metrics
    const activeTechnicians = technicians.filter(t => t.isActive);
    const totalAvailableTechnicians = activeTechnicians.length;

    // Calculate working hours per day (8 hours standard workday)
    const HOURS_PER_DAY = 8;
    const daysInRange = this.calculateDaysInRange(dateRange.startDate, dateRange.endDate);
    const totalAvailableHours = totalAvailableTechnicians * HOURS_PER_DAY * daysInRange;

    // Loop Invariant: sum of technician hours does not exceed total available hours
    const utilizationRate = totalAvailableHours > 0 
      ? Math.min(100, (totalActualHours / totalAvailableHours) * 100)
      : 0;

    // Calculate completion rate
    const completionRate = totalJobs > 0 
      ? (completedJobs / totalJobs) * 100 
      : 0;

    // Calculate on-time completion rate
    const onTimeRate = completedJobs > 0 
      ? (onTimeCompletions / completedJobs) * 100 
      : 0;

    // Calculate average job duration
    const averageJobDuration = completedJobs > 0 
      ? totalActualHours / completedJobs 
      : 0;

    // Ensure all postconditions are met
    const metrics: KPIMetrics = {
      totalJobs: Math.max(0, totalJobs),
      completedJobs: Math.max(0, completedJobs),
      inProgressJobs: Math.max(0, inProgressJobs),
      notStartedJobs: Math.max(0, notStartedJobs),
      cancelledJobs: Math.max(0, cancelledJobs),
      completionRate: Math.min(100, Math.max(0, completionRate)),
      utilizationRate: Math.min(100, Math.max(0, utilizationRate)),
      onTimeCompletionRate: Math.min(100, Math.max(0, onTimeRate)),
      averageJobDuration: Math.max(0, averageJobDuration),
      totalAvailableTechnicians: Math.max(0, totalAvailableTechnicians),
      totalEstimatedHours: Math.max(0, totalEstimatedHours),
      totalActualHours: Math.max(0, totalActualHours),
      dateRange
    };

    // Validate postconditions
    this.validateKPIMetrics(metrics);

    return metrics;
  }

  /**
   * Calculate the duration of a completed job in hours
   * @param job - Job with actual start and end dates
   * @returns Duration in hours
   */
  private calculateJobDuration(job: Job): number {
    if (!job.actualStartDate || !job.actualEndDate) {
      return 0;
    }
    const durationMs = job.actualEndDate.getTime() - job.actualStartDate.getTime();
    return Math.max(0, durationMs / (1000 * 60 * 60)); // Convert to hours
  }

  /**
   * Calculate the number of days in a date range
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Number of days (inclusive)
   */
  private calculateDaysInRange(startDate: Date, endDate: Date): number {
    const durationMs = endDate.getTime() - startDate.getTime();
    return Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60 * 24)) + 1);
  }

  /**
   * Filter jobs that overlap with the specified date range
   * A job overlaps if it starts before the range ends AND ends after the range starts
   * 
   * @param jobs - Array of jobs to filter
   * @param dateRange - Date range to filter by
   * @returns Filtered array of jobs that overlap with the date range
   */
  private filterJobsByDateRange(jobs: Job[], dateRange: DateRange): Job[] {
    return jobs.filter(job => {
      const jobStart = job.scheduledStartDate;
      const jobEnd = job.scheduledEndDate || job.scheduledStartDate;
      // Job overlaps with date range if it starts before range ends and ends after range starts
      return jobStart <= dateRange.endDate && jobEnd >= dateRange.startDate;
    });
  }

  /**
   * Validate that KPIMetrics object meets all postconditions
   * @param metrics - KPIMetrics object to validate
   * @throws Error if validation fails
   */
  private validateKPIMetrics(metrics: KPIMetrics): void {
    // All percentage values must be between 0 and 100
    const percentageFields = [
      'completionRate',
      'utilizationRate',
      'onTimeCompletionRate'
    ];
    
    for (const field of percentageFields) {
      const value = (metrics as any)[field];
      if (value < 0 || value > 100) {
        throw new Error(`${field} must be between 0 and 100, got ${value}`);
      }
    }

    // All count values must be non-negative integers
    const countFields = [
      'totalJobs',
      'completedJobs',
      'inProgressJobs',
      'notStartedJobs',
      'cancelledJobs',
      'totalAvailableTechnicians'
    ];

    for (const field of countFields) {
      const value = (metrics as any)[field];
      if (value < 0 || !Number.isInteger(value)) {
        throw new Error(`${field} must be a non-negative integer, got ${value}`);
      }
    }

    // Hour values must be non-negative
    const hourFields = [
      'averageJobDuration',
      'totalEstimatedHours',
      'totalActualHours'
    ];

    for (const field of hourFields) {
      const value = (metrics as any)[field];
      if (value < 0) {
        throw new Error(`${field} must be non-negative, got ${value}`);
      }
    }
  }
}
