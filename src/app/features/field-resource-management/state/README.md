# Field Resource Management - State Management

This directory contains all NgRx state management modules for the Field Resource Management feature.

## Architecture

The state management follows NgRx best practices with a clear separation of concerns:

- **State**: Defines the shape of each state slice
- **Actions**: Defines all possible state mutations
- **Reducers**: Pure functions that handle state transitions
- **Selectors**: Memoized queries for accessing state
- **Effects**: Side effects handling (API calls, async operations)

## State Slices

### 1. Technicians (`technicians/`)
Manages technician profiles, skills, certifications, and availability.

**Key Features:**
- CRUD operations for technician profiles
- Skill and certification tracking
- Availability management
- Filtering and search

**Selectors:**
- `selectAllTechnicians` - All technicians
- `selectTechnicianById(id)` - Single technician by ID
- `selectFilteredTechnicians` - Filtered based on current filters
- `selectActiveTechnicians` - Only active technicians
- `selectTechniciansWithExpiringCertifications` - Technicians with certs expiring soon

### 2. Jobs (`jobs/`)
Manages work orders, job details, notes, and attachments.

**Key Features:**
- CRUD operations for jobs
- Job status management
- Notes and attachments
- Filtering by status, priority, type, date range

**Selectors:**
- `selectAllJobs` - All jobs
- `selectJobById(id)` - Single job by ID
- `selectFilteredJobs` - Filtered based on current filters
- `selectJobsByStatus(status)` - Jobs by specific status
- `selectActiveJobs` - Non-completed/cancelled jobs
- `selectTodaysJobs` - Jobs scheduled for today

### 3. Assignments (`assignments/`)
Manages technician-to-job assignments, conflicts, and qualified technician matching.

**Key Features:**
- Assign/unassign/reassign operations
- Conflict detection and resolution
- Qualified technician matching
- Skill-based recommendations

**Selectors:**
- `selectAllAssignments` - All assignments
- `selectAssignmentsByJob(jobId)` - Assignments for a job
- `selectAssignmentsByTechnician(technicianId)` - Assignments for a technician
- `selectConflicts` - All detected conflicts
- `selectQualifiedTechnicians` - Qualified technicians for current job

### 4. Time Entries (`time-entries/`)
Manages clock in/out records, labor hours, and mileage tracking.

**Key Features:**
- Clock in/out operations
- Geolocation capture
- Labor hours calculation
- Mileage tracking
- Manual adjustments

**Selectors:**
- `selectAllTimeEntries` - All time entries
- `selectTimeEntriesByJob(jobId)` - Time entries for a job
- `selectTimeEntriesByTechnician(technicianId)` - Time entries for a technician
- `selectActiveTimeEntry` - Currently active time entry
- `selectTotalHoursByJob(jobId)` - Total hours for a job

### 5. Notifications (`notifications/`)
Manages in-app notifications and real-time updates.

**Key Features:**
- Load and display notifications
- Mark as read/unread
- Real-time notification additions
- Grouping by date

**Selectors:**
- `selectAllNotifications` - All notifications
- `selectUnreadNotifications` - Unread notifications only
- `selectUnreadCount` - Count of unread notifications
- `selectNotificationsGroupedByDate` - Grouped by today/yesterday/earlier

### 6. UI (`ui/`)
Manages UI preferences and view states.

**Key Features:**
- Calendar view type (day/week)
- Selected date
- Sidebar open/close
- Mobile menu state

**Selectors:**
- `selectCalendarView` - Current calendar view type
- `selectSelectedDate` - Currently selected date
- `selectSidebarOpen` - Sidebar open state
- `selectMobileMenuOpen` - Mobile menu state

### 7. Reporting (`reporting/`)
Manages dashboard metrics, utilization reports, and performance data.

**Key Features:**
- Dashboard metrics
- Technician utilization reports
- Job performance reports
- KPI tracking

**Selectors:**
- `selectDashboard` - Dashboard metrics
- `selectUtilizationReport` - Utilization report data
- `selectPerformanceReport` - Performance report data
- `selectKPIs` - All KPIs

## Usage Examples

### Dispatching Actions

```typescript
import { Store } from '@ngrx/store';
import * as TechnicianActions from './state/technicians/technician.actions';

constructor(private store: Store) {}

loadTechnicians() {
  this.store.dispatch(TechnicianActions.loadTechnicians({ filters: {} }));
}

createTechnician(technician: CreateTechnicianDto) {
  this.store.dispatch(TechnicianActions.createTechnician({ technician }));
}
```

### Selecting State

```typescript
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { Technician } from './models/technician.model';
import * as TechnicianSelectors from './state/technicians/technician.selectors';

constructor(private store: Store) {}

technicians$: Observable<Technician[]> = this.store.select(
  TechnicianSelectors.selectAllTechnicians
);

loading$: Observable<boolean> = this.store.select(
  TechnicianSelectors.selectTechniciansLoading
);
```

### Using Effects

Effects are automatically registered in the module and handle side effects like API calls. They listen for specific actions and dispatch success/failure actions based on the result.

```typescript
// Effects are already configured - no additional setup needed
// They automatically handle:
// - API calls
// - Error handling
// - Success/failure action dispatching
```

## State Structure

```typescript
{
  technicians: {
    ids: string[],
    entities: { [id: string]: Technician },
    selectedId: string | null,
    loading: boolean,
    error: string | null,
    filters: TechnicianFilters
  },
  jobs: {
    ids: string[],
    entities: { [id: string]: Job },
    selectedId: string | null,
    loading: boolean,
    error: string | null,
    filters: JobFilters
  },
  assignments: {
    ids: string[],
    entities: { [id: string]: Assignment },
    conflicts: Conflict[],
    qualifiedTechnicians: TechnicianMatch[],
    loading: boolean,
    error: string | null
  },
  timeEntries: {
    ids: string[],
    entities: { [id: string]: TimeEntry },
    activeEntry: TimeEntry | null,
    loading: boolean,
    error: string | null
  },
  notifications: {
    ids: string[],
    entities: { [id: string]: Notification },
    unreadCount: number,
    loading: boolean,
    error: string | null
  },
  ui: {
    calendarView: CalendarViewType,
    selectedDate: Date,
    sidebarOpen: boolean,
    mobileMenuOpen: boolean
  },
  reporting: {
    dashboard: DashboardMetrics | null,
    utilization: UtilizationReport | null,
    performance: PerformanceReport | null,
    kpis: KPI[],
    loading: boolean,
    error: string | null
  }
}
```

## Best Practices

1. **Use Selectors**: Always use selectors to access state, never access state directly
2. **Immutability**: State is immutable - reducers always return new state objects
3. **Single Source of Truth**: All state is centralized in the NgRx store
4. **Async Operations**: Use effects for all async operations (API calls)
5. **Type Safety**: All actions, state, and selectors are fully typed
6. **Memoization**: Selectors are memoized for performance
7. **Entity Adapter**: Used for normalized state management (technicians, jobs, assignments, time entries, notifications)

## Testing

Each state module should have corresponding tests:

- **Reducers**: Test state transitions for each action
- **Selectors**: Test selector logic and memoization
- **Effects**: Test side effects with mocked services

## Future Enhancements

- Add state persistence (localStorage/sessionStorage)
- Implement optimistic updates for better UX
- Add undo/redo functionality
- Implement state hydration from backend
- Add real-time state synchronization via SignalR

## Related Documentation

- [NgRx Documentation](https://ngrx.io/)
- [Entity Adapter Guide](https://ngrx.io/guide/entity)
- [Effects Guide](https://ngrx.io/guide/effects)
- [Selectors Guide](https://ngrx.io/guide/store/selectors)
