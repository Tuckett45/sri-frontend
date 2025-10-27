import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DEPLOYMENT_ROUTES } from './deployment.routes';

@NgModule({
  imports: [RouterModule.forChild(DEPLOYMENT_ROUTES)],
})
export class DeploymentModule {}
