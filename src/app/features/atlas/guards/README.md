# ATLAS Route Guards

This directory contains route guards for protecting ATLAS feature routes.

## Guards

### AtlasFeatureGuard

**Purpose**: Prevents access to ATLAS routes when the integration is disabled via feature flags.

**Usage**:
```typescript
{
  path: 'atlas',
  canActivate: [AtlasFeatureGuard],
  loadChildren: () => import('./features/atlas/atlas.module').then(m => m.AtlasModule)
}
```

**Behavior**:
1. Checks if ATLAS integration is enabled globally
2. In hybrid mode, validates specific feature enablement
3. Redirects to `/overview` when access is denied
4. Allows access when all checks pass

**Configuration**:
The guard uses `AtlasConfigService` to check feature flags:
- `isEnabled()` - Global ATLAS enablement
- `isHybridMode()` - Hybrid mode status
- `isFeatureEnabled(featureName)` - Specific feature enablement

**Feature Name Extraction**:
The guard extracts the feature name from the URL path:
- `/atlas/deployments` → `deployments`
- `/atlas/agents/123` → `agents`
- `/atlas/query-builder/results` → `query-builder`

## Testing

Run guard tests:
```bash
ng test --include='**/atlas-feature.guard.spec.ts'
```

## Requirements

- **9.7**: AtlasFeatureGuard checks if ATLAS integration is enabled
- **2.7**: Authentication guards for protected routes
- **10.1**: Feature flag support for ATLAS integration
- **10.2**: Fallback when ATLAS is disabled
- **10.3**: Hybrid mode feature validation

## Future Guards

Potential additional guards for ATLAS routes:
- `AtlasRoleGuard` - Role-based access control
- `AtlasPermissionGuard` - Fine-grained permission checks
- `AtlasDataGuard` - Data-level access control
