const fs = require('fs');
const path = require('path');

// Files that need Skill.level fixes
const files = [
  'src/app/features/field-resource-management/components/scheduling/assignment-dialog/assignment-dialog.component.spec.ts',
  'src/app/features/field-resource-management/components/scheduling/technician-schedule/technician-schedule.component.spec.ts',
  'src/app/features/field-resource-management/components/shared/batch-technician-dialog/batch-technician-dialog.component.spec.ts',
  'src/app/features/field-resource-management/services/scheduling.service.spec.ts',
  'src/app/features/field-resource-management/services/technician.service.spec.ts'
];

files.forEach(filePath => {
  console.log(`Processing ${filePath}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add SkillLevel import if not present
  if (!content.includes('SkillLevel')) {
    // Find the technician.model import line
    const technicianModelImportRegex = /(import\s+{[^}]*)(}\s+from\s+['"].*technician\.model['"])/;
    if (technicianModelImportRegex.test(content)) {
      content = content.replace(technicianModelImportRegex, (match, p1, p2) => {
        if (!p1.includes('SkillLevel')) {
          return p1 + ', SkillLevel' + p2;
        }
        return match;
      });
    } else {
      // Add new import if technician.model not imported
      const firstImport = content.indexOf('import');
      if (firstImport !== -1) {
        const endOfFirstImport = content.indexOf(';', firstImport);
        content = content.slice(0, endOfFirstImport + 1) + 
                  "\nimport { SkillLevel } from '../../models/technician.model';" +
                  content.slice(endOfFirstImport + 1);
      }
    }
  }
  
  // Fix Skill objects: add level: SkillLevel.Intermediate
  // Pattern: { id: 'xxx', name: 'xxx', category: 'xxx' }
  const skillObjectRegex = /{\s*id:\s*['"][^'"]*['"]\s*,\s*name:\s*['"][^'"]*['"]\s*,\s*category:\s*['"][^'"]*['"]\s*}/g;
  content = content.replace(skillObjectRegex, (match) => {
    // Add level property before the closing brace
    return match.slice(0, -1) + ', level: SkillLevel.Intermediate }';
  });
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✓ Fixed ${filePath}`);
});

console.log('\n✓ All Skill.level fixes applied!');
