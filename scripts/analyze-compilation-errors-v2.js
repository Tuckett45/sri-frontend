#!/usr/bin/env node

/**
 * Compilation Error Analysis Script V2
 * 
 * This script captures TypeScript compilation errors and generates a categorized report.
 * It saves the raw compiler output for manual review.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Output directory for analysis reports
const outputDir = path.join(__dirname, '..', '.kiro', 'specs', 'test-compilation-errors-fix');
const rawOutputFile = path.join(outputDir, 'raw-compilation-errors.txt');
const reportFile = path.join(outputDir, 'error-analysis-report.md');

/**
 * Run TypeScript compiler and capture errors
 */
function getCompilationErrors() {
  console.log('Running TypeScript compiler to capture errors...\n');
  
  try {
    execSync('npx tsc --noEmit 2>&1', {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8',
      stdio: 'pipe'
    });
    console.log('✓ Compilation succeeded - no errors found');
    return '';
  } catch (error) {
    const output = error.stdout || error.stderr || '';
    return output;
  }
}

/**
 * Parse and analyze errors from raw output
 */
function analyzeErrors(rawOutput) {
  // Save raw output
  fs.writeFileSync(rawOutputFile, rawOutput);
  console.log(`✓ Saved raw output to: ${rawOutputFile}\n`);
  
  // Count errors by file
  const errorsByFile = {};
  const errorTypes = {
    'Unterminated string literal': 0,
    'Semicolon expected': 0,
    'Declaration or statement expected': 0,
    'Parenthesis expected': 0,
    'Other syntax errors': 0
  };
  
  // Split by lines and look for error patterns
  const lines = rawOutput.split('\n');
  let totalErrors = 0;
  
  for (const line of lines) {
    // Look for error pattern
    if (line.includes('error TS')) {
      totalErrors++;
      
      // Extract file name
      const fileMatch = line.match(/([^\\\/]+\.spec\.ts|[^\\\/]+\.service\.ts)/);
      if (fileMatch) {
        const fileName = fileMatch[1];
        errorsByFile[fileName] = (errorsByFile[fileName] || 0) + 1;
      }
      
      // Categorize error type
      if (line.includes('TS1002') || line.includes('Unterminated string')) {
        errorTypes['Unterminated string literal']++;
      } else if (line.includes('TS1005') && line.includes("';'")) {
        errorTypes['Semicolon expected']++;
      } else if (line.includes('TS1128')) {
        errorTypes['Declaration or statement expected']++;
      } else if (line.includes('TS1005') && line.includes("')'")) {
        errorTypes['Parenthesis expected']++;
      } else {
        errorTypes['Other syntax errors']++;
      }
    }
  }
  
  return { totalErrors, errorsByFile, errorTypes };
}

/**
 * Generate markdown report
 */
function generateReport(analysis) {
  const timestamp = new Date().toISOString();
  let report = `# Test Compilation Error Analysis Report\n\n`;
  report += `**Generated:** ${timestamp}\n\n`;
  report += `**Total Errors:** ${analysis.totalErrors}\n\n`;
  
  report += `## Error Types\n\n`;
  for (const [type, count] of Object.entries(analysis.errorTypes)) {
    if (count > 0) {
      report += `- **${type}:** ${count} errors\n`;
    }
  }
  report += `\n`;
  
  report += `## Affected Files\n\n`;
  report += `**Total Files with Errors:** ${Object.keys(analysis.errorsByFile).length}\n\n`;
  
  // Sort files by error count
  const sortedFiles = Object.entries(analysis.errorsByFile)
    .sort((a, b) => b[1] - a[1]);
  
  for (const [fileName, count] of sortedFiles) {
    report += `- **${fileName}:** ${count} error${count > 1 ? 's' : ''}\n`;
  }
  report += `\n`;
  
  report += `## Recommended Actions\n\n`;
  report += `### Immediate Fixes Needed\n\n`;
  
  if (analysis.errorTypes['Unterminated string literal'] > 0) {
    report += `1. **Fix Unterminated String Literals** (${analysis.errorTypes['Unterminated string literal']} errors)\n`;
    report += `   - Review files and close all string literals properly\n`;
    report += `   - Check for missing quotes or template literal backticks\n\n`;
  }
  
  if (analysis.errorTypes['Semicolon expected'] > 0) {
    report += `2. **Add Missing Semicolons** (${analysis.errorTypes['Semicolon expected']} errors)\n`;
    report += `   - Add semicolons where TypeScript expects them\n`;
    report += `   - May indicate incomplete statements or syntax errors\n\n`;
  }
  
  if (analysis.errorTypes['Declaration or statement expected'] > 0) {
    report += `3. **Fix Malformed Declarations** (${analysis.errorTypes['Declaration or statement expected']} errors)\n`;
    report += `   - Review code structure for incomplete or malformed declarations\n`;
    report += `   - Check for missing braces or incorrect nesting\n\n`;
  }
  
  if (analysis.errorTypes['Parenthesis expected'] > 0) {
    report += `4. **Add Missing Parentheses** (${analysis.errorTypes['Parenthesis expected']} errors)\n`;
    report += `   - Add closing parentheses where expected\n`;
    report += `   - Check function calls and expressions\n\n`;
  }
  
  report += `### Next Steps\n\n`;
  report += `1. Review the raw compilation output: \`${path.basename(rawOutputFile)}\`\n`;
  report += `2. Fix syntax errors in the affected files listed above\n`;
  report += `3. Re-run this analysis script to verify fixes\n`;
  report += `4. Once syntax errors are resolved, proceed with enum/property/selector fixes\n\n`;
  
  report += `---\n\n`;
  report += `**Raw Compilation Output:** See \`${path.basename(rawOutputFile)}\` for complete error details\n`;
  
  return report;
}

/**
 * Main function
 */
function main() {
  console.log('=== Test Compilation Error Analysis V2 ===\n');
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Get compilation errors
  const rawOutput = getCompilationErrors();
  
  if (!rawOutput || rawOutput.trim().length === 0) {
    console.log('✓ No compilation errors found!');
    
    const report = `# Test Compilation Error Analysis Report\n\n` +
      `**Generated:** ${new Date().toISOString()}\n\n` +
      `**Status:** ✓ No compilation errors found!\n\n` +
      `All test files compile successfully.\n`;
    
    fs.writeFileSync(reportFile, report);
    console.log(`✓ Report saved to: ${reportFile}`);
    return;
  }
  
  // Analyze errors
  console.log('Analyzing errors...\n');
  const analysis = analyzeErrors(rawOutput);
  
  console.log('=== Analysis Summary ===\n');
  console.log(`Total errors: ${analysis.totalErrors}`);
  console.log(`Affected files: ${Object.keys(analysis.errorsByFile).length}\n`);
  
  console.log('Error types:');
  for (const [type, count] of Object.entries(analysis.errorTypes)) {
    if (count > 0) {
      console.log(`  ${type}: ${count}`);
    }
  }
  console.log('');
  
  // Generate report
  const report = generateReport(analysis);
  fs.writeFileSync(reportFile, report);
  
  console.log(`✓ Report saved to: ${reportFile}`);
  console.log(`✓ Raw output saved to: ${rawOutputFile}`);
  console.log('\n✓ Analysis complete!');
}

// Run the script
main();
