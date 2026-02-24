# Developer Guide: CM and Admin Role-Based Features

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [RoleBasedDataService Usage](#rolebaseddataservice-usage)
3. [Guard Configuration](#guard-configuration)
4. [Directive Usage](#directive-usage)
5. [Service Integration Patterns](#service-integration-patterns)
6. [Testing Strategies](#testing-strategies)
7. [Market Filtering Rules](#market-filtering-rules)

---

## Architecture Overview

The role-based feature system implements defense-in-depth authorization across multiple layers:

```
UI Layer (Directives) → Route Guards → Service Layer → Interceptors → API
```

### Key Components

- **RoleBasedDataService**: Central service for market filtering logic
- **Guards**: Route-level authorization (CMGuard, EnhancedRoleGuard)
- **Directives**: UI-level visibility control (*roleBasedShow, *roleBasedDisable)
- **Interceptors**: HTTP request/response processing (MarketFilterInterceptor, AuthorizationInterceptor)
- **Services**: Business logic with role-aware operations

### Design Principles

1. **Defense in Depth**: Authorization at UI, route, service, and API layers
2. **Market-Based Isolation**: CM users see only assigned market data
3. **Centralized Logic**: Role logic in services, not scattered in components
4. **Backward Compatibility**: Existing AuthService methods remain functional
5. **Extensibility**: Easy to add new roles without major refactoring

---

## RoleBasedDataService Usage

### Purpose

`RoleBasedDataService` centralizes market-based filtering logic for role-aware data operations.

### Importing the Service

```typescript
import { RoleBasedDataService } from '@app/services/role-based-data.service';

constructor(private roleBasedDataService: RoleBasedDataService) {}
```


### Core Methods

#### applyMarketFilter()

Filters an array of data based on the current user's market access.

**Signature**
```typescript
applyMarketFilter<T extends { market?: string }>(
  data: T[],
  options?: MarketFilterOptions
): T[]
```

**Parameters**
- `data`: Array of objects with optional `market` property
- `options`: Optional filtering configuration
  - `includeAllMarkets`: Override to include all markets (Admin)
  - `specificMarket`: Filter to a specific market
  - `excludeRGMarkets`: Exclude RG markets (CM street sheets)

**Usage Example**
```typescript
// In a component or service
getStreetSheets(): Observable<StreetSheet[]> {
  return this.http.get<StreetSheet[]>('/api/street-sheets').pipe(
    map(sheets => this.roleBasedDataService.applyMarketFilter(sheets, {
      excludeRGMarkets: true  // CM-specific filtering
    }))
  );
}
```

#### getRoleBasedQueryParams()

Generates HTTP query parameters with role-based filtering.

**Signature**
```typescript
getRoleBasedQueryParams(
  additionalParams?: Record<string, any>
): HttpParams
```

**Parameters**
- `additionalParams`: Additional query parameters to include

**Returns**
- `HttpParams` object with role-based filtering applied

**Usage Example**
```typescript
getDailyReports(startDate: Date, endDate: Date): Observable<DailyReport[]> {
  const params = this.roleBasedDataService.getRoleBasedQueryParams({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  });
  
  return this.http.get<DailyReport[]>('/api/daily-reports', { params });
}
```

#### canAccessMarket()

Checks if the current user can access data from a specific market.

**Signature**
```typescript
canAccessMarket(market: string): boolean
```

**Parameters**
- `market`: Market code to check access for

**Returns**
- `true` if user can access the market, `false` otherwise

**Usage Example**
```typescript
// In a guard or component
if (!this.roleBasedDataService.canAccessMarket(routeMarket)) {
  this.router.navigate(['/unauthorized']);
  return false;
}
```

#### getAccessibleMarkets()

Returns list of markets accessible to the current user.

**Signature**
```typescript
getAccessibleMarkets(): string[]
```

**Returns**
- Array of market codes the user can access

**Usage Example**
```typescript
// Populate a market dropdown
ngOnInit(): void {
  this.availableMarkets = this.roleBasedDataService.getAccessibleMarkets();
}
```

### Integration Pattern

**Standard Service Integration**

```typescript
@Injectable({ providedIn: 'root' })
export class MyDataService {
  constructor(
    private http: HttpClient,
    private roleBasedDataService: RoleBasedDataService
  ) {}

  // Pattern 1: Client-side filtering
  getData(): Observable<MyData[]> {
    return this.http.get<MyData[]>('/api/my-data').pipe(
      map(data => this.roleBasedDataService.applyMarketFilter(data))
    );
  }

  // Pattern 2: Server-side filtering with query params
  getDataFiltered(): Observable<MyData[]> {
    const params = this.roleBasedDataService.getRoleBasedQueryParams();
    return this.http.get<MyData[]>('/api/my-data', { params });
  }

  // Pattern 3: Validation before operations
  updateData(id: string, market: string, updates: Partial<MyData>): Observable<MyData> {
    if (!this.roleBasedDataService.canAccessMarket(market)) {
      return throwError(() => new Error('Access denied to market'));
    }
    return this.http.put<MyData>(`/api/my-data/${id}`, updates);
  }
}
```

---

## Guard Configuration

### Available Guards

1. **CMGuard**: Allows CM and Admin roles
2. **AdminGuard**: Allows Admin role only
3. **EnhancedRoleGuard**: Configurable role and market validation

### CMGuard

**Purpose**: Protect routes that require CM or Admin access

**Usage**
```typescript
// In routing module
const routes: Routes = [
  {
    path: 'cm-dashboard',
    component: CMDashboardComponent,
    canActivate: [CMGuard]
  }
];
```

**Behavior**
- Allows users with CM or Admin role
- Redirects unauthorized users to `/unauthorized`
- Preserves return URL for post-login redirect

### AdminGuard

**Purpose**: Protect routes that require Admin access only

**Usage**
```typescript
const routes: Routes = [
  {
    path: 'admin/users',
    component: UserManagementComponent,
    canActivate: [AdminGuard]
  }
];
```

### EnhancedRoleGuard

**Purpose**: Configurable guard with role and market validation

**Configuration via Route Data**

```typescript
interface RoleGuardConfig {
  allowedRoles: UserRole[];
  requireMarketMatch?: boolean;
  marketParam?: string;
}
```

**Usage Example 1: Role-Only Validation**
```typescript
const routes: Routes = [
  {
    path: 'reports',
    component: ReportsComponent,
    canActivate: [EnhancedRoleGuard],
    data: {
      roleGuard: {
        allowedRoles: [UserRole.CM, UserRole.Admin]
      }
    }
  }
];
```

**Usage Example 2: Role + Market Validation**
```typescript
const routes: Routes = [
  {
    path: 'market/:marketId/projects',
    component: ProjectListComponent,
    canActivate: [EnhancedRoleGuard],
    data: {
      roleGuard: {
        allowedRoles: [UserRole.CM, UserRole.Admin],
        requireMarketMatch: true,
        marketParam: 'marketId'  // Route parameter name
      }
    }
  }
];
```

**Behavior**
- Validates user has one of the allowed roles
- Optionally validates user can access the market specified in route parameter
- Admins bypass market validation
- Redirects unauthorized users to `/unauthorized`

### Guard Best Practices

1. **Use specific guards for common patterns**: CMGuard for CM routes, AdminGuard for admin routes
2. **Use EnhancedRoleGuard for complex scenarios**: Multiple roles or market validation
3. **Always configure route data**: Provide clear roleGuard configuration
4. **Test guard behavior**: Write unit tests for custom guard configurations

---

## Directive Usage

### *roleBasedShow Directive

**Purpose**: Conditionally render elements based on user role and market access

**Import**
```typescript
import { RoleBasedShowDirective } from '@app/directives/role-based-show.directive';

// In component module
imports: [RoleBasedShowDirective]
```

**Basic Usage**
```typescript
<!-- Show only to CM users -->
<button *roleBasedShow="UserRole.CM">CM Action</button>

<!-- Show to CM or Admin users -->
<button *roleBasedShow="[UserRole.CM, UserRole.Admin]">Action</button>

<!-- Show only to Admin users -->
<div *roleBasedShow="UserRole.Admin">
  <h3>Admin Panel</h3>
</div>
```

**Market-Based Visibility**
```typescript
<!-- Show only if user can access specific market -->
<div *roleBasedShow="UserRole.CM; market: 'NYC'">
  NYC Market Content
</div>

<!-- Show to Admin or CM with market access -->
<button *roleBasedShow="[UserRole.CM, UserRole.Admin]; market: selectedMarket">
  View Market Details
</button>
```

**Dynamic Role Arrays**
```typescript
// In component
allowedRoles = [UserRole.CM, UserRole.Admin];

// In template
<div *roleBasedShow="allowedRoles">
  Content for CM or Admin
</div>
```

### *roleBasedDisable Directive

**Purpose**: Conditionally disable elements based on user role

**Import**
```typescript
import { RoleBasedDisableDirective } from '@app/directives/role-based-disable.directive';

// In component module
imports: [RoleBasedDisableDirective]
```

**Usage**
```typescript
<!-- Disable for CM users (only Admin can use) -->
<button roleBasedDisable="UserRole.CM">Delete All</button>

<!-- Disable for multiple roles -->
<input roleBasedDisable="[UserRole.CM, UserRole.Technician]" />

<!-- Enable only for Admin (disable for all others) -->
<button [roleBasedDisable]="nonAdminRoles">System Config</button>
```

**Behavior**
- Adds `disabled` attribute to the element
- Applies visual styling (opacity, cursor)
- Shows tooltip explaining why element is disabled
- Works with buttons, inputs, and other form controls

### Directive Best Practices

1. **Use *roleBasedShow for complete hiding**: When users shouldn't know feature exists
2. **Use roleBasedDisable for contextual disabling**: When users should see but not use feature
3. **Combine with guards**: Directives are UI-only, always use guards for route protection
4. **Test visibility logic**: Write unit tests for complex role combinations

---

## Service Integration Patterns

### Pattern 1: Enhancing Existing Services

When adding role-based filtering to existing services:

```typescript
@Injectable({ providedIn: 'root' })
export class StreetSheetService {
  constructor(
    private http: HttpClient,
    private roleBasedDataService: RoleBasedDataService,
    private authService: AuthService
  ) {}

  // Before: No filtering
  // getStreetSheets(): Observable<StreetSheet[]> {
  //   return this.http.get<StreetSheet[]>('/api/street-sheets');
  // }

  // After: With role-based filtering
  getStreetSheets(): Observable<StreetSheet[]> {
    return this.http.get<StreetSheet[]>('/api/street-sheets').pipe(
      map(sheets => this.roleBasedDataService.applyMarketFilter(sheets, {
        excludeRGMarkets: this.authService.isCM()  // CM-specific rule
      }))
    );
  }

  // Create operations: Associate with user's market
  createStreetSheet(sheet: Partial<StreetSheet>): Observable<StreetSheet> {
    const user = this.authService.getUser();
    const sheetWithMarket = {
      ...sheet,
      market: user.market,
      createdBy: user.id
    };
    return this.http.post<StreetSheet>('/api/street-sheets', sheetWithMarket);
  }

  // Update operations: Validate market ownership
  updateStreetSheet(id: string, updates: Partial<StreetSheet>): Observable<StreetSheet> {
    // For CM users, validate they own the market
    if (this.authService.isCM()) {
      return this.http.get<StreetSheet>(`/api/street-sheets/${id}`).pipe(
        switchMap(sheet => {
          if (!this.roleBasedDataService.canAccessMarket(sheet.market)) {
            return throwError(() => new Error('Cannot update street sheet from another market'));
          }
          return this.http.put<StreetSheet>(`/api/street-sheets/${id}`, updates);
        })
      );
    }
    
    // Admin can update any market
    return this.http.put<StreetSheet>(`/api/street-sheets/${id}`, updates);
  }
}
```

### Pattern 2: Creating Role-Specific Services

For Admin-only services:

```typescript
@Injectable({ providedIn: 'root' })
export class UserManagementService {
  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // Guard all methods with Admin check
  getUsers(filters?: UserManagementFilters): Observable<User[]> {
    if (!this.authService.isAdmin()) {
      return throwError(() => new Error('Admin access required'));
    }
    
    const params = new HttpParams({ fromObject: filters as any });
    return this.http.get<User[]>('/api/admin/users', { params });
  }

  createUser(user: Partial<User>): Observable<User> {
    if (!this.authService.isAdmin()) {
      return throwError(() => new Error('Admin access required'));
    }
    
    return this.http.post<User>('/api/admin/users', user);
  }
}
```


### Pattern 3: Workflow Services

Services managing approval workflows:

```typescript
@Injectable({ providedIn: 'root' })
export class WorkflowService {
  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private roleBasedDataService: RoleBasedDataService
  ) {}

  // Role-aware method: Returns different data based on role
  getMyApprovalTasks(): Observable<ApprovalTask[]> {
    if (this.authService.isAdmin()) {
      // Admin sees all tasks
      return this.http.get<ApprovalTask[]>('/api/approvals/all');
    } else {
      // CM sees only their market's tasks
      const params = this.roleBasedDataService.getRoleBasedQueryParams();
      return this.http.get<ApprovalTask[]>('/api/approvals/my-tasks', { params });
    }
  }

  // Admin-only method with explicit check
  escalateTask(taskId: string, reason: string): Observable<ApprovalTask> {
    if (!this.authService.isAdmin()) {
      return throwError(() => new Error('Only Admins can escalate tasks'));
    }
    
    return this.http.post<ApprovalTask>(`/api/approvals/${taskId}/escalate`, { reason });
  }
}
```

### Integration Checklist

When integrating RoleBasedDataService into existing services:

- [ ] Import RoleBasedDataService in constructor
- [ ] Apply market filtering to GET operations
- [ ] Associate created entities with user's market
- [ ] Validate market ownership on UPDATE operations
- [ ] Validate market ownership on DELETE operations
- [ ] Handle Admin bypass for all operations
- [ ] Add error handling for unauthorized access
- [ ] Update unit tests to cover role-based scenarios

---

## Guard Configuration

### Route Protection Setup

#### Step 1: Import Guards

```typescript
import { CMGuard } from '@app/guards/cm.guard';
import { AdminGuard } from '@app/guards/admin.guard';
import { EnhancedRoleGuard } from '@app/guards/enhanced-role.guard';
```

#### Step 2: Configure Routes

```typescript
const routes: Routes = [
  // CM-only route
  {
    path: 'cm-dashboard',
    component: CMDashboardComponent,
    canActivate: [CMGuard]
  },
  
  // Admin-only route
  {
    path: 'admin/users',
    component: UserManagementComponent,
    canActivate: [AdminGuard]
  },
  
  // Multiple roles allowed
  {
    path: 'reports',
    component: ReportsComponent,
    canActivate: [EnhancedRoleGuard],
    data: {
      roleGuard: {
        allowedRoles: [UserRole.CM, UserRole.Admin]
      }
    }
  },
  
  // Role + Market validation
  {
    path: 'market/:marketId/details',
    component: MarketDetailsComponent,
    canActivate: [EnhancedRoleGuard],
    data: {
      roleGuard: {
        allowedRoles: [UserRole.CM, UserRole.Admin],
        requireMarketMatch: true,
        marketParam: 'marketId'
      }
    }
  }
];
```


#### Step 3: Provide Guards in Module

```typescript
@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [CMGuard, AdminGuard, EnhancedRoleGuard]
})
export class MyFeatureRoutingModule {}
```

### Custom Guard Implementation

Creating a custom role-based guard:

```typescript
@Injectable({ providedIn: 'root' })
export class CustomRoleGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | Observable<boolean> {
    // Get configuration from route data
    const config = route.data['customGuard'];
    
    // Implement custom logic
    const hasAccess = this.checkCustomAccess(config);
    
    if (!hasAccess) {
      this.router.navigate(['/unauthorized'], {
        queryParams: { returnUrl: state.url }
      });
      return false;
    }
    
    return true;
  }

  private checkCustomAccess(config: any): boolean {
    // Custom authorization logic
    return true;
  }
}
```

### Guard Testing

```typescript
describe('CMGuard', () => {
  let guard: CMGuard;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const authSpy = jasmine.createSpyObj('AuthService', ['isUserInRole']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        CMGuard,
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    guard = TestBed.inject(CMGuard);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should allow CM users', () => {
    authService.isUserInRole.and.returnValue(true);
    
    const result = guard.canActivate({} as any, { url: '/cm-dashboard' } as any);
    
    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should redirect unauthorized users', () => {
    authService.isUserInRole.and.returnValue(false);
    
    const result = guard.canActivate({} as any, { url: '/cm-dashboard' } as any);
    
    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(
      ['/unauthorized'],
      { queryParams: { returnUrl: '/cm-dashboard' } }
    );
  });
});
```

---

## Directive Usage

### Structural Directive: *roleBasedShow

**Purpose**: Conditionally render DOM elements based on role and market access

**Syntax**
```html
*roleBasedShow="role | roleArray [; market: marketCode]"
```

**Examples**

```html
<!-- Single role -->
<button *roleBasedShow="UserRole.Admin">Admin Only</button>

<!-- Multiple roles -->
<div *roleBasedShow="[UserRole.CM, UserRole.Admin]">
  CM or Admin Content
</div>

<!-- With market validation -->
<section *roleBasedShow="UserRole.CM; market: 'NYC'">
  NYC Market Content (CM with NYC access only)
</section>

<!-- Dynamic values from component -->
<div *roleBasedShow="allowedRoles; market: selectedMarket">
  Dynamic Content
</div>
```

**Component Setup**
```typescript
import { UserRole } from '@app/models/user.model';

export class MyComponent {
  UserRole = UserRole;  // Make enum available in template
  allowedRoles = [UserRole.CM, UserRole.Admin];
  selectedMarket = 'NYC';
}
```


### Attribute Directive: roleBasedDisable

**Purpose**: Conditionally disable elements based on role

**Syntax**
```html
roleBasedDisable="role | roleArray"
[roleBasedDisable]="expression"
```

**Examples**

```html
<!-- Disable for CM users -->
<button roleBasedDisable="UserRole.CM">Delete System Data</button>

<!-- Disable for multiple roles -->
<input roleBasedDisable="[UserRole.CM, UserRole.Technician]" />

<!-- Dynamic expression -->
<button [roleBasedDisable]="isRestrictedRole()">Action</button>
```

**Styling**
The directive automatically applies:
- `disabled` attribute
- Reduced opacity (0.6)
- Not-allowed cursor
- Tooltip with explanation

**Custom Styling**
```scss
// Override default disabled styling
[roleBasedDisable] {
  &[disabled] {
    opacity: 0.5;
    cursor: not-allowed;
    background-color: #f0f0f0;
  }
}
```

### Directive Performance Considerations

1. **Minimize role checks**: Directives check roles on initialization and when inputs change
2. **Use OnPush change detection**: Reduces unnecessary checks
3. **Avoid complex expressions**: Keep role logic simple in templates
4. **Cache role arrays**: Define role arrays in component class, not inline in template

---

## Service Integration Patterns

### Pattern 1: Dashboard Components

Dashboard components integrate multiple services with role-based filtering:

```typescript
@Component({
  selector: 'app-cm-dashboard',
  templateUrl: './cm-dashboard.component.html'
})
export class CMDashboardComponent implements OnInit {
  dashboardData$: Observable<CMDashboardData>;
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

  loadDashboardData(): void {
    this.dashboardData$ = forkJoin({
      metrics: this.loadMetrics(),
      recentStreetSheets: this.streetSheetService.getStreetSheets().pipe(
        map(sheets => sheets.slice(0, 5))  // Latest 5
      ),
      pendingApprovals: this.workflowService.getMyApprovalTasks(),
      technicianStatus: this.technicianService.getTechnicianStatus(),
      upcomingDeadlines: this.loadUpcomingDeadlines()
    });
  }

  private loadMetrics(): Observable<CMDashboardMetrics> {
    // Aggregate metrics from multiple sources
    return forkJoin({
      projects: this.projectService.getActiveProjects(),
      tasks: this.taskService.getPendingTasks(),
      technicians: this.technicianService.getAvailableTechnicians(),
      approvals: this.workflowService.getMyApprovalTasks()
    }).pipe(
      map(data => ({
        activeProjects: data.projects.length,
        pendingTasks: data.tasks.length,
        availableTechnicians: data.technicians.length,
        resourceUtilization: this.calculateUtilization(data.technicians),
        pendingApprovals: data.approvals.length,
        overdueItems: this.countOverdueItems(data.tasks)
      }))
    );
  }
}
```

### Pattern 2: Form Components with Role-Based Fields

```typescript
@Component({
  selector: 'app-project-form',
  templateUrl: './project-form.component.html'
})
export class ProjectFormComponent implements OnInit {
  projectForm: FormGroup;
  availableMarkets: string[];
  isAdmin: boolean;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private roleBasedDataService: RoleBasedDataService
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.authService.isAdmin();
    this.availableMarkets = this.roleBasedDataService.getAccessibleMarkets();
    
    this.projectForm = this.fb.group({
      name: ['', Validators.required],
      market: [
        { 
          value: this.getDefaultMarket(), 
          disabled: !this.isAdmin  // CM cannot change market
        },
        Validators.required
      ],
      description: ['']
    });
  }

  private getDefaultMarket(): string {
    if (this.isAdmin) {
      return '';  // Admin selects from dropdown
    }
    return this.authService.getUser().market;  // CM auto-populated
  }
}
```

**Template**
```html
<form [formGroup]="projectForm">
  <input formControlName="name" placeholder="Project Name" />
  
  <!-- Market selection: dropdown for Admin, readonly for CM -->
  <select formControlName="market" *ngIf="isAdmin">
    <option value="">Select Market</option>
    <option *ngFor="let market of availableMarkets" [value]="market">
      {{ market }}
    </option>
  </select>
  
  <input 
    *ngIf="!isAdmin" 
    formControlName="market" 
    readonly 
    placeholder="Market"
  />
  
  <textarea formControlName="description"></textarea>
  
  <button type="submit" [disabled]="projectForm.invalid">Create Project</button>
</form>
```


### Pattern 3: Navigation Components

Role-based menu visibility:

```typescript
@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html'
})
export class NavbarComponent {
  UserRole = UserRole;  // Expose enum to template

  constructor(public authService: AuthService) {}

  get isCM(): boolean {
    return this.authService.isCM();
  }

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }
}
```

**Template**
```html
<nav>
  <!-- Always visible -->
  <a routerLink="/dashboard">Dashboard</a>
  
  <!-- CM and Admin only -->
  <a routerLink="/approvals" *roleBasedShow="[UserRole.CM, UserRole.Admin]">
    Approvals
  </a>
  
  <!-- Admin only -->
  <a routerLink="/admin/users" *roleBasedShow="UserRole.Admin">
    User Management
  </a>
  
  <a routerLink="/admin/config" *roleBasedShow="UserRole.Admin">
    System Configuration
  </a>
</nav>
```

### Pattern 4: Data Table Components

Role-based action buttons:

```html
<table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Market</th>
      <th>Status</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    <tr *ngFor="let item of items">
      <td>{{ item.name }}</td>
      <td>{{ item.market }}</td>
      <td>{{ item.status }}</td>
      <td>
        <button (click)="view(item)">View</button>
        <button (click)="edit(item)">Edit</button>
        
        <!-- Delete only for Admin -->
        <button 
          *roleBasedShow="UserRole.Admin" 
          (click)="delete(item)"
          class="danger">
          Delete
        </button>
        
        <!-- Approve/Reject for CM and Admin -->
        <button 
          *roleBasedShow="[UserRole.CM, UserRole.Admin]"
          (click)="approve(item)">
          Approve
        </button>
      </td>
    </tr>
  </tbody>
</table>
```

---

## Testing Strategies

### Unit Testing Role-Based Services

#### Testing RoleBasedDataService

```typescript
describe('RoleBasedDataService', () => {
  let service: RoleBasedDataService;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    const authSpy = jasmine.createSpyObj('AuthService', [
      'getUser', 'isCM', 'isAdmin'
    ]);

    TestBed.configureTestingModule({
      providers: [
        RoleBasedDataService,
        { provide: AuthService, useValue: authSpy }
      ]
    });

    service = TestBed.inject(RoleBasedDataService);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  describe('applyMarketFilter', () => {
    it('should filter data to CM market', () => {
      authService.isCM.and.returnValue(true);
      authService.isAdmin.and.returnValue(false);
      authService.getUser.and.returnValue({ market: 'NYC' } as User);

      const data = [
        { id: '1', market: 'NYC' },
        { id: '2', market: 'LA' },
        { id: '3', market: 'NYC' }
      ];

      const filtered = service.applyMarketFilter(data);

      expect(filtered.length).toBe(2);
      expect(filtered.every(item => item.market === 'NYC')).toBe(true);
    });

    it('should not filter data for Admin', () => {
      authService.isAdmin.and.returnValue(true);

      const data = [
        { id: '1', market: 'NYC' },
        { id: '2', market: 'LA' }
      ];

      const filtered = service.applyMarketFilter(data);

      expect(filtered.length).toBe(2);
    });

    it('should exclude RG markets when option is set', () => {
      authService.isCM.and.returnValue(true);
      authService.getUser.and.returnValue({ market: 'NYC' } as User);

      const data = [
        { id: '1', market: 'NYC' },
        { id: '2', market: 'RG' }
      ];

      const filtered = service.applyMarketFilter(data, { excludeRGMarkets: true });

      expect(filtered.length).toBe(1);
      expect(filtered[0].market).toBe('NYC');
    });
  });
});
```


#### Testing Services with Role-Based Logic

```typescript
describe('StreetSheetService', () => {
  let service: StreetSheetService;
  let httpMock: HttpTestingController;
  let authService: jasmine.SpyObj<AuthService>;
  let roleBasedDataService: jasmine.SpyObj<RoleBasedDataService>;

  beforeEach(() => {
    const authSpy = jasmine.createSpyObj('AuthService', ['getUser', 'isCM', 'isAdmin']);
    const roleSpy = jasmine.createSpyObj('RoleBasedDataService', [
      'applyMarketFilter', 'canAccessMarket'
    ]);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        StreetSheetService,
        { provide: AuthService, useValue: authSpy },
        { provide: RoleBasedDataService, useValue: roleSpy }
      ]
    });

    service = TestBed.inject(StreetSheetService);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    roleBasedDataService = TestBed.inject(RoleBasedDataService) as jasmine.SpyObj<RoleBasedDataService>;
  });

  it('should filter street sheets for CM users', () => {
    const mockSheets = [
      { id: '1', market: 'NYC' },
      { id: '2', market: 'LA' }
    ];
    const filteredSheets = [{ id: '1', market: 'NYC' }];

    authService.isCM.and.returnValue(true);
    roleBasedDataService.applyMarketFilter.and.returnValue(filteredSheets);

    service.getStreetSheets().subscribe(sheets => {
      expect(sheets).toEqual(filteredSheets);
      expect(roleBasedDataService.applyMarketFilter).toHaveBeenCalledWith(
        mockSheets,
        { excludeRGMarkets: true }
      );
    });

    const req = httpMock.expectOne('/api/street-sheets');
    req.flush(mockSheets);
  });

  it('should validate market ownership on update for CM', (done) => {
    authService.isCM.and.returnValue(true);
    roleBasedDataService.canAccessMarket.and.returnValue(false);

    service.updateStreetSheet('1', { name: 'Updated' }).subscribe({
      error: (error) => {
        expect(error.message).toContain('another market');
        done();
      }
    });

    const req = httpMock.expectOne('/api/street-sheets/1');
    req.flush({ id: '1', market: 'LA' });
  });
});
```

### Integration Testing

#### Testing Role-Based Workflows

```typescript
describe('CM Workflow Integration', () => {
  let workflowService: WorkflowService;
  let roleBasedDataService: RoleBasedDataService;
  let authService: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        WorkflowService,
        RoleBasedDataService,
        AuthService
      ]
    });

    workflowService = TestBed.inject(WorkflowService);
    roleBasedDataService = TestBed.inject(RoleBasedDataService);
    authService = TestBed.inject(AuthService);
  });

  it('should complete CM approval workflow', fakeAsync(() => {
    // Setup: CM user
    spyOn(authService, 'getUser').and.returnValue({
      id: 'cm1',
      role: UserRole.CM,
      market: 'NYC'
    } as User);

    // Submit for approval
    let taskId: string;
    workflowService.submitForApproval('street_sheet', 'sheet1').subscribe(task => {
      taskId = task.id;
      expect(task.status).toBe('pending');
      expect(task.market).toBe('NYC');
    });

    tick();

    // Approve task
    workflowService.approveTask(taskId, 'Looks good').subscribe(task => {
      expect(task.status).toBe('approved');
      expect(task.comments.length).toBeGreaterThan(0);
    });

    tick();
  }));
});
```


### Property-Based Testing

#### Testing Market Filtering Properties

```typescript
import * as fc from 'fast-check';

describe('RoleBasedDataService Properties', () => {
  let service: RoleBasedDataService;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    const authSpy = jasmine.createSpyObj('AuthService', [
      'getUser', 'isCM', 'isAdmin'
    ]);

    TestBed.configureTestingModule({
      providers: [
        RoleBasedDataService,
        { provide: AuthService, useValue: authSpy }
      ]
    });

    service = TestBed.inject(RoleBasedDataService);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  it('Property: CM filtering excludes unassigned markets', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          id: fc.string(),
          market: fc.constantFrom('NYC', 'LA', 'CHI', 'RG')
        })),
        fc.constantFrom('NYC', 'LA', 'CHI'),
        (data, cmMarket) => {
          // Setup: CM user
          authService.isCM.and.returnValue(true);
          authService.isAdmin.and.returnValue(false);
          authService.getUser.and.returnValue({ market: cmMarket } as User);

          // Apply filter
          const filtered = service.applyMarketFilter(data);

          // Property: All filtered items match CM's market
          return filtered.every(item => item.market === cmMarket);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property: Admin filtering includes all markets', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          id: fc.string(),
          market: fc.constantFrom('NYC', 'LA', 'CHI', 'RG')
        })),
        (data) => {
          // Setup: Admin user
          authService.isAdmin.and.returnValue(true);

          // Apply filter
          const filtered = service.applyMarketFilter(data);

          // Property: All data is included
          return filtered.length === data.length;
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Testing Best Practices

1. **Mock AuthService**: Always mock AuthService in unit tests
2. **Test both roles**: Test behavior for CM and Admin users
3. **Test edge cases**: Empty data, missing market property, null values
4. **Test error handling**: Unauthorized access, invalid markets
5. **Use property-based tests**: Validate universal properties across many inputs
6. **Integration tests**: Test complete workflows end-to-end

---

## Market Filtering Rules

### Overview

Market filtering ensures users only access data from their authorized markets.

### Filtering Rules by Role

#### Construction Manager (CM)

**General Rule**: CM users see only data from their assigned market

**Special Rules**:
- **Street Sheets**: Exclude RG markets (CM cannot view RG street sheets)
- **Punch Lists**: Include all assigned market data
- **Daily Reports**: Include all assigned market data
- **Technicians**: Only technicians assigned to CM's market
- **Projects**: Only projects in CM's market

**Implementation**
```typescript
// CM market filtering
if (this.authService.isCM()) {
  const user = this.authService.getUser();
  filteredData = data.filter(item => item.market === user.market);
  
  // Additional filtering for street sheets
  if (isStreetSheet) {
    filteredData = filteredData.filter(item => item.market !== 'RG');
  }
}
```

#### Administrator (Admin)

**General Rule**: Admin users see data from all markets

**Special Rules**:
- **No Restrictions**: Admin can access all markets including RG
- **Optional Filtering**: Admin can choose to filter to specific market
- **Cross-Market Operations**: Admin can perform operations across markets

**Implementation**
```typescript
// Admin bypass
if (this.authService.isAdmin()) {
  return data;  // No filtering
}
```


### Filtering Layers

#### Layer 1: UI Directives

First line of defense - hide unauthorized UI elements

```html
<!-- CM cannot see delete button -->
<button *roleBasedShow="UserRole.Admin" (click)="delete()">Delete</button>
```

#### Layer 2: Route Guards

Prevent navigation to unauthorized routes

```typescript
{
  path: 'admin/users',
  canActivate: [AdminGuard],
  component: UserManagementComponent
}
```

#### Layer 3: Service Layer

Validate access before data operations

```typescript
updateData(id: string, market: string): Observable<Data> {
  if (!this.roleBasedDataService.canAccessMarket(market)) {
    return throwError(() => new Error('Access denied'));
  }
  return this.http.put(`/api/data/${id}`, updates);
}
```

#### Layer 4: HTTP Interceptors

Automatically apply filtering to API requests

```typescript
// MarketFilterInterceptor adds market parameter
// AuthorizationInterceptor adds role headers
```

#### Layer 5: API/Backend

Final validation on the server (outside Angular scope)

### Market Filtering Implementation Checklist

When implementing market filtering for a new feature:

- [ ] Add market property to data model
- [ ] Update service to use RoleBasedDataService
- [ ] Apply client-side filtering with applyMarketFilter()
- [ ] Add server-side filtering with getRoleBasedQueryParams()
- [ ] Validate market access on create/update/delete operations
- [ ] Add route guards with market validation if needed
- [ ] Use *roleBasedShow directive for UI elements
- [ ] Write unit tests for CM and Admin scenarios
- [ ] Write property tests for filtering logic
- [ ] Test edge cases (missing market, invalid market)

### RG Market Special Handling

**Rule**: CM users cannot access RG market street sheets

**Implementation Locations**:

1. **StreetSheetService**
```typescript
getStreetSheets(): Observable<StreetSheet[]> {
  return this.http.get<StreetSheet[]>('/api/street-sheets').pipe(
    map(sheets => this.roleBasedDataService.applyMarketFilter(sheets, {
      excludeRGMarkets: this.authService.isCM()
    }))
  );
}
```

2. **MarketFilterInterceptor**
```typescript
// Automatically excludes RG for CM on street-sheet endpoints
if (url.includes('/street-sheet') && this.authService.isCM()) {
  // Add market filter excluding RG
}
```

3. **CM Dashboard**
```typescript
// Recent street sheets automatically exclude RG
this.recentStreetSheets$ = this.streetSheetService.getStreetSheets();
```

**Testing RG Exclusion**
```typescript
it('should exclude RG markets for CM street sheets', () => {
  authService.isCM.and.returnValue(true);
  authService.getUser.and.returnValue({ market: 'NYC' } as User);

  const sheets = [
    { id: '1', market: 'NYC' },
    { id: '2', market: 'RG' }
  ];

  const filtered = service.applyMarketFilter(sheets, { excludeRGMarkets: true });

  expect(filtered.length).toBe(1);
  expect(filtered[0].market).toBe('NYC');
});
```

---

## Advanced Topics

### Caching Role-Based Data

**Implementation**
```typescript
@Injectable({ providedIn: 'root' })
export class RoleBasedDataService {
  private marketCache: Map<string, string[]> = new Map();
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000;  // 5 minutes

  getAccessibleMarkets(): string[] {
    const now = Date.now();
    const userId = this.authService.getUser().id;

    // Check cache
    if (this.marketCache.has(userId) && (now - this.cacheTimestamp) < this.CACHE_TTL) {
      return this.marketCache.get(userId)!;
    }

    // Compute and cache
    const markets = this.computeAccessibleMarkets();
    this.marketCache.set(userId, markets);
    this.cacheTimestamp = now;

    return markets;
  }

  // Invalidate cache on role change
  invalidateCache(): void {
    this.marketCache.clear();
    this.cacheTimestamp = 0;
  }
}
```

### Handling Role Changes

**Scenario**: User's role changes while they're logged in

**Solution**: Subscribe to role changes and update UI

```typescript
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  constructor(
    private authService: AuthService,
    private roleBasedDataService: RoleBasedDataService
  ) {}

  ngOnInit(): void {
    // Listen for role changes
    this.authService.userRole$.subscribe(role => {
      // Invalidate caches
      this.roleBasedDataService.invalidateCache();
      
      // Refresh current view
      this.refreshCurrentView();
      
      // Update navigation
      this.updateNavigation();
    });
  }
}
```

### Multi-Market Support (Future Enhancement)

**Scenario**: User assigned to multiple markets

**Current Implementation**: Single market per user

**Future Enhancement**:
```typescript
interface User {
  primaryMarket: string;
  additionalMarkets?: string[];
}

// Update filtering logic
getAccessibleMarkets(): string[] {
  const user = this.authService.getUser();
  return [user.primaryMarket, ...(user.additionalMarkets || [])];
}
```

---

## Common Patterns and Recipes

### Recipe 1: Adding a New Role-Protected Feature

1. **Create the service with role checks**
```typescript
@Injectable({ providedIn: 'root' })
export class MyFeatureService {
  constructor(
    private http: HttpClient,
    private roleBasedDataService: RoleBasedDataService
  ) {}

  getData(): Observable<MyData[]> {
    const params = this.roleBasedDataService.getRoleBasedQueryParams();
    return this.http.get<MyData[]>('/api/my-feature', { params });
  }
}
```

2. **Create the component**
```typescript
@Component({
  selector: 'app-my-feature',
  templateUrl: './my-feature.component.html'
})
export class MyFeatureComponent {
  data$ = this.myFeatureService.getData();
  
  constructor(private myFeatureService: MyFeatureService) {}
}
```

3. **Add route with guard**
```typescript
{
  path: 'my-feature',
  component: MyFeatureComponent,
  canActivate: [CMGuard]
}
```

4. **Add navigation with directive**
```html
<a routerLink="/my-feature" *roleBasedShow="[UserRole.CM, UserRole.Admin]">
  My Feature
</a>
```


### Recipe 2: Adding Market Validation to Existing Route

```typescript
// Before: No market validation
{
  path: 'project/:projectId',
  component: ProjectDetailComponent,
  canActivate: [CMGuard]
}

// After: With market validation
{
  path: 'project/:projectId',
  component: ProjectDetailComponent,
  canActivate: [EnhancedRoleGuard],
  data: {
    roleGuard: {
      allowedRoles: [UserRole.CM, UserRole.Admin],
      requireMarketMatch: true,
      marketParam: 'projectId'  // Will validate project's market
    }
  }
}
```

### Recipe 3: Creating Admin-Only Action Button

```html
<!-- Button visible only to Admin -->
<button 
  *roleBasedShow="UserRole.Admin"
  (click)="performAdminAction()"
  class="btn-danger">
  Delete All Data
</button>

<!-- Button visible to all but disabled for non-Admin -->
<button 
  roleBasedDisable="[UserRole.CM, UserRole.Technician]"
  (click)="performAdminAction()">
  System Configuration
</button>
```

### Recipe 4: Implementing Bulk Operations

```typescript
executeBulkOperation(operation: BulkUserOperation): Observable<BulkOperationResult> {
  // 1. Validate Admin access
  if (!this.authService.isAdmin()) {
    return throwError(() => new Error('Admin access required'));
  }

  // 2. Validate operation
  if (!operation.reason || operation.userIds.length === 0) {
    return throwError(() => new Error('Invalid bulk operation'));
  }

  // 3. Execute with confirmation
  return this.http.post<BulkOperationResult>('/api/admin/users/bulk', operation).pipe(
    tap(result => {
      // 4. Log results
      console.log(`Bulk operation completed: ${result.successCount} succeeded, ${result.failureCount} failed`);
    }),
    catchError(error => {
      // 5. Handle errors
      console.error('Bulk operation failed:', error);
      return throwError(() => error);
    })
  );
}
```

---

## Troubleshooting

### Common Development Issues

#### Issue: Directive not working

**Symptoms**: Element still visible when it should be hidden

**Causes**:
1. Directive not imported in module
2. UserRole enum not exposed in component
3. Incorrect role value

**Solution**:
```typescript
// 1. Import directive
import { RoleBasedShowDirective } from '@app/directives/role-based-show.directive';

@NgModule({
  imports: [RoleBasedShowDirective]
})

// 2. Expose enum in component
export class MyComponent {
  UserRole = UserRole;  // Make available to template
}

// 3. Use correct enum value
<div *roleBasedShow="UserRole.CM">  <!-- Not 'CM' string -->
```

#### Issue: Market filtering not applied

**Symptoms**: CM user sees data from other markets

**Causes**:
1. Service not using RoleBasedDataService
2. Interceptor not registered
3. API not respecting market parameter

**Solution**:
```typescript
// 1. Inject and use RoleBasedDataService
constructor(private roleBasedDataService: RoleBasedDataService) {}

getData(): Observable<Data[]> {
  return this.http.get<Data[]>('/api/data').pipe(
    map(data => this.roleBasedDataService.applyMarketFilter(data))
  );
}

// 2. Register interceptor in app module
providers: [
  { provide: HTTP_INTERCEPTORS, useClass: MarketFilterInterceptor, multi: true }
]

// 3. Verify API implementation (backend)
```

#### Issue: Guard not preventing access

**Symptoms**: Unauthorized user can access protected route

**Causes**:
1. Guard not registered in route
2. Guard not provided in module
3. AuthService returning incorrect role

**Solution**:
```typescript
// 1. Add guard to route
{
  path: 'protected',
  canActivate: [CMGuard],  // Add this
  component: ProtectedComponent
}

// 2. Provide guard
providers: [CMGuard]

// 3. Debug AuthService
console.log('User role:', this.authService.getUser().role);
console.log('Is CM:', this.authService.isCM());
```

### Debugging Tips

**Enable verbose logging**:
```typescript
// In RoleBasedDataService
applyMarketFilter<T>(data: T[], options?: MarketFilterOptions): T[] {
  console.log('Filtering data:', { 
    dataCount: data.length, 
    userRole: this.authService.getUser().role,
    userMarket: this.authService.getUser().market,
    options 
  });
  
  const filtered = /* filtering logic */;
  
  console.log('Filtered result:', { 
    originalCount: data.length, 
    filteredCount: filtered.length 
  });
  
  return filtered;
}
```

**Test role checks in console**:
```typescript
// In browser console
const authService = ng.probe(document.querySelector('app-root')).injector.get('AuthService');
console.log('Current user:', authService.getUser());
console.log('Is CM:', authService.isCM());
console.log('Is Admin:', authService.isAdmin());
```

---

## Migration Guide

### Migrating Existing Features to Role-Based System

#### Step 1: Identify Features Requiring Role-Based Access

Review existing features and identify:
- Features that should be role-restricted
- Data that should be market-filtered
- Operations that require authorization

#### Step 2: Update Services

```typescript
// Before
@Injectable({ providedIn: 'root' })
export class OldService {
  constructor(private http: HttpClient) {}

  getData(): Observable<Data[]> {
    return this.http.get<Data[]>('/api/data');
  }
}

// After
@Injectable({ providedIn: 'root' })
export class OldService {
  constructor(
    private http: HttpClient,
    private roleBasedDataService: RoleBasedDataService  // Add this
  ) {}

  getData(): Observable<Data[]> {
    return this.http.get<Data[]>('/api/data').pipe(
      map(data => this.roleBasedDataService.applyMarketFilter(data))  // Add filtering
    );
  }
}
```

#### Step 3: Update Routes

```typescript
// Before
{ path: 'feature', component: FeatureComponent }

// After
{
  path: 'feature',
  component: FeatureComponent,
  canActivate: [CMGuard]  // Add guard
}
```

#### Step 4: Update Templates

```html
<!-- Before -->
<button (click)="delete()">Delete</button>

<!-- After -->
<button *roleBasedShow="UserRole.Admin" (click)="delete()">Delete</button>
```

#### Step 5: Update Tests

Add test cases for both CM and Admin scenarios:

```typescript
describe('OldService', () => {
  // Add tests for CM filtering
  it('should filter data for CM users', () => { /* ... */ });
  
  // Add tests for Admin access
  it('should not filter data for Admin users', () => { /* ... */ });
});
```

---

## API Integration

### Expected Backend Behavior

The Angular frontend expects the backend API to:

1. **Validate authorization headers**: Check role and permissions
2. **Respect market query parameters**: Filter data by market when provided
3. **Return 403 for unauthorized access**: Consistent error responses
4. **Include market in response data**: All entities should have market property
5. **Support role-based endpoints**: Separate endpoints for Admin operations

### Request Headers

The frontend sends these headers:

```
Authorization: Bearer <token>
X-User-Role: CM | Admin | Technician
X-User-Market: <market-code>
```

### Query Parameters

Market filtering requests include:

```
GET /api/street-sheets?market=NYC
GET /api/daily-reports?market=NYC&startDate=2026-01-01
```

### Error Responses

Expected error format:

```json
{
  "error": "Forbidden",
  "message": "Access denied to market LA",
  "statusCode": 403,
  "timestamp": "2026-02-24T10:30:00Z"
}
```

---

## Performance Considerations

### Optimization Strategies

1. **Cache accessible markets**: Avoid repeated calculations
2. **Use server-side filtering**: Prefer query params over client-side filtering for large datasets
3. **Lazy load dashboard widgets**: Load widgets on-demand
4. **Implement pagination**: For large data tables
5. **Use OnPush change detection**: Reduce unnecessary checks

### Monitoring

**Key Metrics to Monitor**:
- Guard execution time
- Service response time with filtering
- Cache hit rate for market data
- Number of 403 errors (indicates authorization issues)

---

## Security Considerations

### Defense in Depth

Never rely on a single layer of authorization:

```typescript
// ❌ BAD: Only UI-level protection
<button *roleBasedShow="UserRole.Admin" (click)="deleteAll()">Delete</button>

// ✅ GOOD: Multiple layers
// 1. UI directive
<button *roleBasedShow="UserRole.Admin" (click)="deleteAll()">Delete</button>

// 2. Service validation
deleteAll(): Observable<void> {
  if (!this.authService.isAdmin()) {
    return throwError(() => new Error('Admin required'));
  }
  return this.http.delete('/api/admin/delete-all');
}

// 3. Route guard (if applicable)
{ path: 'admin/delete', canActivate: [AdminGuard] }

// 4. Backend validation (outside Angular)
```

### Sensitive Data Handling

**Never expose sensitive data to unauthorized roles**:

```typescript
// ❌ BAD: Fetch all data then filter
getAllUsers(): Observable<User[]> {
  return this.http.get<User[]>('/api/users').pipe(
    map(users => users.filter(u => u.market === this.userMarket))
  );
}

// ✅ GOOD: Server-side filtering
getUsers(): Observable<User[]> {
  const params = this.roleBasedDataService.getRoleBasedQueryParams();
  return this.http.get<User[]>('/api/users', { params });
}
```

---

## Appendix

### Quick Reference

**Service Methods**
- `applyMarketFilter(data, options)` - Filter array by market
- `getRoleBasedQueryParams(params)` - Get query params with market filter
- `canAccessMarket(market)` - Check market access
- `getAccessibleMarkets()` - Get list of accessible markets

**Guards**
- `CMGuard` - CM or Admin access
- `AdminGuard` - Admin only access
- `EnhancedRoleGuard` - Configurable role and market validation

**Directives**
- `*roleBasedShow` - Conditional rendering
- `roleBasedDisable` - Conditional disabling

**Interceptors**
- `MarketFilterInterceptor` - Auto-apply market filtering
- `AuthorizationInterceptor` - Add auth headers and handle 403

### Code Examples Repository

All code examples from this guide are available in:
- `src/app/examples/role-based-patterns/`

---

*Last Updated: February 2026*
*Version: 1.0*
