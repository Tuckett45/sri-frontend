import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { TemplateSelectorComponent } from './template-selector.component';
import { TemplateMetadataComponent } from '../template-metadata/template-metadata.component';
import { WorkflowTemplate, TemplateCategory } from '../../models/template.models';
import * as TemplateSelectors from '../../state/workflow-templates/workflow-templates.selectors';
import * as TemplateActions from '../../state/workflow-templates/workflow-templates.actions';

describe('TemplateSelectorComponent', () => {
  let component: TemplateSelectorComponent;
  let fixture: ComponentFixture<TemplateSelectorComponent>;
  let store: MockStore;

  const mockTemplates: WorkflowTemplate[] = [
    {
      id: 'template-1',
      name: 'Standard Job Template',
      description: 'Standard template for job workflows',
      version: '1.0.0',
      category: 'job',
      workflowType: 'job',
      author: 'System',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-15'),
      isPublic: true,
      usageCount: 150,
      rating: 4.5,
      steps: [],
      configuration: {
        allowCustomization: true,
        requiredFields: [],
        optionalFields: [],
        defaultValues: {},
        validations: [],
        permissions: []
      },
      metadata: {}
    },
    {
      id: 'template-2',
      name: 'Express Deployment',
      description: 'Quick deployment template',
      version: '2.0.0',
      category: 'deployment',
      workflowType: 'deployment',
      author: 'Admin',
      createdAt: new Date('2024-02-01'),
      updatedAt: new Date('2024-02-10'),
      isPublic: true,
      usageCount: 75,
      rating: 4.8,
      steps: [],
      configuration: {
        allowCustomization: true,
        requiredFields: [],
        optionalFields: [],
        defaultValues: {},
        validations: [],
        permissions: []
      },
      metadata: {}
    }
  ];

  const mockCategories: TemplateCategory[] = [
    {
      id: 'job',
      name: 'Job Templates',
      description: 'Templates for job workflows',
      icon: '📋',
      templateCount: 1
    },
    {
      id: 'deployment',
      name: 'Deployment Templates',
      description: 'Templates for deployment workflows',
      icon: '🚀',
      templateCount: 1
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TemplateSelectorComponent, TemplateMetadataComponent],
      imports: [ReactiveFormsModule, FormsModule],
      providers: [
        provideMockStore({
          selectors: [
            { selector: TemplateSelectors.selectFilteredTemplates, value: mockTemplates },
            { selector: TemplateSelectors.selectTemplateCategories, value: mockCategories },
            { selector: TemplateSelectors.selectTemplatesLoading, value: false },
            { selector: TemplateSelectors.selectTemplatesError, value: null }
          ]
        })
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(TemplateSelectorComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Template Display', () => {
    it('should load templates on init', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      component.workflowType = 'job';
      
      component.ngOnInit();

      expect(dispatchSpy).toHaveBeenCalledWith(
        TemplateActions.loadTemplates({ workflowType: 'job' })
      );
      expect(dispatchSpy).toHaveBeenCalledWith(
        TemplateActions.loadTemplateCategories()
      );
    });

    it('should display templates in grid view by default', () => {
      expect(component.viewMode).toBe('grid');
    });

    it('should toggle between grid and list view', () => {
      component.viewMode = 'grid';
      component.toggleViewMode();
      expect(component.viewMode).toBe('list');
      
      component.toggleViewMode();
      expect(component.viewMode).toBe('grid');
    });
  });

  describe('Search and Filtering', () => {
    it('should dispatch search query when search control changes', (done) => {
      const dispatchSpy = spyOn(store, 'dispatch');
      component.ngOnInit();

      component.searchControl.setValue('test query');

      setTimeout(() => {
        expect(dispatchSpy).toHaveBeenCalledWith(
          TemplateActions.setSearchQuery({ query: 'test query' })
        );
        done();
      }, 350);
    });

    it('should filter by category', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      
      component.filterByCategory('job');

      expect(component.selectedCategory).toBe('job');
      expect(dispatchSpy).toHaveBeenCalledWith(
        TemplateActions.setFilters({ filters: { category: 'job' } })
      );
    });

    it('should clear category filter when null is passed', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      component.selectedCategory = 'job';
      
      component.filterByCategory(null);

      expect(component.selectedCategory).toBeNull();
      expect(dispatchSpy).toHaveBeenCalledWith(
        TemplateActions.setFilters({ filters: { category: undefined } })
      );
    });

    it('should clear all filters', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      component.selectedCategory = 'job';
      component.searchControl.setValue('test');

      component.clearFilters();

      expect(component.selectedCategory).toBeNull();
      expect(component.searchControl.value).toBe('');
      expect(dispatchSpy).toHaveBeenCalledWith(TemplateActions.clearFilters());
    });
  });

  describe('Template Selection', () => {
    it('should select a template', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      const emitSpy = spyOn(component.templateSelected, 'emit');
      const template = mockTemplates[0];

      component.selectTemplate(template);

      expect(dispatchSpy).toHaveBeenCalledWith(
        TemplateActions.selectTemplate({ templateId: template.id })
      );
      expect(emitSpy).toHaveBeenCalledWith(template);
    });

    it('should preview a template', () => {
      const emitSpy = spyOn(component.templatePreview, 'emit');
      const template = mockTemplates[0];

      component.previewTemplate(template);

      expect(emitSpy).toHaveBeenCalledWith(template);
    });
  });

  describe('Sorting', () => {
    it('should sort templates by name ascending', () => {
      component.sortBy = 'name';
      component.sortDirection = 'asc';

      const sorted = component.getSortedTemplates(mockTemplates);

      expect(sorted[0].name).toBe('Express Deployment');
      expect(sorted[1].name).toBe('Standard Job Template');
    });

    it('should sort templates by rating descending', () => {
      component.sortBy = 'rating';
      component.sortDirection = 'desc';

      const sorted = component.getSortedTemplates(mockTemplates);

      expect(sorted[0].rating).toBe(4.8);
      expect(sorted[1].rating).toBe(4.5);
    });

    it('should sort templates by usage count', () => {
      component.sortBy = 'usage';
      component.sortDirection = 'desc';

      const sorted = component.getSortedTemplates(mockTemplates);

      expect(sorted[0].usageCount).toBe(150);
      expect(sorted[1].usageCount).toBe(75);
    });

    it('should toggle sort direction when same sort field is selected', () => {
      component.sortBy = 'name';
      component.sortDirection = 'asc';

      component.setSortBy('name');

      expect(component.sortDirection).toBe('desc');
    });

    it('should set sort direction to desc when new sort field is selected', () => {
      component.sortBy = 'name';
      component.sortDirection = 'asc';

      component.setSortBy('rating');

      expect(component.sortBy).toBe('rating');
      expect(component.sortDirection).toBe('desc');
    });
  });

  describe('Comparison Mode', () => {
    it('should toggle comparison mode', () => {
      expect(component.comparisonMode).toBe(false);
      
      component.toggleComparisonMode();
      expect(component.comparisonMode).toBe(true);
      
      component.toggleComparisonMode();
      expect(component.comparisonMode).toBe(false);
    });

    it('should clear selected templates when exiting comparison mode', () => {
      component.selectedForComparison.add('template-1');
      component.selectedForComparison.add('template-2');
      component.comparisonMode = true;

      component.toggleComparisonMode();

      expect(component.comparisonMode).toBe(false);
      expect(component.selectedForComparison.size).toBe(0);
    });

    it('should toggle template selection for comparison', () => {
      component.toggleComparisonSelection('template-1');
      expect(component.isSelectedForComparison('template-1')).toBe(true);

      component.toggleComparisonSelection('template-1');
      expect(component.isSelectedForComparison('template-1')).toBe(false);
    });

    it('should not allow more than max comparison items', () => {
      component.maxComparisonItems = 3;
      component.toggleComparisonSelection('template-1');
      component.toggleComparisonSelection('template-2');
      component.toggleComparisonSelection('template-3');
      component.toggleComparisonSelection('template-4');

      expect(component.selectedForComparison.size).toBe(3);
      expect(component.isSelectedForComparison('template-4')).toBe(false);
    });

    it('should compare selected templates', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      component.selectedForComparison.add('template-1');
      component.selectedForComparison.add('template-2');

      component.compareTemplates();

      expect(dispatchSpy).toHaveBeenCalledWith(
        TemplateActions.compareTemplates({ 
          templateIds: ['template-1', 'template-2'] 
        })
      );
    });

    it('should not compare if less than 2 templates selected', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      component.selectedForComparison.add('template-1');

      component.compareTemplates();

      expect(dispatchSpy).not.toHaveBeenCalled();
    });

    it('should add to comparison instead of selecting when in comparison mode', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      const emitSpy = spyOn(component.templateSelected, 'emit');
      component.comparisonMode = true;
      const template = mockTemplates[0];

      component.selectTemplate(template);

      expect(component.isSelectedForComparison(template.id)).toBe(true);
      expect(dispatchSpy).not.toHaveBeenCalledWith(
        TemplateActions.selectTemplate({ templateId: template.id })
      );
      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('Refresh', () => {
    it('should reload templates on refresh', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      component.workflowType = 'job';

      component.refresh();

      expect(dispatchSpy).toHaveBeenCalledWith(
        TemplateActions.loadTemplates({ workflowType: 'job' })
      );
      expect(dispatchSpy).toHaveBeenCalledWith(
        TemplateActions.loadTemplateCategories()
      );
    });
  });

  describe('Track By Functions', () => {
    it('should track templates by id', () => {
      const template = mockTemplates[0];
      const result = component.trackByTemplateId(0, template);
      expect(result).toBe(template.id);
    });

    it('should track categories by id', () => {
      const category = mockCategories[0];
      const result = component.trackByCategoryId(0, category);
      expect(result).toBe(category.id);
    });
  });
});
