/**
 * Storybook Stories for AgentDetailComponent
 * 
 * Requirements: 14.7
 */

import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { AgentDetailComponent } from './agent-detail.component';

const meta: Meta<AgentDetailComponent> = {
  title: 'ATLAS/Agents/AgentDetailComponent',
  component: AgentDetailComponent,
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
# AgentDetailComponent

Displays agent configuration and performance metrics with execution button.

## Features
- Agent metadata and capabilities
- Configuration display
- Performance metrics
- Health status
- Execute agent button
- Version history
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
type Story = StoryObj<AgentDetailComponent>;

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Default view showing agent details and metrics.'
      }
    }
  }
};

export const Loading: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Loading state while fetching agent details.'
      }
    }
  }
};

export const Error: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Error state when agent detail loading fails.'
      }
    }
  }
};

export const WithPoorPerformance: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Agent with poor performance metrics.'
      }
    }
  }
};
