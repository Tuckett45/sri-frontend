import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { DeploymentNotificationIntegratorService } from './features/deployment/services/deployment-notification-integrator.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: false
})
export class AppComponent {
  title = 'SRI Tools';
  isUserLoggedIn: boolean = false;

  private readonly notificationIntegrator = inject(DeploymentNotificationIntegratorService);

  constructor(public router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    this.authService.getLoginStatus().subscribe(status => {
      this.isUserLoggedIn = status;
      
      // Initialize notification integrator when user is logged in
      if (status) {
        this.notificationIntegrator.initialize().catch(error => {
          console.error('Failed to initialize notifications:', error);
        });
      }
    });
  }
}
