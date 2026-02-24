import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable, Subject, interval, combineLatest } from 'rxjs';
import { takeUntil, map, startWith } from 'rxjs/operators';
import { AuthService } from '../../../../../services/auth.service';
import { RoleBasedDataService } from '../../../../../services/role-based-data.service';
import { WorkflowService } from '../../../../../services/workflow.service';
import { UserManagementService } from '../../../../../services/user-management.service';
import { ApprovalTask } from '../../../../../models/workflow.model';
import { User } from '../../../../../models/user.model';

/**
 * System-wide metrics for Admin dashboard
 */
export interface AdminDashboardMetrics {
  totalActiveProjects: number;
  systemWidePendingTasks: number;
  totalTechnicians: number;
  overallResourceUtilization: number;
  pendingUserApprovals: number;
  escalatedApprovals: number;
  marketMetrics: MarketMetrics[];
}

/**
 * Market-specific metrics for comparison
 */
export interface MarketMetrics {
  market: string;
  activeProjects: number;
  utilization: number;
  pendingApprovals: number;
  technicians: number;
}

/**
 * Pending user approval summary
 */
export interface PendingUserApproval {
  id: string;
  name: string;
  email: string;
  role: string;
  market: string;
  requestedDate: Date;
}

/**
 * Date range for filtering
 */
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Complete Admin dashboard data structure
 */
export interface AdminDashboardData {
  metrics: AdminDashboardMetrics;
  pendingUserApprovals: PendingUserApproval[];
  escalatedApprovals: ApprovalTask[];
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
  userApprovals: boolean;
  escalatedApprovals: boolean;
  marketComparison: boolean;
}

/**
 * Admin Dashboard Component
 * 
 * Displays Administrator-specific dashboard with:
 * - System-wide metrics across all markets
 * - Market-by-market comparison view
 * - Pending user approvals
 * - Escalated approval tasks
 * - Market drill-down functionality
 * - Executive KPI widgets
 * - Navigation to user management and system configuration
 */
@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Dashboard data
  dashboardData$!: Observable<AdminDashboardData>;
  loading = false;
  error: string | null = null;
  
  // Widget loading states for skeleton screens
  widgetLoading: WidgetLoadingState = {
    metrics: false,
    userApprovals: false,
    escalatedApprovals: false,
    marketComparison: false
  };
  
  // Pagination for data tables
  userApprovalsPagination: PaginationConfig = {
    pageSize: 10,
    currentPage: 0,
    totalItems: 0
  };
  
  escalatedApprovalsPagination: PaginationConfig = {
    pageSize: 10,
    currentPage: 0,
    totalItems: 0
  };
  
  // User context
  userName: string = '';
  
  // Market filtering
  selectedMarket: string | null = null;
  availableMarkets: string[] = [];
  
  // Date range for filtering
  selectedDateRange: DateRange = {
    startDate: this.getDefaultStartDate(),
    endDate: new Date()
  };
  
  // Auto-refresh settings
  autoRefreshEnabled = true;
  refreshIntervalMinutes = 5;
  
  // Market comparison chart data
  marketComparisonData: any[] = [];
  
  // Lazy loading flags
  private metricsLoaded = false;
  private userApprovalsLoaded = false;
  private escalatedApprovalsLoaded = false;
  
  constructor(
    private authService: AuthService,
    private workflowService: WorkflowService,
    private userManagementService: UserManagementService,
    private roleBasedDataService: RoleBasedDataService
  ) {}
  
  ngOnInit(): void {
    // Verify admin access
    if (!this.authService.isAdmin()) {
      this.error = 'Access denied. Admin privileges required.';
      return;
    }
    
    // Get user context
    const user = this.authService.getUser();
    if (user) {
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
      
      // Create observable that combines all data sources with lazy loading
      this.dashboardData$ = combineLatest([
        metrics$,
        this.loadPendingUserApprovalsLazy(),
        this.loadEscalatedApprovalsLazy()
      ]).pipe(
        map(([metrics, userApprovals, escalatedApprovals]) => {
          // Extract available markets from metrics
          this.availableMarkets = metrics.marketMetrics.map(m => m.market);
          
          // Prepare market comparison data for charts
          this.marketComparisonData = this.prepareMarketComparisonData(metrics.marketMetrics);
          
          return {
            metrics,
            pendingUserApprovals: userApprovals,
            escalatedApprovals: escalatedApprovals
          };
        }),
        startWith({
          metrics: this.getEmptyMetrics(),
          pendingUserApprovals: [],
          escalatedApprovals: []
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
   * Lazy load pending user approvals (only when widget is visible)
   */
  private loadPendingUserApprovalsLazy(): Observable<PendingUserApproval[]> {
    if (!this.userApprovalsLoaded) {
      return new Observable<PendingUserApproval[]>(observer => {
        observer.next([]);
        observer.complete();
      });
    }
    return this.loadPendingUserApprovals();
  }
  
  /**
   * Lazy load escalated approvals (only when widget is visible)
   */
  private loadEscalatedApprovalsLazy(): Observable<ApprovalTask[]> {
    if (!this.escalatedApprovalsLoaded) {
      return new Observable<ApprovalTask[]>(observer => {
        observer.next([]);
        observer.complete();
      });
    }
    return this.loadEscalatedApprovals();
  }
  
  /**
   * Trigger loading of a specific widget
   */
  loadWidget(widget: keyof WidgetLoadingState): void {
    switch (widget) {
      case 'userApprovals':
        if (!this.userApprovalsLoaded) {
          this.userApprovalsLoaded = true;
          this.widgetLoading.userApprovals = true;
          this.loadDashboardData();
        }
        break;
      case 'escalatedApprovals':
        if (!this.escalatedApprovalsLoaded) {
          this.escalatedApprovalsLoaded = true;
          this.widgetLoading.escalatedApprovals = true;
          this.loadDashboardData();
        }
        break;
      case 'marketComparison':
        this.widgetLoading.marketComparison = true;
        // Market comparison is loaded with metrics
        break;
    }
  }
  
  /**
   * Load system-wide metrics
   */
  private loadMetrics(): Observable<AdminDashboardMetrics> {
    // Check cache first
    const cacheKey = `admin-metrics-${this.selectedMarket || 'all'}-${this.selectedDateRange.startDate.toISOString()}-${this.selectedDateRange.endDate.toISOString()}`;
    const cached = this.roleBasedDataService.getCachedData<AdminDashboardMetrics>(cacheKey);
    
    if (cached) {
      this.widgetLoading.metrics = false;
      return new Observable<AdminDashboardMetrics>(observer => {
        observer.next(cached);
        observer.complete();
      });
    }
    
    this.widgetLoading.metrics = true;
    
    // TODO: Replace with actual API call when backend is ready
    // This would call a service method like:
    // return this.dashboardService.getAdminMetrics(this.selectedDateRange, this.selectedMarket);
    
    return new Observable<AdminDashboardMetrics>(observer => {
      // Mock data for now
      const marketMetrics: MarketMetrics[] = [
        {
          market: 'North',
          activeProjects: 15,
          utilization: 82.5,
          pendingApprovals: 3,
          technicians: 25
        },
        {
          market: 'South',
          activeProjects: 12,
          utilization: 75.0,
          pendingApprovals: 5,
          technicians: 20
        },
        {
          market: 'East',
          activeProjects: 18,
          utilization: 88.0,
          pendingApprovals: 2,
          technicians: 30
        },
        {
          market: 'West',
          activeProjects: 10,
          utilization: 70.5,
          pendingApprovals: 4,
          technicians: 18
        },
        {
          market: 'RG-Central',
          activeProjects: 8,
          utilization: 65.0,
          pendingApprovals: 1,
          technicians: 15
        }
      ];
      
      // Calculate totals
      const metrics: AdminDashboardMetrics = {
        totalActiveProjects: marketMetrics.reduce((sum, m) => sum + m.activeProjects, 0),
        systemWidePendingTasks: 42, // Mock value
        totalTechnicians: marketMetrics.reduce((sum, m) => sum + m.technicians, 0),
        overallResourceUtilization: marketMetrics.reduce((sum, m) => sum + m.utilization, 0) / marketMetrics.length,
        pendingUserApprovals: 3,
        escalatedApprovals: 2,
        marketMetrics: marketMetrics
      };
      
      // Cache the result with 3 minute TTL
      this.roleBasedDataService.setCachedData(cacheKey, metrics, 3 * 60 * 1000);
      
      this.widgetLoading.metrics = false;
      observer.next(metrics);
      observer.complete();
    });
  }
  
  /**
   * Load pending user approvals
   */
  private loadPendingUserApprovals(): Observable<PendingUserApproval[]> {
    this.widgetLoading.userApprovals = true;
    
    return this.userManagementService.getUsers({ isApproved: false }).pipe(
      map(users => {
        const approvals = users.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          market: user.market,
          requestedDate: user.createdDate
        }));
        
        // Apply pagination
        this.userApprovalsPagination.totalItems = approvals.length;
        const start = this.userApprovalsPagination.currentPage * this.userApprovalsPagination.pageSize;
        const end = start + this.userApprovalsPagination.pageSize;
        
        this.widgetLoading.userApprovals = false;
        return approvals.slice(start, end);
      }),
      takeUntil(this.destroy$)
    );
  }
  
  /**
   * Load escalated approval tasks
   */
  private loadEscalatedApprovals(): Observable<ApprovalTask[]> {
    this.widgetLoading.escalatedApprovals = true;
    
    return this.workflowService.getAllApprovalTasks({ status: 'escalated' }).pipe(
      map(tasks => {
        // Apply pagination
        this.escalatedApprovalsPagination.totalItems = tasks.length;
        const start = this.escalatedApprovalsPagination.currentPage * this.escalatedApprovalsPagination.pageSize;
        const end = start + this.escalatedApprovalsPagination.pageSize;
        
        this.widgetLoading.escalatedApprovals = false;
        return tasks.slice(start, end);
      }),
      takeUntil(this.destroy$)
    );
  }
  
  /**
   * Handle page change for user approvals
   */
  onUserApprovalsPageChange(page: number): void {
    this.userApprovalsPagination.currentPage = page;
    this.loadDashboardData();
  }
  
  /**
   * Handle page change for escalated approvals
   */
  onEscalatedApprovalsPageChange(page: number): void {
    this.escalatedApprovalsPagination.currentPage = page;
    this.loadDashboardData();
  }
  
  /**
   * Prepare market comparison data for visualization
   */
  private prepareMarketComparisonData(marketMetrics: MarketMetrics[]): any[] {
    return marketMetrics.map(market => ({
      name: market.market,
      projects: market.activeProjects,
      utilization: market.utilization,
      approvals: market.pendingApprovals,
      technicians: market.technicians
    }));
  }
  
  /**
   * Refresh dashboard metrics
   */
  refreshMetrics(): void {
    this.loadDashboardData();
  }
  
  /**
   * Filter dashboard by specific market
   */
  filterByMarket(market: string | null): void {
    this.selectedMarket = market;
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
   * Navigate to user management page
   */
  navigateToUserManagement(): void {
    // TODO: Implement navigation when routing is set up
    console.log('Navigate to user management');
  }
  
  /**
   * Navigate to system configuration page
   */
  navigateToSystemConfiguration(): void {
    // TODO: Implement navigation when routing is set up
    console.log('Navigate to system configuration');
  }
  
  /**
   * View detailed metrics for a specific market
   */
  viewMarketDetails(market: string): void {
    // TODO: Implement navigation when routing is set up
    console.log('View market details:', market);
  }
  
  /**
   * Navigate to user approval detail
   */
  navigateToUserApprovalDetail(userId: string): void {
    // TODO: Implement navigation when routing is set up
    console.log('Navigate to user approval:', userId);
  }
  
  /**
   * Navigate to escalated approval detail
   */
  navigateToEscalatedApprovalDetail(approvalId: string): void {
    // TODO: Implement navigation when routing is set up
    console.log('Navigate to escalated approval:', approvalId);
  }
  
  /**
   * Approve user account
   */
  approveUser(userId: string): void {
    this.authService.approveUser(userId).subscribe({
      next: () => {
        console.log('User approved:', userId);
        this.loadDashboardData(); // Refresh data
      },
      error: (err) => {
        console.error('Error approving user:', err);
        this.error = 'Failed to approve user';
      }
    });
  }
  
  /**
   * Reject user account
   */
  rejectUser(userId: string, reason: string): void {
    this.authService.rejectUser(userId, reason).subscribe({
      next: () => {
        console.log('User rejected:', userId);
        this.loadDashboardData(); // Refresh data
      },
      error: (err) => {
        console.error('Error rejecting user:', err);
        this.error = 'Failed to reject user';
      }
    });
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
  private getEmptyMetrics(): AdminDashboardMetrics {
    return {
      totalActiveProjects: 0,
      systemWidePendingTasks: 0,
      totalTechnicians: 0,
      overallResourceUtilization: 0,
      pendingUserApprovals: 0,
      escalatedApprovals: 0,
      marketMetrics: []
    };
  }
  
  /**
   * Get utilization color based on percentage
   */
  getUtilizationColor(utilization: number): string {
    if (utilization >= 80) return 'success';
    if (utilization >= 60) return 'accent';
    return 'warn';
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
   * Get market performance indicator
   */
  getMarketPerformanceIndicator(utilization: number): string {
    if (utilization >= 80) return 'Excellent';
    if (utilization >= 70) return 'Good';
    if (utilization >= 60) return 'Fair';
    return 'Needs Attention';
  }
}
