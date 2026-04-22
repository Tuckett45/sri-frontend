import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';

// Angular Material
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ChipModule } from 'primeng/chip';
import { BadgeModule } from 'primeng/badge';
import { TooltipModule } from 'primeng/tooltip';

// Routing
import { AtlasRoutingModule } from './atlas-routing.module';

// Container Component
import { AtlasContainerComponent } from './atlas-container.component';

// Shared Module
import { AtlasSharedModule } from './atlas-shared.module';

// Components
import { AIAnalysisComponent } from './components/ai-analysis/ai-analysis.component';
import { RiskAssessmentComponent } from './components/ai-analysis/risk-assessment.component';
import { ApprovalListComponent } from './components/approvals/approval-list.component';
import { ApprovalDecisionComponent } from './components/approvals/approval-decision.component';
import { ExceptionListComponent } from './components/exceptions/exception-list.component';
import { ExceptionRequestComponent } from './components/exceptions/exception-request.component';
import { AgentListComponent } from './components/agents/agent-list.component';
import { AgentDetailComponent } from './components/agents/agent-detail.component';
import { AgentExecutionComponent } from './components/agents/agent-execution.component';
import { QueryBuilderComponent } from './components/query-builder/query-builder.component';
import { QueryResultsComponent } from './components/query-builder/query-results.component';
import { QueryTemplateComponent } from './components/query-builder/query-template.component';
import { IntegrationStatusComponent } from './components/admin/integration-status.component';
import { HealthDashboardComponent } from './components/admin/health-dashboard.component';

// State Management
import { aiAnalysisReducer } from './state/ai-analysis/ai-analysis.reducer';
import { AIAnalysisEffects } from './state/ai-analysis/ai-analysis.effects';
import { approvalReducer } from './state/approvals/approval.reducer';
import { ApprovalEffects } from './state/approvals/approval.effects';
import { exceptionReducer } from './state/exceptions/exception.reducer';
import { ExceptionEffects } from './state/exceptions/exception.effects';
import { agentReducer } from './state/agents/agent.reducer';
import { AgentEffects } from './state/agents/agent.effects';
import { queryBuilderReducer } from './state/query-builder/query-builder.reducer';
import { QueryBuilderEffects } from './state/query-builder/query-builder.effects';

/**
 * ATLAS Feature Module
 * 
 * This module encapsulates all ATLAS control plane integration functionality.
 * It is lazy-loaded to optimize initial application load time.
 * 
 * Features:
 * - AI-powered analysis and risk assessment (for ARK deployments)
 * - Approval workflows
 * - Exception management
 * - Agent execution and monitoring
 * - Dynamic query builder
 * 
 * Architecture:
 * - NgRx for state management (Store, Effects)
 * - Service layer for API communication
 * - Component-based UI with Angular Material and PrimeNG
 * - Lazy-loaded routing
 */
@NgModule({
  declarations: [
    // No declarations - all components are standalone
  ],
  imports: [
    // Angular Core
    CommonModule,
    ReactiveFormsModule,
    
    // Routing
    AtlasRoutingModule,
    
    // Container Component
    AtlasContainerComponent,
    
    // Shared Module
    AtlasSharedModule,
    
    // Standalone Components
    AIAnalysisComponent,
    RiskAssessmentComponent,
    ApprovalListComponent,
    ApprovalDecisionComponent,
    ExceptionListComponent,
    ExceptionRequestComponent,
    AgentListComponent,
    AgentDetailComponent,
    AgentExecutionComponent,
    QueryBuilderComponent,
    QueryResultsComponent,
    QueryTemplateComponent,
    IntegrationStatusComponent,
    HealthDashboardComponent,
    
    // Angular Material
    MatButtonModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatToolbarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatSnackBarModule,
    MatChipsModule,
    MatBadgeModule,
    MatTooltipModule,
    
    // PrimeNG
    TableModule,
    ButtonModule,
    CardModule,
    InputTextModule,
    DropdownModule,
    DialogModule,
    ToastModule,
    ProgressSpinnerModule,
    ChipModule,
    BadgeModule,
    TooltipModule,
    
    // NgRx State Management
    // AI Analysis state management
    StoreModule.forFeature('aiAnalysis', aiAnalysisReducer),
    EffectsModule.forFeature([AIAnalysisEffects]),
    
    // Approval state management
    StoreModule.forFeature('approvals', approvalReducer),
    EffectsModule.forFeature([ApprovalEffects]),
    
    // Exception state management
    StoreModule.forFeature('exceptions', exceptionReducer),
    EffectsModule.forFeature([ExceptionEffects]),
    
    // Agent state management
    StoreModule.forFeature('agents', agentReducer),
    EffectsModule.forFeature([AgentEffects]),
    
    // Query Builder state management
    StoreModule.forFeature('queryBuilder', queryBuilderReducer),
    EffectsModule.forFeature([QueryBuilderEffects]),
  ],
  providers: [
    // Services will be provided as they are implemented
  ]
})
export class AtlasModule { }
