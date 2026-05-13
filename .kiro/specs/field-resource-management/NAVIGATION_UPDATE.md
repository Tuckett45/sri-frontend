# Field Resource Management Navigation Update

## Summary
Updated the FRM navigation menu to include all available routes and corrected route paths to match the actual routing configuration.

## Changes Made

### Route Path Corrections
- Changed all routes from `/frm/*` to `/field-resource-management/*` to match the actual module routing
- Updated scheduling route from `/scheduling` to `/schedule` to match routing config

### New Navigation Items Added

1. **Approvals** (CM & Admin only)
   - Icon: approval
   - Route: `/field-resource-management/approvals`
   - Access: CM and Admin roles

2. **Admin** (Admin only)
   - Icon: admin_panel_settings
   - Route: `/field-resource-management/admin`
   - Access: Admin role only

3. **My Timecard** (Technician only)
   - Icon: schedule
   - Route: `/field-resource-management/timecard`
   - Access: Technician role

4. **CM Dashboard** (CM & Admin)
   - Icon: business
   - Route: `/field-resource-management/cm/dashboard`
   - Access: CM and Admin roles

5. **Admin Dashboard** (Admin only)
   - Icon: dashboard_customize
   - Route: `/field-resource-management/admin-dashboard`
   - Access: Admin role only

### Updated Navigation Items

All existing items now have correct routes:
- Dashboard: `/field-resource-management/dashboard`
- Technicians: `/field-resource-management/technicians`
- Crews: `/field-resource-management/crews`
- Jobs: `/field-resource-management/jobs`
- Scheduling: `/field-resource-management/schedule`
- Map View: `/field-resource-management/map`
- Reports: `/field-resource-management/reports`
- My Assignments: `/field-resource-management/mobile/assignments` (Technician only)

### Removed Items
- KPIs (redundant with Dashboard)
- System Config (replaced with Admin)
- My Schedule (redundant with My Assignments)
- My Profile (not implemented in routing)

## Complete Navigation Structure

### For Admin Users
1. Dashboard
2. Technicians
3. Crews
4. Jobs
5. Scheduling
6. Map View
7. Reports
8. Approvals
9. Admin
10. CM Dashboard
11. Admin Dashboard

### For CM Users
1. Dashboard
2. Technicians
3. Crews
4. Jobs
5. Scheduling
6. Map View
7. Reports
8. Approvals
9. CM Dashboard

### For Dispatcher Users
1. Dashboard
2. Technicians
3. Crews
4. Jobs
5. Scheduling
6. Map View
7. Reports

### For Technician Users
1. Dashboard
2. My Timecard
3. My Assignments

## Technical Details

### Permission-Based Filtering
The navigation menu automatically filters items based on:
1. User role (via `roles` property on menu items)
2. Resource permissions (via `resource` and `action` properties)
3. Permission service checks

### Active Route Highlighting
- Active routes are highlighted with blue accent color
- Left border indicator shows current page
- Supports nested route matching

### Accessibility Features
- ARIA labels and roles
- Keyboard navigation support
- Focus indicators
- High contrast mode support
- Reduced motion support
- Screen reader friendly

## Testing Recommendations

1. Test navigation as each role:
   - Admin
   - CM
   - Dispatcher
   - Technician

2. Verify route navigation works for all items

3. Check permission filtering is working correctly

4. Test on mobile devices for responsive behavior

5. Verify accessibility with screen readers
