/**
 * Query Builder Page Component Unit Tests
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { QueryBuilderPageComponent } from './query-builder-page.component';

describe('QueryBuilderPageComponent', () => {
  let component: QueryBuilderPageComponent;
  let fixture: ComponentFixture<QueryBuilderPageComponent>;

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
      ids: [],
      entities: {}
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QueryBuilderPageComponent],
      providers: [
        provideMockStore({ initialState })
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(QueryBuilderPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render page header', () => {
    const compiled = fixture.nativeElement;
    const header = compiled.querySelector('.page-header');
    expect(header).toBeTruthy();
  });

  it('should render page title', () => {
    const compiled = fixture.nativeElement;
    const title = compiled.querySelector('.page-title');
    expect(title?.textContent).toContain('Query Builder');
  });

  it('should render all three child components', () => {
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('app-query-builder')).toBeTruthy();
    expect(compiled.querySelector('app-query-results')).toBeTruthy();
    expect(compiled.querySelector('app-query-template')).toBeTruthy();
  });
});
