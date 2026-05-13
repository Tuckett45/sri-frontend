/**
 * Storybook Stories for ApprovalListComponent
 * 
 * Requirements: 14.7
 */

import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { ApprovalListComponent } from './approval-list.component';

const meta: Meta<ApprovalListComponent> = {
  title: 'ATLAS/Approvals/ApprovalListComponent',
  component: ApprovalListComponent,
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
# ApprovalListComponent

Displays pending approvals for the current user with approve/deny actions.

## Features
- List of pending approvals
- Approve and deny buttons
- Approval details display
- Loading and error states

## Requirements
- 7.1: UI Components for ATLAS Functionality
- 7.2: Display ATLAS data in responsive tables
        `
      }
    }
  }
};

export default meta;
type Story = StoryObj<ApprovalListComponent>;

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Default view showing pending approvals for the user.'
      }
    }
  }
};

export const Loading: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Loading state while fetching approvals.'
      }
    }
  }
};

export const Error: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Error state when approval loading fails.'
      }
    }
  }
};

export const Empty: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Empty state when no pending approvals exist.'
      }
    }
  }
};
