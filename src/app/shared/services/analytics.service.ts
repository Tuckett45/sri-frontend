import { Injectable, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { environment } from 'src/environments/environments';

/**
 * Analytics Service for Google Analytics 4 integration
 * 
 * Provides privacy-compliant tracking of user interactions, page views,
 * and custom events throughout the Field Resource Management application.
 * 
 * Features:
 * - Automatic page view tracking on route changes
 * - Custom event tracking for key user actions
 * - Custom dimensions for role-based analytics
 * - Privacy-compliant (IP anonymization, no PII tracking)
 * - Respects user consent preferences
 */
@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private readonly router = inject(Router);
  private isInitialized = false;
  private trackingEnabled = false;

  /**
   * Initialize Google Analytics
   * Should be called once during app initialization
   */
  initialize(): void {
    if (this.isInitialized) {
      console.warn('Analytics already initialized');
      return;
    }

    // Only initialize if tracking ID is configured
    if (!environment.googleAnalyticsId) {
      console.log('Google Analytics not configured - tracking disabled');
      this.isInitialized = true;
      return;
    }

    try {
      // Load gtag.js script
      this.loadGtagScript();

      // Initialize gtag
      this.initializeGtag();

      // Set up automatic page view tracking
      this.setupPageViewTracking();

      this.isInitialized = true;
      this.trackingEnabled = true;
      console.log('Google Analytics initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Analytics:', error);
      this.isInitialized = true;
      this.trackingEnabled = false;
    }
  }

  /**
   * Load the Google Analytics gtag.js script
   */
  private loadGtagScript(): void {
    if (typeof window === 'undefined') {
      return; // Skip in SSR
    }

    // Check if script already exists
    if (document.querySelector(`script[src*="googletagmanager.com/gtag/js"]`)) {
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${environment.googleAnalyticsId}`;
    document.head.appendChild(script);
  }

  /**
   * Initialize gtag function and configure GA4
   */
  private initializeGtag(): void {
    if (typeof window === 'undefined') {
      return;
    }

    // Initialize dataLayer
    (window as any).dataLayer = (window as any).dataLayer || [];
    
    // Define gtag function
    (window as any).gtag = function() {
      (window as any).dataLayer.push(arguments);
    };

    // Initialize with timestamp
    (window as any).gtag('js', new Date());

    // Configure GA4 with privacy settings
    (window as any).gtag('config', environment.googleAnalyticsId, {
      anonymize_ip: true, // Anonymize IP addresses
      send_page_view: false, // We'll handle page views manually
      cookie_flags: 'SameSite=None;Secure', // Cookie security
    });
  }

  /**
   * Set up automatic page view tracking on route changes
   */
  private setupPageViewTracking(): void {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.trackPageView(event.urlAfterRedirects);
      });
  }

  /**
   * Track a page view
   * @param path - The page path (defaults to current route)
   * @param title - Optional page title
   */
  trackPageView(path?: string, title?: string): void {
    if (!this.trackingEnabled) {
      return;
    }

    const pagePath = path || this.router.url;
    const pageTitle = title || document.title;

    this.gtag('event', 'page_view', {
      page_path: pagePath,
      page_title: pageTitle,
      page_location: window.location.href
    });
  }

  /**
   * Track a custom event
   * @param eventName - Name of the event
   * @param eventParams - Optional event parameters
   */
  trackEvent(eventName: string, eventParams?: Record<string, any>): void {
    if (!this.trackingEnabled) {
      return;
    }

    this.gtag('event', eventName, eventParams);
  }

  /**
   * Set user properties for analytics
   * @param properties - User properties (no PII)
   */
  setUserProperties(properties: Record<string, any>): void {
    if (!this.trackingEnabled) {
      return;
    }

    this.gtag('set', 'user_properties', properties);
  }

  /**
   * Track user authentication
   * @param method - Authentication method (e.g., 'jwt', 'oauth')
   */
  trackLogin(method: string = 'jwt'): void {
    this.trackEvent('login', {
      method: method
    });
  }

  /**
   * Track user logout
   */
  trackLogout(): void {
    this.trackEvent('logout');
  }

  /**
   * Track job creation
   * @param jobPriority - Priority of the job
   * @param market - Market identifier (anonymized)
   */
  trackJobCreated(jobPriority: string, market?: string): void {
    this.trackEvent('job_created', {
      job_priority: jobPriority,
      market: market
    });
  }

  /**
   * Track job update
   * @param status - New job status
   */
  trackJobUpdated(status: string): void {
    this.trackEvent('job_updated', {
      job_status: status
    });
  }

  /**
   * Track job deletion
   */
  trackJobDeleted(): void {
    this.trackEvent('job_deleted');
  }

  /**
   * Track technician assignment
   * @param assignmentType - Type of assignment (e.g., 'manual', 'automatic')
   */
  trackTechnicianAssigned(assignmentType: string = 'manual'): void {
    this.trackEvent('technician_assigned', {
      assignment_type: assignmentType
    });
  }

  /**
   * Track assignment acceptance
   */
  trackAssignmentAccepted(): void {
    this.trackEvent('assignment_accepted');
  }

  /**
   * Track assignment rejection
   * @param reason - Optional rejection reason
   */
  trackAssignmentRejected(reason?: string): void {
    this.trackEvent('assignment_rejected', {
      rejection_reason: reason
    });
  }

  /**
   * Track location tracking toggle
   * @param enabled - Whether tracking was enabled or disabled
   */
  trackLocationTrackingToggle(enabled: boolean): void {
    this.trackEvent('location_tracking_toggle', {
      enabled: enabled
    });
  }

  /**
   * Track report generation
   * @param reportType - Type of report generated
   * @param format - Export format (e.g., 'csv', 'pdf')
   */
  trackReportGenerated(reportType: string, format: string): void {
    this.trackEvent('report_generated', {
      report_type: reportType,
      export_format: format
    });
  }

  /**
   * Track map interaction
   * @param interactionType - Type of interaction (e.g., 'zoom', 'marker_click')
   */
  trackMapInteraction(interactionType: string): void {
    this.trackEvent('map_interaction', {
      interaction_type: interactionType
    });
  }

  /**
   * Track search usage
   * @param searchType - Type of search (e.g., 'technician', 'job')
   * @param hasResults - Whether search returned results
   */
  trackSearch(searchType: string, hasResults: boolean): void {
    this.trackEvent('search', {
      search_type: searchType,
      has_results: hasResults
    });
  }

  /**
   * Track filter usage
   * @param filterType - Type of filter applied
   * @param filterCount - Number of filters applied
   */
  trackFilterApplied(filterType: string, filterCount: number): void {
    this.trackEvent('filter_applied', {
      filter_type: filterType,
      filter_count: filterCount
    });
  }

  /**
   * Track error occurrence
   * @param errorType - Type of error
   * @param errorMessage - Error message (sanitized, no PII)
   * @param fatal - Whether error is fatal
   */
  trackError(errorType: string, errorMessage: string, fatal: boolean = false): void {
    this.trackEvent('error', {
      error_type: errorType,
      error_message: errorMessage,
      fatal: fatal
    });
  }

  /**
   * Track crew creation
   */
  trackCrewCreated(): void {
    this.trackEvent('crew_created');
  }

  /**
   * Track crew update
   */
  trackCrewUpdated(): void {
    this.trackEvent('crew_updated');
  }

  /**
   * Track offline mode activation
   */
  trackOfflineMode(enabled: boolean): void {
    this.trackEvent('offline_mode', {
      enabled: enabled
    });
  }

  /**
   * Track notification interaction
   * @param action - Action taken (e.g., 'clicked', 'dismissed')
   */
  trackNotificationInteraction(action: string): void {
    this.trackEvent('notification_interaction', {
      action: action
    });
  }

  /**
   * Helper method to call gtag
   */
  private gtag(...args: any[]): void {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag(...args);
    }
  }

  /**
   * Check if analytics is enabled
   */
  isEnabled(): boolean {
    return this.trackingEnabled;
  }

  /**
   * Disable analytics tracking (for user consent)
   */
  disable(): void {
    this.trackingEnabled = false;
    console.log('Analytics tracking disabled');
  }

  /**
   * Enable analytics tracking (after user consent)
   */
  enable(): void {
    if (this.isInitialized && environment.googleAnalyticsId) {
      this.trackingEnabled = true;
      console.log('Analytics tracking enabled');
    }
  }
}
