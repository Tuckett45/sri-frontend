#!/usr/bin/env node

/**
 * Script to fix incorrect JobStatus enum references in test files
 * 
 * Replaces:
 * - JobStatus.Pending → JobStatus.NotStarted
 * - JobStatus.Scheduled → JobStatus.EnRoute
 * - JobStatus.InProgress → JobStatus.OnSite
 * - JobStatus.OnHold → JobStatus.Issue
 */

const fs = require('fs');
const path = require('path');

// Mapping of incorrect to correct enum values
const replacements = [
  { from: /JobStatus\.Pending/g, to: 'JobStatus.NotStarted', name: 'Pending → NotStarted' },
  { from: /JobStatus\.Scheduled/g, to: 'JobStatus.EnRoute', name: 'Scheduled → EnRoute' },
  { from: /JobStatus\.InProgress/g, to: 'JobStatus.OnSite', name: 'InProgress → OnSite' },
  { from: /JobStatus\.OnHold/g, to: 'JobStatus.Issue', name: 'OnHold → Issue' }
];

// Files to fix (from grep search results)
const filesToFix = [
  'src/app/features/field-resource-management/state/reporting/reporting.actions.spec.ts',
  'src/app/features/field-resource-management/state/reporting/reporting.effects.spec.ts',
  'src/app/features/field-resource-management/state/reporting/reporting.reducer.spec.ts',
  'src/app/features/field-resource-management/state/reporting/reporting.selectors.spec.ts',
  'src/app/features/field-resource-management/state/jobs/job.actions.spec.ts',
  'src/app/features/field-resource-management/state/jobs/job.effects.spec.ts',
  'src/app/features/field-resource-management/state/jobs/job.reducer.spec.ts',
  'src/app/features/field-resource-management/integration-tests/crew-workflows.e2e.spec.ts'
];

let totalReplacements = 0;
const results = [];

console.log('🔧 Fixing JobStatus enum references...\n');

filesToFix.forEach(filePath => {
  const fullPath = path.resolve(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    results.push({ file: filePath, status: 'not_found', replacements: 0 });
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;
  let fileReplacements = 0;
  const replacementDetails = [];

  replacements.forEach(({ from, to, name }) => {
    const matches = content.match(from);
    if (matches) {
      const count = matches.length;
      content = content.replace(from, to);
      fileReplacements += count;
      totalReplacements += count;
      replacementDetails.push(`  - ${name}: ${count} occurrence(s)`);
    }
  });

  if (fileReplacements > 0) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ ${path.basename(filePath)}`);
    replacementDetails.forEach(detail => console.log(detail));
    console.log();
    results.push({ file: filePath, status: 'fixed', replacements: fileReplacements });
  } else {
    console.log(`ℹ️  ${path.basename(filePath)} - No changes needed`);
    results.push({ file: filePath, status: 'no_changes', replacements: 0 });
  }
});

console.log('\n' + '='.repeat(60));
console.log('📊 Summary');
console.log('='.repeat(60));
console.log(`Total files processed: ${filesToFix.length}`);
console.log(`Files modified: ${results.filter(r => r.status === 'fixed').length}`);
console.log(`Total replacements: ${totalReplacements}`);
console.log('='.repeat(60));

// Save results to JSON
const reportPath = '.kiro/specs/test-compilation-errors-fix/jobstatus-fix-report.json';
fs.writeFileSync(reportPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  totalFiles: filesToFix.length,
  filesModified: results.filter(r => r.status === 'fixed').length,
  totalReplacements,
  results
}, null, 2));

console.log(`\n📄 Report saved to: ${reportPath}`);
console.log('\n✨ Done! Run TypeScript compiler to verify fixes.');
