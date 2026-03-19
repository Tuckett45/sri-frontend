import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { FormControl } from '@angular/forms';
import { WorkflowTemplate, TemplateCategory } from '../../models/template.models';
import * as TemplateActions from '../../state/workflow-templates/workflow-templates.actions';
import * as TemplateSelectors from '../../state/workflow-templates/workflow-templates.selectors';

/**
 * Template Selector Component
 * 
 * Allows users to browse, preview, and select workflow templates dynamically
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */
@Component({
  selector: 'app-template-selector',
  templateUrl: './template-selector.component.html',
  styleUrls: ['./template-selector.component.scss']
})
export class TemplateSelectorComponent implements OnInit, OnDestroy {
  @Input() currentTemplateId?: string;
  @Input() workflowType: string = '';
  @Output() templateSelected = new EventEmitter<WorkflowTemplate>();
  @Output() templatePreview = new EventEmitter<WorkflowTemplate>();

  // Observables from store
  templates$: Observable<WorkflowTemplate[]>;
  categories$: Observable<TemplateCategory[]>;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;

  // UI state
  selectedCategory: string | null = null;
  searchControl = new FormControl('');
  viewMode: 'grid' | 'list' = 'grid';
  sortBy: 'name' | 'rating' | 'usage' | 'date' = 'rating';
  sortDirection: 'asc' | 'desc' = 'desc';
  
  // Comparison mode
  comparisonMode = false;
  selectedForComparison: Set<string> = new Set();
  maxComparisonItems = 3;

  private destroy$ = new Subject<void>();

  constructor(private store: Store) {
    this.templates$ = this.store.select(TemplateSelectors.selectFilteredTemplates);
    this.categories$ = this.store.select(TemplateSelectors.selectTemplateCategories);
    this.loading$ = this.store.select(TemplateSelectors.selectTemplatesLoading);
    this.error$ = this.store.select(TemplateSelectors.selectTemplatesError);
  }

  ngOnInit(): void {
    this.loadTemplates();
    this.setupSearchListener();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load templates from store
   * Requirement: 10.1
   */
  loadTemplates(): void {
    this.store.dispatch(TemplateActions.loadTemplates({ 
      workflowType: this.workflowType 
    }));
    this.store.dispatch(TemplateActions.loadTemplateCategories());
  }

  /**
   * Setup search input listener with debounce
   * Requirement: 10.3
   */
  private setupSearchListener(): void {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(query => {
        this.searchTemplates(query || '');
      });
  }

  /**
   * Search templates by query
   * Requirement: 10.3
   */
  searchTemplates(query: string): void {
    this.store.dispatch(TemplateActions.setSearchQuery({ query }));
  }

  /**
   * Filter templates by category
   * Requirement: 10.4
   */
  filterByCategory(category: string | null): void {
    this.selectedCategory = category;
    this.store.dispatch(TemplateActions.setFilters({ 
      filters: { category: category || undefined } 
    }));
  }

  /**
   * Select a template
   * Requirement: 10.6
   */
  selectTemplate(template: WorkflowTemplate): void {
    if (this.comparisonMode) {
      this.toggleComparisonSelection(template.id);
    } else {
      this.store.dispatch(TemplateActions.selectTemplate({ 
        templateId: template.id 
      }));
      this.templateSelected.emit(template);
    }
  }

  /**
   * Preview a template
   * Requirement: 10.5
   */
  previewTemplate(template: WorkflowTemplate): void {
    this.templatePreview.emit(template);
  }

  /**
   * Toggle view mode between grid and list
   */
  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
  }

  /**
   * Sort templates
   */
  setSortBy(sortBy: 'name' | 'rating' | 'usage' | 'date'): void {
    if (this.sortBy === sortBy) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = sortBy;
      this.sortDirection = 'desc';
    }
  }

  /**
   * Get sorted templates
   */
  getSortedTemplates(templates: WorkflowTemplate[]): WorkflowTemplate[] {
    const sorted = [...templates].sort((a, b) => {
      let comparison = 0;
      
      switch (this.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'rating':
          comparison = a.rating - b.rating;
          break;
        case 'usage':
          comparison = a.usageCount - b.usageCount;
          break;
        case 'date':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
      }

      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }

  /**
   * Toggle comparison mode
   */
  toggleComparisonMode(): void {
    this.comparisonMode = !this.comparisonMode;
    if (!this.comparisonMode) {
      this.selectedForComparison.clear();
    }
  }

  /**
   * Toggle template selection for comparison
   */
  toggleComparisonSelection(templateId: string): void {
    if (this.selectedForComparison.has(templateId)) {
      this.selectedForComparison.delete(templateId);
    } else if (this.selectedForComparison.size < this.maxComparisonItems) {
      this.selectedForComparison.add(templateId);
    }
  }

  /**
   * Check if template is selected for comparison
   */
  isSelectedForComparison(templateId: string): boolean {
    return this.selectedForComparison.has(templateId);
  }

  /**
   * Compare selected templates
   */
  compareTemplates(): void {
    if (this.selectedForComparison.size >= 2) {
      const templateIds = Array.from(this.selectedForComparison);
      this.store.dispatch(TemplateActions.compareTemplates({ templateIds }));
    }
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.selectedCategory = null;
    this.searchControl.setValue('');
    this.store.dispatch(TemplateActions.clearFilters());
  }

  /**
   * Refresh templates
   */
  refresh(): void {
    this.loadTemplates();
  }

  /**
   * Track by function for template list
   */
  trackByTemplateId(index: number, template: WorkflowTemplate): string {
    return template.id;
  }

  /**
   * Track by function for category list
   */
  trackByCategoryId(index: number, category: TemplateCategory): string {
    return category.id;
  }
}
