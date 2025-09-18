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
import { MatNativeDateModule, MatOptgroup, MatOption } from '@angular/material/core';
import { ChartModule } from 'primeng/chart';
import { DividerModule } from 'primeng/divider';
import { MatSortModule } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BudgetTrackerComponent } from './budget-tracker/budget-tracker.component';
import { MetricsComponent } from './metrics/metrics.component';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatExpansionModule } from '@angular/material/expansion';
import { ChipModule } from 'primeng/chip';
import { RippleModule } from 'primeng/ripple';
import { MatSelectModule } from '@angular/material/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { CalendarModule } from 'primeng/calendar';
import { ButtonModule } from 'primeng/button';
import { AccordionModule } from 'primeng/accordion';
// Ensure Chart.js registerables are available when this lazy module loads
import '../../../charts-setup';

@NgModule({
  declarations: [
    TpsComponent,
    SummaryComponent,
    ViolationsComponent,
    CityScorecardComponent,
    BudgetTrackerComponent,
    MetricsComponent
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
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatPaginatorModule,
    MatExpansionModule,
    ChipModule,
    RippleModule,
    MatInputModule,
    MatSelectModule,
    MultiSelectModule,
    CalendarModule,
    ButtonModule,
    AccordionModule,
    ChartModule,
    DividerModule,
    MatOptgroup,
    MatOption
]
})
export class TpsModule {}
