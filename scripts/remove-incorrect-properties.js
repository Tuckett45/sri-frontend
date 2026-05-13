const fs = require('fs');
const path = require('path');

// Files where Technician objects have incorrect 'market' property
const technicianFiles = [
  'src/app/features/field-resource-management/components/crews/crew-detail/crew-detail.component.spec.ts',
  'src/app/features/field-resource-management/components/crews/crew-form/crew-form.component.spec.ts',
  'src/app/features/field-resource-management/components/mapping/map/map.component.spec.ts',
  'src/app/features/field-resource-management/components/scheduling/assignment-dialog/assignment-dialog.component.spec.ts',
  'src/app/features/field-resource-management/components/scheduling/technician-schedule/technician-schedule.component.spec.ts',
  'src/app/features/field-resource-management/components/shared/batch-technician-dialog/batch-technician-dialog.component.spec.ts',
  'src/app/features/field-resource-management/components/technicians/technician-detail/technician-detail.component.spec.ts',
  'src/app/features/field-resource-management/components/technicians/technician-form/technician-form.component.spec.ts',
  'src/app/features/field-resource-management/components/technicians/technician-list/technician-list.component.spec.ts',
  'src/app/features/field-resource-management/integration-tests/crew-workflows.e2e.spec.ts'
];

// Files where TimeEntry objects have incorrect 'market' property
const timeEntryFiles = [
  'src/app/features/field-resource-management/components/jobs/job-detail/job-detail.component.spec.ts',
  'src/app/features/field-resource-management/components/mobile/job-card/job-card.component.spec.ts',
  'src/app/features/field-resource-management/components/mobile/time-tracker/time-tracker.component.spec.ts',
  'src/app/features/field-resource-management/components/reporting/timecard-dashboard/timecard-dashboard.component.spec.ts'
];

// Files where JobNote objects have incorrect 'market' property
const jobNoteFiles = [
  'src/app/features/field-resource-management/components/jobs/job-notes/job-notes.component.spec.ts'
];

function removePropertyFromFile(filePath, propertyPattern) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Remove lines with the property (including the comma and any whitespace)
    const updatedContent = content.replace(new RegExp(`\\s*${propertyPattern}\\s*,?\\s*\\n`, 'g'), '\n');
    
    fs.writeFileSync(filePath, updatedContent, 'utf8');
    console.log(`✓ Fixed: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`✗ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

console.log('=== REMOVING INCORRECT PROPERTIES ===\n');

console.log('1. Removing "market" from Technician objects...');
let fixed = 0;
let failed = 0;

technicianFiles.forEach(file => {
  if (removePropertyFromFile(file, "market: 'DALLAS',")) {
    fixed++;
  } else {
    failed++;
  }
});

console.log(`\n2. Removing "market" from TimeEntry objects...`);
timeEntryFiles.forEach(file => {
  if (removePropertyFromFile(file, "market: 'DALLAS',")) {
    fixed++;
  } else {
    failed++;
  }
});

console.log(`\n3. Removing "market" from JobNote objects...`);
jobNoteFiles.forEach(file => {
  if (removePropertyFromFile(file, "market: 'DALLAS',")) {
    fixed++;
  } else {
    failed++;
  }
});

console.log(`\n=== SUMMARY ===`);
console.log(`Fixed: ${fixed} files`);
console.log(`Failed: ${failed} files`);
