# Field Resource Management Feature Module

This module provides comprehensive field technician scheduling, job management, and performance tracking capabilities for the ATLAS system.

## Overview

The Field Resource Management Tool is an internal CRM system designed to schedule, manage, and track installer technicians working in the field. It replaces spreadsheet-based and ad-hoc scheduling with a centralized, scalable platform.

## Features

### Core Functionality
- **Technician Management**: Comprehensive profiles with skills, certifications, and availability tracking
- **Job Management**: Work order creation, assignment, and tracking with file attachments
- **Scheduling**: Visual calendar with drag-and-drop assignment and conflict detection
- **Mobile Experience**: Optimized daily view for field technicians with offline support
- **Time Tracking**: Automatic clock in/out with geolocation and mileage calculation
- **Real-time Updates**: SignalR integration for live job status and assignment changes
- **Reporting**: Utilization, performance metrics, and KPI dashboards

### Technical Features
- Progressive Web App (PWA) with offline capability
- Mobile-first responsive design
- NgRx state management
- Angular Material UI components
- Lazy-loaded routing
- Real-time SignalR communication

## Module Structure

```
field-resource-management/
├── components/
│   ├── technicians/      # Technician management UI
│   ├── jobs/             # Job management UI
│   ├── scheduling/       # Calendar and scheduling UI
│   ├── mobile/           # Mobile-optimized components
│   ├── reporting/        # Reports and dashboards
│   └── shared/           # Reusable components
├── state/
│   ├── technicians/      # Technician state management
│   ├── jobs/             # Job state management
│   ├── assignments/      # Assignment state management
│   ├── time-entries/     # Time entry state management
│   ├── notifications/    # Notification state management
│   ├── ui/               # UI state management
│   └── reporting/        # Reporting state management
├── services/
│   ├── technician.service.ts
│   ├── job.service.ts
│   ├── scheduling.service.ts
│   ├── time-tracking.service.ts
│   ├── reporting.service.ts
│   ├── frm-signalr.service.ts
│   ├── notification.service.ts
│   ├── geolocation.service.ts
│   └── export.service.ts
├── models/
│   ├── technician.model.ts
│   ├── job.model.ts
│   ├── assignment.model.ts
│   ├── time-entry.model.ts
│   ├── reporting.model.ts
│   └── dtos/             # API request/response DTOs
├── guards/
│   ├── auth.guard.ts
│   └── role.guard.ts
├── field-resource-management.module.ts
├── field-resource-management-routing.module.ts
└── README.md
```

## Architecture

### State Management
The module uses NgRx for centralized state management:
- **Actions**: Define state changes
- **Reducers**: Handle state updates
- **Effects**: Handle side effects (API calls, SignalR)
- **Selectors**: Query state efficiently

### Service Layer
Services handle:
- HTTP API communication
- SignalR real-time updates
- Geolocation capture
- Data export (CSV, PDF)
- Business logic

### Component Architecture
- **Smart Components**: Connect to NgRx store, dispatch actions
- **Presentational Components**: Receive data via inputs, emit events
- **Shared Components**: Reusable UI elements

## User Roles

- **Admin**: Full system access, configuration, user management
- **Dispatcher**: Job creation, technician assignment, scheduling
- **Technician**: View assigned jobs, update status, track time

## Key Requirements

- Support 100+ concurrent users
- Handle 1000+ active jobs
- Sub-2-second response times
- Mobile-responsive (320px - 1920px)
- Offline capability for field technicians
- Real-time updates via SignalR

## Development Guidelines

### Adding New Components
1. Create component in appropriate subdirectory
2. Add to module declarations
3. Create routing if needed
4. Connect to NgRx store for state management

### Adding New State
1. Create actions, reducer, effects, selectors
2. Register in module with `StoreModule.forFeature()`
3. Register effects with `EffectsModule.forFeature()`

### Adding New Services
1. Create service with `@Injectable()`
2. Add to module providers if needed
3. Inject HttpClient for API calls
4. Add error handling and retry logic

## Testing

- Unit tests for services and components
- Integration tests for state management
- E2E tests for critical workflows
- Accessibility testing (WCAG 2.1 AA)

## Related Documentation

- [Requirements Document](.kiro/specs/field-resource-management/requirements.md)
- [Design Document](.kiro/specs/field-resource-management/design.md)
- [Implementation Tasks](.kiro/specs/field-resource-management/tasks.md)
