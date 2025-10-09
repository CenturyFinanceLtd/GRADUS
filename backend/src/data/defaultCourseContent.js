const placementPartners = require("../../../shared/placementPartners.json");

const trimValue = (value) => (typeof value === "string" ? value.trim() : "");

const sanitizePartnerKey = (value) => {
  if (!value) {
    return "";
  }

  return value
    .toString()
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/&/g, " and ")
    .replace(/@/g, "")
    .replace(/[^a-z0-9]+/g, "");
};

const buildCandidateKeys = (value) => {
  if (!value) {
    return [];
  }

  const entries = Array.isArray(value) ? value : [value];

  return entries
    .filter(Boolean)
    .flatMap((entry) => {
      const candidate = entry.toString();
      const sanitizedFull = sanitizePartnerKey(candidate);
      const keys = sanitizedFull ? [sanitizedFull] : [];

      candidate
        .split(/[/|,&]/)
        .map((segment) => sanitizePartnerKey(segment))
        .filter(Boolean)
        .forEach((key) => {
          if (!keys.includes(key)) {
            keys.push(key);
          }
        });

      return keys;
    });
};

const extractHostname = (value) => {
  if (!value) {
    return "";
  }

  try {
    const candidate = /^https?:/i.test(value) ? value : `https://${value}`;
    return new URL(candidate).hostname.replace(/^www\./i, "");
  } catch {
    return value.toString().replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  }
};

const normalizePrograms = (programs) => {
  if (Array.isArray(programs) && programs.length) {
    return programs;
  }

  return ["GradusQuity"];
};

const normalizedPartners = placementPartners.map((partner) => {
  const programs = normalizePrograms(partner?.programs);
  const name = trimValue(partner?.name);
  const logo = trimValue(partner?.logo);
  const website = trimValue(partner?.website);
  const keys = new Set([
    ...buildCandidateKeys(name),
    ...buildCandidateKeys(Array.isArray(partner?.aliases) ? partner.aliases : []),
  ]);

  if (website) {
    const hostname = extractHostname(website);
    buildCandidateKeys(hostname).forEach((key) => keys.add(key));
  }

  return {
    name,
    logo,
    website,
    programs,
    keys: Array.from(keys).filter(Boolean),
  };
});

const partnerLookup = new Map();

normalizedPartners.forEach((partner) => {
  partner.keys.forEach((key) => {
    if (!partnerLookup.has(key)) {
      partnerLookup.set(key, []);
    }

    partnerLookup.get(key).push(partner);
  });
});

const resolvePartnerField = (partner, field) => {
  const value = trimValue(partner?.[field]);

  if (value) {
    return value;
  }

  for (const key of partner.keys) {
    const candidates = partnerLookup.get(key);
    if (!candidates) {
      continue;
    }

    const fallback = candidates.find((entry) => trimValue(entry?.[field]));
    if (fallback) {
      return trimValue(fallback[field]);
    }
  }

  return "";
};

const selectPartnersByProgram = (program) => {
  const normalizedProgram = typeof program === "string" ? program.trim() : "";

  return normalizedPartners
    .filter((partner) => {
      if (!normalizedProgram) {
        return true;
      }

      return partner.programs.includes(normalizedProgram);
    })
    .map((partner) => {
      const resolvedName = trimValue(partner.name) || resolvePartnerField(partner, "name");

      return {
        name: resolvedName,
        logo: resolvePartnerField(partner, "logo"),
        website: resolvePartnerField(partner, "website"),
      };
    });
};

const gradusQuityPartners = selectPartnersByProgram("GradusQuity");
const gradusXPartners = selectPartnersByProgram("GradusX");
const gradusLeadPartners = selectPartnersByProgram("GradusLead");

const courseSeriesHeroContent = {
  tagIcon: "ph-bold ph-graduation-cap",
  tagText: "Gradus Series Overview",
  title: "Build Your Future with Gradus Course Series",
  description:
    "Each flagship program is crafted by Gradus India to combine industry credibility, immersive project work, and assured career outcomes through our guaranteed placement MoUs.",
};

const gradusQuityData = {
  id: "gradusquity",
  slug: "gradusquity",
  name: "GradusQuity",
  subtitle: "By Gradus India (a 100% Subsidiary of Century Finance Limited)",
  focus:
    "Capital markets mastery designed for future-ready equity, debt, and derivative professionals.",
  approvals: [
    "GradusQuity is approved by Skill India & NSDC.",
    "MoU with each student for Guaranteed Placement.",
  ],
  placementRange:
    "Guaranteed placement on package of 6 lac/Annum to 14 lac/Annum with our partnered companies.",
  partners: gradusQuityPartners,
  weeks: [
    {
      title: "Week 1 - Introduction to Financial Markets",
      points: [
        "What is a stock market? Why does it exist?",
        "Types of markets: Equity, Debt, Forex, Commodities",
        "Role of stock exchanges and regulators (NSE, BSE, SEBI, SEC, etc.)",
        "Key players: FIIs, DIIs, brokers, retail investors",
      ],
    },
    {
      title: "Week 2 - Stock Market Basics",
      points: [
        "Demat and trading accounts",
        "IPOs, ETFs, mutual funds basics",
        "Market indices (Sensex, Nifty, S&P 500, Dow Jones)",
        "Order types: Market, Limit, Stop-loss",
        "Basics of portfolio building",
      ],
    },
    {
      title: "Week 3 - Fundamental Analysis (Part 1)",
      points: [
        "Introduction to company financials",
        "Balance sheet, profit and loss, cash flow",
        "Understanding EPS, book value, dividend, etc.",
        "Identifying value versus growth stocks",
      ],
    },
    {
      title: "Week 4 - Fundamental Analysis (Part 2)",
      points: [
        "Key financial ratios (P/E, P/B, ROE, ROCE, Debt/Equity)",
        "Valuation methods: DCF, relative valuation, dividend models",
        "Industry and sector analysis",
        "Case study: Comparing two companies",
      ],
    },
    {
      title: "Week 5 - Technical Analysis (Part 1)",
      points: [
        "Introduction to price charts and candlesticks",
        "Support and resistance, trend lines, channels",
        "Volume analysis",
        "Basics of momentum versus reversal strategies",
      ],
    },
    {
      title: "Week 6 - Technical Analysis (Part 2)",
      points: [
        "Moving averages (SMA, EMA), RSI, MACD, Bollinger Bands",
        "Fibonacci retracement",
        "Popular chart patterns (Head and Shoulders, Cup and Handle, Double Top/Bottom)",
        "Case study: Analyzing Nifty and Bank Nifty charts",
      ],
    },
    {
      title: "Week 7 - Derivatives (Futures and Options Basics)",
      points: [
        "What are derivatives?",
        "Futures contracts: long and short positions",
        "Options contracts: call and put",
        "Premium, strike price, expiry",
        "Hedging versus speculation",
      ],
    },
    {
      title: "Week 8 - Options Trading Strategies",
      points: [
        "Option Greeks (Delta, Gamma, Theta, Vega) simplified",
        "Bull and bear spreads, straddle, strangle",
        "Iron condor and butterfly spreads",
        "Risk-reward analysis of strategies",
        "Case study: Nifty options trade",
      ],
    },
    {
      title: "Week 9 - Risk Management and Psychology",
      points: [
        "Position sizing and money management",
        "Risk/reward ratio and portfolio diversification",
        "Behavioral biases: greed, fear, overconfidence",
        "Trading journal and discipline",
        "Famous market crashes (2008, 2020 COVID)",
      ],
    },
    {
      title: "Week 10 - Advanced and Global Trends",
      points: [
        "Algorithmic trading and basics of quantitative investing",
        "AI and ML in stock prediction",
        "ESG and sustainable investing",
        "Cryptocurrencies and blockchain in markets",
        "How global events affect markets",
      ],
    },
    {
      title: "Week 11 - Practical Application",
      points: [
        "Live trading simulations using demo platforms",
        "Portfolio creation exercise",
        "Backtesting a trading strategy",
        "Stock picking contest among students",
      ],
    },
    {
      title: "Week 12 - Capstone and Career Pathways",
      points: [
        "Final project: Build a stock portfolio or trading strategy",
        "Presentation and peer review",
        "Career opportunities across finance roles",
        "Certification exam and award ceremony",
      ],
    },
  ],
  deliverables: [
    "Hands-on practice with trading platforms",
    "Case studies of real companies",
    "Weekly assignments and trading journal",
    "Final capstone project: stock portfolio or trading system",
  ],
};

const gradusXData = {
  id: "gradusx",
  slug: "gradusx",
  name: "GradusX",
  subtitle: "By Gradus India (a 100% Subsidiary of Century Finance Limited)",
  focus:
    "Full-stack technology, AI, and digital growth curriculum that unites software engineering with data storytelling.",
  approvals: [
    "GradusX is approved by Skill India & NSDC.",
    "MoU with each student for Guaranteed Placement.",
  ],
  placementRange:
    "Guaranteed placement on package of 6 lac/Annum to 14 lac/Annum with our partnered companies.",
  partners: gradusXPartners,
  weeks: [
    {
      title: "Week 1 - Computer Science Fundamentals",
      points: [
        "Computer systems overview: hardware, operating systems, networks",
        "Programming paradigms and Python basics",
        "Assignments on Python scripts including calculator and converters",
        "Mini project: Student Info Manager CLI tool",
      ],
    },
    {
      title: "Week 2 - Data Structures and Algorithms",
      points: [
        "Arrays, lists, stacks, and queues",
        "Sorting techniques including bubble sort and quicksort",
        "Time complexity fundamentals",
        "Assignments on stack and queue implementations plus complexity analysis",
        "Mini project: Library System with core data structures",
      ],
    },
    {
      title: "Week 3 - Databases and Data Handling",
      points: [
        "SQL fundamentals: SELECT, INSERT, UPDATE, DELETE",
        "NoSQL basics with MongoDB",
        "Python data libraries including NumPy and Pandas",
        "Assignments on SQL queries and Pandas data manipulation",
        "Mini project: Student Results Database",
      ],
    },
    {
      title: "Week 4 - Introduction to AI and Machine Learning",
      points: [
        "AI applications and machine learning types",
        "ML workflow from data to evaluation",
        "Assignments on data cleaning and linear regression",
        "Mini project: House price prediction",
      ],
    },
    {
      title: "Week 5 - Machine Learning in Practice",
      points: [
        "Classification models: logistic regression and decision trees",
        "Clustering with K-Means",
        "Model evaluation metrics: confusion matrix, precision, recall, F1",
        "Assignments on Titanic and Iris datasets",
        "Mini project: Spam email detector",
      ],
    },
    {
      title: "Week 6 - Deep Learning and Neural Networks",
      points: [
        "Neural network fundamentals",
        "TensorFlow and Keras introduction",
        "Convolutional neural networks for image recognition",
        "Assignments on ANN and CNN with MNIST",
        "Mini project: Handwritten digit recognizer",
      ],
    },
    {
      title: "Week 7 - Data Science and Analytics",
      points: [
        "Data cleaning and preprocessing",
        "Exploratory data analysis",
        "Data visualization with Matplotlib, Seaborn, and Plotly",
        "Assignments on stock market data visualization",
        "Mini project: COVID-19 data dashboard",
      ],
    },
    {
      title: "Week 8 - Applied AI and Emerging Trends",
      points: [
        "Natural language processing basics and sentiment analysis",
        "Recommendation systems: content-based and collaborative filtering",
        "AI ethics in practice",
        "Assignments on sentiment analysis and recommendations",
        "Mini project: Movie recommendation system",
      ],
    },
    {
      title: "Week 9 - SEO Fundamentals",
      points: [
        "Search engine basics and ranking factors",
        "On-page and off-page SEO strategies",
        "Assignments on keyword research and SEO content",
        "Mini project: SEO audit of a sample website",
      ],
    },
    {
      title: "Week 10 - Content Writing for Digital Platforms",
      points: [
        "Writing for web versus print",
        "Persuasive writing and storytelling",
        "AI tools for content such as ChatGPT, Jasper, Grammarly",
        "Assignments on social media posts and blog writing",
        "Mini project: Publish a blog with SEO-optimized content",
      ],
    },
    {
      title: "Week 11 - Integrating Tech, SEO, and Content",
      points: [
        "AI in digital marketing: personalization and analytics",
        "Data-driven content strategy",
        "Case studies of viral campaigns",
        "Assignments on startup SEO strategy and Google Analytics insights",
        "Mini project: Digital growth strategy blueprint",
      ],
    },
    {
      title: "Week 12 - Capstone Project and Career Pathways",
      points: [
        "Final presentations and peer review",
        "Career tracks in AI/ML, data science, SEO, and content",
        "Portfolio building across GitHub, LinkedIn, and Medium",
        "Capstone project options across AI/ML, data science, or SEO and content",
      ],
    },
  ],
  certifications: [
    {
      level: "Level 1 - Foundation",
      certificateName: "Certified Tech & Digital Skills Associate (CTDSA)",
      coverage: [
        "Computer science and programming basics",
        "Data structures and algorithms",
        "Databases and data handling",
        "Introduction to AI and ML",
      ],
      outcome:
        "Students can code in Python, handle data, and build their first ML model.",
    },
    {
      level: "Level 2 - Advanced",
      certificateName: "Certified AI & Data Science Specialist (CADSS)",
      coverage: [
        "Machine learning including classification and clustering",
        "Deep learning with ANN and CNN",
        "Data science workflows and visualization",
        "Applied AI in NLP, recommendations, and ethics",
      ],
      outcome:
        "Students can build AI and ML projects, analyze datasets, and deploy models.",
    },
    {
      level: "Level 3 - Professional",
      certificateName: "Certified Digital Strategy & Content Professional (CDSCP)",
      coverage: [
        "SEO fundamentals across on-page and off-page tactics",
        "Content writing for digital platforms",
        "AI in content marketing and analytics",
        "Integrated capstone project combining AI, data, SEO, and content",
      ],
      outcome:
        "Students can design end-to-end digital strategies blending AI, data science, and content marketing.",
    },
  ],
  finalAward:
    "Future Skills Mastery Certificate - Computer Science, AI, Data Science & Digital Growth",
  outcomeSummary:
    "By the end, each student has a portfolio-ready project and certificate showcasing tech, data, and digital marketing skills.",
};

const gradusLeadData = {
  id: "graduslead",
  slug: "graduslead",
  name: "GradusLead",
  subtitle: "By Gradus India (a 100% Subsidiary of Century Finance Limited)",
  focus:
    "Business and leadership journey that aligns management depth with technology-driven impact.",
  approvals: [
    "GradusLead is approved by Skill India & NSDC.",
    "MoU with each student for Guaranteed Placement.",
  ],
  placementRange:
    "Guaranteed placement on package of 6 lac/Annum to 14 lac/Annum with our partnered companies.",
  partners: gradusLeadPartners,
  weeks: [
    {
      title: "Week 1 - Business Foundations in the Digital Age",
      points: [
        "Business models and value creation",
        "Introduction to digital transformation in business",
        "Case study analysis of Amazon, Tesla, and Reliance Jio",
        "Assignment on business model analysis",
        "Mini project: Startup business canvas",
      ],
    },
    {
      title: "Week 2 - Principles of Management and Leadership",
      points: [
        "Planning, organizing, leading, and controlling (POLC framework)",
        "Classical versus modern management approaches",
        "Leadership styles in digital organizations",
        "Assignment on leadership self-assessment",
        "Mini project: Management plan for a small team",
      ],
    },
    {
      title: "Week 3 - Financial and Managerial Accounting with Tech",
      points: [
        "Basics of profit and loss, balance sheet, and cash flow",
        "Financial ratios and decision-making",
        "Tools overview: Excel, Google Sheets, QuickBooks",
        "Assignment on financial analysis",
        "Mini project: Automated cash flow statement",
      ],
    },
    {
      title: "Week 4 - Marketing in the Digital Era",
      points: [
        "Marketing mix evolution from 4Ps to 7Ps",
        "Digital marketing versus traditional marketing",
        "Tools: Google Analytics and SEMrush basics",
        "Assignment: Digital marketing plan",
        "Mini project: SEO and social media strategy",
      ],
    },
    {
      title: "Week 5 - Operations and Supply Chain Management with Tech",
      points: [
        "Lean operations and Six Sigma basics",
        "Supply Chain 4.0 with AI, IoT, and blockchain",
        "Case study: Flipkart and Amazon supply chains",
        "Assignment: Supply chain mapping",
        "Mini project: Delivery process optimization",
      ],
    },
    {
      title: "Week 6 - Business Analytics and Data-Driven Decision Making",
      points: [
        "Role of data in management decisions",
        "BI and analytics tools including Tableau and Power BI",
        "Predictive analytics in business",
        "Assignment: Power BI sales dashboard",
        "Mini project: Sales data analysis and insights",
      ],
    },
    {
      title: "Week 7 - Human Resource Management and People Analytics",
      points: [
        "Talent acquisition and performance management",
        "HR tech: AI in recruitment and HRIS systems",
        "Employee engagement in hybrid workplaces",
        "Assignment: Digital HR policy for remote work",
        "Mini project: People analytics deep dive",
      ],
    },
    {
      title: "Week 8 - Strategic Management in the Tech Era",
      points: [
        "SWOT, PESTLE, and Porter Five Forces",
        "Corporate strategy versus business strategy",
        "Digital strategy frameworks",
        "Assignment: Fortune 500 strategy analysis",
        "Mini project: Industry digital strategy report",
      ],
    },
    {
      title: "Week 9 - Entrepreneurship and Innovation Management",
      points: [
        "Idea generation, validation, and MVP design",
        "Startup funding and the VC ecosystem",
        "Tech-enabled entrepreneurship including AI and blockchain",
        "Assignment: Pitch deck development",
        "Mini project: Startup blueprint with financial and tech strategy",
      ],
    },
    {
      title: "Week 10 - Project Management and Tools",
      points: [
        "Agile, Scrum, and Lean project management",
        "Tools such as Jira, Trello, Asana, and MS Project",
        "Risk management and project monitoring",
        "Assignment: Gantt chart creation",
        "Mini project: Mock project execution in Trello or Jira",
      ],
    },
    {
      title: "Week 11 - Emerging Tech in Business",
      points: [
        "AI in business including chatbots and automation",
        "Blockchain in finance and supply chain contexts",
        "IoT in manufacturing and retail",
        "Assignment: Emerging tech research report",
        "Mini project: AI or tech integration plan",
      ],
    },
    {
      title: "Week 12 - Capstone Project and Career Pathways",
      points: [
        "Capstone project options across business transformation themes",
        "Peer review sessions and presentations",
        "Portfolio building on LinkedIn, GitHub, and blogs",
        "Certification award ceremony and next steps",
      ],
    },
  ],
  outcomes: [
    "Understand business and management fundamentals",
    "Gain technical skills across Excel, Power BI, Tableau, SEO, and digital tools",
    "Learn to apply technology in finance, marketing, HR, and operations",
    "Build a capstone project linking management with technology",
    "Graduate with a professional certificate",
  ],
  certifications: [
    {
      level: "Level 1 - Foundation",
      certificateName: "Certified Business & Management Associate (CBMA)",
      coverage: [
        "Business models and management principles",
        "Accounting and finance basics using Excel and Sheets",
        "Digital marketing and SEO fundamentals",
      ],
      outcome:
        "Students can read financial statements, create a basic marketing strategy, and understand modern management basics.",
    },
    {
      level: "Level 2 - Advanced",
      certificateName: "Certified Business Analytics & Strategy Specialist (CBASS)",
      coverage: [
        "Operations and supply chain with digital tools",
        "Business analytics and dashboards in Power BI or Tableau",
        "HR management with people analytics",
        "Strategic management frameworks and digital strategy",
      ],
      outcome:
        "Students can create data dashboards, analyze business strategy, and apply analytics in HR and operations.",
    },
    {
      level: "Level 3 - Professional",
      certificateName: "Certified Tech-Driven Business Leader (CTDBL)",
      coverage: [
        "Entrepreneurship and innovation for tech-enabled startups",
        "Project management with Agile, Scrum, Jira, and Trello",
        "Emerging tech in business including AI, blockchain, and IoT",
        "Capstone project across startup plans, analytics dashboards, or digital transformation",
      ],
      outcome:
        "Students can design and present tech-powered business solutions and manage projects with digital tools.",
    },
  ],
  finalAward: "Business & Management Mastery Certificate - Tech-Driven Leadership",
};

const courseSeriesData = [gradusQuityData, gradusXData, gradusLeadData];

module.exports = {
  hero: courseSeriesHeroContent,
  courses: courseSeriesData,
};

