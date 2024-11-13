import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';

import { AppComponent } from './app.component';

import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatDialogActions, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { MatPaginatorModule } from '@angular/material/paginator';

import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { ToastrModule } from 'ngx-toastr';

// import { SidebarComponent } from './components/sidebar/sidebar.component';
import { OverviewComponent } from './components/overview/overview.component';
import { WidgetComponent } from './components/widget/widget.component';
import { FilterComponent } from './components/filter/filter.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { ChartComponent } from './components/charts/chart.component';
import { TableComponent } from './components/table/table.component';
import { PreliminaryPunchListComponent } from './components/preliminary-punch-list/preliminary-punch-list.component';
import { PreliminaryPunchListModalComponent } from './components/modals/preliminary-punch-list-modal/preliminary-punch-list-modal.component';
import { UserProfileComponent } from './components/user-profile/user-profile.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterModalComponent } from './components/register-modal/register-modal.component';
import { UserProfileModalComponent } from './components/user-profile/user-profile-modal/user-profile-modal.component';
import { ForgotPasswordModalComponent } from './components/modals/forgot-password-modal/forgot-password-modal.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { DeleteConfirmationModalComponent } from './components/modals/delete-confirmation-modal/delete-confirmation-modal.component';



@NgModule({
  declarations: [
    AppComponent,
    ChartComponent,
    DeleteConfirmationModalComponent,
    FilterComponent,
    ForgotPasswordModalComponent,
    LoginComponent,
    RegisterModalComponent,
    ResetPasswordComponent,
    NavbarComponent,
    OverviewComponent,
    PreliminaryPunchListComponent,
    PreliminaryPunchListModalComponent,
    // SidebarComponent,
    TableComponent,
    UserProfileComponent,
    UserProfileModalComponent,
    WidgetComponent    
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    ToastrModule.forRoot({
      timeOut: 3000, 
      positionClass: 'toast-top-right',
      preventDuplicates: true, 
    }),
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    MatToolbarModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    MatButtonModule,
    MatMenuModule,
    MatCardModule,
    MatTableModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatGridListModule,
    MatDialogContent,
    MatDialogActions,
    MatDialogTitle,
    MatCheckboxModule,
    MatPaginatorModule
  ],
  providers: [provideCharts(withDefaultRegisterables())],
  bootstrap: [AppComponent]
})
export class AppModule { }