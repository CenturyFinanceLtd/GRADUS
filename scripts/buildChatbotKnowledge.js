const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const FRONTEND_DIRS = [
  path.join(PROJECT_ROOT, 'frontend', 'src', 'pages'),
  path.join(PROJECT_ROOT, 'frontend', 'src', 'components'),
  path.join(PROJECT_ROOT, 'frontend', 'src', 'data'),
];
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'backend', 'src', 'data', 'chatbotKnowledge.js');

const TEXT_NODE_REGEX = />[^<>{}]*[A-Za-z][^<>{}]*</g;
const STRING_LITERAL_REGEX = /(["'])([^"'\n]*?[A-Za-z][^"'\n]*?)\1/g;

const IGNORE_FILE_PATTERNS = [/\.test\.jsx?$/, /\.stories\.jsx?$/];
const VALID_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);

const seenContents = new Set();

function walk(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(fullPath);
    }

    if (!VALID_EXTENSIONS.has(path.extname(entry.name))) {
      return [];
    }

    if (IGNORE_FILE_PATTERNS.some((regex) => regex.test(entry.name))) {
      return [];
    }

    return [fullPath];
  });
}

function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/&nbsp;/gi, ' ')
    .trim();
}

function isInformational(text) {
  if (!text || text.length < 12) {
    return false;
  }

  if (!/[A-Za-z]/.test(text)) {
    return false;
  }

  if (/[\\/@]/.test(text)) {
    return false;
  }

  const hasSentenceCase = /[A-Z][a-z]/.test(text);
  const hasPunctuation = /[.,!?]/.test(text);

  if (!hasSentenceCase && !hasPunctuation) {
    return false;
  }

  if (/(?:\bpx-\d|\bpy-\d|\bmp-\d|\bmt-\d|\bmb-\d|\bbg-|\bborder-|\btext-[a-z]|\bflex\b|wow|animate|rounded|shadow|d-inline|position-absolute)/i.test(text)) {
    return false;
  }

  return true;
}

function extractTextSegments(content) {
  const segments = new Set();

  const textNodes = content.match(TEXT_NODE_REGEX) || [];
  textNodes.forEach((match) => {
    const cleaned = cleanText(match.slice(1, -1));
    if (isInformational(cleaned)) {
      segments.add(cleaned);
    }
  });

  let stringMatch;
  while ((stringMatch = STRING_LITERAL_REGEX.exec(content)) !== null) {
    const cleaned = cleanText(stringMatch[2]);
    if (isInformational(cleaned)) {
      segments.add(cleaned);
    }
  }

  return Array.from(segments);
}

function buildEntry(filePath, segments) {
  const relative = path.relative(path.join(PROJECT_ROOT, 'frontend', 'src'), filePath).replace(/\\/g, '/');
  const id = relative
    .replace(/\.[jt]sx?$/, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  const titleSegments = relative
    .replace(/\.[jt]sx?$/, '')
    .split('/')
    .map((segment) => segment.replace(/[-_]/g, ' '))
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1));

  const title = `Insights from ${titleSegments.join(' - ')}`;

  const tags = Array.from(
    new Set(
      titleSegments
        .flatMap((segment) => segment.split(/\s+/))
        .map((word) => word.toLowerCase())
        .filter((word) => word.length > 2)
    )
  );

  const content = segments.join(' ');

  return {
    id: id || 'entry',
    title,
    tags,
    content,
    source: `frontend/src/${relative}`,
  };
}

function escapeSingleQuotes(value) {
  return value.replaceAll('\\', '\\\\').replaceAll("'", "\\'");
}

function formatEntry(entry) {
  const { id, title, tags, content, source } = entry;
  const safeContent = content.length > 2000 ? `${content.slice(0, 1997)}...` : content;
  return [
    '  {',
    `    id: '${escapeSingleQuotes(id)}',`,
    `    title: '${escapeSingleQuotes(title)}',`,
    `    tags: ${JSON.stringify(tags)},`,
    `    content: '${escapeSingleQuotes(safeContent)}',`,
    `    source: '${escapeSingleQuotes(source)}',`,
    '  },',
  ].join('\n');
}

function main() {
  const files = FRONTEND_DIRS.flatMap(walk);
  const entries = [];

  files.forEach((file) => {
    const raw = fs.readFileSync(file, 'utf8');
    const segments = extractTextSegments(raw);

    if (!segments.length) {
      return;
    }

    const entry = buildEntry(file, segments);

    if (!entry.content || entry.content.length < 40) {
      return;
    }

    const contentKey = `${entry.id}::${entry.content}`;
    if (seenContents.has(contentKey)) {
      return;
    }

    seenContents.add(contentKey);
    entries.push(entry);
  });

  entries.sort((a, b) => a.id.localeCompare(b.id));

  const fileContent = ['module.exports = [', ...entries.map(formatEntry), '];\n'].join('\n');

  fs.writeFileSync(OUTPUT_PATH, fileContent, 'utf8');
  console.log(`Generated ${entries.length} knowledge entries at ${OUTPUT_PATH}`);
}

main();
