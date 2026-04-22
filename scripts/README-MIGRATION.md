# Notification System Migration Scripts

This directory contains scripts for migrating the notification system from the legacy structure to the new ARK/ATLAS separated structure.

## Scripts Overview

### 1. migrate-notification-imports.ts
Updates all import statements in TypeScript files to use the new ARK notification paths.

**What it does:**
- Scans all TypeScript files in the `src` directory
- Updates imports from `services/notification.service` to `services/ark/ark-notification.service`
- Updates imports from `models/notification.model` to `models/ark/notification.model`
- Creates `.backup` files before modifying any file
- Logs all changes to console and `migration-log.txt`

**Usage:**
```bash
npx ts-node scripts/migrate-notification-imports.ts
```

### 2. migrate-notification-files.ts
Moves notification service and model files to their new ARK namespace locations.

**What it does:**
- Moves `src/app/services/notification.service.ts` to `src/app/services/ark/ark-notification.service.ts`
- Moves `src/app/services/notification.service.spec.ts` to `src/app/services/ark/ark-notification.service.spec.ts`
- Moves `src/app/models/notification.model.ts` to `src/app/models/ark/notification.model.ts`
- Creates backups of original files before moving
- Validates that moves completed successfully
- Logs all operations to console and `file-migration-log.txt`

**Usage:**
```bash
npx ts-node scripts/migrate-notification-files.ts
```

### 3. validate-notification-migration.ts
Validates that the migration was successful and identifies any issues.

**What it does:**
- Checks that all imports resolve correctly (no broken imports)
- Checks that no references to old paths remain
- Checks that services are properly injected in constructors
- Reports issues with file path, line number, and column number
- Logs validation results to console and `validation-log.txt`

**Usage:**
```bash
npx ts-node scripts/validate-notification-migration.ts
```

### 4. rollback-notification-migration.ts
Rolls back the migration by restoring all files from backups.

**What it does:**
- Restores all files from `.backup` files
- Reverts all import changes
- Restores moved files to their original locations
- Validates that rollback completed successfully
- Logs rollback operations to console and `rollback-log.txt`

**Usage:**
```bash
npx ts-node scripts/rollback-notification-migration.ts
```

## Migration Workflow

### Recommended Order

1. **Backup your repository** (commit all changes or create a branch)
   ```bash
   git checkout -b notification-migration
   git add .
   git commit -m "Pre-migration checkpoint"
   ```

2. **Run the import update script**
   ```bash
   npx ts-node scripts/migrate-notification-imports.ts
   ```
   This will update all import statements and create backups.

3. **Run the file move script**
   ```bash
   npx ts-node scripts/migrate-notification-files.ts
   ```
   This will move the notification files to their new locations.

4. **Run the validation script**
   ```bash
   npx ts-node scripts/validate-notification-migration.ts
   ```
   This will check for any issues with the migration.

5. **If validation passes, test your application**
   ```bash
   npm run build
   npm run test
   ```

6. **If issues are found, rollback**
   ```bash
   npx ts-node scripts/rollback-notification-migration.ts
   ```

### Alternative: Run All at Once

You can create a shell script to run all migration steps:

```bash
# migrate-all.sh
#!/bin/bash

echo "Starting notification migration..."

echo "Step 1: Updating imports..."
npx ts-node scripts/migrate-notification-imports.ts
if [ $? -ne 0 ]; then
  echo "Import update failed. Aborting."
  exit 1
fi

echo "Step 2: Moving files..."
npx ts-node scripts/migrate-notification-files.ts
if [ $? -ne 0 ]; then
  echo "File move failed. Rolling back..."
  npx ts-node scripts/rollback-notification-migration.ts
  exit 1
fi

echo "Step 3: Validating migration..."
npx ts-node scripts/validate-notification-migration.ts
if [ $? -ne 0 ]; then
  echo "Validation failed. Please review issues."
  echo "Run 'npx ts-node scripts/rollback-notification-migration.ts' to rollback."
  exit 1
fi

echo "Migration completed successfully!"
```

## Log Files

Each script generates a log file in the `scripts` directory:

- `migration-log.txt` - Import update operations
- `file-migration-log.txt` - File move operations
- `validation-log.txt` - Validation results
- `rollback-log.txt` - Rollback operations

## Backup Files

The scripts create `.backup` files for all modified files. These backups are used by the rollback script to restore the original state.

**Important:** Do not delete `.backup` files until you're confident the migration is successful!

## Troubleshooting

### Issue: "Cannot resolve import"
**Solution:** Check that the ARK notification files exist at the expected locations:
- `src/app/services/ark/ark-notification.service.ts`
- `src/app/models/ark/notification.model.ts`

### Issue: "Old path references found"
**Solution:** The validation script found references to old paths. Review the validation log to see which files need manual updates.

### Issue: "Backup file not found"
**Solution:** The rollback script couldn't find backup files. This might happen if:
- The migration scripts weren't run yet
- Backup files were manually deleted
- The migration was already rolled back

### Issue: TypeScript compilation errors after migration
**Solution:** 
1. Run the validation script to identify issues
2. Check that all imports are using the correct paths
3. Verify that service injections use the correct service names (ArkNotificationService, not NotificationService)

## Safety Features

- **Backups:** All modified files are backed up before changes
- **Validation:** The validation script checks for common issues
- **Rollback:** The rollback script can restore the original state
- **Logging:** All operations are logged for troubleshooting
- **Error Handling:** Scripts exit with error codes if issues occur

## Notes

- The scripts skip `node_modules`, `dist`, `.angular`, `coverage`, and `scripts` directories
- Test files (`.spec.ts`) are also migrated
- The scripts use relative paths to ensure portability
- All scripts are idempotent (safe to run multiple times)
