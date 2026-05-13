const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/app/features/field-resource-management/state/crews/crew.selectors.spec.ts',
  'src/app/features/field-resource-management/state/reporting/reporting.selectors.spec.ts'
];

filesToFix.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Replace UserRole enum values with string literals
  content = content.replace(/UserRole\.Admin/g, "'Admin'");
  content = content.replace(/UserRole\.ConstructionManager/g, "'ConstructionManager'");
  content = content.replace(/UserRole\.ProjectManager/g, "'ProjectManager'");
  content = content.replace(/UserRole\.Technician/g, "'Technician'");
  
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Fixed: ${filePath}`);
});

console.log('Done!');
