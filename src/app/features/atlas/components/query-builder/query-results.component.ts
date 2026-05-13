/**
 * Query Results Component
 * 
 * Display query results in table with virtual scrolling and export functionality.
 * 
 * Requirements: 7.1, 7.2, 11.6
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// PrimeNG imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

// Models
import { QueryResult, ExportFormat } from '../../models/query-builder.model';

// State
import * as QueryBuilderActions from '../../state/query-builder/query-builder.actions';
import * as QueryBuilderSelectors from '../../state/query-builder/query-builder.selectors';

@Component({
  selector: 'app-query-results',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    CardModule,
    TooltipModule,
    ProgressSpinnerModule,
    MenuModule
  ],
  templateUrl: './query-results.component.html',
  styleUrls: ['./query-results.component.scss']
})
export class QueryResultsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Observables
  queryResult$: Observable<QueryResult | null>;
  executing$: Observable<boolean>;
  exporting$: Observable<boolean>;
  hasResults$: Observable<boolean>;
  resultRowCount$: Observable<number>;
  resultsFromCache$: Observable<boolean>;
  executionTime$: Observable<number>;
  selectedDataSource$: Observable<string | null>;

  // Export menu items
  exportMenuItems: MenuItem[] = [];

  // Virtual scroll settings
  virtualScrollItemSize = 40;
  scrollHeight = '500px';

  constructor(private store: Store) {
    // Initialize observables
    this.queryResult$ = this.store.select(QueryBuilderSelectors.selectQueryResult);
    this.executing$ = this.store.select(QueryBuilderSelectors.selectQueryExecuting);
    this.exporting$ = this.store.select(QueryBuilderSelectors.selectExporting);
    this.hasResults$ = this.store.select(QueryBuilderSelectors.selectHasQueryResults);
    this.resultRowCount$ = this.store.select(QueryBuilderSelectors.selectQueryResultRowCount);
    this.resultsFromCache$ = this.store.select(QueryBuilderSelectors.selectResultsFromCache);
    this.executionTime$ = this.store.select(QueryBuilderSelectors.selectQueryExecutionTime);
    this.selectedDataSource$ = this.store.select(QueryBuilderSelectors.selectSelectedDataSource);

    // Initialize export menu
    this.exportMenuItems = [
      {
        label: 'Export as CSV',
        icon: 'pi pi-file',
        command: () => this.exportResults(ExportFormat.CSV)
      },
      {
        label: 'Export as JSON',
        icon: 'pi pi-file-o',
        command: () => this.exportResults(ExportFormat.JSON)
      },
      {
        label: 'Export as Excel',
        icon: 'pi pi-file-excel',
        command: () => this.exportResults(ExportFormat.Excel)
      }
    ];
  }

  ngOnInit(): void {
    // Component initialization
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Export results in specified format
   */
  exportResults(format: ExportFormat): void {
    let result: QueryResult | null = null;
    let dataSource: string | null = null;

    this.queryResult$.pipe(takeUntil(this.destroy$)).subscribe(r => result = r);
    this.selectedDataSource$.pipe(takeUntil(this.destroy$)).subscribe(ds => dataSource = ds);

    if (!result) {
      return;
    }

    const fileName = this.generateFileName(format, dataSource);

    this.store.dispatch(QueryBuilderActions.exportResults({
      result,
      format,
      dataSource: dataSource || undefined,
      fileName
    }));
  }

  /**
   * Generate file name for export
   */
  private generateFileName(format: ExportFormat, dataSource: string | null): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const source = dataSource || 'query';
    const extension = format.toLowerCase();
    return `${source}_results_${timestamp}.${extension}`;
  }

  /**
   * Get table data from query result
   */
  getTableData(result: QueryResult | null): any[] {
    if (!result || !result.rows || !result.columns) {
      return [];
    }

    // Convert rows array to objects with column names as keys
    return result.rows.map(row => {
      const obj: any = {};
      result.columns!.forEach((col, index) => {
        obj[col.name || `col_${index}`] = row[index];
      });
      return obj;
    });
  }

  /**
   * Get table columns from query result
   */
  getTableColumns(result: QueryResult | null): any[] {
    if (!result || !result.columns) {
      return [];
    }

    return result.columns.map(col => ({
      field: col.name,
      header: col.displayName || col.name,
      dataType: col.dataType
    }));
  }

  /**
   * Format cell value based on data type
   */
  formatCellValue(value: any, dataType?: string): string {
    if (value === null || value === undefined) {
      return '-';
    }

    switch (dataType?.toLowerCase()) {
      case 'date':
      case 'datetime':
        return new Date(value).toLocaleString();
      case 'boolean':
        return value ? 'Yes' : 'No';
      case 'number':
      case 'decimal':
        return typeof value === 'number' ? value.toLocaleString() : value;
      default:
        return String(value);
    }
  }

  /**
   * Clear results
   */
  clearResults(): void {
    this.store.dispatch(QueryBuilderActions.clearQueryResult());
  }
}
