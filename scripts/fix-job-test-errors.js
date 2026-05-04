const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/app/features/field-resource-management/state/jobs/job.actions.spec.ts',
  'src/app/features/field-resource-management/state/jobs/job.effects.spec.ts',
  'src/app/features/field-resource-management/state/jobs/job.reducer.spec.ts',
  'src/app/features/field-resource-management/state/reporting/reporting.selectors.spec.ts'
];

filesToFix.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Fix 1: Replace 'title:' with 'siteName:' in Job objects
  content = content.replace(/(\s+)title:\s*'([^']+)'/g, "$1siteName: '$2'");
  
  // Fix 2: Replace 'content:' with 'text:' in JobNote objects
  content = content.replace(/(\s+)content:\s*'([^']+)'/g, "$1text: '$2'");
  
  // Fix 3: Remove 'jobId:' from Attachment objects (it's not a property)
  content = content.replace(/(\s+)jobId:\s*'[^']+',?\s*\n/g, '');
  
  // Fix 4: Replace 'scheduledStart:' with 'scheduledStartDate:' in Job objects
  content = content.replace(/(\s+)scheduledStart:/g, '$1scheduledStartDate:');
  
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Fixed: ${filePath}`);
});

console.log('Done!');
