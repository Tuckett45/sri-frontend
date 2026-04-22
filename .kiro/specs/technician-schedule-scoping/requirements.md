# Requirements Document

## Introduction

The schedule/calendar view component currently displays all technicians, all jobs, all crews, and all sites regardless of the logged-in user's role. This feature introduces role-based data scoping so that technicians (and other Field_Group roles) see only the schedule data relevant to them — their own schedule, their crew members, their assigned jobs, and the sites for those jobs. Manager_Group and Admin roles retain full visibility (current behavior).

## Glossary

- **Calendar_View**: The scheduling board component (`CalendarViewComponent`) that renders a grid of schedule rows across time slots, supporting Technician, Crew, Job, and Site view modes.
- **Schedule_Filter**: The NgRx selector layer responsible for filtering technicians, jobs, assignments, crews, and sites based on the current user's role and identity.
- **Current_User**: The authenticated user, identified by their user ID and role from the auth state.
- **Field_Group**: Roles with limited schedule visibility: Technician, DeploymentEngineer, CM, SRITech.
- **Manager_Group**: Roles with full schedule visibility: PM, Admin, DCOps, OSPCoordinator, EngineeringFieldSupport, MaterialsManager, Manager.
- **Own_Schedule**: The set of assignments where the Current_User's technician ID matches the assignment's technicianId.
- **Own_Crews**: Crews where the Current_User is either the leadTechnicianId or is listed in memberIds.
- **Assigned_Jobs**: Jobs linked to the Current_User through active assignments.
- **Assigned_Sites**: The distinct site names from the Current_User's Assigned_Jobs.

## Requirements

### Requirement 1: Role-Based Schedule Data Filtering

**User Story:** As a technician, I want the schedule view to show only data relevant to me, so that I am not overwhelmed by unrelated schedules and can focus on my own work.

#### Acceptance Criteria

1. WHILE the Current_User has a Field_Group role, THE Schedule_Filter SHALL return only technicians who are members of the Current_User's Own_Crews or the Current_User themselves.
2. WHILE the Current_User has a Field_Group role, THE Schedule_Filter SHALL return only Assigned_Jobs linked to the Current_User through active assignments.
3. WHILE the Current_User has a Field_Group role, THE Schedule_Filter SHALL return only Own_Crews where the Current_User is the lead or a member.
4. WHILE the Current_User has a Field_Group role, THE Schedule_Filter SHALL return only Assigned_Sites derived from the Current_User's Assigned_Jobs.
5. WHILE the Current_User has a Manager_Group role, THE Schedule_Filter SHALL return all technicians, jobs, crews, and sites without restriction.
6. WHILE the Current_User has an Admin role, THE Schedule_Filter SHALL return all technicians, jobs, crews, and sites without restriction.

### Requirement 2: Technician View Mode Scoping

**User Story:** As a technician, I want the Technicians view mode to show only myself and my crew members, so that I see a relevant and manageable schedule board.

#### Acceptance Criteria

1. WHILE the Current_User has a Field_Group role AND the Calendar_View is in Technicians mode, THE Calendar_View SHALL display schedule rows only for the Current_User and members of the Current_User's Own_Crews.
2. WHILE the Current_User has a Field_Group role AND the Calendar_View is in Technicians mode, THE Calendar_View SHALL display job cells only for Assigned_Jobs of each visible technician.
3. WHILE the Current_User has a Manager_Group role AND the Calendar_View is in Technicians mode, THE Calendar_View SHALL display schedule rows for all technicians.

### Requirement 3: Crew View Mode Scoping

**User Story:** As a technician, I want the Crews view mode to show only crews I belong to, so that I can see my crew's schedule without seeing unrelated crews.

#### Acceptance Criteria

1. WHILE the Current_User has a Field_Group role AND the Calendar_View is in Crews mode, THE Calendar_View SHALL display schedule rows only for Own_Crews.
2. WHILE the Current_User has a Field_Group role AND the Calendar_View is in Crews mode, THE Calendar_View SHALL display job cells only for Assigned_Jobs of crew members within each visible crew.
3. WHILE the Current_User has a Manager_Group role AND the Calendar_View is in Crews mode, THE Calendar_View SHALL display schedule rows for all crews.

### Requirement 4: Job View Mode Scoping

**User Story:** As a technician, I want the Jobs view mode to show only jobs I am assigned to, so that I can track my workload without seeing unrelated jobs.

#### Acceptance Criteria

1. WHILE the Current_User has a Field_Group role AND the Calendar_View is in Jobs mode, THE Calendar_View SHALL display schedule rows only for Assigned_Jobs.
2. WHILE the Current_User has a Manager_Group role AND the Calendar_View is in Jobs mode, THE Calendar_View SHALL display schedule rows for all active and upcoming jobs.

### Requirement 5: Site View Mode Scoping

**User Story:** As a technician, I want the Sites view mode to show only sites where I have assigned jobs, so that I see only relevant locations.

#### Acceptance Criteria

1. WHILE the Current_User has a Field_Group role AND the Calendar_View is in Sites mode, THE Calendar_View SHALL display schedule rows only for Assigned_Sites.
2. WHILE the Current_User has a Field_Group role AND the Calendar_View is in Sites mode, THE Calendar_View SHALL display job cells only for Assigned_Jobs at each visible site.
3. WHILE the Current_User has a Manager_Group role AND the Calendar_View is in Sites mode, THE Calendar_View SHALL display schedule rows for all sites with active jobs.

### Requirement 6: Permission Integration

**User Story:** As a system administrator, I want schedule scoping to use the existing permission service, so that role-based access is consistent across the application.

#### Acceptance Criteria

1. THE Calendar_View SHALL use the FrmPermissionService `canViewAllSchedules` permission to determine whether the Current_User sees all schedule data.
2. THE Calendar_View SHALL use the FrmPermissionService `canViewOwnSchedule` permission to determine whether the Current_User sees scoped schedule data.
3. IF the Current_User has neither `canViewAllSchedules` nor `canViewOwnSchedule` permission, THEN THE Calendar_View SHALL display an empty schedule with a message indicating insufficient permissions.

### Requirement 7: Current User Identity Resolution

**User Story:** As a technician, I want the system to correctly identify me so that the schedule is filtered to my data.

#### Acceptance Criteria

1. THE Calendar_View SHALL resolve the Current_User's technician ID from the authenticated user state in the NgRx store.
2. IF the Current_User's technician ID cannot be resolved, THEN THE Calendar_View SHALL fall back to displaying an empty schedule and log a warning.
3. THE Calendar_View SHALL use the resolved technician ID consistently across all four view modes (Technicians, Crews, Jobs, Sites) for filtering.

### Requirement 8: Scoped Action Restrictions

**User Story:** As a technician, I want schedule modification actions to be restricted based on my role, so that I cannot accidentally reassign or modify jobs outside my scope.

#### Acceptance Criteria

1. WHILE the Current_User has a Field_Group role, THE Calendar_View SHALL disable drag-and-drop reassignment of jobs between technicians.
2. WHILE the Current_User has a Field_Group role, THE Calendar_View SHALL hide the "Reassign" option from the job context menu.
3. WHILE the Current_User has a Field_Group role, THE Calendar_View SHALL hide the "Delete" option from the job context menu.
4. WHILE the Current_User has a Manager_Group role, THE Calendar_View SHALL enable all scheduling actions (drag-and-drop, reassign, delete, add task).
5. WHILE the Current_User has a Field_Group role, THE Calendar_View SHALL allow the Current_User to view job details through the context menu "View" option.

### Requirement 9: Empty State Messaging

**User Story:** As a technician, I want clear messaging when I have no schedule data, so that I understand why the schedule is empty.

#### Acceptance Criteria

1. WHILE the Current_User has a Field_Group role AND the Current_User has no Assigned_Jobs, THE Calendar_View SHALL display a message stating that the technician has no assigned jobs for the selected date range.
2. WHILE the Current_User has a Field_Group role AND the Current_User belongs to no crews, THE Calendar_View SHALL display a message in Crews mode stating that the technician is not assigned to any crew.
3. THE Calendar_View SHALL differentiate empty state messages between "no data exists" and "no data within the current user's scope."
