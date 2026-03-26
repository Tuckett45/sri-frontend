import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../../services/auth.service';
import { DashboardView, resolveDashboardView } from '../../models/dashboard.models';

/**
 * Home Dashboard Component — thin host.
 *
 * Subscribes to the current user role and delegates rendering
 * to the appropriate role-specific child dashboard via ngSwitch.
 */
@Component({
  selector: 'app-home-dashboard',
  templateUrl: './home-dashboard.component.html',
  styleUrls: ['./home-dashboard.component.scss']
})
export class HomeDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  currentView: DashboardView = 'default';

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.authService.getUserRole$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(role => {
        if (role == null) {
          console.warn('HomeDashboardComponent: user role is null/undefined, falling back to default dashboard');
        }
        this.currentView = resolveDashboardView(role);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
