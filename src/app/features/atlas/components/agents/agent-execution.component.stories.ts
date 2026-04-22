/**
 * Storybook Stories for AgentExecutionComponent
 * 
 * Requirements: 14.7
 */

import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideAnimations } from '@angular/platform-browser/animations';
import { AgentExecutionComponent } from './agent-execution.component';

const meta: Meta<AgentExecutionComponent> = {
  title: 'ATLAS/Agents/AgentExecutionComponent',
  component: AgentExecutionComponent,
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
# AgentExecutionComponent

Form for agent execution with input parameters and results display.

## Features
- Dynamic input parameter form
- Execute button
- Execution results display
- Confidence score
- Execution duration
- Loading state during execution
- Error handling

## Requirements
- 7.1: UI Components for ATLAS Functionality
- 7.5: Support CRUD operations through forms
        `
      }
    }
  }
};

export default meta;
type Story = StoryObj<AgentExecutionComponent>;

export const Default: Story = {
  args: {
    agentId: 'agent-001'
  },
  parameters: {
    docs: {
      description: {
        story: 'Default agent execution form.'
      }
    }
  }
};

export const Executing: Story = {
  args: {
    agentId: 'agent-001'
  },
  parameters: {
    docs: {
      description: {
        story: 'Loading state during agent execution.'
      }
    }
  }
};

export const WithResults: Story = {
  args: {
    agentId: 'agent-001'
  },
  parameters: {
    docs: {
      description: {
        story: 'Execution completed with results displayed.'
      }
    }
  }
};

export const ExecutionError: Story = {
  args: {
    agentId: 'agent-001'
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state when execution fails.'
      }
    }
  }
};
