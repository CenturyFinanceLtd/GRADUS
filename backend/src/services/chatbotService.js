const knowledgeBase = require('../data/chatbotKnowledge');
const Blog = require('../models/Blog');
const BLOG_PUBLIC_BASE = (process.env.GRADUS_WEB_BASE_URL || 'https://gradusindia.in').replace(/\/\/+$/, '');


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

const buildSystemPrompt = (contexts) => {
  const knowledgePrompt = buildContextPrompt(contexts);

  return `You are GradusAI, a helpful assistant for the Gradus India website. Use the provided knowledge base snippets to answer questions about Gradus, Century Finance Limited, programs, mentors, placements, admissions, and recent blog highlights.

Guidelines:
- Base your answer only on the knowledge snippets when they contain the information.
- If the user asks for something that is not covered, respond honestly that you do not have that information yet and suggest contacting the Gradus team or reading the relevant page.
- Keep responses concise, friendly, and informative.
- When appropriate, mention relevant pages such as About Us, Our Courses, Blogs, or Contact.

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
  if (typeof fetch !== 'function') {
    throw new Error('Global fetch API is not available in this environment. Upgrade Node.js or polyfill fetch.');
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

  if (!apiKey) {
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
    max_tokens: 700,
  };

  const response = await fetch(`${baseUrl}/chat/completions`, {
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

const handleChatMessage = async ({ message, history }) => {
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

  const baseContexts = getTopContexts(trimmedMessage);
  let contexts = [...baseContexts];

  if (isBlogIntent(trimmedMessage)) {
    const blogContexts = await buildBlogContexts(trimmedMessage, 5);
    contexts = mergeContexts(baseContexts, blogContexts, 7);
  }

  const systemPrompt = buildSystemPrompt(contexts);
  const sanitizedHistory = sanitizeHistory(history);  const messages = [
    { role: 'system', content: systemPrompt },
    ...sanitizedHistory,
    {
      role: 'system',
      content:
        'Always speak as GradusAI in a warm, human tone. Rephrase every fact you cite from the knowledge snippets so it sounds freshly worded while staying accurate.',
    },
    { role: 'user', content: trimmedMessage },
  ];

  try {
    const { reply, usage, model } = await callOpenAI(messages);

    if (!reply) {
      return {
        reply: buildFallbackReply(trimmedMessage, contexts),
        contexts,
        provider: 'fallback',
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
      reply: buildFallbackReply(trimmedMessage, contexts),
      contexts,
      provider: 'fallback-error',
      error: error.message,
    };
  }
};

module.exports = {
  handleChatMessage,
};








