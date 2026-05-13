# Mock Services Documentation

## Overview

Mock services enable local development and testing without requiring a live ATLAS backend. This guide explains how to create, configure, and use mock services for ATLAS integration development.

## Why Mock Services?

- **Local Development** - Work without backend dependencies
- **Faster Iteration** - No network latency
- **Predictable Data** - Control test scenarios
- **Offline Development** - Work without internet
- **Integration Testing** - Test error scenarios
- **Demo Environments** - Showcase features without backend

## Architecture

### Mock Service Strategy

```
Component → Service → Mock/Real Implementation
                ↓
         Environment Config
```

### Implementation Approaches

1. **In-Memory Mock** - Simple data stored in service
2. **JSON Server** - REST API from JSON files
3. **MSW (Mock Service Worker)** - Intercept HTTP requests
4. **Angular In-Memory Web API** - Built-in Angular solution

## Approach 1: In-Memory Mock Services

### Creating a Mock Service

```typescript
// services/mocks/deployment.service.mock.ts
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { 
  DeploymentDto, 
  DeploymentDetailDto,
  CreateDeploymentRequest,
  LifecycleState,
  DeploymentType 
} from '../../models/deployment.model';

/**
 * Mock implementation of DeploymentService for local development.
 * Simulates API responses with in-memory data.
 */
@Injectable({ providedIn: 'root' })
export class DeploymentServiceMock {
  private deployments: Map<string, DeploymentDetailDto> = new Map();
  private nextId = 1;

  constructor() {
    this.initializeMockData();
  }

  /**
   * Initialize with sample data
   */
  private initializeMockData(): void {
    const mockDeployments: DeploymentDetailDto[] = [
      {
        id: '1',
        title: 'Production Database Migration',
        type: DeploymentType.STANDARD,
        currentState: LifecycleState.READY,
        clientId: 'client-001',
        createdBy: 'john.doe@example.com',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-20'),
        transitionHistory: [],
        evidence: [],
        approvals: [],
        exceptions: []
      },
      {
        id: '2',
        title: 'Emergency Security Patch',
        type: DeploymentType.EMERGENCY,
        currentState: LifecycleState.IN_PROGRESS,
        clientId: 'client-001',
        createdBy: 'jane.smith@example.com',
        createdAt: new Date('2024-01-18'),
        updatedAt: new Date('2024-01-18'),
        transitionHistory: [],
        evidence: [],
        approvals: [],
        exceptions: []
      }
    ];

    mockDeployments.forEach(d => this.deployments.set(d.id, d));
  }

  /**
   * Get all deployments with optional filtering
   */
  getDeployments(params?: any): Observable<PagedResult<DeploymentDto>> {
    let items = Array.from(this.deployments.values());

    // Apply filters
    if (params?.state) {
      items = items.filter(d => d.currentState === params.state);
    }
    if (params?.type) {
      items = items.filter(d => d.type === params.type);
    }

    // Simulate pagination
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedItems = items.slice(start, end);

    const result: PagedResult<DeploymentDto> = {
      items: paginatedItems,
      pagination: {
        currentPage: page,
        pageSize: pageSize,
        totalCount: items.length,
        totalPages: Math.ceil(items.length / pageSize)
      }
    };

    // Simulate network delay
    return of(result).pipe(delay(500));
  }

  /**
   * Get deployment by ID
   */
  getDeployment(id: string): Observable<DeploymentDetailDto> {
    const deployment = this.deployments.get(id);
    
    if (!deployment) {
      return throwError(() => ({
        status: 404,
        message: `Deployment ${id} not found`
      })).pipe(delay(300));
    }

    return of(deployment).pipe(delay(300));
  }

  /**
   * Create new deployment
   */
  createDeployment(request: CreateDeploymentRequest): Observable<DeploymentDto> {
    const newDeployment: DeploymentDetailDto = {
      id: String(this.nextId++),
      title: request.title,
      type: request.type,
      currentState: LifecycleState.DRAFT,
      clientId: 'client-001',
      createdBy: 'current.user@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: request.metadata,
      transitionHistory: [],
      evidence: [],
      approvals: [],
      exceptions: []
    };

    this.deployments.set(newDeployment.id, newDeployment);
    return of(newDeployment).pipe(delay(500));
  }

  /**
   * Transition deployment state
   */
  transitionState(id: string, request: any): Observable<void> {
    const deployment = this.deployments.get(id);
    
    if (!deployment) {
      return throwError(() => ({
        status: 404,
        message: `Deployment ${id} not found`
      }));
    }

    // Update state
    deployment.currentState = request.targetState;
    deployment.updatedAt = new Date();

    return of(void 0).pipe(delay(800));
  }
}
```


### Configuring Mock Services

Use environment configuration to switch between real and mock services:

```typescript
// environments/environment.ts (development)
export const environment = {
  production: false,
  useMockServices: true,
  atlasApiUrl: 'http://localhost:4200/api' // Not used when mocking
};

// environments/environment.prod.ts (production)
export const environment = {
  production: true,
  useMockServices: false,
  atlasApiUrl: 'https://atlas-api.example.com'
};
```

### Providing Mock Services

```typescript
// atlas.module.ts
import { environment } from '../../../environments/environment';
import { DeploymentService } from './services/deployment.service';
import { DeploymentServiceMock } from './services/mocks/deployment.service.mock';

@NgModule({
  providers: [
    {
      provide: DeploymentService,
      useClass: environment.useMockServices ? DeploymentServiceMock : DeploymentService
    }
  ]
})
export class AtlasModule {}
```

## Approach 2: Angular In-Memory Web API

### Installation

```bash
npm install angular-in-memory-web-api --save-dev
```

### Creating In-Memory Data Service

```typescript
// services/mocks/in-memory-data.service.ts
import { Injectable } from '@angular/core';
import { InMemoryDbService, RequestInfo } from 'angular-in-memory-web-api';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class InMemoryDataService implements InMemoryDbService {
  
  createDb() {
    const deployments = [
      {
        id: '1',
        title: 'Production Database Migration',
        type: 'STANDARD',
        currentState: 'READY',
        clientId: 'client-001',
        createdBy: 'john.doe@example.com',
        createdAt: '2024-01-15T00:00:00Z',
        updatedAt: '2024-01-20T00:00:00Z'
      },
      {
        id: '2',
        title: 'Emergency Security Patch',
        type: 'EMERGENCY',
        currentState: 'IN_PROGRESS',
        clientId: 'client-001',
        createdBy: 'jane.smith@example.com',
        createdAt: '2024-01-18T00:00:00Z',
        updatedAt: '2024-01-18T00:00:00Z'
      }
    ];

    const approvals = [
      {
        id: '1',
        deploymentId: '1',
        forState: 'READY',
        status: 'APPROVED',
        approverId: 'manager@example.com',
        approvedAt: '2024-01-19T00:00:00Z'
      }
    ];

    return { deployments, approvals };
  }

  /**
   * Customize HTTP responses
   */
  responseInterceptor(res: any, ri: RequestInfo): any {
    // Add custom headers
    res.headers = res.headers || {};
    res.headers['X-Mock-Service'] = 'true';
    
    // Simulate delays
    res.delay = 500;
    
    return res;
  }

  /**
   * Generate new ID for POST requests
   */
  genId(collection: any[], collectionName: string): string {
    return collection.length > 0
      ? String(Math.max(...collection.map(item => +item.id)) + 1)
      : '1';
  }
}
```

### Registering In-Memory API

```typescript
// app.module.ts (development only)
import { HttpClientInMemoryWebApiModule } from 'angular-in-memory-web-api';
import { InMemoryDataService } from './features/atlas/services/mocks/in-memory-data.service';
import { environment } from '../environments/environment';

@NgModule({
  imports: [
    HttpClientModule,
    environment.useMockServices
      ? HttpClientInMemoryWebApiModule.forRoot(InMemoryDataService, {
          dataEncapsulation: false,
          delay: 500,
          passThruUnknownUrl: true
        })
      : []
  ]
})
export class AppModule {}
```

## Approach 3: Mock Service Worker (MSW)

### Installation

```bash
npm install msw --save-dev
npx msw init public/ --save
```

### Creating Request Handlers

```typescript
// mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  // Get deployments
  rest.get('/v1/deployments', (req, res, ctx) => {
    const state = req.url.searchParams.get('state');
    
    let deployments = [
      {
        id: '1',
        title: 'Production Database Migration',
        type: 'STANDARD',
        currentState: 'READY',
        clientId: 'client-001',
        createdBy: 'john.doe@example.com',
        createdAt: '2024-01-15T00:00:00Z',
        updatedAt: '2024-01-20T00:00:00Z'
      }
    ];

    if (state) {
      deployments = deployments.filter(d => d.currentState === state);
    }

    return res(
      ctx.delay(500),
      ctx.status(200),
      ctx.json({
        items: deployments,
        pagination: {
          currentPage: 1,
          pageSize: 10,
          totalCount: deployments.length,
          totalPages: 1
        }
      })
    );
  }),

  // Get deployment by ID
  rest.get('/v1/deployments/:id', (req, res, ctx) => {
    const { id } = req.params;
    
    if (id === '999') {
      return res(
        ctx.delay(300),
        ctx.status(404),
        ctx.json({
          type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
          title: 'Not Found',
          status: 404,
          detail: `Deployment ${id} not found`
        })
      );
    }

    return res(
      ctx.delay(300),
      ctx.status(200),
      ctx.json({
        id,
        title: 'Production Database Migration',
        type: 'STANDARD',
        currentState: 'READY',
        clientId: 'client-001',
        createdBy: 'john.doe@example.com',
        createdAt: '2024-01-15T00:00:00Z',
        updatedAt: '2024-01-20T00:00:00Z',
        transitionHistory: [],
        evidence: [],
        approvals: [],
        exceptions: []
      })
    );
  }),

  // Create deployment
  rest.post('/v1/deployments', async (req, res, ctx) => {
    const body = await req.json();
    
    return res(
      ctx.delay(800),
      ctx.status(201),
      ctx.json({
        id: String(Math.floor(Math.random() * 1000)),
        ...body,
        currentState: 'DRAFT',
        clientId: 'client-001',
        createdBy: 'current.user@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    );
  }),

  // Simulate error scenarios
  rest.post('/v1/deployments/:id/transition', (req, res, ctx) => {
    // Simulate validation error
    return res(
      ctx.delay(500),
      ctx.status(400),
      ctx.json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Validation Error',
        status: 400,
        detail: 'Insufficient approvals for state transition',
        errors: {
          approvals: ['At least 2 approvals required']
        }
      })
    );
  })
];
```

### Setting Up MSW

```typescript
// mocks/browser.ts
import { setupWorker } from 'msw';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
```

### Enabling MSW in Development

```typescript
// main.ts
import { environment } from './environments/environment';

if (environment.useMockServices) {
  import('./mocks/browser').then(({ worker }) => {
    worker.start({
      onUnhandledRequest: 'bypass'
    }).then(() => {
      console.log('Mock Service Worker started');
      bootstrapApplication();
    });
  });
} else {
  bootstrapApplication();
}

function bootstrapApplication() {
  platformBrowserDynamic()
    .bootstrapModule(AppModule)
    .catch(err => console.error(err));
}
```


## Approach 4: JSON Server

### Installation

```bash
npm install json-server --save-dev
```

### Creating Mock Data

```json
// mocks/db.json
{
  "deployments": [
    {
      "id": "1",
      "title": "Production Database Migration",
      "type": "STANDARD",
      "currentState": "READY",
      "clientId": "client-001",
      "createdBy": "john.doe@example.com",
      "createdAt": "2024-01-15T00:00:00Z",
      "updatedAt": "2024-01-20T00:00:00Z"
    },
    {
      "id": "2",
      "title": "Emergency Security Patch",
      "type": "EMERGENCY",
      "currentState": "IN_PROGRESS",
      "clientId": "client-001",
      "createdBy": "jane.smith@example.com",
      "createdAt": "2024-01-18T00:00:00Z",
      "updatedAt": "2024-01-18T00:00:00Z"
    }
  ],
  "approvals": [
    {
      "id": "1",
      "deploymentId": "1",
      "forState": "READY",
      "status": "APPROVED",
      "approverId": "manager@example.com",
      "approvedAt": "2024-01-19T00:00:00Z"
    }
  ],
  "exceptions": [],
  "agents": []
}
```

### Running JSON Server

```bash
# Start JSON server
json-server --watch mocks/db.json --port 3000 --delay 500

# With custom routes
json-server --watch mocks/db.json --routes mocks/routes.json --port 3000
```

### Custom Routes

```json
// mocks/routes.json
{
  "/v1/deployments": "/deployments",
  "/v1/deployments/:id": "/deployments/:id",
  "/v1/approvals": "/approvals",
  "/v1/exceptions": "/exceptions"
}
```

### NPM Scripts

```json
// package.json
{
  "scripts": {
    "mock:server": "json-server --watch mocks/db.json --port 3000 --delay 500",
    "dev:mock": "concurrently \"npm run mock:server\" \"ng serve\""
  }
}
```

## Testing with Mock Services

### Unit Tests

```typescript
// deployment-list.component.spec.ts
import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { DeploymentService } from '../../services/deployment.service';
import { DeploymentServiceMock } from '../../services/mocks/deployment.service.mock';

describe('DeploymentListComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DeploymentListComponent],
      providers: [
        provideMockStore(),
        { provide: DeploymentService, useClass: DeploymentServiceMock }
      ]
    }).compileComponents();
  });

  it('should load deployments', (done) => {
    const service = TestBed.inject(DeploymentService);
    service.getDeployments().subscribe(result => {
      expect(result.items.length).toBeGreaterThan(0);
      done();
    });
  });
});
```

### E2E Tests

```typescript
// e2e/deployments.e2e-spec.ts
import { browser, by, element } from 'protractor';

describe('Deployments Page', () => {
  beforeEach(() => {
    // Enable mock services for E2E
    browser.get('/atlas/deployments?mock=true');
  });

  it('should display deployment list', () => {
    const rows = element.all(by.css('p-table tbody tr'));
    expect(rows.count()).toBeGreaterThan(0);
  });

  it('should create new deployment', () => {
    element(by.css('[data-test="create-deployment"]')).click();
    element(by.css('[formControlName="title"]')).sendKeys('Test Deployment');
    element(by.css('[data-test="submit"]')).click();
    
    expect(element(by.css('.success-message')).isPresent()).toBe(true);
  });
});
```

## Mock Data Generators

### Using Faker.js

```bash
npm install @faker-js/faker --save-dev
```

```typescript
// mocks/data-generator.ts
import { faker } from '@faker-js/faker';
import { DeploymentDto, LifecycleState, DeploymentType } from '../models/deployment.model';

export class MockDataGenerator {
  
  static generateDeployment(overrides?: Partial<DeploymentDto>): DeploymentDto {
    return {
      id: faker.string.uuid(),
      title: faker.company.catchPhrase(),
      type: faker.helpers.arrayElement(Object.values(DeploymentType)),
      currentState: faker.helpers.arrayElement(Object.values(LifecycleState)),
      clientId: faker.string.uuid(),
      createdBy: faker.internet.email(),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      ...overrides
    };
  }

  static generateDeployments(count: number): DeploymentDto[] {
    return Array.from({ length: count }, () => this.generateDeployment());
  }

  static generateDeploymentsByState(state: LifecycleState, count: number): DeploymentDto[] {
    return Array.from({ length: count }, () => 
      this.generateDeployment({ currentState: state })
    );
  }
}
```

### Using Generated Data

```typescript
// services/mocks/deployment.service.mock.ts
import { MockDataGenerator } from '../../mocks/data-generator';

@Injectable()
export class DeploymentServiceMock {
  private deployments: Map<string, DeploymentDto>;

  constructor() {
    // Generate 50 random deployments
    const mockDeployments = MockDataGenerator.generateDeployments(50);
    this.deployments = new Map(mockDeployments.map(d => [d.id, d]));
  }
}
```

## Simulating Error Scenarios

### Network Errors

```typescript
// Mock service with error simulation
getDeployment(id: string): Observable<DeploymentDto> {
  // Simulate 404
  if (id === 'not-found') {
    return throwError(() => ({
      status: 404,
      message: 'Deployment not found'
    })).pipe(delay(300));
  }

  // Simulate 500
  if (id === 'server-error') {
    return throwError(() => ({
      status: 500,
      message: 'Internal server error'
    })).pipe(delay(300));
  }

  // Simulate timeout
  if (id === 'timeout') {
    return throwError(() => ({
      status: 0,
      message: 'Request timeout'
    })).pipe(delay(30000));
  }

  // Normal response
  return of(this.deployments.get(id)).pipe(delay(300));
}
```

### Validation Errors

```typescript
createDeployment(request: CreateDeploymentRequest): Observable<DeploymentDto> {
  // Simulate validation error
  if (!request.title || request.title.length < 3) {
    return throwError(() => ({
      status: 400,
      message: 'Validation failed',
      errors: {
        title: ['Title must be at least 3 characters']
      }
    })).pipe(delay(300));
  }

  // Normal response
  const newDeployment = { /* ... */ };
  return of(newDeployment).pipe(delay(500));
}
```

## Best Practices

### DO

✅ **Use environment flags** - Control mock usage via configuration
✅ **Simulate realistic delays** - Add network latency with `delay()`
✅ **Generate realistic data** - Use Faker.js for varied test data
✅ **Test error scenarios** - Mock 4xx and 5xx responses
✅ **Keep mocks in sync** - Update when API changes
✅ **Document mock behavior** - Explain special test IDs

### DON'T

❌ **Commit mock services to production** - Use environment checks
❌ **Make mocks too complex** - Keep them simple and maintainable
❌ **Forget to test with real API** - Mocks are not a replacement
❌ **Hardcode mock data** - Use generators for flexibility
❌ **Skip error scenarios** - Test failure paths

## Switching Between Mock and Real Services

### Runtime Toggle

```typescript
// Add query parameter support
@Injectable()
export class AtlasConfigService {
  useMockServices(): boolean {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('mock') === 'true' || environment.useMockServices;
  }
}

// Use in module
providers: [
  {
    provide: DeploymentService,
    useFactory: (config: AtlasConfigService) => 
      config.useMockServices() ? new DeploymentServiceMock() : new DeploymentService(),
    deps: [AtlasConfigService]
  }
]
```

### Developer Tools Integration

```typescript
// Add to browser console
(window as any).enableMockServices = () => {
  localStorage.setItem('useMockServices', 'true');
  location.reload();
};

(window as any).disableMockServices = () => {
  localStorage.removeItem('useMockServices');
  location.reload();
};
```

## Resources

- [Angular In-Memory Web API](https://github.com/angular/angular/tree/main/packages/misc/angular-in-memory-web-api)
- [Mock Service Worker](https://mswjs.io/)
- [JSON Server](https://github.com/typicode/json-server)
- [Faker.js](https://fakerjs.dev/)
- [Testing Best Practices](https://angular.io/guide/testing)
