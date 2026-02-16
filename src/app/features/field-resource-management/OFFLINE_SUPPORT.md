# Offline Support Documentation

## Overview

The Field Resource Management Tool includes comprehensive offline support using Angular Service Worker and IndexedDB. This allows field technicians to continue working even when network connectivity is limited or unavailable.

## Features

### 1. Service Worker Caching

The application uses Angular Service Worker to cache critical resources and API responses:

- **App Shell**: HTML, CSS, and JavaScript files are cached for instant loading
- **Static Assets**: Images, fonts, and icons are cached lazily
- **API Responses**: Critical API endpoints are cached with different strategies

### 2. Caching Strategies

#### Performance Strategy (Cache-First)
Used for data that doesn't change frequently:
- Dashboard metrics (5 minutes)
- Static data (skills, regions, templates) (1 hour)
- Technician and job lists (5 minutes)

#### Freshness Strategy (Network-First)
Used for data that changes frequently:
- Today's jobs for technicians (10 minutes)
- Real-time updates
- Job status changes

### 3. Offline Action Queue

When offline, user actions are queued in IndexedDB and automatically synced when connectivity is restored:

- **Automatic Queueing**: Actions are automatically queued when offline
- **Automatic Sync**: Queued actions are synced when connection is restored
- **Retry Logic**: Failed actions are retried with exponential backoff
- **Order Preservation**: Actions are synced in the order they were queued

### 4. Offline Indicator

A visual indicator is displayed when the application is offline:

- **Status Display**: Shows "You are offline" message
- **Queue Count**: Displays number of queued actions
- **Manual Sync**: Allows manual retry of sync operation

## Configuration

### Service Worker Configuration

The service worker is configured in `ngsw-config.json`:

```json
{
  "dataGroups": [
    {
      "name": "frm-dashboard",
      "urls": ["/api/field-resource-management/dashboard/**"],
      "cacheConfig": {
        "strategy": "performance",
        "maxSize": 10,
        "maxAge": "5m"
      }
    },
    {
      "name": "frm-today-jobs",
      "urls": ["/api/field-resource-management/jobs/today/**"],
      "cacheConfig": {
        "strategy": "freshness",
        "maxSize": 20,
        "maxAge": "10m"
      }
    }
  ]
}
```

### IndexedDB Configuration

The offline queue uses IndexedDB with the following configuration:

- **Database Name**: `frm-offline-queue`
- **Object Store**: `actions`
- **Indexes**: `timestamp` (for ordering)

## Usage

### For Developers

#### Queueing Actions When Offline

```typescript
import { OfflineQueueService } from './services/offline-queue.service';

constructor(private offlineQueue: OfflineQueueService) {}

async performAction() {
  if (!this.offlineQueue.isCurrentlyOnline()) {
    // Queue action for later sync
    await this.offlineQueue.queueAction(myAction);
  } else {
    // Dispatch action immediately
    this.store.dispatch(myAction);
  }
}
```

#### Checking Online Status

```typescript
const isOnline = this.offlineQueue.isCurrentlyOnline();
```

#### Manual Sync

```typescript
await this.offlineQueue.syncQueuedActions();
```

### For Users

#### Offline Indicator

When offline, a banner appears at the top of the screen showing:
- Offline status
- Number of queued actions
- "Retry Sync" button (if actions are queued)

#### Cached Data

The following data is available offline:
- Dashboard metrics (last 5 minutes)
- Today's jobs (last 10 minutes)
- Technician and job lists (last 5 minutes)
- Static data (skills, regions, templates) (last hour)

#### Limitations

When offline, the following features are limited:
- Real-time updates via SignalR are not available
- New data cannot be fetched from the server
- Actions are queued and synced when online

## Testing Offline Functionality

### Chrome DevTools

1. Open Chrome DevTools (F12)
2. Go to "Network" tab
3. Select "Offline" from the throttling dropdown
4. Test application functionality

### Service Worker

1. Open Chrome DevTools (F12)
2. Go to "Application" tab
3. Select "Service Workers" from the left sidebar
4. View registered service workers and their status
5. Use "Update" button to test service worker updates

### IndexedDB

1. Open Chrome DevTools (F12)
2. Go to "Application" tab
3. Select "IndexedDB" from the left sidebar
4. Expand "frm-offline-queue" database
5. View queued actions in the "actions" object store

## Troubleshooting

### Service Worker Not Updating

If the service worker is not updating:
1. Unregister the service worker in Chrome DevTools
2. Clear browser cache
3. Reload the application

### Queued Actions Not Syncing

If queued actions are not syncing:
1. Check network connectivity
2. Check browser console for errors
3. Manually trigger sync using "Retry Sync" button
4. Clear IndexedDB and try again

### Cache Not Working

If caching is not working:
1. Verify service worker is registered
2. Check `ngsw-config.json` configuration
3. Verify API URLs match the configured patterns
4. Check browser console for service worker errors

## Best Practices

### For Developers

1. **Always check online status** before performing critical operations
2. **Queue actions when offline** to ensure data is not lost
3. **Provide user feedback** when actions are queued
4. **Test offline functionality** regularly during development
5. **Monitor cache size** to avoid excessive storage usage

### For Users

1. **Sync regularly** when online to ensure data is up-to-date
2. **Avoid critical operations** when offline if possible
3. **Check offline indicator** to know when you're offline
4. **Wait for sync** to complete before closing the application

## Future Enhancements

Potential improvements for offline support:

1. **Background Sync API**: Use Background Sync API for more reliable syncing
2. **Conflict Resolution**: Implement conflict resolution for concurrent edits
3. **Selective Sync**: Allow users to choose which data to sync
4. **Offline Analytics**: Track offline usage patterns
5. **Progressive Enhancement**: Gradually enhance offline capabilities based on storage availability
