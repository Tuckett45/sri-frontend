import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-construction-container',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="construction-container">
      <nav class="construction-sidebar">
        <a routerLink="forecast" routerLinkActive="active" class="nav-link">
          <i class="pi pi-chart-bar"></i>
          <span>Forecast</span>
        </a>
        <a routerLink="issues" routerLinkActive="active" class="nav-link">
          <i class="pi pi-exclamation-triangle"></i>
          <span>Issues</span>
        </a>
      </nav>
      <div class="construction-content">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: [`
    .construction-container {
      display: flex;
      width: 100%;
      height: 100%;
      padding-top: 84px;
    }
    .construction-sidebar {
      width: 200px;
      min-width: 200px;
      display: flex;
      flex-direction: column;
      padding: 16px 8px;
      border-right: 1px solid #e0e0e0;
      background: #fafafa;
    }
    .nav-link {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 6px;
      color: #555;
      text-decoration: none;
      font-size: 14px;
      transition: background 0.15s;
    }
    .nav-link:hover { background: #eee; }
    .nav-link.active { background: #e3f2fd; color: #1565c0; font-weight: 500; }
    .construction-content {
      flex: 1;
      padding: 20px;
      overflow: auto;
    }
  `]
})
export class ConstructionContainerComponent {}
