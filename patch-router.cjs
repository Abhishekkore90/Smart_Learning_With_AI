const fs = require('fs');
const path = require('path');

const startDir = path.join(__dirname, 'node_modules');

function findFiles(dir, fileNames, results = []) {
  if (!fs.existsSync(dir)) return results;
  
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

console.log(`[patch-router] Checking TanStack Router compiler files...`);
const targetFiles = findFiles(startDir, ['compilers.js', 'compilers.cjs']);

let patchedCount = 0;
targetFiles.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    const targets = [
      "import('${splitUrl}')",
      "import(`${splitUrl}`)"
    ];
    const replacement = "import(${JSON.stringify(splitUrl)})";
    
    let isModified = false;
    for (const target of targets) {
      if (content.includes(target)) {
        content = content.split(target).join(replacement);
        isModified = true;
      }
    }
    
    if (isModified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`[patch-router] Successfully patched: ${path.relative(__dirname, filePath)}`);
      patchedCount++;
    }
  } catch (err) {
    console.error(`[patch-router] Failed to check/patch ${filePath}:`, err.message);
  }
});

if (patchedCount === 0) {
  console.log(`[patch-router] All router files are up-to-date (no patch needed).`);
} else {
  console.log(`[patch-router] Patched ${patchedCount} router file(s).`);
}
