const knowledgeBase = require('../data/chatbotKnowledge');
const Blog = require('../models/Blog');
const Course = require('../models/Course');
const BLOG_PUBLIC_BASE = (process.env.GRADUS_WEB_BASE_URL || 'https://gradusindia.in').replace(/\/\/+$/, '');
const http = require('http');
const https = require('https');
const { URL } = require('url');

const normalizeHeaders = (inputHeaders) => {
  if (!inputHeaders) {
    return {};
  }

  if (typeof inputHeaders.forEach === 'function' && !Array.isArray(inputHeaders)) {
    const result = {};

    inputHeaders.forEach((value, key) => {
      if (typeof key === 'string' && key) {
        result[key] = value;
      }
    });

    return result;
  }

  if (Array.isArray(inputHeaders)) {
    return inputHeaders.reduce((acc, entry) => {
      if (Array.isArray(entry) && entry.length >= 2) {
        const [key, value] = entry;
        if (typeof key === 'string' && key) {
          acc[key] = value;
        }
      }

      return acc;
    }, {});
  }

  return { ...(inputHeaders || {}) };
};

const createNativeFetch = () => {
  return async (input, init = {}) => {
    const requestUrl = typeof input === 'string' ? input : input?.href || input?.url;

    if (!requestUrl) {
      throw new Error('fetch polyfill requires a request URL string.');
    }

    const url = new URL(requestUrl);
    const transport = url.protocol === 'https:' ? https : http;
    const method = init.method || 'GET';
    const headers = normalizeHeaders(init.headers);

    let body = init.body;

    if (body && typeof body !== 'string' && !Buffer.isBuffer(body)) {
      body = JSON.stringify(body);
      if (!headers['content-type'] && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
    }

    return new Promise((resolve, reject) => {
      const request = transport.request(
        url,
        {
          method,
          headers,
        },
        (response) => {
          const chunks = [];

          response.on('data', (chunk) => chunks.push(chunk));
          response.on('end', () => {
            const buffer = Buffer.concat(chunks);
            const textBody = buffer.toString('utf8');
            const headerMap = {};

            Object.entries(response.headers || {}).forEach(([key, value]) => {
              if (typeof key === 'string') {
                headerMap[key.toLowerCase()] = value;
              }
            });

            resolve({
              ok: response.statusCode >= 200 && response.statusCode < 300,
              status: response.statusCode || 0,
              statusText: response.statusMessage || '',
              headers: {
                get(name) {
                  return headerMap[name.toLowerCase()];
                },
                raw() {
                  return { ...(response.headers || {}) };
                },
              },
              async text() {
                return textBody;
              },
              async json() {
                if (!textBody) {
                  return null;
                }

                try {
                  return JSON.parse(textBody);
                } catch (error) {
                  throw new Error(`Failed to parse JSON response: ${error.message}`);
                }
              },
            });
          });
        }
      );

      request.on('error', reject);

      if (body) {
        request.write(body);
      }

      request.end();
    });
  };
};

const resolveFetchImplementation = () => {
  if (typeof global.fetch === 'function') {
    return global.fetch.bind(global);
  }

  try {
    const nodeFetch = require('node-fetch');
    const candidate = nodeFetch && nodeFetch.default ? nodeFetch.default : nodeFetch;

    if (typeof candidate === 'function') {
      return candidate;
    }
  } catch (error) {
    console.warn('[chatbot] Unable to load node-fetch. Falling back to native HTTPS client.', error);
  }

  console.warn('[chatbot] Using HTTPS client shim for fetch. Install node-fetch for full WHATWG compatibility.');
  return createNativeFetch();
};

const fetchImpl = resolveFetchImplementation();

if (typeof global.fetch !== 'function') {
  global.fetch = fetchImpl;
}

const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'but',
  'by',
  'for',
  'from',
  'has',
  'have',
  'if',
  'in',
  'into',
  'is',
  'it',
  'its',
  'of',
  'on',
  'or',
  'that',
  'the',
  'their',
  'this',
  'to',
  'with',
  'you',
  'your',
]);

const BLOG_KEYWORDS = ['blog', 'blogs', 'article', 'articles', 'news', 'insight', 'insights', 'post', 'posts', 'update', 'updates', 'ai', 'artificial intelligence', 'technology', 'tech', 'data science'];
const GREETING_VARIANTS = new Set(['hi', 'hey', 'hello', 'hola', 'namaste', 'helo', 'heloo', 'hii', 'hiii', 'hiya', 'hlw', 'wassup', 'sup', 'good morning', 'good afternoon', 'good evening', 'hey there']);
const SMALL_TALK_RULES = [
  {
    test: (text) => {
      const normalized = text.replace(/[^a-z\s]/gi, ' ').replace(/\s+/g, ' ').trim();
      if (!normalized) {
        return false;
      }
      if (GREETING_VARIANTS.has(normalized)) {
        return true;
      }
      return normalized.split(' ').some((word) => GREETING_VARIANTS.has(word));
    },
    reply: "Hi! I'm doing great and ready to help you explore Gradus programs, mentors, and placements. What would you like to know?",
  },
  {
    test: (text) => /(how are (you|u)|how's it going|how are ya|how're you|how ru|how r u|howdy)/i.test(text),
    reply: "Thanks for asking! I'm feeling energized and here to support you with anything about Gradus. How can I help you today?",
  },
  {
    test: (text) => /(thank you|thanks|much appreciated|appreciate it)/i.test(text),
    reply: "You're very welcome! If there's anything else you need about Gradus, just let me know.",
  },
  {
    test: (text) => /(bye|goodbye|see you|see ya|catch you later|cya|talk soon)/i.test(text),
    reply: "Thanks for stopping by! Whenever you need Gradus info again, I'll be right here.",
  },
];

const getSmallTalkReply = (message) => {
  if (!message) {
    return null;
  }

  const raw = message.trim();

  if (!raw) {
    return null;
  }

  for (const rule of SMALL_TALK_RULES) {
    try {
      if (rule.test(raw)) {
        return rule.reply;
      }
    } catch (error) {
      // ignore faulty patterns
    }
  }

  const simplified = raw.replace(/[^a-z]/gi, '').toLowerCase();
  if (simplified && simplified.length <= 4 && GREETING_VARIANTS.has(simplified)) {
    return "Hi! I'm doing great and ready to help you explore Gradus programs, mentors, and placements. What would you like to know?";
  }

  return null;
};


const tokenize = (text) => {
  if (!text) {
    return [];
  }

  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/u)
    .filter((token) => token && !STOPWORDS.has(token));
};

const stripHtml = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/<[^>]*>/g, ' ');
};

const normalizeWhitespace = (value) => value.replace(/\s+/g, ' ').trim();

const truncate = (value, limit = 360) => {
  const clean = normalizeWhitespace(value);
  if (!clean) {
    return '';
  }
  if (clean.length <= limit) {
    return clean;
  }
  return `${clean.slice(0, limit).trim()}...`;
};

const formatPublished = (value) => {
  if (!value) {
    return 'Recently published';
  }

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Recently published';
    }

    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch (error) {
    return 'Recently published';
  }
};

const knowledgeDocuments = knowledgeBase.map((entry) => {
  const combined = [entry.title, entry.content, Array.isArray(entry.tags) ? entry.tags.join(' ') : '']
    .filter(Boolean)
    .join(' ');
  const tokens = tokenize(combined);
  const counts = tokens.reduce((accumulator, token) => {
    const count = accumulator[token] || 0;
    // eslint-disable-next-line no-param-reassign
    accumulator[token] = count + 1;
    return accumulator;
  }, {});

  return { ...entry, tokens, counts };
});

const getTopContexts = (query, limit = 4) => {
  const queryTokens = tokenize(query);

  if (!queryTokens.length) {
    return knowledgeDocuments.slice(0, limit);
  }

  const scored = knowledgeDocuments
    .map((doc) => {
      let score = 0;

      queryTokens.forEach((token) => {
        if (doc.counts[token]) {
          score += doc.counts[token];
        }

        if (Array.isArray(doc.tags) && doc.tags.includes(token)) {
          score += 2;
        }
      });

      return { ...doc, score };
    })
    .filter((doc) => doc.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (scored.length) {
    return scored;
  }

  return knowledgeDocuments.slice(0, limit);
};

const buildContextPrompt = (contexts) => {
  if (!Array.isArray(contexts) || !contexts.length) {
    return 'No specific knowledge snippets were matched.';
  }

  return contexts
    .map((context, index) => `(${index + 1}) ${context.title}: ${context.content}`)
    .join('\n\n');
};

// Fetch and format course data for precise recommendations
const getCourseRecommendations = async () => {
  try {
    const courses = await Course.find(
      {},
      'programme programmeSlug courseSlug name slug hero stats aboutProgram learn skills careerOutcomes toolsFrameworks details modules instructors'
    ).lean();

    if (!courses || !courses.length) {
      return 'No course data available.';
    }

    // Group by programme
    const gradusFinlit = courses.filter(c => c.programme === 'Gradus Finlit');
    const gradusX = courses.filter(c => c.programme === 'Gradus X');
    const gradusLead = courses.filter(c => c.programme === 'Gradus Lead');

    const formatCourses = (programCourses) => {
      if (!programCourses.length) return 'No courses available';

      return programCourses.map(c => {
        const parts = [`**${c.name}**`];

        // Add hero/stats info
        if (c.hero?.subtitle) parts.push(c.hero.subtitle);
        if (c.stats?.duration) parts.push(`Duration: ${c.stats.duration}`);
        if (c.stats?.level) parts.push(`Level: ${c.stats.level}`);
        if (c.hero?.priceINR) parts.push(`₹${c.hero.priceINR}`);

        // What students will learn
        if (c.learn && c.learn.length) {
          parts.push(`\n   Learn: ${c.learn.slice(0, 3).join(' | ')}`);
        }

        // Skills taught
        if (c.skills && c.skills.length) {
          parts.push(`Skills: ${c.skills.join(', ')}`);
        }

        // Career outcomes
        if (c.careerOutcomes && c.careerOutcomes.length) {
          parts.push(`Careers: ${c.careerOutcomes.join(', ')}`);
        }

        // Tools/frameworks
        if (c.toolsFrameworks && c.toolsFrameworks.length) {
          parts.push(`Tools: ${c.toolsFrameworks.slice(0, 2).join(' | ')}`);
        }

        // Effort/prerequisites
        if (c.details?.effort) parts.push(`Effort: ${c.details.effort}`);
        if (c.details?.prerequisites) parts.push(`Prerequisites: ${c.details.prerequisites}`);

        // Module count
        if (c.modules && c.modules.length) {
          parts.push(`${c.modules.length} modules`);
        }

        // Slug for navigation
        if (c.slug) parts.push(`(${c.slug})`);

        return '   ' + parts.join(' | ');
      }).join('\n\n');
    };

    return `
**GradusFinlit Courses** (Financial Literacy & Capital Markets):
${formatCourses(gradusFinlit)}

**GradusX Courses** (Full-Stack Tech & AI):
${formatCourses(gradusX)}

**GradusLead Courses** (Business & Leadership):
${formatCourses(gradusLead)}

Use these EXACT course details when recommending. Match user interests to specific courses with their real data.
`;
  } catch (error) {
    console.error('[chatbot] Failed to fetch course data:', error);
    return 'Course data temporarily unavailable - recommend based on general program knowledge.';
  }
};

const buildSystemPrompt = async (contexts) => {
  const knowledgePrompt = buildContextPrompt(contexts);
  const courseData = await getCourseRecommendations();

  return `You are GradusAI, a helpful assistant for Gradus India's website and mobile application.

PERSONALITY & TONE:
You embody a professional yet warm personality that is:
- **Professional, Polished & Precise** - Always accurate, well-structured responses with proper grammar
- **Direct & Encouraging** - Get straight to the point while being supportive and motivating
- **Warm & Chatty** - Friendly, conversational, approachable - like talking to a knowledgeable friend
- **Playful & Imaginative** - Use light humor, creative examples, and engaging language when appropriate
- Strike the perfect balance: informative yet personable, authoritative yet friendly

COMMUNICATION STYLE:
- Use conversational language with proper punctuation and emojis when they enhance clarity 🎯
- Be encouraging: "Great question!", "You're on the right track!", "Let me help you with that!"  
- Show enthusiasm about Gradus programs and opportunities
- Keep responses concise but complete - respect the user's time
- Use analogies and examples to make complex concepts clear
- End with actionable next steps or helpful follow-up questions

⚠️ CRITICAL RULES - NEVER BREAK THESE:
1. **NO ROBOTIC RESPONSES**: Never sound like you're reading from a brochure or website copy
2. **ALWAYS REPHRASE**: Transform knowledge base facts into natural, conversational language
3. **BE HUMAN**: Talk like a friendly, knowledgeable person - NOT like a corporate bot
4. **NO JARGON DUMPS**: Don't list features mechanically - explain benefits conversationally

Guidelines:
- Use the knowledge snippets for FACTS, but express them in YOUR OWN conversational words
- **CRITICAL**: NEVER copy information word-for-word from the knowledge base. ALWAYS rephrase in your own natural, conversational words while keeping the meaning and facts accurate. Think of it as explaining to a friend - same information, fresh wording.
- If someone asks "What is Gradus?", DON'T regurgitate the knowledge base entry. Instead say something like: "Great question! Think of Gradus as your fast-track from student to working professional. We're backed by MDM MADHUBANI TECHNOLOGIES PRIVATE LIMITED and we basically bridge that gap between what you learn in college and what companies actually need. Our secret sauce? Real internships, guaranteed placements, and mentors who've been there."
- If the user asks for something that is not covered, respond honestly that you do not have that information yet and suggest contacting the Gradus team or reading the relevant page.
- When appropriate, mention relevant pages such as About Us, Our Courses, Blogs, or Contact.
- **IMPORTANT**: When users ask "how to" questions or need navigation help, provide specific step-by-step guidance using the navigation information below.
- **COURSE RECOMMENDATIONS**: When users mention their background, interests, or career goals, proactively suggest the best-fit Gradus program(s) using the REAL COURSE DATA below.

REAL COURSE DATA FROM DATABASE:
${courseData}

USE THIS DATA to make precise, accurate recommendations. Match user interests to specific courses with their exact details (skills, careers, placement range, duration).

GRADUS PROGRAMS - RECOMMEND BASED ON USER PROFILE:

1. **GradusFinlit** - Financial Literacy & Capital Markets Mastery
   - **Best for**: Commerce students, finance enthusiasts, economics graduates, aspiring traders, investment analysts
   - **Career paths**: Equity research analyst, portfolio manager, investment banker, financial advisor, derivatives trader
   - **Key skills**: Capital market analysis, portfolio management, derivatives trading, risk management, financial modeling
   - **Recommend when user mentions**: finance, trading, stocks, markets, investment, banking, commerce, economics, CFA
   - **Placement range**: 6-14 LPA
   - **Example pitch**: "Perfect for you! 🎯 With your background in [field], GradusFinlit will transform you into a market-ready finance professional. You'll master equity research, derivatives trading, and portfolio management - skills that top firms actively seek!"

2. **GradusX** - Full-Stack Technology & AI Growth
   - **Best for**: Engineering students, computer science graduates, tech enthusiasts, aspiring developers, data scientists
   - **Career paths**: Full-stack developer, AI/ML engineer, data scientist, software engineer, product analyst, tech lead
   - **Key skills**: Python, JavaScript, React, Node.js, machine learning, AI, data structures, cloud computing, APIs
   - **Recommend when user mentions**: coding, programming, software, tech, engineering, computer science, AI, ML, data, apps
   - **Placement range**: 6-14 LPA
   - **Example pitch**: "You're in the right place! 💻 GradusX is designed for tech minds like yours. You'll build full-stack applications, dive into AI/ML, and work on real projects that mirror what companies like Razorpay and top startups need. Your engineering background gives you a head start!"

3. **GradusLead** - Business & Leadership Excellence
   - **Best for**: MBA aspirants, management students, entrepreneurs, team leads, business graduates, aspiring managers
   - **Career paths**: Management trainee, business analyst, operations manager, strategy consultant, project manager, CXO track
   - **Key skills**: Strategic thinking, leadership, financial planning, operations management, business strategy, people management
   - **Recommend when user mentions**: management, business, MBA, leadership, strategy, consulting, operations, entrepreneurship
   - **Placement range**: 6-14 LPA
   - **Example pitch**: "Excellent choice! 🚀 GradusLead cultivates future leaders. With your interest in [field], you'll develop strategic thinking, leadership skills, and business acumen that prepares you for management roles and the CXO track. Century Finance's network opens doors to top companies!"

**MULTI-PROGRAM RECOMMENDATIONS**:
- **Commerce + Tech interest** → Suggest GradusFinlit (primary) + mention GradusX for fintech roles
- **Engineering + Finance interest** → Suggest GradusX (primary) + mention GradusFinlit for fintech/quant roles  
- **Undecided/Exploring** → Ask discovery questions: "What excites you more: markets & finance, technology & coding, or business & leadership?" Then recommend based on response

**RECOMMENDATION FRAMEWORK**:
When recommending courses:
1. **Acknowledge their background**: "With your [degree/interest] in [field]..."
2. **Match to program**: Clearly state which program(s) fit best
3. **Explain why**: Connect their background to career outcomes
4. **Show enthusiasm**: Use encouraging language and emojis
5. **Mention specifics**: Placement range (6-14 LPA), 178+ hiring partners, Skill India certification
6. **Call to action**: "Ready to explore GradusFinlit? Tap Learning Hub → Browse Programs!"

MOBILE APP NAVIGATION (11 Main Features):
1. **Home/Dashboard** - Main dashboard showing enrolled courses, upcoming live classes, and quick actions
   - To access: Tap Home tab at bottom
2. **Learning Hub** - Browse all available courses and learning materials
   - To access: Tap Learning Hub tab
   - Features: Course catalog, search courses, filter by category
3. **Live Classes** - View and join scheduled live classes with instructors
   - To access: Tap Live Classes tab
   - Features: Live video sessions, interactive classroom, schedule view
4. **Placement** - Placement preparation and job opportunities
   - To access: Tap Placement tab
   - Features: Job listings, interview prep, career guidance
5. **Profile** - User profile and account management
   - To access: Tap Profile tab
   - Sub-sections:
     * My Courses - View enrolled courses
     * Account Details - Edit profile information
     * Change Password - Update password
     * About Us - Learn about Gradus
     * Help & Support - Get assistance
     * Chat Support - AI chatbot (where user might be right now!)
6. **Course Details** - Detailed course information and enrollment
   - To access: Tap any course from Learning Hub or Home
   - Features: Course syllabus, instructor info, enroll button, reviews
7. **Classroom** - Access course content after enrollment
   - To access: Profile → My Courses → Select course
   - Features: Video lectures, assessments, course materials, progress tracking
8. **Live Session** - Join active live class
   - To access: Live Classes → Select class → Join button
   - Features: Live video/audio, screen sharing, interactive controls
9. **Search** - Search across all courses and content
   - Features: Find courses quickly
10. **Notifications** - View notifications and updates
11. **PDF Viewer** - View course materials and documents

WEBSITE NAVIGATION:
- **Home** (/) - Landing page
- **About Us** (/about-us) - Company information
- **Our Courses** (/courses) - Browse all courses
  * GradusFinlit - Financial literacy and capital markets mastery program (6-14 LPA packages)
  * GradusX - Full-stack technology and AI program
  * GradusLead - Business and leadership excellence
- **Live Classes** (/live-classes) - Book and join classes
- **Blog** (/blog) - Articles and insights
- **Contact** (/contact) - Get in touch
- **User Dashboard** (/dashboard) - After login
- **My Courses** (/my-courses) - Enrolled courses
- **Cart** (/cart) - Shopping cart
- **Checkout** (/checkout) - Complete enrollment

HOW TO GUIDE USERS (Common Questions):
- "How to enroll?" → Mobile: Go to Learning Hub → Select course → Tap Enroll. Website: Browse Courses → Select → Click Enroll
- "Where are my courses?" → Mobile: Profile tab → My Courses. Website: My Courses page
- "How to join live class?" → Mobile: Live Classes tab → Find class → Tap Join. Website: Live Classes page
- "How to change password?" → Mobile: Profile → Change Password. Website: Profile settings
- "How to contact support?" → Mobile: Profile → Help & Support OR Chat Support (current chat!). Website: Contact page
- "Where is placement section?" → Mobile: Tap Placement tab (bottom navigation)

ABOUT GRADUS:
- Career acceleration initiative by MDM MADHUBANI TECHNOLOGIES PRIVATE LIMITED
- 3 signature programs: GradusFinlit (financial literacy & capital markets), GradusX (tech/AI), GradusLead (business leadership)
- All programs: Skill India & NSDC approved
- Guaranteed placement: 6-14 LPA packages
- 178+ strategic hiring partners
- Dedicated placement cell with mentorship and interview prep

RESPONSE EXAMPLES:
❌ Boring: "To enroll, go to Learning Hub and select a course."
✅ Engaging: "Great choice! 🎉 Here's how to get started: Head to the Learning Hub tab → Browse through our programs → Tap the course that excites you → Hit that Enroll button! You're just a few taps away from transforming your career. Need help choosing? I'm here!"

Knowledge Base Snippets:
${knowledgePrompt}`;
};

const sanitizeHistory = (history) => {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter((item) => item && typeof item.role === 'string' && typeof item.content === 'string')
    .map((item) => ({
      role: item.role === 'assistant' ? 'assistant' : 'user',
      content: item.content.trim(),
    }))
    .filter((item) => item.content)
    .slice(-8);
};

const buildFallbackReply = (query, contexts) => {
  if (!contexts || !contexts.length) {
    return "I'm here to help with Gradus-related questions, but I need a bit more detail to share something useful.";
  }

  const summary = contexts
    .map((context) => `- ${context.content}`)
    .join('\n');

  return `Here are some Gradus highlights that may help:
${summary}

For further detail, explore the relevant section on our website or reach out through the contact page.`;
};

const callOpenAI = async (messages) => {
  if (typeof fetchImpl !== 'function') {
    throw new Error('No fetch implementation available. Install node-fetch or upgrade Node.js to expose a global fetch API.');
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

  if (!apiKey) {
    console.warn('[chatbot] Warning: OPENAI_API_KEY is not configured. Falling back to knowledge snippets.');
    return {
      reply: null,
      usage: null,
      model,
    };
  }

  const requestBody = {
    model,
    messages,
    temperature: 0.2,

  };

  const response = await fetchImpl(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const choice = data?.choices?.[0]?.message?.content;

  return {
    reply: choice || null,
    usage: data?.usage || null,
    model,
  };
};

const isBlogIntent = (text) => {
  if (!text) {
    return false;
  }

  const lower = text.toLowerCase();
  return BLOG_KEYWORDS.some((keyword) => lower.includes(keyword));
};

const buildBlogContexts = async (query, limit = 3) => {
  const queryTokens = tokenize(query)
    .filter((token) => token && token.length > 2);

  const fetchLimit = Math.max(limit * 3, 12);

  try {
    const blogs = await Blog.find({}, 'title slug category excerpt content publishedAt tags metadata')
      .sort({ publishedAt: -1 })
      .limit(fetchLimit)
      .lean();

    const scored = blogs
      .map((blog, index) => {
        const summarySource = blog.excerpt || stripHtml(blog.content || '');
        const summary = truncate(summarySource, 360);

        if (!summary) {
          return null;
        }

        const permalink = blog.slug ? `${BLOG_PUBLIC_BASE}/blogs/${blog.slug}` : undefined;

        const tagSet = new Set(['blog']);
        if (blog.category) {
          tagSet.add(blog.category.toLowerCase());
        }
        if (Array.isArray(blog.tags)) {
          blog.tags.forEach((tag) => {
            if (typeof tag === 'string' && tag.trim()) {
              tagSet.add(tag.trim().toLowerCase());
            }
          });
        }

        const summaryTokens = new Set(tokenize(summary));
        Array.from(tagSet).forEach((tag) => tokenize(tag).forEach((token) => summaryTokens.add(token)));

        let score = 0;
        if (queryTokens.length) {
          queryTokens.forEach((token) => {
            if (summaryTokens.has(token)) {
              score += 6;
            } else {
              const partialMatch = Array.from(summaryTokens).some((candidate) => candidate.includes(token) || token.includes(candidate));
              if (partialMatch) {
                score += 2;
              }
            }
          });
        }

        const recencyBoost = fetchLimit - index;
        const totalScore = score + recencyBoost * 0.1;

        return {
          context: {
            id: `blog-${blog.slug || blog._id}`,
            title: `Blog insight: ${blog.title}`,
            content: `${formatPublished(blog.publishedAt)}${blog.category ? ` · ${blog.category}` : ''} — ${summary}${permalink ? ` (Read more: ${permalink})` : ''}`,
            source: permalink,
            tags: Array.from(tagSet),
          },
          score: totalScore,
          recency: recencyBoost,
        };
      })
      .filter(Boolean);

    if (!scored.length) {
      return [];
    }

    const ranked = scored.sort((a, b) => {
      if (b.score === a.score) {
        return b.recency - a.recency;
      }
      return b.score - a.score;
    });

    const relevant = queryTokens.length ? ranked.filter((entry) => entry.score > 0.2) : ranked;
    const selected = (relevant.length ? relevant : ranked).slice(0, limit);

    return selected.map((entry) => entry.context);
  } catch (error) {
    console.error('[chatbot] Failed to load blog contexts:', error);
    return [];
  }
};

const mergeContexts = (baseContexts, extraContexts, limit = 6) => {
  if (!Array.isArray(extraContexts) || !extraContexts.length) {
    return baseContexts;
  }

  const merged = [...baseContexts];
  extraContexts.forEach((context) => {
    if (!merged.find((existing) => existing.id === context.id)) {
      merged.push(context);
    }
  });

  return merged.slice(0, limit);
};


const levenshteinDistance = (a = '', b = '') => {
  if (!a && !b) {
    return 0;
  }
  if (!a) {
    return b.length;
  }
  if (!b) {
    return a.length;
  }

  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1));

  for (let i = 0; i <= a.length; i += 1) {
    matrix[i][0] = i;
  }

  for (let j = 0; j <= b.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
};

const NEAR_PAGE_TOKENS = ['page', 'pages', 'screen', 'section', 'tab', 'view', 'panel', 'one'];

const PAGE_INTENT_PATTERNS = [
  /(this|current)\s+(page|screen|section)/i,
  /(tell|share|talk).{0,12}about\s+(this|the current)\s+(page|screen|section)/i,
  /(what does|what is|describe).{0,12}(this|the current)\s+(page|section)/i,
  /about\s+this\s+(page|section)/i,
];

const normalizeForMatch = (value) => {
  if (!value || typeof value !== 'string') {
    return '';
  }

  return value.toLowerCase().replace(/[^a-z0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim();
};

const isPageContextIntent = (message, page, pageContextSnippet) => {
  if (!message) {
    return false;
  }

  const normalizedMessage = normalizeForMatch(message);
  if (!normalizedMessage) {
    return false;
  }

  if (PAGE_INTENT_PATTERNS.some((pattern) => pattern.test(message))) {
    return true;
  }

  const shortMessage = normalizedMessage.length <= 80;
  const tokens = normalizedMessage.split(' ').filter(Boolean);
  const tokenSet = new Set(tokens);

  if (shortMessage) {
    if (normalizedMessage.includes('about this')) {
      return true;
    }
    if (normalizedMessage.includes('this one')) {
      return true;
    }
    if (normalizedMessage.startsWith('now this')) {
      return true;
    }
    if (normalizedMessage.startsWith('now about this')) {
      return true;
    }
    if (normalizedMessage.includes('now this one')) {
      return true;
    }
    if (
      normalizedMessage === 'this one' ||
      normalizedMessage === 'this one please' ||
      normalizedMessage === 'this one now' ||
      normalizedMessage === 'now this one' ||
      normalizedMessage === 'now this one please'
    ) {
      return true;
    }
  }

  if (shortMessage && tokenSet.has('now') && tokenSet.has('this')) {
    return true;
  }

  const refersToCurrentView = tokenSet.has('this') || tokenSet.has('current') || tokenSet.has('here');

  if (refersToCurrentView) {
    const nearToken = tokens.some((token) => {
      if (NEAR_PAGE_TOKENS.includes(token)) {
        return true;
      }

      return NEAR_PAGE_TOKENS.some((candidate) => levenshteinDistance(token, candidate) <= 1);
    });

    if (nearToken) {
      return true;
    }

    if (shortMessage && tokens.length <= 5 && pageContextSnippet) {
      const allowedTokens = new Set([
        'tell',
        'me',
        'about',
        'now',
        'this',
        'current',
        'here',
        'please',
        'pls',
        'kindly',
        'info',
        'information',
        'on',
        'the',
        'one',
        'ones',
        'page',
        'pages',
        'section',
        'screen',
        'view',
        'tab',
      ]);

      const unknownTokens = tokens.filter((token) => !allowedTokens.has(token));

      if (
        !unknownTokens.length ||
        unknownTokens.every((token) =>
          NEAR_PAGE_TOKENS.some((candidate) => levenshteinDistance(token, candidate) <= 2)
        )
      ) {
        return true;
      }
    }
  }

  const candidates = [];

  if (page && typeof page === 'object') {
    if (typeof page.title === 'string') {
      candidates.push(page.title);
    }
    if (typeof page.headings === 'string') {
      candidates.push(page.headings);
    }
    if (typeof page.path === 'string') {
      candidates.push(page.path);
    }
    if (typeof page.url === 'string') {
      candidates.push(page.url);
    }
  }

  if (pageContextSnippet && typeof pageContextSnippet.title === 'string') {
    candidates.push(pageContextSnippet.title);
  }

  return candidates.some((candidate) => {
    const normalizedCandidate = normalizeForMatch(candidate);
    if (!normalizedCandidate || normalizedCandidate.length < 4) {
      return false;
    }
    if (normalizedMessage.includes(normalizedCandidate)) {
      return true;
    }
    return normalizedCandidate
      .split(' ')
      .filter((token) => token.length > 4)
      .some((token) => normalizedMessage.includes(token));
  });
};

const buildPageContextSnippet = (page) => {
  if (!page || typeof page !== 'object') {
    return null;
  }

  const rawTitle = typeof page.title === 'string' ? page.title.trim() : '';
  const rawHeadings = typeof page.headings === 'string' ? normalizeWhitespace(page.headings) : '';
  const rawContent = typeof page.content === 'string' ? page.content : '';
  const rawPath = typeof page.path === 'string' ? page.path.trim() : '';
  const rawUrl = typeof page.url === 'string' ? page.url.trim() : '';

  const segments = [];

  if (rawTitle) {
    segments.push(`Page title: ${rawTitle}`);
  }

  if (rawHeadings) {
    segments.push(`Key sections: ${rawHeadings.replace(/\s*\|\s*/g, ', ')}`);
  }

  if (rawContent) {
    segments.push(`Page details: ${normalizeWhitespace(rawContent)}`);
  }

  const combined = normalizeWhitespace(segments.join(' '));

  if (!combined) {
    return null;
  }

  const idSource = rawPath || rawTitle || 'current-page';
  const id = `page-${idSource.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'current'}`;

  const tags = new Set();
  if (rawTitle) {
    rawTitle
      .split(/\s+/)
      .map((word) => word.toLowerCase().replace(/[^a-z0-9]/g, ''))
      .filter((word) => word.length > 2)
      .forEach((word) => tags.add(word));
  }
  if (rawPath) {
    tags.add(rawPath.replace(/[^a-z0-9]/gi, '').toLowerCase());
  }

  return {
    id,
    title: rawTitle ? `Current page: ${rawTitle}` : 'Current page overview',
    content: truncate(combined, 2400),
    source: rawUrl || undefined,
    tags: Array.from(tags),
  };
};

const buildPageSummaryReply = (page) => {
  if (!page || typeof page !== 'object') {
    return null;
  }

  const pieces = [];
  const title = typeof page.title === 'string' ? page.title.trim() : '';
  if (title) {
    pieces.push(`You're currently viewing the "${title}" page.`);
  }

  const headings = typeof page.headings === 'string' ? normalizeWhitespace(page.headings) : '';
  if (headings) {
    pieces.push(`Key sections include: ${headings.replace(/\s*\|\s*/g, ', ')}.`);
  }

  const content = typeof page.content === 'string' ? normalizeWhitespace(page.content) : '';
  if (content) {
    const sentences = content.match(/[^.!?]+[.!?]?/g) || [];
    const summarySentences = sentences.slice(0, 5).join(' ').trim();
    if (summarySentences) {
      pieces.push(summarySentences);
    }
  }

  if (!pieces.length) {
    return null;
  }

  const summaryBody = pieces.join('\n\n');
  return `Here is what this page covers:\n\n${summaryBody}`;
};

const handleChatMessage = async ({ message, history, page }) => {
  const trimmedMessage = typeof message === 'string' ? message.trim() : '';

  if (!trimmedMessage) {
    throw new Error('Message is required.');
  }

  const smallTalkReply = getSmallTalkReply(trimmedMessage);
  if (smallTalkReply) {
    return {
      reply: smallTalkReply,
      contexts: [],
      provider: 'smalltalk',
    };
  }

  const pageContextSnippet = buildPageContextSnippet(page);
  const baseContexts = getTopContexts(trimmedMessage);
  let contexts = [...baseContexts];

  if (isBlogIntent(trimmedMessage)) {
    const blogContexts = await buildBlogContexts(trimmedMessage, 5);
    contexts = mergeContexts(baseContexts, blogContexts, 7);
  }

  const wantsPageSummary = isPageContextIntent(trimmedMessage, page, pageContextSnippet);

  if (pageContextSnippet) {
    if (wantsPageSummary) {
      const filtered = contexts.filter((context) => context.id !== pageContextSnippet.id);
      contexts = [pageContextSnippet, ...filtered].slice(0, 7);
    } else {
      contexts = mergeContexts(contexts, [pageContextSnippet], 8);
    }
  }

  const systemPrompt = await buildSystemPrompt(contexts);
  const sanitizedHistory = sanitizeHistory(history);
  const messages = [{ role: 'system', content: systemPrompt }];

  if (pageContextSnippet) {
    const descriptorParts = [];
    if (pageContextSnippet.title) {
      descriptorParts.push(pageContextSnippet.title);
    }
    if (page && typeof page.path === 'string' && page.path) {
      descriptorParts.push(`path: ${page.path}`);
    }
    if (page && typeof page.url === 'string' && page.url && !descriptorParts.includes(page.url)) {
      descriptorParts.push(page.url);
    }

    const descriptor = descriptorParts.join(' ') || 'the current page';
    const guidance = wantsPageSummary
      ? `The user is viewing ${descriptor}. They are asking about this page right now. Use the snippet labelled \"Current page\" (id: ${pageContextSnippet.id}) to craft a fresh, human summary.`
      : `The user is viewing ${descriptor}. If they mention \"this page\", \"current page\", \"this one\", \"now this\", or similar phrasing, rely on the snippet labelled \"Current page\" (id: ${pageContextSnippet.id}) to respond, paraphrasing it naturally.`;

    messages.push({ role: 'system', content: guidance });
  }

  messages.push(
    ...sanitizedHistory,
    {
      role: 'system',
      content:
        '🚨 FINAL REMINDER: You are NOT a corporate brochure bot. You are GradusAI - a warm, friendly human expert. Talk naturally like you\'re chatting with a friend over coffee. NEVER copy knowledge base text word-for-word. ALWAYS rephrase facts into conversational language. Be enthusiastic, use examples, keep it real!',
    },
    { role: 'user', content: trimmedMessage },
  );

  const fallbackPageSummary = wantsPageSummary ? buildPageSummaryReply(page) : null;

  try {
    const { reply, usage, model } = await callOpenAI(messages);

    if (!reply) {
      return {
        reply: fallbackPageSummary || buildFallbackReply(trimmedMessage, contexts),
        contexts,
        provider: fallbackPageSummary ? 'fallback-page' : 'fallback',
        model,
        usage,
      };
    }

    return {
      reply,
      contexts,
      model,
      usage,
      provider: 'openai',
    };
  } catch (error) {
    console.error('[chatbot] Failed to generate response:', error);
    return {
      reply: fallbackPageSummary || buildFallbackReply(trimmedMessage, contexts),
      contexts,
      provider: fallbackPageSummary ? 'fallback-error-page' : 'fallback-error',
      error: error.message,
    };
  }
};

module.exports = {
  handleChatMessage,
};









