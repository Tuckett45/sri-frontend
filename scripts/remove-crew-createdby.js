const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all spec files
const specFiles = glob.sync('src/app/features/field-resource-management/**/*.spec.ts', {
  cwd: process.cwd()
});

specFiles.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  // Remove createdBy: lines that appear before updatedAt: in Crew objects
  // Pattern: createdBy: 'xxx', followed by updatedAt:
  const pattern = /(\s+)createdBy: '[^']+',\s*\n(\s+updatedAt:)/g;
  if (pattern.test(content)) {
    content = content.replace(pattern, '$2');
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Fixed: ${filePath}`);
  }
});

console.log('Done!');
