import { Routes } from '@angular/router';
import { DeploymentDashboardComponent } from './components/deployment-dashboard/deployment-dashboard.component';
import { DeploymentDetailComponent } from './components/deployment-detail/deployment-detail.component';
import { PhaseWorkspaceComponent } from './components/phase-workspace/phase-workspace.component';
import { HandoffComponent } from './components/handoff/handoff.component';
import { phaseGuard } from './services/phase-guard.service';

export const DEPLOYMENT_ROUTES: Routes = [
  { path: '', component: DeploymentDashboardComponent },
  { path: ':id', component: DeploymentDetailComponent },
  {
    path: ':id/phase/:phase',
    component: PhaseWorkspaceComponent,
    canActivate: [phaseGuard],
  },
  {
    path: ':id/handoff',
    component: HandoffComponent,
    canActivate: [phaseGuard],
  },
];
