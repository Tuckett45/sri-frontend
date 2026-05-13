/**
 * Query Results Component Unit Tests
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { QueryResultsComponent } from './query-results.component';
import * as QueryBuilderActions from '../../state/query-builder/query-builder.actions';
import * as QueryBuilderSelectors from '../../state/query-builder/query-builder.selectors';
import { QueryResult, ExportFormat } from '../../models/query-builder.model';

describe('QueryResultsComponent', () => {
  let component: QueryResultsComponent;
  let fixture: ComponentFixture<QueryResultsComponent>;
  let store: MockStore;

  const mockQueryResult: QueryResult = {
    columns: [
      { name: 'id', displayName: 'ID', dataType: 'number' },
      { name: 'title', displayName: 'Title', dataType: 'string' },
      { name: 'createdAt', displayName: 'Created At', dataType: 'date' }
    ],
    rows: [
      [1, 'Test 1', '2024-01-01T00:00:00Z'],
      [2, 'Test 2', '2024-01-02T00:00:00Z']
    ],
    totalRows: 2,
    executionTimeMs: 150,
    fromCache: false,
    timestamp: new Date()
  };

  const initialState = {
    queryBuilder: {
      dataSources: [],
      fields: [],
      selectedDataSource: 'ds1',
      currentQuery: null,
      queryResult: mockQueryResult,
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
      lastExecuted: Date.now(),
      lastTemplatesLoaded: null,
      ids: [],
      entities: {}
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QueryResultsComponent],
      providers: [
        provideMockStore({ initialState })
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(QueryResultsComponent);
    component = fixture.componentInstance;
    
    // Override selectors
    store.overrideSelector(QueryBuilderSelectors.selectQueryResult, mockQueryResult);
    store.overrideSelector(QueryBuilderSelectors.selectQueryExecuting, false);
    store.overrideSelector(QueryBuilderSelectors.selectExporting, false);
    store.overrideSelector(QueryBuilderSelectors.selectHasQueryResults, true);
    store.overrideSelector(QueryBuilderSelectors.selectQueryResultRowCount, 2);
    store.overrideSelector(QueryBuilderSelectors.selectResultsFromCache, false);
    store.overrideSelector(QueryBuilderSelectors.selectQueryExecutionTime, 150);
    store.overrideSelector(QueryBuilderSelectors.selectSelectedDataSource, 'ds1');

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize export menu items', () => {
    expect(component.exportMenuItems.length).toBe(3);
    expect(component.exportMenuItems[0].label).toBe('Export as CSV');
    expect(component.exportMenuItems[1].label).toBe('Export as JSON');
    expect(component.exportMenuItems[2].label).toBe('Export as Excel');
  });

  it('should convert query result to table data', () => {
    const tableData = component.getTableData(mockQueryResult);
    
    expect(tableData.length).toBe(2);
    expect(tableData[0]).toEqual({
      id: 1,
      title: 'Test 1',
      createdAt: '2024-01-01T00:00:00Z'
    });
    expect(tableData[1]).toEqual({
      id: 2,
      title: 'Test 2',
      createdAt: '2024-01-02T00:00:00Z'
    });
  });

  it('should return empty array when no result', () => {
    const tableData = component.getTableData(null);
    expect(tableData).toEqual([]);
  });

  it('should get table columns from query result', () => {
    const columns = component.getTableColumns(mockQueryResult);
    
    expect(columns.length).toBe(3);
    expect(columns[0]).toEqual({
      field: 'id',
      header: 'ID',
      dataType: 'number'
    });
  });

  it('should return empty array when no columns', () => {
    const columns = component.getTableColumns(null);
    expect(columns).toEqual([]);
  });

  it('should format cell values based on data type', () => {
    expect(component.formatCellValue(null, 'string')).toBe('-');
    expect(component.formatCellValue(undefined, 'string')).toBe('-');
    expect(component.formatCellValue(true, 'boolean')).toBe('Yes');
    expect(component.formatCellValue(false, 'boolean')).toBe('No');
    expect(component.formatCellValue(1000, 'number')).toBe('1,000');
    expect(component.formatCellValue('test', 'string')).toBe('test');
  });

  it('should format date values', () => {
    const dateValue = '2024-01-01T00:00:00Z';
    const formatted = component.formatCellValue(dateValue, 'date');
    expect(formatted).toContain('2024');
  });

  it('should dispatch export action with CSV format', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    
    component.exportResults(ExportFormat.CSV);

    const dispatchedAction = (dispatchSpy as jasmine.Spy).calls.mostRecent().args[0];
    expect(dispatchedAction.type).toBe(QueryBuilderActions.exportResults.type);
    expect(dispatchedAction.format).toBe(ExportFormat.CSV);
    expect(dispatchedAction.fileName).toContain('.csv');
  });

  it('should dispatch export action with JSON format', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    
    component.exportResults(ExportFormat.JSON);

    const dispatchedAction = (dispatchSpy as jasmine.Spy).calls.mostRecent().args[0];
    expect(dispatchedAction.type).toBe(QueryBuilderActions.exportResults.type);
    expect(dispatchedAction.format).toBe(ExportFormat.JSON);
    expect(dispatchedAction.fileName).toContain('.json');
  });

  it('should dispatch export action with Excel format', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    
    component.exportResults(ExportFormat.Excel);

    const dispatchedAction = (dispatchSpy as jasmine.Spy).calls.mostRecent().args[0];
    expect(dispatchedAction.type).toBe(QueryBuilderActions.exportResults.type);
    expect(dispatchedAction.format).toBe(ExportFormat.Excel);
    expect(dispatchedAction.fileName).toContain('.excel');
  });

  it('should not export when no results', () => {
    store.overrideSelector(QueryBuilderSelectors.selectQueryResult, null);
    store.refreshState();
    
    const dispatchSpy = spyOn(store, 'dispatch');
    component.exportResults(ExportFormat.CSV);

    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('should clear results', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    
    component.clearResults();

    expect(dispatchSpy).toHaveBeenCalledWith(QueryBuilderActions.clearQueryResult());
  });

  it('should generate file name with timestamp', () => {
    const fileName = (component as any).generateFileName(ExportFormat.CSV, 'deployments');
    
    expect(fileName).toContain('deployments_results_');
    expect(fileName).toContain('.csv');
  });

  it('should use default name when no data source', () => {
    const fileName = (component as any).generateFileName(ExportFormat.JSON, null);
    
    expect(fileName).toContain('query_results_');
    expect(fileName).toContain('.json');
  });
});
