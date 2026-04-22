const fs = require('fs');
const path = require('path');

// Files that need Job.market and Job.company fixes
const files = [
  'src/app/features/field-resource-management/components/jobs/job-detail/job-detail.component.spec.ts',
  'src/app/features/field-resource-management/components/jobs/job-list/job-list.component.spec.ts'
];

files.forEach(filePath => {
  console.log(`Processing ${filePath}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find Job objects and add market and company properties
  // Look for patterns like: jobType: JobType.xxx, priority: Priority.xxx, ... updatedAt: Date
  // We need to add market and company before createdBy or createdAt
  
  // Pattern 1: Add before createdBy
  const beforeCreatedByRegex = /(notes:\s*\[\][,\s]*)(createdBy:)/g;
  content = content.replace(beforeCreatedByRegex, "$1market: 'DALLAS',\n    company: 'TestCompany',\n    $2");
  
  // Pattern 2: Add before createdAt if createdBy not present
  const beforeCreatedAtRegex = /(notes:\s*\[\][,\s]*)(createdAt:)/g;
  content = content.replace(beforeCreatedAtRegex, (match, p1, p2) => {
    if (!content.slice(Math.max(0, content.lastIndexOf(p1, content.indexOf(match)) - 200), content.indexOf(match)).includes('market:')) {
      return p1 + "market: 'DALLAS',\n    company: 'TestCompany',\n    " + p2;
    }
    return match;
  });
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✓ Fixed ${filePath}`);
});

console.log('\n✓ All Job property fixes applied!');
