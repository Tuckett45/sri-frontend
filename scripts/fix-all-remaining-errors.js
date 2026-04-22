const fs = require('fs');
const path = require('path');

// Comprehensive script to fix all remaining compilation errors

function applyFix(filePath, searchStr, replaceStr, description) {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`❌ ${description}: File not found`);
      return false;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    
    if (!content.includes(searchStr)) {
      console.log(`⚠️  ${description}: Pattern not found`);
      return false;
    }
    
    content = content.replace(searchStr, replaceStr);
    fs.writeFileSync(fullPath, content, 'utf8');
    
    console.log(`✅ ${description}`);
    return true;
  } catch (error) {
    console.log(`❌ ${description}: ${error.message}`);
    return false;
  }
}

console.log('=== Fixing Crew Form Spec ===\n');

// crew-form.component.spec.ts - Add market to mockCrew
applyFix(
  'src/app/features/field-resource-management/components/crews/crew-form/crew-form.component.spec.ts',
  `    company: 'ACME_CORP',
    status: CrewStatus.Available,
    createdAt: new Date(),`,
  `    company: 'ACME_CORP',
    market: 'TEST_MARKET',
    status: CrewStatus.Available,
    createdAt: new Date(),`,
  'Add market to mockCrew in crew-form'
);

console.log('\n=== Fixing Job Detail Spec ===\n');

// job-detail.component.spec.ts - Add market and company to mockJob
applyFix(
  'src/app/features/field-resource-management/components/jobs/job-detail/job-detail.component.spec.ts',
  `    company: 'ACME_CORP',
    createdBy: 'user-1',`,
  `    company: 'ACME_CORP',
    market: 'TEST_MARKET',
    createdBy: 'user-1',`,
  'Add market to mockJob in job-detail'
);

console.log('\n=== Fixing Job Notes Spec ===\n');

// job-notes.component.spec.ts - Remove company from JobNote objects
applyFix(
  'src/app/features/field-resource-management/components/jobs/job-notes/job-notes.component.spec.ts',
  `      company: 'TEST_COMPANY',
      updatedAt: new Date()
    },`,
  `      updatedAt: new Date()
    },`,
  'Remove company from first JobNote'
);

applyFix(
  'src/app/features/field-resource-management/components/jobs/job-notes/job-notes.component.spec.ts',
  `      company: 'TEST_COMPANY',
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
    }`,
  `      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
    }`,
  'Remove company from second JobNote'
);

console.log('\n=== Fixing Map Component Spec ===\n');

// map.component.spec.ts - Remove company from Technician objects (3 instances)
const mapFile = 'src/app/features/field-resource-management/components/mapping/map/map.component.spec.ts';
let mapContent = fs.readFileSync(path.join(process.cwd(), mapFile), 'utf8');
let mapChanges = 0;

// Replace all instances of company in Technician objects
while (mapContent.includes(`      company: 'TEST_COMPANY',
      updatedAt: new Date()`)) {
  mapContent = mapContent.replace(
    `      company: 'TEST_COMPANY',
      updatedAt: new Date()`,
    `      updatedAt: new Date()`
  );
  mapChanges++;
}

if (mapChanges > 0) {
  fs.writeFileSync(path.join(process.cwd(), mapFile), mapContent, 'utf8');
  console.log(`✅ Removed company from ${mapChanges} Technician objects in map component`);
}

console.log('\n=== Fixing Mobile Components ===\n');

// job-card.component.spec.ts
applyFix(
  'src/app/features/field-resource-management/components/mobile/job-card/job-card.component.spec.ts',
  `    company: 'ACME_CORP',
    createdBy: 'user-1',`,
  `    company: 'ACME_CORP',
    market: 'TEST_MARKET',
    createdBy: 'user-1',`,
  'Add market to mockJob in job-card'
);

// time-tracker.component.spec.ts
applyFix(
  'src/app/features/field-resource-management/components/mobile/time-tracker/time-tracker.component.spec.ts',
  `    company: 'ACME_CORP',
    createdBy: 'user-1',`,
  `    company: 'ACME_CORP',
    market: 'TEST_MARKET',
    createdBy: 'user-1',`,
  'Add market to mockJob in time-tracker'
);

console.log('\n=== Fixing Reporting Components ===\n');

// timecard-dashboard.component.spec.ts
applyFix(
  'src/app/features/field-resource-management/components/reporting/timecard-dashboard/timecard-dashboard.component.spec.ts',
  `    company: 'ACME_CORP',
    createdBy: 'user-1',`,
  `    company: 'ACME_CORP',
    market: 'TEST_MARKET',
    createdBy: 'user-1',`,
  'Add market to mockJob in timecard-dashboard'
);

console.log('\n=== Fixing Scheduling Components ===\n');

// assignment-dialog.component.spec.ts - Add market to mockJob
applyFix(
  'src/app/features/field-resource-management/components/scheduling/assignment-dialog/assignment-dialog.component.spec.ts',
  `    company: 'ACME_CORP',
    createdBy: 'user-1',`,
  `    company: 'ACME_CORP',
    market: 'TEST_MARKET',
    createdBy: 'user-1',`,
  'Add market to mockJob in assignment-dialog'
);

// assignment-dialog.component.spec.ts - Remove company from Technician
applyFix(
  'src/app/features/field-resource-management/components/scheduling/assignment-dialog/assignment-dialog.component.spec.ts',
  `      company: 'TEST_COMPANY',
      updatedAt: new Date()
    }`,
  `      updatedAt: new Date()
    }`,
  'Remove company from Technician in assignment-dialog'
);

// technician-schedule.component.spec.ts - Remove company from mockTechnician
applyFix(
  'src/app/features/field-resource-management/components/scheduling/technician-schedule/technician-schedule.component.spec.ts',
  `    company: 'TEST_COMPANY',
    updatedAt: new Date(),
    market: 'TEST_MARKET',`,
  `    updatedAt: new Date(),
    market: 'TEST_MARKET',`,
  'Remove company from mockTechnician in technician-schedule'
);

// technician-schedule.component.spec.ts - Add market to mockJob
applyFix(
  'src/app/features/field-resource-management/components/scheduling/technician-schedule/technician-schedule.component.spec.ts',
  `    company: 'ACME_CORP',
    createdBy: 'user-1',`,
  `    company: 'ACME_CORP',
    market: 'TEST_MARKET',
    createdBy: 'user-1',`,
  'Add market to mockJob in technician-schedule'
);

console.log('\n=== Fixing Shared Components ===\n');

// batch-technician-dialog.component.spec.ts
applyFix(
  'src/app/features/field-resource-management/components/shared/batch-technician-dialog/batch-technician-dialog.component.spec.ts',
  `      company: 'TEST_COMPANY',
      updatedAt: new Date()
    }`,
  `      updatedAt: new Date()
    }`,
  'Remove company from Technician in batch-technician-dialog'
);

console.log('\n=== Fixing Technician Components ===\n');

// technician-detail.component.spec.ts
applyFix(
  'src/app/features/field-resource-management/components/technicians/technician-detail/technician-detail.component.spec.ts',
  `    company: 'TEST_COMPANY',
    updatedAt: new Date()
  };`,
  `    updatedAt: new Date()
  };`,
  'Remove company from mockTechnician in technician-detail'
);

// technician-form.component.spec.ts
applyFix(
  'src/app/features/field-resource-management/components/technicians/technician-form/technician-form.component.spec.ts',
  `    company: 'TEST_COMPANY',
    updatedAt: new Date()
  };`,
  `    updatedAt: new Date()
  };`,
  'Remove company from mockTechnician in technician-form'
);

// technician-list.component.spec.ts - Remove company from both Technician objects
const techListFile = 'src/app/features/field-resource-management/components/technicians/technician-list/technician-list.component.spec.ts';
let techListContent = fs.readFileSync(path.join(process.cwd(), techListFile), 'utf8');
let techListChanges = 0;

while (techListContent.includes(`      company: 'TEST_COMPANY',
      updatedAt: new Date()`)) {
  techListContent = techListContent.replace(
    `      company: 'TEST_COMPANY',
      updatedAt: new Date()`,
    `      updatedAt: new Date()`
  );
  techListChanges++;
}

if (techListChanges > 0) {
  fs.writeFileSync(path.join(process.cwd(), techListFile), techListContent, 'utf8');
  console.log(`✅ Removed company from ${techListChanges} Technician objects in technician-list`);
}

console.log('\n=== All fixes applied ===\n');
