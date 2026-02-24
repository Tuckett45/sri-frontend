import { Component, OnDestroy, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { User } from 'src/app/models/user.model';
import { FeatureFlagService } from '../../services/feature-flag.service';
import { UserRole } from '../../models/role.enum';

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
  private readonly maxInlineLinks = 5;
  private readonly pinnedRoutes: ReadonlyArray<string> = ['/notifications'];
  private readonly featureFlags = inject(FeatureFlagService);

  public readonly navLinksConfig: NavLink[] = [
    {
      label: 'Overview',
      route: '/overview',
      shouldShow: () => this.authService.isClient() || this.authService.isCM() || this.authService.isAdmin() || this.authService.isPM()
    },
    {
      label: 'CM Dashboard',
      route: '/field-resource-management/cm/dashboard',
      shouldShow: () => this.authService.isCM() || this.authService.isAdmin()
    },
    {
      label: 'Admin Dashboard',
      route: '/field-resource-management/admin-dashboard',
      shouldShow: () => this.authService.isAdmin()
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
      label: 'Notifications',
      route: '/notifications',
      shouldShow: () => this.featureFlags.flagEnabled('notifications')()
    },
    {
      label: 'ATLAS',
      route: '/atlas',
      shouldShow: () => this.featureFlags.flagEnabled('atlas')()
    },
    {
      label: 'Field Resources',
      route: '/field-resource-management',
      shouldShow: () => {
        // Show for Admin, Dispatcher roles (PM, CM, OSPCoordinator), and Technician roles
        return this.authService.isAdmin() || 
               this.authService.isPM() || 
               this.authService.isCM() || 
               this.authService.isCoordinator() ||
               this.authService.isUserInRole([UserRole.Technician, UserRole.DeploymentEngineer, UserRole.SRITech]);
      }
    },
    {
      label: 'User Management',
      route: '/field-resource-management/admin/users',
      shouldShow: () => this.authService.isAdmin()
    },
    {
      label: 'System Configuration',
      route: '/field-resource-management/system-configuration',
      shouldShow: () => this.authService.isAdmin()
    },
    {
      label: 'Approvals',
      route: '/admin/user-approvals',
      shouldShow: () => this.authService.isAdmin() || this.authService.isHR()
    },
    {
      label: 'Profile',
      route: '/profile',
      shouldShow: () => true,
      exact: true
    }
  ];

  private isMobileView = false;

  constructor(
    public authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUserProfile();
    this.updateViewMode();
    window.addEventListener('resize', this.handleResize);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.handleResize);
  }

  get primaryLinks(): NavLink[] {
    if (this.isMobileView) {
      return this.visibleLinks;
    }

    const visible = this.visibleLinks;
    const pinned = visible.filter(link => this.pinnedRoutes.includes(link.route));
    const remainingSlots = Math.max(this.maxInlineLinks - pinned.length, 0);
    const nonPinned = visible.filter(link => !this.pinnedRoutes.includes(link.route));

    return [...pinned, ...nonPinned.slice(0, remainingSlots)];
  }

  get extraLinks(): NavLink[] {
    if (this.isMobileView) {
      return [];
    }

    const primarySet = new Set(this.primaryLinks.map(link => link.route));
    return this.visibleLinks.filter(link => !primarySet.has(link.route));
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
    const width = window.innerWidth;
    this.isMobileView = width <= 768;

    if (!this.isMobileView && wasMobile) {
      this.isMenuOpen = false;
    }

    // Force change detection to ensure UI updates
    this.cdr.detectChanges();
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
