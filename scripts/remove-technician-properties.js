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
  
  // Remove market/company/createdBy lines from Technician objects
  // These appear before properties like 'skills:', 'certifications:', 'availability:', 'createdAt:'
  
  const patterns = [
    /(\s+)market: '[^']+',\s*\n/g,
    /(\s+)company: '[^']+',\s*\n/g,
    /(\s+)createdBy: '[^']+',\s*\n/g
  ];
  
  patterns.forEach(pattern => {
    const before = content;
    content = content.replace(pattern, '');
    if (content !== before) modified = true;
  });
  
  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Fixed: ${filePath}`);
  }
});

console.log('Done!');
