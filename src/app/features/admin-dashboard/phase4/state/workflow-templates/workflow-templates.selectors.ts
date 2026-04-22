import { createFeatureSelector, createSelector } from '@ngrx/store';
import { WorkflowTemplatesState } from './workflow-templates.reducer';
import { WorkflowTemplate } from '../../models/template.models';

/**
 * Workflow Templates Selectors
 * 
 * Selectors for accessing template state
 * Requirements: 10.1, 10.6, 11.1
 */

export const selectWorkflowTemplatesState = createFeatureSelector<WorkflowTemplatesState>(
  'workflowTemplates'
);

// Basic selectors
export const selectAllTemplates = createSelector(
  selectWorkflowTemplatesState,
  (state) => state.templates
);

export const selectTemplateCategories = createSelector(
  selectWorkflowTemplatesState,
  (state) => state.categories
);

export const selectSelectedTemplateId = createSelector(
  selectWorkflowTemplatesState,
  (state) => state.selectedTemplateId
);

export const selectSelectedTemplate = createSelector(
  selectWorkflowTemplatesState,
  (state) => state.selectedTemplate
);

export const selectAppliedTemplate = createSelector(
  selectWorkflowTemplatesState,
  (state) => state.appliedTemplate
);

export const selectTemplatesLoading = createSelector(
  selectWorkflowTemplatesState,
  (state) => state.loading
);

export const selectTemplatesError = createSelector(
  selectWorkflowTemplatesState,
  (state) => state.error
);

export const selectTemplateFilters = createSelector(
  selectWorkflowTemplatesState,
  (state) => state.filters
);

export const selectSearchQuery = createSelector(
  selectWorkflowTemplatesState,
  (state) => state.searchQuery
);

// Computed selectors

/**
 * Select filtered templates based on current filters and search query
 * Requirement: 10.3, 10.4
 */
export const selectFilteredTemplates = createSelector(
  selectAllTemplates,
  selectTemplateFilters,
  selectSearchQuery,
  (templates, filters, searchQuery) => {
    let filtered = [...templates];

    // Apply category filter
    if (filters.category) {
      filtered = filtered.filter(t => t.category === filters.category);
    }

    // Apply workflow type filter
    if (filters.workflowType) {
      filtered = filtered.filter(t => t.workflowType === filters.workflowType);
    }

    // Apply author filter
    if (filters.author) {
      filtered = filtered.filter(t => t.author === filters.author);
    }

    // Apply minimum rating filter
    if (filters.minRating !== undefined) {
      filtered = filtered.filter(t => t.rating >= filters.minRating!);
    }

    // Apply search query
    if (searchQuery && searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query)
      );
    }

    return filtered;
  }
);

/**
 * Select templates by category
 */
export const selectTemplatesByCategory = createSelector(
  selectAllTemplates,
  (templates) => {
    const byCategory = new Map<string, WorkflowTemplate[]>();
    
    templates.forEach(template => {
      const category = template.category;
      if (!byCategory.has(category)) {
        byCategory.set(category, []);
      }
      byCategory.get(category)!.push(template);
    });

    return byCategory;
  }
);

/**
 * Select popular templates (sorted by usage count)
 * Requirement: 10.2
 */
export const selectPopularTemplates = createSelector(
  selectAllTemplates,
  (templates) => {
    return [...templates]
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10);
  }
);

/**
 * Select highly rated templates (rating >= 4.0)
 * Requirement: 10.2
 */
export const selectHighlyRatedTemplates = createSelector(
  selectAllTemplates,
  (templates) => {
    return templates.filter(t => t.rating >= 4.0);
  }
);

/**
 * Select template by ID
 */
export const selectTemplateById = (templateId: string) =>
  createSelector(
    selectAllTemplates,
    (templates) => templates.find(t => t.id === templateId)
  );

/**
 * Select templates by workflow type
 */
export const selectTemplatesByWorkflowType = (workflowType: string) =>
  createSelector(
    selectAllTemplates,
    (templates) => templates.filter(t => t.workflowType === workflowType)
  );

/**
 * Check if templates are loaded
 */
export const selectTemplatesLoaded = createSelector(
  selectAllTemplates,
  (templates) => templates.length > 0
);

/**
 * Check if a template is selected
 */
export const selectHasSelectedTemplate = createSelector(
  selectSelectedTemplateId,
  (id) => id !== null
);

/**
 * Check if a template has been applied
 */
export const selectHasAppliedTemplate = createSelector(
  selectAppliedTemplate,
  (applied) => applied !== null
);

/**
 * Get template count by category
 */
export const selectTemplateCounts = createSelector(
  selectAllTemplates,
  (templates) => {
    const counts = new Map<string, number>();
    
    templates.forEach(template => {
      const category = template.category;
      counts.set(category, (counts.get(category) || 0) + 1);
    });

    return counts;
  }
);
