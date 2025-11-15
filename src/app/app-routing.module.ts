import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OverviewComponent } from './components/overview/overview.component';
import { UserProfileComponent } from './components/user-profile/user-profile.component';
import { LoginComponent } from './components/login/login.component';
import { AuthGuard } from 'src/auth.guard';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { StreetSheetComponent } from './components/street-sheet/street-sheet.component';
import { OspCoordinatorTrackerComponent } from './components/osp-coordinator-tracker/osp-coordinator-tracker.component';
import { MarketControllerComponent } from './components/market-controller/market-controller.component';
import { DeploymentListComponent } from './components/deployments/deployment-list/deployment-list.component';
import { UserNotificationsComponent } from './components/notifications/user-notifications.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'overview', component: OverviewComponent, canActivate: [AuthGuard] },
  { path: 'street-sheet', component: StreetSheetComponent, canActivate: [AuthGuard] },
  { path: 'profile', component: UserProfileComponent, canActivate: [AuthGuard] },
  { path: 'notifications', component: UserNotificationsComponent, canActivate: [AuthGuard] },
  { path: 'osp-coordinator-tracker', component: OspCoordinatorTrackerComponent, canActivate: [AuthGuard] },
  { path: 'market-controller-tracker', component: MarketControllerComponent, canActivate: [AuthGuard] },
  { path: 'my-deployments', component: DeploymentListComponent, canActivate: [AuthGuard] },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'preliminary-punch-list', loadChildren: () => import('./components/preliminary-punch-list/preliminary-punch-list.module').then(m => m.PreliminaryPunchListModule), canActivate: [AuthGuard] },
  { path: 'expenses', loadChildren: () => import('./components/expense/expense.module').then(m => m.ExpenseModule), canActivate: [AuthGuard] },
  { path: 'tps', loadChildren: () => import('./components/tps/tps.module').then(m => m.TpsModule), canActivate: [AuthGuard] },
  { path: 'deployments', loadChildren: () => import('./features/deployment/deployment.module').then(m => m.DeploymentModule), canActivate: [AuthGuard] },
  { path: '**', redirectTo: '/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],  // Only in the root module
  exports: [RouterModule]
})
export class AppRoutingModule { }
