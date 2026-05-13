# State Persistence Behavior

## How It Works

### Scenario 1: WITHOUT Logout Clearing (Security Risk ❌)

```
Timeline:
09:00 AM - John logs in
09:15 AM - John clocks in on Job-001
          └─> localStorage: { activeEntry: { jobId: "Job-001", technicianId: "john", clockInTime: "09:15" } }
10:00 AM - John logs out
          └─> localStorage: STILL CONTAINS John's data ⚠️
10:05 AM - Sarah logs in on same device
          └─> App loads: Sarah sees John's active time entry!
          └─> Sarah could clock out for John
          └─> Sarah sees John's work history
```

**Problems:**
- Data leakage between users
- Sarah can manipulate John's time entries
- Privacy violation
- Audit trail confusion

---

### Scenario 2: WITH Logout Clearing (Secure ✅)

```
Timeline:
09:00 AM - John logs in
09:15 AM - John clocks in on Job-001
          └─> localStorage: { activeEntry: { jobId: "Job-001", technicianId: "john", clockInTime: "09:15" } }
10:00 AM - John logs out
          └─> clearPersistedState() called
          └─> localStorage: CLEARED ✓
10:05 AM - Sarah logs in on same device
          └─> App loads: Clean slate, no previous data
          └─> Sarah only sees her own time entries
```

**Benefits:**
- No data leakage
- Each user sees only their own data
- Proper security boundaries
- Clean audit trail

---

## What Gets Cleared on Logout

```javascript
logout() {
  // 1. Clear authentication data
  localStorage.removeItem('loggedIn');
  localStorage.removeItem('user');
  sessionStorage.removeItem('authToken');
  
  // 2. Clear FRM persisted state (NEW)
  statePersistenceService.clearPersistedState();
  //   └─> Removes: frm_time_entry_state
  //       └─> Contains: active time entries, time entry history
  
  // 3. Reset user state
  this.currentUser = null;
  
  // 4. Navigate to login
  this.router.navigate(['/login']);
}
```

---

## What Gets Preserved (Survives Page Refresh)

### While User is Logged In:

```
User Action                    → localStorage State
─────────────────────────────────────────────────────────
Clock In                       → Active entry saved
Close browser tab              → State persists ✓
Reopen browser                 → State restored ✓
Navigate to different page     → State persists ✓
Refresh page                   → State restored ✓
Clock Out                      → Entry completed, saved
```

### After Logout:

```
User Action                    → localStorage State
─────────────────────────────────────────────────────────
Logout                         → State cleared ✓
New user logs in               → Fresh state ✓
```

---

## Edge Cases Handled

### 1. Stale Data Protection
```javascript
// State expires after 24 hours
if (Date.now() - parsed.timestamp > 24 * 60 * 60 * 1000) {
  localStorage.removeItem(STORAGE_KEY);
  return null;
}
```

### 2. Shared Device Scenario
```
Device: Shared tablet in warehouse
User A: Clocks in, leaves device
User B: Picks up device, logs in
Result: User B sees clean state (User A's data cleared on logout)
```

### 3. Browser Crash Recovery
```
User: Clocks in at 9:00 AM
Browser: Crashes at 10:00 AM
User: Reopens browser, logs back in
Result: Active time entry restored, timer continues from 9:00 AM ✓
```

---

## Implementation Details

### Storage Key
```javascript
const STORAGE_KEY = 'frm_time_entry_state';
```

### Stored Data Structure
```json
{
  "timeEntries": {
    "entities": {
      "entry-1": { "id": "entry-1", "jobId": "Job-001", ... },
      "entry-2": { "id": "entry-2", "jobId": "Job-002", ... }
    },
    "ids": ["entry-1", "entry-2"],
    "activeEntry": {
      "id": "entry-1",
      "jobId": "Job-001",
      "technicianId": "john-123",
      "clockInTime": "2026-02-20T09:15:00Z",
      "clockInLocation": { "latitude": 40.7128, "longitude": -74.0060 }
    }
  },
  "timestamp": 1708426500000
}
```

### When State is Saved
- Clock In Success
- Clock Out Success
- Update Time Entry Success
- Load Time Entries Success
- Load Active Entry Success

### When State is Cleared
- User logout
- State age > 24 hours
- Manual clear via service

---

## Testing Scenarios

### Test 1: Page Refresh During Active Entry
1. Clock in
2. Refresh page
3. ✓ Active entry should still be visible
4. ✓ Timer should continue from original clock-in time

### Test 2: Browser Close/Reopen
1. Clock in
2. Close browser completely
3. Reopen browser
4. Log back in
5. ✓ Active entry should be restored

### Test 3: Multi-User Security
1. User A clocks in
2. User A logs out
3. User B logs in
4. ✓ User B should NOT see User A's data

### Test 4: Stale Data Cleanup
1. Clock in
2. Wait 25 hours (or mock timestamp)
3. Refresh page
4. ✓ Stale state should be cleared
5. ✓ User should see clean slate

---

## Summary

**Before:** State persisted indefinitely, causing security issues
**After:** State persists during session, cleared on logout for security

This ensures:
- ✅ No data loss during normal usage
- ✅ No data leakage between users
- ✅ Proper security boundaries
- ✅ Better user experience (no lost work)
