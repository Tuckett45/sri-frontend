# PWA Manual Setup Steps

## ServiceWorkerModule Registration

Due to Angular's static analysis requirements, the ServiceWorkerModule needs to be registered manually in `src/app/app.module.ts`.

### Steps:

1. Open `src/app/app.module.ts`

2. Uncomment the ServiceWorkerModule import section in the imports array:

```typescript
// Change this:
// Service Worker for PWA support - Add manually after build
// ServiceWorkerModule.register('ngsw-worker.js', {
//   enabled: !isDevMode(),
//   registrationStrategy: 'registerWhenStable:30000'
// })

// To this:
ServiceWorkerModule.register('ngsw-worker.js', {
  enabled: !isDevMode(),
  registrationStrategy: 'registerWhenStable:30000'
})
```

3. Save the file

4. Build for production:
```bash
ng build --configuration production
```

5. The service worker will now be active in production builds

## Alternative: Environment-based Registration

If you prefer to use environment variables:

```typescript
import { environment } from '../environments/environments';

// In imports array:
ServiceWorkerModule.register('ngsw-worker.js', {
  enabled: environment.production,
  registrationStrategy: 'registerWhenStable:30000'
})
```

## Verification

After building, verify the service worker is registered:

1. Serve the production build:
```bash
npx http-server -p 8080 -c-1 dist/sri-frontend
```

2. Open Chrome DevTools → Application → Service Workers

3. You should see `ngsw-worker.js` registered

## Files Created

All PWA configuration files have been created:

- ✅ `ngsw-config.json` - Service worker configuration
- ✅ `src/manifest.webmanifest` - Web app manifest
- ✅ `src/offline.html` - Offline fallback page
- ✅ `src/assets/icons/` - Icon directory (needs actual icons)
- ✅ `angular.json` - Updated with PWA assets
- ✅ `src/index.html` - Updated with manifest link

## Next Steps

1. Uncomment ServiceWorkerModule registration
2. Add app icons to `src/assets/icons/`
3. Test on mobile devices
4. Implement background sync for offline actions

See `PWA_SETUP.md` for complete documentation.
