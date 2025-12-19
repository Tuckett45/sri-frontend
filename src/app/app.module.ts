import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';

import { AppComponent } from './app.component';

import { MatAutocompleteModule } from '@angular/material/autocomplete';
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
import { MatDialogActions, MatDialogContent, MatDialogModule, MatDialogTitle } from '@angular/material/dialog';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSortModule } from '@angular/material/sort';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DialogModule } from 'primeng/dialog';
import { ImageModule } from 'primeng/image';
import { GalleriaModule } from 'primeng/galleria';
import { NgxImageCompressService } from 'ngx-image-compress';

import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { ToastrModule } from 'ngx-toastr';

// import { SidebarComponent } from './components/sidebar/sidebar.component';
import { OverviewComponent } from './components/overview/overview.component';
import { WidgetComponent } from './components/widget/widget.component';
import { FilterComponent } from './components/filter/filter.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { ChartComponent } from './components/charts/chart.component';
import { TableComponent } from './components/table/table.component';
import { PreliminaryPunchListModalComponent } from './components/modals/preliminary-punch-list-modal/preliminary-punch-list-modal.component';
import { MapMarkerModalComponent } from './components/modals/map-marker-modal/map-marker-modal.component';
import { UserProfileComponent } from './components/user-profile/user-profile.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterModalComponent } from './components/modals/register-modal/register-modal.component';
import { UserProfileModalComponent } from './components/modals/user-profile-modal/user-profile-modal.component';
import { ForgotPasswordModalComponent } from './components/modals/forgot-password-modal/forgot-password-modal.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { StreetSheetModalComponent } from './components/modals/street-sheet-modal/street-sheet-modal.component';
import { StreetSheetComponent } from './components/street-sheet/street-sheet.component';
import { StreetSheetMapComponent } from './components/street-sheet/street-sheet-map.component';
import { DeleteConfirmationModalComponent } from './components/modals/delete-confirmation-modal/delete-confirmation-modal.component';
import { OspCoordinatorModalComponent } from './components/modals/osp-coordinator-modal/osp-coordinator-modal.component';
import { MarketControllerComponent } from './components/market-controller/market-controller.component';
import { AdminUserApprovalComponent } from './components/admin-user-approval/admin-user-approval.component';
import { MarketControllerModalComponent } from './components/modals/market-controller-modal/market-controller-modal.component';
import { PreliminaryPunchListModule } from './components/preliminary-punch-list/preliminary-punch-list.module';
import { GoalsComponent } from './components/overview/goals/goals.component';
import { VendorDashboardComponent } from './components/overview/dashboard/vendor-dashboard/vendor-dashboard.component';
import { OspCoordinatorTrackerComponent } from './components/osp-coordinator-tracker/osp-coordinator-tracker.component';

import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { StyleClassModule } from 'primeng/styleclass';
import { Select } from 'primeng/select';
import { FloatLabel } from "primeng/floatlabel"
import { DropdownModule } from 'primeng/dropdown';
import { TabsModule } from 'primeng/tabs'
import { DividerModule } from 'primeng/divider';
import { MeterGroupModule } from 'primeng/metergroup';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { CalendarModule } from 'primeng/calendar';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextarea } from 'primeng/inputtextarea';
import { MatNativeDateModule } from '@angular/material/core';

import { NgxCurrencyDirective } from "ngx-currency";
import { provideEnvironmentNgxCurrency, NgxCurrencyInputMode } from 'ngx-currency';
import 'leaflet-search'
import { SRIDashboardComponent } from './components/overview/dashboard/sri-dashboard/sri-dashboard.component';
import { ClientDashboardComponent } from './components/overview/dashboard/client-dashboard/client-dashboard.component';
import { ExpenseModule } from './components/expense/expense.module';
import '../charts-setup';
import { UserNotificationsComponent } from './components/notifications/user-notifications.component';
import { DailyReportModalComponent } from './components/modals/daily-report-modal/daily-report-modal.component';
import { DailyReportDashboardModule } from './components/daily-report-dashboard/daily-report-dashboard.module';
import { TechniciansListComponent } from './components/ark/technicians-list.component';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

export const customCurrencyMaskConfig = {
  align: "left",
  allowNegative: true,
  allowZero: true,
  decimal: ",",
  precision: 2,
  prefix: "$",
  suffix: "",
  thousands: ",",
  nullable: true
};

@NgModule({
  declarations: [
    AppComponent,
    DeleteConfirmationModalComponent,
    FilterComponent,
    ForgotPasswordModalComponent,
    LoginComponent,
    RegisterModalComponent,
    ResetPasswordComponent,
    MapMarkerModalComponent,
    NavbarComponent,
    OverviewComponent,
    PreliminaryPunchListModalComponent,
    // SidebarComponent,
    StreetSheetComponent,
    StreetSheetModalComponent,
    StreetSheetMapComponent,
    TableComponent,
    UserProfileComponent,
    UserProfileModalComponent,
    OspCoordinatorModalComponent,
    
    WidgetComponent,
    OspCoordinatorTrackerComponent,
    MarketControllerComponent,
    MarketControllerModalComponent,
    UserNotificationsComponent,
    DailyReportModalComponent,
    AdminUserApprovalComponent,
    TechniciansListComponent
  ],
  imports: [
    NgxCurrencyDirective,
    BrowserModule,
    BrowserAnimationsModule,
    ToastrModule.forRoot({
      timeOut: 3000, 
      positionClass: 'toast-top-right',
      preventDuplicates: true, 
    }),
    DialogModule,
    ButtonModule,
    ImageModule,
    MenuModule,
    StyleClassModule,
    TabsModule,
    Select,
    FloatLabel,
    DropdownModule,
    TagModule,
    TableModule,
    InputTextModule,
    CalendarModule,
    InputNumberModule,
    InputTextModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule, 
    AppRoutingModule,
    GalleriaModule,
    MatDialogModule,
    MatAutocompleteModule,
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
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSortModule,
    MatTooltipModule,
    DailyReportDashboardModule,
    ClientDashboardComponent,
    VendorDashboardComponent,
    SRIDashboardComponent,
    PreliminaryPunchListModule,
    ExpenseModule,
    GoalsComponent,
    MeterGroupModule,
    DividerModule,
    ChartComponent,
    ToastModule
  ],
  providers: [
    MessageService,
    provideCharts(withDefaultRegisterables()),
    provideEnvironmentNgxCurrency({
      align: "right",
      allowNegative: true,
      allowZero: true,
      decimal: ",",
      precision: 2,
      prefix: "R$ ",
      suffix: "",
      thousands: ".",
      nullable: true,
      min: null,
      max: null,
      inputMode: NgxCurrencyInputMode.Financial,
    }), NgxImageCompressService],
  bootstrap: [AppComponent]
})
export class AppModule { }
