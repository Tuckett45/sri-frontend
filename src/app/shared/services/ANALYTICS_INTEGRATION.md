# Analytics Integration Guide

## Overview

The Field Resource Management application integrates Google Analytics 4 (GA4) to track user behavior, page views, and key interactions. This integration is privacy-compliant and respects user consent preferences.

## Features

- **Automatic Page View Tracking**: Tracks page views on route changes
- **Custom Event Tracking**: Tracks key user actions throughout the application
- **Custom Dimensions**: Tracks role-based analytics (user role, market)
- **Privacy-Compliant**: IP anonymization, no PII tracking
- **User Consent**: Respects user consent preferences

## Setup

### 1. Configure Google Analytics Tracking ID

Update the environment files with your GA4 Measurement ID:

**Production** (`src/environments/environments.ts`):
```typescript
export const environment = {
  // ... other config
  googleAnalyticsId: 'G-XXXXXXXXXX' // Replace with actual GA4 Measurement ID
};
```

**Staging** (`src/environments/environments.ts`):
```typescript
export const staging_environment = {
  // ... other config
  googleAnalyticsId: 'G-YYYYYYYYYY' // Replace with staging GA4 Measurement ID
};
```

**Local Development** (`src/environments/environments.ts`):
```typescript
export const local_environment = {
  // ... other config
  googleAnalyticsId: undefined // Disable analytics in local development
};
```

### 2. Initialize Analytics Service

The analytics service is automatically initialized in `app.component.ts` during application startup:

```typescript
async ngOnInit(): Promise<void> {
  // ... other initialization
  
  // Initialize analytics service
  this.analyticsService.initialize();
  
  // Track login and set user properties
  this.authService.getAuthState().subscribe(authState => {
    if (authState.isAuthenticated) {
      this.analyticsService.trackLogin();
      this.analyticsService.setUserProperties({
        user_role: user.role,
        market: user.market
      });
    }
  });
}
```

## Tracked Events

### Authentication Events

- **Login**: `trackLogin(method: string)`
- **Logout**: `trackLogout()`

### Job Management Events

- **Job Created**: `trackJobCreated(jobPriority: string, market?: string)`
- **Job Updated**: `trackJobUpdated(status: string)`
- **Job Deleted**: `trackJobDeleted()`

### Assignment Events

- **Technician Assigned**: `trackTechnicianAssigned(assignmentType: string)`
- **Assignment Accepted**: `trackAssignmentAccepted()`
- **Assignment Rejected**: `trackAssignmentRejected(reason?: string)`

### Location Tracking Events

- **Location Tracking Toggle**: `trackLocationTrackingToggle(enabled: boolean)`

### Reporting Events

- **Report Generated**: `trackReportGenerated(reportType: string, format: string)`

### Map Events

- **Map Interaction**: `trackMapInteraction(interactionType: string)`

### Search and Filter Events

- **Search**: `trackSearch(searchType: string, hasResults: boolean)`
- **Filter Applied**: `trackFilterApplied(filterType: string, filterCount: number)`

### Crew Management Events

- **Crew Created**: `trackCrewCreated()`
- **Crew Updated**: `trackCrewUpdated()`

### System Events

- **Offline Mode**: `trackOfflineMode(enabled: boolean)`
- **Notification Interaction**: `trackNotificationInteraction(action: string)`
- **Error**: `trackError(errorType: string, errorMessage: string, fatal: boolean)`

## Usage Examples

### Example 1: Track Job Creation

```typescript
import { AnalyticsService } from '@shared/services';

export class JobFormComponent {
  private analyticsService = inject(AnalyticsService);

  onSubmit(): void {
    this.jobService.createJob(this.jobForm.value).subscribe(
      job => {
        // Track job creation
        this.analyticsService.trackJobCreated(
          job.priority,
          job.market
        );
        
        this.router.navigate(['/jobs', job.id]);
      }
    );
  }
}
```

### Example 2: Track Assignment Acceptance

```typescript
import { AnalyticsService } from '@shared/services';

export class AssignmentCardComponent {
  private analyticsService = inject(AnalyticsService);

  acceptAssignment(): void {
    this.assignmentService.acceptAssignment(this.assignment.id).subscribe(
      () => {
        // Track assignment acceptance
        this.analyticsService.trackAssignmentAccepted();
        
        this.notificationService.success('Assignment accepted');
      }
    );
  }
}
```

### Example 3: Track Report Generation

```typescript
import { AnalyticsService } from '@shared/services';

export class ReportingComponent {
  private analyticsService = inject(AnalyticsService);

  exportReport(format: 'csv' | 'pdf'): void {
    this.reportingService.generateReport(this.reportType, format).subscribe(
      blob => {
        // Track report generation
        this.analyticsService.trackReportGenerated(
          this.reportType,
          format
        );
        
        this.fileDownloadService.download(blob, `report.${format}`);
      }
    );
  }
}
```

### Example 4: Track Map Interactions

```typescript
import { AnalyticsService } from '@shared/services';

export class MapComponent {
  private analyticsService = inject(AnalyticsService);

  onMarkerClick(marker: Marker): void {
    // Track map interaction
    this.analyticsService.trackMapInteraction('marker_click');
    
    this.showMarkerDetails(marker);
  }

  onZoomChange(): void {
    // Track map interaction
    this.analyticsService.trackMapInteraction('zoom');
  }
}
```

### Example 5: Track Search Usage

```typescript
import { AnalyticsService } from '@shared/services';

export class TechnicianListComponent {
  private analyticsService = inject(AnalyticsService);

  onSearch(query: string): void {
    this.technicianService.search(query).subscribe(
      results => {
        // Track search usage
        this.analyticsService.trackSearch(
          'technician',
          results.length > 0
        );
        
        this.technicians = results;
      }
    );
  }
}
```

### Example 6: Track Error Events

```typescript
import { AnalyticsService } from '@shared/services';

export class ErrorHandlerService {
  private analyticsService = inject(AnalyticsService);

  handleError(error: Error): void {
    // Track error
    this.analyticsService.trackError(
      error.name,
      error.message,
      false // not fatal
    );
    
    this.notificationService.error('An error occurred');
  }
}
```

## Privacy Considerations

### IP Anonymization

The analytics service automatically anonymizes IP addresses:

```typescript
gtag('config', environment.googleAnalyticsId, {
  anonymize_ip: true
});
```

### No PII Tracking

**DO NOT** track personally identifiable information (PII):

❌ **Bad Examples**:
```typescript
// DON'T track names
this.analyticsService.trackEvent('user_action', {
  user_name: 'John Doe' // PII!
});

// DON'T track emails
this.analyticsService.trackEvent('user_action', {
  email: 'john@example.com' // PII!
});

// DON'T track phone numbers
this.analyticsService.trackEvent('user_action', {
  phone: '555-1234' // PII!
});
```

✅ **Good Examples**:
```typescript
// DO track anonymized identifiers
this.analyticsService.trackEvent('user_action', {
  user_role: 'CM',
  market: 'DALLAS'
});

// DO track aggregated data
this.analyticsService.trackJobCreated('HIGH', 'DALLAS');
```

### User Consent

Respect user consent preferences:

```typescript
// Disable tracking if user opts out
if (!userConsent.analytics) {
  this.analyticsService.disable();
}

// Enable tracking if user opts in
if (userConsent.analytics) {
  this.analyticsService.enable();
}
```

## Custom Dimensions

The analytics service supports custom dimensions for role-based analytics:

```typescript
this.analyticsService.setUserProperties({
  user_role: 'CM',        // User role (Admin, CM, PM, Technician)
  market: 'DALLAS',       // Market identifier
  company: 'ACME_CORP'    // Company identifier (for PM/Vendor)
});
```

## Testing

### Unit Tests

The analytics service includes comprehensive unit tests:

```bash
npm test -- --include='**/analytics.service.spec.ts'
```

### Manual Testing

1. **Enable Analytics in Development**:
   ```typescript
   export const local_environment = {
     // ... other config
     googleAnalyticsId: 'G-TEST123' // Use test tracking ID
   };
   ```

2. **Open Browser DevTools**:
   - Open Network tab
   - Filter by "google-analytics.com"
   - Verify events are being sent

3. **Use GA4 DebugView**:
   - Install Google Analytics Debugger extension
   - Navigate through the application
   - Verify events in GA4 DebugView

## Troubleshooting

### Analytics Not Tracking

1. **Check Configuration**:
   ```typescript
   console.log('GA ID:', environment.googleAnalyticsId);
   console.log('Analytics Enabled:', this.analyticsService.isEnabled());
   ```

2. **Check Browser Console**:
   - Look for initialization messages
   - Check for JavaScript errors

3. **Check Network Tab**:
   - Verify gtag.js script is loaded
   - Verify analytics requests are being sent

### Events Not Appearing in GA4

1. **Wait for Processing**: GA4 can take 24-48 hours to process events
2. **Use DebugView**: Real-time event verification in GA4 DebugView
3. **Check Event Names**: Ensure event names match GA4 conventions

## Best Practices

1. **Track Meaningful Events**: Only track events that provide actionable insights
2. **Use Consistent Naming**: Follow a consistent naming convention for events
3. **Avoid Over-Tracking**: Don't track every single user interaction
4. **Respect Privacy**: Never track PII or sensitive information
5. **Test Thoroughly**: Test analytics in staging before production deployment
6. **Monitor Performance**: Ensure analytics doesn't impact application performance
7. **Document Events**: Keep this documentation updated with new events

## GA4 Dashboard Setup

### Recommended Custom Reports

1. **User Role Analysis**:
   - Dimension: user_role
   - Metrics: Active users, Sessions, Events

2. **Market Performance**:
   - Dimension: market
   - Metrics: Job created, Assignment accepted, Report generated

3. **Feature Usage**:
   - Events: job_created, technician_assigned, report_generated
   - Metrics: Event count, Unique users

4. **Error Tracking**:
   - Event: error
   - Dimensions: error_type, fatal
   - Metrics: Error count, Affected users

## Support

For questions or issues with analytics integration:

1. Check this documentation
2. Review the analytics service source code
3. Check GA4 documentation: https://developers.google.com/analytics/devguides/collection/ga4
4. Contact the development team

## References

- [Google Analytics 4 Documentation](https://developers.google.com/analytics/devguides/collection/ga4)
- [gtag.js Reference](https://developers.google.com/analytics/devguides/collection/gtagjs)
- [GA4 Event Reference](https://developers.google.com/analytics/devguides/collection/ga4/reference/events)
- [Privacy Best Practices](https://support.google.com/analytics/answer/9019185)
