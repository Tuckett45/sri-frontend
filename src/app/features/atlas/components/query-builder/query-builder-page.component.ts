/**
 * Query Builder Page Component
 * 
 * Main page component that combines QueryBuilderComponent, QueryResultsComponent,
 * and QueryTemplateComponent into a cohesive query building interface.
 * 
 * Requirements: 3.11
 */

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TabViewModule } from 'primeng/tabview';

// Import query builder components
import { QueryBuilderComponent } from './query-builder.component';
import { QueryResultsComponent } from './query-results.component';
import { QueryTemplateComponent } from './query-template.component';

@Component({
  selector: 'app-query-builder-page',
  standalone: true,
  imports: [
    CommonModule,
    TabViewModule,
    QueryBuilderComponent,
    QueryResultsComponent,
    QueryTemplateComponent
  ],
  templateUrl: './query-builder-page.component.html',
  styleUrls: ['./query-builder-page.component.scss']
})
export class QueryBuilderPageComponent {
  // Component logic can be added here if needed
}
