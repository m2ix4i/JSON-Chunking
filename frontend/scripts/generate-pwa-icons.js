#!/usr/bin/env node

/**
 * Generate PWA icons for development/testing
 * Creates simple placeholder icons until proper designs are available
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple SVG to create basic icons
function createSVGIcon(size, isMaskable = false) {
  const safeZone = isMaskable ? size * 0.1 : 0;
  const contentSize = size - (2 * safeZone);
  const contentOffset = safeZone;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .bg { fill: #1976d2; }
      .text { fill: white; font-family: Arial, sans-serif; font-weight: bold; text-anchor: middle; dominant-baseline: middle; }
      .title { font-size: ${contentSize / 6}px; }
      .subtitle { font-size: ${contentSize / 12}px; }
      .border { stroke: white; stroke-width: ${contentSize / 64}; fill: none; }
    </style>
  </defs>
  
  <!-- Background -->
  <rect width="${size}" height="${size}" class="bg"/>
  
  ${isMaskable ? `<!-- Safe zone for maskable -->
  <rect x="${contentOffset}" y="${contentOffset}" width="${contentSize}" height="${contentSize}" fill="white"/>
  ` : ''}
  
  <!-- IFC Text -->
  <text x="${size / 2}" y="${size / 2 - contentSize / 12}" class="text title ${isMaskable ? 'bg' : ''}" ${isMaskable ? 'fill="#1976d2"' : ''}>IFC</text>
  <text x="${size / 2}" y="${size / 2 + contentSize / 12}" class="text subtitle ${isMaskable ? 'bg' : ''}" ${isMaskable ? 'fill="#1976d2"' : ''}>JSON</text>
  
  <!-- Building icon -->
  <rect x="${size / 2 - contentSize / 8}" y="${size / 2 + contentSize / 6}" width="${contentSize / 4}" height="${contentSize / 8}" class="border" ${isMaskable ? 'stroke="#1976d2"' : ''}/>
  <rect x="${size / 2 - contentSize / 16}" y="${size / 2 + contentSize / 4.5}" width="${contentSize / 8}" height="${contentSize / 16}" class="border" ${isMaskable ? 'stroke="#1976d2"' : ''}/>
</svg>`;
}

// Create base64 PNG data (simple approach for placeholder)
function createBase64PNG(size, isMaskable = false) {
  // This is a very basic approach - in a real project you'd use a proper image library
  // For now, we'll create a simple colored square as base64
  const color = '#1976d2';
  
  // Simple 1x1 blue pixel as base64 PNG - we'll let the browser scale it
  const bluePNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA/8qvtgAAAABJRU5ErkJggg==';
  
  return bluePNG;
}

async function generateIcons() {
  const iconsDir = path.join(__dirname, '../public/icons');
  
  // Ensure icons directory exists
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }
  
  // Generate SVG files
  const icons = [
    { name: 'icon-192.svg', size: 192, maskable: false },
    { name: 'icon-512.svg', size: 512, maskable: false },
    { name: 'icon-maskable.svg', size: 512, maskable: true }
  ];
  
  for (const icon of icons) {
    const svgContent = createSVGIcon(icon.size, icon.maskable);
    const filePath = path.join(iconsDir, icon.name);
    fs.writeFileSync(filePath, svgContent);
    console.log(`Generated ${icon.name}`);
  }
  
  // Create simple PNG files for immediate use
  // Using a very basic approach - create small PNG files that browsers will scale
  const pngData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA/8qvtgAAAABJRU5ErkJggg==', 'base64');
  
  // Create placeholder PNG files
  const pngIcons = [
    'icon-192.png',
    'icon-512.png', 
    'icon-maskable.png'
  ];
  
  for (const pngIcon of pngIcons) {
    const filePath = path.join(iconsDir, pngIcon);
    fs.writeFileSync(filePath, pngData);
    console.log(`Generated placeholder ${pngIcon}`);
  }
  
  console.log('\nPWA icons generated successfully!');
  console.log('Note: These are placeholder icons for development.');
  console.log('Replace with properly designed icons before production.');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateIcons().catch(console.error);
}

export { generateIcons, createSVGIcon };