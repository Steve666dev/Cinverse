import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const FORBIDDEN_TITLES = [
  'kantara',
  'singham',
  'amaran',
  'devara',
  'bagheera',
  'ramayana',
  'toxic',
  'raja saab'
];

const SCAN_DIRS = [
  path.join(ROOT_DIR, 'src'),
  path.join(ROOT_DIR, 'server')
];

const EXCLUDED_PATHS = [
  'node_modules',
  '.git',
  'dist',
  'tests/fixtures',
  'tests',
  '.system_generated',
  '.gemini'
];

let violationCount = 0;

function isExcluded(filePath) {
  const norm = filePath.replace(/\\/g, '/');
  return EXCLUDED_PATHS.some(p => norm.includes(p));
}

function scanFile(filePath) {
  if (isExcluded(filePath)) return;
  if (!/\.(js|jsx|ts|tsx|json)$/.test(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();

    // Ignore comments
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      return;
    }

    // Rule 1: Old movie titles in string literals
    for (const title of FORBIDDEN_TITLES) {
      const regex = new RegExp(`(['"\`])${title}['"\`]`, 'i');
      if (regex.test(line)) {
        console.error(`[VIOLATION: FORBIDDEN_TITLE] ${filePath}:${lineNum}`);
        console.error(`  Matched title: "${title}"`);
        console.error(`  Line: ${trimmed}\n`);
        violationCount++;
      }
    }

    // Rule 2: Hardcoded IMDb ID string literals
    const imdbIdLiteralRegex = /(['"`])tt\d{7,10}\1/;
    if (imdbIdLiteralRegex.test(line)) {
      console.error(`[VIOLATION: HARDCODED_IMDB_ID] ${filePath}:${lineNum}`);
      console.error(`  Line: ${trimmed}\n`);
      violationCount++;
    }

    // Rule 3: Hardcoded external poster/media image URLs (.jpg/.png/.webp)
    // Note: Dynamically interpolated templates (containing ${...}) are dynamic, not hardcoded
    if (!line.includes('${')) {
      const remoteImageRegex = /(['"`])https?:\/\/[^'"`\s]+?\.(jpg|jpeg|png|webp)([\?#][^'"`\s]*)?\1/i;
      if (remoteImageRegex.test(line)) {
        console.error(`[VIOLATION: HARDCODED_IMAGE_URL] ${filePath}:${lineNum}`);
        console.error(`  Line: ${trimmed}\n`);
        violationCount++;
      }
    }

    // Rule 4: Hardcoded movie release date literals inside movie objects
    const dateLiteralRegex = /(releaseDate|date|released)\s*:\s*(['"`])20\d{2}-\d{2}-\d{2}\2/i;
    if (dateLiteralRegex.test(line)) {
      console.error(`[VIOLATION: HARDCODED_DATE_LITERAL] ${filePath}:${lineNum}`);
      console.error(`  Line: ${trimmed}\n`);
      violationCount++;
    }

    // Rule 5: Hardcoded movie object arrays with a "title" field
    const movieArrayRegex = /\[\s*\{\s*[^}]*?title\s*:/i;
    if (movieArrayRegex.test(line)) {
      console.error(`[VIOLATION: HARDCODED_MOVIE_ARRAY] ${filePath}:${lineNum}`);
      console.error(`  Line: ${trimmed}\n`);
      violationCount++;
    }

    // Rule 6: Forbidden hardcoded array identifiers
    if (line.includes('UPCOMING_INDIAN_THEATRICAL_BASELINE') || line.includes('A24_FILMS =') || line.includes('CANDIDATE_TITLES =')) {
      console.error(`[VIOLATION: FORBIDDEN_ARRAY_DECLARATION] ${filePath}:${lineNum}`);
      console.error(`  Line: ${trimmed}\n`);
      violationCount++;
    }
  });
}

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!isExcluded(fullPath)) {
        scanDir(fullPath);
      }
    } else {
      scanFile(fullPath);
    }
  }
}

for (const dir of SCAN_DIRS) {
  scanDir(dir);
}

if (violationCount > 0) {
  console.error(`[check:no-manual-data] FAILED: Found ${violationCount} violation(s) of manual movie data rules!`);
  process.exit(1);
} else {
  console.log(`[check:no-manual-data] PASSED: Zero manual movie data, hardcoded arrays, or old titles found in src/ or server/.`);
  process.exit(0);
}
