const fs = require('fs');
const path = require('path');

const basePath = '/hospital-ui';

// 1. Update public/manifest.json
const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.start_url = `${basePath}/`;
  manifest.scope = `${basePath}/`;
  if (manifest.icons) {
    manifest.icons.forEach(icon => {
      if (icon.src.startsWith('/') && !icon.src.startsWith(basePath)) {
        icon.src = `${basePath}${icon.src}`;
      }
    });
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('Successfully updated public/manifest.json with basePath');
}

// 2. Update public/sw.js
const swPath = path.join(process.cwd(), 'public', 'sw.js');
if (fs.existsSync(swPath)) {
  let sw = fs.readFileSync(swPath, 'utf8');
  sw = sw.replace(/'\/manifest\.json'/g, `'${basePath}/manifest.json'`);
  sw = sw.replace(/'\/cura-logo-v2\.png'/g, `'${basePath}/cura-logo-v2.png'`);
  sw = sw.replace(/'\/favicon\.ico'/g, `'${basePath}/favicon.ico'`);
  fs.writeFileSync(swPath, sw);
  console.log('Successfully updated public/sw.js with basePath');
}
