/**
 * Query Builder Component
 * 
 * Dynamic query builder UI with field selection, operator selection, value input,
 * filter groups with logical operators, and sort criteria configuration.
 * 
 * Requirements: 7.1, 7.2, 7.5
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// PrimeNG imports
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

// Models
import {
  DataSourceInfo,
  FieldConfig,
  UserQuery,
  FilterSelection,
  SortCriteria
} from '../../models/query-builder.model';

// State
import * as QueryBuilderActions from '../../state/query-builder/query-builder.actions';
import * as QueryBuilderSelectors from '../../state/query-builder/query-builder.selectors';

@Component({
  selector: 'app-query-builder',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DropdownModule,
    InputTextModule,
    ButtonModule,
    CardModule,
    DividerModule,
    TooltipModule,
    ProgressSpinnerModule
  ],
  templateUrl: './query-builder.component.html',
  styleUrls: ['./query-builder.component.scss']
})
export class QueryBuilderComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Observables
  dataSources$: Observable<DataSourceInfo[]>;
  fields$: Observable<FieldConfig[]>;
  filterableFields$: Observable<FieldConfig[]>;
  sortableFields$: Observable<FieldConfig[]>;
  dataSourcesLoading$: Observable<boolean>;
  fieldsLoading$: Observable<boolean>;
  executing$: Observable<boolean>;
  selectedDataSource$: Observable<string | null>;

  // Form
  queryForm: FormGroup;

  // Operator options
  operatorOptions = [
    { label: 'Equals', value: 'eq' },
    { label: 'Not Equals', value: 'ne' },
    { label: 'Greater Than', value: 'gt' },
    { label: 'Greater Than or Equal', value: 'gte' },
    { label: 'Less Than', value: 'lt' },
    { label: 'Less Than or Equal', value: 'lte' },
    { label: 'Contains', value: 'contains' },
    { label: 'Starts With', value: 'startsWith' },
    { label: 'Ends With', value: 'endsWith' },
    { label: 'In', value: 'in' },
    { label: 'Not In', value: 'notIn' },
    { label: 'Is Null', value: 'isNull' },
    { label: 'Is Not Null', value: 'isNotNull' }
  ];

  // Logical operator options
  logicalOperatorOptions = [
    { label: 'AND', value: 'AND' },
    { label: 'OR', value: 'OR' }
  ];

  // Sort direction options
  sortDirectionOptions = [
    { label: 'Ascending', value: 'ASC' },
    { label: 'Descending', value: 'DESC' }
  ];

  constructor(
    private fb: FormBuilder,
    private store: Store
  ) {
    // Initialize observables
    this.dataSources$ = this.store.select(QueryBuilderSelectors.selectDataSources);
    this.fields$ = this.store.select(QueryBuilderSelectors.selectFields);
    this.filterableFields$ = this.store.select(QueryBuilderSelectors.selectFilterableFields);
    this.sortableFields$ = this.store.select(QueryBuilderSelectors.selectSortableFields);
    this.dataSourcesLoading$ = this.store.select(QueryBuilderSelectors.selectDataSourcesLoading);
    this.fieldsLoading$ = this.store.select(QueryBuilderSelectors.selectFieldsLoading);
    this.executing$ = this.store.select(QueryBuilderSelectors.selectQueryExecuting);
    this.selectedDataSource$ = this.store.select(QueryBuilderSelectors.selectSelectedDataSource);

    // Initialize form
    this.queryForm = this.fb.group({
      dataSource: [null, Validators.required],
      logicalOperator: ['AND'],
      filters: this.fb.array([]),
      sortBy: this.fb.array([]),
      limit: [100, [Validators.min(1), Validators.max(10000)]]
    });
  }

  ngOnInit(): void {
    // Load data sources
    this.store.dispatch(QueryBuilderActions.loadDataSources());

    // Watch for data source changes
    this.queryForm.get('dataSource')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(dataSourceId => {
        if (dataSourceId) {
          this.store.dispatch(QueryBuilderActions.selectDataSource({ dataSourceId }));
          this.store.dispatch(QueryBuilderActions.loadFields({ dataSourceId }));
          // Clear filters and sorts when data source changes
          this.clearFilters();
          this.clearSorts();
        }
      });

    // Add initial filter
    this.addFilter();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Filter Management
   */

  get filters(): FormArray {
    return this.queryForm.get('filters') as FormArray;
  }

  addFilter(): void {
    const filterGroup = this.fb.group({
      field: [null, Validators.required],
      operator: [null, Validators.required],
      value: [null],
      dataType: [null]
    });

    this.filters.push(filterGroup);
  }

  removeFilter(index: number): void {
    this.filters.removeAt(index);
    
    // Ensure at least one filter exists
    if (this.filters.length === 0) {
      this.addFilter();
    }
  }

  clearFilters(): void {
    while (this.filters.length > 0) {
      this.filters.removeAt(0);
    }
    this.addFilter();
  }

  /**
   * Sort Management
   */

  get sortBy(): FormArray {
    return this.queryForm.get('sortBy') as FormArray;
  }

  addSort(): void {
    const sortGroup = this.fb.group({
      field: [null, Validators.required],
      direction: ['ASC', Validators.required]
    });

    this.sortBy.push(sortGroup);
  }

  removeSort(index: number): void {
    this.sortBy.removeAt(index);
  }

  clearSorts(): void {
    while (this.sortBy.length > 0) {
      this.sortBy.removeAt(0);
    }
  }

  /**
   * Query Execution
   */

  executeQuery(): void {
    if (this.queryForm.invalid) {
      this.queryForm.markAllAsTouched();
      return;
    }

    const formValue = this.queryForm.value;

    // Build filters array
    const filters: FilterSelection[] = formValue.filters
      .filter((f: any) => f.field && f.operator)
      .map((f: any) => ({
        field: f.field,
        operator: f.operator,
        value: f.value,
        dataType: f.dataType
      }));

    // Build sort criteria array
    const sortBy: SortCriteria[] = formValue.sortBy
      .filter((s: any) => s.field)
      .map((s: any) => ({
        field: s.field,
        direction: s.direction
      }));

    // Build query
    const query: UserQuery = {
      dataSource: formValue.dataSource,
      filters,
      logicalOperator: formValue.logicalOperator,
      sortBy,
      limit: formValue.limit
    };

    // Dispatch execute action
    this.store.dispatch(QueryBuilderActions.executeQuery({ query }));
  }

  clearQuery(): void {
    this.queryForm.reset({
      dataSource: null,
      logicalOperator: 'AND',
      limit: 100
    });
    this.clearFilters();
    this.clearSorts();
    this.store.dispatch(QueryBuilderActions.clearQueryResult());
  }

  /**
   * Field Selection Handler
   */

  onFieldSelected(index: number, field: FieldConfig): void {
    const filterGroup = this.filters.at(index) as FormGroup;
    filterGroup.patchValue({
      dataType: field.dataType,
      operator: null,
      value: null
    });
  }

  /**
   * Get allowed operators for a field
   */

  getAllowedOperators(field: FieldConfig | null): any[] {
    if (!field || !field.allowedOperators || field.allowedOperators.length === 0) {
      return this.operatorOptions;
    }

    return this.operatorOptions.filter(op => 
      field.allowedOperators!.includes(op.value)
    );
  }

  /**
   * Check if operator requires value input
   */

  operatorRequiresValue(operator: string): boolean {
    return operator !== 'isNull' && operator !== 'isNotNull';
  }
}
