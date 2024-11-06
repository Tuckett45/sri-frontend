import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OverviewComponent } from './components/overview/overview.component';
import { PreliminaryPunchListComponent } from './components/preliminary-punch-list/preliminary-punch-list.component';
import { UserProfileComponent } from './components/user-profile/user-profile.component';
import { LoginComponent } from './components/login/login.component';
import { AuthGuard } from 'src/auth.guard';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { StreetSheetComponent } from './components/street-sheet/street-sheet.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'overview', component: OverviewComponent, canActivate: [AuthGuard] },
  { path: 'preliminary-punch-list', component: PreliminaryPunchListComponent, canActivate: [AuthGuard] },
  { path: 'street-sheet', component: StreetSheetComponent, canActivate: [AuthGuard] },
  { path: 'profile', component: UserProfileComponent, canActivate: [AuthGuard] },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }