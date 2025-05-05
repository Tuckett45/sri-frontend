import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OverviewComponent } from './components/overview/overview.component';
import { UserProfileComponent } from './components/user-profile/user-profile.component';
import { LoginComponent } from './components/login/login.component';
import { AuthGuard } from 'src/auth.guard';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { StreetSheetComponent } from './components/street-sheet/street-sheet.component';
import { TpsComponent } from './components/tps/tps-home-page.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'reset-password', component: ResetPasswordComponent, canActivate: [AuthGuard] },
  { path: 'overview', component: OverviewComponent, canActivate: [AuthGuard] },
  { path: 'street-sheet', component: StreetSheetComponent, canActivate: [AuthGuard] },
  { path: 'profile', component: UserProfileComponent, canActivate: [AuthGuard] },
  { path: 'tps', component: TpsComponent, canActivate: [AuthGuard] },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'preliminary-punch-list', loadChildren: () => import('./components/preliminary-punch-list/preliminary-punch-list.module').then(m => m.PreliminaryPunchListModule), canActivate: [AuthGuard] },
  { path: '**', redirectTo: '/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],  // Only in the root module
  exports: [RouterModule]
})
export class AppRoutingModule { }
