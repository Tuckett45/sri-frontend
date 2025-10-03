import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { User } from 'src/app/models/user.model';
import { NotificationService } from '../../services/notification.service';

type NavLink = {
  label: string;
  route: string;
  isVisible: () => boolean;
  exact?: boolean;
  cssClass?: string;
  isNotifications?: boolean;
};

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  standalone: false
})
export class NavbarComponent {
  isMenuOpen = false;  // Track if the menu is open or not
  userData!: User;

  readonly notificationsEnabled = this.notificationService.notificationsEnabled;
  readonly unreadCount = this.notificationService.unreadCount;
  readonly exactMatchOptions = { exact: true } as const;
  readonly defaultMatchOptions = { exact: false } as const;

  readonly navLinks: NavLink[] = [
    {
      label: 'Overview',
      route: '/overview',
      isVisible: () =>
        this.authService.isClient() ||
        this.authService.isCM() ||
        this.authService.isAdmin() ||
        this.authService.isPM()
    },
    {
      label: 'Deployments',
      route: '/deployments',
      isVisible: () =>
        this.authService.isAdmin() ||
        this.authService.isPM() ||
        this.authService.isCM() ||
        this.authService.isClient() ||
        this.authService.isCoordinator()
    },
    {
      label: 'Prelim Punch List Tracker',
      route: '/preliminary-punch-list',
      isVisible: () =>
        this.authService.isCM() ||
        this.authService.isAdmin() ||
        this.authService.isPM()
    },
    {
      label: 'Street Sheet Tracker',
      route: '/street-sheet',
      isVisible: () =>
        this.authService.isCM() ||
        this.authService.isAdmin() ||
        this.authService.isTemp()
    },
    {
      label: 'OSP Coordinator',
      route: '/osp-coordinator-tracker',
      isVisible: () =>
        this.authService.isCoordinator() ||
        this.authService.isAdmin()
    },
    {
      label: 'Market Controller',
      route: '/market-controller-tracker',
      isVisible: () =>
        this.authService.isMarketController() ||
        this.authService.isAdmin()
    },
    {
      label: 'Expenses',
      route: '/expenses',
      isVisible: () => this.authService.isAdmin() ||
        this.authService.isHR()
    },
    {
      label: 'TPS',
      route: '/tps',
      isVisible: () =>
        this.authService.isAdmin() ||
        this.authService.isClient()
    },
    {
      label: 'Profile',
      route: '/profile',
      exact: true,
      isVisible: () => true
    },
    {
      label: 'Notifications',
      route: '/notifications',
      cssClass: 'notifications-link',
      isNotifications: true,
      isVisible: () => this.notificationsEnabled()
    }
  ];

  constructor(
    public authService: AuthService,
    private readonly notificationService: NotificationService
  ) {}

  // Function to toggle the menu on and off
  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  loadUserProfile(): void {
    const userString = localStorage.getItem('user');
    if (userString) {
      const userObj = JSON.parse(userString);

      this.userData = new User(
        userObj.id,
        userObj.name,
        userObj.email,
        userObj.password,
        userObj.role,
        userObj.market,
        userObj.company,
        new Date(userObj.createdDate),
        userObj.isApproved,
        userObj.approvalToken
      );
    }
  }

  logout(): void {
    this.authService.logout();
  }
}

