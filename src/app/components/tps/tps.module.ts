import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TpsRoutingModule } from './tps-routing.module';
import { TpsComponent } from './tps.component';
import { SummaryComponent } from './summary/summary.component';
import { ViolationsComponent } from './violations/violations.component';
import { CityScorecardComponent } from './city-scorecard/city-scorecard.component';
import { TabsModule } from 'primeng/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { ChartModule } from 'primeng/chart';
import { DividerModule } from "primeng/divider";
import { MatSortModule } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BudgetTrackerComponent } from './budget-tracker/budget-tracker.component';
import { MatPaginator } from '@angular/material/paginator';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { ChipModule } from 'primeng/chip';
import { RippleModule } from 'primeng/ripple';
import { MatSelectModule } from '@angular/material/select';

@NgModule({
  declarations: [
    TpsComponent,
    SummaryComponent,
    ViolationsComponent,
    CityScorecardComponent,
    BudgetTrackerComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TpsRoutingModule,
    TabsModule,
    MatTableModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDatepickerModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatPaginator,
    DropdownModule,
    CalendarModule,
    ChipModule,
    RippleModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ChartModule,
    DividerModule
  ]
})
export class TpsModule {}
