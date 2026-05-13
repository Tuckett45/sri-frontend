/**
 * Storybook Stories for ExceptionListComponent
 * 
 * Requirements: 14.7
 */

import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { ExceptionListComponent } from './exception-list.component';

const meta: Meta<ExceptionListComponent> = {
  title: 'ATLAS/Exceptions/ExceptionListComponent',
  component: ExceptionListComponent,
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
# ExceptionListComponent

Displays exceptions for a deployment with status, type, and justification.

## Features
- List of exceptions
- Status badges
- Request exception button
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
type Story = StoryObj<ExceptionListComponent>;

export const Default: Story = {
  args: {
    deploymentId: 'deployment-001'
  },
  parameters: {
    docs: {
      description: {
        story: 'Default view showing exceptions for a deployment.'
      }
    }
  }
};

export const Loading: Story = {
  args: {
    deploymentId: 'deployment-001'
  },
  parameters: {
    docs: {
      description: {
        story: 'Loading state while fetching exceptions.'
      }
    }
  }
};

export const Error: Story = {
  args: {
    deploymentId: 'deployment-001'
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state when exception loading fails.'
      }
    }
  }
};

export const Empty: Story = {
  args: {
    deploymentId: 'deployment-001'
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty state when no exceptions exist.'
      }
    }
  }
};
