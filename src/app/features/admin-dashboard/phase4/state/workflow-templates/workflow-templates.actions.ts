import { createAction, props } from '@ngrx/store';
import {
  WorkflowTemplate,
  TemplateCategory,
  AppliedTemplate,
  TemplateCustomization
} from '../../models/template.models';

/**
 * Workflow Templates Actions
 * 
 * Actions for template loading, selection, and application
 * Requirements: 10.1, 10.6, 11.1
 */

// Load Templates
export const loadTemplates = createAction(
  '[Workflow Templates] Load Templates',
  props<{ workflowType?: string }>()
);

export const loadTemplatesSuccess = createAction(
  '[Workflow Templates] Load Templates Success',
  props<{ templates: WorkflowTemplate[] }>()
);

export const loadTemplatesFailure = createAction(
  '[Workflow Templates] Load Templates Failure',
  props<{ error: any }>()
);

// Load Template by ID
export const loadTemplateById = createAction(
  '[Workflow Templates] Load Template By ID',
  props<{ templateId: string }>()
);

export const loadTemplateByIdSuccess = createAction(
  '[Workflow Templates] Load Template By ID Success',
  props<{ template: WorkflowTemplate }>()
);

export const loadTemplateByIdFailure = createAction(
  '[Workflow Templates] Load Template By ID Failure',
  props<{ error: any }>()
);

// Load Template Categories
export const loadTemplateCategories = createAction(
  '[Workflow Templates] Load Template Categories'
);

export const loadTemplateCategoriesSuccess = createAction(
  '[Workflow Templates] Load Template Categories Success',
  props<{ categories: TemplateCategory[] }>()
);

export const loadTemplateCategoriesFailure = createAction(
  '[Workflow Templates] Load Template Categories Failure',
  props<{ error: any }>()
);

// Select Template
export const selectTemplate = createAction(
  '[Workflow Templates] Select Template',
  props<{ templateId: string }>()
);

export const deselectTemplate = createAction(
  '[Workflow Templates] Deselect Template'
);

// Apply Template
export const applyTemplate = createAction(
  '[Workflow Templates] Apply Template',
  props<{ templateId: string; customizations?: TemplateCustomization }>()
);

export const applyTemplateSuccess = createAction(
  '[Workflow Templates] Apply Template Success',
  props<{ appliedTemplate: AppliedTemplate }>()
);

export const applyTemplateFailure = createAction(
  '[Workflow Templates] Apply Template Failure',
  props<{ error: any }>()
);

// Filter Templates
export const filterTemplates = createAction(
  '[Workflow Templates] Filter Templates',
  props<{ filters: TemplateFilters }>()
);

export const clearFilters = createAction(
  '[Workflow Templates] Clear Filters'
);

// Search Templates
export const searchTemplates = createAction(
  '[Workflow Templates] Search Templates',
  props<{ query: string }>()
);

export const setSearchQuery = createAction(
  '[Workflow Templates] Set Search Query',
  props<{ query: string }>()
);

export const clearSearch = createAction(
  '[Workflow Templates] Clear Search'
);

// Set Filters
export const setFilters = createAction(
  '[Workflow Templates] Set Filters',
  props<{ filters: Partial<TemplateFilters> }>()
);

// Compare Templates
export const compareTemplates = createAction(
  '[Workflow Templates] Compare Templates',
  props<{ templateIds: string[] }>()
);

export const compareTemplatesSuccess = createAction(
  '[Workflow Templates] Compare Templates Success',
  props<{ comparison: any }>()
);

export const compareTemplatesFailure = createAction(
  '[Workflow Templates] Compare Templates Failure',
  props<{ error: any }>()
);

// Clear State
export const clearTemplatesState = createAction(
  '[Workflow Templates] Clear State'
);

// Template Filters Interface
export interface TemplateFilters {
  category?: string;
  workflowType?: string;
  author?: string;
  minRating?: number;
}
