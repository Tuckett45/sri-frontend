const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/app/features/field-resource-management/state/crews/crew.selectors.spec.ts',
  'src/app/features/field-resource-management/state/reporting/reporting.selectors.spec.ts'
];

filesToFix.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Pattern: Find User objects and add missing properties before the closing brace
  // Match User objects that have name: but don't have password:
  const userPattern = /(const mock\w+User: User = \{[\s\S]*?name: '[^']+',?)(\s*\})/g;
  
  content = content.replace(userPattern, (match, before, after) => {
    // Check if password already exists
    if (match.includes('password:')) {
      return match;
    }
    // Add missing properties before the closing brace
    return before + ',\n    password: \'password123\',\n    createdDate: new Date(),\n    isApproved: true' + after;
  });
  
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Fixed: ${filePath}`);
});

console.log('Done!');
