# Lazy Loading and Code Splitting - Implementation Guide

## Overview
This document describes the lazy loading and code splitting implementation for the Field Resource Management Tool and the entire application.

## Lazy Loading Configuration

### Feature Module Lazy Loading
All feature modules are configured for lazy loading using Angular's `loadChildren` syntax:

```typescript
// app-routing.module.ts
{
  path: 'field-resource-management',
  loadChildren: () => import('./features/field-resource-management/field-resource-management.module')
    .then(m => m.FieldResourceManagementModule),
  canActivate: [AuthGuard],
  data: { preload: true }
}
```

### Benefits
- **Reduced Initial Bundle Size**: Only core application code is loaded initially
- **Faster Initial Load Time**: Users see the application faster
- **On-Demand Loading**: Feature modules load only when needed
- **Better Caching**: Separate chunks can be cached independently

## Preloading Strategy

### PreloadAllModules Strategy
The application uses Angular's `PreloadAllModules` strategy to preload lazy-loaded modules after the initial application load:

```typescript
// app-routing.module.ts
@NgModule({
  imports: [RouterModule.forRoot(routes, {
    preloadingStrategy: PreloadAllModules,
    enableTracing: false
  })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
```

### How It Works
1. Application loads with minimal initial bundle
2. User sees the login/overview page immediately
3. In the background, Angular preloads all lazy-loaded modules
4. When user navigates to a feature, it's already loaded (instant navigation)

### Selective Preloading Strategy (Optional)
For more fine-grained control, use the `SelectivePreloadStrategy`:

```typescript
// File: src/app/core/strategies/selective-preload.strategy.ts

// Usage in routing:
{
  path: 'feature',
  loadChildren: () => import('./feature/feature.module').then(m => m.FeatureModule),
  data: { 
    preload: true,  // Enable preloading
    delay: 2000     // Optional: delay preloading by 2 seconds
  }
}
```

## Code Splitting

### Automatic Code Splitting
Angular CLI automatically splits code into chunks:

- **main.js**: Core application code
- **polyfills.js**: Browser polyfills
- **runtime.js**: Webpack runtime
- **vendor.js**: Third-party dependencies
- **[feature].js**: Lazy-loaded feature modules

### Component-Level Code Splitting
For large components within a feature module, use dynamic imports:

```typescript
// Example: Lazy load a large chart component
async loadChartComponent() {
  const { ChartComponent } = await import('./components/chart/chart.component');
  // Use the component
}
```

### Library Code Splitting
Large libraries can be split into separate chunks:

```typescript
// Example: Lazy load jsPDF only when needed
async exportToPDF() {
  const jsPDF = await import('jspdf');
  const doc = new jsPDF.default();
  // Generate PDF
}
```

## Bundle Size Optimization

### 1. Remove Unused Imports
```typescript
// ❌ Bad: Importing entire library
import * as _ from 'lodash';

// ✅ Good: Import only what you need
import { debounce } from 'lodash-es';
```

### 2. Use Tree-Shaking
Ensure your imports support tree-shaking:

```typescript
// ❌ Bad: CommonJS import (no tree-shaking)
const moment = require('moment');

// ✅ Good: ES6 import (tree-shaking enabled)
import { format } from 'date-fns';
```

### 3. Analyze Bundle Size
Use the provided script to analyze bundle sizes:

```bash
# Build production bundle
npm run build

# Analyze bundle
node scripts/analyze-bundle.js
```

### 4. Use Webpack Bundle Analyzer (Detailed Analysis)
```bash
# Install webpack-bundle-analyzer
npm install --save-dev webpack-bundle-analyzer

# Build with stats
ng build --stats-json

# Analyze
npx webpack-bundle-analyzer dist/sri-frontend/browser/stats.json
```

## Performance Targets

### Bundle Size Targets
- **Initial Bundle**: < 500 KB (gzipped)
- **Lazy-Loaded Modules**: < 200 KB each (gzipped)
- **Total Application**: < 2 MB (gzipped)

### Load Time Targets
- **First Contentful Paint (FCP)**: < 1.5 seconds
- **Time to Interactive (TTI)**: < 3.5 seconds
- **Lazy Module Load**: < 500 ms

## Monitoring and Optimization

### 1. Lighthouse Audits
Run Lighthouse audits regularly:

```bash
# Using Chrome DevTools
# 1. Open DevTools (F12)
# 2. Go to Lighthouse tab
# 3. Run audit for Performance

# Using CLI
npm install -g lighthouse
lighthouse https://your-app-url --view
```

### 2. Bundle Size Monitoring
Add bundle size checks to CI/CD pipeline:

```bash
# In CI/CD script
npm run build
node scripts/analyze-bundle.js

# Fail if bundle exceeds threshold
if [ $(du -sb dist/sri-frontend/browser/main*.js | cut -f1) -gt 524288 ]; then
  echo "Error: Main bundle exceeds 512 KB"
  exit 1
fi
```

### 3. Performance Budgets
Configure performance budgets in `angular.json`:

```json
{
  "budgets": [
    {
      "type": "initial",
      "maximumWarning": "500kb",
      "maximumError": "1mb"
    },
    {
      "type": "anyComponentStyle",
      "maximumWarning": "6kb",
      "maximumError": "10kb"
    }
  ]
}
```

## Best Practices

### 1. Lazy Load Feature Modules
✅ **Do**: Lazy load all feature modules
```typescript
{ 
  path: 'feature', 
  loadChildren: () => import('./feature/feature.module').then(m => m.FeatureModule) 
}
```

❌ **Don't**: Import feature modules directly in AppModule
```typescript
// Don't do this
import { FeatureModule } from './feature/feature.module';
@NgModule({
  imports: [FeatureModule] // This loads the module immediately
})
```

### 2. Preload Critical Routes
✅ **Do**: Preload frequently accessed routes
```typescript
{ 
  path: 'dashboard', 
  loadChildren: () => import('./dashboard/dashboard.module').then(m => m.DashboardModule),
  data: { preload: true }
}
```

### 3. Split Large Components
✅ **Do**: Use dynamic imports for large, rarely-used components
```typescript
async openReportDialog() {
  const { ReportDialogComponent } = await import('./report-dialog/report-dialog.component');
  this.dialog.open(ReportDialogComponent);
}
```

### 4. Optimize Third-Party Libraries
✅ **Do**: Use lightweight alternatives
- Use `date-fns` instead of `moment.js`
- Use `lodash-es` instead of `lodash`
- Use native browser APIs when possible

### 5. Remove Unused Dependencies
Regularly audit and remove unused dependencies:

```bash
# Find unused dependencies
npx depcheck

# Remove unused dependency
npm uninstall unused-package
```

## Troubleshooting

### Issue: Large Initial Bundle
**Solution**: Ensure all feature modules are lazy-loaded

### Issue: Slow Module Loading
**Solution**: Enable preloading for frequently accessed modules

### Issue: Duplicate Code in Chunks
**Solution**: Use shared modules for common code

### Issue: Large Vendor Bundle
**Solution**: 
1. Remove unused dependencies
2. Use tree-shaking compatible imports
3. Consider using CDN for large libraries

## Verification

### Check Lazy Loading
1. Open Chrome DevTools Network tab
2. Navigate to the application
3. Verify that feature modules load as separate chunks when navigating

### Check Preloading
1. Open Chrome DevTools Network tab
2. Load the application
3. After initial load, verify that lazy modules are preloaded in the background

### Check Bundle Sizes
```bash
npm run build
node scripts/analyze-bundle.js
```

## Resources
- [Angular Lazy Loading Guide](https://angular.io/guide/lazy-loading-ngmodules)
- [Angular Preloading Strategies](https://angular.io/guide/router#preloading)
- [Webpack Bundle Analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer)
- [Web.dev Performance](https://web.dev/performance/)
