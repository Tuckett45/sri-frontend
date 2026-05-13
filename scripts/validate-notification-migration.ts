import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

interface ValidationIssue {
  filePath: string;
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}

interface ValidationSummary {
  totalFiles: number;
  filesWithIssues: number;
  issues: ValidationIssue[];
  brokenImports: number;
  oldPathReferences: number;
  injectionIssues: number;
}

const logFile = path.join(__dirname, 'validation-log.txt');
let logContent = '';

function log(message: string): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  logContent += logMessage + '\n';
}

function writeLog(): void {
  fs.writeFileSync(logFile, logContent, 'utf-8');
  console.log(`\nValidation log written to: ${logFile}`);
}

function getAllTypeScriptFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) {
    return fileList;
  }

  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!['node_modules', 'dist', '.angular', 'coverage', 'scripts'].includes(file)) {
        getAllTypeScriptFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') && !file.endsWith('.backup')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

function checkForOldPaths(filePath: string, content: string, issues: ValidationIssue[]): void {
  const lines = content.split('\n');
  
  const oldServicePattern = /services\/notification\.service/;
  const oldModelPattern = /models\/notification\.model/;

  lines.forEach((line, index) => {
    if (oldServicePattern.test(line)) {
      issues.push({
        filePath,
        line: index + 1,
        column: line.indexOf('notification.service'),
        message: 'Reference to old notification service path found',
        severity: 'error'
      });
    }

    if (oldModelPattern.test(line)) {
      issues.push({
        filePath,
        line: index + 1,
        column: line.indexOf('notification.model'),
        message: 'Reference to old notification model path found',
        severity: 'error'
      });
    }
  });
}

function checkImportResolution(filePath: string, content: string, issues: ValidationIssue[]): void {
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true
  );

  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier;
      if (ts.isStringLiteral(moduleSpecifier)) {
        const importPath = moduleSpecifier.text;
        
        // Check for ARK notification imports
        if (importPath.includes('ark-notification.service') || 
            importPath.includes('ark/notification.model')) {
          
          // Resolve the import path
          const fileDir = path.dirname(filePath);
          let resolvedPath: string;
          
          if (importPath.startsWith('.')) {
            resolvedPath = path.resolve(fileDir, importPath);
          } else {
            resolvedPath = path.resolve(process.cwd(), 'src', importPath);
          }

          // Add .ts extension if not present
          if (!resolvedPath.endsWith('.ts')) {
            resolvedPath += '.ts';
          }

          // Check if file exists
          if (!fs.existsSync(resolvedPath)) {
            const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
            issues.push({
              filePath,
              line: line + 1,
              column: character + 1,
              message: `Cannot resolve import: ${importPath} (resolved to: ${resolvedPath})`,
              severity: 'error'
            });
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

function checkServiceInjection(filePath: string, content: string, issues: ValidationIssue[]): void {
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true
  );

  function visit(node: ts.Node): void {
    // Check for constructor parameters
    if (ts.isConstructorDeclaration(node)) {
      node.parameters.forEach(param => {
        if (param.type && ts.isTypeReferenceNode(param.type)) {
          const typeName = param.type.typeName.getText(sourceFile);
          
          // Check if it's a notification service
          if (typeName === 'NotificationService') {
            const { line, character } = sourceFile.getLineAndCharacterOfPosition(param.getStart());
            issues.push({
              filePath,
              line: line + 1,
              column: character + 1,
              message: 'Found NotificationService injection - should be ArkNotificationService or AtlasNotificationService',
              severity: 'warning'
            });
          }
        }
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

function validateFile(filePath: string, issues: ValidationIssue[]): void {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Check for old path references
    checkForOldPaths(filePath, content, issues);

    // Check import resolution
    checkImportResolution(filePath, content, issues);

    // Check service injection
    checkServiceInjection(filePath, content, issues);

  } catch (error) {
    log(`ERROR: Failed to validate ${filePath}: ${error}`);
    issues.push({
      filePath,
      line: 0,
      column: 0,
      message: `Failed to read or parse file: ${error}`,
      severity: 'error'
    });
  }
}

function validateMigration(): ValidationSummary {
  log('=== Notification Migration Validation Started ===');
  log(`Working directory: ${process.cwd()}`);

  const summary: ValidationSummary = {
    totalFiles: 0,
    filesWithIssues: 0,
    issues: [],
    brokenImports: 0,
    oldPathReferences: 0,
    injectionIssues: 0
  };

  const srcDir = path.join(process.cwd(), 'src');
  
  if (!fs.existsSync(srcDir)) {
    log('ERROR: src directory not found');
    return summary;
  }

  const allFiles = getAllTypeScriptFiles(srcDir);
  summary.totalFiles = allFiles.length;
  log(`Validating ${allFiles.length} TypeScript files`);

  allFiles.forEach(filePath => {
    const beforeCount = summary.issues.length;
    validateFile(filePath, summary.issues);
    const afterCount = summary.issues.length;

    if (afterCount > beforeCount) {
      summary.filesWithIssues++;
    }
  });

  // Categorize issues
  summary.issues.forEach(issue => {
    if (issue.message.includes('Cannot resolve import')) {
      summary.brokenImports++;
    } else if (issue.message.includes('old') && issue.message.includes('path')) {
      summary.oldPathReferences++;
    } else if (issue.message.includes('injection')) {
      summary.injectionIssues++;
    }
  });

  log('\n=== Validation Summary ===');
  log(`Total files validated: ${summary.totalFiles}`);
  log(`Files with issues: ${summary.filesWithIssues}`);
  log(`Total issues found: ${summary.issues.length}`);
  log(`  - Broken imports: ${summary.brokenImports}`);
  log(`  - Old path references: ${summary.oldPathReferences}`);
  log(`  - Injection issues: ${summary.injectionIssues}`);

  if (summary.issues.length > 0) {
    log('\n=== Issues Found ===');
    
    // Group issues by file
    const issuesByFile = new Map<string, ValidationIssue[]>();
    summary.issues.forEach(issue => {
      if (!issuesByFile.has(issue.filePath)) {
        issuesByFile.set(issue.filePath, []);
      }
      issuesByFile.get(issue.filePath)!.push(issue);
    });

    issuesByFile.forEach((fileIssues, filePath) => {
      log(`\n${filePath}:`);
      fileIssues.forEach(issue => {
        const severity = issue.severity.toUpperCase();
        log(`  [${severity}] Line ${issue.line}, Column ${issue.column}: ${issue.message}`);
      });
    });
  } else {
    log('\n✓ No issues found! Migration validation passed.');
  }

  log('\n=== Validation Complete ===');

  return summary;
}

// Run validation
const summary = validateMigration();
writeLog();

// Exit with error code if there were errors
const errorCount = summary.issues.filter(i => i.severity === 'error').length;
if (errorCount > 0) {
  console.log(`\n✗ Validation failed with ${errorCount} error(s)`);
  process.exit(1);
} else if (summary.issues.length > 0) {
  console.log(`\n⚠ Validation passed with ${summary.issues.length} warning(s)`);
} else {
  console.log('\n✓ Validation passed with no issues');
}
