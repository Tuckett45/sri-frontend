# Project Structure

## Top-Level Layout

```
src/
├── app/                    # Application source
├── assets/                 # Static assets (images, icons, configs)
├── environments/           # Environment configuration files
├── styles.scss             # Global styles
├── main.ts                 # Bootstrap entry point
├── index.html              # HTML shell
├── manifest.webmanifest    # PWA manifest
├── sw.js                   # Service worker
└── staticwebapp.config.json # Azure Static Web Apps config
```

## Application Structure (src/app/)

```
src/app/
├── components/             # Page-level and shared components (legacy pattern)
│   ├── login/              # Authentication pages
│   ├── navbar/             # Top navigation bar
│   ├── overview/           # Dashboard views (SRI, vendor, client)
│   ├── modals/             # Reusable dialog components
│   ├── expense/            # Expense module (lazy-loaded)
│   ├── tps/                # TPS module (lazy-loaded)
│   ├── preliminary-punch-list/  # Punch list module (lazy-loaded)
│   ├── daily-report-dashboard/  # Daily reporting module
│   └── ...                 # Other page components
├── features/               # Feature modules (newer pattern, all lazy-loaded)
│   ├── atlas/              # Network infrastructure mapping
│   ├── field-resource-management/  # Technicians, crews, jobs, assignments
│   ├── construction-integration/   # Construction project tracking
│   ├── deployment/         # Deployment management
│   ├── admin-dashboard/    # Admin tools
│   └── spectrum/           # Spectrum management
├── core/                   # Core utilities (preloading strategies)
├── directives/             # Custom directives (role-based show/disable)
├── guards/                 # Route guards (auth, role-based)
├── interceptors/           # HTTP interceptors (auth, config, market filter)
├── models/                 # Shared TypeScript interfaces and enums
├── services/               # Global application services
├── shared/                 # Shared module
│   ├── components/         # Reusable UI components (loading, error displays)
│   └── services/           # Utility services (analytics, lazy loaders)
├── store/                  # Root NgRx store (role-permissions)
├── integration-tests/      # Cross-feature integration tests
├── app-routing.module.ts   # Root routing configuration
├── app.module.ts           # Root NgModule
└── app.component.ts        # Root component
```

## Feature Module Pattern

Each feature module under `features/` follows this internal structure:

```
features/{feature-name}/
├── components/             # Feature-specific components
├── models/                 # Feature-specific interfaces/types
├── services/               # Feature-specific services
├── state/                  # NgRx state (actions, reducers, effects, selectors)
├── guards/                 # Feature-specific route guards
├── interceptors/           # Feature-specific HTTP interceptors (if needed)
├── {feature-name}.module.ts
└── {feature-name}-routing.module.ts
```

## Conventions

- **File naming**: kebab-case for all files (e.g., `user-profile.component.ts`)
- **Component files**: `{name}.component.ts`, `{name}.component.html`, `{name}.component.scss`, `{name}.component.spec.ts`
- **Service files**: `{name}.service.ts`, `{name}.service.spec.ts`
- **NgRx files**: `{entity}.actions.ts`, `{entity}.reducer.ts`, `{entity}.effects.ts`, `{entity}.selectors.ts`
- **Module files**: `{feature-name}.module.ts`, `{feature-name}-routing.module.ts`
- **Guard files**: `{name}.guard.ts`
- **Interceptor files**: `{name}.interceptor.ts`
- **Directive files**: `{name}.directive.ts`
- **Model files**: `{name}.model.ts`

## Routing

- Root routes defined in `app-routing.module.ts`
- Feature modules use lazy loading via `loadChildren`
- All authenticated routes protected by `AuthGuard`
- Some features have additional guards (e.g., `AtlasFeatureGuard`)
- Preloading strategy: `PreloadAllModules` (with per-route `data.preload` hints)

## HTTP Interceptor Chain (order matters)

1. `ConfigurationInterceptor` — injects base URL from configuration
2. `AuthorizationInterceptor` — attaches auth tokens
3. `MarketFilterInterceptor` — adds market context headers
4. `AtlasAuthInterceptor` — Atlas-specific auth handling
