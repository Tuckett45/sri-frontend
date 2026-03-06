/**
 * Phase 4: Workflow Template Switching
 * 
 * Public API for Phase 4 components, services, and state management
 */

// Models
export * from './models/template.models';

// Components
export * from './components/template-selector/template-selector.component';
export * from './components/template-metadata/template-metadata.component';

// Services
export * from './services/template-engine.service';
export * from './services/template-customization.service';
export * from './services/configuration-manager.service';

// State
export * from './state/workflow-templates/workflow-templates.actions';
export * from './state/workflow-templates/workflow-templates.reducer';
export * from './state/workflow-templates/workflow-templates.effects';
export * from './state/workflow-templates/workflow-templates.selectors';

