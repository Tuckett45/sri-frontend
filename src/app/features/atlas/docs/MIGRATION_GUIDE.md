# ARK to ATLAS Migration Guide

## Overview

This guide provides step-by-step instructions for migrating existing ARK features to use ATLAS control plane services. The migration supports a gradual, feature-by-feature approach with backward compatibility.

## Migration Strategy

### Phased Approach

1. **Phase 1: Parallel Operation** - Run ARK and ATLAS side-by-side
2. **Phase 2: Gradual Migration** - Move features one at a time
3. **Phase 3: Validation** - Verify functionality and performance
4. **Phase 4: Deprecation** - Remove old ARK implementations
5. **Phase 5: Cleanup** - Remove unused code and dependencies

### Feature Flags

Use feature flags to control which features use ATLAS:

```typescript
// environments/environment.ts
export const environment = {
  atlas: {
    enabled: true,
    features: {
      deployments: true,      // Use ATLAS for deployments
      approvals: true,         // Use ATLAS for approvals
      analytics: false,        // Still use ARK for analytics
      reporting: false         // Still use ARK for reporting
    }
  }
};
```

## Pre-Migration Checklist

Before migrating a feature:

- [ ] ATLAS API endpoint is available and tested
- [ ] Data models are compatible or mapped
- [ ] Authentication is configured
- [ ] Feature flag is implemented
- [ ] Rollback plan is documented
- [ ] Monitoring is in place
- [ ] Team is trained on new patterns

## Migration Process

### Step 1: Analyze Existing Feature

Document the current ARK implementation:

```typescript
// BEFORE: ARK Service
@Injectable()
export class ArkDeploymentService {
  constructor(private http: HttpClient) {}

  getDeployments(): Observable<ArkDeployment[]> {
    return this.http.get<ArkDeployment[]>('/ark-api/deployments');
  }

  createDeployment(data: any): Observable<ArkDeployment> {
    return this.http.post<ArkDeployment>('/ark-api/deployments', data);
  }
}
```

Identify:
- API endpoints used
- Data models
- Business logic
- Dependencies
- UI components
- State management approach


### Step 2: Create ATLAS Service

Implement the ATLAS equivalent:

```typescript
// AFTER: ATLAS Service
@Injectable()
export class AtlasDeploymentService {
  private readonly baseUrl = '/v1/deployments';

  constructor(
    private http: HttpClient,
    private errorHandler: AtlasErrorHandlerService
  ) {}

  getDeployments(params?: any): Observable<PagedResult<DeploymentDto>> {
    return this.http.get<PagedResult<DeploymentDto>>(this.baseUrl, { params })
      .pipe(catchError(this.errorHandler.handleError));
  }

  createDeployment(request: CreateDeploymentRequest): Observable<DeploymentDto> {
    return this.http.post<DeploymentDto>(this.baseUrl, request)
      .pipe(catchError(this.errorHandler.handleError));
  }
}
```

### Step 3: Create Data Model Mappers

Map between ARK and ATLAS data models:

```typescript
// mappers/deployment.mapper.ts
import { ArkDeployment } from '../ark/models/deployment';
import { DeploymentDto } from '../atlas/models/deployment.model';

export class DeploymentMapper {
  
  /**
   * Convert ARK deployment to ATLAS deployment
   */
  static toAtlas(arkDeployment: ArkDeployment): DeploymentDto {
    return {
      id: arkDeployment.deploymentId,
      title: arkDeployment.name,
      type: this.mapType(arkDeployment.category),
      currentState: this.mapState(arkDeployment.status),
      clientId: arkDeployment.clientCode,
      createdBy: arkDeployment.createdByUser,
      createdAt: new Date(arkDeployment.createdDate),
      updatedAt: new Date(arkDeployment.modifiedDate),
      metadata: {
        legacyId: arkDeployment.deploymentId,
        migrated: true
      }
    };
  }

  /**
   * Convert ATLAS deployment to ARK deployment
   */
  static toArk(atlasDeployment: DeploymentDto): ArkDeployment {
    return {
      deploymentId: atlasDeployment.id,
      name: atlasDeployment.title,
      category: this.mapTypeToArk(atlasDeployment.type),
      status: this.mapStateToArk(atlasDeployment.currentState),
      clientCode: atlasDeployment.clientId,
      createdByUser: atlasDeployment.createdBy,
      createdDate: atlasDeployment.createdAt.toISOString(),
      modifiedDate: atlasDeployment.updatedAt.toISOString()
    };
  }

  private static mapType(arkType: string): DeploymentType {
    const typeMap: Record<string, DeploymentType> = {
      'STANDARD': DeploymentType.STANDARD,
      'EMERGENCY': DeploymentType.EMERGENCY,
      'MAINTENANCE': DeploymentType.MAINTENANCE
    };
    return typeMap[arkType] || DeploymentType.STANDARD;
  }

  private static mapState(arkStatus: string): LifecycleState {
    const stateMap: Record<string, LifecycleState> = {
      'DRAFT': LifecycleState.DRAFT,
      'SUBMITTED': LifecycleState.SUBMITTED,
      'IN_PROGRESS': LifecycleState.IN_PROGRESS,
      'COMPLETED': LifecycleState.CLOSED
    };
    return stateMap[arkStatus] || LifecycleState.DRAFT;
  }

  private static mapTypeToArk(atlasType: DeploymentType): string {
    // Reverse mapping
    return atlasType;
  }

  private static mapStateToArk(atlasState: LifecycleState): string {
    // Reverse mapping
    return atlasState;
  }
}
```

### Step 4: Create Routing Service

Implement service routing based on feature flags:

```typescript
// services/deployment-routing.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ArkDeploymentService } from '../ark/services/deployment.service';
import { AtlasDeploymentService } from '../atlas/services/deployment.service';
import { DeploymentMapper } from '../mappers/deployment.mapper';

/**
 * Routes deployment requests to ARK or ATLAS based on feature flags.
 * Provides transparent migration with backward compatibility.
 */
@Injectable({ providedIn: 'root' })
export class DeploymentRoutingService {
  
  constructor(
    private arkService: ArkDeploymentService,
    private atlasService: AtlasDeploymentService
  ) {}

  /**
   * Get deployments from appropriate service
   */
  getDeployments(params?: any): Observable<any[]> {
    if (this.useAtlas()) {
      return this.atlasService.getDeployments(params).pipe(
        map(result => result.items)
      );
    } else {
      return this.arkService.getDeployments();
    }
  }

  /**
   * Create deployment using appropriate service
   */
  createDeployment(data: any): Observable<any> {
    if (this.useAtlas()) {
      return this.atlasService.createDeployment(data);
    } else {
      return this.arkService.createDeployment(data);
    }
  }

  /**
   * Check if ATLAS should be used for deployments
   */
  private useAtlas(): boolean {
    return environment.atlas?.enabled && 
           environment.atlas?.features?.deployments;
  }
}
```

### Step 5: Update Components

Modify components to use routing service:

```typescript
// BEFORE: Component using ARK directly
@Component({
  selector: 'app-deployment-list',
  templateUrl: './deployment-list.component.html'
})
export class DeploymentListComponent implements OnInit {
  deployments: ArkDeployment[] = [];

  constructor(private arkService: ArkDeploymentService) {}

  ngOnInit(): void {
    this.arkService.getDeployments().subscribe(
      deployments => this.deployments = deployments
    );
  }
}

// AFTER: Component using routing service
@Component({
  selector: 'app-deployment-list',
  templateUrl: './deployment-list.component.html'
})
export class DeploymentListComponent implements OnInit {
  deployments: any[] = [];

  constructor(private routingService: DeploymentRoutingService) {}

  ngOnInit(): void {
    this.routingService.getDeployments().subscribe(
      deployments => this.deployments = deployments
    );
  }
}
```

### Step 6: Migrate State Management

If using NgRx, create hybrid effects:

```typescript
// effects/deployment.effects.ts
@Injectable()
export class DeploymentEffects {
  
  loadDeployments$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadDeployments),
      switchMap(() => {
        // Use routing service to determine which API to call
        return this.routingService.getDeployments().pipe(
          map(deployments => loadDeploymentsSuccess({ deployments })),
          catchError(error => of(loadDeploymentsFailure({ error })))
        );
      })
    )
  );

  constructor(
    private actions$: Actions,
    private routingService: DeploymentRoutingService
  ) {}
}
```

### Step 7: Add Monitoring

Track which service is being used:

```typescript
// services/migration-monitor.service.ts
@Injectable({ providedIn: 'root' })
export class MigrationMonitorService {
  
  constructor(private analytics: AnalyticsService) {}

  trackServiceUsage(feature: string, service: 'ARK' | 'ATLAS', operation: string): void {
    this.analytics.track('service_usage', {
      feature,
      service,
      operation,
      timestamp: new Date().toISOString()
    });
  }

  trackMigrationError(feature: string, error: any): void {
    this.analytics.track('migration_error', {
      feature,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Use in routing service
getDeployments(params?: any): Observable<any[]> {
  const useAtlas = this.useAtlas();
  this.monitor.trackServiceUsage('deployments', useAtlas ? 'ATLAS' : 'ARK', 'getDeployments');
  
  if (useAtlas) {
    return this.atlasService.getDeployments(params).pipe(
      map(result => result.items),
      catchError(error => {
        this.monitor.trackMigrationError('deployments', error);
        throw error;
      })
    );
  } else {
    return this.arkService.getDeployments();
  }
}
```


### Step 8: Implement Fallback Strategy

Add fallback to ARK if ATLAS fails:

```typescript
// services/deployment-routing.service.ts (enhanced)
getDeployments(params?: any): Observable<any[]> {
  if (this.useAtlas()) {
    return this.atlasService.getDeployments(params).pipe(
      map(result => result.items),
      catchError(error => {
        console.error('ATLAS service failed, falling back to ARK', error);
        this.monitor.trackFallback('deployments', error);
        
        // Fallback to ARK
        return this.arkService.getDeployments();
      })
    );
  } else {
    return this.arkService.getDeployments();
  }
}
```

### Step 9: Test Migration

Create comprehensive tests:

```typescript
// deployment-routing.service.spec.ts
describe('DeploymentRoutingService', () => {
  let service: DeploymentRoutingService;
  let arkService: jasmine.SpyObj<ArkDeploymentService>;
  let atlasService: jasmine.SpyObj<AtlasDeploymentService>;

  beforeEach(() => {
    const arkSpy = jasmine.createSpyObj('ArkDeploymentService', ['getDeployments']);
    const atlasSpy = jasmine.createSpyObj('AtlasDeploymentService', ['getDeployments']);

    TestBed.configureTestingModule({
      providers: [
        DeploymentRoutingService,
        { provide: ArkDeploymentService, useValue: arkSpy },
        { provide: AtlasDeploymentService, useValue: atlasSpy }
      ]
    });

    service = TestBed.inject(DeploymentRoutingService);
    arkService = TestBed.inject(ArkDeploymentService) as jasmine.SpyObj<ArkDeploymentService>;
    atlasService = TestBed.inject(AtlasDeploymentService) as jasmine.SpyObj<AtlasDeploymentService>;
  });

  it('should use ATLAS when feature flag is enabled', (done) => {
    // Set environment to use ATLAS
    environment.atlas.features.deployments = true;
    
    const mockResult = { items: [{ id: '1', title: 'Test' }], pagination: {} };
    atlasService.getDeployments.and.returnValue(of(mockResult));

    service.getDeployments().subscribe(deployments => {
      expect(atlasService.getDeployments).toHaveBeenCalled();
      expect(arkService.getDeployments).not.toHaveBeenCalled();
      expect(deployments.length).toBe(1);
      done();
    });
  });

  it('should fallback to ARK when ATLAS fails', (done) => {
    environment.atlas.features.deployments = true;
    
    atlasService.getDeployments.and.returnValue(throwError(() => new Error('ATLAS error')));
    arkService.getDeployments.and.returnValue(of([{ deploymentId: '1', name: 'Test' }]));

    service.getDeployments().subscribe(deployments => {
      expect(atlasService.getDeployments).toHaveBeenCalled();
      expect(arkService.getDeployments).toHaveBeenCalled();
      expect(deployments.length).toBe(1);
      done();
    });
  });
});
```

### Step 10: Deploy and Monitor

1. **Deploy to staging** with feature flag disabled
2. **Enable feature flag** for small percentage of users
3. **Monitor metrics**:
   - API response times
   - Error rates
   - User feedback
   - Data consistency
4. **Gradually increase** percentage
5. **Full rollout** when stable
6. **Deprecate ARK** implementation

## Data Migration

### One-Time Data Migration

If data needs to be migrated from ARK to ATLAS:

```typescript
// scripts/migrate-data.ts
import { ArkDeploymentService } from './ark/services/deployment.service';
import { AtlasDeploymentService } from './atlas/services/deployment.service';
import { DeploymentMapper } from './mappers/deployment.mapper';

async function migrateDeployments() {
  const arkService = new ArkDeploymentService();
  const atlasService = new AtlasDeploymentService();

  console.log('Starting deployment migration...');

  // Get all ARK deployments
  const arkDeployments = await arkService.getDeployments().toPromise();
  console.log(`Found ${arkDeployments.length} ARK deployments`);

  let migrated = 0;
  let failed = 0;

  for (const arkDeployment of arkDeployments) {
    try {
      // Map to ATLAS format
      const atlasDeployment = DeploymentMapper.toAtlas(arkDeployment);
      
      // Create in ATLAS
      await atlasService.createDeployment(atlasDeployment).toPromise();
      
      migrated++;
      console.log(`Migrated: ${arkDeployment.name} (${migrated}/${arkDeployments.length})`);
    } catch (error) {
      failed++;
      console.error(`Failed to migrate ${arkDeployment.name}:`, error);
    }
  }

  console.log(`Migration complete: ${migrated} succeeded, ${failed} failed`);
}

migrateDeployments();
```

### Continuous Synchronization

For gradual migration, sync data between systems:

```typescript
// services/deployment-sync.service.ts
@Injectable({ providedIn: 'root' })
export class DeploymentSyncService {
  
  constructor(
    private arkService: ArkDeploymentService,
    private atlasService: AtlasDeploymentService,
    private mapper: DeploymentMapper
  ) {}

  /**
   * Sync deployment from ARK to ATLAS
   */
  syncToAtlas(arkDeploymentId: string): Observable<void> {
    return this.arkService.getDeployment(arkDeploymentId).pipe(
      switchMap(arkDeployment => {
        const atlasDeployment = this.mapper.toAtlas(arkDeployment);
        return this.atlasService.createOrUpdate(atlasDeployment);
      }),
      map(() => void 0)
    );
  }

  /**
   * Sync deployment from ATLAS to ARK
   */
  syncToArk(atlasDeploymentId: string): Observable<void> {
    return this.atlasService.getDeployment(atlasDeploymentId).pipe(
      switchMap(atlasDeployment => {
        const arkDeployment = this.mapper.toArk(atlasDeployment);
        return this.arkService.createOrUpdate(arkDeployment);
      }),
      map(() => void 0)
    );
  }

  /**
   * Verify data consistency between systems
   */
  verifyConsistency(deploymentId: string): Observable<boolean> {
    return forkJoin({
      ark: this.arkService.getDeployment(deploymentId),
      atlas: this.atlasService.getDeployment(deploymentId)
    }).pipe(
      map(({ ark, atlas }) => {
        const atlasFromArk = this.mapper.toAtlas(ark);
        return this.compareDeployments(atlasFromArk, atlas);
      })
    );
  }

  private compareDeployments(d1: DeploymentDto, d2: DeploymentDto): boolean {
    return d1.title === d2.title &&
           d1.type === d2.type &&
           d1.currentState === d2.currentState;
  }
}
```

## Rollback Plan

### Immediate Rollback

If issues are detected:

```typescript
// 1. Disable feature flag
environment.atlas.features.deployments = false;

// 2. Clear ATLAS cache
localStorage.removeItem('atlas-deployments-cache');

// 3. Reload application
window.location.reload();
```

### Gradual Rollback

```typescript
// Reduce percentage of users using ATLAS
environment.atlas.rollout = {
  deployments: 10 // Reduce from 50% to 10%
};
```

## Common Migration Patterns

### Pattern 1: API Endpoint Changes

```typescript
// ARK: /ark-api/deployments
// ATLAS: /v1/deployments

// Solution: Use base URL configuration
const baseUrl = useAtlas ? '/v1' : '/ark-api';
```

### Pattern 2: Different Pagination

```typescript
// ARK: Returns array directly
// ATLAS: Returns PagedResult with items and pagination

// Solution: Normalize in routing service
getDeployments(): Observable<any[]> {
  if (useAtlas) {
    return atlasService.getDeployments().pipe(
      map(result => result.items) // Extract items
    );
  } else {
    return arkService.getDeployments(); // Already array
  }
}
```

### Pattern 3: Authentication Differences

```typescript
// ARK: Uses session cookies
// ATLAS: Uses JWT bearer tokens

// Solution: HTTP interceptor handles both
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (req.url.startsWith('/v1')) {
      // ATLAS - add JWT token
      const token = this.authService.getAtlasToken();
      req = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
    }
    // ARK - cookies handled automatically
    return next.handle(req);
  }
}
```

## Post-Migration Cleanup

After successful migration:

1. **Remove ARK service** implementations
2. **Remove routing services** - use ATLAS directly
3. **Remove feature flags** - ATLAS is default
4. **Remove data mappers** - no longer needed
5. **Update documentation**
6. **Archive ARK code** - don't delete immediately

```bash
# Move ARK code to archive
mkdir -p archive/ark-services
mv src/app/ark/services/* archive/ark-services/

# Update imports
# Remove ARK service imports from components
```

## Troubleshooting

### Issue: Data inconsistency between ARK and ATLAS

**Solution**: Implement sync service and run consistency checks

### Issue: Performance degradation

**Solution**: Check caching, optimize queries, monitor API response times

### Issue: Authentication failures

**Solution**: Verify token refresh logic, check token expiration

### Issue: Users seeing different data

**Solution**: Clear caches, verify feature flag configuration

## Resources

- [ATLAS API Documentation](../../../specs/atlas-api.json)
- [Developer Guide](./DEVELOPER_GUIDE.md)
- [Feature Flag Configuration](../../../environments/README.md)
- [Monitoring Dashboard](https://monitoring.example.com/atlas)
