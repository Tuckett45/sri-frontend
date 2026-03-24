import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { IncidentReportsComponent } from './incident-reports/incident-reports.component';
import { DirectDepositComponent } from './direct-deposit/direct-deposit.component';
import { W4Component } from './w4/w4.component';
import { ContactInfoComponent } from './contact-info/contact-info.component';
import { PrcComponent } from './prc/prc.component';
import { PayStubsComponent } from './pay-stubs/pay-stubs.component';
import { W2Component } from './w2/w2.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'incident-reports',
    pathMatch: 'full'
  },
  {
    path: 'incident-reports',
    component: IncidentReportsComponent,
    data: { title: 'Incident Reports', breadcrumb: 'Incident Reports' }
  },
  {
    path: 'direct-deposit',
    component: DirectDepositComponent,
    data: { title: 'Direct Deposit', breadcrumb: 'Direct Deposit' }
  },
  {
    path: 'w4',
    component: W4Component,
    data: { title: 'W-4', breadcrumb: 'W-4' }
  },
  {
    path: 'contact-info',
    component: ContactInfoComponent,
    data: { title: 'Contact Info', breadcrumb: 'Contact Info' }
  },
  {
    path: 'prc',
    component: PrcComponent,
    data: { title: 'PRC Signing', breadcrumb: 'PRC' }
  },
  {
    path: 'pay-stubs',
    component: PayStubsComponent,
    data: { title: 'Pay Stubs', breadcrumb: 'Pay Stubs' }
  },
  {
    path: 'w2',
    component: W2Component,
    data: { title: 'W-2 Documents', breadcrumb: 'W-2' }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PayrollRoutingModule { }
