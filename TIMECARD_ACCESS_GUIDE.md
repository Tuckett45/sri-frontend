# Timecard Access Guide

## How to Access the Timecard Dashboard

### Option 1: Direct URL Navigation
Navigate directly to:
```
http://localhost:4200/field-resource-management/mobile/timecard
```

### Option 2: Navigation Menu (For Technicians)
1. Log in as a Technician, Deployment Engineer, or SRI Tech
2. Look for the FRM navigation menu (sidebar or top nav)
3. Click on **"My Timecard"** menu item (with schedule icon)

### Option 3: From Job Detail Page
1. Navigate to any job detail page
2. If you're assigned to the job, you'll see a **"Time Tracking"** section
3. This section includes the time tracker component for clock in/out

## User Roles with Access

The timecard dashboard is accessible to:
- **Technician** role
- **DeploymentEngineer** role  
- **SRITech** role

Protected by `TechnicianGuard` in the routing configuration.

## Navigation Menu Location

The "My Timecard" link has been added to:
- **File:** `src/app/features/field-resource-management/components/shared/frm-nav-menu/frm-nav-menu.component.ts`
- **Position:** Below "My Daily Schedule" in the technician menu section
- **Icon:** schedule (clock icon)
- **Route:** `/field-resource-management/mobile/timecard`

## Features Available

### Timecard Dashboard Page
- **Active Time Entry:** Live timer for currently clocked-in job
- **Today's Summary:** Hours worked, mileage, number of jobs
- **Today's Time Entries:** Detailed table with all entries
- **Weekly Summary:** Total hours, mileage, and jobs for the week
- **Week Navigation:** Previous/Next week buttons

### Job Detail Time Tracker
- **Clock In/Out:** Start and stop time tracking
- **Live Timer:** Real-time elapsed time display
- **Geolocation:** Automatic location capture for mileage
- **Manual Entry:** Override options for admins

## Testing Access

### Quick Test Steps:
1. Start your Angular dev server: `ng serve`
2. Navigate to: `http://localhost:4200/field-resource-management/mobile/timecard`
3. You should see the timecard dashboard with:
   - Header "My Timecard"
   - Summary cards (hours, mileage, jobs)
   - Time entries table
   - Weekly summary section

### If You Don't See It:
1. **Check Authentication:** Make sure you're logged in as a technician role
2. **Check Guards:** The route is protected by `TechnicianGuard`
3. **Check Module:** Verify the component is declared in `field-resource-management.module.ts`
4. **Check Routing:** Verify the route is registered in `field-resource-management-routing.module.ts`

## Integration Points

### Where the Timecard Appears:

1. **Standalone Page:** `/field-resource-management/mobile/timecard`
   - Full dashboard view
   - Accessible from navigation menu

2. **Job Detail Page:** `/field-resource-management/jobs/:id`
   - Embedded time tracker section
   - Shows only for assigned jobs
   - Located between "Schedule" and "Assigned Technicians" sections

## Navigation Menu Structure

```
Field Resource Management
├── Dashboard (Dispatcher/Admin)
├── Schedule (Dispatcher/Admin)
├── Jobs (Dispatcher/Admin)
├── Technicians (Dispatcher/Admin)
├── Reports (Dispatcher/Admin)
│   ├── Dashboard
│   ├── Utilization
│   └── Performance
├── My Daily Schedule (Technician) ← Existing
├── My Timecard (Technician) ← NEW!
└── Admin (Admin)
    ├── Configuration
    ├── Job Templates
    ├── Regions
    └── Audit Log
```

## Troubleshooting

### "Page Not Found" Error
- Verify the route is registered in routing module
- Check that the module is properly imported
- Ensure the component is declared in the module

### "Access Denied" Error
- Check user role (must be Technician, DeploymentEngineer, or SRITech)
- Verify TechnicianGuard is working correctly
- Check authentication service

### Navigation Link Not Visible
- Verify user role matches the menu item roles
- Check that FrmNavMenuComponent is being used in the layout
- Inspect browser console for errors

### Time Tracker Not Showing in Job Detail
- Check `isAssignedToCurrentUser` property
- Currently set to `true` for demo (line 151 in job-detail.component.ts)
- In production, remove demo line and implement proper assignment checking

## Next Steps

### To Make It Production Ready:
1. Remove the demo line in `job-detail.component.ts` (line 151)
2. Implement proper assignment checking logic
3. Connect to real authentication service
4. Add proper error handling for API failures
5. Test with real time entry data
6. Add export functionality (CSV/PDF)
7. Implement timecard approval workflow

### To Enhance the UI:
1. Add charts for hours worked over time
2. Add filtering options (date range, job type)
3. Add search functionality
4. Add sorting to the time entries table
5. Add pagination for large datasets
6. Add print-friendly styles
7. Add mobile-specific optimizations
