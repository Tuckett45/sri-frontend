import { Component, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { ConfigurationService } from './services/configuration.service';
import { SecureAuthService } from './services/secure-auth.service';
import { DeploymentNotificationIntegratorService } from './features/deployment/services/deployment-notification-integrator.service';
import { environment } from 'src/environments/environments';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: false
})
export class AppComponent {
  title = 'SRI Tools';
  isUserLoggedIn = false;
  showNavbar = false;
  showConfigStatus = !environment.production; // Show config status in development

  private readonly configService = inject(ConfigurationService);
  private readonly authService = inject(SecureAuthService);
  private readonly notificationIntegrator = inject(DeploymentNotificationIntegratorService);

  constructor(public router: Router) {}

  async ngOnInit(): Promise<void> {
    // Track the route so we can hide the navbar on auth pages
    this.updateNavbarVisibility(this.router.url);
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.updateNavbarVisibility(event.urlAfterRedirects);
      }
    });

    try {
      // Initialize configuration service first
      console.log('🔧 Initializing application...');
      await this.configService.initialize();

      // Initialize auth service after configuration is ready
      console.log('🔐 Initializing authentication...');
      await this.authService.initialize();

      // Subscribe to authentication state changes
      this.authService.getAuthState().subscribe(authState => {
        console.log('🔐 Auth state changed:', { isAuthenticated: authState.isAuthenticated });
        this.isUserLoggedIn = authState.isAuthenticated;
        this.updateNavbarVisibility(this.router.url);
        
        // Initialize notification integrator when user is logged in
        if (authState.isAuthenticated) {
          this.notificationIntegrator.initialize().catch(error => {
            console.error('Failed to initialize notifications:', error);
          });
        }
      });

      console.log('✅ Application initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize application:', error);
      // Application can still function with degraded capabilities
    }
  }

  private updateNavbarVisibility(url: string): void {
    const currentUrl = url || '';
    const isAuthRoute = currentUrl.startsWith('/login') || currentUrl.startsWith('/reset-password');
    this.showNavbar = this.isUserLoggedIn && !isAuthRoute;
  }
}
