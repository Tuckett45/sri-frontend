import * as fs from 'fs';
import * as path from 'path';

interface RollbackResult {
  filePath: string;
  backupPath: string;
  success: boolean;
  action: 'restored' | 'skipped' | 'failed';
  error?: string;
}

interface RollbackSummary {
  totalBackups: number;
  filesRestored: number;
  filesSkipped: number;
  filesFailed: number;
  results: RollbackResult[];
  errors: string[];
}

const logFile = path.join(__dirname, 'rollback-log.txt');
let logContent = '';

function log(message: string): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  logContent += logMessage + '\n';
}

function writeLog(): void {
  fs.writeFileSync(logFile, logContent, 'utf-8');
  console.log(`\nRollback log written to: ${logFile}`);
}

function getAllBackupFiles(dir: string, backupList: string[] = []): string[] {
  if (!fs.existsSync(dir)) {
    return backupList;
  }

  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!['node_modules', 'dist', '.angular', 'coverage'].includes(file)) {
        getAllBackupFiles(filePath, backupList);
      }
    } else if (file.endsWith('.backup')) {
      backupList.push(filePath);
    }
  });

  return backupList;
}

function restoreFromBackup(backupPath: string): RollbackResult {
  const originalPath = backupPath.replace('.backup', '');
  
  const result: RollbackResult = {
    filePath: originalPath,
    backupPath,
    success: false,
    action: 'failed'
  };

  try {
    // Check if backup exists
    if (!fs.existsSync(backupPath)) {
      result.error = 'Backup file does not exist';
      result.action = 'skipped';
      log(`SKIPPED: Backup not found: ${backupPath}`);
      return result;
    }

    // Check if original file exists
    const originalExists = fs.existsSync(originalPath);
    
    if (originalExists) {
      // Delete the current file
      fs.unlinkSync(originalPath);
      log(`Deleted current file: ${originalPath}`);
    }

    // Restore from backup
    fs.copyFileSync(backupPath, originalPath);
    log(`Restored: ${backupPath} -> ${originalPath}`);

    // Verify restoration
    if (!fs.existsSync(originalPath)) {
      result.error = 'Failed to verify restored file';
      log(`ERROR: Verification failed for ${originalPath}`);
      return result;
    }

    // Delete backup file
    fs.unlinkSync(backupPath);
    log(`Deleted backup: ${backupPath}`);

    result.success = true;
    result.action = 'restored';
    log(`Successfully restored: ${originalPath}`);

  } catch (error) {
    result.error = `Failed to restore: ${error}`;
    log(`ERROR: ${result.error}`);
  }

  return result;
}

function restoreMovedFiles(): RollbackResult[] {
  const results: RollbackResult[] = [];
  
  log('\n=== Restoring Moved Files ===');

  const movedFiles = [
    {
      backup: path.join(process.cwd(), 'src/app/services/notification.service.ts.backup'),
      target: path.join(process.cwd(), 'src/app/services/ark/ark-notification.service.ts')
    },
    {
      backup: path.join(process.cwd(), 'src/app/services/notification.service.spec.ts.backup'),
      target: path.join(process.cwd(), 'src/app/services/ark/ark-notification.service.spec.ts')
    },
    {
      backup: path.join(process.cwd(), 'src/app/models/notification.model.ts.backup'),
      target: path.join(process.cwd(), 'src/app/models/ark/notification.model.ts')
    }
  ];

  movedFiles.forEach(({ backup, target }) => {
    if (fs.existsSync(backup)) {
      log(`\nRestoring moved file from: ${backup}`);
      
      // Delete the target file if it exists
      if (fs.existsSync(target)) {
        try {
          fs.unlinkSync(target);
          log(`Deleted migrated file: ${target}`);
        } catch (error) {
          log(`ERROR: Failed to delete migrated file: ${target}: ${error}`);
        }
      }

      // Restore the backup
      const result = restoreFromBackup(backup);
      results.push(result);
    } else {
      log(`No backup found for moved file: ${backup}`);
    }
  });

  return results;
}

function validateRollback(results: RollbackResult[]): boolean {
  log('\n=== Validating Rollback ===');
  let allValid = true;

  results.forEach(result => {
    if (result.action === 'restored') {
      // Check that original file exists
      if (!fs.existsSync(result.filePath)) {
        log(`VALIDATION ERROR: Restored file does not exist: ${result.filePath}`);
        allValid = false;
      }

      // Check that backup is gone
      if (fs.existsSync(result.backupPath)) {
        log(`VALIDATION ERROR: Backup still exists: ${result.backupPath}`);
        allValid = false;
      }

      if (allValid) {
        log(`Validation passed for: ${result.filePath}`);
      }
    }
  });

  return allValid;
}

function rollbackMigration(): RollbackSummary {
  log('=== Notification Migration Rollback Started ===');
  log(`Working directory: ${process.cwd()}`);

  const summary: RollbackSummary = {
    totalBackups: 0,
    filesRestored: 0,
    filesSkipped: 0,
    filesFailed: 0,
    results: [],
    errors: []
  };

  // First, restore moved files
  const movedFileResults = restoreMovedFiles();
  summary.results.push(...movedFileResults);

  // Then, restore all other backup files
  log('\n=== Restoring Import Changes ===');
  const srcDir = path.join(process.cwd(), 'src');
  const scriptsDir = path.join(process.cwd(), 'scripts');
  
  const backupFiles = [
    ...getAllBackupFiles(srcDir),
    ...getAllBackupFiles(scriptsDir)
  ];

  summary.totalBackups = backupFiles.length + movedFileResults.length;
  log(`Found ${backupFiles.length} backup files to restore`);

  backupFiles.forEach(backupPath => {
    log(`\nProcessing: ${backupPath}`);
    const result = restoreFromBackup(backupPath);
    summary.results.push(result);
  });

  // Count results
  summary.results.forEach(result => {
    if (result.action === 'restored') {
      summary.filesRestored++;
    } else if (result.action === 'skipped') {
      summary.filesSkipped++;
    } else if (result.action === 'failed') {
      summary.filesFailed++;
      if (result.error) {
        summary.errors.push(`${result.filePath}: ${result.error}`);
      }
    }
  });

  // Validate rollback
  const validationPassed = validateRollback(summary.results.filter(r => r.action === 'restored'));

  log('\n=== Rollback Summary ===');
  log(`Total backups found: ${summary.totalBackups}`);
  log(`Files restored: ${summary.filesRestored}`);
  log(`Files skipped: ${summary.filesSkipped}`);
  log(`Files failed: ${summary.filesFailed}`);
  log(`Errors: ${summary.errors.length}`);

  if (summary.errors.length > 0) {
    log('\nErrors encountered:');
    summary.errors.forEach(error => log(`  - ${error}`));
  }

  if (validationPassed && summary.filesFailed === 0) {
    log('\n✓ Rollback completed successfully!');
  } else {
    log('\n✗ Rollback completed with errors. Check log for details.');
  }

  log('\n=== Rollback Complete ===');

  return summary;
}

// Run rollback
const summary = rollbackMigration();
writeLog();

// Exit with error code if there were errors
if (summary.errors.length > 0 || summary.filesFailed > 0) {
  process.exit(1);
}
