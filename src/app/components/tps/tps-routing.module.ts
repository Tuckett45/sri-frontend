import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TpsComponent } from './tps.component';

const routes: Routes = [{ path: '', component: TpsComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TpsRoutingModule {}
