/**
 * Phase 5: Predictive Dashboards
 * 
 * Public API for Phase 5 components, services, and state management.
 * Exports forecasting infrastructure, trend analysis, and predictive analytics.
 */

// Models
export * from './models/forecast.models';

// Services
export * from './services/forecast.service';
export * from './services/trend-analysis.service';

// Components
export * from './components/predictive-dashboard/predictive-dashboard.component';
export * from './components/trend-analysis/trend-analysis.component';

// State
export * from './state/forecasts/forecasts.actions';
export * from './state/forecasts/forecasts.reducer';
export * from './state/forecasts/forecasts.effects';
export * from './state/forecasts/forecasts.selectors';
