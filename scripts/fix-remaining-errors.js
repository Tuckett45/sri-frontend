const fs = require('fs');
const path = require('path');

// Script to fix remaining compilation errors systematically

const fixes = [
  // Fix 1: Add missing market property to Crew objects
  {
    file: 'src/app/features/field-resource-management/components/crews/crew-detail/crew-detail.component.spec.ts',
    search: `    company: 'TEST_COMPANY',
    status: CrewStatus.Available,`,
    replace: `    company: 'TEST_COMPANY',
    market: 'TEST_MARKET',
    status: CrewStatus.Available,`
  },
  {
    file: 'src/app/features/field-resource-management/components/crews/crew-form/crew-form.component.spec.ts',
    search: `    company: 'TEST_COMPANY',
    status: CrewStatus.Available,`,
    replace: `    company: 'TEST_COMPANY',
    market: 'TEST_MARKET',
    status: CrewStatus.Available,`
  },
  {
    file: 'src/app/features/field-resource-management/components/crews/crew-form/crew-form.component.spec.ts',
    search: `        company: 'ACME_CORP',
        status: CrewStatus.Available`,
    replace: `        company: 'ACME_CORP',
        market: 'TEST_MARKET',
        status: CrewStatus.Available`
  },
  
  // Fix 2: Add missing market and company to Job objects
  {
    file: 'src/app/features/field-resource-management/components/crews/crew-detail/crew-detail.component.spec.ts',
    search: `    scheduledStartTime: new Date(),
    estimatedDuration: 120,`,
    replace: `    scheduledStartTime: new Date(),
    estimatedDuration: 120,
    market: 'TEST_MARKET',
    company: 'TEST_COMPANY',`
  },
  {
    file: 'src/app/features/field-resource-management/components/jobs/job-detail/job-detail.component.spec.ts',
    search: `    scheduledStartTime: new Date(),
    estimatedDuration: 120,`,
    replace: `    scheduledStartTime: new Date(),
    estimatedDuration: 120,
    market: 'TEST_MARKET',
    company: 'TEST_COMPANY',`
  },
  {
    file: 'src/app/features/field-resource-management/components/mobile/job-card/job-card.component.spec.ts',
    search: `    scheduledStartTime: new Date(),
    estimatedDuration: 120,`,
    replace: `    scheduledStartTime: new Date(),
    estimatedDuration: 120,
    market: 'TEST_MARKET',
    company: 'TEST_COMPANY',`
  },
  {
    file: 'src/app/features/field-resource-management/components/mobile/time-tracker/time-tracker.component.spec.ts',
    search: `    scheduledStartTime: new Date(),
    estimatedDuration: 120,`,
    replace: `    scheduledStartTime: new Date(),
    estimatedDuration: 120,
    market: 'TEST_MARKET',
    company: 'TEST_COMPANY',`
  },
  {
    file: 'src/app/features/field-resource-management/components/reporting/timecard-dashboard/timecard-dashboard.component.spec.ts',
    search: `    scheduledStartTime: new Date(),
    estimatedDuration: 120,`,
    replace: `    scheduledStartTime: new Date(),
    estimatedDuration: 120,
    market: 'TEST_MARKET',
    company: 'TEST_COMPANY',`
  },
  {
    file: 'src/app/features/field-resource-management/components/scheduling/assignment-dialog/assignment-dialog.component.spec.ts',
    search: `    scheduledStartTime: new Date(),
    estimatedDuration: 120,`,
    replace: `    scheduledStartTime: new Date(),
    estimatedDuration: 120,
    market: 'TEST_MARKET',`
  },
  {
    file: 'src/app/features/field-resource-management/components/scheduling/technician-schedule/technician-schedule.component.spec.ts',
    search: `    scheduledStartTime: new Date(),
    estimatedDuration: 120,`,
    replace: `    scheduledStartTime: new Date(),
    estimatedDuration: 120,
    market: 'TEST_MARKET',`
  },
  
  // Fix 3: Remove company property from JobNote objects
  {
    file: 'src/app/features/field-resource-management/components/jobs/job-notes/job-notes.component.spec.ts',
    search: `      company: 'TEST_COMPANY',
      updatedAt: new Date()`,
    replace: `      updatedAt: new Date()`
  },
  {
    file: 'src/app/features/field-resource-management/components/jobs/job-notes/job-notes.component.spec.ts',
    search: `      company: 'TEST_COMPANY',
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)`,
    replace: `      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)`
  },
  
  // Fix 4: Remove company property from Technician objects
  {
    file: 'src/app/features/field-resource-management/components/mapping/map/map.component.spec.ts',
    search: `      company: 'TEST_COMPANY',
      updatedAt: new Date()`,
    replace: `      updatedAt: new Date()`
  },
  {
    file: 'src/app/features/field-resource-management/components/scheduling/assignment-dialog/assignment-dialog.component.spec.ts',
    search: `      company: 'TEST_COMPANY',
      updatedAt: new Date()`,
    replace: `      updatedAt: new Date()`
  },
  {
    file: 'src/app/features/field-resource-management/components/scheduling/technician-schedule/technician-schedule.component.spec.ts',
    search: `    company: 'TEST_COMPANY',
    updatedAt: new Date(),`,
    replace: `    updatedAt: new Date(),`
  },
  {
    file: 'src/app/features/field-resource-management/components/shared/batch-technician-dialog/batch-technician-dialog.component.spec.ts',
    search: `      company: 'TEST_COMPANY',
      updatedAt: new Date()`,
    replace: `      updatedAt: new Date()`
  },
  {
    file: 'src/app/features/field-resource-management/components/technicians/technician-detail/technician-detail.component.spec.ts',
    search: `    company: 'TEST_COMPANY',
    updatedAt: new Date()`,
    replace: `    updatedAt: new Date()`
  },
  {
    file: 'src/app/features/field-resource-management/components/technicians/technician-form/technician-form.component.spec.ts',
    search: `    company: 'TEST_COMPANY',
    updatedAt: new Date()`,
    replace: `    updatedAt: new Date()`
  },
  {
    file: 'src/app/features/field-resource-management/components/technicians/technician-list/technician-list.component.spec.ts',
    search: `      company: 'TEST_COMPANY',
      updatedAt: new Date()`,
    replace: `      updatedAt: new Date()`
  },
  
  // Fix 5: Remove duplicate company property from assignment-dialog
  {
    file: 'src/app/features/field-resource-management/components/scheduling/assignment-dialog/assignment-dialog.component.spec.ts',
    search: `    company: 'ACME_CORP'
  };`,
    replace: `  };`
  },
  
  // Fix 6: Remove duplicate company property from technician-schedule
  {
    file: 'src/app/features/field-resource-management/components/scheduling/technician-schedule/technician-schedule.component.spec.ts',
    search: `    company: 'ACME_CORP'
  };`,
    replace: `  };`
  },
  {
    file: 'src/app/features/field-resource-management/components/scheduling/technician-schedule/technician-schedule.component.spec.ts',
    search: `    company: 'ACME_CORP'
  };

  const mockJob: Job = {`,
    replace: `  };

  const mockJob: Job = {`
  }
];

console.log('Applying fixes...\n');

let successCount = 0;
let failCount = 0;

fixes.forEach((fix, index) => {
  try {
    const filePath = path.join(process.cwd(), fix.file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`❌ Fix ${index + 1}: File not found: ${fix.file}`);
      failCount++;
      return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (!content.includes(fix.search)) {
      console.log(`⚠️  Fix ${index + 1}: Pattern not found in ${fix.file}`);
      failCount++;
      return;
    }
    
    content = content.replace(fix.search, fix.replace);
    fs.writeFileSync(filePath, content, 'utf8');
    
    console.log(`✅ Fix ${index + 1}: Applied to ${fix.file}`);
    successCount++;
  } catch (error) {
    console.log(`❌ Fix ${index + 1}: Error - ${error.message}`);
    failCount++;
  }
});

console.log(`\n✅ Successfully applied: ${successCount}`);
console.log(`❌ Failed: ${failCount}`);
console.log(`📊 Total: ${fixes.length}`);
