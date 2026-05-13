# Bundle Size Analysis Report

**Date:** March 6, 2026  
**Angular Version:** 18.2.6  
**Build Configuration:** Production  
**Analysis Tool:** webpack-bundle-analyzer + custom analysis script

## Executive Summary

The production build analysis reveals a total bundle size of **4.88 MB** (initial) with an additional **7.13 MB** of JavaScript across all chunks. The main bundle is **4.22 MB** (raw) / **807.59 KB** (gzipped), which significantly exceeds the recommended 3 MB budget.

### Key Findings

1. **Main Bundle Size:** 4.22 MB (raw) / 807.59 KB (gzipped) - **CRITICAL ISSUE**
2. **Total Initial Load:** 4.88 MB - Exceeds budget by 1.74 MB
3. **Lazy-Loaded Modules:** Successfully implemented for feature modules
4. **CommonJS Dependencies:** Multiple optimization bailouts detected
5. **Component Styles:** Several components exceed 8 KB budget

## Detailed Bundle Breakdown

### Initial Chunks (Loaded on App Start)

| File | Raw Size | Gzipped | % of Total |
|------|----------|---------|------------|
| main.ae482ed9a367ade9.js | 4.22 MB | 807.59 kB | 86.5% |
| styles.574b60e65383ddb5.css | 462.85 kB | 34.78 kB | 9.5% |
| scripts.77c77c9973703b5f.js | 163.21 kB | 40.73 kB | 3.3% |
| polyfills.e74179be60658d9a.js | 34.81 kB | 11.35 kB | 0.7% |
| runtime.5b262f9b69c0ab9b.js | 3.80 kB | 1.81 kB | 0.1% |
| **Total Initial** | **4.88 MB** | **896.26 kB** | **100%** |

### Lazy-Loaded Feature Modules

| Module | Raw Size | Gzipped | Description |
|--------|----------|---------|-------------|
| features-atlas-atlas-module (26) | 416.92 kB | 61.13 kB | Atlas feature module |
| features-field-resource-management (269) | 416.73 kB | 74.63 kB | FRM feature module |
| features-admin-dashboard (216) | 352.35 kB | 61.36 kB | Admin dashboard |
| components-tps-tps-module (132) | 236.33 kB | 39.45 kB | TPS components |
| features-atlas (306) | 228.26 kB | 30.35 kB | Additional Atlas code |
| features-deployment (533) | 223.02 kB | 45.09 kB | Deployment feature |
| html2canvas (239) | 200.27 kB | 37.61 kB | PDF generation library |
| canvg (147) | 156.58 kB | 44.43 kB | Canvas rendering library |
| components-jobs (420) | 137.66 kB | 24.16 kB | Job components |
| components-admin (592) | 87.93 kB | 15.55 kB | Admin components |
| components-crews (4) | 86.11 kB | 13.70 kB | Crew components |
| components-approvals (55) | 63.92 kB | 9.23 kB | Approval components |
| components-technicians (482) | 63.39 kB | 11.87 kB | Technician components |
| components-scheduling (171) | 62.48 kB | 11.39 kB | Scheduling components |
| components-reporting (834) | 45.35 kB | 6.94 kB | Reporting components |
| components-mapping (768) | 23.77 kB | 5.00 kB | Mapping components |

## Critical Issues

### 1. Oversized Main Bundle (4.22 MB)

**Impact:** High  
**Priority:** Critical

The main bundle contains 4.22 MB of code, which is loaded on initial app startup. This significantly impacts:
- Initial load time
- Time to Interactive (TTI)
- First Contentful Paint (FCP)
- User experience on slower connections

**Root Causes:**
- Too many dependencies included in main bundle
- Shared components not properly code-split
- Third-party libraries loaded eagerly instead of lazily
- NgRx state management code included in main bundle

### 2. CommonJS Dependencies Causing Optimization Bailouts

**Impact:** Medium  
**Priority:** High

The following dependencies are using CommonJS format, preventing optimal tree-shaking:

- `canvg` (core-js modules, raf, rgbcolor)
- `leaflet-search` (leaflet dependency)
- `papaparse` (CSV parsing)
- `leaflet.markercluster` (map clustering)
- `jspdf-autotable` (PDF generation)
- `jszip` (ZIP file handling)
- `file-saver` (file download)

**Impact:** These dependencies cannot be tree-shaken effectively, resulting in larger bundle sizes.

### 3. Component Style Budget Violations

**Impact:** Low-Medium  
**Priority:** Medium

The following components exceed the 8 KB style budget:

| Component | Size | Over Budget |
|-----------|------|-------------|
| admin-dashboard.component.scss | 29.48 kB | +21.29 kB |
| cm-dashboard.component.scss | 23.43 kB | +15.24 kB |
| user-notifications.component.scss | 16.96 kB | +8.77 kB |
| timecard-dashboard.component.scss | 15.65 kB | +7.45 kB |
| street-sheet.component.scss | 14.58 kB | +6.38 kB |
| market-controller.component.scss | 14.38 kB | +6.19 kB |
| expense.component.scss | 13.70 kB | +5.50 kB |

## Optimization Opportunities

### High Priority (Immediate Action Required)

#### 1. Reduce Main Bundle Size

**Target:** Reduce main bundle from 4.22 MB to < 2 MB

**Actions:**
- Move shared components to lazy-loaded modules
- Implement dynamic imports for heavy libraries (Chart.js, D3.js, Leaflet)
- Split NgRx state into feature-specific modules
- Review and remove unused dependencies
- Defer loading of non-critical services

**Estimated Impact:** -50% main bundle size

#### 2. Lazy Load Heavy Third-Party Libraries

**Libraries to Lazy Load:**
- `html2canvas` (200 KB) - Only needed for PDF export
- `canvg` (156 KB) - Only needed for canvas rendering
- `jspdf` + `jspdf-autotable` - Only needed for PDF generation
- `papaparse` - Only needed for CSV import/export
- `leaflet.markercluster` - Only needed on map views

**Implementation:**
```typescript
// Example: Lazy load html2canvas
async generatePDF() {
  const html2canvas = await import('html2canvas');
  // Use html2canvas
}
```

**Estimated Impact:** -500 KB from main bundle

#### 3. Replace CommonJS Dependencies

**Actions:**
- Find ES module alternatives for CommonJS dependencies
- Configure webpack to handle CommonJS modules better
- Add `allowedCommonJsDependencies` in angular.json for unavoidable cases

**Candidates for Replacement:**
- `papaparse` → Consider `csv-parse` (ES modules)
- `file-saver` → Use native browser APIs where possible
- `leaflet-search` → Consider alternatives or custom implementation

**Estimated Impact:** Better tree-shaking, -100-200 KB

### Medium Priority (Next Sprint)

#### 4. Optimize Component Styles

**Actions:**
- Extract common styles to shared SCSS files
- Use CSS variables for theming instead of duplicating styles
- Remove unused CSS rules
- Consider CSS-in-JS for component-specific styles
- Use PurgeCSS to remove unused Tailwind/PrimeNG styles

**Target Components:**
- admin-dashboard.component.scss (29.48 kB → < 15 kB)
- cm-dashboard.component.scss (23.43 kB → < 15 kB)
- user-notifications.component.scss (16.96 kB → < 15 kB)

**Estimated Impact:** -50 KB total styles

#### 5. Implement Preloading Strategy

**Current:** All lazy modules loaded on-demand  
**Recommended:** Preload critical feature modules after initial load

```typescript
// app-routing.module.ts
RouterModule.forRoot(routes, {
  preloadingStrategy: PreloadAllModules // or custom strategy
})
```

**Benefits:**
- Faster navigation to frequently-used features
- Better user experience after initial load
- No impact on initial load time

#### 6. Enable Differential Loading

**Action:** Ensure modern browsers get optimized ES2020+ bundles

**Benefits:**
- Smaller bundles for modern browsers
- Better performance on newer devices
- Automatic fallback for older browsers

### Low Priority (Future Optimization)

#### 7. Implement Virtual Scrolling Everywhere

**Status:** Already implemented for large lists (✓)  
**Action:** Verify all lists > 100 items use virtual scrolling

#### 8. Optimize Images and Assets

**Actions:**
- Compress images using WebP format
- Implement lazy loading for images
- Use responsive images with srcset
- Optimize SVG icons

#### 9. Service Worker Optimization

**Current:** Service worker is 66.40 kB  
**Action:** Review caching strategies and reduce service worker size

## Lazy Loading Status

### ✅ Successfully Lazy Loaded

- Field Resource Management module (416.73 kB)
- Admin Dashboard module (352.35 kB)
- Atlas module (416.92 kB)
- Deployment module (223.02 kB)
- TPS module (236.33 kB)
- All component sub-modules (jobs, crews, technicians, etc.)

### ⚠️ Needs Lazy Loading

- Chart.js library (included in main bundle)
- D3.js library (included in main bundle)
- Leaflet core (loaded via scripts in angular.json)
- SignalR client (loaded eagerly)
- NgRx DevTools (should only load in development)

## Performance Metrics Estimation

### Current Performance (4.88 MB initial)

- **3G Connection:** ~15-20 seconds initial load
- **4G Connection:** ~3-5 seconds initial load
- **WiFi:** ~1-2 seconds initial load
- **Time to Interactive:** 5-8 seconds (4G)

### Target Performance (< 2 MB initial)

- **3G Connection:** ~6-8 seconds initial load
- **4G Connection:** ~1-2 seconds initial load
- **WiFi:** ~0.5-1 second initial load
- **Time to Interactive:** 2-3 seconds (4G)

## Recommended Action Plan

### Phase 1: Critical Fixes (Week 1)

1. ✅ Install and configure webpack-bundle-analyzer
2. ⏳ Lazy load html2canvas, canvg, jspdf libraries
3. ⏳ Move Chart.js and D3.js to lazy-loaded modules
4. ⏳ Split NgRx state into feature modules
5. ⏳ Remove unused dependencies from package.json

**Expected Result:** Main bundle reduced to ~2.5 MB

### Phase 2: Optimization (Week 2)

1. ⏳ Replace CommonJS dependencies with ES modules
2. ⏳ Optimize component styles (top 5 violators)
3. ⏳ Implement preloading strategy
4. ⏳ Configure differential loading
5. ⏳ Add bundle size monitoring to CI/CD

**Expected Result:** Main bundle reduced to ~2 MB

### Phase 3: Fine-Tuning (Week 3)

1. ⏳ Optimize images and assets
2. ⏳ Review and optimize service worker
3. ⏳ Implement advanced code splitting
4. ⏳ Performance testing and validation
5. ⏳ Document optimization guidelines

**Expected Result:** Main bundle reduced to < 2 MB, optimal performance

## Monitoring and Prevention

### Bundle Size Budgets

Update `angular.json` budgets to prevent regression:

```json
"budgets": [
  {
    "type": "initial",
    "maximumWarning": "2mb",
    "maximumError": "2.5mb"
  },
  {
    "type": "anyComponentStyle",
    "maximumWarning": "8kb",
    "maximumError": "12kb"
  }
]
```

### CI/CD Integration

1. Run bundle analysis on every PR
2. Fail builds that exceed budget
3. Generate bundle size reports
4. Track bundle size trends over time

### Tools and Resources

- **webpack-bundle-analyzer:** Visual analysis of bundle composition
- **source-map-explorer:** Alternative bundle analyzer
- **Lighthouse:** Performance auditing
- **Bundle Buddy:** Identify duplicate dependencies
- **Angular CLI:** Built-in bundle budgets

## Conclusion

The current bundle size of 4.88 MB significantly exceeds best practices and impacts user experience. The main bundle (4.22 MB) is the primary concern and should be reduced by at least 50% through lazy loading, code splitting, and dependency optimization.

The good news is that lazy loading is already implemented for feature modules, which is a solid foundation. The focus should now be on:

1. Lazy loading heavy third-party libraries
2. Splitting the main bundle into smaller chunks
3. Replacing CommonJS dependencies
4. Optimizing component styles

With the recommended optimizations, the application can achieve a main bundle size of < 2 MB, resulting in significantly improved load times and user experience.

## Appendix: Webpack Bundle Analyzer

A visual analysis is available at: http://127.0.0.1:8888

The analyzer provides:
- Interactive treemap of bundle composition
- Module size breakdown
- Dependency relationships
- Duplicate module detection

To regenerate the analysis:
```bash
npm run build:stats
npx webpack-bundle-analyzer dist/sri-frontend/stats.json
```

---

**Report Generated By:** Kiro AI  
**Analysis Tool:** webpack-bundle-analyzer v4.x + custom scripts  
**Next Review:** After Phase 1 optimizations
