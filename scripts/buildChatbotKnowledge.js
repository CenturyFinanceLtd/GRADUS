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

const manualEntries = [
  {
    id: 'gradus-overview',
    title: 'Gradus overview',
    tags: ['gradus', 'overview', 'company', 'mission', 'century finance'],
    content:
      'Gradus is the career acceleration initiative of Century Finance Limited. It closes the gap between classroom instruction and industry expectations by combining outcome-driven curricula, paid internships, and mentor-led coaching so learners convert theory into boardroom-ready competence.',
    source: 'frontend/src/components/AboutThree.jsx',
  },
  {
    id: 'value-proposition',
    title: 'Why learners choose Gradus',
    tags: ['why gradus', 'value', 'benefits', 'placements'],
    content:
      'Gradus compresses the journey from student to professional through guaranteed placements, nationwide hiring partnerships, and experiential modules. Each pathway is shaped with 178 partner companies to place learners into high-impact roles across finance, technology, and management.',
    source: 'frontend/src/components/ChooseUsTwo.jsx',
  },
  {
    id: 'flagship-programs',
    title: 'Flagship programs',
    tags: ['programs', 'gradusquity', 'gradusx', 'graduslead', 'courses'],
    content:
      'Gradus offers three signature pathways: GradusQuity for capital markets mastery, GradusX for full-stack technology and AI growth careers, and GradusLead for business and leadership excellence. Each program is approved by Skill India and NSDC and delivered with a placement MoU that secures packages from 6 LPA to 14 LPA.',
    source: 'frontend/src/components/home/HomeCourseSeriesOverview.jsx',
  },
  {
    id: 'placements',
    title: 'Placements and hiring network',
    tags: ['placements', 'careers', 'network', 'partners'],
    content:
      'Gradus operates a dedicated placement cell that mentors learners for interviews, runs nationwide hiring drives, and manages relationships with 178 strategic recruiters. Every learner signs a placement MoU offering packages between 6 LPA and 14 LPA with partner companies.',
    source: 'frontend/src/components/InfoTwo.jsx',
  },
  {
    id: 'mentors',
    title: 'Mentor ecosystem',
    tags: ['mentors', 'faculty', 'coach', 'support'],
    content:
      'Programs are delivered by SEBI-certified mentors and veteran industry leaders. They run case clinics, trading simulations, project reviews, and personalised coaching to build critical thinking, resilience, and interview-ready communication.',
    source: 'frontend/src/components/InfoTwo.jsx',
  },
  {
    id: 'internships',
    title: 'Paid internship journey',
    tags: ['internship', 'experience', 'industry exposure'],
    content:
      'Every Gradus learner completes immersive paid internships that translate classroom learning into real-world execution. Internships are designed with hiring partners so trainees gain market context before stepping into a full-time role.',
    source: 'frontend/src/components/AboutThree.jsx',
  },
  {
    id: 'admissions',
    title: 'Admissions guidance',
    tags: ['admissions', 'apply', 'enrolment', 'contact'],
    content:
      'Prospective learners can explore Gradus programs through the About Us, Our Courses, and Apply Admission pages. To start the process, review program details, submit the admission form, and connect with the Gradus team for counselling and cohort scheduling.',
    source: 'frontend/src/pages/ApplyAdmissionPage.jsx',
  },
  {
    id: 'blog-insights',
    title: 'Gradus blog insights',
    tags: ['blog', 'news', 'updates', 'insights'],
    content:
      'The Gradus blog publishes stories on program outcomes, cohort success, industry trends, and learner experiences. Readers can browse the Blogs section for the latest updates across finance, technology, artificial intelligence, and leadership topics.',
    source: 'frontend/src/components/BlogTwo.jsx',
  },
  {
    id: 'contact-support',
    title: 'Contact and support',
    tags: ['contact', 'support', 'help', 'reach out'],
    content:
      'For personalised assistance, learners can use the contact form, email the Gradus counsellor team, or reach out via the Apply Admission and Contact pages. The support staff help with program selection, cohort timelines, tuition details, and placement queries.',
    source: 'frontend/src/pages/ContactPage.jsx',
  },
];

const TEXT_CLASSNAME_PATTERN = /(\bpx-\d|\bpy-\d|\bmp-\d|\bmt-\d|\bmb-\d|\bbg-|\bborder-|\btext-[a-z]+|\bflex\b|\bd-inline\b|\bposition-absolute\b|\banimate|wow)/i;

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

  if (TEXT_CLASSNAME_PATTERN.test(text)) {
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
  const autoEntries = [];

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
    autoEntries.push(entry);
  });

  autoEntries.sort((a, b) => a.id.localeCompare(b.id));

  const seenIds = new Set();
  const finalEntries = [];

  manualEntries.forEach((entry) => {
    if (!seenIds.has(entry.id)) {
      finalEntries.push(entry);
      seenIds.add(entry.id);
    }
  });

  autoEntries.forEach((entry) => {
    if (!seenIds.has(entry.id)) {
      finalEntries.push(entry);
      seenIds.add(entry.id);
    }
  });

  const fileContent = ['module.exports = [', ...finalEntries.map(formatEntry), '];\n'].join('\n');

  fs.writeFileSync(OUTPUT_PATH, fileContent, 'utf8');
  console.log(`Generated ${finalEntries.length} knowledge entries at ${OUTPUT_PATH}`);
}

main();
