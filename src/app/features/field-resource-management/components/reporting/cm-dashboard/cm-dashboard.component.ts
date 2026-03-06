import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subject, interval, combineLatest } from 'rxjs';
import { takeUntil, map, startWith } from 'rxjs/operators';
import { AuthService } from '../../../../../services/auth.service';
import { RoleBasedDataService } from '../../../../../services/role-based-data.service';
import { WorkflowService } from '../../../../../services/workflow.service';
import { ApprovalTask } from '../../../../../models/workflow.model';

/**
 * Dashboard metrics specific to Construction Manager role
 */
export interface CMDashboardMetrics {
  activeProjects: number;
  pendingTasks: number;
  availableTechnicians: number;
  resourceUtilization: number;
  pendingApprovals: number;
  overdueItems: number;
}

/**
 * Street sheet summary for dashboard display
 */
export interface StreetSheetSummary {
  id: string;
  projectName: string;
  market: string;
  status: string;
  lastUpdated: Date;
}

/**
 * Technician status for dashboard display
 */
export interface TechnicianStatus {
  id: string;
  name: string;
  status: 'available' | 'on_job' | 'off_duty';
  currentJob?: string;
  location?: string;
}

/**
 * Upcoming deadline item
 */
export interface Deadline {
  id: string;
  title: string;
  dueDate: Date;
  type: 'approval' | 'project' | 'report';
  priority: 'high' | 'medium' | 'low';
}

/**
 * Date range for filtering
 */
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Complete dashboard data structure
 */
export interface CMDashboardData {
  metrics: CMDashboardMetrics;
  recentStreetSheets: StreetSheetSummary[];
  pendingApprovals: ApprovalTask[];
  technicianStatus: TechnicianStatus[];
  upcomingDeadlines: Deadline[];
}

/**
 * Pagination configuration
 */
export interface PaginationConfig {
  pageSize: number;
  currentPage: number;
  totalItems: number;
}

/**
 * Widget loading state
 */
export interface WidgetLoadingState {
  metrics: boolean;
  streetSheets: boolean;
  approvals: boolean;
  technicians: boolean;
  deadlines: boolean;
}

/**
 * CM Dashboard Component
 * 
 * Displays Construction Manager-specific dashboard with:
 * - Market-filtered metrics and data
 * - Active projects and pending tasks
 * - Technician availability and resource utilization
 * - Recent street sheets from assigned market
 * - Pending approvals requiring CM action
 * - Technician status overview
 * - Upcoming deadlines
 * - Auto-refresh capability
 */
@Component({
  selector: 'app-cm-dashboard',
  templateUrl: './cm-dashboard.component.html',
  styleUrls: ['./cm-dashboard.component.scss']
})
export class CMDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Dashboard data
  dashboardData$!: Observable<CMDashboardData>;
  loading = false;
  error: string | null = null;
  
  // Widget loading states for skeleton screens
  widgetLoading: WidgetLoadingState = {
    metrics: false,
    streetSheets: false,
    approvals: false,
    technicians: false,
    deadlines: false
  };
  
  // Pagination for data tables
  streetSheetsPagination: PaginationConfig = {
    pageSize: 10,
    currentPage: 0,
    totalItems: 0
  };
  
  approvalsPagination: PaginationConfig = {
    pageSize: 10,
    currentPage: 0,
    totalItems: 0
  };
  
  techniciansPagination: PaginationConfig = {
    pageSize: 10,
    currentPage: 0,
    totalItems: 0
  };
  
  // User context
  market: string = '';
  userName: string = '';
  
  // Date range for filtering
  selectedDateRange: DateRange = {
    startDate: this.getDefaultStartDate(),
    endDate: new Date()
  };
  
  // Auto-refresh settings
  autoRefreshEnabled = true;
  refreshIntervalMinutes = 5;
  
  // Lazy loading flags
  private metricsLoaded = false;
  private streetSheetsLoaded = false;
  private approvalsLoaded = false;
  private techniciansLoaded = false;
  private deadlinesLoaded = false;
  
  constructor(
    private authService: AuthService,
    private roleBasedDataService: RoleBasedDataService,
    private workflowService: WorkflowService,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    // Get user context
    const user = this.authService.getUser();
    if (user) {
      this.market = user.market || '';
      this.userName = user.name || '';
    }
    
    // Load initial dashboard data
    this.loadDashboardData();
    
    // Set up auto-refresh
    if (this.autoRefreshEnabled) {
      interval(this.refreshIntervalMinutes * 60 * 1000)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.refreshMetrics();
        });
    }
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  /**
   * Load all dashboard data
   */
  loadDashboardData(): void {
    this.loading = true;
    this.error = null;
    
    try {
      // Load metrics immediately (critical data)
      this.widgetLoading.metrics = true;
      const metrics$ = this.loadMetrics();
      
      // Create observable that combines all data sources
      // Use lazy loading - only load when widget is visible
      this.dashboardData$ = combineLatest([
        metrics$,
        this.loadRecentStreetSheetsLazy(),
        this.loadPendingApprovalsLazy(),
        this.loadTechnicianStatusLazy(),
        this.loadUpcomingDeadlinesLazy()
      ]).pipe(
        map(([metrics, streetSheets, approvals, technicians, deadlines]) => ({
          metrics,
          recentStreetSheets: streetSheets,
          pendingApprovals: approvals,
          technicianStatus: technicians,
          upcomingDeadlines: deadlines
        })),
        startWith({
          metrics: this.getEmptyMetrics(),
          recentStreetSheets: [],
          pendingApprovals: [],
          technicianStatus: [],
          upcomingDeadlines: []
        }),
        takeUntil(this.destroy$)
      );
      
      this.loading = false;
    } catch (err) {
      this.error = 'Failed to load dashboard data';
      this.loading = false;
      console.error('Dashboard load error:', err);
    }
  }
  
  /**
   * Lazy load recent street sheets (only when widget is visible)
   */
  private loadRecentStreetSheetsLazy(): Observable<StreetSheetSummary[]> {
    if (!this.streetSheetsLoaded) {
      return new Observable<StreetSheetSummary[]>(observer => {
        observer.next([]);
        observer.complete();
      });
    }
    return this.loadRecentStreetSheets();
  }
  
  /**
   * Lazy load pending approvals (only when widget is visible)
   */
  private loadPendingApprovalsLazy(): Observable<ApprovalTask[]> {
    if (!this.approvalsLoaded) {
      return new Observable<ApprovalTask[]>(observer => {
        observer.next([]);
        observer.complete();
      });
    }
    return this.loadPendingApprovals();
  }
  
  /**
   * Lazy load technician status (only when widget is visible)
   */
  private loadTechnicianStatusLazy(): Observable<TechnicianStatus[]> {
    if (!this.techniciansLoaded) {
      return new Observable<TechnicianStatus[]>(observer => {
        observer.next([]);
        observer.complete();
      });
    }
    return this.loadTechnicianStatus();
  }
  
  /**
   * Lazy load upcoming deadlines (only when widget is visible)
   */
  private loadUpcomingDeadlinesLazy(): Observable<Deadline[]> {
    if (!this.deadlinesLoaded) {
      return new Observable<Deadline[]>(observer => {
        observer.next([]);
        observer.complete();
      });
    }
    return this.loadUpcomingDeadlines();
  }
  
  /**
   * Trigger loading of a specific widget
   */
  loadWidget(widget: keyof WidgetLoadingState): void {
    switch (widget) {
      case 'streetSheets':
        if (!this.streetSheetsLoaded) {
          this.streetSheetsLoaded = true;
          this.widgetLoading.streetSheets = true;
          this.loadDashboardData();
        }
        break;
      case 'approvals':
        if (!this.approvalsLoaded) {
          this.approvalsLoaded = true;
          this.widgetLoading.approvals = true;
          this.loadDashboardData();
        }
        break;
      case 'technicians':
        if (!this.techniciansLoaded) {
          this.techniciansLoaded = true;
          this.widgetLoading.technicians = true;
          this.loadDashboardData();
        }
        break;
      case 'deadlines':
        if (!this.deadlinesLoaded) {
          this.deadlinesLoaded = true;
          this.widgetLoading.deadlines = true;
          this.loadDashboardData();
        }
        break;
    }
  }
  
  /**
   * Load CM-specific metrics
   */
  private loadMetrics(): Observable<CMDashboardMetrics> {
    // Check cache first
    const cacheKey = `cm-metrics-${this.market}-${this.selectedDateRange.startDate.toISOString()}-${this.selectedDateRange.endDate.toISOString()}`;
    const cached = this.roleBasedDataService.getCachedData<CMDashboardMetrics>(cacheKey);
    
    if (cached) {
      return new Observable<CMDashboardMetrics>(observer => {
        observer.next(cached);
        observer.complete();
      });
    }
    
    // TODO: Replace with actual API call when backend is ready
    // This would call a service method like:
    // return this.dashboardService.getCMMetrics(this.market, this.selectedDateRange);
    
    return new Observable<CMDashboardMetrics>(observer => {
      // Mock data for now
      const metrics: CMDashboardMetrics = {
        activeProjects: 12,
        pendingTasks: 8,
        availableTechnicians: 15,
        resourceUtilization: 78.5,
        pendingApprovals: 5,
        overdueItems: 2
      };
      
      // Cache the result with 2 minute TTL
      this.roleBasedDataService.setCachedData(cacheKey, metrics, 2 * 60 * 1000);
      
      observer.next(metrics);
      observer.complete();
    });
  }
  
  /**
   * Load recent street sheets filtered by market
   */
  private loadRecentStreetSheets(): Observable<StreetSheetSummary[]> {
    // Check cache first
    const cacheKey = `cm-street-sheets-${this.market}-page-${this.streetSheetsPagination.currentPage}`;
    const cached = this.roleBasedDataService.getCachedData<StreetSheetSummary[]>(cacheKey);
    
    if (cached) {
      this.widgetLoading.streetSheets = false;
      return new Observable<StreetSheetSummary[]>(observer => {
        observer.next(cached);
        observer.complete();
      });
    }
    
    // TODO: Replace with actual API call when backend is ready
    // This would call with pagination:
    // return this.streetSheetService.getRecentStreetSheets(
    //   this.market, 
    //   this.streetSheetsPagination.pageSize,
    //   this.streetSheetsPagination.currentPage
    // );
    
    return new Observable<StreetSheetSummary[]>(observer => {
      // Mock data for now
      const allStreetSheets: StreetSheetSummary[] = [
        {
          id: '1',
          projectName: 'Downtown Fiber Installation',
          market: this.market,
          status: 'In Progress',
          lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
        },
        {
          id: '2',
          projectName: 'Residential Area Upgrade',
          market: this.market,
          status: 'Pending Review',
          lastUpdated: new Date(Date.now() - 5 * 60 * 60 * 1000) // 5 hours ago
        },
        {
          id: '3',
          projectName: 'Commercial Building Setup',
          market: this.market,
          status: 'Completed',
          lastUpdated: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
        }
      ];
      
      // Apply pagination
      this.streetSheetsPagination.totalItems = allStreetSheets.length;
      const start = this.streetSheetsPagination.currentPage * this.streetSheetsPagination.pageSize;
      const end = start + this.streetSheetsPagination.pageSize;
      const paginatedData = allStreetSheets.slice(start, end);
      
      // Cache the result with 2 minute TTL
      this.roleBasedDataService.setCachedData(cacheKey, paginatedData, 2 * 60 * 1000);
      
      this.widgetLoading.streetSheets = false;
      observer.next(paginatedData);
      observer.complete();
    });
  }
  
  /**
   * Load pending approvals for CM
   */
  private loadPendingApprovals(): Observable<ApprovalTask[]> {
    this.widgetLoading.approvals = true;
    
    return this.workflowService.getMyApprovalTasks().pipe(
      map(tasks => {
        const pendingTasks = tasks.filter(task => task.status === 'pending');
        
        // Apply pagination
        this.approvalsPagination.totalItems = pendingTasks.length;
        const start = this.approvalsPagination.currentPage * this.approvalsPagination.pageSize;
        const end = start + this.approvalsPagination.pageSize;
        
        this.widgetLoading.approvals = false;
        return pendingTasks.slice(start, end);
      }),
      takeUntil(this.destroy$)
    );
  }
  
  /**
   * Load technician status overview
   */
  private loadTechnicianStatus(): Observable<TechnicianStatus[]> {
    // Check cache first
    const cacheKey = `cm-technician-status-${this.market}-page-${this.techniciansPagination.currentPage}`;
    const cached = this.roleBasedDataService.getCachedData<TechnicianStatus[]>(cacheKey);
    
    if (cached) {
      this.widgetLoading.technicians = false;
      return new Observable<TechnicianStatus[]>(observer => {
        observer.next(cached);
        observer.complete();
      });
    }
    
    this.widgetLoading.technicians = true;
    
    // TODO: Replace with actual API call when backend is ready
    // This would call with pagination:
    // return this.technicianService.getTechnicianStatus(
    //   this.market,
    //   this.techniciansPagination.pageSize,
    //   this.techniciansPagination.currentPage
    // );
    
    return new Observable<TechnicianStatus[]>(observer => {
      // Mock data for now
      const allTechnicians: TechnicianStatus[] = [
        {
          id: '1',
          name: 'John Smith',
          status: 'on_job',
          currentJob: 'Downtown Fiber Installation',
          location: 'Site A'
        },
        {
          id: '2',
          name: 'Sarah Johnson',
          status: 'available',
          location: 'Office'
        },
        {
          id: '3',
          name: 'Mike Davis',
          status: 'on_job',
          currentJob: 'Residential Area Upgrade',
          location: 'Site B'
        },
        {
          id: '4',
          name: 'Emily Brown',
          status: 'available',
          location: 'Office'
        }
      ];
      
      // Apply pagination
      this.techniciansPagination.totalItems = allTechnicians.length;
      const start = this.techniciansPagination.currentPage * this.techniciansPagination.pageSize;
      const end = start + this.techniciansPagination.pageSize;
      const paginatedData = allTechnicians.slice(start, end);
      
      // Cache the result with 1 minute TTL (more frequent updates for real-time data)
      this.roleBasedDataService.setCachedData(cacheKey, paginatedData, 1 * 60 * 1000);
      
      this.widgetLoading.technicians = false;
      observer.next(paginatedData);
      observer.complete();
    });
  }
  
  /**
   * Load upcoming deadlines
   */
  private loadUpcomingDeadlines(): Observable<Deadline[]> {
    // Check cache first
    const cacheKey = `cm-deadlines-${this.market}`;
    const cached = this.roleBasedDataService.getCachedData<Deadline[]>(cacheKey);
    
    if (cached) {
      this.widgetLoading.deadlines = false;
      return new Observable<Deadline[]>(observer => {
        observer.next(cached);
        observer.complete();
      });
    }
    
    this.widgetLoading.deadlines = true;
    
    // TODO: Replace with actual API call when backend is ready
    // This would call:
    // return this.dashboardService.getUpcomingDeadlines(this.market);
    
    return new Observable<Deadline[]>(observer => {
      const now = new Date();
      const deadlines: Deadline[] = [
        {
          id: '1',
          title: 'Street Sheet Approval - Downtown Project',
          dueDate: new Date(now.getTime() + 4 * 60 * 60 * 1000), // 4 hours from now
          type: 'approval',
          priority: 'high'
        },
        {
          id: '2',
          title: 'Weekly Report Submission',
          dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
          type: 'report',
          priority: 'medium'
        },
        {
          id: '3',
          title: 'Project Milestone Review',
          dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
          type: 'project',
          priority: 'medium'
        }
      ];
      
      // Cache the result with 5 minute TTL
      this.roleBasedDataService.setCachedData(cacheKey, deadlines, 5 * 60 * 1000);
      
      this.widgetLoading.deadlines = false;
      observer.next(deadlines);
      observer.complete();
    });
  }
  
  /**
   * Handle page change for street sheets
   */
  onStreetSheetsPageChange(page: number): void {
    this.streetSheetsPagination.currentPage = page;
    this.loadDashboardData();
  }
  
  /**
   * Handle page change for approvals
   */
  onApprovalsPageChange(page: number): void {
    this.approvalsPagination.currentPage = page;
    this.loadDashboardData();
  }
  
  /**
   * Handle page change for technicians
   */
  onTechniciansPageChange(page: number): void {
    this.techniciansPagination.currentPage = page;
    this.loadDashboardData();
  }
  
  /**
   * Refresh dashboard metrics
   */
  refreshMetrics(): void {
    this.loadDashboardData();
  }
  
  /**
   * Handle date range change
   */
  onDateRangeChange(range: DateRange): void {
    this.selectedDateRange = range;
    this.loadDashboardData();
  }
  
  /**
   * Navigate to approvals page
   */
  navigateToApprovals(): void {
    this.router.navigate(['/field-resource-management/approvals']);
  }
  
  /**
   * Navigate to street sheets page
   */
  navigateToStreetSheets(): void {
    this.router.navigate(['/field-resource-management/jobs']);
  }
  
  /**
   * Navigate to street sheet detail
   */
  navigateToStreetSheetDetail(id: string): void {
    this.router.navigate(['/field-resource-management/jobs', id]);
  }
  
  /**
   * Navigate to approval detail
   */
  navigateToApprovalDetail(id: string): void {
    this.router.navigate(['/field-resource-management/approvals', id]);
  }
  
  /**
   * Navigate to technician detail
   */
  navigateToTechnicianDetail(id: string): void {
    this.router.navigate(['/field-resource-management/technicians', id]);
  }
  
  /**
   * Get default start date (30 days ago)
   */
  private getDefaultStartDate(): Date {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  }
  
  /**
   * Get empty metrics object
   */
  private getEmptyMetrics(): CMDashboardMetrics {
    return {
      activeProjects: 0,
      pendingTasks: 0,
      availableTechnicians: 0,
      resourceUtilization: 0,
      pendingApprovals: 0,
      overdueItems: 0
    };
  }
  
  /**
   * Get status color for badges
   */
  getStatusColor(status: string): string {
    const statusMap: Record<string, string> = {
      'In Progress': 'primary',
      'Pending Review': 'accent',
      'Completed': 'success',
      'Overdue': 'warn',
      'Cancelled': 'default'
    };
    return statusMap[status] || 'default';
  }
  
  /**
   * Get priority color for deadlines
   */
  getPriorityColor(priority: string): string {
    const priorityMap: Record<string, string> = {
      'high': 'warn',
      'medium': 'accent',
      'low': 'default'
    };
    return priorityMap[priority] || 'default';
  }
  
  /**
   * Get technician status icon
   */
  getTechnicianStatusIcon(status: string): string {
    const iconMap: Record<string, string> = {
      'available': 'check_circle',
      'on_job': 'work',
      'off_duty': 'cancel'
    };
    return iconMap[status] || 'help';
  }
  
  /**
   * Format relative time
   */
  formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }
  
  /**
   * Format time until deadline
   */
  formatTimeUntil(date: Date): string {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    
    if (diffHours < 0) return 'Overdue';
    if (diffHours < 24) return `${diffHours}h remaining`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d remaining`;
  }
}
