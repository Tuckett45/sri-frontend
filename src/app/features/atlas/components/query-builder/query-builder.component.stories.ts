/**
 * Storybook Stories for QueryBuilderComponent
 * 
 * Requirements: 14.7
 */

import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideAnimations } from '@angular/platform-browser/animations';
import { QueryBuilderComponent } from './query-builder.component';

const meta: Meta<QueryBuilderComponent> = {
  title: 'ATLAS/Query Builder/QueryBuilderComponent',
  component: QueryBuilderComponent,
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
# QueryBuilderComponent

Dynamic query builder UI with field selection, operator selection, and value input.

## Features
- Data source selection
- Field selection with type awareness
- Operator selection based on field type
- Value input with validation
- Filter groups with logical operators (AND/OR)
- Sort criteria configuration
- Execute query button
- Query validation
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
type Story = StoryObj<QueryBuilderComponent>;

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Default query builder with empty query.'
      }
    }
  }
};

export const WithSimpleQuery: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Query builder with a simple single-filter query.'
      }
    }
  }
};

export const WithComplexQuery: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Query builder with multiple filters and groups.'
      }
    }
  }
};

export const WithSorting: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Query builder with sort criteria configured.'
      }
    }
  }
};

export const Loading: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Loading state while executing query.'
      }
    }
  }
};

export const ValidationErrors: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Query builder showing validation errors.'
      }
    }
  }
};
