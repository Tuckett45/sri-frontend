import { createReducer, on } from '@ngrx/store';
import {
  WorkflowTemplate,
  TemplateCategory,
  AppliedTemplate
} from '../../models/template.models';
import * as TemplateActions from './workflow-templates.actions';

/**
 * Workflow Templates State
 * 
 * State management for workflow templates
 * Requirements: 10.1, 10.6, 11.1
 */

export interface WorkflowTemplatesState {
  templates: WorkflowTemplate[];
  categories: TemplateCategory[];
  selectedTemplateId: string | null;
  selectedTemplate: WorkflowTemplate | null;
  appliedTemplate: AppliedTemplate | null;
  filters: TemplateActions.TemplateFilters;
  searchQuery: string;
  loading: boolean;
  error: any | null;
}

export const initialState: WorkflowTemplatesState = {
  templates: [],
  categories: [],
  selectedTemplateId: null,
  selectedTemplate: null,
  appliedTemplate: null,
  filters: {},
  searchQuery: '',
  loading: false,
  error: null
};

export const workflowTemplatesReducer = createReducer(
  initialState,

  // Load Templates
  on(TemplateActions.loadTemplates, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TemplateActions.loadTemplatesSuccess, (state, { templates }) => ({
    ...state,
    templates,
    loading: false,
    error: null
  })),

  on(TemplateActions.loadTemplatesFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Load Template by ID
  on(TemplateActions.loadTemplateById, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TemplateActions.loadTemplateByIdSuccess, (state, { template }) => {
    // Add or update template in the list
    const existingIndex = state.templates.findIndex(t => t.id === template.id);
    const templates = existingIndex >= 0
      ? state.templates.map((t, i) => i === existingIndex ? template : t)
      : [...state.templates, template];

    return {
      ...state,
      templates,
      selectedTemplate: template,
      selectedTemplateId: template.id,
      loading: false,
      error: null
    };
  }),

  on(TemplateActions.loadTemplateByIdFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Load Template Categories
  on(TemplateActions.loadTemplateCategories, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TemplateActions.loadTemplateCategoriesSuccess, (state, { categories }) => ({
    ...state,
    categories,
    loading: false,
    error: null
  })),

  on(TemplateActions.loadTemplateCategoriesFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Select Template
  on(TemplateActions.selectTemplate, (state, { templateId }) => {
    const selectedTemplate = state.templates.find(t => t.id === templateId) || null;
    return {
      ...state,
      selectedTemplateId: templateId,
      selectedTemplate
    };
  }),

  on(TemplateActions.deselectTemplate, (state) => ({
    ...state,
    selectedTemplateId: null,
    selectedTemplate: null
  })),

  // Apply Template
  on(TemplateActions.applyTemplate, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TemplateActions.applyTemplateSuccess, (state, { appliedTemplate }) => ({
    ...state,
    appliedTemplate,
    loading: false,
    error: null
  })),

  on(TemplateActions.applyTemplateFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Filter Templates
  on(TemplateActions.filterTemplates, (state, { filters }) => ({
    ...state,
    filters: { ...state.filters, ...filters }
  })),

  on(TemplateActions.clearFilters, (state) => ({
    ...state,
    filters: {}
  })),

  // Search Templates
  on(TemplateActions.searchTemplates, (state, { query }) => ({
    ...state,
    searchQuery: query
  })),

  on(TemplateActions.setSearchQuery, (state, { query }) => ({
    ...state,
    searchQuery: query
  })),

  on(TemplateActions.clearSearch, (state) => ({
    ...state,
    searchQuery: ''
  })),

  // Set Filters
  on(TemplateActions.setFilters, (state, { filters }) => ({
    ...state,
    filters: { ...state.filters, ...filters }
  })),

  // Compare Templates
  on(TemplateActions.compareTemplates, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TemplateActions.compareTemplatesSuccess, (state, { comparison }) => ({
    ...state,
    loading: false,
    error: null
  })),

  on(TemplateActions.compareTemplatesFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Clear State
  on(TemplateActions.clearTemplatesState, () => initialState)
);
