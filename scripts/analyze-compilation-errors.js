#!/usr/bin/env node

/**
 * Compilation Error Analysis Script
 * 
 * This script analyzes TypeScript compilation errors in test files and categorizes them
 * by error type to help prioritize and automate fixes.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Output directory for analysis reports
const outputDir = path.join(__dirname, '..', '.kiro', 'specs', 'test-compilation-errors-fix');
const reportFile = path.join(outputDir, 'error-analysis-report.md');

// Error categories based on bugfix.md
const errorCategories = {
  syntaxErrors: {
    name: 'Syntax Errors',
    patterns: [
      /error TS1002: Unterminated string literal/i,
      /error TS1005: ';' expected/i,
      /error TS1128: Declaration or statement expected/i,
      /error TS1005: '\)' expected/i
    ],
    fixes: [
      'Fix unterminated string literals',
      'Add missing semicolons',
      'Fix malformed declarations or statements',
      'Fix missing closing parentheses'
    ]
  },
  enumErrors: {
    name: 'Enum Value Errors',
    patterns: [
      /Property '(Pending|Scheduled|InProgress|OnHold)' does not exist.*JobStatus/i,
      /Property '(Installation|Maintenance|Repair|Inspection)' does not exist.*JobType/i,
      /Property '(High|Medium|Low)' does not exist.*Priority/i
    ],
    fixes: [
      'JobStatus: Pending→NotStarted, Scheduled→EnRoute, InProgress→OnSite, OnHold→Issue',
      'JobType: Installation→Install, Maintenance→PM, Repair→Decom, Inspection→SiteSurvey',
      'Priority: High→P1, Medium→P2, Low→Normal'
    ]
  },
  propertyErrors: {
    name: 'Missing/Incorrect Property Errors',
    patterns: [
      /Property 'level' is missing.*Skill/i,
      /Property 'content' does not exist.*JobNote/i,
      /Property 'jobId' does not exist.*Attachment/i,
      /Property 'firstName' does not exist.*User/i
    ],
    fixes: [
      'Skill: Add required "level: SkillLevel" property',
      'JobNote: Use "text" instead of "content"',
      'Attachment: Remove references to non-existent "jobId"',
      'User: Use "name" instead of "firstName"'
    ]
  },
  selectorErrors: {
    name: 'Selector Signature Errors',
    patterns: [
      /Expected 2 arguments, but got 1.*select(Todays|Overdue|Upcoming)Jobs/i,
      /Expected 2 arguments, but got 1.*selectJobStatistics/i
    ],
    fixes: [
      'Add second argument to selector calls (often date or filter parameter)'
    ]
  },
  importErrors: {
    name: 'Import/Type Definition Errors',
    patterns: [
      /Module.*has no exported member 'TechnicianStatus'/i,
      /Module.*has no exported member 'UserRole'/i,
      /Property 'default' does not exist.*Papa/i,
      /ConnectionStatus.*type/i
    ],
    fixes: [
      'TechnicianStatus: Use string literals or create enum',
      'UserRole: Use string literals matching implementation',
      'Papa.default: Use "import * as Papa" or "import { parse }"',
      'ConnectionStatus: Use correct type from UI state'
    ]
  }
};

/**
 * Run TypeScript compiler and capture errors
 */
function getCompilationErrors() {
  console.log('Running TypeScript compiler to capture errors...\n');
  
  try {
    // Try to compile - this will likely fail with errors
    const result = execSync('npx tsc --noEmit', {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8',
      stdio: 'pipe'
    });
    console.log('Compilation succeeded - no errors found');
    return ''; // No errors
  } catch (error) {
    // Compilation failed - return the error output
    const stdout = error.stdout || '';
    const stderr = error.stderr || '';
    const output = stdout + stderr;
    
    console.log(`Captured ${output.length} characters of error output`);
    
    // Debug: show first 500 chars
    if (output.length > 0) {
      console.log('First 500 chars of output:');
      console.log(output.substring(0, 500));
      console.log('...\n');
    }
    
    return output;
  }
}

/**
 * Parse compilation errors and categorize them
 */
function categorizeErrors(errorOutput) {
  const lines = errorOutput.split('\n');
  const errors = [];
  const categorized = {
    syntaxErrors: [],
    enumErrors: [],
    propertyErrors: [],
    selectorErrors: [],
    importErrors: [],
    otherErrors: []
  };
  
  console.log(`Parsing ${lines.length} lines of output...`);
  
  let matchCount = 0;
  for (const line of lines) {
    if (!line.trim()) continue;
    
    // Match TypeScript error format: file(line,col): error TSxxxx: message
    // The regex needs to handle potential whitespace and line breaks
    const fileMatch = line.match(/^(.+\.ts)\((\d+),(\d+)\):\s*error\s+TS\d+:\s*(.+)$/);
    
    if (fileMatch) {
      matchCount++;
      const error = {
        file: fileMatch[1].trim(),
        line: parseInt(fileMatch[2]),
        column: parseInt(fileMatch[3]),
        message: fileMatch[4].trim(),
        category: 'other'
      };
      
      errors.push(error);
    }
  }
  
  console.log(`Matched ${matchCount} error lines`);
  
  // Categorize each error
  for (const error of errors) {
    let categorized_flag = false;
    
    for (const [category, config] of Object.entries(errorCategories)) {
      for (const pattern of config.patterns) {
        if (pattern.test(error.message) || pattern.test(error.file + ' ' + error.message)) {
          categorized[category].push(error);
          error.category = category;
          categorized_flag = true;
          break;
        }
      }
      if (categorized_flag) break;
    }
    
    if (!categorized_flag) {
      categorized.otherErrors.push(error);
    }
  }
  
  return { errors, categorized };
}

/**
 * Generate analysis report
 */
function generateReport(errors, categorized) {
  const timestamp = new Date().toISOString();
  let report = `# Test Compilation Error Analysis Report\n\n`;
  report += `**Generated:** ${timestamp}\n\n`;
  report += `**Total Errors:** ${errors.length}\n\n`;
  
  report += `## Summary by Category\n\n`;
  
  for (const [category, config] of Object.entries(errorCategories)) {
    const count = categorized[category].length;
    report += `- **${config.name}:** ${count} errors\n`;
  }
  
  report += `- **Other Errors:** ${categorized.otherErrors.length} errors\n\n`;
  
  report += `---\n\n`;
  
  // Detailed breakdown by category
  for (const [category, config] of Object.entries(errorCategories)) {
    if (categorized[category].length === 0) continue;
    
    report += `## ${config.name}\n\n`;
    report += `**Count:** ${categorized[category].length}\n\n`;
    
    report += `**Recommended Fixes:**\n`;
    for (const fix of config.fixes) {
      report += `- ${fix}\n`;
    }
    report += `\n`;
    
    // Group by file
    const byFile = {};
    for (const error of categorized[category]) {
      const fileName = path.basename(error.file);
      if (!byFile[fileName]) {
        byFile[fileName] = [];
      }
      byFile[fileName].push(error);
    }
    
    report += `**Affected Files:**\n\n`;
    for (const [fileName, fileErrors] of Object.entries(byFile)) {
      report += `### ${fileName}\n\n`;
      report += `**Errors:** ${fileErrors.length}\n\n`;
      
      for (const error of fileErrors.slice(0, 3)) { // Show first 3 errors per file
        report += `- Line ${error.line}: ${error.message.substring(0, 100)}${error.message.length > 100 ? '...' : ''}\n`;
      }
      
      if (fileErrors.length > 3) {
        report += `- ... and ${fileErrors.length - 3} more errors\n`;
      }
      
      report += `\n`;
    }
    
    report += `---\n\n`;
  }
  
  // Other errors section
  if (categorized.otherErrors.length > 0) {
    report += `## Other Errors\n\n`;
    report += `**Count:** ${categorized.otherErrors.length}\n\n`;
    
    const byFile = {};
    for (const error of categorized.otherErrors) {
      const fileName = path.basename(error.file);
      if (!byFile[fileName]) {
        byFile[fileName] = [];
      }
      byFile[fileName].push(error);
    }
    
    report += `**Affected Files:**\n\n`;
    for (const [fileName, fileErrors] of Object.entries(byFile)) {
      report += `- ${fileName}: ${fileErrors.length} errors\n`;
    }
    
    report += `\n`;
  }
  
  return report;
}

/**
 * Generate JSON data for programmatic access
 */
function generateJSON(errors, categorized) {
  return {
    timestamp: new Date().toISOString(),
    totalErrors: errors.length,
    summary: {
      syntaxErrors: categorized.syntaxErrors.length,
      enumErrors: categorized.enumErrors.length,
      propertyErrors: categorized.propertyErrors.length,
      selectorErrors: categorized.selectorErrors.length,
      importErrors: categorized.importErrors.length,
      otherErrors: categorized.otherErrors.length
    },
    categorized,
    allErrors: errors
  };
}

/**
 * Main analysis function
 */
function main() {
  console.log('=== Test Compilation Error Analysis ===\n');
  
  // Get compilation errors
  const errorOutput = getCompilationErrors();
  
  if (!errorOutput || errorOutput.trim().length === 0) {
    console.log('✓ No compilation errors found!');
    return;
  }
  
  console.log('Analyzing errors...\n');
  
  // Categorize errors
  const { errors, categorized } = categorizeErrors(errorOutput);
  
  console.log('=== Analysis Summary ===\n');
  console.log(`Total errors found: ${errors.length}\n`);
  
  for (const [category, config] of Object.entries(errorCategories)) {
    console.log(`${config.name}: ${categorized[category].length}`);
  }
  console.log(`Other Errors: ${categorized.otherErrors.length}\n`);
  
  // Generate reports
  console.log('Generating reports...\n');
  
  const report = generateReport(errors, categorized);
  const jsonData = generateJSON(errors, categorized);
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Write markdown report
  fs.writeFileSync(reportFile, report);
  console.log(`✓ Markdown report: ${reportFile}`);
  
  // Write JSON data
  const jsonFile = path.join(outputDir, 'error-analysis-data.json');
  fs.writeFileSync(jsonFile, JSON.stringify(jsonData, null, 2));
  console.log(`✓ JSON data: ${jsonFile}`);
  
  console.log('\n✓ Analysis complete!');
}

// Run the script
main();
