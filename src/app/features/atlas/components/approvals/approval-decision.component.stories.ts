/**
 * Storybook Stories for ApprovalDecisionComponent
 * 
 * Requirements: 14.7
 */

import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ApprovalDecisionComponent } from './approval-decision.component';

const meta: Meta<ApprovalDecisionComponent> = {
  title: 'ATLAS/Approvals/ApprovalDecisionComponent',
  component: ApprovalDecisionComponent,
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
# ApprovalDecisionComponent

Form for recording approval decisions with comments and conditions.

## Features
- Approve/deny decision selection
- Comments field
- Conditions field
- Form validation
- Submit and cancel actions

## Requirements
- 7.1: UI Components for ATLAS Functionality
- 7.5: Support CRUD operations through forms
- 7.6: Validate user input
        `
      }
    }
  }
};

export default meta;
type Story = StoryObj<ApprovalDecisionComponent>;

export const Default: Story = {
  args: {
    approvalId: 'approval-001'
  },
  parameters: {
    docs: {
      description: {
        story: 'Default approval decision form.'
      }
    }
  }
};

export const WithValidationErrors: Story = {
  args: {
    approvalId: 'approval-001'
  },
  parameters: {
    docs: {
      description: {
        story: 'Form showing validation errors.'
      }
    }
  }
};

export const Loading: Story = {
  args: {
    approvalId: 'approval-001'
  },
  parameters: {
    docs: {
      description: {
        story: 'Loading state while submitting decision.'
      }
    }
  }
};
