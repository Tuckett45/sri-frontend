# SRI Frontend - Copilot Instructions

## Project Overview
**SRI Frontend** is an Angular 18 dashboard application for managing Street Resources Initiative projects. It handles role-based access to multiple feature areas (punch lists, street sheets, expenses, market controller tracking, etc.) with a multi-role permission system (Client, PM, CM, OSP Coordinator, Controller, HR, Admin).

## Architecture Essentials

### Core Stack
- **Framework**: Angular 18.2.6 with TypeScript 5.4
- **UI**: Angular Material 18 + PrimeNG 18 (cards, dialogs, buttons, tables)
- **Maps**: Leaflet with marker clustering and search
- **Styling**: SCSS + Tailwind CSS (via tailwind.config.js)
- **State**: Minimal - uses RxJS BehaviorSubjects in services, no NgRx store
- **Charts**: ng2-charts + Chart.js for KPI visualization
- **Forms**: Reactive Forms module for validation
- **HTTP**: HttpClient with interceptor-style headers for all requests

### Key Services (Singleton Pattern - providedIn: 'root')
All major services follow the **singleton + cache pattern** with observable caching:

| Service | Purpose | Caching Strategy |
|---------|---------|------------------|
| `AuthService` | Login/logout, user roles, token mgmt | BehaviorSubject for role state |
| `DashboardService` | Stats aggregation (client/PM/SRI) | shareReplay(1) on GET requests |
| `PreliminaryPunchListService` | Punch list CRUD + search with facets | clearCaches() on mutations |
| `StreetSheetService` | Street sheet CRUD + map data | streetSheetsCache$ pattern |
| `ExpenseApiService` | Expense submission, receipt analysis, exports | Form data uploads with files |
| `TpsService` | Violations, city scorecards, budget tracking | shareReplay(1) |
| `MapMarkerService` | Marker CRUD for street sheets | Simple request-response |

**Important**: Services clear their caches on POST/PUT/DELETE to ensure freshness. Always call the service method; never manage HTTP manually.

### Component Organization
- **Smart/Container**: `*-sheet.component.ts`, `overview.component.ts` - handle routing, data fetching, state
- **Dumb/Presentational**: `widget.component.ts`, `chart.component.ts` - pure input/output with `@Input()`, `@Output()`
- **Modals**: `*-modal.component.ts` - launched via `MatDialog.open()`
- **Shared**: `navbar.component.ts`, `filter.component.ts` - used across pages

**Lazy Routes**: Preliminary Punch List, Expenses, and TPS modules are lazy-loaded via `loadChildren()` in routing.

### Data Models
- Flat TypeScript classes in `src/app/models/` (e.g., `User`, `PreliminaryPunchList`, `Expense`)
- Enums in separate files: `role.enum.ts`, `state-abbreviation.enum.ts`
- No explicit serialization - JSON responses are cast to model classes directly

### Authentication & Guards
- **AuthGuard**: Protects routes; redirects unauthenticated users to `/login`
- **Auth State**: User stored in `localStorage` + `sessionStorage` (token)
- **Role Checks**: `AuthService.isClient()`, `isPM()`, `isCoordinator()`, etc. - use for conditional UI
- **Token Handling**: Set in request headers via `Ocp-Apim-Subscription-Key` (Azure API Management header)

## Conventions & Patterns

### HTTP Requests
All services follow this pattern:
```typescript
// Single header config
private httpOptions = {
  headers: new HttpHeaders({
    'Content-Type': 'application/json',
    'Ocp-Apim-Subscription-Key': environment.apiSubscriptionKey
  })
};

// GET with caching
getStreetSheets(): Observable<StreetSheet[]> {
  if (!this.cache$) {
    this.cache$ = this.http.get(...).pipe(shareReplay(1));
  }
  return this.cache$;
}

// POST/PUT with cache invalidation
updateEntry(entry): Observable<any> {
  this.cache$ = null;  // Clear immediately
  return this.http.post(...).pipe(tap(() => { /* UI update */ }));
}
```

### Component Templates
- Use `*ngIf` with role checks: `*ngIf="authService.isPM()"`
- PrimeNG components with `pButton`, `pMenu`, `p-card` directives
- Two-way binding via `[(ngModel)]` or reactive forms `formControl`
- Toast notifications via `ToastrService.success('message')`
- Modals via `MatDialog.open(ComponentClass, { data: {...} })`

### Search & Filtering
- **PunchList**: `searchPunchLists(params: SearchParams)` - supports CSV multi-selects, facet-aware
- **Expenses**: `searchExpenses(request)` - date range + status filters
- All use 0-based pagination (page 0 = first page)

### File Uploads
- **Expenses**: FormData with file + metadata appended as string fields
- **Receipt Analysis**: POST FormData with AI response processing
- **Exports**: Use `ExpenseExportService` and `FileExport` utilities for PDF/ZIP generation

## Common Tasks

### Add a New Feature
1. Create component in `src/app/components/<feature>/`
2. Create service in `src/app/services/<feature>.service.ts` (injectable + caching)
3. Add route to `app-routing.module.ts` (lazy-load if > 50KB)
4. Import modules in `app.module.ts` or feature module

### Add Role-Based UI
```typescript
// In component
export class MyComponent {
  constructor(public authService: AuthService) {}
}

// In template
<div *ngIf="authService.isCoordinator()">Coordinator view</div>
<div *ngIf="authService.isPM()">PM view</div>
```

### Handle Paginated Results
```typescript
// Service returns PagedResponse<T>
interface PagedResponse<T> {
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  items: T[];
}
```

### Environment Switching
- `environment.ts` (production), `staging_environment`, `local_environment` defined in `environments/environments.ts`
- Import and use: `import { environment } from 'src/environments/environments'`
- API base: `${environment.apiUrl}/endpoint`

## Testing
- **Unit**: `karma` + `jasmine` (via `npm test`)
- **E2E**: None configured (use manual testing via `npm start`)
- Specs follow `*.spec.ts` naming; guards & services have basic tests

## Build & Deployment
- **Dev**: `npm start` (ng serve on :4200)
- **Production**: `npm run build` (outputs to `dist/sri-frontend/`)
- **Watch**: `npm run watch` (rebuild on file changes)
- **Deployment**: Via Azure Static Web Apps (see `swa-cli.config.json`)

## Important Notes

### Feature Flags (Current Branch: codex/create-lightweight-feature-flag-system)
- Panel component exists at `feature-flags/` with toggle UI
- Feature flag service implementation is being developed
- Flags persist to localStorage per user
- Used for experimental feature rollout

### Common Pitfalls
1. **Forgetting cache invalidation**: After POST/PUT, always clear service cache
2. **Role checks in template**: Use `public authService` in component to access from template
3. **Async operations**: Always subscribe or use `async` pipe; unsubscribe in `ngOnDestroy`
4. **Leaflet maps**: Initialize map in `ngAfterViewInit`, not `ngOnInit`
5. **Multi-select filters**: Convert arrays to CSV strings before sending to backend

### Performance
- Components use `standalone: false` (older pattern) - migrate to standalone if creating new
- PrimeNG DataTable with virtualScroll for large datasets
- Images compressed via `NgxImageCompressService`

## Key Files Reference
- **Routes**: `src/app/app-routing.module.ts`
- **Auth**: `src/auth.guard.ts`, `src/app/services/auth.service.ts`
- **Types**: `src/app/models/role.enum.ts`, `src/app/models/user.model.ts`
- **Config**: `src/environments/environments.ts`
- **Main module**: `src/app/app.module.ts` (all imports/providers)
