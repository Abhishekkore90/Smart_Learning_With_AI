<<<<<<< HEAD
const fs = require('fs');
const path = require('path');

const distPath = path.resolve(__dirname, 'dist');
const clientPath = path.join(distPath, 'client');
const serverPath = path.join(distPath, 'server');
const rootDistPath = path.resolve(__dirname, '..', 'dist');
=======
const fs = require("fs");
const path = require("path");

const distPath = path.resolve(__dirname, "dist");
const clientPath = path.join(distPath, "client");
const serverPath = path.join(distPath, "server");
const rootDistPath = path.resolve(__dirname, "..", "dist");
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557

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
<<<<<<< HEAD
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
=======
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName),
      );
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
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
<<<<<<< HEAD
          console.warn(`Post-build warning: Could not delete file ${curPath}:`, e.message);
=======
          console.warn(
            `Post-build warning: Could not delete file ${curPath}:`,
            e.message,
          );
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
        }
      }
    });
    try {
      fs.rmdirSync(targetPath);
    } catch (e) {
<<<<<<< HEAD
      console.warn(`Post-build warning: Could not delete directory ${targetPath}:`, e.message);
=======
      console.warn(
        `Post-build warning: Could not delete directory ${targetPath}:`,
        e.message,
      );
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
    }
  }
}

if (fs.existsSync(clientPath)) {
<<<<<<< HEAD
  console.log('Post-build: Flattening dist/client into dist folders...');
=======
  console.log("Post-build: Flattening dist/client into dist folders...");
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557

  // Ensure root dist exists
  let rootDistExists = false;
  if (!fs.existsSync(rootDistPath)) {
    try {
      fs.mkdirSync(rootDistPath, { recursive: true });
      rootDistExists = true;
    } catch (e) {
<<<<<<< HEAD
      console.warn('Post-build: Could not create parent directory dist folder, skipping root dist copy.', e.message);
=======
      console.warn(
        "Post-build: Could not create parent directory dist folder, skipping root dist copy.",
        e.message,
      );
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
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
<<<<<<< HEAD
        console.warn('Post-build: Failed to copy to root dist directory:', e.message);
=======
        console.warn(
          "Post-build: Failed to copy to root dist directory:",
          e.message,
        );
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
      }
    }
  });

  // Rename _shell.html to index.html if it exists in both
  const renameHtml = (dir) => {
<<<<<<< HEAD
    const shellPath = path.join(dir, '_shell.html');
    const indexPath = path.join(dir, 'index.html');
=======
    const shellPath = path.join(dir, "_shell.html");
    const indexPath = path.join(dir, "index.html");
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
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
<<<<<<< HEAD
    } catch (e) { }
=======
    } catch (e) {}
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  }

  // Create vercel.json for SPA routing inside both dist folders (for drag-and-drop)
  const writeVercelJson = (dir) => {
<<<<<<< HEAD
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
=======
    const vercelJsonPath = path.join(dir, "vercel.json");
    const vercelConfig = {
      framework: "vite",
      cleanUrls: true,
      routes: [{ handle: "filesystem" }, { src: "/(.*)", dest: "/" }],
    };
    fs.writeFileSync(
      vercelJsonPath,
      JSON.stringify(vercelConfig, null, 2),
      "utf-8",
    );
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  };
  writeVercelJson(distPath);
  if (rootDistExists) {
    try {
      writeVercelJson(rootDistPath);
<<<<<<< HEAD
    } catch (e) { }
  }
  console.log('Post-build: Created vercel.json in dist folders');

  // Create .htaccess for Apache SPA routing in both dist folders
  const writeHtaccess = (dir) => {
    const htaccessPath = path.join(dir, '.htaccess');
=======
    } catch (e) {}
  }
  console.log("Post-build: Created vercel.json in dist folders");

  // Create .htaccess for Apache SPA routing in both dist folders
  const writeHtaccess = (dir) => {
    const htaccessPath = path.join(dir, ".htaccess");
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
    const htaccessConfig = `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
`;
<<<<<<< HEAD
    fs.writeFileSync(htaccessPath, htaccessConfig, 'utf-8');
=======
    fs.writeFileSync(htaccessPath, htaccessConfig, "utf-8");
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  };
  writeHtaccess(distPath);
  if (rootDistExists) {
    try {
      writeHtaccess(rootDistPath);
<<<<<<< HEAD
    } catch (e) { }
  }
  console.log('Post-build: Created .htaccess in dist folders');
=======
    } catch (e) {}
  }
  console.log("Post-build: Created .htaccess in dist folders");
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557

  // Post-build: Vercel Build Output API v3 is skipped since we use root vercel.json configuration instead.

  // Clean up client and server directories, server.js, wrangler.json, and .assetsignore in local dist
<<<<<<< HEAD
  console.log('Post-build: Cleaning up temp files...');
  deleteRecursiveSync(clientPath);
  deleteRecursiveSync(serverPath);

  const filesToDelete = ['server.js', 'wrangler.json', '.assetsignore'];
  filesToDelete.forEach(file => {
=======
  console.log("Post-build: Cleaning up temp files...");
  deleteRecursiveSync(clientPath);
  deleteRecursiveSync(serverPath);

  const filesToDelete = ["server.js", "wrangler.json", ".assetsignore"];
  filesToDelete.forEach((file) => {
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
    const filePath = path.join(distPath, file);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
<<<<<<< HEAD
        console.warn(`Post-build warning: Could not delete file ${filePath}:`, e.message);
=======
        console.warn(
          `Post-build warning: Could not delete file ${filePath}:`,
          e.message,
        );
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
      }
    }
  });

<<<<<<< HEAD
  console.log('Post-build: Success! Subproject dist/ and Root dist/ folders are now vercel-friendly.');
} else {
  console.log('Post-build: dist/client directory not found, skipping flattening.');
=======
  console.log(
    "Post-build: Success! Subproject dist/ and Root dist/ folders are now vercel-friendly.",
  );
} else {
  console.log(
    "Post-build: dist/client directory not found, skipping flattening.",
  );
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
}
