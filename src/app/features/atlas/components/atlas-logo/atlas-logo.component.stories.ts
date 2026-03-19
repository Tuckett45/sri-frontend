/**
 * Storybook Stories for AtlasLogoComponent
 * 
 * Requirements: 14.7
 */

import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { provideRouter } from '@angular/router';
import { AtlasLogoComponent } from './atlas-logo.component';

const meta: Meta<AtlasLogoComponent> = {
  title: 'ATLAS/Shared/AtlasLogoComponent',
  component: AtlasLogoComponent,
  tags: ['autodocs'],
  decorators: [
    applicationConfig({
      providers: [
        provideRouter([])
      ],
    }),
  ],
  parameters: {
    docs: {
      description: {
        component: `
# AtlasLogoComponent

Reusable ATLAS brand logo component with automatic theme detection and responsive sizing.

## Features
- Multiple size variants (small, medium, large)
- Theme variants (light, dark, auto)
- Automatic dark mode detection
- Optional router link navigation
- Accessibility compliant with alt text

## Usage
\`\`\`html
<app-atlas-logo size="medium" theme="auto"></app-atlas-logo>
<app-atlas-logo size="small" theme="dark" [routerLink]="null"></app-atlas-logo>
\`\`\`

## Requirements
- 7.1: UI Components for ATLAS Functionality
- 7.10: ATLAS branding and visual identity
        `
      }
    }
  },
  argTypes: {
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
      description: 'Logo size variant'
    },
    theme: {
      control: 'select',
      options: ['light', 'dark', 'auto'],
      description: 'Theme variant'
    },
    routerLink: {
      control: 'text',
      description: 'Router link for navigation (null to disable)'
    }
  }
};

export default meta;
type Story = StoryObj<AtlasLogoComponent>;

/**
 * Default medium size with auto theme
 */
export const Default: Story = {
  args: {
    size: 'medium',
    theme: 'auto',
    routerLink: '/atlas'
  },
  parameters: {
    docs: {
      description: {
        story: 'Default logo with medium size and automatic theme detection.'
      }
    }
  }
};

/**
 * Small size variant
 */
export const Small: Story = {
  args: {
    size: 'small',
    theme: 'auto',
    routerLink: '/atlas'
  },
  parameters: {
    docs: {
      description: {
        story: 'Small logo variant (32px height) suitable for navigation bars.'
      }
    }
  }
};

/**
 * Medium size variant
 */
export const Medium: Story = {
  args: {
    size: 'medium',
    theme: 'auto',
    routerLink: '/atlas'
  },
  parameters: {
    docs: {
      description: {
        story: 'Medium logo variant (48px height) - default size.'
      }
    }
  }
};

/**
 * Large size variant
 */
export const Large: Story = {
  args: {
    size: 'large',
    theme: 'auto',
    routerLink: '/atlas'
  },
  parameters: {
    docs: {
      description: {
        story: 'Large logo variant (64px height) suitable for headers and landing pages.'
      }
    }
  }
};

/**
 * Light theme
 */
export const LightTheme: Story = {
  args: {
    size: 'medium',
    theme: 'light',
    routerLink: '/atlas'
  },
  parameters: {
    docs: {
      description: {
        story: 'Logo with light theme (blue) for light backgrounds.'
      }
    },
    backgrounds: {
      default: 'light'
    }
  }
};

/**
 * Dark theme
 */
export const DarkTheme: Story = {
  args: {
    size: 'medium',
    theme: 'dark',
    routerLink: '/atlas'
  },
  parameters: {
    docs: {
      description: {
        story: 'Logo with dark theme (white) for dark backgrounds.'
      }
    },
    backgrounds: {
      default: 'dark'
    }
  }
};

/**
 * Without navigation
 */
export const WithoutNavigation: Story = {
  args: {
    size: 'medium',
    theme: 'auto',
    routerLink: null
  },
  parameters: {
    docs: {
      description: {
        story: 'Logo without router link navigation (static display).'
      }
    }
  }
};

/**
 * All sizes comparison
 */
export const AllSizes: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 20px; align-items: flex-start;">
        <div>
          <p style="margin-bottom: 8px; font-weight: bold;">Small (32px)</p>
          <app-atlas-logo size="small" theme="auto" [routerLink]="null"></app-atlas-logo>
        </div>
        <div>
          <p style="margin-bottom: 8px; font-weight: bold;">Medium (48px)</p>
          <app-atlas-logo size="medium" theme="auto" [routerLink]="null"></app-atlas-logo>
        </div>
        <div>
          <p style="margin-bottom: 8px; font-weight: bold;">Large (64px)</p>
          <app-atlas-logo size="large" theme="auto" [routerLink]="null"></app-atlas-logo>
        </div>
      </div>
    `
  }),
  parameters: {
    docs: {
      description: {
        story: 'Comparison of all available logo sizes.'
      }
    }
  }
};
