import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

/**
 * ATLAS Container Component
 * 
 * Root component for the ATLAS feature module.
 * Provides the router outlet for all ATLAS child routes.
 */
@Component({
  selector: 'app-atlas-container',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="atlas-container">
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    .atlas-container {
      width: 100%;
      height: 100%;
      padding: 20px;
      padding-top: 84px; /* Account for fixed navbar */
    }
  `]
})
export class AtlasContainerComponent { }
