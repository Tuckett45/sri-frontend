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

@NgModule({
  declarations: [
    TpsComponent,
    SummaryComponent,
    ViolationsComponent,
    CityScorecardComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TpsRoutingModule,
    TabsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    ChartModule,
    DividerModule
  ]
})
export class TpsModule {}
