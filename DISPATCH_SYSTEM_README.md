# Dispatch/Workforce Management Tool - Implementation Guide

## Overview

This document outlines the implementation of a comprehensive Dispatch/Workforce Management system for SRI. The system enables real-time tracking, assignment, and management of field technicians with SLA monitoring and automated escalation workflows.

## Architecture

### Frontend (Angular 18)
- **Models**: TypeScript interfaces for type safety
- **Services**: API integration with HttpClient
- **Real-time**: SignalR for WebSocket communication
- **State Management**: NgRx for predictable state updates
- **Location Tracking**: Browser Geolocation API
- **UI Components**: PrimeNG + Angular Material

### Backend (.NET Core)
- **Controllers**: REST API endpoints
- **Services**: Business logic and SLA monitoring
- **Models**: Entity Framework entities with relationships
- **SignalR Hub**: Real-time event broadcasting
- **Background Jobs**: SLA tracking and escalation service

## Features Implemented

### 1. Data Models ✅

**Frontend Models** (`src/app/models/`):
- `technician-status.enum.ts` - Status enumerations (TechnicianStatus, WorkOrderStatus, WorkOrderPriority, NotificationType)
- `technician.model.ts` - Technician entity with location, availability windows, and preferences
- `work-order.model.ts` - Work order/ticket with SLA tracking, priority levels, and customer info
- `assignment.model.ts` - Links work orders to technicians with workflow tracking
- `location-update.model.ts` - GPS location data with accuracy and source tracking

**Backend Models** (`sri-backend/Models/Dispatch/`):
- `WorkOrder.cs` - Work order entity with attachments and SLA fields
- `Technician.cs` - Technician entity with availability windows and location history
- `Assignment.cs` - Assignment entity with status history for audit trail
- `LocationUpdate.cs` - GPS tracking data
- `DispatchDTOs.cs` - Data transfer objects for API requests/responses

### 2. Frontend Services ✅

**API Services** (`src/app/services/`):
- `work-order.service.ts` - CRUD operations for work orders
  - Get all/unassigned/overdue work orders
  - Filter by status, priority, assignment
  - Create, update, delete work orders
  - Upload attachments

- `technician.service.ts` - Technician management
  - Get all/available technicians
  - Update status and location
  - CRUD operations for technician records

### 3. SLA Tracking

**Priority Levels & SLA Types**:
1. **Level 1 (Critical)** - 4-hour MTTA (Mean Time To Acknowledge)
2. **Level 2 (High)** - 24-hour completion deadline
3. **Level 3 (Normal)** - 5-day completion deadline

**Tracking Fields**:
- `slaDeadline` - Calculated deadline based on priority
- `isOverdue` - Boolean flag for overdue status
- `requiresEscalation` - Triggers when unacknowledged past threshold
- `escalatedAt` - Timestamp of escalation

### 4. Workflow States

**Technician Statuses**:
- Available
- Busy
- Offline
- En Route
- On Site

**Work Order/Assignment Statuses**:
1. Unassigned - Created but not assigned
2. Assigned - Assigned to technician
3. Acknowledged - Technician has accepted
4. En Route - Technician traveling to site
5. In Progress - Work being performed
6. Resolved - Work completed
7. Completed - Final closeout done
8. Cancelled - Assignment cancelled

## Implementation Plan

### Phase 1: Foundation ✅ **COMPLETE**
- ✅ Data models (frontend & backend)
- ✅ Frontend API services
- ✅ Backend entity models and DTOs

### Phase 2: Backend API (Next Steps)
- [ ] WorkOrder controller with CRUD endpoints
- [ ] Technician controller with status/location endpoints
- [ ] Assignment controller with workflow endpoints
- [ ] Location tracking controller
- [ ] Database migrations

### Phase 3: SLA Service
- [ ] Background service for SLA monitoring
- [ ] Escalation logic and notifications
- [ ] Timer management for different priority levels

### Phase 4: SignalR Integration
- [ ] DispatchHub for real-time updates
- [ ] Event broadcasting (assignments, status changes, locations)
- [ ] Group management (dispatcher groups, per-technician groups)

### Phase 5: Frontend Components
- [ ] Dispatcher Dashboard
  - Work order queue with filters
  - Technician availability list
  - Assignment creation interface
  - SLA countdown timers
- [ ] Technician Mobile View
  - Active assignments list
  - Status update controls
  - Acknowledgement workflow
  - Photo/note capture
- [ ] Location Map
  - Real-time technician positions
  - Work order locations
  - Route visualization

### Phase 6: State Management
- [ ] NgRx store setup
- [ ] Actions and reducers
- [ ] Effects for async operations
- [ ] Selectors for derived state

### Phase 7: Notifications
- [ ] Multi-channel delivery (Push, SMS, Email)
- [ ] Notification preferences management
- [ ] SLA alert notifications
- [ ] Assignment notifications

### Phase 8: Testing & Documentation
- [ ] Unit tests (frontend & backend)
- [ ] Integration tests
- [ ] E2E tests for workflows
- [ ] User documentation
- [ ] API documentation

## API Endpoints (Planned)

### Work Orders
```
GET    /api/workorders                    - Get all work orders
GET    /api/workorders/{id}               - Get work order by ID
GET    /api/workorders/unassigned         - Get unassigned work orders
GET    /api/workorders/overdue            - Get overdue work orders
GET    /api/workorders/technician/{id}    - Get technician's work orders
POST   /api/workorders                    - Create work order
PUT    /api/workorders/{id}               - Update work order
DELETE /api/workorders/{id}               - Delete work order
POST   /api/workorders/{id}/attachments   - Upload attachment
```

### Technicians
```
GET    /api/technicians                   - Get all technicians
GET    /api/technicians/{id}              - Get technician by ID
GET    /api/technicians/available         - Get available technicians
POST   /api/technicians                   - Create technician
PUT    /api/technicians/{id}              - Update technician
PUT    /api/technicians/{id}/status       - Update technician status
POST   /api/technicians/{id}/location     - Update technician location
DELETE /api/technicians/{id}              - Delete technician
```

### Assignments
```
GET    /api/assignments                   - Get all assignments
GET    /api/assignments/{id}              - Get assignment by ID
GET    /api/assignments/technician/{id}   - Get technician's assignments
GET    /api/assignments/active            - Get active assignments
GET    /api/assignments/unacknowledged    - Get unacknowledged assignments
POST   /api/assignments                   - Create assignment
PUT    /api/assignments/{id}              - Update assignment
POST   /api/assignments/{id}/acknowledge  - Acknowledge assignment
POST   /api/assignments/{id}/status       - Update assignment status
POST   /api/assignments/{id}/reassign     - Reassign to different technician
POST   /api/assignments/{id}/cancel       - Cancel assignment
DELETE /api/assignments/{id}              - Delete assignment
```

### Location Tracking
```
POST   /api/location/update               - Send location update
GET    /api/location/technicians          - Get all technician locations
GET    /api/location/technician/{id}/history - Get location history
```

## Database Schema

### Tables
1. **WorkOrders** - Work order/ticket information
2. **WorkOrderAttachments** - File attachments for work orders
3. **Technicians** - Technician profiles and status
4. **AvailabilityWindows** - Technician schedule windows
5. **Assignments** - Links work orders to technicians
6. **AssignmentStatusHistory** - Audit trail of status changes
7. **LocationUpdates** - GPS tracking history

### Key Relationships
- WorkOrder → Technician (many-to-one via AssignedTechnicianId)
- WorkOrder → WorkOrderAttachments (one-to-many)
- Technician → AvailabilityWindows (one-to-many)
- Technician → LocationUpdates (one-to-many)
- Assignment → WorkOrder (many-to-one)
- Assignment → Technician (many-to-one)
- Assignment → AssignmentStatusHistory (one-to-many)

## Real-Time Events

### SignalR Events (Planned)
1. **AssignmentCreated** - New assignment notification
2. **AssignmentStatusChanged** - Status transitions
3. **TechnicianStatusChanged** - Availability changes
4. **TechnicianLocationUpdated** - Position updates
5. **SlaAlert** - SLA deadline warnings and escalations

## Configuration

### Frontend Environment
```typescript
environment = {
  apiUrl: 'https://sri-api.azurewebsites.net/api',
  apiSubscriptionKey: '...',
  signalRHubUrl: '/hubs/dispatch'
}
```

### Location Tracking Config
```typescript
{
  enabled: false,
  updateIntervalSeconds: 60,
  highAccuracyMode: true,
  maximumAge: 30000,
  timeout: 10000
}
```

## Usage Examples

### Creating a Work Order
```typescript
const request: CreateWorkOrderRequest = {
  title: 'Fiber installation',
  description: 'Install fiber optic cable',
  priority: WorkOrderPriority.Level2,
  customerName: 'John Doe',
  customerPhone: '555-1234',
  serviceAddress: {
    street: '123 Main St',
    city: 'Springfield',
    state: 'IL',
    zipcode: '62701'
  }
};

workOrderService.createWorkOrder(request).subscribe(...);
```

### Assigning to Technician
```typescript
const assignment: CreateAssignmentRequest = {
  workOrderId: '...',
  technicianId: '...',
  estimatedDuration: 120, // minutes
  dispatcherNotes: 'Customer prefers morning'
};

assignmentService.createAssignment(assignment).subscribe(...);
```

### Updating Technician Status
```typescript
technicianService.updateTechnicianStatus(
  technicianId,
  TechnicianStatus.EnRoute
).subscribe(...);
```

### Tracking Location
```typescript
locationTrackingService.startTracking(technicianId, {
  updateIntervalSeconds: 60,
  highAccuracyMode: true
});
```

## Security Considerations

1. **Authentication**: All API calls use subscription key header
2. **Authorization**: Role-based access (Dispatcher, Technician, Admin)
3. **Location Privacy**: Tracking only while on-duty
4. **Data Encryption**: HTTPS for all communications
5. **Audit Trail**: Status history tracks all changes

## Performance Optimization

1. **SignalR Groups**: Targeted event delivery to relevant users
2. **Location Throttling**: Configurable update intervals
3. **Lazy Loading**: Components loaded on-demand
4. **Pagination**: Large datasets paginated
5. **Caching**: Location data cached for map rendering

## Future Enhancements

1. **Route Optimization**: Suggest optimal technician based on location
2. **Predictive ETA**: Machine learning for arrival time estimates
3. **Offline Mode**: Queue updates when disconnected
4. **Geofencing**: Auto-status updates on arrival/departure
5. **Analytics Dashboard**: Performance metrics and KPIs
6. **Customer Portal**: Real-time status updates for customers
7. **Integration**: Connect with existing ticketing systems

## Support

For questions or issues, contact the development team or create an issue in the repository.

---

**Last Updated**: December 2, 2024  
**Status**: Phase 1 Complete - Foundation established

