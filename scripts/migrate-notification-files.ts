import * as fs from 'fs';
import * as path from 'path';

interface FileMoveResult {
  sourcePath: string;
  targetPath: string;
  backupPath: string;
  success: boolean;
  error?: string;
}

interface MigrationSummary {
  moves: FileMoveResult[];
  totalMoves: number;
  successfulMoves: number;
  backupsCreated: number;
  errors: string[];
}

const logFile = path.join(__dirname, 'file-migration-log.txt');
let logContent = '';

function log(message: string): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  logContent += logMessage + '\n';
}

function writeLog(): void {
  fs.writeFileSync(logFile, logContent, 'utf-8');
  console.log(`\nFile migration log written to: ${logFile}`);
}

function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    log(`Created directory: ${dirPath}`);
  }
}

function createBackup(filePath: string): string | null {
  try {
    const backupPath = `${filePath}.backup`;
    fs.copyFileSync(filePath, backupPath);
    log(`Created backup: ${backupPath}`);
    return backupPath;
  } catch (error) {
    log(`ERROR: Failed to create backup for ${filePath}: ${error}`);
    return null;
  }
}

function moveFile(sourcePath: string, targetPath: string): FileMoveResult {
  const result: FileMoveResult = {
    sourcePath,
    targetPath,
    backupPath: '',
    success: false
  };

  try {
    // Check if source file exists
    if (!fs.existsSync(sourcePath)) {
      result.error = 'Source file does not exist';
      log(`ERROR: Source file not found: ${sourcePath}`);
      return result;
    }

    // Create backup of source file
    const backupPath = createBackup(sourcePath);
    if (!backupPath) {
      result.error = 'Failed to create backup';
      return result;
    }
    result.backupPath = backupPath;

    // Ensure target directory exists
    const targetDir = path.dirname(targetPath);
    ensureDirectoryExists(targetDir);

    // Check if target already exists
    if (fs.existsSync(targetPath)) {
      log(`WARNING: Target file already exists: ${targetPath}`);
      // Create backup of existing target
      createBackup(targetPath);
    }

    // Copy file to new location
    fs.copyFileSync(sourcePath, targetPath);
    log(`Copied: ${sourcePath} -> ${targetPath}`);

    // Verify the copy was successful
    if (!fs.existsSync(targetPath)) {
      result.error = 'Target file was not created';
      log(`ERROR: Failed to verify target file: ${targetPath}`);
      return result;
    }

    // Delete original file
    fs.unlinkSync(sourcePath);
    log(`Deleted original: ${sourcePath}`);

    result.success = true;
    log(`Successfully moved: ${sourcePath} -> ${targetPath}`);
  } catch (error) {
    result.error = `Failed to move file: ${error}`;
    log(`ERROR: ${result.error}`);
  }

  return result;
}

function validateMove(result: FileMoveResult): boolean {
  if (!result.success) {
    return false;
  }

  // Check target exists
  if (!fs.existsSync(result.targetPath)) {
    log(`VALIDATION ERROR: Target file does not exist: ${result.targetPath}`);
    return false;
  }

  // Check source is gone
  if (fs.existsSync(result.sourcePath)) {
    log(`VALIDATION ERROR: Source file still exists: ${result.sourcePath}`);
    return false;
  }

  // Check backup exists
  if (!fs.existsSync(result.backupPath)) {
    log(`VALIDATION ERROR: Backup file does not exist: ${result.backupPath}`);
    return false;
  }

  log(`Validation passed for: ${result.targetPath}`);
  return true;
}

function migrateFiles(): MigrationSummary {
  log('=== Notification File Migration Started ===');
  log(`Working directory: ${process.cwd()}`);

  const summary: MigrationSummary = {
    moves: [],
    totalMoves: 0,
    successfulMoves: 0,
    backupsCreated: 0,
    errors: []
  };

  const filesToMove = [
    {
      source: path.join(process.cwd(), 'src/app/services/notification.service.ts'),
      target: path.join(process.cwd(), 'src/app/services/ark/ark-notification.service.ts')
    },
    {
      source: path.join(process.cwd(), 'src/app/services/notification.service.spec.ts'),
      target: path.join(process.cwd(), 'src/app/services/ark/ark-notification.service.spec.ts')
    },
    {
      source: path.join(process.cwd(), 'src/app/models/notification.model.ts'),
      target: path.join(process.cwd(), 'src/app/models/ark/notification.model.ts')
    }
  ];

  summary.totalMoves = filesToMove.length;
  log(`Planning to move ${filesToMove.length} files`);

  filesToMove.forEach(({ source, target }) => {
    log(`\nProcessing: ${source}`);
    const result = moveFile(source, target);
    summary.moves.push(result);

    if (result.success) {
      // Validate the move
      if (validateMove(result)) {
        summary.successfulMoves++;
        if (result.backupPath) {
          summary.backupsCreated++;
        }
      } else {
        summary.errors.push(`Validation failed for ${source}`);
      }
    } else {
      summary.errors.push(`${source}: ${result.error || 'Unknown error'}`);
    }
  });

  log('\n=== Migration Summary ===');
  log(`Total files to move: ${summary.totalMoves}`);
  log(`Successfully moved: ${summary.successfulMoves}`);
  log(`Backups created: ${summary.backupsCreated}`);
  log(`Errors: ${summary.errors.length}`);

  if (summary.errors.length > 0) {
    log('\nErrors encountered:');
    summary.errors.forEach(error => log(`  - ${error}`));
  }

  if (summary.successfulMoves === summary.totalMoves) {
    log('\n✓ All files moved successfully!');
  } else {
    log('\n✗ Some files failed to move. Check errors above.');
  }

  log('\n=== Migration Complete ===');

  return summary;
}

// Run migration
const summary = migrateFiles();
writeLog();

// Exit with error code if there were errors
if (summary.errors.length > 0) {
  process.exit(1);
}
