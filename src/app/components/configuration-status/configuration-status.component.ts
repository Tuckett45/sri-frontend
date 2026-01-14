import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigurationService } from 'src/app/services/configuration.service';
import { RuntimeConfiguration, ConfigurationError } from 'src/app/models/configuration.model';
import { environment } from 'src/environments/environments';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-configuration-status',
  template: `
    <div class="configuration-status" *ngIf="showStatus">
      <div class="status-header">
        <h4>🔧 Configuration Status</h4>
        <button (click)="toggleStatus()" class="toggle-btn">
          {{ expanded ? '▼' : '▶' }}
        </button>
      </div>
      
      <div class="status-content" *ngIf="expanded">
        <div class="status-item">
          <span class="label">Initialized:</span>
          <span class="value" [class.success]="isInitialized$ | async" [class.error]="!(isInitialized$ | async)">
            {{ (isInitialized$ | async) ? '✅ Yes' : '❌ No' }}
          </span>
        </div>
        
        <div class="status-item">
          <span class="label">Loading:</span>
          <span class="value">
            {{ (isLoading$ | async) ? '⏳ Yes' : '✅ No' }}
          </span>
        </div>
        
        <div class="status-item" *ngIf="config">
          <span class="label">Source:</span>
          <span class="value" [class.warning]="configService.isUsingMockService()">
            {{ configService.isUsingMockService() ? '🔧 Mock Service' : '🌐 Backend API' }}
          </span>
        </div>
        
        <div class="status-item" *ngIf="config">
          <span class="label">Version:</span>
          <span class="value">{{ config.version }}</span>
        </div>
        
        <div class="status-item" *ngIf="config">
          <span class="label">VAPID Key:</span>
          <span class="value" [class.success]="config.vapidPublicKey" [class.error]="!config.vapidPublicKey">
            {{ config.vapidPublicKey ? '✅ Available' : '❌ Missing' }}
          </span>
        </div>
        
        <div class="status-item" *ngIf="config">
          <span class="label">API Key:</span>
          <span class="value" [class.success]="config.apiSubscriptionKey" [class.error]="!config.apiSubscriptionKey">
            {{ config.apiSubscriptionKey ? '✅ Available' : '❌ Missing' }}
          </span>
        </div>
        
        <div class="status-item" *ngIf="error">
          <span class="label">Error:</span>
          <span class="value error">{{ error.message }}</span>
        </div>
        
        <div class="actions">
          <button (click)="refreshConfig()" class="refresh-btn" [disabled]="isLoading$ | async">
            🔄 Refresh Config
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .configuration-status {
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 10px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 12px;
      z-index: 9999;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
    
    .status-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    
    .status-header h4 {
      margin: 0;
      font-size: 14px;
    }
    
    .toggle-btn {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      font-size: 12px;
    }
    
    .status-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
      padding: 2px 0;
    }
    
    .label {
      font-weight: bold;
      margin-right: 10px;
    }
    
    .value {
      text-align: right;
    }
    
    .success {
      color: #4CAF50;
    }
    
    .error {
      color: #f44336;
    }
    
    .warning {
      color: #ff9800;
    }
    
    .actions {
      margin-top: 10px;
      text-align: center;
    }
    
    .refresh-btn {
      background: #2196F3;
      color: white;
      border: none;
      padding: 5px 10px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
    }
    
    .refresh-btn:hover {
      background: #1976D2;
    }
    
    .refresh-btn:disabled {
      background: #666;
      cursor: not-allowed;
    }
  `],
  standalone: true,
  imports: [CommonModule]
})
export class ConfigurationStatusComponent implements OnInit {
  configService = inject(ConfigurationService);
  
  config: RuntimeConfiguration | null = null;
  error: ConfigurationError | null = null;
  expanded = false;
  showStatus = !environment.production; // Only show in development
  
  isInitialized$ = this.configService.isInitialized();
  isLoading$ = this.configService.isLoading();

  ngOnInit(): void {
    // Subscribe to configuration changes
    this.configService.getConfig().subscribe(config => {
      this.config = config;
    });
    
    // Subscribe to error changes
    this.configService.getError().subscribe(error => {
      this.error = error;
    });
  }
  
  toggleStatus(): void {
    this.expanded = !this.expanded;
  }
  
  async refreshConfig(): Promise<void> {
    try {
      await this.configService.refreshConfiguration();
    } catch (error) {
      console.error('Failed to refresh configuration:', error);
    }
  }
}