const fs = require('fs');
const path = require('path');

function fixFile(filePath, fixes) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ File not found: ${filePath}`);
    return 0;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let changeCount = 0;
  
  fixes.forEach(fix => {
    const originalContent = content;
    content = content.replace(fix.search, fix.replace);
    if (content !== originalContent) {
      changeCount++;
      console.log(`  ✅ ${fix.description}`);
    } else {
      console.log(`  ⚠️  ${fix.description} - pattern not found`);
    }
  });
  
  if (changeCount > 0) {
    fs.writeFileSync(fullPath, content, 'utf8');
  }
  
  return changeCount;
}

console.log('=== Fixing Compilation Errors ===\n');

// Fix crew-form.component.spec.ts
console.log('1. crew-form.component.spec.ts');
fixFile('src/app/features/field-resource-management/components/crews/crew-form/crew-form.component.spec.ts', [
  {
    search: /company: 'ACME_CORP',\s+status: CrewStatus\.Available,\s+createdAt:/,
    replace: `company: 'ACME_CORP',
    market: 'TEST_MARKET',
    status: CrewStatus.Available,
    createdAt:`,
    description: 'Add market to mockCrew'
  }
]);

// Fix job-detail.component.spec.ts
console.log('\n2. job-detail.component.spec.ts');
fixFile('src/app/features/field-resource-management/components/jobs/job-detail/job-detail.component.spec.ts', [
  {
    search: /notes: \[\],\s+company: 'ACME_CORP',\s+createdBy:/,
    replace: `notes: [],
    company: 'ACME_CORP',
    market: 'TEST_MARKET',
    createdBy:`,
    description: 'Add market to mockJob'
  }
]);

// Fix job-notes.component.spec.ts
console.log('\n3. job-notes.component.spec.ts');
fixFile('src/app/features/field-resource-management/components/jobs/job-notes/job-notes.component.spec.ts', [
  {
    search: /company: 'TEST_COMPANY',\s+updatedAt: new Date\(\)/g,
    replace: `updatedAt: new Date()`,
    description: 'Remove company from JobNote objects'
  }
]);

// Fix map.component.spec.ts
console.log('\n4. map.component.spec.ts');
fixFile('src/app/features/field-resource-management/components/mapping/map/map.component.spec.ts', [
  {
    search: /company: 'TEST_COMPANY',\s+updatedAt: new Date\(\)/g,
    replace: `updatedAt: new Date()`,
    description: 'Remove company from Technician objects'
  }
]);

// Fix mobile components
console.log('\n5. job-card.component.spec.ts');
fixFile('src/app/features/field-resource-management/components/mobile/job-card/job-card.component.spec.ts', [
  {
    search: /notes: \[\],\s+company: 'ACME_CORP',\s+createdBy:/,
    replace: `notes: [],
    company: 'ACME_CORP',
    market: 'TEST_MARKET',
    createdBy:`,
    description: 'Add market to mockJob'
  }
]);

console.log('\n6. time-tracker.component.spec.ts');
fixFile('src/app/features/field-resource-management/components/mobile/time-tracker/time-tracker.component.spec.ts', [
  {
    search: /notes: \[\],\s+company: 'ACME_CORP',\s+createdBy:/,
    replace: `notes: [],
    company: 'ACME_CORP',
    market: 'TEST_MARKET',
    createdBy:`,
    description: 'Add market to mockJob'
  }
]);

// Fix reporting components
console.log('\n7. timecard-dashboard.component.spec.ts');
fixFile('src/app/features/field-resource-management/components/reporting/timecard-dashboard/timecard-dashboard.component.spec.ts', [
  {
    search: /notes: \[\],\s+company: 'ACME_CORP',\s+createdBy:/,
    replace: `notes: [],
    company: 'ACME_CORP',
    market: 'TEST_MARKET',
    createdBy:`,
    description: 'Add market to mockJob'
  }
]);

// Fix scheduling components
console.log('\n8. assignment-dialog.component.spec.ts');
fixFile('src/app/features/field-resource-management/components/scheduling/assignment-dialog/assignment-dialog.component.spec.ts', [
  {
    search: /notes: \[\],\s+company: 'ACME_CORP',\s+createdBy:/,
    replace: `notes: [],
    company: 'ACME_CORP',
    market: 'TEST_MARKET',
    createdBy:`,
    description: 'Add market to mockJob'
  },
  {
    search: /company: 'TEST_COMPANY',\s+updatedAt: new Date\(\)/g,
    replace: `updatedAt: new Date()`,
    description: 'Remove company from Technician'
  },
  {
    search: /createdBy: 'admin',\s+company: 'ACME_CORP',\s+createdAt:/,
    replace: `createdBy: 'admin',
    company: 'ACME_CORP',
    market: 'TEST_MARKET',
    createdAt:`,
    description: 'Add market after createdBy'
  }
]);

console.log('\n9. technician-schedule.component.spec.ts');
fixFile('src/app/features/field-resource-management/components/scheduling/technician-schedule/technician-schedule.component.spec.ts', [
  {
    search: /company: 'TEST_COMPANY',\s+updatedAt: new Date\(\),\s+market:/,
    replace: `updatedAt: new Date(),
    market:`,
    description: 'Remove company from mockTechnician'
  },
  {
    search: /createdBy: 'admin',\s+company: 'ACME_CORP',\s+createdAt:/,
    replace: `createdBy: 'admin',
    company: 'ACME_CORP',
    market: 'TEST_MARKET',
    createdAt:`,
    description: 'Add market to mockJob'
  },
  {
    search: /company: 'ACME_CORP'\s+\};/g,
    replace: `};`,
    description: 'Remove duplicate company property'
  }
]);

// Fix shared components
console.log('\n10. batch-technician-dialog.component.spec.ts');
fixFile('src/app/features/field-resource-management/components/shared/batch-technician-dialog/batch-technician-dialog.component.spec.ts', [
  {
    search: /company: 'TEST_COMPANY',\s+updatedAt: new Date\(\)/g,
    replace: `updatedAt: new Date()`,
    description: 'Remove company from Technician'
  }
]);

// Fix technician components
console.log('\n11. technician-detail.component.spec.ts');
fixFile('src/app/features/field-resource-management/components/technicians/technician-detail/technician-detail.component.spec.ts', [
  {
    search: /company: 'TEST_COMPANY',\s+updatedAt: new Date\(\)/g,
    replace: `updatedAt: new Date()`,
    description: 'Remove company from mockTechnician'
  }
]);

console.log('\n12. technician-form.component.spec.ts');
fixFile('src/app/features/field-resource-management/components/technicians/technician-form/technician-form.component.spec.ts', [
  {
    search: /company: 'TEST_COMPANY',\s+updatedAt: new Date\(\)/g,
    replace: `updatedAt: new Date()`,
    description: 'Remove company from mockTechnician'
  }
]);

console.log('\n13. technician-list.component.spec.ts');
fixFile('src/app/features/field-resource-management/components/technicians/technician-list/technician-list.component.spec.ts', [
  {
    search: /company: 'TEST_COMPANY',\s+updatedAt: new Date\(\)/g,
    replace: `updatedAt: new Date()`,
    description: 'Remove company from Technician objects'
  }
]);

console.log('\n=== Done ===\n');
