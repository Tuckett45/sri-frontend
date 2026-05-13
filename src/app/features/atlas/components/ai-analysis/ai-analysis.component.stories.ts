/**
 * Storybook Stories for AIAnalysisComponent
 * 
 * Demonstrates the AI analysis component in various states:
 * - Default state with analysis results
 * - Loading state
 * - Error state
 * - No analysis available
 * - With critical findings
 * 
 * Requirements: 14.7
 */

import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideAnimations } from '@angular/platform-browser/animations';
import { AIAnalysisComponent } from './ai-analysis.component';
import {
  AnalysisResult,
  ReadinessStatus,
  AnalysisFinding,
  Recommendation,
  FindingSeverity,
  FindingCategory
} from '../../models/ai-analysis.model';

// Mock data
const mockFindings: AnalysisFinding[] = [
  {
    id: 'finding-1',
    title: 'Missing Test Coverage',
    description: 'Unit test coverage is below 80% threshold',
    category: FindingCategory.Quality,
    severity: FindingSeverity.High,
    confidence: 0.95,
    supportingEvidence: ['test-report-001', 'coverage-analysis-002'],
    potentialImpact: 'Increased risk of undetected bugs in production'
  },
  {
    id: 'finding-2',
    title: 'Incomplete Documentation',
    description: 'API documentation is missing for 3 endpoints',
    category: FindingCategory.Documentation,
    severity: FindingSeverity.Medium,
    confidence: 0.88,
    supportingEvidence: ['doc-audit-001'],
    potentialImpact: 'Difficulty in maintenance and onboarding'
  },
  {
    id: 'finding-3',
    title: 'Security Vulnerability Detected',
    description: 'Dependency with known CVE detected',
    category: FindingCategory.Risk,
    severity: FindingSeverity.Critical,
    confidence: 0.99,
    supportingEvidence: ['security-scan-001'],
    potentialImpact: 'Potential security breach'
  }
];

const mockRecommendations: Recommendation[] = [
  {
    id: 'rec-1',
    title: 'Increase Test Coverage',
    description: 'Add unit tests for uncovered code paths',
    category: 'Quality',
    priority: 'High',
    type: 'Improvement',
    rationale: 'Higher test coverage reduces production bugs',
    expectedBenefits: ['Fewer production incidents', 'Faster bug detection'],
    risksIfIgnored: ['Increased bug rate', 'Customer dissatisfaction'],
    implementationSteps: ['Identify uncovered code', 'Write unit tests', 'Run coverage report'],
    estimatedEffort: '2 days',
    successCriteria: ['Test coverage above 80%'],
    confidence: 0.92,
    relatedRecommendations: ['rec-2'],
    dependencies: []
  },
  {
    id: 'rec-2',
    title: 'Update Dependencies',
    description: 'Update vulnerable dependencies to latest secure versions',
    category: 'Security',
    priority: 'Critical',
    type: 'Security',
    rationale: 'Eliminate known security vulnerabilities',
    expectedBenefits: ['Improved security posture', 'Compliance with security standards'],
    risksIfIgnored: ['Security breach', 'Data loss'],
    implementationSteps: ['Review dependency updates', 'Test compatibility', 'Deploy updates'],
    estimatedEffort: '1 day',
    successCriteria: ['No known vulnerabilities'],
    confidence: 0.98,
    relatedRecommendations: [],
    dependencies: []
  }
];

const mockAnalysisResult: AnalysisResult = {
  analysisId: 'analysis-001',
  deploymentId: 'deployment-001',
  agentId: 'agent-readiness-001',
  readinessAssessment: {
    status: ReadinessStatus.ReadyWithConcerns,
    score: 75,
    summary: 'Deployment is generally ready but has some concerns that should be addressed',
    keyFactors: ['Good test coverage', 'Complete documentation', 'All approvals obtained'],
    criticalBlockers: [],
    improvementAreas: ['Security vulnerability needs attention', 'Performance testing incomplete']
  },
  findings: mockFindings,
  recommendations: mockRecommendations,
  confidenceLevel: 0.89,
  explanatoryReasoning: 'Analysis based on code quality metrics, security scans, and deployment history',
  completedAt: new Date('2024-01-20T15:30:00Z'),
  analysisDuration: '00:02:45',
  correlationId: 'corr-001',
  metadata: {
    analysisVersion: '2.1.0',
    modelVersion: 'gpt-4'
  }
};

const meta: Meta<AIAnalysisComponent> = {
  title: 'ATLAS/AI Analysis/AIAnalysisComponent',
  component: AIAnalysisComponent,
  tags: ['autodocs'],
  decorators: [
    applicationConfig({
      providers: [
        provideAnimations(),
        provideStore({}),
        provideEffects([])
      ],
    }),
  ],
  parameters: {
    docs: {
      description: {
        component: `
# AIAnalysisComponent

Displays AI-powered analysis results with readiness assessment, findings grouped by severity, and recommendations grouped by priority.

## Features
- Readiness assessment with status indicator
- Findings grouped by severity (Critical, High, Medium, Low, Info)
- Recommendations grouped by priority
- Confidence scores for findings and recommendations
- Run analysis button
- Loading and error states
- Retry functionality

## Requirements
- 7.1: UI Components for ATLAS Functionality
- 7.2: Display ATLAS data in responsive tables
        `
      }
    }
  }
};

export default meta;
type Story = StoryObj<AIAnalysisComponent>;

/**
 * Default state with analysis results
 */
export const Default: Story = {
  args: {
    deploymentId: 'deployment-001'
  },
  parameters: {
    docs: {
      description: {
        story: 'Default view showing complete AI analysis results with readiness assessment, findings, and recommendations.'
      }
    }
  }
};

/**
 * Loading state
 */
export const Loading: Story = {
  args: {
    deploymentId: 'deployment-001'
  },
  parameters: {
    docs: {
      description: {
        story: 'Loading state displayed while AI analysis is in progress.'
      }
    }
  }
};

/**
 * Error state
 */
export const Error: Story = {
  args: {
    deploymentId: 'deployment-001'
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state with retry button when analysis fails.'
      }
    }
  }
};

/**
 * No analysis available
 */
export const NoAnalysis: Story = {
  args: {
    deploymentId: 'deployment-001'
  },
  parameters: {
    docs: {
      description: {
        story: 'State when no analysis has been run yet, prompting user to run analysis.'
      }
    }
  }
};

/**
 * Ready status
 */
export const ReadyStatus: Story = {
  args: {
    deploymentId: 'deployment-001'
  },
  parameters: {
    docs: {
      description: {
        story: 'Analysis showing deployment is ready with no critical issues.'
      }
    }
  }
};

/**
 * Not ready status
 */
export const NotReadyStatus: Story = {
  args: {
    deploymentId: 'deployment-001'
  },
  parameters: {
    docs: {
      description: {
        story: 'Analysis showing deployment is not ready with critical blockers.'
      }
    }
  }
};

/**
 * With critical findings
 */
export const WithCriticalFindings: Story = {
  args: {
    deploymentId: 'deployment-001'
  },
  parameters: {
    docs: {
      description: {
        story: 'Analysis with multiple critical findings that need immediate attention.'
      }
    }
  }
};

/**
 * High confidence analysis
 */
export const HighConfidence: Story = {
  args: {
    deploymentId: 'deployment-001'
  },
  parameters: {
    docs: {
      description: {
        story: 'Analysis with high confidence scores across all findings and recommendations.'
      }
    }
  }
};
