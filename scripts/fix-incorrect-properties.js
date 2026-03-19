const fs = require('fs');
const path = require('path');

// Files and lines where incorrect properties need to be removed
const fixes = [
  // Technician objects with incorrect 'market' property
  {
    file: 'src/app/features/field-resource-management/components/crews/crew-detail/crew-detail.component.spec.ts',
    property: 'market',
    type: 'Technician'
  },
  {
    file: 'src/app/features/field-resource-management/components/crews/crew-form/crew-form.component.spec.ts',
    property: 'market',
    type: 'Technician'
  },
  {
    file: 'src/app/features/field-resource-management/components/mapping/map/map.component.spec.ts',
    property: 'market',
    type: 'Technician'
  },
  {
    file: 'src/app/features/field-resource-management/components/scheduling/assignment-dialog/assignment-dialog.component.spec.ts',
    property: 'market',
    type: 'Technician'
  },
  {
    file: 'src/app/features/field-resource-management/components/scheduling/technician-schedule/technician-schedule.component.spec.ts',
    property: 'market',
    type: 'Technician'
  },
  {
    file: 'src/app/features/field-resource-management/components/scheduling/batch-technician-dialog/batch-technician-dialog.component.spec.ts',
    property: 'market',
    type: 'Technician'
  },
  {
    file: 'src/app/features/field-resource-management/components/technicians/technician-detail/technician-detail.component.spec.ts',
    property: 'market',
    type: 'Technician'
  },
  {
    file: 'src/app/features/field-resource-management/components/technicians/technician-form/technician-form.component.spec.ts',
    property: 'market',
    type: 'Technician'
  },
  {
    file: 'src/app/features/field-resource-management/components/technicians/technician-list/technician-list.component.spec.ts',
    property: 'market',
    type: 'Technician'
  },
  {
    file: 'src/app/features/field-resource-management/integration-tests/crew-workflows.e2e.spec.ts',
    property: 'market',
    type: 'Technician'
  },
  // TimeEntry objects with incorrect 'market' property
  {
    file: 'src/app/features/field-resource-management/components/jobs/job-detail/job-detail.component.spec.ts',
    property: 'market',
    type: 'TimeEntry'
  },
  {
    file: 'src/app/features/field-resource-management/components/jobs/job-card/job-card.component.spec.ts',
    property: 'market',
    type: 'TimeEntry'
  },
  {
    file: 'src/app/features/field-resource-management/components/scheduling/time-tracker/time-tracker.component.spec.ts',
    property: 'market',
    type: 'TimeEntry'
  },
  {
    file: 'src/app/features/field-resource-management/components/reporting/timecard-dashboard/timecard-dashboard.component.spec.ts',
    property: 'market',
    type: 'TimeEntry'
  },
  // JobNote objects with incorrect 'market' property
  {
    file: 'src/app/features/field-resource-management/components/jobs/job-notes/job-notes.component.spec.ts',
    property: 'market',
    type: 'JobNote'
  }
];

console.log('=== FIXING INCORRECT PROPERTIES ===\n');

let totalFixed = 0;

fixes.forEach(fix => {
  const filePath = path.join(process.cwd(), fix.file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${fix.file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Remove lines with the incorrect property
  // Pattern: market: 'value', or market: value,
  const regex = new RegExp(`^\\s*${fix.property}:\\s*[^,]+,?\\s*$`, 'gm');
  content = content.replace(regex, '');
  
  // Also handle inline cases like: { id: 1, market: 'value', name: 'test' }
  // Replace ", market: 'value'" or ", market: value"
  const inlineRegex = new RegExp(`,\\s*${fix.property}:\\s*[^,}]+`, 'g');
  content = content.replace(inlineRegex, '');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    const linesRemoved = (originalContent.match(regex) || []).length;
    console.log(`✓ Fixed ${fix.file}`);
    console.log(`  Removed ${fix.property} from ${fix.type} objects`);
    totalFixed++;
  }
});

console.log(`\n=== SUMMARY ===`);
console.log(`Files fixed: ${totalFixed}`);
console.log(`\nRun 'node scripts/analyze-remaining-errors.js' to verify fixes.`);
