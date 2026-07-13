const fs = require('fs');
const path = require('path');

const distPath = path.resolve(__dirname, 'dist');
const clientPath = path.join(distPath, 'client');
const serverPath = path.join(distPath, 'server');
const rootDistPath = path.resolve(__dirname, '..', 'dist');

// Helper function to recursively copy directories/files
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Helper to recursively delete directory
function deleteRecursiveSync(targetPath) {
  if (fs.existsSync(targetPath)) {
    fs.readdirSync(targetPath).forEach((file) => {
      const curPath = path.join(targetPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteRecursiveSync(curPath);
      } else {
        try {
          fs.unlinkSync(curPath);
        } catch (e) {
          console.warn(`Post-build warning: Could not delete file ${curPath}:`, e.message);
        }
      }
    });
    try {
      fs.rmdirSync(targetPath);
    } catch (e) {
      console.warn(`Post-build warning: Could not delete directory ${targetPath}:`, e.message);
    }
  }
}

if (fs.existsSync(clientPath)) {
  console.log('Post-build: Flattening dist/client into dist folders...');

  // Ensure root dist exists
  let rootDistExists = false;
  if (!fs.existsSync(rootDistPath)) {
    try {
      fs.mkdirSync(rootDistPath, { recursive: true });
      rootDistExists = true;
    } catch (e) {
      console.warn('Post-build: Could not create parent directory dist folder, skipping root dist copy.', e.message);
    }
  } else {
    rootDistExists = true;
  }

  // Copy everything from dist/client to both distPath and rootDistPath
  fs.readdirSync(clientPath).forEach((file) => {
    const srcFile = path.join(clientPath, file);

    // Copy to pure-pixel-showcase-main/dist
    const destFileLocal = path.join(distPath, file);
    copyRecursiveSync(srcFile, destFileLocal);

    // Copy to root /dist
    if (rootDistExists) {
      try {
        const destFileRoot = path.join(rootDistPath, file);
        copyRecursiveSync(srcFile, destFileRoot);
      } catch (e) {
        console.warn('Post-build: Failed to copy to root dist directory:', e.message);
      }
    }
  });

  // Rename _shell.html to index.html if it exists in both
  const renameHtml = (dir) => {
    const shellPath = path.join(dir, '_shell.html');
    const indexPath = path.join(dir, 'index.html');
    if (fs.existsSync(shellPath)) {
      fs.renameSync(shellPath, indexPath);
      console.log(`Post-build: Renamed _shell.html to index.html in ${dir}`);
    } else {
      console.warn(`Post-build: _shell.html NOT found in ${dir}`);
    }
  };
  renameHtml(distPath);
  if (rootDistExists) {
    try {
      renameHtml(rootDistPath);
    } catch (e) { }
  }

  // Create vercel.json for SPA routing inside both dist folders (for drag-and-drop)
  const writeVercelJson = (dir) => {
    const vercelJsonPath = path.join(dir, 'vercel.json');
    const vercelConfig = {
      framework: "vite",
      cleanUrls: true,
      routes: [
        { handle: "filesystem" },
        { src: "/(.*)", dest: "/" }
      ]
    };
    fs.writeFileSync(vercelJsonPath, JSON.stringify(vercelConfig, null, 2), 'utf-8');
  };
  writeVercelJson(distPath);
  if (rootDistExists) {
    try {
      writeVercelJson(rootDistPath);
    } catch (e) { }
  }
  console.log('Post-build: Created vercel.json in dist folders');

  // Create .htaccess for Apache SPA routing in both dist folders
  const writeHtaccess = (dir) => {
    const htaccessPath = path.join(dir, '.htaccess');
    const htaccessConfig = `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
`;
    fs.writeFileSync(htaccessPath, htaccessConfig, 'utf-8');
  };
  writeHtaccess(distPath);
  if (rootDistExists) {
    try {
      writeHtaccess(rootDistPath);
    } catch (e) { }
  }
  console.log('Post-build: Created .htaccess in dist folders');

  // Post-build: Vercel Build Output API v3 is skipped since we use root vercel.json configuration instead.

  // Clean up client and server directories, server.js, wrangler.json, and .assetsignore in local dist
  console.log('Post-build: Cleaning up temp files...');
  deleteRecursiveSync(clientPath);
  deleteRecursiveSync(serverPath);

  const filesToDelete = ['server.js', 'wrangler.json', '.assetsignore'];
  filesToDelete.forEach(file => {
    const filePath = path.join(distPath, file);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.warn(`Post-build warning: Could not delete file ${filePath}:`, e.message);
      }
    }
  });

  console.log('Post-build: Success! Subproject dist/ and Root dist/ folders are now vercel-friendly.');
} else {
  console.log('Post-build: dist/client directory not found, skipping flattening.');
}
