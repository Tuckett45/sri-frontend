# JSDoc Documentation Guide for ATLAS Integration

## Overview

This guide provides standards and examples for documenting ATLAS integration code using JSDoc comments. All public APIs, services, components, and utilities should be documented following these conventions.

## General Principles

1. **Document all public APIs** - Every exported class, interface, function, and constant
2. **Be concise but complete** - Provide enough context without being verbose
3. **Include examples** - Show common usage patterns
4. **Document parameters and return types** - Even when TypeScript provides types
5. **Link related items** - Use `@see` tags to reference related functionality

## Service Documentation

### Service Class

```typescript
/**
 * Service for managing deployment lifecycle operations.
 * 
 * Provides methods for CRUD operations, state transitions, evidence submission,
 * and audit trail management for ATLAS deployments.
 * 
 * @example
 * ```typescript
 * constructor(private deploymentService: DeploymentService) {}
 * 
 * ngOnInit() {
 *   this.deploymentService.getDeployments({ state: LifecycleState.READY })
 *     .subscribe(result => {
 *       this.deployments = result.items;
 *     });
 * }
 * ```
 * 
 * @see {@link DeploymentDto}
 * @see {@link DeploymentDetailDto}
 */
@Injectable({ providedIn: 'root' })
export class DeploymentService {
  // Implementation
}
```

### Service Methods

```typescript
/**
 * Retrieves a paginated list of deployments with optional filtering.
 * 
 * @param params - Optional query parameters for filtering and pagination
 * @param params.state - Filter by lifecycle state
 * @param params.type - Filter by deployment type
 * @param params.page - Page number (1-indexed)
 * @param params.pageSize - Number of items per page
 * @returns Observable of paged deployment results
 * 
 * @example
 * ```typescript
 * // Get all READY deployments
 * this.deploymentService.getDeployments({ 
 *   state: LifecycleState.READY,
 *   page: 1,
 *   pageSize: 20
 * }).subscribe(result => {
 *   console.log(`Found ${result.pagination.totalCount} deployments`);
 * });
 * ```
 */
getDeployments(params?: {
  state?: LifecycleState;
  type?: DeploymentType;
  page?: number;
  pageSize?: number;
}): Observable<PagedResult<DeploymentDto>> {
  // Implementation
}
```

## Component Documentation

### Component Class

```typescript
/**
 * Component for displaying a paginated list of deployments.
 * 
 * Features:
 * - Paginated table with sorting and filtering
 * - State and type filters
 * - Navigation to deployment detail view
 * - Create new deployment action
 * 
 * @example
 * ```html
 * <app-deployment-list></app-deployment-list>
 * ```
 * 
 * @see {@link DeploymentDetailComponent}
 * @see {@link DeploymentFormComponent}
 */
@Component({
  selector: 'app-deployment-list',
  templateUrl: './deployment-list.component.html',
  styleUrls: ['./deployment-list.component.scss']
})
export class DeploymentListComponent implements OnInit {
  // Implementation
}
```

### Component Properties

```typescript
/**
 * Observable stream of deployments from the store.
 * Automatically updates when deployment data changes.
 */
deployments$: Observable<DeploymentDto[]>;

/**
 * Indicates whether deployments are currently being loaded.
 * Used to show/hide loading spinner.
 */
loading$: Observable<boolean>;

/**
 * Available lifecycle states for filtering.
 * Populated from the LifecycleState enum.
 */
lifecycleStates = Object.values(LifecycleState);
```

### Component Methods

```typescript
/**
 * Handles deployment row click event.
 * Navigates to the deployment detail view.
 * 
 * @param deployment - The deployment that was clicked
 */
onDeploymentClick(deployment: DeploymentDto): void {
  this.router.navigate(['/atlas/deployments', deployment.id]);
}
```

## Model/Interface Documentation

### Interface

```typescript
/**
 * Represents a deployment in the ATLAS system.
 * 
 * Deployments track the lifecycle of changes through various states,
 * from initial draft through execution to final closeout.
 * 
 * @property id - Unique identifier (GUID)
 * @property title - Human-readable deployment title
 * @property type - Classification of deployment (STANDARD, EMERGENCY, etc.)
 * @property currentState - Current position in the lifecycle
 * @property clientId - Associated client identifier
 * @property createdBy - User who created the deployment
 * @property createdAt - Timestamp of creation
 * @property updatedAt - Timestamp of last update
 * @property metadata - Additional custom data (optional)
 * 
 * @see {@link DeploymentDetailDto}
 * @see {@link LifecycleState}
 * @see {@link DeploymentType}
 */
export interface DeploymentDto {
  id: string;
  title: string;
  type: DeploymentType;
  currentState: LifecycleState;
  clientId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}
```

### Enum

```typescript
/**
 * Defines the possible states in the deployment lifecycle.
 * 
 * State transitions follow a defined workflow with validation rules.
 * Some transitions require approvals or evidence submission.
 * 
 * @enum {string}
 * 
 * @example
 * ```typescript
 * // Check if deployment is ready for execution
 * if (deployment.currentState === LifecycleState.READY) {
 *   // Proceed with execution
 * }
 * ```
 */
export enum LifecycleState {
  /** Initial draft state - editable */
  DRAFT = 'DRAFT',
  
  /** Submitted for review */
  SUBMITTED = 'SUBMITTED',
  
  /** Under intake review */
  INTAKE_REVIEW = 'INTAKE_REVIEW',
  
  /** Planning phase */
  PLANNING = 'PLANNING',
  
  /** Ready for execution */
  READY = 'READY',
  
  /** Currently executing */
  IN_PROGRESS = 'IN_PROGRESS',
  
  /** Execution completed, awaiting QA */
  EXECUTION_COMPLETE = 'EXECUTION_COMPLETE',
  
  /** Under QA review */
  QA_REVIEW = 'QA_REVIEW',
  
  /** Approved for closeout */
  APPROVED_FOR_CLOSEOUT = 'APPROVED_FOR_CLOSEOUT',
  
  /** Fully closed */
  CLOSED = 'CLOSED',
  
  /** Temporarily on hold */
  ON_HOLD = 'ON_HOLD',
  
  /** Cancelled - terminal state */
  CANCELLED = 'CANCELLED',
  
  /** Requires rework */
  REWORK_REQUIRED = 'REWORK_REQUIRED'
}
```

## NgRx Documentation

### Actions

```typescript
/**
 * Action to load deployments with optional filtering and pagination.
 * 
 * Triggers the deployment effects to fetch data from the API.
 * On success, dispatches loadDeploymentsSuccess with the results.
 * On failure, dispatches loadDeploymentsFailure with the error.
 * 
 * @example
 * ```typescript
 * this.store.dispatch(loadDeployments({ 
 *   state: LifecycleState.READY,
 *   page: 1,
 *   pageSize: 20
 * }));
 * ```
 */
export const loadDeployments = createAction(
  '[Deployment] Load Deployments',
  props<{ page?: number; pageSize?: number; state?: LifecycleState; type?: DeploymentType }>()
);
```

### Selectors

```typescript
/**
 * Selects all deployments from the store as an array.
 * 
 * Memoized selector that converts the entity dictionary to an array.
 * Automatically updates when deployment entities change.
 * 
 * @returns Array of all deployments in the store
 * 
 * @example
 * ```typescript
 * this.deployments$ = this.store.select(selectAllDeployments);
 * ```
 */
export const selectAllDeployments = createSelector(
  selectDeploymentState,
  (state) => state.deployments.ids.map(id => state.deployments.entities[id])
);
```

### Effects

```typescript
/**
 * Effect that handles loading deployments from the API.
 * 
 * Listens for loadDeployments actions, calls the deployment service,
 * and dispatches success or failure actions based on the result.
 * 
 * Uses switchMap to cancel previous requests if a new one is initiated.
 */
loadDeployments$ = createEffect(() =>
  this.actions$.pipe(
    ofType(loadDeployments),
    switchMap(({ page, pageSize, state, type }) =>
      this.deploymentService.getDeployments({ page, pageSize, state, type }).pipe(
        map(result => loadDeploymentsSuccess({ result })),
        catchError(error => of(loadDeploymentsFailure({ error })))
      )
    )
  )
);
```

## Utility Function Documentation

```typescript
/**
 * Debounces a function call, ensuring it's only executed after a specified delay
 * has passed since the last invocation.
 * 
 * Useful for reducing API calls on user input events like typing or scrolling.
 * 
 * @param func - The function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced version of the function
 * 
 * @example
 * ```typescript
 * const debouncedSearch = debounce((term: string) => {
 *   this.searchService.search(term).subscribe();
 * }, 300);
 * 
 * // In template: (input)="debouncedSearch($event.target.value)"
 * ```
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  // Implementation
}
```

## Guard Documentation

```typescript
/**
 * Route guard that checks if ATLAS integration is enabled.
 * 
 * Prevents navigation to ATLAS routes when the feature is disabled
 * via feature flags. Redirects to the home page if access is denied.
 * 
 * @example
 * ```typescript
 * // In routing module
 * {
 *   path: 'atlas',
 *   canActivate: [AtlasFeatureGuard],
 *   loadChildren: () => import('./features/atlas/atlas.module')
 * }
 * ```
 * 
 * @see {@link AtlasConfigService}
 */
@Injectable({ providedIn: 'root' })
export class AtlasFeatureGuard implements CanActivate {
  // Implementation
}
```

## Interceptor Documentation

```typescript
/**
 * HTTP interceptor that adds authentication and ATLAS-specific headers to requests.
 * 
 * Automatically:
 * - Attaches JWT bearer tokens to ATLAS API requests
 * - Adds API version headers
 * - Adds client ID headers
 * - Handles 401 responses with token refresh and retry
 * 
 * @example
 * ```typescript
 * // Registered in module providers
 * {
 *   provide: HTTP_INTERCEPTORS,
 *   useClass: AtlasAuthInterceptor,
 *   multi: true
 * }
 * ```
 * 
 * @see {@link AtlasAuthService}
 */
@Injectable()
export class AtlasAuthInterceptor implements HttpInterceptor {
  // Implementation
}
```

## Best Practices

### DO

✅ Document all public APIs
✅ Include practical examples
✅ Explain the "why" not just the "what"
✅ Link to related types and functions
✅ Document error conditions and edge cases
✅ Keep documentation up-to-date with code changes

### DON'T

❌ Document private implementation details
❌ Repeat information that's obvious from the code
❌ Write documentation that duplicates TypeScript types
❌ Use vague or generic descriptions
❌ Forget to update docs when code changes

## Documentation Tools

### Generating Documentation

Use TypeDoc to generate HTML documentation from JSDoc comments:

```bash
npm run docs:generate
```

### Viewing Documentation

```bash
npm run docs:serve
```

### Linting Documentation

```bash
npm run docs:lint
```

## Additional Resources

- [JSDoc Official Documentation](https://jsdoc.app/)
- [TypeDoc Documentation](https://typedoc.org/)
- [Angular Documentation Style Guide](https://angular.io/guide/styleguide#documentation)
- [TSDoc Standard](https://tsdoc.org/)
