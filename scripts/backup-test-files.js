#!/usr/bin/env node

/**
 * Backup Script for Test Compilation Errors Fix
 * 
 * This script creates backups of all affected test files before applying fixes.
 * Backups are stored in a timestamped directory for easy restoration if needed.
 */

const fs = require('fs');
const path = require('path');

// Timestamp for backup directory
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
const backupDir = path.join(__dirname, '..', '.kiro', 'specs', 'test-compilation-errors-fix', `backup-${timestamp}`);

// Patterns to identify test files in the FRM feature
const testFilePatterns = [
  'src/app/features/field-resource-management/**/*.spec.ts',
  'src/app/features/field-resource-management/**/*.pbt.spec.ts',
  'src/app/shared/services/csv-loader.service.ts' // Production file with import error
];

// Files to backup (from bugfix.md affected files list)
const affectedFiles = [
  // State Management Tests
  'src/app/features/field-resource-management/state/jobs/job.selectors.spec.ts',
  'src/app/features/field-resource-management/state/jobs/job.effects.spec.ts',
  'src/app/features/field-resource-management/state/jobs/job.reducer.spec.ts',
  'src/app/features/field-resource-management/state/jobs/job.actions.spec.ts',
  'src/app/features/field-resource-management/state/technicians/technician.selectors.spec.ts',
  'src/app/features/field-resource-management/state/technicians/technician.effects.spec.ts',
  'src/app/features/field-resource-management/state/technicians/technician.reducer.spec.ts',
  'src/app/features/field-resource-management/state/technicians/technician.actions.spec.ts',
  'src/app/features/field-resource-management/state/crews/crew.selectors.spec.ts',
  'src/app/features/field-resource-management/state/crews/crew.effects.spec.ts',
  'src/app/features/field-resource-management/state/crews/crew.reducer.spec.ts',
  'src/app/features/field-resource-management/state/crews/crew.actions.spec.ts',
  'src/app/features/field-resource-management/state/assignments/assignment.selectors.spec.ts',
  'src/app/features/field-resource-management/state/assignments/assignment.effects.spec.ts',
  'src/app/features/field-resource-management/state/assignments/assignment.reducer.spec.ts',
  'src/app/features/field-resource-management/state/assignments/assignment.actions.spec.ts',
  'src/app/features/field-resource-management/state/reporting/reporting.selectors.spec.ts',
  'src/app/features/field-resource-management/state/reporting/reporting.effects.spec.ts',
  'src/app/features/field-resource-management/state/reporting/reporting.reducer.spec.ts',
  'src/app/features/field-resource-management/state/reporting/reporting.actions.spec.ts',
  'src/app/features/field-resource-management/state/ui/ui.selectors.spec.ts',
  'src/app/features/field-resource-management/state/ui/ui.reducer.spec.ts',
  'src/app/features/field-resource-management/state/ui/ui.actions.spec.ts',
  
  // Service Tests
  'src/app/features/field-resource-management/services/job.service.spec.ts',
  'src/app/features/field-resource-management/services/technician.service.spec.ts',
  'src/app/features/field-resource-management/services/crew.service.spec.ts',
  'src/app/features/field-resource-management/services/scheduling.service.spec.ts',
  'src/app/features/field-resource-management/services/reporting.service.spec.ts',
  'src/app/features/field-resource-management/services/data-scope.service.spec.ts',
  'src/app/features/field-resource-management/services/cache.service.spec.ts',
  'src/app/features/field-resource-management/services/geolocation.service.spec.ts',
  'src/app/features/field-resource-management/services/offline-queue.service.spec.ts',
  'src/app/features/field-resource-management/services/frm-signalr.service.spec.ts',
  'src/app/features/field-resource-management/services/optimistic-update.service.spec.ts',
  'src/app/features/field-resource-management/services/notification.service.spec.ts',
  
  // Component Tests
  'src/app/features/field-resource-management/components/crews/crew-list/crew-list.component.spec.ts',
  'src/app/features/field-resource-management/components/crews/crew-form/crew-form.component.spec.ts',
  'src/app/features/field-resource-management/components/crews/crew-detail/crew-detail.component.spec.ts',
  'src/app/features/field-resource-management/components/mapping/map/map.component.spec.ts',
  'src/app/features/field-resource-management/components/mapping/location-tracking-toggle/location-tracking-toggle.component.spec.ts',
  'src/app/features/field-resource-management/components/layout/frm-layout/frm-layout.component.spec.ts',
  'src/app/features/field-resource-management/components/layout/navigation-menu/navigation-menu.component.spec.ts',
  'src/app/features/field-resource-management/components/layout/breadcrumb/breadcrumb.component.spec.ts',
  'src/app/features/field-resource-management/components/layout/offline-indicator/offline-indicator.component.spec.ts',
  'src/app/features/field-resource-management/components/shared/date-range-picker/date-range-picker.component.spec.ts',
  'src/app/features/field-resource-management/components/shared/skill-selector/skill-selector.component.spec.ts',
  'src/app/features/field-resource-management/components/shared/file-upload/file-upload.component.spec.ts',
  'src/app/features/field-resource-management/components/shared/confirm-dialog/confirm-dialog.component.spec.ts',
  
  // Integration Tests
  'src/app/features/field-resource-management/integration-tests/real-time-events.integration.spec.ts',
  'src/app/features/field-resource-management/integration-tests/state-sync.integration.spec.ts',
  'src/app/features/field-resource-management/integration-tests/crew-workflows.e2e.spec.ts',
  
  // Production file with import error
  'src/app/shared/services/csv-loader.service.ts'
];

/**
 * Create backup directory structure
 */
function createBackupDir() {
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log(`✓ Created backup directory: ${backupDir}`);
  }
}

/**
 * Backup a single file
 */
function backupFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠ File not found: ${filePath}`);
    return false;
  }
  
  // Create subdirectory structure in backup
  const relativePath = filePath.replace('src/', '');
  const backupFilePath = path.join(backupDir, relativePath);
  const backupFileDir = path.dirname(backupFilePath);
  
  if (!fs.existsSync(backupFileDir)) {
    fs.mkdirSync(backupFileDir, { recursive: true });
  }
  
  // Copy file
  fs.copyFileSync(fullPath, backupFilePath);
  console.log(`✓ Backed up: ${filePath}`);
  return true;
}

/**
 * Main backup function
 */
function main() {
  console.log('=== Test Files Backup Script ===\n');
  console.log(`Backup directory: ${backupDir}\n`);
  
  createBackupDir();
  
  let backedUpCount = 0;
  let notFoundCount = 0;
  
  console.log('\nBacking up affected files...\n');
  
  for (const file of affectedFiles) {
    if (backupFile(file)) {
      backedUpCount++;
    } else {
      notFoundCount++;
    }
  }
  
  console.log('\n=== Backup Summary ===');
  console.log(`✓ Files backed up: ${backedUpCount}`);
  console.log(`⚠ Files not found: ${notFoundCount}`);
  console.log(`\nBackup location: ${backupDir}`);
  
  // Create backup manifest
  const manifest = {
    timestamp: new Date().toISOString(),
    backupDir,
    filesBackedUp: backedUpCount,
    filesNotFound: notFoundCount,
    affectedFiles
  };
  
  fs.writeFileSync(
    path.join(backupDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  
  console.log('\n✓ Backup complete!');
}

// Run the script
main();
