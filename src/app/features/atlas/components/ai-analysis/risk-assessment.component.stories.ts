/**
 * Storybook Stories for RiskAssessmentComponent
 * 
 * Demonstrates the risk assessment component in various states:
 * - Default state with risk assessment
 * - Loading state
 * - Error state
 * - Different risk levels
 * - With mitigation recommendations
 * 
 * Requirements: 14.7
 */

import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideAnimations } from '@angular/platform-browser/animations';
import { RiskAssessmentComponent } from './risk-assessment.component';
import {
  RiskAssessment,
  RiskLevel,
  IdentifiedRisk,
  RiskMitigation,
  RiskSeverity,
  RiskCategory
} from '../../models/ai-analysis.model';

// Mock data
const mockIdentifiedRisks: IdentifiedRisk[] = [
  {
    id: 'risk-1',
    title: 'Database Migration Failure',
    description: 'Risk of data loss during migration process',
    category: RiskCategory.Technical,
    severity: RiskSeverity.Critical,
    probability: 0.25,
    potentialImpact: 'Complete service outage and potential data loss',
    riskIndicators: ['Complex schema changes', 'Large data volume', 'Limited rollback options'],
    historicalOccurrences: ['Similar migration failed in Q3 2023'],
    confidence: 0.92
  },
  {
    id: 'risk-2',
    title: 'Performance Degradation',
    description: 'New code may impact system performance',
    category: RiskCategory.Performance,
    severity: RiskSeverity.Major,
    probability: 0.40,
    potentialImpact: 'Slower response times affecting user experience',
    riskIndicators: ['Increased database queries', 'No load testing performed'],
    historicalOccurrences: [],
    confidence: 0.78
  },
  {
    id: 'risk-3',
    title: 'Security Vulnerability',
    description: 'Outdated dependency with known CVE',
    category: RiskCategory.Security,
    severity: RiskSeverity.Severe,
    probability: 0.60,
    potentialImpact: 'Potential security breach and data exposure',
    riskIndicators: ['CVE-2024-1234 detected', 'Public exploit available'],
    historicalOccurrences: [],
    confidence: 0.99
  }
];

const mockMitigations: RiskMitigation[] = [
  {
    id: 'mit-1',
    riskId: 'risk-1',
    title: 'Implement Comprehensive Backup Strategy',
    description: 'Create full database backup before migration with tested restore procedure',
    type: 'Preventive',
    priority: 'Critical',
    estimatedEffort: '4 hours',
    expectedEffectiveness: 0.95,
    implementationSteps: [
      'Create full database backup',
      'Test restore procedure',
      'Document rollback steps',
      'Prepare monitoring alerts'
    ]
  },
  {
    id: 'mit-2',
    riskId: 'risk-2',
    title: 'Conduct Load Testing',
    description: 'Perform comprehensive load testing before production deployment',
    type: 'Detective',
    priority: 'High',
    estimatedEffort: '8 hours',
    expectedEffectiveness: 0.85,
    implementationSteps: [
      'Set up load testing environment',
      'Define test scenarios',
      'Execute load tests',
      'Analyze results and optimize'
    ]
  },
  {
    id: 'mit-3',
    riskId: 'risk-3',
    title: 'Update Vulnerable Dependencies',
    description: 'Immediately update all dependencies with known vulnerabilities',
    type: 'Corrective',
    priority: 'Critical',
    estimatedEffort: '2 hours',
    expectedEffectiveness: 0.99,
    implementationSteps: [
      'Review dependency updates',
      'Test compatibility',
      'Update dependencies',
      'Run security scan'
    ]
  }
];

const mockRiskAssessment: RiskAssessment = {
  assessmentId: 'assessment-001',
  deploymentId: 'deployment-001',
  agentId: 'agent-risk-001',
  overallRiskLevel: RiskLevel.High,
  overallRiskScore: 72,
  identifiedRisks: mockIdentifiedRisks,
  mitigationRecommendations: mockMitigations,
  riskFactors: [
    { factor: 'Complexity', score: 0.8 },
    { factor: 'Dependencies', score: 0.6 },
    { factor: 'Testing Coverage', score: 0.4 }
  ],
  confidenceLevel: 0.88,
  explanatoryReasoning: 'Risk assessment based on historical data, code analysis, and security scans',
  completedAt: new Date('2024-01-20T16:00:00Z'),
  assessmentDuration: '00:03:15',
  correlationId: 'corr-002',
  metadata: {
    assessmentVersion: '1.5.0',
    modelVersion: 'risk-analyzer-v2'
  }
};

const meta: Meta<RiskAssessmentComponent> = {
  title: 'ATLAS/AI Analysis/RiskAssessmentComponent',
  component: RiskAssessmentComponent,
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
# RiskAssessmentComponent

Displays overall risk level and score, identified risks with severity indicators, and mitigation recommendations.

## Features
- Overall risk level and score display
- Risk score progress bar with color coding
- Identified risks grouped by severity
- Risk details with probability and impact
- Mitigation recommendations grouped by priority
- Confidence scores
- Assess risk button
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
type Story = StoryObj<RiskAssessmentComponent>;

/**
 * Default state with risk assessment
 */
export const Default: Story = {
  args: {
    deploymentId: 'deployment-001'
  },
  parameters: {
    docs: {
      description: {
        story: 'Default view showing complete risk assessment with identified risks and mitigation recommendations.'
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
        story: 'Loading state displayed while risk assessment is in progress.'
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
        story: 'Error state with retry button when risk assessment fails.'
      }
    }
  }
};

/**
 * Low risk level
 */
export const LowRisk: Story = {
  args: {
    deploymentId: 'deployment-001'
  },
  parameters: {
    docs: {
      description: {
        story: 'Risk assessment showing low overall risk level with minimal concerns.'
      }
    }
  }
};

/**
 * Medium risk level
 */
export const MediumRisk: Story = {
  args: {
    deploymentId: 'deployment-001'
  },
  parameters: {
    docs: {
      description: {
        story: 'Risk assessment showing medium risk level requiring attention.'
      }
    }
  }
};

/**
 * High risk level
 */
export const HighRisk: Story = {
  args: {
    deploymentId: 'deployment-001'
  },
  parameters: {
    docs: {
      description: {
        story: 'Risk assessment showing high risk level with critical issues.'
      }
    }
  }
};

/**
 * Critical risk level
 */
export const CriticalRisk: Story = {
  args: {
    deploymentId: 'deployment-001'
  },
  parameters: {
    docs: {
      description: {
        story: 'Risk assessment showing critical risk level requiring immediate action.'
      }
    }
  }
};

/**
 * With multiple critical risks
 */
export const MultipleCriticalRisks: Story = {
  args: {
    deploymentId: 'deployment-001'
  },
  parameters: {
    docs: {
      description: {
        story: 'Risk assessment with multiple critical risks identified.'
      }
    }
  }
};

/**
 * No assessment available
 */
export const NoAssessment: Story = {
  args: {
    deploymentId: 'deployment-001'
  },
  parameters: {
    docs: {
      description: {
        story: 'State when no risk assessment has been run yet, prompting user to assess risk.'
      }
    }
  }
};
