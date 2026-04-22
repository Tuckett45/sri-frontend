const fs = require('fs');

// Files where Job objects are missing required properties
const jobFiles = [
  {
    file: 'src/app/features/field-resource-management/components/jobs/job-detail/job-detail.component.spec.ts',
    line: 31,
    addAfter: 'updatedAt: new Date()'
  },
  {
    file: 'src/app/features/field-resource-management/components/mobile/job-card/job-card.component.spec.ts',
    line: 15,
    addAfter: 'updatedAt: new Date()'
  },
  {
    file: 'src/app/features/field-resource-management/components/mobile/time-tracker/time-tracker.component.spec.ts',
    line: 24,
    addAfter: 'updatedAt: new Date()'
  },
  {
    file: 'src/app/features/field-resource-management/components/reporting/timecard-dashboard/timecard-dashboard.component.spec.ts',
    line: 15,
    addAfter: 'updatedAt: new Date()'
  },
  {
    file: 'src/app/features/field-resource-management/components/scheduling/assignment-dialog/assignment-dialog.component.spec.ts',
    line: 26,
    addAfter: 'updatedAt: new Date()'
  }
];

console.log('=== ADDING MISSING PROPERTIES TO JOB OBJECTS ===\n');

let fixed = 0;
let failed = 0;

jobFiles.forEach(({ file }) => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    
    // Find Job objects missing market and company properties
    // Look for patterns like: updatedAt: new Date()\n    }
    // and add market and company before the closing brace
    
    // Pattern 1: updatedAt: new Date() followed by closing brace (no comma)
    content = content.replace(
      /(updatedAt:\s*new Date\(\))(\s*\n\s*})/g,
      '$1,\n    market: \'DALLAS\',\n    company: \'ACME_CORP\'$2'
    );
    
    // Pattern 2: updatedAt: new Date(), followed by other properties
    // This shouldn't add duplicates if market/company already exist
    if (!content.includes('market:') || content.split('market:').length < 3) {
      content = content.replace(
        /(updatedAt:\s*new Date\(\)),(\s*\n\s*createdBy:)/g,
        '$1,\n    market: \'DALLAS\',\n    company: \'ACME_CORP\',$2'
      );
    }
    
    fs.writeFileSync(file, content, 'utf8');
    console.log(`✓ Fixed: ${file}`);
    fixed++;
  } catch (error) {
    console.error(`✗ Error fixing ${file}:`, error.message);
    failed++;
  }
});

console.log(`\n=== SUMMARY ===`);
console.log(`Fixed: ${fixed} files`);
console.log(`Failed: ${failed} files`);
