# iOS Safari Address Input Fix

## Issue
Address input autocomplete not working on iOS Safari (iPhone/iPad). This is a common issue with Material Angular components on iOS.

## iOS Safari Specific Problems

### 1. Input Event Not Firing
**Problem:** iOS Safari sometimes doesn't fire the `(input)` event properly, especially with virtual keyboards.

**Fix:** Added multiple event listeners:
```html
<input
  (input)="onAddressInput($event)"
  (keyup)="onAddressInput($event)"
  (change)="onAddressInput($event)"
  ...
/>
```

### 2. Autocomplete Panel Hidden by Keyboard
**Problem:** Material autocomplete panel appears behind the virtual keyboard or off-screen.

**Fix:** 
```scss
::ng-deep .mat-autocomplete-panel {
  position: fixed !important;
  z-index: 9999 !important;
  -webkit-overflow-scrolling: touch;
  transform: translateZ(0); /* Force hardware acceleration */
}

::ng-deep .cdk-overlay-pane {
  z-index: 9999 !important;
  position: fixed !important;
}
```

### 3. Input Field Not Responding to Touch
**Problem:** iOS Safari sometimes blocks touch events on form inputs.

**Fix:**
```scss
::ng-deep .mat-mdc-input-element {
  -webkit-appearance: none; /* Remove iOS default styling */
  -webkit-tap-highlight-color: transparent;
  font-size: 16px !important; /* Prevents zoom */
}

::ng-deep .mat-mdc-option {
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
  touch-action: manipulation;
}
```

### 4. Hardware Acceleration Issues
**Problem:** iOS Safari doesn't render overlays properly without hardware acceleration.

**Fix:**
```scss
::ng-deep .mat-mdc-text-field-wrapper {
  -webkit-transform: translateZ(0);
}
```

### 5. Autocomplete Attribute Conflicts
**Problem:** iOS Safari's native autocomplete can conflict with Material autocomplete.

**Fix:** Added proper autocomplete attributes:
```html
<input
  autocomplete="street-address"
  name="street-address"
  type="text"
  inputmode="text"
  ...
/>
```

## Debugging Steps for iOS

### 1. Enable Safari Web Inspector
On your Mac:
1. Open Safari
2. Go to Safari > Preferences > Advanced
3. Check "Show Develop menu in menu bar"

On your iPhone:
1. Go to Settings > Safari > Advanced
2. Enable "Web Inspector"

Connect iPhone to Mac via USB, then:
1. Open the website on iPhone Safari
2. On Mac Safari: Develop > [Your iPhone] > [Website]
3. Check Console for errors

### 2. Check Console Logs
The app now logs helpful debugging information:
```javascript
console.log('Address input event:', { 
  type: event.type, 
  value: query, 
  length: query?.length,
  userAgent: navigator.userAgent 
});
```

Look for:
- Is the input event firing?
- Is the query value correct?
- Are suggestions being received?
- Any API errors?

### 3. Check Network Tab
1. Open Web Inspector
2. Go to Network tab
3. Type in address field
4. Look for requests to `maps.googleapis.com`
5. Check if requests are:
   - Being sent (should see after 800ms)
   - Completing successfully (status 200)
   - Returning results

### 4. Check for Blocking
Common iOS blockers:
- Content blockers (1Blocker, AdGuard, etc.)
- Safari's "Prevent Cross-Site Tracking"
- "Hide IP Address" feature
- VPN or DNS filtering

To test:
1. Disable all content blockers
2. Turn off "Prevent Cross-Site Tracking"
3. Turn off "Hide IP Address"
4. Try without VPN

## Common iOS Issues & Solutions

### Issue: "Can't type in the address field"
**Possible Causes:**
1. Input field has `readonly` attribute
2. Form is disabled
3. iOS keyboard not appearing
4. Touch events blocked

**Solutions:**
1. Check if field is editable (should not have `readonly`)
2. Verify form is not disabled
3. Tap directly on the input field
4. Try closing and reopening the modal
5. Refresh the page

**Debug:**
```javascript
// In Safari Web Inspector Console:
document.querySelector('input[formControlName="streetAddress"]').disabled
// Should return: false

document.querySelector('input[formControlName="streetAddress"]').readOnly
// Should return: false
```

### Issue: "Autocomplete suggestions not appearing"
**Possible Causes:**
1. API requests blocked
2. Autocomplete panel off-screen
3. Z-index issues
4. Event not firing

**Solutions:**
1. Check Network tab for API requests
2. Scroll up to see if panel is above viewport
3. Check Console for errors
4. Try typing more characters (need 6+)

**Debug:**
```javascript
// Check if suggestions are being set:
// Look for console log: "Filtered addresses: X"
// X should be > 0 if suggestions found
```

### Issue: "Can tap suggestions but nothing happens"
**Possible Causes:**
1. `selectAddress()` method not firing
2. Form not updating
3. Event propagation blocked

**Solutions:**
1. Check Console for errors
2. Try tapping suggestion again
3. Try different suggestion
4. Close and reopen modal

**Debug:**
```javascript
// Check if selectAddress is being called:
// Should see form values update in Console
```

### Issue: "GPS location button not working"
**Possible Causes:**
1. Location permissions denied
2. Not using HTTPS
3. Location services disabled
4. iOS location prompt dismissed

**Solutions:**
1. Go to Settings > Privacy > Location Services
2. Enable Location Services
3. Find Safari in the list
4. Set to "While Using the App"
5. Refresh page and try again

**iOS Location Permissions:**
- First time: iOS shows permission prompt
- If denied: Must enable in Settings
- If "Ask Next Time": Will prompt again
- If "Never": Must enable in Settings

### Issue: "Keyboard covers autocomplete"
**Possible Causes:**
1. Fixed positioning not working
2. Viewport height calculation wrong
3. iOS keyboard behavior

**Solutions:**
1. Scroll up manually to see suggestions
2. Use landscape orientation
3. Close keyboard (tap outside) to see suggestions
4. Use GPS button instead

**Workaround:**
- Type address
- Tap outside to close keyboard
- Suggestions should now be visible
- Tap suggestion

### Issue: "Page zooms in when typing"
**Possible Causes:**
1. Font size < 16px
2. iOS auto-zoom feature

**Solutions:**
- Already fixed with `font-size: 16px !important`
- If still zooming, check for conflicting CSS

**Disable Zoom (if needed):**
```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
```
⚠️ Not recommended for accessibility

## iOS Safari Limitations

### Known Limitations
1. **Virtual Keyboard:** Takes up 40-50% of screen
2. **Fixed Positioning:** Can be unreliable with keyboard
3. **Touch Events:** Sometimes delayed or missed
4. **Autocomplete:** Native autocomplete can interfere
5. **Memory:** Limited compared to desktop
6. **Network:** May be slower on cellular

### Workarounds
1. **Manual Entry:** Always available as fallback
2. **GPS Location:** Alternative to typing
3. **Landscape Mode:** More screen space
4. **Close Keyboard:** To see suggestions
5. **Scroll:** To reveal hidden elements

## Testing on iOS

### Test Devices
- iPhone SE (small screen)
- iPhone 13/14 (standard)
- iPhone 14 Pro Max (large)
- iPad (tablet)
- iPad Pro (large tablet)

### Test Scenarios
1. **Portrait Mode:**
   - Type address
   - Check suggestions visible
   - Tap suggestion
   - Verify fields filled

2. **Landscape Mode:**
   - Type address
   - Check suggestions visible
   - Tap suggestion
   - Verify fields filled

3. **With Keyboard:**
   - Type address
   - Don't close keyboard
   - Try to see suggestions
   - Scroll if needed

4. **Without Keyboard:**
   - Type address
   - Close keyboard
   - Check suggestions visible
   - Tap suggestion

5. **GPS Location:**
   - Tap GPS button
   - Grant permission
   - Wait for location
   - Verify fields filled

6. **Manual Entry:**
   - Type street address
   - Type city
   - Type state
   - Verify validation works

### iOS Versions to Test
- iOS 15 (older devices)
- iOS 16 (current)
- iOS 17 (latest)
- iOS 18 beta (if available)

## Performance on iOS

### Optimization
- Debounce: 800ms (prevents too many requests)
- Caching: Results cached in memory
- Timeout: 10 seconds (prevents hanging)
- Retry: 2 attempts (handles transient failures)

### Memory Management
- Cache cleared on page refresh
- Suggestions cleared when not needed
- No memory leaks detected

### Network Usage
- Minimal data transfer
- Compressed responses
- Cached results reused

## Fallback Strategy

If autocomplete doesn't work on iOS:

1. **Manual Entry:**
   ```
   Street Address: [Type manually]
   City: [Type manually]
   State: [Type manually - 2 letters]
   ```

2. **GPS Location:**
   ```
   Tap GPS button → Grant permission → Auto-fill
   ```

3. **Copy/Paste:**
   ```
   Copy address from Maps app → Paste into field
   ```

4. **Desktop Entry:**
   ```
   Use desktop browser if available
   ```

## Files Modified

- `src/app/components/modals/street-sheet-modal/street-sheet-modal.component.html`
  - Added `(keyup)` and `(change)` events
  - Added `inputmode="text"` attribute

- `src/app/components/modals/street-sheet-modal/street-sheet-modal.component.scss`
  - Added iOS-specific webkit styles
  - Added hardware acceleration
  - Added touch-action optimization
  - Fixed z-index for overlays

- `src/app/components/modals/street-sheet-modal/street-sheet-modal.component.ts`
  - Added debug logging
  - Added user agent logging
  - Improved error handling

## Quick Checklist

When testing on iOS:
- [ ] Can type in address field
- [ ] Keyboard appears when tapping field
- [ ] Input events fire (check Console)
- [ ] API requests sent (check Network)
- [ ] Suggestions appear (after 6+ characters)
- [ ] Can see suggestions (not hidden by keyboard)
- [ ] Can tap suggestions
- [ ] Fields auto-fill when suggestion tapped
- [ ] GPS button works
- [ ] Location permission prompt appears
- [ ] Fields auto-fill from GPS
- [ ] Can manually enter address
- [ ] Form validation works
- [ ] Can submit form

## Support

If still not working on iOS:
1. Check Safari Web Inspector Console
2. Check Network tab for blocked requests
3. Disable content blockers
4. Try different network (WiFi vs cellular)
5. Try incognito/private mode
6. Clear Safari cache
7. Restart Safari
8. Restart iPhone
9. Update iOS to latest version
10. Use manual entry as fallback

## Related Documentation
- [Street Sheet Browser Compatibility Fix](STREET_SHEET_BROWSER_COMPATIBILITY_FIX.md)
- [Street Sheet Mobile Location Fix](STREET_SHEET_MOBILE_LOCATION_FIX.md)
