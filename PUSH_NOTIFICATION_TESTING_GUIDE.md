# Push Notification Testing Guide

## Overview

This guide provides step-by-step instructions to test and confirm push notifications work across all features in the SRI application, including deployments, street sheets, preliminary punch lists, expenses, and time sheets.

## Prerequisites

### Backend Requirements
1. **VAPID Keys Configured**: Backend must have VAPID public/private keys set up
2. **Push Notification Endpoint**: `/api/push-subscriptions` endpoint must be active
3. **SignalR Hub**: Deployment notification hub must be running
4. **Feature Flag**: `notifications` feature flag must be enabled

### Frontend Requirements
1. **VAPID Public Key**: Must be configured in `src/environments/environments.ts`
2. **Service Worker**: Must be registered and active
3. **HTTPS**: Application must be served over HTTPS (required for service workers)
4. **Browser Support**: Use Chrome, Firefox, Edge, or Opera (Safari has limited support)

## Quick Start: Enable Push Notifications

### Step 1: Check Browser Support
Open browser console and run:
```javascript
console.log('Notification support:', 'Notification' in window);
console.log('Service Worker support:', 'serviceWorker' in navigator);
console.log('Push Manager support:', 'PushManager' in window);
```
All should return `true`.

### Step 2: Grant Browser Permission
1. Navigate to the application
2. Browser will prompt for notification permission
3. Click "Allow" when prompted
4. Verify permission: `console.log(Notification.permission)` should return `"granted"`

### Step 3: Initialize Push Service
The push service initializes automatically when:
- User logs in
- Notifications feature flag is enabled
- VAPID key is configured

Check initialization status:
```javascript
// In browser console
console.log('Push service initialized');
```

### Step 4: Verify Subscription
1. Open browser DevTools > Application tab > Service Workers
2. Verify service worker is active
3. Check Network tab for POST to `/api/push-subscriptions`
4. Should see 200 OK response with subscription data

## Testing Push Notifications by Feature

### 1. Deployment Notifications

#### Test Scenarios

**A. Deployment Assigned**
- **Trigger**: Backend assigns deployment to user
- **Expected**: 
  - Blue info toast notification
  - Browser push notification (if tab not focused)
  - Notification shows deployment ID and message
  - Click navigates to `/deployments/:id`

**B. Ready for Sign-Off**
- **Trigger**: Deployment phase advances to sign-off
- **Expected**:
  - Orange warning toast (sticky - doesn't auto-dismiss)
  - Browser push notification
  - Click navigates to `/deployments/:id/handoff`

**C. Issue Created**
- **Trigger**: New issue reported on deployment
- **Expected**:
  - Red error toast (critical issues don't auto-dismiss)
  - Browser push notification
  - Click navigates to `/deployments/:id/issues`

**D. Deployment Completed**
- **Trigger**: Deployment marked as complete
- **Expected**:
  - Green success toast (7s auto-dismiss)
  - Browser push notification
  - Click navigates to `/deployments/:id`

#### How to Test
1. Use backend API or admin panel to trigger events
2. Verify toast appears in application
3. Switch to another tab/window
4. Verify browser push notification appears
5. Click notification and verify navigation

### 2. Street Sheet Notifications

#### Integration Points
Street sheets are part of the Field Resource Management (FRM) system. Notifications should trigger for:

**A. Street Sheet Created**
- **When**: New street sheet is created
- **Expected**: Info notification with street sheet details
- **Navigation**: `/field-resource-management/street-sheets/:id`

**B. Street Sheet Updated**
- **When**: Street sheet data is modified
- **Expected**: Info notification about update
- **Navigation**: `/field-resource-management/street-sheets/:id`

**C. Street Sheet Approved/Rejected**
- **When**: CM or Admin reviews street sheet
- **Expected**: 
  - Success notification (approved)
  - Warning notification (rejected)
- **Navigation**: `/field-resource-management/street-sheets/:id`

#### How to Test
1. Create a new street sheet
2. Verify notification appears
3. Update street sheet data
4. Verify update notification
5. Submit for approval
6. Have CM/Admin approve or reject
7. Verify approval/rejection notification

### 3. Preliminary Punch List Notifications

#### Integration Points
Punch lists are part of the FRM system. Notifications should trigger for:

**A. Punch List Item Created**
- **When**: New punch list item added
- **Expected**: Info notification with item details
- **Navigation**: `/field-resource-management/punch-lists/:id`

**B. Punch List Item Assigned**
- **When**: Item assigned to technician
- **Expected**: Warning notification to assignee
- **Navigation**: `/field-resource-management/punch-lists/:id`

**C. Punch List Item Completed**
- **When**: Item marked as complete
- **Expected**: Success notification
- **Navigation**: `/field-resource-management/punch-lists/:id`

**D. Punch List Item Rejected**
- **When**: Completed item rejected by reviewer
- **Expected**: Error notification to assignee
- **Navigation**: `/field-resource-management/punch-lists/:id`

#### How to Test
1. Create punch list item
2. Assign to technician
3. Verify assignee receives notification
4. Mark item as complete
5. Verify completion notification
6. Reject item (if applicable)
7. Verify rejection notification

### 4. Expense Notifications

#### Integration Points
Expenses are part of the FRM system. Notifications should trigger for:

**A. Expense Submitted**
- **When**: Technician submits expense report
- **Expected**: Info notification to approver
- **Navigation**: `/field-resource-management/expenses/:id`

**B. Expense Approved**
- **When**: Manager approves expense
- **Expected**: Success notification to submitter
- **Navigation**: `/field-resource-management/expenses/:id`

**C. Expense Rejected**
- **When**: Manager rejects expense
- **Expected**: Error notification to submitter with reason
- **Navigation**: `/field-resource-management/expenses/:id`

**D. Expense Requires Clarification**
- **When**: Approver requests more information
- **Expected**: Warning notification to submitter
- **Navigation**: `/field-resource-management/expenses/:id`

#### How to Test
1. Submit expense report with receipts
2. Verify submission notification to approver
3. Approve expense
4. Verify approval notification to submitter
5. Submit another expense and reject it
6. Verify rejection notification with reason

### 5. Time Sheet Notifications

#### Integration Points
Time sheets are part of the FRM system. Notifications should trigger for:

**A. Time Entry Submitted**
- **When**: Technician submits timecard
- **Expected**: Info notification to approver
- **Navigation**: `/field-resource-management/timecard`

**B. Time Entry Approved**
- **When**: Manager approves timecard
- **Expected**: Success notification to submitter
- **Navigation**: `/field-resource-management/timecard`

**C. Time Entry Rejected**
- **When**: Manager rejects timecard
- **Expected**: Error notification to submitter with reason
- **Navigation**: `/field-resource-management/timecard`

**D. Time Entry Reminder**
- **When**: End of day/week without time entry
- **Expected**: Warning notification reminder
- **Navigation**: `/field-resource-management/timecard`

**E. Overtime Alert**
- **When**: Time entry exceeds threshold
- **Expected**: Warning notification to manager
- **Navigation**: `/field-resource-management/timecard`

#### How to Test
1. Clock in and out for a job
2. Submit timecard
3. Verify submission notification to approver
4. Approve timecard
5. Verify approval notification to submitter
6. Test overtime scenario
7. Verify overtime alert to manager

## Advanced Testing Scenarios

### Multi-Device Testing
1. **Subscribe on Multiple Devices**:
   - Desktop browser (Chrome)
   - Mobile browser (Chrome/Firefox)
   - Tablet browser
   
2. **Verify All Devices Receive Notifications**:
   - Trigger event from backend
   - Check all subscribed devices receive push
   - Verify notification content is consistent

3. **Test Device Management**:
   - View active subscriptions in settings
   - Unsubscribe from one device
   - Verify that device no longer receives notifications
   - Other devices still receive notifications

### Permission Scenarios

**A. Permission Denied**
1. Block notifications in browser settings
2. Try to enable push notifications
3. Verify error message displayed
4. Verify educational message shown
5. Grant permission in browser settings
6. Retry enabling notifications
7. Verify success

**B. Permission Revoked**
1. Enable notifications successfully
2. Revoke permission in browser settings
3. Trigger notification event
4. Verify graceful degradation (toast only, no push)
5. Re-grant permission
6. Verify push notifications resume

### Offline/Online Scenarios

**A. Offline Subscription**
1. Enable notifications while online
2. Go offline (disable network)
3. Trigger events from backend
4. Go back online
5. Verify queued notifications delivered

**B. Service Worker Update**
1. Deploy new service worker version
2. Verify existing subscriptions still work
3. Verify new subscriptions use updated worker

### Feature Flag Testing

**A. Disable Notifications**
1. Enable push notifications
2. Disable `notifications` feature flag
3. Trigger events
4. Verify no notifications appear
5. Re-enable feature flag
6. Verify notifications resume

**B. Partial Disable**
1. Disable only push notifications (keep toast)
2. Trigger events
3. Verify toast appears but no push
4. Re-enable push
5. Verify both toast and push work

## Automated Testing

### Browser Console Tests

```javascript
// Test 1: Check browser support
console.log('=== Browser Support Test ===');
console.log('Notifications:', 'Notification' in window);
console.log('Service Workers:', 'serviceWorker' in navigator);
console.log('Push Manager:', 'PushManager' in window);
console.log('Permission:', Notification.permission);

// Test 2: Check service worker
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('=== Service Worker Test ===');
  console.log('Registration:', reg);
  console.log('Active:', reg?.active);
  console.log('Scope:', reg?.scope);
});

// Test 3: Check push subscription
navigator.serviceWorker.ready.then(reg => {
  return reg.pushManager.getSubscription();
}).then(sub => {
  console.log('=== Push Subscription Test ===');
  console.log('Subscription:', sub);
  console.log('Endpoint:', sub?.endpoint);
});

// Test 4: Send test notification
async function testNotification() {
  const reg = await navigator.serviceWorker.ready;
  await reg.showNotification('Test Notification', {
    body: 'This is a test notification',
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/badge-72x72.png',
    tag: 'test',
    requireInteraction: false
  });
  console.log('✅ Test notification sent');
}
testNotification();
```

### API Testing with cURL

```bash
# Test 1: Get user's subscriptions
curl -X GET https://sri-api.azurewebsites.net/api/push-subscriptions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Ocp-Apim-Subscription-Key: YOUR_API_KEY"

# Test 2: Send test notification
curl -X POST https://sri-api.azurewebsites.net/api/push-subscriptions/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Ocp-Apim-Subscription-Key: YOUR_API_KEY"

# Test 3: Trigger deployment notification
curl -X POST https://sri-api.azurewebsites.net/api/deployments/123/notify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Ocp-Apim-Subscription-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "assigned",
    "message": "Deployment assigned to you",
    "priority": "high"
  }'
```

## Troubleshooting

### Common Issues

**Issue: Notifications not appearing**
- **Check**: Browser permission granted?
- **Check**: Feature flag enabled?
- **Check**: Service worker active?
- **Check**: Valid subscription exists?
- **Solution**: Review browser console for errors

**Issue: Subscription fails**
- **Check**: VAPID key configured correctly?
- **Check**: Backend endpoint accessible?
- **Check**: HTTPS enabled?
- **Solution**: Verify backend logs for errors

**Issue: Notifications appear but don't navigate**
- **Check**: Notification click handler registered?
- **Check**: Router configured correctly?
- **Solution**: Check service worker notification click event

**Issue: Multiple notifications for same event**
- **Check**: Multiple subscriptions active?
- **Check**: Duplicate event handlers?
- **Solution**: Unsubscribe old devices, check event listeners

### Debug Mode

Enable verbose logging:
```javascript
// In browser console
localStorage.setItem('debug', 'push-notifications');
location.reload();
```

View detailed logs:
```javascript
// Check push service state
console.log('Initialized:', pushService.isInitialized$.value);
console.log('Subscribed:', pushService.isSubscribed$.value);
console.log('Error:', pushService.subscriptionError$.value);
```

## Success Criteria

✅ **All tests pass when:**
1. Browser permission granted successfully
2. Service worker registered and active
3. Push subscription created and synced with backend
4. Test notification appears in browser
5. Deployment notifications trigger correctly
6. Street sheet notifications trigger correctly
7. Punch list notifications trigger correctly
8. Expense notifications trigger correctly
9. Time sheet notifications trigger correctly
10. Multi-device subscriptions work
11. Notification clicks navigate correctly
12. Feature flag toggle works
13. Offline/online scenarios handled gracefully
14. Permission revocation handled gracefully

## Next Steps

After confirming push notifications work:

1. **Monitor Production**:
   - Track notification delivery rates
   - Monitor subscription errors
   - Review user feedback

2. **Optimize**:
   - Adjust notification frequency
   - Refine notification content
   - Improve notification grouping

3. **Enhance**:
   - Add notification preferences per feature
   - Implement Do Not Disturb schedules
   - Add notification history/inbox
   - Support rich notifications with images

## Support

For issues or questions:
- Check browser console for errors
- Review backend logs
- Consult `PUSH_NOTIFICATIONS_FRONTEND_README.md`
- Contact development team

---

**Last Updated**: February 2026
**Version**: 1.0
