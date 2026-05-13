/**
 * Query Template Component Unit Tests
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { ConfirmationService } from 'primeng/api';
import { QueryTemplateComponent } from './query-template.component';
import * as QueryBuilderActions from '../../state/query-builder/query-builder.actions';
import * as QueryBuilderSelectors from '../../state/query-builder/query-builder.selectors';
import { QueryTemplate, TemplateParameter } from '../../models/query-builder.model';

describe('QueryTemplateComponent', () => {
  let component: QueryTemplateComponent;
  let fixture: ComponentFixture<QueryTemplateComponent>;
  let store: MockStore;
  let confirmationService: ConfirmationService;

  const mockTemplates: QueryTemplate[] = [
    {
      id: 'template1',
      name: 'Test Template 1',
      description: 'Test description',
      dataSource: 'deployments',
      parameters: [],
      sqlTemplate: 'SELECT * FROM deployments',
      isPublic: true,
      createdBy: 'user1',
      createdAt: new Date('2024-01-01'),
      modifiedAt: new Date('2024-01-01')
    },
    {
      id: 'template2',
      name: 'Test Template 2',
      description: 'Private template',
      dataSource: 'users',
      parameters: [
        {
          name: 'userId',
          displayName: 'User ID',
          dataType: 'number',
          isRequired: true,
          defaultValue: null
        }
      ],
      sqlTemplate: 'SELECT * FROM users WHERE id = @userId',
      isPublic: false,
      createdBy: 'user1',
      createdAt: new Date('2024-01-02'),
      modifiedAt: new Date('2024-01-02')
    }
  ];

  const initialState = {
    queryBuilder: {
      dataSources: [],
      fields: [],
      selectedDataSource: null,
      currentQuery: null,
      queryResult: null,
      selectedTemplateId: null,
      selectedTemplateDetail: null,
      loading: {
        dataSources: false,
        fields: false,
        executing: false,
        exporting: false,
        templates: false,
        templateDetail: false,
        creatingTemplate: false,
        deletingTemplate: false,
        executingTemplate: false
      },
      error: {
        dataSources: null,
        fields: null,
        executing: null,
        exporting: null,
        templates: null,
        templateDetail: null,
        creatingTemplate: null,
        deletingTemplate: null,
        executingTemplate: null
      },
      lastExecuted: null,
      lastTemplatesLoaded: null,
      ids: ['template1', 'template2'],
      entities: {
        template1: mockTemplates[0],
        template2: mockTemplates[1]
      }
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QueryTemplateComponent, ReactiveFormsModule],
      providers: [
        provideMockStore({ initialState }),
        ConfirmationService
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    confirmationService = TestBed.inject(ConfirmationService);
    fixture = TestBed.createComponent(QueryTemplateComponent);
    component = fixture.componentInstance;
    
    // Override selectors
    store.overrideSelector(QueryBuilderSelectors.selectAllTemplates, mockTemplates);
    store.overrideSelector(QueryBuilderSelectors.selectPublicTemplates, [mockTemplates[0]]);
    store.overrideSelector(QueryBuilderSelectors.selectPrivateTemplates, [mockTemplates[1]]);
    store.overrideSelector(QueryBuilderSelectors.selectTemplatesLoading, false);
    store.overrideSelector(QueryBuilderSelectors.selectTemplateCreating, false);
    store.overrideSelector(QueryBuilderSelectors.selectTemplateDeleting, false);
    store.overrideSelector(QueryBuilderSelectors.selectTemplateExecuting, false);
    store.overrideSelector(QueryBuilderSelectors.selectSelectedTemplateDetail, null);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should dispatch loadTemplates on init', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.ngOnInit();
    expect(dispatchSpy).toHaveBeenCalledWith(QueryBuilderActions.loadTemplates());
  });

  it('should initialize create template form', () => {
    expect(component.createTemplateForm.get('name')).toBeTruthy();
    expect(component.createTemplateForm.get('description')).toBeTruthy();
    expect(component.createTemplateForm.get('dataSource')).toBeTruthy();
    expect(component.createTemplateForm.get('sqlTemplate')).toBeTruthy();
    expect(component.createTemplateForm.get('isPublic')).toBeTruthy();
  });

  it('should open create dialog', () => {
    component.openCreateDialog();
    expect(component.showCreateDialog).toBe(true);
  });

  it('should close create dialog', () => {
    component.showCreateDialog = true;
    component.closeCreateDialog();
    expect(component.showCreateDialog).toBe(false);
  });

  it('should create template when form is valid', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    
    component.createTemplateForm.patchValue({
      name: 'New Template',
      description: 'Test description',
      dataSource: 'test-source',
      sqlTemplate: 'SELECT * FROM test',
      isPublic: true
    });

    component.createTemplate();

    const dispatchedAction = (dispatchSpy as jasmine.Spy).calls.mostRecent().args[0];
    expect(dispatchedAction.type).toBe(QueryBuilderActions.createTemplate.type);
    expect(dispatchedAction.request.name).toBe('New Template');
    expect(dispatchedAction.request.dataSource).toBe('test-source');
    expect(dispatchedAction.request.isPublic).toBe(true);
  });

  it('should not create template when form is invalid', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.createTemplateForm.patchValue({ name: '' });
    component.createTemplate();
    expect(dispatchSpy).not.toHaveBeenCalledWith(
      jasmine.objectContaining({ type: '[Query Builder] Create Template' })
    );
  });

  it('should open execute dialog', () => {
    component.openExecuteDialog(mockTemplates[0]);
    expect(component.showExecuteDialog).toBe(true);
    expect(component.selectedTemplate).toEqual(mockTemplates[0]);
  });

  it('should close execute dialog', () => {
    component.showExecuteDialog = true;
    component.selectedTemplate = mockTemplates[0];
    component.closeExecuteDialog();
    expect(component.showExecuteDialog).toBe(false);
    expect(component.selectedTemplate).toBeNull();
  });

  it('should build execute form with parameters', () => {
    component.buildExecuteForm(mockTemplates[1]);
    expect(component.executeTemplateForm.get('userId')).toBeTruthy();
  });

  it('should build execute form without parameters', () => {
    component.buildExecuteForm(mockTemplates[0]);
    expect(Object.keys(component.executeTemplateForm.controls).length).toBe(0);
  });

  it('should execute template when form is valid', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    
    component.selectedTemplate = mockTemplates[1];
    component.buildExecuteForm(mockTemplates[1]);
    component.executeTemplateForm.patchValue({ userId: 123 });

    component.executeTemplate();

    expect(dispatchSpy).toHaveBeenCalledWith(
      QueryBuilderActions.executeTemplate({
        templateId: 'template2',
        request: { parameters: { userId: 123 } }
      })
    );
  });

  it('should not execute template when form is invalid', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    
    component.selectedTemplate = mockTemplates[1];
    component.buildExecuteForm(mockTemplates[1]);
    component.executeTemplateForm.patchValue({ userId: null });

    component.executeTemplate();

    expect(dispatchSpy).not.toHaveBeenCalledWith(
      jasmine.objectContaining({ type: '[Query Builder] Execute Template' })
    );
  });

  it('should delete template with confirmation', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    spyOn(confirmationService, 'confirm').and.callFake((confirmation: any) => {
      if (confirmation.accept) {
        confirmation.accept();
      }
      return confirmationService;
    });

    component.deleteTemplate(mockTemplates[0]);

    expect(confirmationService.confirm).toHaveBeenCalled();
    expect(dispatchSpy).toHaveBeenCalledWith(
      QueryBuilderActions.deleteTemplate({ templateId: 'template1' })
    );
  });

  it('should select template', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    
    component.selectTemplate(mockTemplates[0]);

    expect(dispatchSpy).toHaveBeenCalledWith(
      QueryBuilderActions.selectTemplate({ templateId: 'template1' })
    );
    expect(dispatchSpy).toHaveBeenCalledWith(
      QueryBuilderActions.loadTemplateDetail({ templateId: 'template1' })
    );
  });

  it('should refresh templates', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.refreshTemplates();
    expect(dispatchSpy).toHaveBeenCalledWith(QueryBuilderActions.loadTemplates());
  });

  it('should get parameter input type', () => {
    const numberParam: TemplateParameter = { name: 'test', dataType: 'number', isRequired: false };
    const dateParam: TemplateParameter = { name: 'test', dataType: 'date', isRequired: false };
    const boolParam: TemplateParameter = { name: 'test', dataType: 'boolean', isRequired: false };
    const textParam: TemplateParameter = { name: 'test', dataType: 'string', isRequired: false };

    expect(component.getParameterInputType(numberParam)).toBe('number');
    expect(component.getParameterInputType(dateParam)).toBe('date');
    expect(component.getParameterInputType(boolParam)).toBe('checkbox');
    expect(component.getParameterInputType(textParam)).toBe('text');
  });

  it('should format date', () => {
    const date = new Date('2024-01-01');
    const formatted = component.formatDate(date);
    expect(formatted).toContain('2024');
  });

  it('should return dash for undefined date', () => {
    expect(component.formatDate(undefined)).toBe('-');
  });

  it('should get visibility tag severity', () => {
    expect(component.getVisibilityTagSeverity(true)).toBe('success');
    expect(component.getVisibilityTagSeverity(false)).toBe('info');
  });

  it('should get visibility tag label', () => {
    expect(component.getVisibilityTagLabel(true)).toBe('Public');
    expect(component.getVisibilityTagLabel(false)).toBe('Private');
  });
});
