const fs = require('fs');
const path = require('path');

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

const outputPath = path.join(__dirname, '..', 'backend', 'src', 'data', 'chatbotKnowledge.js');
const existing = fs.readFileSync(outputPath, 'utf8');
const match = existing.match(/^module\.exports = \[(.*)\];\s*$/s);
if (!match) {
  throw new Error('Unexpected chatbotKnowledge.js format.');
}
const currentEntriesText = match[1].trim();

const manualIds = new Set(manualEntries.map((entry) => entry.id));

const entries = manualEntries.slice();

const entryRegex = /{[\s\S]*?},\s*/g;
const currentMatches = currentEntriesText.match(entryRegex) || [];
currentMatches.forEach((snippet) => {
  const idMatch = snippet.match(/id:\s*'([^']+)'/);
  if (idMatch) {
    const id = idMatch[1];
    if (manualIds.has(id)) {
      return;
    }
  }
  entries.push(snippet.trim().replace(/,$/, ''));
});

const manualStrings = manualEntries.map((entry) => {
  return [
    '  {',
    `    id: '${entry.id}',`,
    `    title: '${entry.title}',`,
    `    tags: ${JSON.stringify(entry.tags)},`,
    `    content: '${entry.content.replace(/'/g, "\\'")}',`,
    `    source: '${entry.source}',`,
    '  },',
  ].join('\n');
});

const combined = manualStrings.concat(entries.slice(manualEntries.length)).join('\n');
fs.writeFileSync(outputPath, `module.exports = [\n${combined}\n];\n`, 'utf8');
