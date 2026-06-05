# Tech Stack & Build System

## Core Framework

- **Angular 18.2.6** (NgModule-based, not standalone — except select newer components)
- **TypeScript 5.4.5** targeting ES2022
- **Node.js >=20.0.0**, npm >=10.0.0

## State Management

- **NgRx Store 18** with Effects and Entity
- Pattern: actions → reducers → effects → selectors per feature
- Strict runtime checks enabled (state and action immutability)

## UI Libraries

- **Angular Material 18.2.6** (theme: cyan-orange)
- **PrimeNG 18** (dialogs, tables, buttons, menus, tabs, dropdowns)
- **Bootstrap 5** (grid system only, not full framework)
- **TailwindCSS 3.4** (utility classes)

## Maps & Visualization

- **Leaflet** with plugins: leaflet-draw, leaflet-search, leaflet.markercluster
- **Chart.js** via ng2-charts
- **D3.js** for advanced visualizations

## Real-Time Communication

- **Microsoft SignalR** for push notifications and live updates

## Document & Export

- jsPDF + jspdf-autotable (PDF generation)
- PapaParse (CSV parsing/export)
- JSZip, file-saver (file downloads)
- mammoth (Word document parsing)
- pdfjs-dist (PDF viewing)
- ngx-image-compress (image optimization)

## Styling

- SCSS for component styles (configured in angular.json schematics)
- TailwindCSS for utility classes
- Bootstrap grid for layout
- Material prebuilt theme

## Testing

- **Karma + Jasmine** for unit tests
- **fast-check** for property-based testing
- **Storybook 8.4** for component development and visual testing

## Build & Tooling

- Angular CLI with webpack browser builder
- PostCSS + Autoprefixer for CSS processing
- Sass compiler for SCSS
- webpack-bundle-analyzer for bundle analysis

## Deployment Target

- Azure Static Web Apps
- PWA with Angular Service Worker

## Common Commands

| Command | Purpose |
|---------|---------|
| `npm start` | Dev server on localhost:4200 |
| `npm run build` | Production build (output: dist/sri-frontend) |
| `npm test` | Run unit tests (Karma/Jasmine) |
| `npm run storybook` | Storybook dev server on port 6006 |
| `npm run build:stats` | Build with webpack stats.json |
| `npm run analyze` | Custom bundle analysis script |
| `npm run analyze:webpack` | Full webpack bundle analyzer |
| `npm run watch` | Development build with file watching |
| `npm run build-storybook` | Build static Storybook |

## TypeScript Configuration

Strict mode is fully enabled:
- `strict: true`
- `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch`
- `noPropertyAccessFromIndexSignature`
- Angular strict templates, strict injection parameters, strict input access modifiers
