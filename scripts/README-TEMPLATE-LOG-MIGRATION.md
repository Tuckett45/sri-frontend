# Template and Log Migration Script

## Overview

This script migrates existing notification templates and logs to use ARK notification types as part of the notification system separation between ARK and ATLAS domains.

## What It Does

1. **Reads existing notification templates** from the database
2. **Updates template types** to use ARK notification types
3. **Reads existing notification logs** from the database
4. **Updates log types** to ensure they reference ARK notification types
5. **Validates** all templates and logs are accessible after migration
6. **Logs** migration progress and any errors
7. **Creates backups** before making changes

## Type Mapping

The script maps legacy notification types to ARK notification types:

| Legacy Type | ARK Type |
|-------------|----------|
| approval_reminder | approval_reminder |
| critical_issue | critical_issue |
| broadcast | broadcast |
| workflow_update | workflow_update |
| user_management | user_management |
| resource_allocation | resource_allocation |
| reporting | reporting |
| job_assigned | job_assigned |
| job_reassigned | job_reassigned |
| job_status_changed | job_status_changed |
| job_cancelled | job_cancelled |
| certification_expiring | certification_expiring |
| conflict_detected | conflict_detected |

**Legacy variations** (mapped to ARK types):
- `approval` → `approval_reminder`
- `critical` → `critical_issue`
- `job` → `job_assigned`
- `certification` → `certification_expiring`
- `conflict` → `conflict_detected`

**Unknown types** default to `workflow_update`.

## Usage

### Dry Run (Recommended First)

Test the migration without making changes:

```bash
npx ts-node scripts/migrate-templates-and-logs.ts --dry-run
```

### Live Migration

Execute the actual migration:

```bash
npx ts-node scripts/migrate-templates-and-logs.ts
```

## Database Integration

**IMPORTANT**: This script currently uses mock data for demonstration. To use with a real database:

1. Replace the `readExistingTemplates()` function with actual database queries:
```typescript
async function readExistingTemplates(): Promise<LegacyNotificationTemplate[]> {
  return await db.query('SELECT * FROM notification_templates');
}
```

2. Replace the `readExistingLogs()` function with actual database queries:
```typescript
async function readExistingLogs(): Promise<LegacyNotificationLog[]> {
  return await db.query('SELECT * FROM notification_logs');
}
```

3. Replace the `saveTemplate()` function with actual database updates:
```typescript
async function saveTemplate(template: ArkNotificationTemplate): Promise<boolean> {
  await db.query(
    'UPDATE notification_templates SET type = ?, updatedAt = ? WHERE id = ?',
    [template.type, template.updatedAt, template.id]
  );
  return true;
}
```

4. Replace the `saveLog()` function with actual database updates:
```typescript
async function saveLog(logEntry: ArkNotificationLog): Promise<boolean> {
  await db.query(
    'UPDATE notification_logs SET type = ? WHERE id = ?',
    [logEntry.type, logEntry.id]
  );
  return true;
}
```

## Mock Data for Testing

To test the script with mock data, create these files:

### `scripts/mock-templates.json`
```json
[
  {
    "id": "template-1",
    "name": "Approval Reminder Template",
    "type": "approval",
    "subject": "Approval Required",
    "bodyTemplate": "You have pending approvals",
    "channels": ["email", "in-app"],
    "priority": "high",
    "variables": ["approvalCount", "dueDate"],
    "isActive": true,
    "createdBy": "admin",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
]
```

### `scripts/mock-logs.json`
```json
[
  {
    "id": "log-1",
    "notificationId": "notif-1",
    "userId": "user-1",
    "market": "US-WEST",
    "channel": "email",
    "status": "delivered",
    "sentAt": "2024-01-01T00:00:00Z",
    "deliveredAt": "2024-01-01T00:01:00Z",
    "type": "approval"
  }
]
```

## Output Files

### Backup Files
- `scripts/backup-templates.json` - Backup of all templates before migration
- `scripts/backup-logs.json` - Backup of all logs before migration

### Log File
- `scripts/migration-templates-and-logs.log` - Detailed migration log with timestamps

## Migration Summary

After running, the script outputs:

```
================================================================================
Migration Summary
================================================================================
Total templates: 10
Successful template migrations: 10
Failed template migrations: 0
Templates updated: 5

Total logs: 100
Successful log migrations: 100
Failed log migrations: 0
Logs updated: 50

Duration: 1234ms
Migration completed successfully!
================================================================================
```

## Error Handling

The script handles various error scenarios:

1. **Template not found** - Logs error and continues
2. **Log not found** - Logs error and continues
3. **Database connection failure** - Logs error and exits
4. **Validation failure** - Logs error and marks migration as failed
5. **Unknown type** - Maps to `workflow_update` and logs warning

## Rollback

If migration fails or needs to be rolled back:

1. Restore from backup files:
   - `scripts/backup-templates.json`
   - `scripts/backup-logs.json`

2. Use database restore commands to revert changes

## Requirements

- Node.js 14+
- TypeScript
- Database connection (for live migration)
- Appropriate database permissions

## Related Scripts

- `migrate-user-preferences.ts` - Migrates user notification preferences
- `migrate-notification-imports.ts` - Updates import statements
- `migrate-notification-files.ts` - Moves notification files
- `validate-notification-migration.ts` - Validates migration
- `rollback-notification-migration.ts` - Rolls back migration

## Support

For issues or questions:
1. Check the log file: `scripts/migration-templates-and-logs.log`
2. Review the backup files to verify data integrity
3. Run in dry-run mode to preview changes
4. Consult the notification system separation design document

## Requirements Validation

This script validates **Requirement 5.5**:
- Templates are updated to use ARK notification types
- Logs reference ARK notification types
- All templates remain functional after migration
- All logs remain accessible after migration
