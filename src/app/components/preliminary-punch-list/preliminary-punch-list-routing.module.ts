import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PreliminaryPunchListComponent } from './preliminary-punch-list.component';

const routes: Routes = [
  {
    path: '',
    component: PreliminaryPunchListComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PreliminaryPunchListRoutingModule { }
