-- 1. Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.landing_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT,
    hero JSONB,
    middle_section JSONB,
    mentor JSONB,
    certificate JSONB,
    faq JSONB,
    sticky_footer JSONB,
    meta_title TEXT,
    meta_description TEXT,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Insert the data for 'akhil'
INSERT INTO public.landing_pages (
    slug,
    title,
    hero,
    middle_section,
    mentor,
    certificate,
    faq,
    sticky_footer,
    is_published,
    created_at,
    updated_at
)
VALUES (
    'akhil',
    'Masterclass on Modern Technology',
    '{
    "titlePrefix": "Masterclass on",
    "highlight": "Modern Technology",
    "mentorName": "Akhil",
    "subtitle": "India’s most practical coding & tech career program for students & working professionals",
    "date": "18 December 2025",
    "time": "6:00 PM",
    "language": "Hindi / English",
    "duration": "2+ Hours",
    "socialProofCount": "12K+",
    "ratingText": "5k+ reviews (4.9 of 5)",
    "image": "/assets/masterclass-akhil.jpg",
    "bottomInfo": "Learn from Akhil''s expertise in software development, having mentored over 5,000+ students and built scalable Tech Products."
  }'::jsonb,
    '{
    "programName": "Gradus TECH",
    "targetAudience": [
      {
        "icon": "💻",
        "text": "College students aiming for top tier product companies"
      },
      {
        "icon": "🚀",
        "text": "Freshers looking to switch from service to product based"
      },
      {
        "icon": "💼",
        "text": "Working professionals wanting to upskill in AI & Full Stack"
      },
      {
        "icon": "🧠",
        "text": "Anyone confused about which tech stack to choose"
      }
    ],
    "learningCards": [
      {
        "number": "1",
        "text": "Full Stack Development Roadmap"
      },
      {
        "number": "2",
        "text": "System Design Basics"
      },
      {
        "number": "3",
        "text": "Mastering DSA (Data Structures)"
      },
      {
        "number": "4",
        "text": "AI Tools for Developers"
      }
    ],
    "centeredCard": "Acquire crucial skills in Building Scalable Web Applications to future-proof your career."
  }'::jsonb,
    '{
    "name": "Akhil",
    "image": "/assets/mentor-image-transparent.png",
    "points": [
      "With over 10+ years in the Tech Industry, Akhil has architected complex systems for top global companies.",
      "Akhil''s expertise spans primarily Frontend, Backend, Cloud Architecture, and AI integration.",
      "Akhil has mentored 5000+ students, helping them crack interviews at FAANG and top startups.",
      "Akhil blends theoretical CS fundamentals with practical project building, delivering industry-relevant skills.",
      "Akhil''s masterclasses focus on writing clean, scalable code that solves real-world problems."
    ]
  }'::jsonb,
    '{
    "headline": "Yes! You will be certified for this Masterclass.",
    "image": "/assets/certificate-preview.png"
  }'::jsonb,
    '[
    {
      "question": "Is it a live coding workshop?",
      "answer": "Yes! It is a live session where we will discuss concepts and write code together."
    },
    {
      "question": "Is this class for beginners?",
      "answer": "Yes! This masterclass is designed to help beginners understand the fundamentals of software development."
    },
    {
      "question": "Will recording be provided?",
      "answer": "Yes, a recording of the session will be provided to all registered participants."
    },
    {
      "question": "Do I need to know programming beforehand?",
      "answer": "Basic familiarity is helpful, but we will start with foundational concepts."
    },
    {
      "question": "Will there be a QnA session?",
      "answer": "Absolutely! There will be a dedicated Q&A session at the end."
    }
  ]'::jsonb,
    '{
    "priceOriginal": "1999",
    "priceCurrent": "FREE"
  }'::jsonb,
    true,
    '2025-12-17 10:45:56.255+00',
    '2025-12-17 10:45:56.255+00'
)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    hero = EXCLUDED.hero,
    middle_section = EXCLUDED.middle_section,
    mentor = EXCLUDED.mentor,
    certificate = EXCLUDED.certificate,
    faq = EXCLUDED.faq,
    sticky_footer = EXCLUDED.sticky_footer,
    is_published = EXCLUDED.is_published,
    updated_at = EXCLUDED.updated_at;

-- 3. Insert the data for 'vaibhav'
INSERT INTO public.landing_pages (
    slug,
    title,
    hero,
    middle_section,
    mentor,
    certificate,
    faq,
    sticky_footer,
    is_published,
    created_at,
    updated_at
)
VALUES (
    'vaibhav',
    'Masterclass on Intraday Trading',
    '{
    "titlePrefix": "Masterclass on",
    "highlight": "Intraday Trading",
    "mentorName": "Vaibhav Batra",
    "subtitle": "India’s most practical financial literacy program for students & working professionals",
    "date": "16 December 2025",
    "time": "11:55 AM",
    "language": "Hindi",
    "duration": "2+ Hours",
    "socialProofCount": "48K+",
    "ratingText": "14k+ reviews (4.9 of 5)",
    "image": "/assets/masterclass-vaibhav.jpg",
    "bottomInfo": "Learn from Vaibhav Batra''s expertise in trading, having taught over 10,000+ students and accumulated 13+ years of experience."
  }'::jsonb,
    '{
    "programName": "Gradus FINLIT",
    "targetAudience": [
      {
        "icon": "✨",
        "text": "College students who want money clarity early"
      },
      {
        "icon": "✨",
        "text": "Freshers earning their first salary"
      },
      {
        "icon": "✨",
        "text": "Working professionals stuck in salary‑to‑salary cycle"
      },
      {
        "icon": "✨",
        "text": "Anyone scared of investing or confused about finance"
      }
    ],
    "learningCards": [
      {
        "number": "1",
        "text": "Financial Foundations"
      },
      {
        "number": "2",
        "text": "Personal Finance"
      },
      {
        "number": "3",
        "text": "Investing Basics (Beginner-Friendly)"
      },
      {
        "number": "4",
        "text": "Money Mindset"
      }
    ],
    "centeredCard": ""
  }'::jsonb,
    '{
    "name": "Jagpreet Singh Narula",
    "image": "/assets/mentor-image-transparent.png",
    "points": [
      "With an MBA in Finance and 18 years in the Automobile Industry, Jagpreet Singh Narula blends sector-specific insight with trading expertise.",
      "Jagpreet''s 13+ years of successful trading span Intraday, Swing, Price Action, and Index Options.",
      "Jagpreet mentored 10000+ students, empowering traders, while his free masterclasses reached 100,000 eager learners.",
      "Jagpreet blends professional acumen with trading expertise, delivering comprehensive strategies for success.",
      "Jagpreet''s free masterclasses foster learning and collaboration among traders of all levels."
    ]
  }'::jsonb,
    '{
    "headline": "Yes! You will be certified for this Masterclass.",
    "image": "/assets/certificate-preview.png"
  }'::jsonb,
    '[
    {
      "question": "Is it a live or pre-recorded workshop?",
      "answer": "It is a live workshop."
    },
    {
      "question": "Is this class for beginners?",
      "answer": "Yes! This masterclass is designed to help beginners understand the fundamentals of Intraday trading."
    },
    {
      "question": "Will recording be provided?",
      "answer": "Yes, a recording of the session will be provided to all registered participants."
    },
    {
      "question": "How much capital is required?",
      "answer": "You can start with a small capital."
    },
    {
      "question": "Will there be a QnA session in the class?",
      "answer": "Absolutely! There will be a dedicated Q&A session at the end."
    }
  ]'::jsonb,
    '{
    "priceOriginal": "999",
    "priceCurrent": "FREE"
  }'::jsonb,
    true,
    '2025-12-17 10:45:56.741Z',
    '2025-12-17 10:45:56.741Z'
)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    hero = EXCLUDED.hero,
    middle_section = EXCLUDED.middle_section,
    mentor = EXCLUDED.mentor,
    certificate = EXCLUDED.certificate,
    faq = EXCLUDED.faq,
    sticky_footer = EXCLUDED.sticky_footer,
    is_published = EXCLUDED.is_published,
    updated_at = EXCLUDED.updated_at;
