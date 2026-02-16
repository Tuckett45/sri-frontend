# Progressive Web App (PWA) Setup

The Field Resource Management application is configured as a Progressive Web App (PWA) to provide offline capability and native app-like experience for field technicians.

## Features

### Offline Support
- **Cache-First Strategy**: Static assets (HTML, CSS, JS) are cached for instant loading
- **Network-First Strategy**: API calls attempt network first, fall back to cache
- **Offline Fallback**: Custom offline page when no connection available
- **Background Sync**: Queue actions when offline, sync when connection restored

### Installation
- **Add to Home Screen**: Users can install the app on mobile devices
- **Standalone Mode**: Runs in full-screen without browser UI
- **App Icons**: Custom icons for all device sizes
- **Splash Screen**: Branded loading screen on app launch

### Performance
- **Instant Loading**: Cached assets load immediately
- **Reduced Data Usage**: Cached resources reduce network requests
- **Faster Navigation**: Pre-cached routes load instantly

## Configuration Files

### 1. Service Worker Config (`ngsw-config.json`)

Defines caching strategies:

```json
{
  "assetGroups": [
    {
      "name": "app",
      "installMode": "prefetch",  // Cache immediately
      "resources": {
        "files": ["/favicon.ico", "/index.html", "/*.css", "/*.js"]
      }
    },
    {
      "name": "assets",
      "installMode": "lazy",      // Cache on first access
      "updateMode": "prefetch",
      "resources": {
        "files": ["/assets/**", "/*.(svg|jpg|png|...)"]
      }
    }
  ],
  "dataGroups": [
    {
      "name": "api-cache",
      "urls": ["/api/**"],
      "cacheConfig": {
        "strategy": "freshness",  // Network-first
        "maxSize": 100,
        "maxAge": "1h",
        "timeout": "10s"
      }
    }
  ]
}
```

### 2. Web App Manifest (`src/manifest.webmanifest`)

Defines app metadata:

```json
{
  "name": "Field Resource Management - ATLAS",
  "short_name": "FRM",
  "theme_color": "#1E5A8E",
  "background_color": "#FFFFFF",
  "display": "standalone",
  "icons": [...]
}
```

### 3. Service Worker Registration (`src/app/app.module.ts`)

```typescript
ServiceWorkerModule.register('ngsw-worker.js', {
  enabled: environment.production,
  registrationStrategy: 'registerWhenStable:30000'
})
```

## Caching Strategies

### Cache-First (Static Assets)
1. Check cache
2. Return cached version if available
3. Fetch from network if not cached
4. Cache network response for future use

**Use for**: HTML, CSS, JavaScript, images, fonts

### Network-First (API Calls)
1. Attempt network request
2. Return network response if successful
3. Fall back to cache if network fails
4. Update cache with network response

**Use for**: API endpoints, dynamic data

### Performance Strategy (Frequently Accessed Data)
1. Return cached version immediately
2. Fetch from network in background
3. Update cache with fresh data
4. Notify app of updates

**Use for**: Technician lists, job lists, assignments

## Testing PWA Features

### Local Testing

1. **Build for production**:
   ```bash
   ng build --configuration production
   ```

2. **Serve with HTTP server**:
   ```bash
   npx http-server -p 8080 -c-1 dist/sri-frontend
   ```

3. **Open in browser**:
   ```
   http://localhost:8080
   ```

4. **Test offline**:
   - Open DevTools → Application → Service Workers
   - Check "Offline" checkbox
   - Reload page - should show cached content

### Chrome DevTools Testing

1. **Application Tab**:
   - Service Workers: View registration status
   - Cache Storage: Inspect cached resources
   - Manifest: Verify app manifest

2. **Lighthouse Audit**:
   - Run PWA audit
   - Check for PWA best practices
   - Verify installability

3. **Network Tab**:
   - Filter by "Service Worker"
   - Verify cache hits vs network requests

### Mobile Device Testing

#### Android (Chrome)
1. Open app in Chrome
2. Tap menu → "Add to Home Screen"
3. Verify icon appears on home screen
4. Launch app from home screen
5. Test offline by enabling Airplane Mode

#### iOS (Safari)
1. Open app in Safari
2. Tap Share → "Add to Home Screen"
3. Verify icon appears on home screen
4. Launch app from home screen
5. Test offline by enabling Airplane Mode

## Offline Capabilities

### What Works Offline

✅ **View Cached Data**:
- Today's job assignments
- Technician profiles
- Recent activity
- Saved reports

✅ **Navigate**:
- Between cached pages
- View job details
- Access technician information

✅ **Queue Actions**:
- Status updates
- Time entries
- Notes

### What Requires Connection

❌ **Real-Time Updates**:
- SignalR notifications
- Live job assignments
- Conflict detection

❌ **Data Modifications**:
- Create new jobs
- Update technician profiles
- Upload attachments

❌ **Reports**:
- Generate new reports
- Export data

## Background Sync

When offline, user actions are queued and synced when connection is restored:

```typescript
// Example: Queue status update when offline
if (!navigator.onLine) {
  await queueStatusUpdate(jobId, status);
  showNotification('Update queued - will sync when online');
}

// Sync when connection restored
window.addEventListener('online', async () => {
  await syncQueuedActions();
  showNotification('Updates synced successfully');
});
```

## Update Strategy

### Automatic Updates
- Service worker checks for updates every 24 hours
- Updates downloaded in background
- User prompted to reload for new version

### Manual Update Check
```typescript
import { SwUpdate } from '@angular/service-worker';

constructor(private swUpdate: SwUpdate) {
  this.swUpdate.checkForUpdate();
}
```

### Version Notification
```typescript
this.swUpdate.versionUpdates.subscribe(event => {
  if (event.type === 'VERSION_READY') {
    if (confirm('New version available. Load new version?')) {
      window.location.reload();
    }
  }
});
```

## Performance Optimization

### Pre-caching Critical Routes
```json
{
  "navigationUrls": [
    "/",
    "/dashboard",
    "/jobs",
    "/technicians",
    "/schedule"
  ]
}
```

### Cache Size Management
- Maximum cache size: 100 items per data group
- Oldest items evicted when limit reached
- Cache cleared on app update

### Network Timeout
- API requests timeout after 10 seconds
- Falls back to cache on timeout
- Prevents long waits on slow connections

## Troubleshooting

### Service Worker Not Registering
1. Check HTTPS (required for service workers)
2. Verify `ngsw-worker.js` is in dist folder
3. Check browser console for errors
4. Clear browser cache and reload

### Cache Not Updating
1. Unregister service worker in DevTools
2. Clear cache storage
3. Reload page
4. Service worker will re-register

### Offline Page Not Showing
1. Verify `offline.html` is in assets
2. Check service worker configuration
3. Test with DevTools offline mode

### App Not Installable
1. Run Lighthouse PWA audit
2. Check manifest.webmanifest is valid
3. Verify HTTPS connection
4. Ensure icons are correct sizes

## Best Practices

### 1. Cache Strategically
- Cache frequently accessed data
- Don't cache sensitive information
- Set appropriate cache expiration

### 2. Handle Offline Gracefully
- Show clear offline indicators
- Queue actions for later sync
- Provide helpful error messages

### 3. Update Regularly
- Check for updates on app launch
- Notify users of new versions
- Provide easy update mechanism

### 4. Test Thoroughly
- Test on real devices
- Test various network conditions
- Test cache invalidation

### 5. Monitor Performance
- Track cache hit rates
- Monitor service worker errors
- Measure offline usage

## Resources

- [Angular Service Worker Guide](https://angular.io/guide/service-worker-intro)
- [PWA Best Practices](https://web.dev/pwa-checklist/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)

## Next Steps

1. ✅ Service worker configured
2. ✅ Manifest created
3. ✅ Offline page designed
4. ⚠️ **TODO**: Add app icons (see `src/assets/icons/README.md`)
5. ⚠️ **TODO**: Test on mobile devices
6. ⚠️ **TODO**: Implement background sync for queued actions
7. ⚠️ **TODO**: Add update notification UI
