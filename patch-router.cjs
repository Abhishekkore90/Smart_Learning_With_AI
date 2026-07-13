const fs = require('fs');
const path = require('path');

const startDir = path.join(__dirname, 'node_modules');

function findFiles(dir, fileNames, results = []) {
  if (!fs.existsSync(dir)) return results;
  
  // Quick check to avoid traversing too deep into unrelated directories
  const base = path.basename(dir);
  if (base === '.bin' || base === 'src' || base === 'docs' || base === 'test' || base === 'tests') {
    return results;
  }
  
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const filePath = path.join(dir, file);
      let stat;
      try {
        stat = fs.statSync(filePath);
      } catch (e) {
        continue;
      }
      
      if (stat.isDirectory()) {
        findFiles(filePath, fileNames, results);
      } else if (fileNames.includes(file)) {
        // Double check it's part of the code-splitter package
        if (filePath.includes('@tanstack') && filePath.includes('code-splitter')) {
          results.push(filePath);
        }
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err);
  }
  return results;
}

console.log(`Scanning for compilers.js and compilers.cjs in ${startDir}...`);
const targetFiles = findFiles(startDir, ['compilers.js', 'compilers.cjs']);

console.log(`Found ${targetFiles.length} file(s) to patch.`);

targetFiles.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    const target = "import('${splitUrl}')";
    const replacement = "import(${JSON.stringify(splitUrl)})";
    
    if (content.includes(target)) {
      content = content.split(target).join(replacement);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Successfully patched: ${filePath}`);
    } else {
      console.log(`Already patched or target pattern not found in: ${filePath}`);
    }
  } catch (err) {
    console.error(`Failed to patch ${filePath}:`, err);
  }
});
