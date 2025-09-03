// src/charts-setup.ts
// Ensure Chart.js automatically registers all controllers/elements
// PrimeNG and ng2-charts will work with this single import
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

// (optional defaults)
Chart.defaults.maintainAspectRatio = false;
Chart.defaults.responsive = true;
