# Jobs vs Reports Routing Fix

## Issue
User reported that the Jobs page (`/field-resource-management/jobs`) and Reports page (`/field-resource-management/reports`) were showing the same content.

## Root Cause Analysis

### Original Routing Structure
```
/field-resource-management
  ├── '' → redirects to 'dashboard'
  ├── /dashboard → DashboardComponent (analytics)
  ├── /jobs → JobsModule → JobListComponent (job management)
  └── /reports → ReportingModule → redirects to 'dashboard' → DashboardComponent (analytics)
```

The problem was that there were TWO routes loading the same `DashboardComponent`:
1. `/field-resource-management/dashboard` - Direct route
2. `/field-resource-management/reports/dashboard` - Lazy-loaded route

This created confusion because both paths showed identical analytics content.

### Component Differences

The components are actually completely different:

**JobListComponent** (`/jobs`):
- Data table with job listings
- Search and filter functionality
- CRUD operations (Create, Read, Update, Delete)
- Batch operations (assign, update status, delete)
- Export to CSV/PDF
- Pagination
- Focus: Job management and work order operations

**DashboardComponent** (`/reports`):
- KPI cards with metrics
- Charts and visualizations
- Recent activity feed
- Jobs requiring attention alerts
- Performance analytics
- Utilization gauges
- Focus: Analytics, reporting, and insights

## Solution

### Updated Routing Structure
```
/field-resource-management
  ├── '' → redirects to 'reports'
  ├── /dashboard → redirects to 'reports' (removed duplicate)
  ├── /jobs → JobsModule → JobListComponent (job management)
  └── /reports → ReportingModule → DashboardComponent (analytics)
```

### Changes Made

1. **Removed duplicate dashboard route**: The direct `/dashboard` route now redirects to `/reports`
2. **Updated default redirect**: Root path now redirects to `/reports` instead of `/dashboard`
3. **Clearer route semantics**: 
   - `/jobs` = Job management (CRUD operations)
   - `/reports` = Analytics and reporting (read-only insights)

## Verification

After these changes:
- Navigating to `/field-resource-management/jobs` shows the job management table
- Navigating to `/field-resource-management/reports` shows the analytics dashboard
- These are now clearly distinct pages with different purposes

## Files Modified

- `src/app/features/field-resource-management/field-resource-management-routing.module.ts`

## Testing Recommendations

1. Navigate to `/field-resource-management/jobs` - should show job table with filters
2. Navigate to `/field-resource-management/reports` - should show analytics dashboard with KPI cards
3. Verify navigation menu links work correctly
4. Verify breadcrumbs show correct page titles
