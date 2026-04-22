/**
 * Bundle Analysis Script
 * 
 * Analyzes the production build bundle to identify optimization opportunities.
 * 
 * Usage:
 * 1. Build the production bundle: npm run build
 * 2. Run this script: node scripts/analyze-bundle.js
 * 
 * This script will:
 * - Display bundle sizes
 * - Identify large chunks
 * - Suggest optimization opportunities
 */

const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '..', 'dist', 'sri-frontend');

console.log('='.repeat(80));
console.log('Bundle Size Analysis');
console.log('='.repeat(80));
console.log('');

if (!fs.existsSync(distPath)) {
  console.error('Error: Build directory not found. Please run "npm run build" first.');
  process.exit(1);
}

// Read all files in dist directory
const files = fs.readdirSync(distPath);
const jsFiles = files.filter(f => f.endsWith('.js'));

// Calculate sizes
const fileSizes = jsFiles.map(file => {
  const filePath = path.join(distPath, file);
  const stats = fs.statSync(filePath);
  return {
    name: file,
    size: stats.size,
    sizeKB: (stats.size / 1024).toFixed(2),
    sizeMB: (stats.size / 1024 / 1024).toFixed(2)
  };
});

// Sort by size descending
fileSizes.sort((a, b) => b.size - a.size);

// Display results
console.log('JavaScript Bundle Files:');
console.log('-'.repeat(80));
console.log('');

let totalSize = 0;
fileSizes.forEach((file, index) => {
  totalSize += file.size;
  const sizeDisplay = file.size > 1024 * 1024 
    ? `${file.sizeMB} MB` 
    : `${file.sizeKB} KB`;
  
  console.log(`${index + 1}. ${file.name}`);
  console.log(`   Size: ${sizeDisplay}`);
  console.log('');
});

console.log('-'.repeat(80));
console.log(`Total JavaScript Size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
console.log('');

// Identify large chunks
const largeChunks = fileSizes.filter(f => f.size > 500 * 1024); // > 500 KB
if (largeChunks.length > 0) {
  console.log('⚠️  Large Chunks Detected (> 500 KB):');
  console.log('-'.repeat(80));
  largeChunks.forEach(chunk => {
    console.log(`- ${chunk.name}: ${chunk.sizeKB} KB`);
  });
  console.log('');
  console.log('Recommendations:');
  console.log('- Consider lazy loading these modules');
  console.log('- Review dependencies for unused code');
  console.log('- Use tree-shaking to remove unused exports');
  console.log('');
}

// Recommendations
console.log('Optimization Recommendations:');
console.log('-'.repeat(80));
console.log('1. Lazy load feature modules using loadChildren');
console.log('2. Use PreloadAllModules strategy for critical routes');
console.log('3. Implement code splitting for large components');
console.log('4. Remove unused dependencies from package.json');
console.log('5. Use webpack-bundle-analyzer for detailed analysis:');
console.log('   npm install --save-dev webpack-bundle-analyzer');
console.log('   ng build --stats-json');
console.log('   npx webpack-bundle-analyzer dist/sri-frontend/browser/stats.json');
console.log('');

console.log('='.repeat(80));
