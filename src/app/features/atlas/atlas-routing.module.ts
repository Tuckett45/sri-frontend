import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Container Component
import { AtlasContainerComponent } from './atlas-container.component';

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

// Role-based dashboard components
import { CMDashboardComponent } from '../field-resource-management/components/reporting/cm-dashboard/cm-dashboard.component';
import { AdminDashboardComponent } from '../field-resource-management/components/reporting/admin-dashboard/admin-dashboard.component';

// Guards
import { AtlasFeatureGuard } from './guards/index';
import { CMGuard } from '../../guards/cm.guard';
import { EnhancedRoleGuard } from '../../guards/enhanced-role.guard';
import { UserRole } from '../../models/role.enum';

/**
 * ATLAS Routing Module
 * 
 * Defines routes for all ATLAS feature pages with lazy loading configuration.
 * All routes are protected by AtlasFeatureGuard to ensure ATLAS integration is enabled.
 * 
 * Route Structure:
 * - /atlas - Redirects to agents (default view)
 * - /atlas/cm/dashboard - CM Dashboard (CM and Admin only)
 * - /atlas/admin/dashboard - Admin Dashboard (Admin only)
 * - /atlas/analysis/:deploymentId - AI analysis for deployment
 * - /atlas/risk-assessment/:deploymentId - Risk assessment for deployment
 * - /atlas/approvals - Approval management
 * - /atlas/approvals/:id/decision - Record approval decision
 * - /atlas/exceptions - Exception requests list
 * - /atlas/exceptions/new - Create exception request
 * - /atlas/agents - Agent list and management
 * - /atlas/agents/:id - Agent detail view
 * - /atlas/agents/:id/execute - Execute agent
 * - /atlas/query-builder - Dynamic query builder
 * - /atlas/query-builder/results - Query results view
 * - /atlas/query-builder/templates - Query templates
 * - /atlas/admin/integration-status - ATLAS integration status dashboard
 * 
 * Guards:
 * - AtlasFeatureGuard: Checks if ATLAS integration is enabled via feature flag
 * - CMGuard: Protects CM-specific routes (CM and Admin access)
 * - EnhancedRoleGuard: Provides role-based and market-based access control
 * 
 * Requirements: 9.5, 9.7, 2.7, 10.9, 3.7, 15.1, 15.2
 */
const routes: Routes = [
  {
    path: '',
    component: AtlasContainerComponent,
    canActivate: [AtlasFeatureGuard],
    children: [
      // Default route - redirect to agents
      {
        path: '',
        redirectTo: 'agents',
        pathMatch: 'full'
      },

      // CM Dashboard - CM and Admin access
      {
        path: 'cm',
        children: [
          {
            path: 'dashboard',
            component: CMDashboardComponent,
            canActivate: [CMGuard],
            data: { 
              title: 'CM Dashboard',
              breadcrumb: 'CM Dashboard'
            }
          }
        ]
      },

      // Admin Dashboard - Admin only
      {
        path: 'admin',
        children: [
          {
            path: 'dashboard',
            component: AdminDashboardComponent,
            canActivate: [EnhancedRoleGuard],
            data: { 
              title: 'Admin Dashboard',
              breadcrumb: 'Admin Dashboard',
              roleGuard: {
                allowedRoles: [UserRole.Admin]
              }
            }
          },
          {
            path: 'integration-status',
            component: IntegrationStatusComponent,
            data: { title: 'ATLAS Integration Status' }
          }
        ]
      },

      // AI Analysis routes
      {
        path: 'analysis',
        children: [
          {
            path: ':deploymentId',
            component: AIAnalysisComponent,
            data: { title: 'AI Analysis' }
          }
        ]
      },

      // Risk Assessment routes
      {
        path: 'risk-assessment',
        children: [
          {
            path: ':deploymentId',
            component: RiskAssessmentComponent,
            data: { title: 'Risk Assessment' }
          }
        ]
      },

      // Approval routes - with market validation for CM users
      {
        path: 'approvals',
        children: [
          {
            path: '',
            component: ApprovalListComponent,
            data: { title: 'Approvals' }
          },
          {
            path: ':id/decision',
            component: ApprovalDecisionComponent,
            data: { title: 'Approval Decision' }
          }
        ]
      },

      // Exception routes - with market validation for CM users
      {
        path: 'exceptions',
        children: [
          {
            path: '',
            component: ExceptionListComponent,
            data: { title: 'Exceptions' }
          },
          {
            path: 'new',
            component: ExceptionRequestComponent,
            data: { title: 'Request Exception' }
          }
        ]
      },

      // Agent routes
      {
        path: 'agents',
        children: [
          {
            path: '',
            component: AgentListComponent,
            data: { title: 'Agents' }
          },
          {
            path: ':id',
            component: AgentDetailComponent,
            data: { title: 'Agent Details' }
          },
          {
            path: ':id/execute',
            component: AgentExecutionComponent,
            data: { title: 'Execute Agent' }
          }
        ]
      },

      // Query Builder routes
      {
        path: 'query-builder',
        children: [
          {
            path: '',
            component: QueryBuilderComponent,
            data: { title: 'Query Builder' }
          },
          {
            path: 'results',
            component: QueryResultsComponent,
            data: { title: 'Query Results' }
          },
          {
            path: 'templates',
            component: QueryTemplateComponent,
            data: { title: 'Query Templates' }
          }
        ]
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AtlasRoutingModule { }
