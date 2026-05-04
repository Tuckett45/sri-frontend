/**
 * Query Builder Component Unit Tests
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { QueryBuilderComponent } from './query-builder.component';
import * as QueryBuilderActions from '../../state/query-builder/query-builder.actions';
import * as QueryBuilderSelectors from '../../state/query-builder/query-builder.selectors';
import { DataSourceInfo, FieldConfig } from '../../models/query-builder.model';

describe('QueryBuilderComponent', () => {
  let component: QueryBuilderComponent;
  let fixture: ComponentFixture<QueryBuilderComponent>;
  let store: MockStore;

  const mockDataSources: DataSourceInfo[] = [
    {
      id: 'ds1',
      name: 'Deployments',
      description: 'Deployment data',
      fieldCount: 10,
      maxRowsTotal: 10000
    }
  ];

  const mockFields: FieldConfig[] = [
    {
      name: 'title',
      displayName: 'Title',
      dataType: 'string',
      allowedOperators: ['eq', 'contains'],
      isFilterable: true,
      isSortable: true
    },
    {
      name: 'createdAt',
      displayName: 'Created At',
      dataType: 'date',
      allowedOperators: ['eq', 'gt', 'lt'],
      isFilterable: true,
      isSortable: true
    }
  ];

  const initialState = {
    queryBuilder: {
      dataSources: mockDataSources,
      fields: mockFields,
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
      ids: [],
      entities: {}
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QueryBuilderComponent, ReactiveFormsModule],
      providers: [
        provideMockStore({ initialState })
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(QueryBuilderComponent);
    component = fixture.componentInstance;
    
    // Override selectors
    store.overrideSelector(QueryBuilderSelectors.selectDataSources, mockDataSources);
    store.overrideSelector(QueryBuilderSelectors.selectFields, mockFields);
    store.overrideSelector(QueryBuilderSelectors.selectFilterableFields, mockFields.filter(f => f.isFilterable));
    store.overrideSelector(QueryBuilderSelectors.selectSortableFields, mockFields.filter(f => f.isSortable));
    store.overrideSelector(QueryBuilderSelectors.selectDataSourcesLoading, false);
    store.overrideSelector(QueryBuilderSelectors.selectFieldsLoading, false);
    store.overrideSelector(QueryBuilderSelectors.selectQueryExecuting, false);
    store.overrideSelector(QueryBuilderSelectors.selectSelectedDataSource, null);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    expect(component.queryForm.get('dataSource')?.value).toBeNull();
    expect(component.queryForm.get('logicalOperator')?.value).toBe('AND');
    expect(component.queryForm.get('limit')?.value).toBe(100);
    expect(component.filters.length).toBe(1);
    expect(component.sortBy.length).toBe(0);
  });

  it('should dispatch loadDataSources on init', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.ngOnInit();
    expect(dispatchSpy).toHaveBeenCalledWith(QueryBuilderActions.loadDataSources());
  });

  it('should add filter', () => {
    const initialLength = component.filters.length;
    component.addFilter();
    expect(component.filters.length).toBe(initialLength + 1);
  });

  it('should remove filter', () => {
    component.addFilter();
    component.addFilter();
    const initialLength = component.filters.length;
    component.removeFilter(1);
    expect(component.filters.length).toBe(initialLength - 1);
  });

  it('should not remove last filter', () => {
    while (component.filters.length > 1) {
      component.removeFilter(0);
    }
    component.removeFilter(0);
    expect(component.filters.length).toBe(1);
  });

  it('should add sort', () => {
    const initialLength = component.sortBy.length;
    component.addSort();
    expect(component.sortBy.length).toBe(initialLength + 1);
  });

  it('should remove sort', () => {
    component.addSort();
    component.addSort();
    const initialLength = component.sortBy.length;
    component.removeSort(0);
    expect(component.sortBy.length).toBe(initialLength - 1);
  });

  it('should clear filters', () => {
    component.addFilter();
    component.addFilter();
    component.clearFilters();
    expect(component.filters.length).toBe(1);
  });

  it('should clear sorts', () => {
    component.addSort();
    component.addSort();
    component.clearSorts();
    expect(component.sortBy.length).toBe(0);
  });

  it('should execute query when form is valid', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    
    component.queryForm.patchValue({
      dataSource: 'ds1',
      logicalOperator: 'AND',
      limit: 100
    });

    component.filters.at(0).patchValue({
      field: 'title',
      operator: 'eq',
      value: 'test',
      dataType: 'string'
    });

    component.executeQuery();

    const dispatchedAction = (dispatchSpy as jasmine.Spy).calls.mostRecent().args[0];
    expect(dispatchedAction.type).toBe(QueryBuilderActions.executeQuery.type);
    expect(dispatchedAction.query.dataSource).toBe('ds1');
    expect(dispatchedAction.query.logicalOperator).toBe('AND');
    expect(dispatchedAction.query.limit).toBe(100);
  });

  it('should not execute query when form is invalid', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.queryForm.patchValue({ dataSource: null });
    component.executeQuery();
    expect(dispatchSpy).not.toHaveBeenCalledWith(
      jasmine.objectContaining({ type: '[Query Builder] Execute Query' })
    );
  });

  it('should clear query', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    
    component.queryForm.patchValue({
      dataSource: 'ds1',
      limit: 500
    });
    component.addFilter();
    component.addSort();

    component.clearQuery();

    expect(component.queryForm.get('dataSource')?.value).toBeNull();
    expect(component.queryForm.get('limit')?.value).toBe(100);
    expect(component.filters.length).toBe(1);
    expect(component.sortBy.length).toBe(0);
    expect(dispatchSpy).toHaveBeenCalledWith(QueryBuilderActions.clearQueryResult());
  });

  it('should update field data type on field selection', () => {
    const mockField: FieldConfig = {
      name: 'title',
      displayName: 'Title',
      dataType: 'string',
      allowedOperators: ['eq'],
      isFilterable: true,
      isSortable: true
    };

    component.onFieldSelected(0, mockField);

    expect(component.filters.at(0).get('dataType')?.value).toBe('string');
  });

  it('should get allowed operators for field', () => {
    const mockField: FieldConfig = {
      name: 'title',
      displayName: 'Title',
      dataType: 'string',
      allowedOperators: ['eq', 'contains'],
      isFilterable: true,
      isSortable: true
    };

    const operators = component.getAllowedOperators(mockField);
    expect(operators.length).toBe(2);
    expect(operators.map(o => o.value)).toEqual(['eq', 'contains']);
  });

  it('should return all operators when field has no restrictions', () => {
    const mockField: FieldConfig = {
      name: 'title',
      displayName: 'Title',
      dataType: 'string',
      allowedOperators: [],
      isFilterable: true,
      isSortable: true
    };

    const operators = component.getAllowedOperators(mockField);
    expect(operators.length).toBe(component.operatorOptions.length);
  });

  it('should check if operator requires value', () => {
    expect(component.operatorRequiresValue('eq')).toBe(true);
    expect(component.operatorRequiresValue('isNull')).toBe(false);
    expect(component.operatorRequiresValue('isNotNull')).toBe(false);
  });

  it('should dispatch actions when data source changes', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    
    component.queryForm.get('dataSource')?.setValue('ds1');

    expect(dispatchSpy).toHaveBeenCalledWith(
      QueryBuilderActions.selectDataSource({ dataSourceId: 'ds1' })
    );
    expect(dispatchSpy).toHaveBeenCalledWith(
      QueryBuilderActions.loadFields({ dataSourceId: 'ds1' })
    );
  });
});
