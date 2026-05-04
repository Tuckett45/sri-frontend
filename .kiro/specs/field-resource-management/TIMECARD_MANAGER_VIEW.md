# Timecard Manager View Implementation

## Overview
Implemented comprehensive timecard management functionality with role-based access control for HR, Managers, and Admins.

## Components Created

### 1. TimecardManagerViewComponent
**Location**: `src/app/features/field-resource-management/components/reporting/timecard-manager-view/`

**Features**:
- View all timecards across the organization
- Filter by technician, crew, or job
- Date range filtering (week, biweekly, month, custom)
- Status filtering (draft, submitted, approved, rejected)
- Approve/reject timecards
- Unlock locked periods
- Bulk operations (approve multiple timecards)
- Export timecard data
- Summary statistics (total hours, overtime, expenses, pending approvals)

**Permissions**:
- Manager role: Full access to team timecards
- HR role: Full access to all timecards
- Admin role: Full access with additional unlock capabilities

### 2. ManagerGuard
**Location**: `src/app/features/field-resource-management/guards/manager.guard.ts`

**Purpose**: Route guard that restricts access to Manager, HR, and Admin roles only

**Allowed Roles**:
- Admin
- Manager
- HR

## Role-Based Access

### Individual User Views (Existing)
**Route**: `/field-resource-management/timecard`
**Component**: `TimecardDashboardComponent`
**Access**: All authenticated users
**Features**:
- View own timecard
- Clock in/out
- Daily and weekly views
- Submit timecard for approval

**Available to**:
- Technicians
- CMs
- Controllers
- All other roles (for their own timecards)

### Manager View (New)
**Route**: `/field-resource-management/timecard-manager`
**Component**: `TimecardManagerViewComponent`
**Access**: Manager, HR, Admin only
**Features**:
- View all team/organization timecards
- Filter by technician, crew, or job
- Approve/reject timecards
- Unlock locked periods
- Bulk operations
- Export data

## Filtering Capabilities

### Filter By Options
1. **All Timecards**: View all timecards in the system
2. **By Technician**: Filter to specific technician's timecards
3. **By Crew**: View timecards for all members of a crew
4. **By Job**: View timecards associated with a specific job

### Date Range Options
1. **This Week**: Current week (Monday-Sunday)
2. **This Pay Period**: Current biweekly period
3. **This Month**: Current calendar month
4. **Custom Range**: User-defined date range

### Status Filters
- All Statuses
- Draft
- Submitted
- Approved
- Rejected

## Summary Statistics

The manager view displays real-time summary cards:
1. **Total Hours**: Sum of all hours in filtered view
2. **Overtime Hours**: Sum of overtime hours
3. **Total Expenses**: Sum of all expenses
4. **Pending Approvals**: Count of timecards awaiting approval

## Bulk Operations

Managers can:
1. Select multiple timecard periods using checkboxes
2. Approve all selected timecards at once
3. Clear selection

## Navigation

Added new menu item in navigation:
- **Label**: "Timecard Management"
- **Icon**: fact_check
- **Visible to**: Manager, HR, Admin roles only
- **Route**: `/field-resource-management/timecard-manager`

## User Role Updates

Added new role to `UserRole` enum:
- **Manager**: New role for team managers with timecard approval capabilities

## Styling

- Light/white theme consistent with other FRM components
- Responsive design for mobile and tablet
- Material Design components
- Status badges with color coding:
  - Draft: Gray
  - Submitted: Blue
  - Approved: Green
  - Rejected: Red
- Overtime hours highlighted in orange
- Lock icons for locked periods

## State Management

Uses existing NgRx state:
- `TimecardSelectors`: For timecard periods and configuration
- `TimeEntrySelectors`: For time entry data
- `TechnicianSelectors`: For technician information
- `CrewSelectors`: For crew information
- `JobSelectors`: For job information
- `TimecardActions`: For updating timecard status and unlocking

## Future Enhancements

1. **Export Functionality**: Implement CSV/Excel export
2. **Rejection Reason Dialog**: Add dialog for entering rejection reasons
3. **Unlock Request Workflow**: Implement unlock request approval process
4. **Detailed Period View**: Add drill-down to view individual time entries
5. **Audit Trail**: Track all approval/rejection actions
6. **Notifications**: Send notifications to technicians when timecards are approved/rejected
7. **Comments**: Allow managers to add comments to timecards
8. **Batch Import**: Import timecard corrections from spreadsheet

## Testing Recommendations

1. Test role-based access (Manager, HR, Admin can access; others cannot)
2. Test filtering by technician, crew, and job
3. Test date range filtering
4. Test approval/rejection workflow
5. Test bulk operations
6. Test unlock functionality
7. Test responsive design on mobile devices
8. Test with large datasets (100+ timecards)

## Files Modified

1. `src/app/models/role.enum.ts` - Added Manager role
2. `src/app/features/field-resource-management/components/reporting/reporting.module.ts` - Added TimecardManagerViewComponent
3. `src/app/features/field-resource-management/field-resource-management-routing.module.ts` - Added manager timecard route
4. `src/app/features/field-resource-management/components/layout/navigation-menu/navigation-menu.component.ts` - Added navigation menu item

## Files Created

1. `src/app/features/field-resource-management/components/reporting/timecard-manager-view/timecard-manager-view.component.ts`
2. `src/app/features/field-resource-management/components/reporting/timecard-manager-view/timecard-manager-view.component.html`
3. `src/app/features/field-resource-management/components/reporting/timecard-manager-view/timecard-manager-view.component.scss`
4. `src/app/features/field-resource-management/guards/manager.guard.ts`
5. `.kiro/specs/field-resource-management/TIMECARD_MANAGER_VIEW.md`
