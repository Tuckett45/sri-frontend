import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { TimeCardRoutingModule } from './timecard-routing.module';

// Material imports
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';

// PrimeNG imports
import { CalendarModule } from 'primeng/calendar';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { ChipModule } from 'primeng/chip';

// Components
import { TimeCardComponent } from './timecard.component';
import { HrTimeCardsPageComponent } from './hr-timecards-page/hr-timecards-page.component';
import { EmployeeTimeCardsPageComponent } from './employee-timecards-page/employee-timecards-page.component';
import { TimeCardDashboardComponent } from './timecard-dashboard/timecard-dashboard.component';

// Shared Components
import { TimeCardFiltersComponent } from './shared/timecard-filters/timecard-filters.component';
import { TimeCardTableComponent } from './shared/timecard-table/timecard-table.component';
import { TimeCardEntryFormComponent } from './shared/timecard-entry-form/timecard-entry-form.component';
import { TimeCardSummaryComponent } from './shared/timecard-summary/timecard-summary.component';

@NgModule({
  declarations: [
    TimeCardComponent,
    HrTimeCardsPageComponent,
    EmployeeTimeCardsPageComponent,
    TimeCardDashboardComponent,
    TimeCardFiltersComponent,
    TimeCardTableComponent,
    TimeCardEntryFormComponent,
    TimeCardSummaryComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    TimeCardRoutingModule,
    // Material
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDialogModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatCardModule,
    // PrimeNG
    CalendarModule,
    TableModule,
    ButtonModule,
    DropdownModule,
    InputTextModule,
    MultiSelectModule,
    ChipModule
  ]
})
export class TimeCardModule { }

