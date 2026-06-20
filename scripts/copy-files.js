const fs = require('fs');
const path = require('path');

// Copy directory recursively
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const files = fs.readdirSync(src);
  files.forEach(file => {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

// Copy .next/static to .next/standalone/.next/
copyDir('.next/static', '.next/standalone/.next/static');
console.log('Copied .next/static to .next/standalone/.next/');

// Copy public to .next/standalone/
copyDir('public', '.next/standalone/public');
console.log('Copied public to .next/standalone/');
