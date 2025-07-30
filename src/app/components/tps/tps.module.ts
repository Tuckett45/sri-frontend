import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TpsRoutingModule } from './tps-routing.module';
import { TpsComponent } from './tps.component';
import { SummaryComponent } from './summary/summary.component';
import { ViolationsComponent } from './violations/violations.component';
import { CityScorecardComponent } from './city-scorecard/city-scorecard.component';
import { TabsModule } from 'primeng/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

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
    TpsRoutingModule,
    TabsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule
  ]
})
export class TpsModule {}
