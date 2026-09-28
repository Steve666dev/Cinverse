const fs = require('fs');
const path = require('path');

const cssFiles = [
  'src/index.css',
  'src/components/Hero.css',
  'src/components/Header.css',
  'src/components/Footer.css',
  'src/components/MovieModal.css',
  'src/components/MovieReel.css',
  'src/components/core/dock.css',
  'src/components/core/animated-background.css'
];

function toGray(r, g, b) {
  // standard luminance formula
  const l = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  return {r: l, g: l, b: l};
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  if (h.length === 3) {
    return {
      r: parseInt(h[0]+h[0], 16),
      g: parseInt(h[1]+h[1], 16),
      b: parseInt(h[2]+h[2], 16)
    };
  }
  if (h.length === 6) {
    return {
      r: parseInt(h.substring(0,2), 16),
      g: parseInt(h.substring(2,4), 16),
      b: parseInt(h.substring(4,6), 16)
    };
  }
  return null;
}

cssFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace rgba(r,g,b,a)
  content = content.replace(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)/gi, (match, r, g, b, a) => {
    // skip pure grays to avoid unnecessary changes
    if (r === g && g === b) return match;
    const gray = toGray(parseInt(r), parseInt(g), parseInt(b));
    return `rgba(${gray.r},${gray.g},${gray.b},${a})`;
  });
  
  // Replace rgb(r,g,b)
  content = content.replace(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/gi, (match, r, g, b) => {
    if (r === g && g === b) return match;
    const gray = toGray(parseInt(r), parseInt(g), parseInt(b));
    return `rgb(${gray.r},${gray.g},${gray.b})`;
  });
  
  // Replace #RRGGBB / #RGB (avoid transparent or short non-colors, avoid basic grays if possible)
  content = content.replace(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g, (match, hex) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return match;
    if (rgb.r === rgb.g && rgb.g === rgb.b) return match; // already gray
    const gray = toGray(rgb.r, rgb.g, rgb.b);
    const hexGray = ((gray.r << 16) | (gray.g << 8) | gray.b).toString(16).padStart(6, '0');
    return `#${hexGray}`;
  });

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Processed ${file}`);
});
