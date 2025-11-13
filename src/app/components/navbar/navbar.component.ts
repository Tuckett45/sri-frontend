import { Component, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { User } from 'src/app/models/user.model';

interface NavLink {
  label: string;
  route: string;
  shouldShow: () => boolean;
  exact?: boolean;
}

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  standalone: false
})
export class NavbarComponent implements OnInit, OnDestroy {
  isMenuOpen = false;  // Track if the menu is open or not
  userData!: User;
  readonly exactMatchOptions = { exact: true };
  readonly partialMatchOptions = { exact: false };

  public readonly navLinksConfig: NavLink[] = [
    {
      label: 'Overview',
      route: '/overview',
      shouldShow: () => this.authService.isClient() || this.authService.isCM() || this.authService.isAdmin() || this.authService.isPM()
    },
    {
      label: 'Deployments',
      route: '/deployments',
      shouldShow: () => this.authService.isAdmin()
    },
    {
      label: 'Prelim Punch List',
      route: '/preliminary-punch-list',
      shouldShow: () => this.authService.isCM() || this.authService.isAdmin() || this.authService.isPM()
    },
    {
      label: 'Street Sheet',
      route: '/street-sheet',
      shouldShow: () => this.authService.isCM() || this.authService.isAdmin() || this.authService.isTemp()
    },
    {
      label: 'OSP Coordinator',
      route: '/osp-coordinator-tracker',
      shouldShow: () => this.authService.isCoordinator() || this.authService.isAdmin()
    },
    {
      label: 'Market Controller',
      route: '/market-controller-tracker',
      shouldShow: () => this.authService.isMarketController() || this.authService.isAdmin()
    },
    {
      label: 'TPS Dashboard',
      route: '/tps',
      shouldShow: () => this.authService.isAdmin() || this.authService.isClient()
    },
    {
      label: 'Expenses',
      route: '/expenses',
      shouldShow: () => this.authService.isAdmin() || this.authService.isHR()
    },
    {
      label: 'Profile',
      route: '/profile',
      shouldShow: () => true,
      exact: true
    }
  ];

  private readonly maxInlineLinks = 4;
  private isMobileView = false;

  constructor(public authService: AuthService) {}

  ngOnInit(): void {
    this.loadUserProfile();
    this.updateViewMode();
    window.addEventListener('resize', this.handleResize);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.handleResize);
  }

  get primaryLinks(): NavLink[] {
    return this.isMobileView
      ? this.visibleLinks
      : this.visibleLinks.slice(0, this.maxInlineLinks);
  }

  get extraLinks(): NavLink[] {
    return this.isMobileView
      ? []
      : this.visibleLinks.slice(this.maxInlineLinks);
  }

  private get visibleLinks(): NavLink[] {
    return this.navLinksConfig.filter(link => link.shouldShow());
  }

  getMatchOptions(link: NavLink) {
    return link.exact ? this.exactMatchOptions : this.partialMatchOptions;
  }

  // Function to toggle the menu on and off
  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  isMobile(): boolean {
    return this.isMobileView;
  }

  private readonly handleResize = () => this.updateViewMode();

  private updateViewMode(): void {
    const wasMobile = this.isMobileView;
    this.isMobileView = window.innerWidth <= 768;
    if (!this.isMobileView && wasMobile) {
      this.isMenuOpen = false;
    }
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
