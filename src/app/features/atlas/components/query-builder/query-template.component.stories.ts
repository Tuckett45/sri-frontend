/**
 * Storybook Stories for QueryTemplateComponent
 * 
 * Requirements: 14.7
 */

import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideAnimations } from '@angular/platform-browser/animations';
import { QueryTemplateComponent } from './query-template.component';

const meta: Meta<QueryTemplateComponent> = {
  title: 'ATLAS/Query Builder/QueryTemplateComponent',
  component: QueryTemplateComponent,
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
# QueryTemplateComponent

Displays saved query templates with execution and management capabilities.

## Features
- List of saved templates
- Template execution with parameter input
- Template management (create, delete)
- Public/private template indicator
- Template metadata display
- Loading and error states

## Requirements
- 7.1: UI Components for ATLAS Functionality
- 7.2: Display ATLAS data in responsive tables
- 7.5: Support CRUD operations through forms
        `
      }
    }
  }
};

export default meta;
type Story = StoryObj<QueryTemplateComponent>;

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Default view showing saved query templates.'
      }
    }
  }
};

export const WithParameterInput: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Template execution with parameter input dialog.'
      }
    }
  }
};

export const CreateTemplate: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Create new template dialog.'
      }
    }
  }
};

export const Loading: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Loading state while fetching templates.'
      }
    }
  }
};

export const Empty: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Empty state when no templates exist.'
      }
    }
  }
};
