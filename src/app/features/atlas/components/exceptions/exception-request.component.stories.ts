/**
 * Storybook Stories for ExceptionRequestComponent
 * 
 * Requirements: 14.7
 */

import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ExceptionRequestComponent } from './exception-request.component';

const meta: Meta<ExceptionRequestComponent> = {
  title: 'ATLAS/Exceptions/ExceptionRequestComponent',
  component: ExceptionRequestComponent,
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
# ExceptionRequestComponent

Form for creating exception requests with validation.

## Features
- Exception type selection
- Justification field
- Expiration date picker
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
type Story = StoryObj<ExceptionRequestComponent>;

export const Default: Story = {
  args: {
    deploymentId: 'deployment-001'
  },
  parameters: {
    docs: {
      description: {
        story: 'Default exception request form.'
      }
    }
  }
};

export const WithValidationErrors: Story = {
  args: {
    deploymentId: 'deployment-001'
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
    deploymentId: 'deployment-001'
  },
  parameters: {
    docs: {
      description: {
        story: 'Loading state while submitting request.'
      }
    }
  }
};
