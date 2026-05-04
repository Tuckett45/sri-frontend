# User Preference Migration Script

## Overview

This script migrates existing notification preferences to separate ARK and ATLAS notification preferences, maintaining backward compatibility while establishing clear domain boundaries.

## What It Does

1. **Reads existing preferences**: Retrieves all notification preferences from the database
2. **Creates ARK preferences**: Copies all existing preference values to ARK notification preferences
3. **Creates ATLAS preferences**: Creates default ATLAS preferences (all notifications enabled)
4. **Validates migration**: Ensures all users have both ARK and ATLAS preferences
5. **Logs progress**: Records all operations and errors to a log file

## Requirements

- Node.js 14+
- TypeScript
- Access to the notification preferences database

## Usage

### Dry Run (Recommended First)

Test the migration without making any changes:

```bash
npx ts-node scripts/migrate-user-preferences.ts --dry-run
```

### Live Migration

Execute the actual migration:

```bash
npx ts-node scripts/migrate-user-preferences.ts
```

## Migration Process

### 1. Backup Creation

Before any changes, the script creates a backup file:
- Location: `scripts/backup-user-preferences.json`
- Contains: All existing preferences with timestamp

### 2. ARK Preference Creation

For each user, creates ARK preferences with:
- Same channel settings (email, inApp, sms)
- Same feature flags (approvalReminders, escalationAlerts, dailyDigest)
- Same quiet hours configuration
- Same notification type preferences

### 3. ATLAS Preference Creation

For each user, creates default ATLAS preferences:
- `enabled`: true
- `deploymentNotifications`: true
- `connectivityAlerts`: true
- `systemHealthAlerts`: true
- `evidenceNotifications`: true
- `approvalNotifications`: true
- `analysisNotifications`: true
- `minimumPriority`: 'low'

### 4. Validation

After migration, validates that:
- ARK preferences exist for each user
- ATLAS preferences exist for each user
- All data was saved correctly

## Output Files

### Log File

Location: `scripts/migration-user-preferences.log`

Contains:
- Timestamp for each operation
- Success/failure status for each user
- Error messages with details
- Migration summary

Example log entry:
```
[2026-02-24T10:30:45.123Z] [INFO] Starting User Preference Migration
[2026-02-24T10:30:45.234Z] [INFO] Found 150 existing preference records
[2026-02-24T10:30:45.345Z] [INFO] Saved ARK preferences for user user-001
[2026-02-24T10:30:45.456Z] [INFO] Saved ATLAS preferences for user user-001
[2026-02-24T10:30:45.567Z] [INFO] Successfully migrated preferences for user user-001
```

### Backup File

Location: `scripts/backup-user-preferences.json`

Contains:
```json
{
  "timestamp": "2026-02-24T10:30:45.123Z",
  "count": 150,
  "preferences": [
    {
      "userId": "user-001",
      "email": true,
      "inApp": true,
      ...
    }
  ]
}
```

## Testing

### Mock Data

For testing, place sample preferences in `scripts/mock-preferences.json`:

```json
[
  {
    "userId": "test-user-001",
    "email": true,
    "inApp": true,
    "sms": false,
    "approvalReminders": true,
    "escalationAlerts": true,
    "dailyDigest": false
  }
]
```

### Test Migration

1. Create mock data file
2. Run dry run: `npx ts-node scripts/migrate-user-preferences.ts --dry-run`
3. Review log output
4. Run live migration: `npx ts-node scripts/migrate-user-preferences.ts`
5. Verify results in log file

## Database Integration

### Current Implementation

The script includes placeholder functions for database operations:
- `readExistingPreferences()`: Reads from mock JSON file
- `saveArkPreferences()`: Logs operation (no actual save)
- `saveAtlasPreferences()`: Logs operation (no actual save)
- `validateUserPreferences()`: Returns true (no actual validation)

### Production Implementation

To integrate with your database:

1. **Install database client**:
   ```bash
   npm install pg  # PostgreSQL
   # or
   npm install mysql2  # MySQL
   ```

2. **Update `readExistingPreferences()`**:
   ```typescript
   async function readExistingPreferences(): Promise<LegacyNotificationPreferences[]> {
     const result = await db.query('SELECT * FROM notification_preferences');
     return result.rows;
   }
   ```

3. **Update `saveArkPreferences()`**:
   ```typescript
   async function saveArkPreferences(preferences: ArkNotificationPreferences): Promise<boolean> {
     await db.query(
       'INSERT INTO ark_notification_preferences (userId, email, inApp, ...) VALUES ($1, $2, $3, ...)',
       [preferences.userId, preferences.email, preferences.inApp, ...]
     );
     return true;
   }
   ```

4. **Update `saveAtlasPreferences()`**:
   ```typescript
   async function saveAtlasPreferences(preferences: AtlasNotificationPreferences): Promise<boolean> {
     await db.query(
       'INSERT INTO atlas_notification_preferences (userId, enabled, ...) VALUES ($1, $2, ...)',
       [preferences.userId, preferences.enabled, ...]
     );
     return true;
   }
   ```

5. **Update `validateUserPreferences()`**:
   ```typescript
   async function validateUserPreferences(userId: string): Promise<boolean> {
     const arkResult = await db.query(
       'SELECT 1 FROM ark_notification_preferences WHERE userId = $1',
       [userId]
     );
     const atlasResult = await db.query(
       'SELECT 1 FROM atlas_notification_preferences WHERE userId = $1',
       [userId]
     );
     return arkResult.rows.length > 0 && atlasResult.rows.length > 0;
   }
   ```

## Error Handling

The script handles various error scenarios:

### Missing Preferences
- **Issue**: No existing preferences found
- **Action**: Logs warning and exits gracefully
- **Exit Code**: 0

### Save Failures
- **Issue**: Failed to save ARK or ATLAS preferences
- **Action**: Logs error, continues with next user
- **Exit Code**: 1 (if any failures)

### Validation Failures
- **Issue**: Preferences not found after save
- **Action**: Logs error, marks migration as failed
- **Exit Code**: 1

### Fatal Errors
- **Issue**: Unhandled exception
- **Action**: Logs error, exits immediately
- **Exit Code**: 1

## Migration Summary

After completion, the script outputs a summary:

```
================================================================================
Migration Summary
================================================================================
Total users: 150
Successful migrations: 148
Failed migrations: 2
ARK preferences created: 148
ATLAS preferences created: 148
Duration: 2345ms
Errors encountered:
  - User user-042: Validation failed
  - User user-089: Failed to create one or both preference records
================================================================================
```

## Rollback

If migration fails or needs to be reversed:

1. **Restore from backup**:
   ```bash
   # Use the backup file to restore original preferences
   # This requires a custom rollback script or manual database operations
   ```

2. **Delete migrated preferences**:
   ```sql
   DELETE FROM ark_notification_preferences WHERE userId IN (...);
   DELETE FROM atlas_notification_preferences WHERE userId IN (...);
   ```

## Best Practices

1. **Always run dry run first**: Test the migration without making changes
2. **Backup database**: Create a full database backup before live migration
3. **Run during maintenance window**: Minimize user impact
4. **Monitor logs**: Watch for errors during migration
5. **Validate results**: Check that all users have both preference sets
6. **Keep backup file**: Retain for at least 30 days after migration

## Troubleshooting

### Issue: No preferences found
**Solution**: Check database connection and table name

### Issue: Migration fails for some users
**Solution**: Review log file for specific errors, fix issues, re-run for failed users only

### Issue: Validation fails
**Solution**: Check database constraints, ensure tables exist, verify permissions

### Issue: Performance is slow
**Solution**: Add database indexes, batch operations, increase connection pool

## Support

For issues or questions:
1. Check the log file for detailed error messages
2. Review the backup file to verify source data
3. Consult the design document: `.kiro/specs/notification-system-separation/design.md`
4. Contact the development team

## Related Scripts

- `migrate-notification-imports.ts`: Updates import statements
- `migrate-notification-files.ts`: Moves notification files
- `validate-notification-migration.ts`: Validates file migration
- `rollback-notification-migration.ts`: Rolls back file changes

## Requirements

This script implements:
- **Requirement 5.4**: Preserve existing notification preferences for all users
