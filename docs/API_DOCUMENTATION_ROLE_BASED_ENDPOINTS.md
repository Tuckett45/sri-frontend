# API Documentation: Role-Based Endpoints

## Table of Contents

1. [Overview](#overview)
2. [Authentication and Authorization](#authentication-and-authorization)
3. [Market Filtering Behavior](#market-filtering-behavior)
4. [Role-Based Endpoints](#role-based-endpoints)
5. [Error Responses](#error-responses)
6. [Request/Response Formats](#requestresponse-formats)

---

## Overview

This document describes the role-based API endpoints for the Field Operations system. The API implements role-based access control (RBAC) with market-based data filtering for Construction Manager (CM) and Administrator (Admin) roles.

### Base URL

```
Production: https://api.fieldops.example.com/v1
Development: http://localhost:3000/api
```

### API Versioning

Current version: `v1`

All endpoints are prefixed with `/api` or `/api/v1`

---

## Authentication and Authorization

### Authentication

All API requests require authentication via JWT Bearer token.

**Request Header**
```
Authorization: Bearer <jwt_token>
```

**Token Acquisition**

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user123",
    "email": "user@example.com",
    "role": "CM",
    "market": "NYC"
  }
}
```

### Authorization Headers

The frontend sends additional headers for role-based authorization:

```
Authorization: Bearer <jwt_token>
X-User-Role: CM | Admin | Technician
X-User-Market: <market-code>
X-User-Id: <user-id>
```

### Authorization Requirements

#### Public Endpoints
- `/api/auth/login`
- `/api/auth/register`
- `/api/health`

#### Authenticated Endpoints
- Require valid JWT token
- Role-based access enforced

#### Admin-Only Endpoints
- `/api/admin/*` - All admin endpoints
- Require Admin role
- Return 403 for non-Admin users

#### CM Endpoints
- Most data endpoints with market filtering
- Require CM or Admin role
- Market filtering applied for CM users

---

## Market Filtering Behavior

### Query Parameter: `market`

The `market` query parameter filters data by market code.

**Behavior by Role**:


| Role  | Market Parameter Behavior |
|-------|---------------------------|
| CM    | Automatically applied by frontend interceptor. Backend validates CM can only access their assigned market. |
| Admin | Optional. If provided, filters to specific market. If omitted, returns all markets. |

**Examples**

```http
# CM Request (market auto-added by interceptor)
GET /api/street-sheets?market=NYC
X-User-Role: CM
X-User-Market: NYC

# Admin Request (all markets)
GET /api/street-sheets
X-User-Role: Admin

# Admin Request (specific market)
GET /api/street-sheets?market=LA
X-User-Role: Admin
```

### RG Market Special Handling

**Rule**: CM users cannot access RG market street sheets

**Backend Implementation**:
```
IF user.role == CM AND endpoint == /street-sheets THEN
  EXCLUDE items WHERE market == 'RG'
END IF
```

**Example**

```http
# CM Request
GET /api/street-sheets?market=NYC
X-User-Role: CM

# Response excludes RG market sheets even if CM is assigned to RG
```

### Endpoints Requiring Market Filtering

The following endpoints automatically apply market filtering:

- `/api/street-sheets`
- `/api/punch-lists`
- `/api/daily-reports`
- `/api/technicians`
- `/api/assignments`
- `/api/projects`

---

## Role-Based Endpoints

### Street Sheets

#### Get Street Sheets

```http
GET /api/street-sheets
```

**Authorization**: CM, Admin

**Query Parameters**:
- `market` (string, optional for Admin, auto-added for CM): Market code
- `startDate` (string, optional): ISO date string
- `endDate` (string, optional): ISO date string
- `status` (string, optional): Filter by status

**Response**
```json
[
  {
    "id": "sheet123",
    "market": "NYC",
    "projectName": "Building A",
    "date": "2026-02-24",
    "status": "pending",
    "createdBy": "user123",
    "createdAt": "2026-02-24T08:00:00Z"
  }
]
```

**Market Filtering**:
- CM: Returns only sheets from assigned market (excludes RG)
- Admin: Returns all sheets including RG

#### Create Street Sheet

```http
POST /api/street-sheets
Content-Type: application/json
```

**Authorization**: CM, Admin

**Request Body**
```json
{
  "market": "NYC",
  "projectName": "Building A",
  "date": "2026-02-24",
  "items": [
    {
      "description": "Install HVAC",
      "status": "pending"
    }
  ]
}
```

**Response**
```json
{
  "id": "sheet123",
  "market": "NYC",
  "projectName": "Building A",
  "date": "2026-02-24",
  "status": "draft",
  "createdBy": "user123",
  "createdAt": "2026-02-24T08:00:00Z"
}
```

**Validation**:
- CM: Market must match user's assigned market
- Admin: Any market allowed

#### Update Street Sheet

```http
PUT /api/street-sheets/:id
Content-Type: application/json
```

**Authorization**: CM (own market), Admin (any market)

**Request Body**
```json
{
  "status": "completed",
  "items": [
    {
      "id": "item1",
      "status": "completed"
    }
  ]
}
```

**Response**
```json
{
  "id": "sheet123",
  "market": "NYC",
  "status": "completed",
  "updatedAt": "2026-02-24T10:00:00Z"
}
```

**Validation**:
- CM: Can only update sheets from their market
- Admin: Can update any sheet

#### Delete Street Sheet

```http
DELETE /api/street-sheets/:id
```

**Authorization**: Admin only

**Response**
```json
{
  "success": true,
  "message": "Street sheet deleted successfully"
}
```


### Punch Lists

#### Get Punch Lists

```http
GET /api/punch-lists
```

**Authorization**: CM, Admin

**Query Parameters**:
- `market` (string, optional for Admin, auto-added for CM)
- `projectId` (string, optional)
- `status` (string, optional): open, in_progress, completed

**Response**
```json
[
  {
    "id": "punch123",
    "market": "NYC",
    "projectId": "proj456",
    "items": [
      {
        "id": "item1",
        "description": "Fix drywall",
        "status": "open",
        "assignedTo": "tech789"
      }
    ],
    "createdAt": "2026-02-20T09:00:00Z"
  }
]
```

**Market Filtering**:
- CM: Returns only punch lists from assigned market
- Admin: Returns all punch lists

#### Create Punch List

```http
POST /api/punch-lists
Content-Type: application/json
```

**Authorization**: CM, Admin

**Request Body**
```json
{
  "market": "NYC",
  "projectId": "proj456",
  "items": [
    {
      "description": "Fix drywall",
      "location": "Room 101",
      "priority": "high"
    }
  ]
}
```

**Response**
```json
{
  "id": "punch123",
  "market": "NYC",
  "projectId": "proj456",
  "status": "open",
  "createdBy": "user123",
  "createdAt": "2026-02-24T10:00:00Z"
}
```

### Daily Reports

#### Get Daily Reports

```http
GET /api/daily-reports
```

**Authorization**: CM, Admin

**Query Parameters**:
- `market` (string, optional for Admin, auto-added for CM)
- `startDate` (string, required): ISO date
- `endDate` (string, required): ISO date
- `status` (string, optional): draft, submitted, approved

**Response**
```json
[
  {
    "id": "report123",
    "market": "NYC",
    "date": "2026-02-24",
    "projectId": "proj456",
    "workCompleted": "Installed HVAC units",
    "hoursWorked": 8.5,
    "materialsUsed": ["HVAC Unit", "Ductwork"],
    "status": "submitted",
    "submittedBy": "user123",
    "submittedAt": "2026-02-24T17:00:00Z"
  }
]
```

**Market Filtering**:
- CM: Returns only reports from assigned market
- Admin: Returns all reports

#### Create Daily Report

```http
POST /api/daily-reports
Content-Type: application/json
```

**Authorization**: CM, Admin, Technician

**Request Body**
```json
{
  "market": "NYC",
  "date": "2026-02-24",
  "projectId": "proj456",
  "workCompleted": "Installed HVAC units",
  "hoursWorked": 8.5,
  "materialsUsed": ["HVAC Unit", "Ductwork"],
  "issues": []
}
```

**Response**
```json
{
  "id": "report123",
  "market": "NYC",
  "status": "draft",
  "createdBy": "user123",
  "createdAt": "2026-02-24T17:00:00Z"
}
```

#### Submit Daily Report for Approval

```http
POST /api/daily-reports/:id/submit
```

**Authorization**: Report creator, CM, Admin

**Response**
```json
{
  "id": "report123",
  "status": "submitted",
  "approvalTask": {
    "id": "approval456",
    "assignedTo": "cm_user",
    "dueDate": "2026-02-25T17:00:00Z"
  }
}
```


### Technicians

#### Get Technicians

```http
GET /api/technicians
```

**Authorization**: CM, Admin

**Query Parameters**:
- `market` (string, optional for Admin, auto-added for CM)
- `status` (string, optional): available, on_job, off_duty
- `skills` (string[], optional): Filter by required skills

**Response**
```json
[
  {
    "id": "tech123",
    "name": "John Doe",
    "market": "NYC",
    "status": "available",
    "skills": ["HVAC", "Electrical"],
    "currentLocation": {
      "lat": 40.7128,
      "lng": -74.0060
    }
  }
]
```

**Market Filtering**:
- CM: Returns only technicians from assigned market
- Admin: Returns all technicians

#### Assign Technician to Project

```http
POST /api/technicians/:technicianId/assign
Content-Type: application/json
```

**Authorization**: CM (own market), Admin (any market)

**Request Body**
```json
{
  "projectId": "proj456",
  "startDate": "2026-02-25",
  "endDate": "2026-02-28",
  "role": "Lead Technician"
}
```

**Response**
```json
{
  "assignmentId": "assign789",
  "technicianId": "tech123",
  "projectId": "proj456",
  "status": "assigned",
  "createdAt": "2026-02-24T10:00:00Z"
}
```

**Validation**:
- CM: Can only assign technicians from their market to projects in their market
- Admin: Can assign any technician to any project
- System validates technician availability and qualifications

---

## Approval Workflow Endpoints

### Get My Approval Tasks

```http
GET /api/approvals/my-tasks
```

**Authorization**: CM, Admin

**Query Parameters**:
- `market` (string, optional for Admin, auto-added for CM)
- `type` (string, optional): street_sheet, daily_report, punch_list, resource_allocation
- `status` (string, optional): pending, approved, rejected

**Response**
```json
[
  {
    "id": "approval123",
    "type": "street_sheet",
    "entityId": "sheet456",
    "submittedBy": "user789",
    "submittedAt": "2026-02-24T08:00:00Z",
    "currentApprover": "cm_user",
    "approvalLevel": 1,
    "status": "pending",
    "market": "NYC",
    "comments": []
  }
]
```

**Market Filtering**:
- CM: Returns only tasks from assigned market
- Admin: Returns all tasks (or filtered by market parameter)

### Get All Approval Tasks (Admin Only)

```http
GET /api/approvals/all
```

**Authorization**: Admin only

**Query Parameters**:
- `market` (string, optional): Filter by market
- `type` (string, optional)
- `status` (string, optional)
- `startDate` (string, optional)
- `endDate` (string, optional)

**Response**
```json
[
  {
    "id": "approval123",
    "type": "street_sheet",
    "entityId": "sheet456",
    "market": "NYC",
    "status": "pending",
    "submittedAt": "2026-02-24T08:00:00Z"
  }
]
```

### Submit for Approval

```http
POST /api/approvals/submit
Content-Type: application/json
```

**Authorization**: Authenticated user

**Request Body**
```json
{
  "type": "street_sheet",
  "entityId": "sheet456",
  "metadata": {
    "projectName": "Building A",
    "totalCost": 50000
  }
}
```

**Response**
```json
{
  "id": "approval123",
  "type": "street_sheet",
  "entityId": "sheet456",
  "status": "pending",
  "currentApprover": "cm_user",
  "approvalLevel": 1,
  "createdAt": "2026-02-24T10:00:00Z"
}
```

### Approve Task

```http
POST /api/approvals/:id/approve
Content-Type: application/json
```

**Authorization**: Assigned approver, Admin

**Request Body**
```json
{
  "comment": "Approved - looks good"
}
```

**Response**
```json
{
  "id": "approval123",
  "status": "approved",
  "approvedBy": "cm_user",
  "approvedAt": "2026-02-24T11:00:00Z",
  "nextApprovalLevel": 2,
  "nextApprover": "admin_user"
}
```

### Reject Task

```http
POST /api/approvals/:id/reject
Content-Type: application/json
```

**Authorization**: Assigned approver, Admin

**Request Body**
```json
{
  "reason": "Missing required documentation"
}
```

**Validation**: `reason` field is required

**Response**
```json
{
  "id": "approval123",
  "status": "rejected",
  "rejectedBy": "cm_user",
  "rejectedAt": "2026-02-24T11:00:00Z",
  "reason": "Missing required documentation"
}
```

### Request Changes

```http
POST /api/approvals/:id/request-changes
Content-Type: application/json
```

**Authorization**: Assigned approver, Admin

**Request Body**
```json
{
  "changes": "Please update cost breakdown and add material receipts"
}
```

**Response**
```json
{
  "id": "approval123",
  "status": "changes_requested",
  "requestedBy": "cm_user",
  "requestedAt": "2026-02-24T11:00:00Z",
  "changes": "Please update cost breakdown and add material receipts"
}
```

### Escalate Task (Admin Only)

```http
POST /api/approvals/:id/escalate
Content-Type: application/json
```

**Authorization**: Admin only

**Request Body**
```json
{
  "reason": "Requires executive approval due to high cost"
}
```

**Response**
```json
{
  "id": "approval123",
  "status": "escalated",
  "escalatedBy": "admin_user",
  "escalatedAt": "2026-02-24T11:00:00Z",
  "escalationReason": "Requires executive approval due to high cost"
}
```


---

## User Management Endpoints (Admin Only)

### Get Users

```http
GET /api/admin/users
```

**Authorization**: Admin only

**Query Parameters**:
- `role` (string, optional): Filter by role
- `market` (string, optional): Filter by market
- `isApproved` (boolean, optional): Filter by approval status
- `searchTerm` (string, optional): Search by name or email

**Response**
```json
[
  {
    "id": "user123",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "role": "CM",
    "market": "NYC",
    "isApproved": true,
    "isActive": true,
    "lastLoginDate": "2026-02-24T08:00:00Z",
    "createdDate": "2026-01-15T10:00:00Z"
  }
]
```

### Create User

```http
POST /api/admin/users
Content-Type: application/json
```

**Authorization**: Admin only

**Request Body**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "role": "CM",
  "market": "LA",
  "company": "ABC Construction",
  "notificationPreferences": {
    "email": true,
    "inApp": true,
    "sms": false
  }
}
```

**Validation**:
- `name` is required
- `email` is required and must be unique
- `role` is required
- `market` is required

**Response**
```json
{
  "id": "user456",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "CM",
  "market": "LA",
  "isApproved": true,
  "isActive": true,
  "temporaryPassword": "TempPass123!",
  "createdAt": "2026-02-24T10:00:00Z"
}
```

### Update User

```http
PUT /api/admin/users/:id
Content-Type: application/json
```

**Authorization**: Admin only

**Request Body**
```json
{
  "role": "Admin",
  "market": "NYC",
  "reason": "Promoted to Admin role"
}
```

**Response**
```json
{
  "id": "user456",
  "name": "John Doe",
  "role": "Admin",
  "market": "NYC",
  "updatedAt": "2026-02-24T11:00:00Z"
}
```

**Behavior**:
- Role and market changes apply immediately
- Audit log entry created with reason
- User notified of changes

### Deactivate User

```http
POST /api/admin/users/:id/deactivate
Content-Type: application/json
```

**Authorization**: Admin only

**Request Body**
```json
{
  "reason": "Employee left company"
}
```

**Validation**: `reason` is required

**Response**
```json
{
  "success": true,
  "userId": "user456",
  "deactivatedAt": "2026-02-24T11:00:00Z"
}
```

### Reset User Password

```http
POST /api/admin/users/:id/reset-password
```

**Authorization**: Admin only

**Response**
```json
{
  "success": true,
  "temporaryPassword": "NewTemp456!",
  "expiresAt": "2026-02-25T11:00:00Z"
}
```

**Behavior**:
- Generates secure temporary password
- Password expires in 24 hours
- User must change on next login
- Email sent to user with temporary password

### Bulk User Operations

```http
POST /api/admin/users/bulk
Content-Type: application/json
```

**Authorization**: Admin only

**Request Body**
```json
{
  "operation": "change_market",
  "userIds": ["user1", "user2", "user3"],
  "newValue": "CHI",
  "reason": "Market reorganization"
}
```

**Operations**:
- `activate`: Activate multiple users
- `deactivate`: Deactivate multiple users
- `change_role`: Change role for multiple users
- `change_market`: Change market for multiple users

**Response**
```json
{
  "successCount": 3,
  "failureCount": 0,
  "results": [
    {
      "userId": "user1",
      "success": true
    },
    {
      "userId": "user2",
      "success": true
    },
    {
      "userId": "user3",
      "success": true
    }
  ]
}
```

### Get User Audit Log

```http
GET /api/admin/users/:id/audit-log
```

**Authorization**: Admin only

**Query Parameters**:
- `startDate` (string, optional)
- `endDate` (string, optional)
- `actionType` (string, optional)

**Response**
```json
[
  {
    "id": "log123",
    "userId": "user456",
    "action": "role_change",
    "oldValue": "CM",
    "newValue": "Admin",
    "performedBy": "admin_user",
    "reason": "Promoted to Admin role",
    "timestamp": "2026-02-24T11:00:00Z"
  }
]
```


---

## System Configuration Endpoints (Admin Only)

### Get Configuration

```http
GET /api/admin/configuration
```

**Authorization**: Admin only

**Query Parameters**:
- `category` (string, optional): Filter by category

**Response**
```json
{
  "general": {
    "systemName": "Field Operations",
    "timezone": "America/New_York",
    "sessionTimeout": 3600
  },
  "markets": [
    {
      "code": "NYC",
      "name": "New York City",
      "region": "Northeast"
    }
  ],
  "workflows": [
    {
      "type": "street_sheet",
      "approvalLevels": [
        {
          "level": 1,
          "requiredRole": "CM",
          "marketScoped": true
        }
      ]
    }
  ]
}
```

### Update Configuration

```http
PUT /api/admin/configuration
Content-Type: application/json
```

**Authorization**: Admin only

**Request Body**
```json
{
  "category": "general",
  "settings": {
    "sessionTimeout": 7200
  },
  "applyAt": "immediate"
}
```

**Apply Options**:
- `immediate`: Apply changes immediately
- `scheduled`: Apply at specified time (include `scheduledAt` field)

**Response**
```json
{
  "success": true,
  "appliedAt": "2026-02-24T11:00:00Z",
  "changes": {
    "sessionTimeout": {
      "old": 3600,
      "new": 7200
    }
  }
}
```

### Get Market Definitions

```http
GET /api/admin/markets
```

**Authorization**: Admin only

**Response**
```json
[
  {
    "code": "NYC",
    "name": "New York City",
    "region": "Northeast",
    "filteringRules": {
      "excludeFromCMStreetSheets": false
    }
  },
  {
    "code": "RG",
    "name": "RG Market",
    "region": "Special",
    "filteringRules": {
      "excludeFromCMStreetSheets": true
    }
  }
]
```

### Update Market Definitions

```http
PUT /api/admin/markets/:code
Content-Type: application/json
```

**Authorization**: Admin only

**Request Body**
```json
{
  "name": "New York City Metro",
  "region": "Northeast",
  "filteringRules": {
    "excludeFromCMStreetSheets": false
  }
}
```

**Response**
```json
{
  "code": "NYC",
  "name": "New York City Metro",
  "region": "Northeast",
  "updatedAt": "2026-02-24T11:00:00Z"
}
```

### Get Approval Workflows

```http
GET /api/admin/workflows
```

**Authorization**: Admin only

**Query Parameters**:
- `type` (string, optional): Filter by workflow type

**Response**
```json
[
  {
    "id": "workflow123",
    "workflowType": "street_sheet",
    "name": "Street Sheet Approval",
    "levels": [
      {
        "level": 1,
        "requiredRole": "CM",
        "marketScoped": true,
        "timeoutHours": 24
      },
      {
        "level": 2,
        "requiredRole": "Admin",
        "marketScoped": false,
        "timeoutHours": 48
      }
    ],
    "isActive": true
  }
]
```

### Update Approval Workflow

```http
PUT /api/admin/workflows/:id
Content-Type: application/json
```

**Authorization**: Admin only

**Request Body**
```json
{
  "levels": [
    {
      "level": 1,
      "requiredRole": "CM",
      "marketScoped": true,
      "timeoutHours": 48
    }
  ],
  "escalationRules": [
    {
      "trigger": "timeout",
      "escalateTo": "Admin"
    }
  ]
}
```

**Validation**:
- Levels must be sequential (1, 2, 3...)
- Required roles must exist
- Timeout values must be positive

**Response**
```json
{
  "id": "workflow123",
  "workflowType": "street_sheet",
  "updatedAt": "2026-02-24T11:00:00Z",
  "validationStatus": "valid"
}
```

### Export Configuration

```http
GET /api/admin/configuration/export
```

**Authorization**: Admin only

**Query Parameters**:
- `categories` (string[], optional): Specific categories to export

**Response**
```json
{
  "exportedAt": "2026-02-24T11:00:00Z",
  "exportedBy": "admin_user",
  "configuration": {
    "general": { /* settings */ },
    "markets": [ /* market definitions */ ],
    "workflows": [ /* workflow configs */ ]
  }
}
```

### Get Configuration History

```http
GET /api/admin/configuration/history
```

**Authorization**: Admin only

**Query Parameters**:
- `startDate` (string, optional)
- `endDate` (string, optional)
- `category` (string, optional)
- `adminUserId` (string, optional)

**Response**
```json
[
  {
    "id": "history123",
    "category": "workflows",
    "changedBy": "admin_user",
    "changedAt": "2026-02-24T11:00:00Z",
    "changes": {
      "street_sheet.levels[0].timeoutHours": {
        "old": 24,
        "new": 48
      }
    },
    "reason": "Extended approval window"
  }
]
```


---

## Resource Allocation Endpoints

### Assign Technician to Project

```http
POST /api/resource-allocation/assign-technician
Content-Type: application/json
```

**Authorization**: CM (own market), Admin (any market)

**Request Body**
```json
{
  "technicianId": "tech123",
  "projectId": "proj456",
  "startDate": "2026-02-25",
  "endDate": "2026-02-28",
  "role": "Lead Technician"
}
```

**Validation**:
- Technician availability checked
- Qualifications validated
- Scheduling conflicts detected
- CM: Both technician and project must be in CM's market
- Admin: No market restrictions

**Response**
```json
{
  "assignmentId": "assign789",
  "technicianId": "tech123",
  "projectId": "proj456",
  "status": "assigned",
  "conflicts": [],
  "createdAt": "2026-02-24T10:00:00Z"
}
```

**Conflict Response** (422 Unprocessable Entity)
```json
{
  "error": "Scheduling conflict detected",
  "conflicts": [
    {
      "technicianId": "tech123",
      "conflictingAssignment": "assign456",
      "conflictPeriod": {
        "start": "2026-02-25",
        "end": "2026-02-26"
      }
    }
  ],
  "suggestions": [
    {
      "technicianId": "tech789",
      "name": "Alternative Technician",
      "availability": "available"
    }
  ]
}
```

### Get Technician Availability

```http
GET /api/resource-allocation/technician/:id/availability
```

**Authorization**: CM (own market), Admin (any market)

**Query Parameters**:
- `startDate` (string, required)
- `endDate` (string, required)

**Response**
```json
{
  "technicianId": "tech123",
  "availability": [
    {
      "date": "2026-02-25",
      "status": "available",
      "hours": 8
    },
    {
      "date": "2026-02-26",
      "status": "partially_available",
      "hours": 4,
      "assignments": [
        {
          "projectId": "proj789",
          "hours": 4
        }
      ]
    }
  ]
}
```

### Get Resource Utilization

```http
GET /api/resource-allocation/utilization
```

**Authorization**: CM, Admin

**Query Parameters**:
- `market` (string, optional for Admin, auto-added for CM)
- `startDate` (string, required)
- `endDate` (string, required)

**Response**
```json
{
  "market": "NYC",
  "period": {
    "start": "2026-02-01",
    "end": "2026-02-28"
  },
  "metrics": {
    "totalTechnicians": 25,
    "averageUtilization": 78.5,
    "peakUtilization": 95.0,
    "underutilizedTechnicians": 3
  },
  "byTechnician": [
    {
      "technicianId": "tech123",
      "name": "John Doe",
      "utilization": 85.0,
      "hoursWorked": 170,
      "hoursAvailable": 200
    }
  ]
}
```

**Market Filtering**:
- CM: Returns utilization for assigned market only
- Admin: Returns utilization for specified market or all markets

### Reallocate Resources (Admin Only)

```http
POST /api/admin/resource-allocation/reallocate
Content-Type: application/json
```

**Authorization**: Admin only

**Request Body**
```json
{
  "technicianIds": ["tech123", "tech456"],
  "fromMarket": "NYC",
  "toMarket": "LA",
  "effectiveDate": "2026-03-01",
  "reason": "Balancing workload across markets"
}
```

**Response**
```json
{
  "success": true,
  "reallocatedCount": 2,
  "effectiveDate": "2026-03-01",
  "notifiedCMs": ["cm_nyc", "cm_la"]
}
```


---

## Reporting Endpoints

### Generate Project Status Report

```http
POST /api/reports/project-status
Content-Type: application/json
```

**Authorization**: CM, Admin

**Request Body**
```json
{
  "market": "NYC",
  "startDate": "2026-02-01",
  "endDate": "2026-02-28",
  "includeDetails": true
}
```

**Market Filtering**:
- CM: Market parameter must match assigned market (or omitted to use assigned market)
- Admin: Any market or omit for all markets

**Response**
```json
{
  "reportId": "report123",
  "market": "NYC",
  "period": {
    "start": "2026-02-01",
    "end": "2026-02-28"
  },
  "summary": {
    "totalProjects": 15,
    "completedProjects": 8,
    "inProgressProjects": 6,
    "delayedProjects": 1
  },
  "projects": [
    {
      "projectId": "proj456",
      "name": "Building A",
      "status": "in_progress",
      "completion": 75,
      "budget": 100000,
      "spent": 68000
    }
  ],
  "generatedAt": "2026-02-24T11:00:00Z"
}
```

### Get Technician Performance Metrics

```http
GET /api/reports/technician-performance
```

**Authorization**: CM, Admin

**Query Parameters**:
- `market` (string, optional for Admin, auto-added for CM)
- `startDate` (string, required)
- `endDate` (string, required)
- `technicianId` (string, optional): Specific technician

**Response**
```json
{
  "market": "NYC",
  "period": {
    "start": "2026-02-01",
    "end": "2026-02-28"
  },
  "technicians": [
    {
      "technicianId": "tech123",
      "name": "John Doe",
      "metrics": {
        "hoursWorked": 170,
        "projectsCompleted": 12,
        "averageRating": 4.8,
        "onTimeCompletion": 95.0
      }
    }
  ]
}
```

### Export Data

```http
POST /api/reports/export
Content-Type: application/json
```

**Authorization**: CM, Admin

**Request Body**
```json
{
  "dataType": "street_sheets",
  "market": "NYC",
  "startDate": "2026-02-01",
  "endDate": "2026-02-28",
  "format": "csv"
}
```

**Market Filtering**:
- CM: Can only export data from assigned market
- Admin: Can export data from any or all markets

**Response**
```json
{
  "exportId": "export123",
  "downloadUrl": "/api/downloads/export123.csv",
  "expiresAt": "2026-02-25T11:00:00Z",
  "recordCount": 150
}
```

### Get Comparative Analytics (Admin Only)

```http
GET /api/admin/reports/comparative-analytics
```

**Authorization**: Admin only

**Query Parameters**:
- `startDate` (string, required)
- `endDate` (string, required)
- `metrics` (string[], optional): Specific metrics to compare

**Response**
```json
{
  "period": {
    "start": "2026-02-01",
    "end": "2026-02-28"
  },
  "marketComparison": [
    {
      "market": "NYC",
      "metrics": {
        "projectsCompleted": 45,
        "revenue": 500000,
        "utilization": 85.0
      }
    },
    {
      "market": "LA",
      "metrics": {
        "projectsCompleted": 38,
        "revenue": 420000,
        "utilization": 78.0
      }
    }
  ],
  "systemWide": {
    "totalProjects": 83,
    "totalRevenue": 920000,
    "averageUtilization": 81.5
  }
}
```

---

## Notification Endpoints

### Send Notification

```http
POST /api/notifications/send
Content-Type: application/json
```

**Authorization**: System, CM (own market), Admin (any market)

**Request Body**
```json
{
  "recipientId": "user123",
  "type": "approval_required",
  "priority": "normal",
  "channels": ["email", "in_app"],
  "subject": "Approval Required",
  "message": "Street sheet #456 requires your approval",
  "metadata": {
    "entityType": "street_sheet",
    "entityId": "sheet456"
  }
}
```

**Response**
```json
{
  "notificationId": "notif123",
  "status": "sent",
  "deliveryStatus": {
    "email": "delivered",
    "in_app": "delivered"
  },
  "sentAt": "2026-02-24T11:00:00Z"
}
```

### Get Notifications for User

```http
GET /api/notifications/my-notifications
```

**Authorization**: Authenticated user

**Query Parameters**:
- `unreadOnly` (boolean, optional): Filter to unread notifications
- `type` (string, optional): Filter by notification type
- `startDate` (string, optional)

**Response**
```json
[
  {
    "id": "notif123",
    "type": "approval_required",
    "priority": "normal",
    "subject": "Approval Required",
    "message": "Street sheet #456 requires your approval",
    "isRead": false,
    "receivedAt": "2026-02-24T11:00:00Z"
  }
]
```

**Market Filtering**:
- CM: Returns only notifications for events in assigned market
- Admin: Returns all notifications

### Send Broadcast (Admin Only)

```http
POST /api/admin/notifications/broadcast
Content-Type: application/json
```

**Authorization**: Admin only

**Request Body**
```json
{
  "recipients": {
    "type": "role",
    "value": "CM"
  },
  "priority": "high",
  "channels": ["email", "in_app", "sms"],
  "subject": "System Maintenance",
  "message": "System will be down for maintenance on 2026-02-25 from 2-4 AM"
}
```

**Recipient Types**:
- `all`: All users
- `role`: Users with specific role
- `market`: Users in specific market
- `custom`: Specific user IDs

**Response**
```json
{
  "broadcastId": "broadcast123",
  "recipientCount": 45,
  "status": "queued",
  "scheduledAt": "2026-02-24T11:00:00Z"
}
```

### Get Notification Logs (Admin Only)

```http
GET /api/admin/notifications/logs
```

**Authorization**: Admin only

**Query Parameters**:
- `startDate` (string, optional)
- `endDate` (string, optional)
- `recipientId` (string, optional)
- `type` (string, optional)

**Response**
```json
[
  {
    "id": "log123",
    "notificationId": "notif123",
    "recipientId": "user123",
    "type": "approval_required",
    "channels": ["email", "in_app"],
    "deliveryStatus": {
      "email": "delivered",
      "in_app": "delivered"
    },
    "sentAt": "2026-02-24T11:00:00Z",
    "readAt": "2026-02-24T11:15:00Z"
  }
]
```


---

## Error Responses

### Standard Error Format

All error responses follow this format:

```json
{
  "error": "Error Type",
  "message": "Human-readable error message",
  "statusCode": 400,
  "timestamp": "2026-02-24T11:00:00Z",
  "path": "/api/endpoint",
  "details": {}
}
```

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PUT requests |
| 201 | Created | Successful POST creating new resource |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid request body or parameters |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Valid authentication but insufficient permissions |
| 404 | Not Found | Resource does not exist |
| 422 | Unprocessable Entity | Validation failed (e.g., scheduling conflict) |
| 500 | Internal Server Error | Server-side error |

### 401 Unauthorized

**Cause**: Missing or invalid JWT token

**Response**
```json
{
  "error": "Unauthorized",
  "message": "Authentication token is missing or invalid",
  "statusCode": 401,
  "timestamp": "2026-02-24T11:00:00Z"
}
```

**Frontend Handling**:
- Redirect to login page
- Clear stored token
- Preserve return URL for post-login redirect

### 403 Forbidden

**Cause**: Valid authentication but insufficient role permissions

**Response Examples**

**Role-Based Denial**
```json
{
  "error": "Forbidden",
  "message": "Admin role required for this operation",
  "statusCode": 403,
  "timestamp": "2026-02-24T11:00:00Z",
  "requiredRole": "Admin",
  "userRole": "CM"
}
```

**Market-Based Denial**
```json
{
  "error": "Forbidden",
  "message": "Access denied to market LA",
  "statusCode": 403,
  "timestamp": "2026-02-24T11:00:00Z",
  "requestedMarket": "LA",
  "userMarket": "NYC"
}
```

**Frontend Handling**:
- Display user-friendly error message
- Log error for debugging
- Do not retry request
- Optionally redirect to unauthorized page

### 422 Unprocessable Entity

**Cause**: Request is valid but cannot be processed due to business logic

**Response Examples**

**Validation Failure**
```json
{
  "error": "Validation Failed",
  "message": "Technician does not have required qualifications",
  "statusCode": 422,
  "timestamp": "2026-02-24T11:00:00Z",
  "details": {
    "requiredSkills": ["HVAC", "Electrical"],
    "technicianSkills": ["HVAC"]
  }
}
```

**Scheduling Conflict**
```json
{
  "error": "Scheduling Conflict",
  "message": "Technician is already assigned during this period",
  "statusCode": 422,
  "timestamp": "2026-02-24T11:00:00Z",
  "conflicts": [
    {
      "assignmentId": "assign456",
      "projectId": "proj789",
      "period": {
        "start": "2026-02-25",
        "end": "2026-02-26"
      }
    }
  ]
}
```

### Error Handling Best Practices

**Frontend Error Handling**

```typescript
this.myService.performOperation().subscribe({
  next: (result) => {
    // Handle success
  },
  error: (error: HttpErrorResponse) => {
    switch (error.status) {
      case 401:
        // Redirect to login
        this.router.navigate(['/login']);
        break;
      
      case 403:
        // Show access denied message
        this.showError('You do not have permission to perform this action');
        break;
      
      case 422:
        // Show validation error
        this.showError(error.error.message);
        if (error.error.conflicts) {
          this.showConflicts(error.error.conflicts);
        }
        break;
      
      default:
        // Generic error
        this.showError('An error occurred. Please try again.');
    }
  }
});
```

---

## Request/Response Formats

### Common Request Headers

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
X-User-Role: CM | Admin | Technician
X-User-Market: <market-code>
X-User-Id: <user-id>
```

### Common Response Headers

```
Content-Type: application/json
X-Request-Id: <unique-request-id>
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640000000
```

### Pagination

For endpoints returning large datasets:

**Request**
```http
GET /api/street-sheets?page=1&pageSize=20
```

**Response**
```json
{
  "data": [ /* array of items */ ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

### Sorting

**Request**
```http
GET /api/street-sheets?sortBy=createdAt&sortOrder=desc
```

**Sort Parameters**:
- `sortBy`: Field name to sort by
- `sortOrder`: `asc` or `desc`

### Filtering

**Request**
```http
GET /api/street-sheets?market=NYC&status=pending&startDate=2026-02-01
```

**Common Filter Parameters**:
- `market`: Market code
- `status`: Entity status
- `startDate`: Start of date range (ISO 8601)
- `endDate`: End of date range (ISO 8601)
- `searchTerm`: Text search across relevant fields

### Date Formats

All dates use ISO 8601 format:

**Date Only**
```
2026-02-24
```

**Date and Time (UTC)**
```
2026-02-24T11:00:00Z
```

**Date and Time (with timezone)**
```
2026-02-24T11:00:00-05:00
```

### Common Data Types

**User Object**
```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "role": "CM | Admin | Technician | ...",
  "market": "string",
  "isActive": "boolean",
  "createdDate": "ISO 8601 date"
}
```

**Market Object**
```json
{
  "code": "string",
  "name": "string",
  "region": "string"
}
```

**Approval Task Object**
```json
{
  "id": "string",
  "type": "street_sheet | daily_report | punch_list | resource_allocation",
  "entityId": "string",
  "submittedBy": "string",
  "submittedAt": "ISO 8601 date",
  "currentApprover": "string",
  "approvalLevel": "number",
  "status": "pending | approved | rejected | escalated",
  "market": "string"
}
```

---

## Rate Limiting

### Limits

- **Standard Users**: 1000 requests per hour
- **Admin Users**: 5000 requests per hour
- **Bulk Operations**: 100 requests per hour

### Rate Limit Headers

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1640000000
```

### Rate Limit Exceeded Response

```json
{
  "error": "Rate Limit Exceeded",
  "message": "Too many requests. Please try again later.",
  "statusCode": 429,
  "retryAfter": 3600,
  "timestamp": "2026-02-24T11:00:00Z"
}
```

---

## Webhooks (Future Enhancement)

### Webhook Events

Future support for webhook notifications:

- `approval.required` - New approval task created
- `approval.completed` - Approval task completed
- `user.created` - New user account created
- `user.role_changed` - User role modified
- `resource.assigned` - Resource assigned to project
- `notification.sent` - Notification delivered

---

## API Changelog

### Version 1.0 (February 2026)

**Added**:
- Role-based authorization for all endpoints
- Market filtering query parameter
- Admin-only user management endpoints
- Approval workflow endpoints
- Resource allocation endpoints
- Reporting and analytics endpoints
- Notification management endpoints
- System configuration endpoints

**Changed**:
- All data endpoints now support market filtering
- Authorization headers now required
- Error responses standardized

**Deprecated**:
- None

---

## Testing the API

### Using cURL

**Authenticate**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"cm@example.com","password":"password123"}'
```

**Get Street Sheets (CM)**
```bash
curl -X GET http://localhost:3000/api/street-sheets?market=NYC \
  -H "Authorization: Bearer <token>" \
  -H "X-User-Role: CM" \
  -H "X-User-Market: NYC"
```

**Create User (Admin)**
```bash
curl -X POST http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -H "X-User-Role: Admin" \
  -d '{"name":"John Doe","email":"john@example.com","role":"CM","market":"LA"}'
```

### Using Postman

1. Import the API collection from `postman/field-ops-api.json`
2. Set environment variables:
   - `baseUrl`: API base URL
   - `token`: JWT token from login
   - `userRole`: Your role (CM, Admin)
   - `userMarket`: Your market code
3. Run requests from the collection

---

## Appendix

### Quick Reference

**Authentication**
- `POST /api/auth/login` - Login and get token

**Street Sheets**
- `GET /api/street-sheets` - List street sheets (market-filtered)
- `POST /api/street-sheets` - Create street sheet
- `PUT /api/street-sheets/:id` - Update street sheet
- `DELETE /api/street-sheets/:id` - Delete street sheet (Admin only)

**Approvals**
- `GET /api/approvals/my-tasks` - Get my approval tasks
- `GET /api/approvals/all` - Get all tasks (Admin only)
- `POST /api/approvals/submit` - Submit for approval
- `POST /api/approvals/:id/approve` - Approve task
- `POST /api/approvals/:id/reject` - Reject task
- `POST /api/approvals/:id/escalate` - Escalate (Admin only)

**User Management (Admin Only)**
- `GET /api/admin/users` - List users
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users/:id` - Update user
- `POST /api/admin/users/:id/deactivate` - Deactivate user
- `POST /api/admin/users/:id/reset-password` - Reset password
- `POST /api/admin/users/bulk` - Bulk operations

**System Configuration (Admin Only)**
- `GET /api/admin/configuration` - Get configuration
- `PUT /api/admin/configuration` - Update configuration
- `GET /api/admin/markets` - Get market definitions
- `PUT /api/admin/markets/:code` - Update market
- `GET /api/admin/workflows` - Get workflows
- `PUT /api/admin/workflows/:id` - Update workflow

**Resource Allocation**
- `POST /api/resource-allocation/assign-technician` - Assign technician
- `GET /api/resource-allocation/technician/:id/availability` - Get availability
- `GET /api/resource-allocation/utilization` - Get utilization metrics
- `POST /api/admin/resource-allocation/reallocate` - Reallocate (Admin only)

**Reporting**
- `POST /api/reports/project-status` - Generate project report
- `GET /api/reports/technician-performance` - Get performance metrics
- `POST /api/reports/export` - Export data
- `GET /api/admin/reports/comparative-analytics` - Comparative analytics (Admin only)

**Notifications**
- `POST /api/notifications/send` - Send notification
- `GET /api/notifications/my-notifications` - Get my notifications
- `POST /api/admin/notifications/broadcast` - Broadcast (Admin only)
- `GET /api/admin/notifications/logs` - Notification logs (Admin only)

---

*Last Updated: February 2026*
*Version: 1.0*
