import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ExpenseRoutingModule } from './expense-routing.module';
import { ExpenseComponent } from './expense.component';
import { HrExpensesPageComponent } from './hr-expenses-page/hr-expenses-page.component';
import { EmployeeExpensesPageComponent } from './employee-expenses-page/employee-expenses-page.component';
import { ExpenseFiltersComponent } from './shared/expense-filters/expense-filters.component';
import { ExpenseTableComponent } from './shared/expense-table/expense-table.component';
import { MileageDetailsComponent } from './shared/mileage-details/mileage-details.component';
import { CalendarModule } from 'primeng/calendar';
import { InputTextModule } from 'primeng/inputtext';
import { Textarea } from 'primeng/inputtextarea';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DropdownModule } from 'primeng/dropdown';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { GalleriaModule } from 'primeng/galleria';
import { TabsModule } from 'primeng/tabs';
import { MatPaginator } from "@angular/material/paginator";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatLabel, MatFormField } from "@angular/material/form-field";

import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatMenuModule } from '@angular/material/menu';
import { Divider } from "primeng/divider";
import { MatTooltip } from "@angular/material/tooltip";

@NgModule({
  declarations: [
    ExpenseComponent, 
    HrExpensesPageComponent, 
    EmployeeExpensesPageComponent, 
    ExpenseFiltersComponent, 
    ExpenseTableComponent,
    MileageDetailsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ExpenseRoutingModule,
    CalendarModule,
    InputTextModule,
    Textarea,
    TableModule,
    ButtonModule,
    TagModule,
    DropdownModule,
    TabsModule,
    GalleriaModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    MatPaginator,
    MatAutocompleteModule,
    MatLabel,
    MatFormField,
    MatSortModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  MatTableModule,
  MatProgressSpinnerModule,
  MatMenuModule,
  Divider,
  MatTooltip
]
})
export class ExpenseModule {}
