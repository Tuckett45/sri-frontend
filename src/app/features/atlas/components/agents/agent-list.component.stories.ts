/**
 * Storybook Stories for AgentListComponent
 * 
 * Requirements: 14.7
 */

import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { AgentListComponent } from './agent-list.component';

const meta: Meta<AgentListComponent> = {
  title: 'ATLAS/Agents/AgentListComponent',
  component: AgentListComponent,
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
# AgentListComponent

Displays available agents with filtering, metadata, and health status.

## Features
- List of available agents
- Domain and type filtering
- Health status indicators
- Agent metadata display
- Navigation to agent detail
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
type Story = StoryObj<AgentListComponent>;

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Default view showing all available agents.'
      }
    }
  }
};

export const Loading: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Loading state while fetching agents.'
      }
    }
  }
};

export const Error: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Error state when agent loading fails.'
      }
    }
  }
};

export const FilteredByDomain: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Agents filtered by domain (e.g., Deployment).'
      }
    }
  }
};

export const WithHealthIssues: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Agents with health issues highlighted.'
      }
    }
  }
};
