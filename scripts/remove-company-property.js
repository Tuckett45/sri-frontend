const fs = require('fs');

// Files where objects have incorrect 'company' property
const files = [
  'src/app/features/field-resource-management/components/crews/crew-detail/crew-detail.component.spec.ts',
  'src/app/features/field-resource-management/components/crews/crew-form/crew-form.component.spec.ts',
  'src/app/features/field-resource-management/components/mapping/map/map.component.spec.ts',
  'src/app/features/field-resource-management/components/scheduling/assignment-dialog/assignment-dialog.component.spec.ts',
  'src/app/features/field-resource-management/components/scheduling/technician-schedule/technician-schedule.component.spec.ts',
  'src/app/features/field-resource-management/components/jobs/job-detail/job-detail.component.spec.ts',
  'src/app/features/field-resource-management/components/jobs/job-notes/job-notes.component.spec.ts',
  'src/app/features/field-resource-management/components/mobile/job-card/job-card.component.spec.ts',
  'src/app/features/field-resource-management/components/mobile/time-tracker/time-tracker.component.spec.ts',
  'src/app/features/field-resource-management/components/reporting/timecard-dashboard/timecard-dashboard.component.spec.ts'
];

console.log('=== REMOVING INCORRECT "company" PROPERTIES ===\n');

let fixed = 0;
let failed = 0;

files.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    
    // Remove lines with company property (including the comma and any whitespace)
    const updatedContent = content.replace(/\s*company:\s*['"][^'"]*['"]\s*,?\s*\n/g, '\n');
    
    fs.writeFileSync(file, updatedContent, 'utf8');
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
