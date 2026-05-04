const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/app/features/field-resource-management/services/reporting.service.spec.ts',
  'src/app/features/field-resource-management/services/scheduling.service.spec.ts'
];

filesToFix.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Pattern 1: Assignment object without status property
  // Match Assignment objects that have assignedAt and isActive but no status
  const assignmentPattern = /(\{[\s\S]*?assignedAt:\s*new Date\(\),\s*)(isActive:\s*(?:true|false)[\s\S]*?\})/g;
  
  content = content.replace(assignmentPattern, (match, before, after) => {
    // Check if status already exists
    if (match.includes('status:')) {
      return match;
    }
    // Add status before isActive
    return before + 'status: AssignmentStatus.Assigned,\n          ' + after;
  });
  
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Fixed: ${filePath}`);
});

console.log('Done!');
