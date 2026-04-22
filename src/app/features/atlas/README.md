# ATLAS Feature Module

This directory contains the ATLAS (Advanced Technology Logistics and Automation System) control plane integration for the ARK Angular frontend.

## Overview

ATLAS is a microservice platform that provides centralized API services and libraries for managing ARK's backend operations. This feature module integrates ATLAS capabilities into the frontend, including:

- **Deployment Lifecycle Management** - CRUD operations, state transitions, evidence submission, audit trails
- **AI-Powered Analysis** - Deployment readiness assessment, risk analysis, recommendations
- **Approval Workflows** - Authority validation, critical gate management, approval tracking
- **Exception Management** - Exception requests, validation, approval workflows
- **Agent Execution** - AI agent management, execution, monitoring, telemetry
- **Dynamic Query Builder** - Build and execute database queries with templates and export

## Architecture

The ATLAS module follows a modular, scalable architecture with lazy loading, NgRx state management, and comprehensive error handling.

### Directory Structure

```
atlas/
├── atlas.module.ts              # Main feature module (lazy-loaded)
├── atlas-routing.module.ts      # Routing configuration
├── atlas-shared.module.ts       # Shared components and utilities
│
├── components/                  # UI Components
│   ├── deployments/            # Deployment list, detail, forms
│   ├── ai-analysis/            # Analysis results, risk assessment
│   ├── approvals/              # Approval list, decision forms
│   ├── exceptions/             # Exception requests and validation
│   ├── agents/                 # Agent list, detail, execution
│   ├── query-builder/          # Query builder UI and results
│   └── atlas-logo/             # Reusable ATLAS logo component
│
├── services/                    # API Communication Layer
│   ├── deployment.service.ts
│   ├── ai-analysis.service.ts
│   ├── approval.service.ts
│   ├── exception.service.ts
│   ├── agent.service.ts
│   ├── query-builder.service.ts
│   ├── atlas-api-client.service.ts
│   ├── atlas-signalr.service.ts
│   ├── atlas-config.service.ts
│   └── atlas-error-handler.service.ts
│
├── state/                       # NgRx State Management
│   ├── deployments/            # Deployment state
│   ├── ai-analysis/            # AI analysis state
│   ├── approvals/              # Approval state
│   ├── exceptions/             # Exception state
│   ├── agents/                 # Agent state
│   └── query-builder/          # Query builder state
│
├── models/                      # TypeScript Interfaces & Enums
│   ├── common.model.ts
│   ├── deployment.model.ts
│   ├── ai-analysis.model.ts
│   ├── approval.model.ts
│   ├── exception.model.ts
│   ├── agent.model.ts
│   └── query-builder.model.ts
│
├── guards/                      # Route Guards
│   ├── atlas-feature.guard.ts
│   ├── atlas-auth.guard.ts
│   └── atlas-role.guard.ts
│
├── interceptors/                # HTTP Interceptors
│   └── atlas-auth.interceptor.ts
│
└── utils/                       # Utility Functions
    ├── atlas-error-mapper.ts
    ├── atlas-retry-strategy.ts
    └── atlas-validators.ts
```

## Technology Stack

- **Angular 18.2.6** - Frontend framework
- **NgRx 18.0.2** - State management
- **RxJS 7.8.0** - Reactive programming
- **SignalR 9.0.6** - Real-time communication
- **TypeScript 5.4.5** - Type safety
- **Angular Material 18.2.6 & PrimeNG 18.0.2** - UI components

## Quick Start

See [QUICK_START.md](./QUICK_START.md) for getting started with ATLAS components.

## Lazy Loading

The ATLAS module is lazy-loaded in the main app routing:

```typescript
{
  path: 'atlas',
  loadChildren: () => import('./features/atlas/atlas.module').then(m => m.AtlasModule),
  canActivate: [AuthGuard]
}
```

## Components

### Atlas Logo Component

```html
<app-atlas-logo 
  size="medium" 
  theme="auto" 
  routerLink="/atlas">
</app-atlas-logo>
```

## Resources

- [ATLAS API Specification](../../../.kiro/specs/atlas-api.json)
- [Requirements Document](../../../.kiro/specs/atlas-integration/requirements.md)
- [Design Document](../../../.kiro/specs/atlas-integration/design.md)
- [Implementation Tasks](../../../.kiro/specs/atlas-integration/tasks.md)
