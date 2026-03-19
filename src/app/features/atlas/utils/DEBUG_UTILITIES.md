# ATLAS Debugging Utilities

This document describes the debugging utilities available for the ATLAS Control Plane integration.

## Overview

The ATLAS debugging utilities provide comprehensive tools for:
- **State Inspection**: Capture and analyze NgRx state snapshots
- **Request/Response Logging**: Track all HTTP traffic with detailed logs
- **Error Reproduction**: Capture error context and generate reproduction scripts

## State Inspector

### Purpose

The State Inspector provides tools for capturing, comparing, and analyzing NgRx state changes. It integrates with Redux DevTools for time-travel debugging.

### Usage

```typescript
import { stateInspector, ReduxDevToolsConfig } from './utils/state-inspector';
import { Store } from '@ngrx/store';

// Capture state snapshot
const snapshot = await stateInspector.captureSnapshot(
  store,
  'LOAD_DEPLOYMENTS_SUCCESS',
  { userId: '123' }
);

// Compare two snapshots
const diff = stateInspector.compareSnapshots(snapshot1, snapshot2);
console.log('Added:', diff.added);
console.log('Modified:', diff.modified);
console.log('Removed:', diff.removed);

// Get state at specific path
const deployments = stateInspector.getStateAtPath(
  snapshot,
  'atlas.deployments.entities'
);

// Export snapshots for sharing
const json = stateInspector.exportSnapshots();
// Share with team or attach to bug report

// Import snapshots for analysis
stateInspector.importSnapshots(json);

// Search snapshots by action
const loginSnapshots = stateInspector.findSnapshotsByAction('Login');
```

### Redux DevTools Integration

Configure Redux DevTools in your module:

```typescript
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { ReduxDevToolsConfig } from './utils/state-inspector';

@NgModule({
  imports: [
    StoreDevtoolsModule.instrument(ReduxDevToolsConfig.getConfig())
  ]
})
export class AtlasModule { }
```

Features:
- Time-travel debugging (jump to any action)
- Action replay and reordering
- State import/export
- Automatic sanitization of sensitive data (auth tokens, passwords)

### Helper Functions

```typescript
import { StateInspectionHelpers } from './utils/state-inspector';

// Log state to console with formatting
StateInspectionHelpers.logState(state, 'Current State');

// Log state diff
StateInspectionHelpers.logDiff(diff, 'State Changes');

// Visualize state as table
StateInspectionHelpers.visualizeState(state);
```

## Request Logger

### Purpose

The Request Logger captures detailed information about all HTTP requests and responses, including headers, bodies, timing, and errors.

### Usage

```typescript
import { requestLogger, enableDebugMode } from './utils/request-logger';

// Enable console logging (optional)
enableDebugMode();

// Logging is automatic via HTTP interceptor, but you can also log manually:

// Log request
const id = requestLogger.logRequest(httpRequest);

// Log response
requestLogger.logResponse(id, httpResponse, 150); // 150ms duration

// Log error
requestLogger.logError(id, httpError, 200);

// Get all logs
const logs = requestLogger.getLogs();

// Filter logs
const errorLogs = requestLogger.getFilteredLogs({
  hasError: true,
  method: ['POST', 'PUT'],
  urlPattern: /deployments/
});

// Get statistics
const stats = requestLogger.getStatistics();
console.log('Total requests:', stats.totalRequests);
console.log('Success rate:', stats.successfulRequests / stats.totalRequests);
console.log('Average duration:', stats.averageDuration, 'ms');

// Export logs
const json = requestLogger.exportLogs(LogExportFormat.JSON);
const csv = requestLogger.exportLogs(LogExportFormat.CSV);
const har = requestLogger.exportLogs(LogExportFormat.HAR); // HTTP Archive format

// Export filtered logs
const errorJson = requestLogger.exportLogs(
  LogExportFormat.JSON,
  { hasError: true }
);
```

### Security Features

The Request Logger automatically sanitizes sensitive data:
- **Headers**: `Authorization`, `X-API-Key`, `Cookie` → `[REDACTED]`
- **Body fields**: `password`, `token`, `secret`, `apiKey` → `[REDACTED]`

### Export Formats

#### JSON
Complete log data in JSON format for programmatic analysis.

#### CSV
Tabular format for spreadsheet analysis:
```csv
ID,Timestamp,Method,URL,Status,Duration (ms),Has Error
req-123,2024-01-15T10:30:00Z,GET,/api/deployments,200,150,No
```

#### HAR (HTTP Archive)
Standard format compatible with browser dev tools and analysis tools like Charles Proxy.

### Debug Mode

Enable debug mode to log all requests to the browser console:

```typescript
import { enableDebugMode, disableDebugMode } from './utils/request-logger';

// Enable
enableDebugMode();

// Disable
disableDebugMode();
```

When enabled, you'll see formatted console output:
```
🌐 GET /api/deployments
  Request ID: req-123
  Timestamp: 2024-01-15T10:30:00Z
  Headers: { ... }
  
✅ GET /api/deployments - 200 (150ms)
  Response: { ... }
```

## Error Reproducer

### Purpose

The Error Reproducer captures comprehensive error context including state snapshots, request logs, user actions, and environment information. It generates reproduction scripts for debugging.

### Usage

```typescript
import { errorReproducer, initializeErrorTracking } from './utils/error-reproducer';

// Initialize automatic error tracking (call once at app startup)
initializeErrorTracking();

// Manual error capture
try {
  // ... code that might throw
} catch (error) {
  const contextId = errorReproducer.captureError(
    error,
    stateSnapshot,  // optional
    requestLog      // optional
  );
}

// Track user actions (automatic with initializeErrorTracking)
errorReproducer.trackUserAction('click', 'submit-button', { id: 'btn-1' });
errorReproducer.trackUserAction('input', 'username-field', { value: 'user@example.com' });

// Get error context
const context = errorReproducer.getContext(contextId);

// Generate reproduction script
const script = errorReproducer.generateReproductionScript(contextId);
console.log('Steps to reproduce:', script.steps);

// Export for bug report
const markdown = errorReproducer.exportReproductionScript(contextId);
// Copy to clipboard or save to file

// Search errors
const networkErrors = errorReproducer.searchContexts('network');

// Get error statistics
const stats = errorReproducer.getStatistics();
console.log('Total errors:', stats.totalErrors);
console.log('HTTP errors:', stats.httpErrors);
console.log('JS errors:', stats.jsErrors);
```

### Automatic Error Tracking

When you call `initializeErrorTracking()`, the following is tracked automatically:
- Window errors (uncaught exceptions)
- Unhandled promise rejections
- User clicks (element, ID, class)
- Navigation events

### Reproduction Script Format

The generated reproduction script includes:

```markdown
# Error Reproduction Script

**Error ID:** err-1234567890-abc123
**Timestamp:** 2024-01-15T10:30:00Z
**Error:** Cannot read property 'id' of undefined

## Environment

- **User Agent:** Mozilla/5.0...
- **Platform:** Win32
- **URL:** https://app.example.com/deployments

## Reproduction Steps

1. Navigate to https://app.example.com/deployments
2. click on BUTTON
   ```json
   { "id": "create-btn", "className": "btn-primary" }
   ```
3. input on text-field
   ```json
   { "value": "New Deployment" }
   ```
4. api_request
   ```json
   { "method": "POST", "url": "/api/deployments", "body": {...} }
   ```

## Expected Result

Operation should complete successfully

## Actual Result

Cannot read property 'id' of undefined

## Stack Trace

```
Error: Cannot read property 'id' of undefined
  at DeploymentService.createDeployment (deployment.service.ts:45)
  at DeploymentFormComponent.onSubmit (deployment-form.component.ts:78)
```
```

### Error Context Structure

Each captured error includes:

```typescript
{
  id: 'err-1234567890-abc123',
  timestamp: Date,
  error: {
    message: 'Error message',
    stack: 'Stack trace',
    type: 'Error' | 'HttpError',
    httpStatus?: 500
  },
  state: { /* NgRx state snapshot */ },
  requestLog: { /* HTTP request details */ },
  environment: {
    userAgent: 'Mozilla/5.0...',
    platform: 'Win32',
    url: 'https://...',
    localStorage: { /* sanitized */ },
    sessionStorage: { /* sanitized */ }
  },
  userActions: [
    { type: 'click', target: 'button', timestamp: Date },
    { type: 'input', target: 'field', timestamp: Date }
  ]
}
```

## Integration with HTTP Interceptor

Create an interceptor to automatically log requests:

```typescript
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { requestLogger } from './utils/request-logger';
import { errorReproducer } from './utils/error-reproducer';
import { stateInspector } from './utils/state-inspector';
import { Store } from '@ngrx/store';

@Injectable()
export class DebugInterceptor implements HttpInterceptor {
  constructor(private store: Store) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const startTime = Date.now();
    const logId = requestLogger.logRequest(req);

    return next.handle(req).pipe(
      tap(event => {
        if (event instanceof HttpResponse) {
          const duration = Date.now() - startTime;
          requestLogger.logResponse(logId, event, duration);
        }
      }),
      catchError(async (error: HttpErrorResponse) => {
        const duration = Date.now() - startTime;
        requestLogger.logError(logId, error, duration);
        
        // Capture error context with state and request log
        const snapshot = await stateInspector.captureSnapshot(this.store);
        const requestLog = requestLogger.getLogs().find(log => log.id === logId);
        errorReproducer.captureError(error, snapshot, requestLog);
        
        throw error;
      })
    );
  }
}
```

## Best Practices

### Development

1. **Enable debug mode** during development:
   ```typescript
   if (!environment.production) {
     enableDebugMode();
     initializeErrorTracking();
   }
   ```

2. **Capture state before critical operations**:
   ```typescript
   const snapshot = await stateInspector.captureSnapshot(store, 'BEFORE_SUBMIT');
   // ... perform operation
   ```

3. **Use descriptive action names** for better snapshot tracking:
   ```typescript
   stateInspector.captureSnapshot(store, 'USER_LOGIN_SUCCESS', { userId });
   ```

### Production

1. **Disable console logging** but keep error capture:
   ```typescript
   if (environment.production) {
     disableDebugMode();
     // Error tracking still active
   }
   ```

2. **Limit log retention**:
   ```typescript
   // Logs are automatically limited to:
   // - 500 request logs
   // - 100 error contexts
   // - 50 state snapshots
   // - 50 user actions
   ```

3. **Export and send to monitoring service**:
   ```typescript
   window.addEventListener('error', async (event) => {
     const contextId = errorReproducer.captureError(event.error);
     const context = errorReproducer.exportContext(contextId);
     
     // Send to monitoring service
     await monitoringService.reportError(context);
   });
   ```

### Bug Reports

When filing a bug report, include:

1. **Reproduction script**:
   ```typescript
   const markdown = errorReproducer.exportReproductionScript(contextId);
   // Attach to bug report
   ```

2. **Request logs** (if relevant):
   ```typescript
   const logs = requestLogger.exportLogs(LogExportFormat.JSON, {
     hasError: true,
     startDate: errorTimestamp
   });
   ```

3. **State snapshots** (if relevant):
   ```typescript
   const snapshots = stateInspector.exportSnapshots();
   ```

## Performance Considerations

- **Memory usage**: Logs are automatically pruned to prevent memory leaks
- **Performance impact**: Minimal in production when console logging is disabled
- **Storage**: Use `exportLogs()` to save logs externally and clear memory
- **Sanitization**: Automatic sanitization prevents sensitive data leaks

## Testing

All utilities include comprehensive unit tests:

```bash
npm test -- state-inspector.spec.ts
npm test -- request-logger.spec.ts
npm test -- error-reproducer.spec.ts
```

## API Reference

### StateInspector

- `captureSnapshot(store, action?, metadata?)` - Capture state snapshot
- `getSnapshots()` - Get all snapshots
- `getLatestSnapshot()` - Get most recent snapshot
- `compareSnapshots(s1, s2)` - Compare two snapshots
- `getStateChanges(from, to)` - Get changes between snapshots
- `exportSnapshots()` - Export as JSON
- `importSnapshots(json)` - Import from JSON
- `findSnapshotsByAction(name)` - Search by action name
- `getStateAtPath(snapshot, path)` - Get nested state value
- `clearSnapshots()` - Clear all snapshots

### RequestLogger

- `logRequest(request)` - Log HTTP request
- `logResponse(id, response, duration)` - Log HTTP response
- `logError(id, error, duration)` - Log HTTP error
- `getLogs()` - Get all logs
- `getFilteredLogs(options)` - Get filtered logs
- `exportLogs(format, options?)` - Export logs
- `getStatistics()` - Get request statistics
- `clearLogs()` - Clear all logs
- `setEnabled(enabled)` - Enable/disable logging
- `isEnabled()` - Check if enabled

### ErrorReproducer

- `captureError(error, state?, requestLog?)` - Capture error context
- `trackUserAction(type, target?, data?)` - Track user action
- `getContext(id)` - Get error context
- `getAllContexts()` - Get all contexts
- `generateReproductionScript(id)` - Generate script
- `exportContext(id)` - Export as JSON
- `exportReproductionScript(id)` - Export as markdown
- `searchContexts(query)` - Search errors
- `getStatistics()` - Get error statistics
- `clearContexts()` - Clear all contexts
- `clearUserActions()` - Clear user actions
- `setTrackingEnabled(enabled)` - Enable/disable tracking

## Support

For issues or questions about the debugging utilities, contact the ATLAS development team or file an issue in the project repository.
