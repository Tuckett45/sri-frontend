# ATLAS Integration Developer Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Architecture Overview](#architecture-overview)
4. [Adding New Features](#adding-new-features)
5. [Common Integration Patterns](#common-integration-patterns)
6. [State Management](#state-management)
7. [Error Handling](#error-handling)
8. [Testing](#testing)
9. [Performance Optimization](#performance-optimization)
10. [Security Considerations](#security-considerations)

## Introduction

This guide helps developers understand and extend the ATLAS integration in the ARK Angular frontend. ATLAS (Advanced Technology Logistics and Automation System) is a control plane microservice platform that provides centralized API services for deployment management, AI analysis, approvals, exceptions, agents, and query building.

### Prerequisites

- Angular 18.2.6 knowledge
- NgRx state management experience
- RxJS reactive programming
- TypeScript 5.4.5
- Understanding of REST APIs and SignalR

### Key Technologies

- **Angular 18.2.6** - Frontend framework
- **NgRx 18.0.2** - State management
- **RxJS 7.8.0** - Reactive programming
- **SignalR 9.0.6** - Real-time communication
- **Angular Material 18.2.6** - UI components
- **PrimeNG 18.0.2** - Data tables and advanced UI

## Getting Started

### Project Structure

```
src/app/features/atlas/
├── components/          # UI components
│   ├── deployments/    # Deployment management UI
│   ├── ai-analysis/    # AI analysis UI
│   ├── approvals/      # Approval workflow UI
│   ├── exceptions/     # Exception management UI
│   ├── agents/         # Agent execution UI
│   └── query-builder/  # Query builder UI
├── services/           # Business logic and API clients
├── state/              # NgRx state management
│   ├── deployments/
│   ├── ai-analysis/
│   ├── approvals/
│   ├── exceptions/
│   ├── agents/
│   └── query-builder/
├── models/             # TypeScript interfaces
├── guards/             # Route guards
├── interceptors/       # HTTP interceptors
├── utils/              # Utility functions
└── docs/               # Documentation
```

### Running the Application

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run tests
npm test

# Build for production
npm run build
```


## Architecture Overview

### High-Level Architecture

The ATLAS integration follows a layered architecture:

1. **Presentation Layer** - Angular components and templates
2. **State Management Layer** - NgRx store, actions, reducers, effects, selectors
3. **Service Layer** - API clients and business logic
4. **HTTP Layer** - Interceptors and HTTP client
5. **ATLAS API** - Backend microservices

### Data Flow

```
User Action → Component → Store Action → Effect → Service → HTTP Interceptor → ATLAS API
                ↑                                                                    ↓
                └────────────── Selector ← Reducer ← Success/Failure Action ←──────┘
```

### Module Organization

The ATLAS feature module is lazy-loaded for optimal performance:

```typescript
// In app-routing.module.ts
{
  path: 'atlas',
  loadChildren: () => import('./features/atlas/atlas.module').then(m => m.AtlasModule),
  canActivate: [AtlasFeatureGuard]
}
```

## Adding New Features

### Step 1: Define Models

Create TypeScript interfaces in `models/`:

```typescript
// models/my-feature.model.ts
export interface MyFeatureDto {
  id: string;
  name: string;
  status: MyFeatureStatus;
  createdAt: Date;
}

export enum MyFeatureStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE'
}

export interface CreateMyFeatureRequest {
  name: string;
}
```

### Step 2: Create Service

Create an API client service in `services/`:

```typescript
// services/my-feature.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MyFeatureDto, CreateMyFeatureRequest } from '../models/my-feature.model';
import { AtlasErrorHandlerService } from './atlas-error-handler.service';

@Injectable({ providedIn: 'root' })
export class MyFeatureService {
  private readonly baseUrl = '/v1/my-feature';

  constructor(
    private http: HttpClient,
    private errorHandler: AtlasErrorHandlerService
  ) {}

  getAll(): Observable<MyFeatureDto[]> {
    return this.http.get<MyFeatureDto[]>(this.baseUrl)
      .pipe(catchError(this.errorHandler.handleError));
  }

  getById(id: string): Observable<MyFeatureDto> {
    return this.http.get<MyFeatureDto>(`${this.baseUrl}/${id}`)
      .pipe(catchError(this.errorHandler.handleError));
  }

  create(request: CreateMyFeatureRequest): Observable<MyFeatureDto> {
    return this.http.post<MyFeatureDto>(this.baseUrl, request)
      .pipe(catchError(this.errorHandler.handleError));
  }
}
```

### Step 3: Create NgRx State

Create state management files in `state/my-feature/`:

#### State Interface

```typescript
// state/my-feature/my-feature.state.ts
export interface MyFeatureState {
  items: {
    entities: { [id: string]: MyFeatureDto };
    ids: string[];
    loading: boolean;
    error: any | null;
  };
  selectedId: string | null;
}

export const initialState: MyFeatureState = {
  items: {
    entities: {},
    ids: [],
    loading: false,
    error: null
  },
  selectedId: null
};
```


#### Actions

```typescript
// state/my-feature/my-feature.actions.ts
import { createAction, props } from '@ngrx/store';
import { MyFeatureDto, CreateMyFeatureRequest } from '../../models/my-feature.model';

export const loadMyFeatures = createAction('[MyFeature] Load Items');
export const loadMyFeaturesSuccess = createAction(
  '[MyFeature] Load Items Success',
  props<{ items: MyFeatureDto[] }>()
);
export const loadMyFeaturesFailure = createAction(
  '[MyFeature] Load Items Failure',
  props<{ error: any }>()
);

export const createMyFeature = createAction(
  '[MyFeature] Create Item',
  props<{ request: CreateMyFeatureRequest }>()
);
export const createMyFeatureSuccess = createAction(
  '[MyFeature] Create Item Success',
  props<{ item: MyFeatureDto }>()
);
export const createMyFeatureFailure = createAction(
  '[MyFeature] Create Item Failure',
  props<{ error: any }>()
);
```

#### Reducer

```typescript
// state/my-feature/my-feature.reducer.ts
import { createReducer, on } from '@ngrx/store';
import * as MyFeatureActions from './my-feature.actions';
import { initialState } from './my-feature.state';

export const myFeatureReducer = createReducer(
  initialState,
  
  on(MyFeatureActions.loadMyFeatures, (state) => ({
    ...state,
    items: { ...state.items, loading: true, error: null }
  })),
  
  on(MyFeatureActions.loadMyFeaturesSuccess, (state, { items }) => {
    const entities = items.reduce((acc, item) => ({ ...acc, [item.id]: item }), {});
    const ids = items.map(item => item.id);
    return {
      ...state,
      items: { entities, ids, loading: false, error: null }
    };
  }),
  
  on(MyFeatureActions.loadMyFeaturesFailure, (state, { error }) => ({
    ...state,
    items: { ...state.items, loading: false, error }
  })),
  
  on(MyFeatureActions.createMyFeatureSuccess, (state, { item }) => ({
    ...state,
    items: {
      entities: { ...state.items.entities, [item.id]: item },
      ids: [...state.items.ids, item.id],
      loading: false,
      error: null
    }
  }))
);
```

#### Effects

```typescript
// state/my-feature/my-feature.effects.ts
import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import * as MyFeatureActions from './my-feature.actions';
import { MyFeatureService } from '../../services/my-feature.service';

@Injectable()
export class MyFeatureEffects {
  
  loadMyFeatures$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MyFeatureActions.loadMyFeatures),
      switchMap(() =>
        this.service.getAll().pipe(
          map(items => MyFeatureActions.loadMyFeaturesSuccess({ items })),
          catchError(error => of(MyFeatureActions.loadMyFeaturesFailure({ error })))
        )
      )
    )
  );
  
  createMyFeature$ = createEffect(() =>
    this.actions$.pipe(
      ofType(MyFeatureActions.createMyFeature),
      switchMap(({ request }) =>
        this.service.create(request).pipe(
          map(item => MyFeatureActions.createMyFeatureSuccess({ item })),
          tap(() => this.toastr.success('Item created successfully')),
          catchError(error => {
            this.toastr.error('Failed to create item');
            return of(MyFeatureActions.createMyFeatureFailure({ error }));
          })
        )
      )
    )
  );
  
  constructor(
    private actions$: Actions,
    private service: MyFeatureService,
    private toastr: ToastrService
  ) {}
}
```

#### Selectors

```typescript
// state/my-feature/my-feature.selectors.ts
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { MyFeatureState } from './my-feature.state';

export const selectMyFeatureState = createFeatureSelector<MyFeatureState>('myFeature');

export const selectAllMyFeatures = createSelector(
  selectMyFeatureState,
  (state) => state.items.ids.map(id => state.items.entities[id])
);

export const selectMyFeaturesLoading = createSelector(
  selectMyFeatureState,
  (state) => state.items.loading
);

export const selectMyFeaturesError = createSelector(
  selectMyFeatureState,
  (state) => state.items.error
);

export const selectMyFeatureById = (id: string) => createSelector(
  selectMyFeatureState,
  (state) => state.items.entities[id]
);
```


### Step 4: Register State in Module

```typescript
// atlas.module.ts
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { myFeatureReducer } from './state/my-feature/my-feature.reducer';
import { MyFeatureEffects } from './state/my-feature/my-feature.effects';

@NgModule({
  imports: [
    // ... other imports
    StoreModule.forFeature('myFeature', myFeatureReducer),
    EffectsModule.forFeature([MyFeatureEffects])
  ]
})
export class AtlasModule {}
```

### Step 5: Create Component

```typescript
// components/my-feature/my-feature-list.component.ts
import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { MyFeatureDto } from '../../models/my-feature.model';
import * as MyFeatureActions from '../../state/my-feature/my-feature.actions';
import * as MyFeatureSelectors from '../../state/my-feature/my-feature.selectors';

@Component({
  selector: 'app-my-feature-list',
  templateUrl: './my-feature-list.component.html',
  styleUrls: ['./my-feature-list.component.scss']
})
export class MyFeatureListComponent implements OnInit {
  items$: Observable<MyFeatureDto[]>;
  loading$: Observable<boolean>;
  error$: Observable<any>;

  constructor(private store: Store) {
    this.items$ = this.store.select(MyFeatureSelectors.selectAllMyFeatures);
    this.loading$ = this.store.select(MyFeatureSelectors.selectMyFeaturesLoading);
    this.error$ = this.store.select(MyFeatureSelectors.selectMyFeaturesError);
  }

  ngOnInit(): void {
    this.store.dispatch(MyFeatureActions.loadMyFeatures());
  }

  onCreate(): void {
    // Navigate to create form or open modal
  }
}
```

### Step 6: Create Template

```html
<!-- components/my-feature/my-feature-list.component.html -->
<div class="my-feature-container">
  <div class="header">
    <h2>My Features</h2>
    <button mat-raised-button color="primary" (click)="onCreate()">
      <mat-icon>add</mat-icon>
      Create New
    </button>
  </div>

  <div *ngIf="loading$ | async" class="loading">
    <mat-spinner></mat-spinner>
  </div>

  <div *ngIf="error$ | async as error" class="error">
    <mat-error>{{ error.message }}</mat-error>
  </div>

  <p-table 
    [value]="(items$ | async) || []"
    [paginator]="true"
    [rows]="10"
    [loading]="loading$ | async">
    <ng-template pTemplate="header">
      <tr>
        <th>Name</th>
        <th>Status</th>
        <th>Created</th>
        <th>Actions</th>
      </tr>
    </ng-template>
    <ng-template pTemplate="body" let-item>
      <tr>
        <td>{{ item.name }}</td>
        <td>{{ item.status }}</td>
        <td>{{ item.createdAt | date:'short' }}</td>
        <td>
          <button mat-icon-button [routerLink]="['/atlas/my-feature', item.id]">
            <mat-icon>visibility</mat-icon>
          </button>
        </td>
      </tr>
    </ng-template>
  </p-table>
</div>
```

## Common Integration Patterns

### Pattern 1: API Call with Loading State

```typescript
// Component
export class MyComponent implements OnInit {
  data$: Observable<MyData[]>;
  loading$: Observable<boolean>;

  constructor(private store: Store) {
    this.data$ = this.store.select(selectMyData);
    this.loading$ = this.store.select(selectMyDataLoading);
  }

  ngOnInit(): void {
    this.store.dispatch(loadMyData());
  }
}
```

### Pattern 2: Form Submission with Validation

```typescript
// Component
export class MyFormComponent {
  form: FormGroup;
  submitting$: Observable<boolean>;

  constructor(
    private fb: FormBuilder,
    private store: Store
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['']
    });
    this.submitting$ = this.store.select(selectSubmitting);
  }

  onSubmit(): void {
    if (this.form.valid) {
      this.store.dispatch(createItem({ request: this.form.value }));
    }
  }
}
```

### Pattern 3: Real-Time Updates with SignalR

```typescript
// Service
@Injectable({ providedIn: 'root' })
export class MyRealtimeService {
  constructor(
    private signalR: AtlasSignalRService,
    private store: Store
  ) {}

  subscribeToUpdates(): void {
    this.signalR.on('MyFeatureUpdated', (data: MyFeatureDto) => {
      this.store.dispatch(myFeatureUpdated({ item: data }));
    });
  }
}
```

### Pattern 4: Optimistic Updates

```typescript
// Effect
updateItem$ = createEffect(() =>
  this.actions$.pipe(
    ofType(updateItem),
    // Optimistically update UI
    tap(({ id, changes }) => {
      this.store.dispatch(updateItemOptimistic({ id, changes }));
    }),
    switchMap(({ id, changes }) =>
      this.service.update(id, changes).pipe(
        map(item => updateItemSuccess({ item })),
        catchError(error => {
          // Revert optimistic update
          this.store.dispatch(revertOptimisticUpdate({ id }));
          return of(updateItemFailure({ error }));
        })
      )
    )
  )
);
```


### Pattern 5: Caching API Responses

```typescript
// Service with caching
@Injectable({ providedIn: 'root' })
export class MyCachedService {
  constructor(
    private http: HttpClient,
    private cache: AtlasCacheService
  ) {}

  getData(): Observable<MyData[]> {
    const cacheKey = 'my-data';
    const cached = this.cache.get<MyData[]>(cacheKey);
    
    if (cached) {
      return of(cached);
    }
    
    return this.http.get<MyData[]>('/api/my-data').pipe(
      tap(data => this.cache.set(cacheKey, data, 300000)) // Cache for 5 minutes
    );
  }
}
```

### Pattern 6: Debounced Search

```typescript
// Component
export class SearchComponent implements OnInit {
  searchControl = new FormControl('');
  results$: Observable<SearchResult[]>;

  constructor(private store: Store) {
    this.results$ = this.store.select(selectSearchResults);
  }

  ngOnInit(): void {
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(term => this.store.dispatch(search({ term })))
    ).subscribe();
  }
}
```

## State Management

### Best Practices

1. **Keep state normalized** - Use entity dictionaries with ID arrays
2. **Use memoized selectors** - Prevent unnecessary re-renders
3. **Handle loading states** - Show spinners during async operations
4. **Handle errors gracefully** - Display user-friendly error messages
5. **Use effects for side effects** - Keep reducers pure
6. **Dispatch actions from components** - Not from services

### State Structure Example

```typescript
export interface FeatureState {
  // Entity storage
  entities: { [id: string]: Entity };
  ids: string[];
  
  // UI state
  selectedId: string | null;
  loading: boolean;
  error: any | null;
  
  // Pagination
  pagination: {
    currentPage: number;
    pageSize: number;
    totalCount: number;
  };
  
  // Filters
  filters: {
    status?: string;
    searchTerm?: string;
  };
}
```

### Selector Optimization

```typescript
// BAD - Creates new array on every call
export const selectItems = createSelector(
  selectState,
  (state) => Object.values(state.entities) // New array every time!
);

// GOOD - Memoized, only recalculates when entities change
export const selectItems = createSelector(
  selectState,
  (state) => state.ids.map(id => state.entities[id])
);

// BETTER - Derived selector with additional memoization
export const selectFilteredItems = createSelector(
  selectItems,
  selectFilters,
  (items, filters) => items.filter(item => matchesFilters(item, filters))
);
```

## Error Handling

### Service-Level Error Handling

```typescript
@Injectable({ providedIn: 'root' })
export class MyService {
  constructor(
    private http: HttpClient,
    private errorHandler: AtlasErrorHandlerService
  ) {}

  getData(): Observable<MyData> {
    return this.http.get<MyData>('/api/data').pipe(
      catchError(this.errorHandler.handleError)
    );
  }
}
```

### Effect-Level Error Handling

```typescript
loadData$ = createEffect(() =>
  this.actions$.pipe(
    ofType(loadData),
    switchMap(() =>
      this.service.getData().pipe(
        map(data => loadDataSuccess({ data })),
        catchError(error => {
          // Log error
          console.error('Failed to load data:', error);
          
          // Show user notification
          this.toastr.error('Failed to load data. Please try again.');
          
          // Dispatch failure action
          return of(loadDataFailure({ error }));
        })
      )
    )
  )
);
```

### Component-Level Error Display

```typescript
// Component
export class MyComponent {
  error$: Observable<any>;

  constructor(private store: Store) {
    this.error$ = this.store.select(selectError);
  }

  retry(): void {
    this.store.dispatch(loadData());
  }
}
```

```html
<!-- Template -->
<div *ngIf="error$ | async as error" class="error-container">
  <mat-error>
    <mat-icon>error</mat-icon>
    {{ error.message || 'An error occurred' }}
  </mat-error>
  <button mat-button (click)="retry()">Retry</button>
</div>
```

## Testing

### Service Testing

```typescript
describe('MyService', () => {
  let service: MyService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MyService, AtlasErrorHandlerService]
    });
    service = TestBed.inject(MyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch data', () => {
    const mockData: MyData[] = [{ id: '1', name: 'Test' }];

    service.getData().subscribe(data => {
      expect(data).toEqual(mockData);
    });

    const req = httpMock.expectOne('/api/my-data');
    expect(req.request.method).toBe('GET');
    req.flush(mockData);
  });
});
```


### Component Testing

```typescript
describe('MyComponent', () => {
  let component: MyComponent;
  let fixture: ComponentFixture<MyComponent>;
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MyComponent],
      imports: [NoopAnimationsModule],
      providers: [
        provideMockStore({
          initialState: {
            myFeature: {
              items: { entities: {}, ids: [], loading: false, error: null }
            }
          }
        })
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(MyComponent);
    component = fixture.componentInstance;
  });

  it('should dispatch load action on init', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.ngOnInit();
    expect(dispatchSpy).toHaveBeenCalledWith(loadMyFeatures());
  });
});
```

### Effect Testing

```typescript
describe('MyFeatureEffects', () => {
  let actions$: Observable<Action>;
  let effects: MyFeatureEffects;
  let service: jasmine.SpyObj<MyFeatureService>;

  beforeEach(() => {
    const serviceSpy = jasmine.createSpyObj('MyFeatureService', ['getAll']);

    TestBed.configureTestingModule({
      providers: [
        MyFeatureEffects,
        provideMockActions(() => actions$),
        { provide: MyFeatureService, useValue: serviceSpy }
      ]
    });

    effects = TestBed.inject(MyFeatureEffects);
    service = TestBed.inject(MyFeatureService) as jasmine.SpyObj<MyFeatureService>;
  });

  it('should load features successfully', (done) => {
    const mockData: MyFeatureDto[] = [{ id: '1', name: 'Test', status: 'ACTIVE', createdAt: new Date() }];
    service.getAll.and.returnValue(of(mockData));

    actions$ = of(loadMyFeatures());

    effects.loadMyFeatures$.subscribe(action => {
      expect(action).toEqual(loadMyFeaturesSuccess({ items: mockData }));
      done();
    });
  });
});
```

## Performance Optimization

### Lazy Loading Modules

```typescript
// Lazy load ATLAS module
const routes: Routes = [
  {
    path: 'atlas',
    loadChildren: () => import('./features/atlas/atlas.module').then(m => m.AtlasModule)
  }
];
```

### Virtual Scrolling for Large Lists

```html
<cdk-virtual-scroll-viewport itemSize="50" class="viewport">
  <div *cdkVirtualFor="let item of items$ | async" class="item">
    {{ item.name }}
  </div>
</cdk-virtual-scroll-viewport>
```

### OnPush Change Detection

```typescript
@Component({
  selector: 'app-my-component',
  templateUrl: './my-component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyComponent {
  // Use observables with async pipe for automatic change detection
  data$ = this.store.select(selectData);
  
  constructor(private store: Store) {}
}
```

### TrackBy Functions

```html
<div *ngFor="let item of items; trackBy: trackById">
  {{ item.name }}
</div>
```

```typescript
trackById(index: number, item: MyItem): string {
  return item.id;
}
```

### Memoized Selectors

```typescript
// Automatically memoized - only recalculates when inputs change
export const selectExpensiveComputation = createSelector(
  selectItems,
  selectFilters,
  (items, filters) => {
    // Expensive computation here
    return items.filter(item => complexFilter(item, filters));
  }
);
```

## Security Considerations

### Input Sanitization

```typescript
// Always sanitize user input before sending to API
import { AtlasInputSanitizerService } from '../services/atlas-input-sanitizer.service';

@Component({...})
export class MyFormComponent {
  constructor(private sanitizer: AtlasInputSanitizerService) {}

  onSubmit(): void {
    const sanitizedData = {
      name: this.sanitizer.sanitizeString(this.form.value.name),
      description: this.sanitizer.sanitizeString(this.form.value.description)
    };
    this.store.dispatch(createItem({ request: sanitizedData }));
  }
}
```

### Response Validation

```typescript
// Validate API responses
import { AtlasResponseValidatorService } from '../services/atlas-response-validator.service';

@Injectable()
export class MyService {
  constructor(
    private http: HttpClient,
    private validator: AtlasResponseValidatorService
  ) {}

  getData(): Observable<MyData> {
    return this.http.get<MyData>('/api/data').pipe(
      map(response => this.validator.validate(response, myDataSchema))
    );
  }
}
```

### Authentication

```typescript
// HTTP interceptor automatically adds auth tokens
// No manual token management needed in components/services

// Check if user has permission
@Component({...})
export class MyComponent {
  canEdit$: Observable<boolean>;

  constructor(private auth: AtlasAuthService) {
    this.canEdit$ = this.auth.hasPermission('my-feature:edit');
  }
}
```

## Troubleshooting

### Common Issues

#### Issue: State not updating

**Solution**: Check that reducer is registered in module and action is dispatched correctly.

```typescript
// Verify in atlas.module.ts
StoreModule.forFeature('myFeature', myFeatureReducer)

// Verify dispatch
this.store.dispatch(myAction({ data }));
```

#### Issue: API calls failing with 401

**Solution**: Check token expiration and refresh logic in AtlasAuthService.

```typescript
// Token is automatically refreshed by interceptor
// Check console for auth errors
```

#### Issue: Component not receiving updates

**Solution**: Ensure you're using async pipe or subscribing to observables.

```html
<!-- Use async pipe -->
<div *ngIf="data$ | async as data">{{ data.name }}</div>
```

#### Issue: Memory leaks

**Solution**: Unsubscribe from observables in ngOnDestroy or use async pipe.

```typescript
export class MyComponent implements OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.data$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(data => {
      // Handle data
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

## Additional Resources

- [ATLAS API Documentation](../../../specs/atlas-api.json)
- [JSDoc Guide](./JSDOC_GUIDE.md)
- [API Client Generation Guide](./API_CLIENT_GENERATION.md)
- [Mock Services Documentation](./MOCK_SERVICES.md)
- [Migration Guide](./MIGRATION_GUIDE.md)
- [Angular Documentation](https://angular.io/docs)
- [NgRx Documentation](https://ngrx.io/docs)
- [RxJS Documentation](https://rxjs.dev/)
