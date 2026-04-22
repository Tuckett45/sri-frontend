# Design Document: CM and Admin Role-Based Features

## Overview

This design specifies the implementation of comprehensive role-based features for Construction Manager (CM) and Administrator (Admin) roles across the Field Operations system. The system currently has basic role checking through `AuthService.isCM()` and `AuthService.isAdmin()` methods, but lacks comprehensive role-specific features for dashboards, access control, workflow management, and data operations.

The design introduces:
- Role-specific dashboard components with market-based filtering
- Enhanced guards and interceptors for granular access control
- Service layer enhancements for role-based data filtering
- Workflow management services for approval processes
- UI directives for role-based component visibility
- Admin-specific user and system management features

### Key Design Principles

1. **Defense in Depth**: Authorization enforced at multiple layers (UI, route guards, service layer, API)
2. **Market-Based Isolation**: CM users see only their assigned market data; Admins see all markets
3. **Separation of Concerns**: Role logic centralized in services, not scattered across components
4. **Backward Compatibility**: Existing `isCM()` and `isAdmin()` methods remain functional
5. **Extensibility**: Design supports adding new roles without major refactoring

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ CM Dashboard │  │Admin Dashboard│  │ Role-Based   │      │
│  │  Component   │  │   Component   │  │  Directives  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                      Guard Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   CM Guard   │  │  Admin Guard │  │  Role Guard  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Role-Based   │  │   Workflow   │  │  User Mgmt   │      │
│  │Data Service  │  │   Service    │  │   Service    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                    Interceptor Layer                         │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │ Market Filter│  │Authorization │                         │
│  │ Interceptor  │  │ Interceptor  │                         │
│  └──────────────┘  └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                       API Layer                              │
│         (Existing backend with role-based endpoints)         │
└─────────────────────────────────────────────────────────────┘
```

### Module Organization

The implementation will be distributed across existing modules:

1. **Shared Services** (`src/app/services/`):
   - Enhanced `AuthService` with additional role methods
   - New `RoleBasedDataService` for market filtering logic
   - New `WorkflowService` for approval processes
   - New `UserManagementService` for admin user operations

2. **ATLAS Module** (`src/app/features/atlas/`):
   - CM Dashboard component
   - Admin Dashboard component
   - Role-based guards for ATLAS routes
   - Enhanced services with role-aware filtering

3. **Field Resource Management Module** (`src/app/features/field-resource-management/`):
   - Enhanced existing guards (AdminGuard, DispatcherGuard)
   - Role-based data filtering in existing services
   - Workflow management components

4. **Shared Directives** (`src/app/directives/`):
   - `*roleBasedShow` structural directive
   - `*roleBasedDisable` directive

## Components and Interfaces

### 1. Role-Based Data Service

Central service for applying market-based filtering to data operations.

```typescript
interface MarketFilterOptions {
  includeAllMarkets?: boolean;  // Admin override
  specificMarket?: string;       // Explicit market filter
  excludeRGMarkets?: boolean;    // CM-specific filtering
}

interface RoleBasedQueryParams {
  market?: string;
  userId?: string;
  role?: UserRole;
  includeSubordinates?: boolean;
}

class RoleBasedDataService {
  constructor(
    private authService: AuthService
  ) {}

  /**
   * Apply market filtering based on current user's role
   */
  applyMarketFilter<T extends { market?: string }>(
    data: T[],
    options?: MarketFilterOptions
  ): T[];

  /**
   * Get query parameters with role-based filtering
   */
  getRoleBasedQueryParams(
    additionalParams?: Record<string, any>
  ): HttpParams;

  /**
   * Check if user can access data from specific market
   */
  canAccessMarket(market: string): boolean;

  /**
   * Get list of markets accessible to current user
   */
  getAccessibleMarkets(): string[];
}
```

### 2. Workflow Service

Manages approval processes and task routing.

```typescript
interface ApprovalTask {
  id: string;
  type: 'street_sheet' | 'daily_report' | 'punch_list' | 'resource_allocation';
  entityId: string;
  submittedBy: string;
  submittedAt: Date;
  currentApprover: string;
  approvalLevel: number;
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  market: string;
  comments: ApprovalComment[];
}

interface ApprovalComment {
  userId: string;
  userName: string;
  comment: string;
  timestamp: Date;
  action: 'comment' | 'approve' | 'reject' | 'request_changes';
}

interface WorkflowConfiguration {
  workflowType: string;
  approvalLevels: ApprovalLevel[];
  escalationRules: EscalationRule[];
  notificationSettings: NotificationSettings;
}

interface ApprovalLevel {
  level: number;
  requiredRole: UserRole;
  marketScoped: boolean;
  timeoutHours?: number;
}

class WorkflowService {
  /**
   * Get approval tasks for current user
   */
  getMyApprovalTasks(): Observable<ApprovalTask[]>;

  /**
   * Get all approval tasks (Admin only)
   */
  getAllApprovalTasks(filters?: ApprovalTaskFilters): Observable<ApprovalTask[]>;

  /**
   * Submit item for approval
   */
  submitForApproval(
    type: ApprovalTask['type'],
    entityId: string,
    metadata?: Record<string, any>
  ): Observable<ApprovalTask>;

  /**
   * Approve a task
   */
  approveTask(
    taskId: string,
    comment?: string
  ): Observable<ApprovalTask>;

  /**
   * Reject a task
   */
  rejectTask(
    taskId: string,
    reason: string
  ): Observable<ApprovalTask>;

  /**
   * Request changes to a task
   */
  requestChanges(
    taskId: string,
    changes: string
  ): Observable<ApprovalTask>;

  /**
   * Escalate a task (Admin only)
   */
  escalateTask(
    taskId: string,
    reason: string
  ): Observable<ApprovalTask>;

  /**
   * Get workflow configuration (Admin only)
   */
  getWorkflowConfiguration(
    workflowType: string
  ): Observable<WorkflowConfiguration>;

  /**
   * Update workflow configuration (Admin only)
   */
  updateWorkflowConfiguration(
    config: WorkflowConfiguration
  ): Observable<WorkflowConfiguration>;
}
```

### 3. User Management Service

Admin-specific service for managing users and roles.

```typescript
interface UserManagementFilters {
  role?: UserRole;
  market?: string;
  isApproved?: boolean;
  searchTerm?: string;
}

interface UserUpdateRequest {
  userId: string;
  updates: Partial<User>;
  reason?: string;
}

interface BulkUserOperation {
  operation: 'activate' | 'deactivate' | 'change_role' | 'change_market';
  userIds: string[];
  newValue?: any;
  reason: string;
}

class UserManagementService {
  /**
   * Get all users with filtering (Admin only)
   */
  getUsers(filters?: UserManagementFilters): Observable<User[]>;

  /**
   * Create new user (Admin only)
   */
  createUser(user: Partial<User>): Observable<User>;

  /**
   * Update user (Admin only)
   */
  updateUser(request: UserUpdateRequest): Observable<User>;

  /**
   * Deactivate user (Admin only)
   */
  deactivateUser(userId: string, reason: string): Observable<void>;

  /**
   * Reset user password (Admin only)
   */
  resetUserPassword(userId: string): Observable<{ temporaryPassword: string }>;

  /**
   * Bulk user operations (Admin only)
   */
  executeBulkOperation(operation: BulkUserOperation): Observable<BulkOperationResult>;

  /**
   * Get user audit log (Admin only)
   */
  getUserAuditLog(userId: string): Observable<AuditLogEntry[]>;
}
```

### 4. Dashboard Components

#### CM Dashboard Component

```typescript
interface CMDashboardMetrics {
  activeProjects: number;
  pendingTasks: number;
  availableTechnicians: number;
  resourceUtilization: number;
  pendingApprovals: number;
  overdueItems: number;
}

interface CMDashboardData {
  metrics: CMDashboardMetrics;
  recentStreetSheets: StreetSheet[];
  pendingApprovals: ApprovalTask[];
  technicianStatus: TechnicianStatus[];
  upcomingDeadlines: Deadline[];
}

@Component({
  selector: 'app-cm-dashboard',
  templateUrl: './cm-dashboard.component.html',
  styleUrls: ['./cm-dashboard.component.scss']
})
class CMDashboardComponent implements OnInit {
  dashboardData$: Observable<CMDashboardData>;
  selectedDateRange: DateRange;
  market: string;

  constructor(
    private authService: AuthService,
    private roleBasedDataService: RoleBasedDataService,
    private workflowService: WorkflowService,
    private streetSheetService: StreetSheetService,
    private technicianService: TechnicianService
  ) {}

  ngOnInit(): void {
    this.market = this.authService.getUser().market;
    this.loadDashboardData();
  }

  loadDashboardData(): void;
  refreshMetrics(): void;
  navigateToApprovals(): void;
  navigateToStreetSheets(): void;
}
```

#### Admin Dashboard Component

```typescript
interface AdminDashboardMetrics {
  totalActiveProjects: number;
  systemWidePendingTasks: number;
  totalTechnicians: number;
  overallResourceUtilization: number;
  pendingUserApprovals: number;
  escalatedApprovals: number;
  marketMetrics: MarketMetrics[];
}

interface MarketMetrics {
  market: string;
  activeProjects: number;
  utilization: number;
  pendingApprovals: number;
}

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
class AdminDashboardComponent implements OnInit {
  dashboardData$: Observable<AdminDashboardData>;
  selectedMarket: string | null = null;
  selectedDateRange: DateRange;

  constructor(
    private authService: AuthService,
    private workflowService: WorkflowService,
    private userManagementService: UserManagementService,
    private reportingService: ReportingService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void;
  filterByMarket(market: string | null): void;
  navigateToUserManagement(): void;
  navigateToSystemConfiguration(): void;
  viewMarketDetails(market: string): void;
}
```

### 5. Role-Based Guards

#### CM Guard

```typescript
@Injectable({ providedIn: 'root' })
class CMGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    if (this.authService.isUserInRole([UserRole.CM, UserRole.Admin])) {
      return true;
    }

    this.router.navigate(['/unauthorized'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }
}
```

#### Enhanced Role Guard with Market Validation

```typescript
interface RoleGuardConfig {
  allowedRoles: UserRole[];
  requireMarketMatch?: boolean;
  marketParam?: string;
}

@Injectable({ providedIn: 'root' })
class EnhancedRoleGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private roleBasedDataService: RoleBasedDataService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    const config: RoleGuardConfig = route.data['roleGuard'];
    
    // Check role
    if (!this.authService.isUserInRole(config.allowedRoles)) {
      this.router.navigate(['/unauthorized']);
      return false;
    }

    // Check market access if required
    if (config.requireMarketMatch) {
      const marketParam = route.params[config.marketParam || 'market'];
      if (marketParam && !this.roleBasedDataService.canAccessMarket(marketParam)) {
        this.router.navigate(['/unauthorized']);
        return false;
      }
    }

    return true;
  }
}
```

### 6. Role-Based Directives

#### Role-Based Show Directive

```typescript
@Directive({
  selector: '[roleBasedShow]'
})
class RoleBasedShowDirective implements OnInit, OnDestroy {
  @Input() roleBasedShow: UserRole | UserRole[];
  @Input() roleBasedShowMarket?: string;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private authService: AuthService,
    private roleBasedDataService: RoleBasedDataService
  ) {}

  ngOnInit(): void {
    this.updateView();
  }

  private updateView(): void {
    const roles = Array.isArray(this.roleBasedShow) 
      ? this.roleBasedShow 
      : [this.roleBasedShow];

    const hasRole = this.authService.isUserInRole(roles);
    const hasMarketAccess = !this.roleBasedShowMarket || 
      this.roleBasedDataService.canAccessMarket(this.roleBasedShowMarket);

    if (hasRole && hasMarketAccess) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }
}
```

### 7. Market Filter Interceptor

Automatically applies market filtering to outgoing requests.

```typescript
@Injectable()
class MarketFilterInterceptor implements HttpInterceptor {
  constructor(
    private authService: AuthService,
    private roleBasedDataService: RoleBasedDataService
  ) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // Skip if Admin or if market already specified
    if (this.authService.isAdmin() || req.params.has('market')) {
      return next.handle(req);
    }

    // Apply market filter for CM users on specific endpoints
    if (this.shouldApplyMarketFilter(req.url)) {
      const user = this.authService.getUser();
      const modifiedReq = req.clone({
        params: req.params.set('market', user.market)
      });
      return next.handle(modifiedReq);
    }

    return next.handle(req);
  }

  private shouldApplyMarketFilter(url: string): boolean {
    const marketFilteredEndpoints = [
      '/street-sheet',
      '/preliminary-punch-list',
      '/daily-report',
      '/technician',
      '/assignment'
    ];

    return marketFilteredEndpoints.some(endpoint => url.includes(endpoint));
  }
}
```

## Data Models

### Enhanced User Model

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  market: string;
  company: string;
  createdDate: Date;
  isApproved: boolean;
  approvalToken?: string;
  
  // New fields for enhanced role management
  isActive?: boolean;
  lastLoginDate?: Date;
  permissions?: Permission[];
  subordinateMarkets?: string[];  // For regional managers
  notificationPreferences?: NotificationPreferences;
}

interface Permission {
  resource: string;
  actions: ('create' | 'read' | 'update' | 'delete')[];
  scope: 'own' | 'market' | 'all';
}

interface NotificationPreferences {
  email: boolean;
  inApp: boolean;
  sms: boolean;
  approvalReminders: boolean;
  escalationAlerts: boolean;
  dailyDigest: boolean;
}
```

### Approval Models

```typescript
interface ApprovalWorkflow {
  id: string;
  workflowType: string;
  name: string;
  description: string;
  levels: ApprovalLevel[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ApprovalHistory {
  taskId: string;
  entityId: string;
  entityType: string;
  submittedBy: string;
  submittedAt: Date;
  completedAt?: Date;
  finalStatus: 'approved' | 'rejected';
  approvalChain: ApprovalAction[];
}

interface ApprovalAction {
  level: number;
  approverId: string;
  approverName: string;
  action: 'approved' | 'rejected' | 'requested_changes';
  comment?: string;
  timestamp: Date;
}
```

### Dashboard Models

```typescript
interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'list';
  title: string;
  data: any;
  refreshInterval?: number;
  allowedRoles: UserRole[];
}

interface DashboardConfiguration {
  userId: string;
  role: UserRole;
  widgets: DashboardWidget[];
  layout: WidgetLayout[];
  lastModified: Date;
}

interface WidgetLayout {
  widgetId: string;
  position: { row: number; col: number };
  size: { rows: number; cols: number };
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

