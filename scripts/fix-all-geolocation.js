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
  
  // Pattern 1: { latitude: X, longitude: Y }
  const pattern1 = /\{\s*latitude:\s*([\d.-]+),\s*longitude:\s*([\d.-]+)\s*\}/g;
  if (pattern1.test(content)) {
    content = content.replace(pattern1, '{ latitude: $1, longitude: $2, accuracy: 10 }');
    modified = true;
  }
  
  // Pattern 2: Multi-line format
  const pattern2 = /\{\s*\n\s*latitude:\s*([\d.-]+),\s*\n\s*longitude:\s*([\d.-]+)\s*\n\s*\}/g;
  if (pattern2.test(content)) {
    content = content.replace(pattern2, '{\n          latitude: $1,\n          longitude: $2,\n          accuracy: 10\n        }');
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Fixed: ${filePath}`);
  }
});

console.log('Done!');
