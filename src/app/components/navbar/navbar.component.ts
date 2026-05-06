import { Component, OnDestroy, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
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
      label: 'Phase Dashboard',
      route: '/admin-dashboard/overview',
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
      shouldShow: () => this.authService.isCM() || this.authService.isAdmin() || this.authService.isPM() || this.authService.isEngineeringFieldSupport() || this.authService.isMaterialsManager()
    },
    {
      label: 'Street Sheet',
      route: '/street-sheet',
      shouldShow: () => this.authService.isCM() || this.authService.isAdmin() || this.authService.isTemp() || this.authService.isEngineeringFieldSupport() || this.authService.isMaterialsManager()
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
    // {
    //   label: 'TPS Dashboard',
    //   route: '/tps',
    //   shouldShow: () => this.authService.isAdmin() || this.authService.isClient()
    // },
    {
      label: 'Expenses',
      route: '/expenses',
      shouldShow: () => this.authService.isAdmin() || this.authService.isHR() || this.authService.isPayroll()
    },
    {
      label: 'Notifications',
      route: '/notifications',
      shouldShow: () => this.featureFlags.flagEnabled('notifications')()
    },
    {
      label: 'Agents',
      route: '/atlas',
      shouldShow: () => this.featureFlags.flagEnabled('atlas')()
    },
    {
      label: 'Field Resources',
      route: '/field-resource-management',
      shouldShow: () => {
        return this.authService.isUserInRole([
          UserRole.User,
          UserRole.Technician,
          UserRole.CM,
          UserRole.Admin,
          UserRole.HR,
          UserRole.Payroll,
          UserRole.OSPCoordinator,
          UserRole.Controller,
          UserRole.EngineeringFieldSupport,
          UserRole.MaterialsManager,
          UserRole.PM
        ]);
      }
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
  private currentUrl = '';
  private routerSub!: Subscription;

  constructor(
    public authService: AuthService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUserProfile();
    this.updateViewMode();
    this.currentUrl = this.router.url;
    this.routerSub = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe(event => {
      this.currentUrl = event.urlAfterRedirects || event.url;
      this.cdr.detectChanges();
    });
    window.addEventListener('resize', this.handleResize);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.handleResize);
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
  }

  get primaryLinks(): NavLink[] {
    if (this.isMobileView) {
      return this.visibleLinks;
    }

    const visible = this.visibleLinks;
    const pinned = visible.filter(link => this.pinnedRoutes.includes(link.route));
    const remainingSlots = Math.max(this.maxInlineLinks - pinned.length, 0);
    const nonPinned = visible.filter(link => !this.pinnedRoutes.includes(link.route));

    let primary = [...pinned, ...nonPinned.slice(0, remainingSlots)];

    // If the active route is not in the primary set, swap it into the last non-pinned slot
    const activeLink = visible.find(link => this.isLinkActive(link));
    if (activeLink && !primary.includes(activeLink) && !this.pinnedRoutes.includes(activeLink.route)) {
      const lastNonPinnedIndex = this.findLastNonPinnedIndex(primary);
      if (lastNonPinnedIndex >= 0) {
        primary[lastNonPinnedIndex] = activeLink;
      }
    }

    return primary;
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

  /**
   * Checks if a nav link matches the current URL.
   * Uses startsWith for partial matching (most links) or exact match when configured.
   */
  private isLinkActive(link: NavLink): boolean {
    if (link.exact) {
      return this.currentUrl === link.route;
    }
    return this.currentUrl.startsWith(link.route);
  }

  /**
   * Finds the index of the last non-pinned link in the primary array.
   * This is the slot that gets swapped out for the active link.
   */
  private findLastNonPinnedIndex(primary: NavLink[]): number {
    for (let i = primary.length - 1; i >= 0; i--) {
      if (!this.pinnedRoutes.includes(primary[i].route)) {
        return i;
      }
    }
    return -1;
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
