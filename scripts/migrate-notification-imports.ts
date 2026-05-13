import * as fs from 'fs';
import * as path from 'path';

interface MigrationResult {
  filePath: string;
  changes: string[];
  success: boolean;
  error?: string;
}

interface MigrationSummary {
  totalFiles: number;
  modifiedFiles: number;
  backupFiles: number;
  errors: string[];
  results: MigrationResult[];
}

const OLD_SERVICE_IMPORT = /from\s+['"]\.\.?\/?(.*\/)?services\/notification\.service['"]/g;
const OLD_MODEL_IMPORT = /from\s+['"]\.\.?\/?(.*\/)?models\/notification\.model['"]/g;

const logFile = path.join(__dirname, 'migration-log.txt');
let logContent = '';

function log(message: string): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  logContent += logMessage + '\n';
}

function writeLog(): void {
  fs.writeFileSync(logFile, logContent, 'utf-8');
  console.log(`\nMigration log written to: ${logFile}`);
}

function getAllTypeScriptFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules, dist, and other build directories
      if (!['node_modules', 'dist', '.angular', 'coverage', 'scripts'].includes(file)) {
        getAllTypeScriptFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') && !file.endsWith('.spec.ts') && !file.endsWith('.backup')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

function createBackup(filePath: string): boolean {
  try {
    const backupPath = `${filePath}.backup`;
    fs.copyFileSync(filePath, backupPath);
    log(`Created backup: ${backupPath}`);
    return true;
  } catch (error) {
    log(`ERROR: Failed to create backup for ${filePath}: ${error}`);
    return false;
  }
}

function updateImports(filePath: string): MigrationResult {
  const result: MigrationResult = {
    filePath,
    changes: [],
    success: false
  };

  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    let modified = false;

    // Update service imports
    const serviceMatches = content.match(OLD_SERVICE_IMPORT);
    if (serviceMatches) {
      content = content.replace(OLD_SERVICE_IMPORT, (match) => {
        const relativePath = calculateRelativePath(filePath, 'src/app/services/ark/ark-notification.service');
        const newImport = `from '${relativePath}'`;
        result.changes.push(`Service import: ${match} -> ${newImport}`);
        modified = true;
        return newImport;
      });
    }

    // Update model imports
    const modelMatches = content.match(OLD_MODEL_IMPORT);
    if (modelMatches) {
      content = content.replace(OLD_MODEL_IMPORT, (match) => {
        const relativePath = calculateRelativePath(filePath, 'src/app/models/ark/notification.model');
        const newImport = `from '${relativePath}'`;
        result.changes.push(`Model import: ${match} -> ${newImport}`);
        modified = true;
        return newImport;
      });
    }

    if (modified) {
      // Create backup before modifying
      if (!createBackup(filePath)) {
        result.error = 'Failed to create backup';
        return result;
      }

      // Write updated content
      fs.writeFileSync(filePath, content, 'utf-8');
      log(`Updated: ${filePath}`);
      result.changes.forEach(change => log(`  - ${change}`));
      result.success = true;
    } else {
      result.success = true; // No changes needed is still success
    }
  } catch (error) {
    result.error = `Failed to process file: ${error}`;
    log(`ERROR: ${result.error}`);
  }

  return result;
}

function calculateRelativePath(fromFile: string, toFile: string): string {
  const fromDir = path.dirname(fromFile);
  const relativePath = path.relative(fromDir, toFile);
  
  // Convert Windows backslashes to forward slashes
  const normalizedPath = relativePath.replace(/\\/g, '/');
  
  // Ensure it starts with ./ or ../
  if (!normalizedPath.startsWith('.')) {
    return './' + normalizedPath;
  }
  
  return normalizedPath;
}

function migrateImports(): MigrationSummary {
  log('=== Notification Import Migration Started ===');
  log(`Working directory: ${process.cwd()}`);
  
  const summary: MigrationSummary = {
    totalFiles: 0,
    modifiedFiles: 0,
    backupFiles: 0,
    errors: [],
    results: []
  };

  const srcDir = path.join(process.cwd(), 'src');
  
  if (!fs.existsSync(srcDir)) {
    log('ERROR: src directory not found');
    summary.errors.push('src directory not found');
    return summary;
  }

  const allFiles = getAllTypeScriptFiles(srcDir);
  summary.totalFiles = allFiles.length;
  log(`Found ${allFiles.length} TypeScript files to scan`);

  allFiles.forEach(filePath => {
    const result = updateImports(filePath);
    summary.results.push(result);

    if (result.changes.length > 0) {
      summary.modifiedFiles++;
      if (fs.existsSync(`${filePath}.backup`)) {
        summary.backupFiles++;
      }
    }

    if (result.error) {
      summary.errors.push(`${filePath}: ${result.error}`);
    }
  });

  log('\n=== Migration Summary ===');
  log(`Total files scanned: ${summary.totalFiles}`);
  log(`Files modified: ${summary.modifiedFiles}`);
  log(`Backup files created: ${summary.backupFiles}`);
  log(`Errors: ${summary.errors.length}`);

  if (summary.errors.length > 0) {
    log('\nErrors encountered:');
    summary.errors.forEach(error => log(`  - ${error}`));
  }

  log('\n=== Migration Complete ===');
  
  return summary;
}

// Run migration
const summary = migrateImports();
writeLog();

// Exit with error code if there were errors
if (summary.errors.length > 0) {
  process.exit(1);
}
