/**
 * Storybook Stories for QueryResultsComponent
 * 
 * Requirements: 14.7
 */

import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideAnimations } from '@angular/platform-browser/animations';
import { QueryResultsComponent } from './query-results.component';

const meta: Meta<QueryResultsComponent> = {
  title: 'ATLAS/Query Builder/QueryResultsComponent',
  component: QueryResultsComponent,
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
# QueryResultsComponent

Displays query results in a table with virtual scrolling and export functionality.

## Features
- Results table with virtual scrolling
- Column headers with metadata
- Export functionality (CSV, JSON, Excel)
- Row count and execution time display
- Cache indicator
- Empty state
- Loading state

## Requirements
- 7.1: UI Components for ATLAS Functionality
- 7.2: Display ATLAS data in responsive tables
- 11.6: Virtual scrolling for large datasets
        `
      }
    }
  }
};

export default meta;
type Story = StoryObj<QueryResultsComponent>;

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Default view showing query results.'
      }
    }
  }
};

export const LargeDataset: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Query results with large dataset using virtual scrolling.'
      }
    }
  }
};

export const Empty: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Empty state when query returns no results.'
      }
    }
  }
};

export const FromCache: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Results loaded from cache with indicator.'
      }
    }
  }
};

export const WithExportOptions: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Results with export dropdown open.'
      }
    }
  }
};
