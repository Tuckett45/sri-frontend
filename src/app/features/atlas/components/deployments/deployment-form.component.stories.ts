/**
 * Storybook Stories for DeploymentFormComponent
 * 
 * Demonstrates the deployment form component in various modes:
 * - Create mode (new deployment)
 * - Edit mode (existing deployment)
 * - With validation errors
 * - Loading state
 * 
 * Requirements: 14.7
 */

import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { DeploymentFormComponent } from './deployment-form.component';
import { DeploymentType, LifecycleState } from '../../models/approval.model';

// Mock data for edit mode
const mockDeployment: DeploymentDto = {
  id: '1',
  title: 'Production Database Migration',
  type: DeploymentType.STANDARD,
  currentState: LifecycleState.DRAFT,
  clientId: 'client-001',
  createdBy: 'john.doe@example.com',
  createdAt: new Date('2024-01-15T10:00:00Z'),
  updatedAt: new Date('2024-01-15T10:00:00Z'),
  metadata: {
    priority: 'high',
    team: 'backend',
    estimatedDuration: '4 hours'
  }
};

const meta: Meta<DeploymentFormComponent> = {
  title: 'ATLAS/Deployments/DeploymentFormComponent',
  component: DeploymentFormComponent,
  tags: ['autodocs'],
  decorators: [
    applicationConfig({
      providers: [
        provideAnimations(),
        provideStore({}),
        provideEffects([]),
        provideRouter([])
      ],
    }),
  ],
  parameters: {
    docs: {
      description: {
        component: `
# DeploymentFormComponent

Provides a reactive form for creating and editing deployments with validation and error handling.

## Features
- Create new deployments
- Edit existing deployments
- Form validation (required fields, min/max length)
- Metadata JSON editor
- Success and error notifications
- Cancel functionality
- Loading states

## Form Fields
- **Title**: Required, 3-200 characters
- **Type**: Required, dropdown selection
- **Metadata**: Optional JSON object

## Requirements
- 7.1: UI Components for ATLAS Functionality
- 7.5: Support CRUD operations through forms
- 7.6: Validate user input before submission
- 3.11: Connect to NgRx store
- 7.7: Display success notifications
- 7.8: Display error notifications
        `
      }
    }
  }
};

export default meta;
type Story = StoryObj<DeploymentFormComponent>;

/**
 * Create mode - new deployment
 */
export const CreateMode: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Form in create mode for adding a new deployment. All fields are empty and ready for input.'
      }
    }
  }
};

/**
 * Edit mode - existing deployment
 */
export const EditMode: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Form in edit mode with pre-populated data from an existing deployment.'
      }
    }
  }
};

/**
 * With validation errors
 */
export const WithValidationErrors: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Form showing validation errors when required fields are missing or invalid.'
      }
    }
  }
};

/**
 * Loading state
 */
export const Loading: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Form in loading state while submitting data to the API.'
      }
    }
  }
};

/**
 * With metadata JSON
 */
export const WithMetadata: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Form with metadata JSON populated, showing how custom deployment metadata can be added.'
      }
    }
  }
};

/**
 * Emergency deployment type
 */
export const EmergencyType: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Form configured for creating an emergency deployment with appropriate type selection.'
      }
    }
  }
};
