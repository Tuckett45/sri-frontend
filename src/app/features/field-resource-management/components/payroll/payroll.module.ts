import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { PayrollRoutingModule } from './payroll-routing.module';

import { IncidentReportsComponent } from './incident-reports/incident-reports.component';
import { DirectDepositComponent } from './direct-deposit/direct-deposit.component';
import { W4Component } from './w4/w4.component';
import { ContactInfoComponent } from './contact-info/contact-info.component';
import { PrcComponent } from './prc/prc.component';
import { PayStubsComponent } from './pay-stubs/pay-stubs.component';
import { W2Component } from './w2/w2.component';

@NgModule({
  declarations: [
    IncidentReportsComponent,
    DirectDepositComponent,
    W4Component,
    ContactInfoComponent,
    PrcComponent,
    PayStubsComponent,
    W2Component
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    PayrollRoutingModule
  ]
})
export class PayrollModule { }
