import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RoleGuard } from 'src/role.guard';
import { UserRole } from '../../models/role.enum';

import { ConstructionContainerComponent } from './construction-container.component';
import { ForecastDashboardComponent } from './components/forecast-dashboard/forecast-dashboard.component';
import { ProjectCreateComponent } from './components/project-create/project-create.component';
import { ProjectDetailComponent } from './components/project-detail/project-detail.component';
import { ProjectEditComponent } from './components/project-edit/project-edit.component';
import { IssueListComponent } from './components/issue-list/issue-list.component';
import { IssueCreateComponent } from './components/issue-create/issue-create.component';
import { IssueDetailComponent } from './components/issue-detail/issue-detail.component';

const routes: Routes = [
  {
    path: '',
    component: ConstructionContainerComponent,
    children: [
      { path: '', redirectTo: 'forecast', pathMatch: 'full' },
      { path: 'forecast', component: ForecastDashboardComponent },
      {
        path: 'projects/create',
        component: ProjectCreateComponent,
        canActivate: [RoleGuard],
        data: { expectedRoles: [UserRole.Admin] }
      },
      { path: 'projects/:projectId', component: ProjectDetailComponent },
      {
        path: 'projects/:projectId/edit',
        component: ProjectEditComponent,
        canActivate: [RoleGuard],
        data: { expectedRoles: [UserRole.Admin] }
      },
      { path: 'issues', component: IssueListComponent },
      {
        path: 'issues/create',
        component: IssueCreateComponent,
        canActivate: [RoleGuard],
        data: { expectedRoles: [UserRole.Admin] }
      },
      { path: 'issues/:issueId', component: IssueDetailComponent },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ConstructionIntegrationRoutingModule {}
