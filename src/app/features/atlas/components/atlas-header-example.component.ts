import { Component } from '@angular/core';
import { AtlasSharedModule } from '../atlas-shared.module';

/**
 * Example ATLAS Header Component
 * 
 * Demonstrates how to use the ATLAS logo and branding in a header/toolbar.
 * This is a reference implementation that can be customized for your needs.
 * 
 * @example
 * <app-atlas-header-example></app-atlas-header-example>
 */
@Component({
  selector: 'app-atlas-header-example',
  standalone: true,
  imports: [AtlasSharedModule],
  template: `
    <mat-toolbar color="primary" class="atlas-toolbar">
      <app-atlas-logo 
        size="medium" 
        theme="dark"
        routerLink="/atlas">
      </app-atlas-logo>
      
      <span class="atlas-spacer"></span>
      
      <button mat-button>
        <mat-icon>dashboard</mat-icon>
        Dashboard
      </button>
      
      <button mat-button>
        <mat-icon>deployment</mat-icon>
        Deployments
      </button>
      
      <button mat-button>
        <mat-icon>analytics</mat-icon>
        Analysis
      </button>
      
      <button mat-icon-button [matMenuTriggerFor]="menu">
        <mat-icon>account_circle</mat-icon>
      </button>
      
      <mat-menu #menu="matMenu">
        <button mat-menu-item>
          <mat-icon>person</mat-icon>
          <span>Profile</span>
        </button>
        <button mat-menu-item>
          <mat-icon>settings</mat-icon>
          <span>Settings</span>
        </button>
        <mat-divider></mat-divider>
        <button mat-menu-item>
          <mat-icon>logout</mat-icon>
          <span>Logout</span>
        </button>
      </mat-menu>
    </mat-toolbar>
  `,
  styles: [`
    .atlas-toolbar {
      gap: 16px;
      
      button {
        color: white;
      }
    }
  `]
})
export class AtlasHeaderExampleComponent { }
