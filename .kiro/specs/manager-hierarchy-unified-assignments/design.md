# Design Document: Manager Hierarchy & Unified Assignments

## Overview

This feature introduces two foundational capabilities to the SRI platform:

1. **Manager Hierarchy** — A data model and API for org structure (who reports to whom), enabling automatic approval routing for PTO, overtime, expenses, timecards, and other workflows.

2. **Unified Assignments Inbox** — A single aggregation point where every user sees all work items requiring their action, regardless of which subsystem generated them.

Both capabilities live primarily in **atlas-platform** (data + API) with a frontend module in **sri-frontend** and a sync bridge from **sri-backend**.

### Key Design Decisions

1. **Atlas-platform as the hierarchy source of truth** — Since all approval workflows (PTO, OT, jobs, quotes) already route through atlas-platform, the hierarchy lives there. sri-backend syncs user data to atlas but doesn't own the hierarchy.

2. **Event-driven assignment creation** — Assignments are created as a side-effect of domain events (PTO submitted, job assigned, etc.) using a lightweight in-process event pattern. No external message broker needed at current scale.

3. **Single `Assignments` table** — Rather than querying N different tables to build the inbox, we denormalize into a unified assignments table. This trades slight write complexity for fast reads and simple frontend integration.

4. **Existing `EmployeeManagers` table enhanced, not replaced** — The atlas-platform already has an `EmployeeManagers` table used by PTO. We enhance it with history tracking and add a management UI, rather than creating a parallel system.

5. **Cross-system identity via email matching** — Both sri-backend and atlas-platform users have email addresses. We use email as the join key for identity resolution, with a `UserIdentityMapping` table for performance.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        sri-frontend                               │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ Org Structure │  │ My Assignments│  │ Nav Badge (count)     │  │
│  │ Management UI │  │ Inbox Page    │  │ [polling every 60s]   │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬────────────┘  │
└─────────┼──────────────────┼─────────────────────┼───────────────┘
          │                  │                     │
          ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                     atlas-platform API                            │
│  ┌────────────────┐  ┌─────────────────┐  ┌──────────────────┐  │
│  │ HierarchyCtrl  │  │ AssignmentsCtrl │  │ UserIdentityCtrl │  │
│  └───────┬────────┘  └────────┬────────┘  └────────┬─────────┘  │
│          │                    │                     │             │
│  ┌───────▼────────┐  ┌───────▼─────────┐  ┌───────▼──────────┐  │
│  │HierarchyService│  │AssignmentService │  │IdentityResolver  │  │
│  └───────┬────────┘  └────────┬─────────┘  └────────┬─────────┘  │
│          │                    │                      │            │
│  ┌───────▼────────────────────▼──────────────────────▼─────────┐  │
│  │                    AtlasDbContext                             │  │
│  │  ManagerHierarchy | Assignments | UserIdentityMapping        │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
          ▲
          │ Sync (on user create/approve)
┌─────────┴───────────────────────────────────────────────────────┐
│                       sri-backend                                 │
│  ┌──────────┐  ┌──────────────────┐  ┌───────────────────────┐  │
│  │ Users DB │  │ AtlasSyncService │  │ AuthController        │  │
│  └──────────┘  └──────────────────┘  └───────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

## Data Models

### ManagerHierarchy (atlas-platform)

```csharp
public class ManagerHierarchy
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid EmployeeUserId { get; set; }        // The employee
    public Guid ManagerUserId { get; set; }          // Their manager
    public string? Market { get; set; }              // For filtering
    public DateTime EffectiveDate { get; set; }      // When this relationship started
    public DateTime? EndDate { get; set; }           // Null = active, set = historical
    public string? CreatedBy { get; set; }           // Who made this assignment
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
```

**Constraints:**
- Unique index on `(EmployeeUserId)` WHERE `EndDate IS NULL` (one active manager per employee)
- Index on `ManagerUserId` for "get my reports" queries
- Index on `Market` for filtering

### Assignment (atlas-platform)

```csharp
public class Assignment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Type { get; set; }                 // pto_approval, job_assignment, etc.
    public string Title { get; set; }                // "PTO Request from John Doe"
    public string? Description { get; set; }         // Brief summary
    public Guid AssignedToUserId { get; set; }       // Who needs to act
    public Guid? AssignedByUserId { get; set; }      // Who triggered it (nullable for system)
    public string? AssignedByName { get; set; }      // Display name
    public Guid? SourceId { get; set; }              // FK to the source entity (PTO request, job, etc.)
    public string? SourceType { get; set; }          // "PtoRequest", "OvertimeRequest", "Job", etc.
    public string Priority { get; set; } = "medium"; // low, medium, high, urgent
    public string Status { get; set; } = "pending";  // pending, in_progress, completed, dismissed
    public string? Link { get; set; }                // Frontend route to take action
    public DateTime? DueDate { get; set; }           // Optional deadline
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }       // When it was completed/dismissed
}
```

**Indexes:**
- `(AssignedToUserId, Status)` — Primary query pattern (my pending assignments)
- `(AssignedToUserId, Type, Status)` — Filtered by type
- `(SourceId, SourceType)` — Find assignment for a given source entity
- `(Status, CreatedAt)` — For cleanup/archival queries

### UserIdentityMapping (atlas-platform)

```csharp
public class UserIdentityMapping
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AtlasUserId { get; set; }            // atlas-platform GUID
    public string SriBackendUserId { get; set; }     // sri-backend string GUID
    public string Email { get; set; }                // Canonical join key
    public string? FullName { get; set; }
    public string? Role { get; set; }
    public string? Market { get; set; }
    public DateTime SyncedAt { get; set; } = DateTime.UtcNow;
}
```

## API Endpoints

### Hierarchy Endpoints (`/v1/hierarchy`)

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/my-manager` | Any | Get authenticated user's manager |
| GET | `/my-reports` | Any | Get authenticated user's direct reports |
| GET | `/reports/{userId}` | Admin/HR | Get direct reports for any user |
| GET | `/chain/{userId}` | Any | Get full management chain to top |
| GET | `/tree` | Admin/HR | Get full org tree |
| GET | `/tree?market={market}` | Admin/HR | Get org tree filtered by market |
| POST | `/assign` | Admin/HR | Assign manager to employee |
| DELETE | `/{employeeUserId}` | Admin/HR | Remove manager assignment |

### Assignment Endpoints (`/v1/assignments`)

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/` | Any | List my assignments (paginated, filtered) |
| GET | `/count` | Any | Get pending assignment count (for badge) |
| GET | `/summary` | Any | Get counts grouped by type |
| POST | `/{id}/complete` | Any | Mark assignment as completed |
| POST | `/{id}/dismiss` | Any | Mark assignment as dismissed |

### User Identity Endpoints (`/v1/users`)

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/resolve?email={email}` | Any | Resolve sri-backend user to atlas user |
| POST | `/sync` | Internal/Admin | Trigger sync of a user from sri-backend |

## Assignment Creation Flow

```
Employee submits PTO request
        │
        ▼
PtoService.CreateRequestAsync()
        │
        ├── Save PtoRequest to DB
        │
        ├── Look up employee's manager (HierarchyService)
        │
        └── Create Assignment {
                type: "pto_approval",
                title: "PTO Request from {employeeName}",
                assignedTo: managerId,
                sourceId: ptoRequestId,
                sourceType: "PtoRequest",
                link: "/field-resource-management/pto/approvals"
            }

Manager approves PTO request
        │
        ▼
PtoService.ApproveAsync()
        │
        ├── Update PtoRequest status
        │
        ├── Mark manager's assignment as "completed"
        │
        └── Create new Assignment {
                type: "pto_approval",
                title: "PTO Request from {employeeName} - Backoffice Review",
                assignedTo: backofficeUserId,
                sourceId: ptoRequestId,
                sourceType: "PtoRequest",
                link: "/field-resource-management/pto/approvals"
            }
```

## Frontend Components

### Org Structure Page (`/field-resource-management/org-structure`)

- Tree view of employees grouped by manager
- Filter by market
- Drag-and-drop or dropdown to reassign managers
- "Unassigned" section for employees without managers
- Search by name/email
- Protected by Admin/HR/CM guard

### My Assignments Page (`/field-resource-management/assignments`)

- Card-based or list-based inbox
- Filter chips: All | PTO | Overtime | Jobs | RFPs | Expenses | Timecards | HR
- Priority indicators (colored left border: urgent=red, high=orange, medium=blue, low=gray)
- "View" button navigates to the source entity
- "Dismiss" button for informational items
- Auto-refresh every 60 seconds
- Empty state: "You're all caught up!"

### Navigation Badge

- Appears on "Assignments" nav link and/or bell icon
- Shows count of pending assignments
- Polls `GET /v1/assignments/count` every 60 seconds
- Updates immediately after local actions (optimistic)

## Error Handling

| Scenario | Handling |
|----------|----------|
| Hierarchy lookup fails during PTO submit | Create request anyway, flag for manual routing, log error |
| Assignment creation fails | Log error, do not block the triggering action, retry via background job |
| Circular dependency in hierarchy | Return 400 with message "Cannot assign: would create circular reporting chain" |
| User not synced to atlas | Return 404 with message "User not found in atlas. Trigger a sync first." |
| Stale assignment (source already resolved) | Mark as completed automatically on next access |

## Testing Strategy

### Backend

| Area | Tests |
|------|-------|
| HierarchyService | Circular dependency detection, multi-level chain traversal, concurrent assignment changes |
| AssignmentService | Creation from triggers, completion, filtering, pagination, count performance |
| UserIdentityResolver | Email matching, missing users, duplicate handling |

### Frontend

| Area | Tests |
|------|-------|
| Org Structure UI | Tree rendering, drag-and-drop, validation feedback |
| Assignment Inbox | Filtering, sorting, action buttons, auto-refresh, empty state |
| Nav Badge | Polling, count updates after actions |
