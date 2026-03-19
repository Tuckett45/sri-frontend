const fs = require('fs');
const path = require('path');

function fixFile(filePath, replacements) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ File not found: ${filePath}`);
    return 0;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let changeCount = 0;
  
  replacements.forEach(({ search, replace, description }) => {
    const originalContent = content;
    if (search instanceof RegExp) {
      content = content.replace(search, replace);
    } else {
      content = content.split(search).join(replace);
    }
    
    if (content !== originalContent) {
      changeCount++;
      console.log(`  ✅ ${description}`);
    }
  });
  
  if (changeCount > 0) {
    fs.writeFileSync(fullPath, content, 'utf8');
  }
  
  return changeCount;
}

console.log('=== Fixing State and Service Test Errors ===\n');

// Fix reporting.service.spec.ts - Remove market from Technician, add status to Assignment
console.log('1. reporting.service.spec.ts');
fixFile('src/app/features/field-resource-management/services/reporting.service.spec.ts', [
  {
    search: /market: 'DALLAS',\s+/g,
    replace: '',
    description: 'Remove market property from Technician objects'
  },
  {
    search: /assignedAt: new Date\(\),\s+isActive: true\s+}/g,
    replace: `assignedAt: new Date(),
          status: 'Assigned' as any,
          isActive: true
        }`,
    description: 'Add status to Assignment objects'
  }
]);

// Fix technician.service.spec.ts
console.log('\n2. technician.service.spec.ts');
fixFile('src/app/features/field-resource-management/services/technician.service.spec.ts', [
  {
    search: /market: 'DALLAS',\s+/g,
    replace: '',
    description: 'Remove market property from Technician'
  }
]);

// Fix scheduling.service.spec.ts - Add AssignmentStatus import and fix usage
console.log('\n3. scheduling.service.spec.ts');
let schedContent = fs.readFileSync(path.join(process.cwd(), 'src/app/features/field-resource-management/services/scheduling.service.spec.ts'), 'utf8');

// Add import if not present
if (!schedContent.includes('AssignmentStatus')) {
  schedContent = schedContent.replace(
    /import { Assignment } from '\.\.\/models\/assignment\.model';/,
    `import { Assignment, AssignmentStatus } from '../models/assignment.model';`
  );
  console.log('  ✅ Added AssignmentStatus import');
}

// Add status to Assignment objects
schedContent = schedContent.replace(
  /assignedAt: new Date\(\),\s+isActive: true\s+}/g,
  `assignedAt: new Date(),
          status: AssignmentStatus.Assigned,
          isActive: true
        }`
);

fs.writeFileSync(path.join(process.cwd(), 'src/app/features/field-resource-management/services/scheduling.service.spec.ts'), schedContent, 'utf8');
console.log('  ✅ Added status to Assignment objects');

// Fix state test files - Remove market from Technician
const stateFiles = [
  'src/app/features/field-resource-management/state/assignments/assignment.actions.spec.ts',
  'src/app/features/field-resource-management/state/assignments/assignment.effects.spec.ts',
  'src/app/features/field-resource-management/state/assignments/assignment.reducer.spec.ts',
  'src/app/features/field-resource-management/state/technicians/technician.actions.spec.ts',
  'src/app/features/field-resource-management/state/technicians/technician.effects.spec.ts',
  'src/app/features/field-resource-management/state/technicians/technician.reducer.spec.ts',
  'src/app/features/field-resource-management/state/technicians/technician.selectors.spec.ts',
  'src/app/features/field-resource-management/state/reporting/reporting.selectors.spec.ts'
];

stateFiles.forEach((file, index) => {
  console.log(`\n${index + 4}. ${path.basename(file)}`);
  fixFile(file, [
    {
      search: /market: 'DALLAS',\s+/g,
      replace: '',
      description: 'Remove market property from Technician'
    }
  ]);
});

// Fix job state files - Replace description with scopeDescription, remove createdBy from JobNote, remove fileUrl from Attachment
console.log('\n12. job.actions.spec.ts');
fixFile('src/app/features/field-resource-management/state/jobs/job.actions.spec.ts', [
  {
    search: /description: 'Install fiber optic cables',/g,
    replace: `scopeDescription: 'Install fiber optic cables',`,
    description: 'Replace description with scopeDescription in Job'
  },
  {
    search: /description: 'Repair damaged cables',/g,
    replace: `scopeDescription: 'Repair damaged cables',`,
    description: 'Replace description with scopeDescription in CreateJobDto'
  },
  {
    search: /description: 'Updated description'/g,
    replace: `scopeDescription: 'Updated description'`,
    description: 'Replace description with scopeDescription in UpdateJobDto'
  },
  {
    search: /createdBy: 'user-1',\s+/g,
    replace: '',
    description: 'Remove createdBy from JobNote'
  },
  {
    search: /fileUrl: 'https:\/\/example\.com\/document\.pdf',\s+/g,
    replace: '',
    description: 'Remove fileUrl from Attachment'
  }
]);

console.log('\n13. job.effects.spec.ts');
fixFile('src/app/features/field-resource-management/state/jobs/job.effects.spec.ts', [
  {
    search: /description: 'Install fiber optic cables',/g,
    replace: `scopeDescription: 'Install fiber optic cables',`,
    description: 'Replace description with scopeDescription'
  },
  {
    search: /createdBy: 'user-1',\s+/g,
    replace: '',
    description: 'Remove createdBy from JobNote'
  },
  {
    search: /fileUrl: 'https:\/\/example\.com\/document\.pdf',\s+/g,
    replace: '',
    description: 'Remove fileUrl from Attachment'
  }
]);

console.log('\n14. job.reducer.spec.ts');
fixFile('src/app/features/field-resource-management/state/jobs/job.reducer.spec.ts', [
  {
    search: /description: 'Install fiber optic cables',/g,
    replace: `scopeDescription: 'Install fiber optic cables',`,
    description: 'Replace description with scopeDescription'
  },
  {
    search: /createdBy: 'user-1',\s+/g,
    replace: '',
    description: 'Remove createdBy from JobNote'
  },
  {
    search: /fileUrl: 'https:\/\/example\.com\/document\.pdf',\s+/g,
    replace: '',
    description: 'Remove fileUrl from Attachment'
  }
]);

console.log('\n15. reporting.selectors.spec.ts');
fixFile('src/app/features/field-resource-management/state/reporting/reporting.selectors.spec.ts', [
  {
    search: /description: 'Install equipment',/g,
    replace: `scopeDescription: 'Install equipment',`,
    description: 'Replace description with scopeDescription'
  }
]);

console.log('\n=== Done ===\n');
