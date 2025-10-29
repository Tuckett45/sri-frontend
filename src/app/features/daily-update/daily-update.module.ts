import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelectModule } from 'primeng/multiselect';
import { CalendarModule } from 'primeng/calendar';
import { CheckboxModule } from 'primeng/checkbox';
import { ProgressBarModule } from 'primeng/progressbar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ChartModule } from 'primeng/chart';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { TabsModule } from 'primeng/tabs';

// Services
import { MessageService, ConfirmationService } from 'primeng/api';

// Components
import { DailyUpdateDashboardComponent } from './components/daily-update-dashboard/daily-update-dashboard.component';
import { DailyUpdateFormComponent } from './components/daily-update-form/daily-update-form.component';
import { DailyUpdateListComponent } from './components/daily-update-list/daily-update-list.component';
import { DailyUpdateReportsComponent } from './components/daily-update-reports/daily-update-reports.component';

// Routes
import { dailyUpdateRoutes } from './daily-update.routes';

@NgModule({
  declarations: [
    DailyUpdateDashboardComponent,
    DailyUpdateFormComponent,
    DailyUpdateListComponent,
    DailyUpdateReportsComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule.forChild(dailyUpdateRoutes),
    
    // PrimeNG Modules
    ButtonModule,
    CardModule,
    TableModule,
    InputTextModule,
    TextareaModule,
    InputNumberModule,
    DropdownModule,
    MultiSelectModule,
    CalendarModule,
    CheckboxModule,
    ProgressBarModule,
    ProgressSpinnerModule,
    ChartModule,
    DividerModule,
    TooltipModule,
    ConfirmDialogModule,
    ToastModule,
    TabsModule
  ],
  providers: [
    MessageService,
    ConfirmationService
  ]
})
export class DailyUpdateModule { }
