-- 1) Create table
CREATE TABLE IF NOT EXISTS course (
  id            TEXT PRIMARY KEY,          -- from _id.$oid
  slug          TEXT UNIQUE NOT NULL,
  course_slug   TEXT,
  name          TEXT,
  programme     TEXT,
  programme_slug TEXT,
  is_visible    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ,
  doc           JSONB NOT NULL              -- full original document stored here
);

-- Helpful indexes for querying inside JSON
CREATE INDEX IF NOT EXISTS course_doc_gin ON course USING GIN (doc);
CREATE INDEX IF NOT EXISTS course_slug_idx ON course (slug);

-- Enable RLS (as per project standard)
ALTER TABLE public.course ENABLE ROW LEVEL SECURITY;

-- Add basic read policy (can be refined later)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'course' AND policyname = 'Allow public read access'
    ) THEN
        CREATE POLICY "Allow public read access" ON public.course FOR SELECT USING (true);
    END IF;
END $$;

-- 2) Insert data
INSERT INTO course (
  id, slug, course_slug, name, programme, programme_slug, is_visible, created_at, updated_at, doc
) VALUES (
  '691300440c7f03983dc0ed7a',
  'gradus-x/agentic-ai-engineering-flagship',
  'agentic-ai-engineering-flagship',
  'Agentic AI Engineering Flagship Program',
  'Gradus X',
  'gradus-x',
  TRUE,
  '2025-11-11T09:22:12.229Z'::timestamptz,
  '2025-12-22T10:39:58.866Z'::timestamptz,
  '{
    "_id": {"$oid":"691300440c7f03983dc0ed7a"},
    "slug":"gradus-x/agentic-ai-engineering-flagship",
    "__v":0,
    "aboutProgram":[
      "The Agentic AI Engineering Flagship Program is designed to empower learners to design, build, and deploy intelligent agentic AI systems powered by Large Language Models (LLMs).",
      "Over 12 intensive weeks, you’ll gain hands-on experience in Python, Deep Learning, RAG, Memory, Tool Calling, and frameworks like LangChain, LangGraph, and LlamaIndex.",
      "The program emphasizes practical engineering, system design, and deployment — culminating in your own deployable AI agent ready for real-world applications."
    ],
    "capstone":{
      "summary":"Build a complete end-to-end agentic AI system integrating:",
      "bullets":[
        "LLM fine-tuning and inference optimization",
        "RAG, memory, and tool calling workflows",
        "LangChain, LangGraph, and LlamaIndex orchestration",
        "Deployment via FastAPI, Docker, and vLLM"
      ]
    },
    "careerOutcomes":[
      "Agentic AI Engineer",
      "LLM Engineer / Developer",
      "AI Application Engineer",
      "AI Integration Specialist"
    ],
    "courseSlug":"agentic-ai-engineering-flagship",
    "createdAt":{"$date":"2025-11-11T09:22:12.229Z"},
    "details":{
      "effort":"8–10 hours per week",
      "language":"English",
      "prerequisites":"Intermediate knowledge of Python and ML concepts recommended"
    },
    "hero":{
      "subtitle":"Flagship Program by GradusX",
      "priceINR":46000,
      "enrolledText":"1690 already enrolled"
    },
    "image":{
      "url":"https://res.cloudinary.com/dnp3j8xb1/image/upload/v1762853103/courses/bq8xsedt0dg55t5m8wnn.jpg",
      "alt":"",
      "publicId":"courses/bq8xsedt0dg55t5m8wnn"
    },
    "instructors":[
      {"name":"Gradus Mentor","subtitle":"Industry Practitioner - 120k learners"},
      {"name":"Guest Expert","subtitle":"Visiting Faculty - 27k learners"}
    ],
    "learn":[
      "Build and fine-tune Large Language Models (LLMs)",
      "Implement Retrieval-Augmented Generation (RAG) pipelines",
      "Add memory for reasoning and context persistence",
      "Integrate tool calling and real-world API interactions",
      "Use frameworks such as LangChain, LangGraph, and LlamaIndex",
      "Deploy agentic AI applications using FastAPI and Docker"
    ],
    "media":{"banner":{"url":"","publicId":"","format":"","width":0,"height":0}},
    "modules":[
      {
        "title":"Foundations of AI Engineering",
        "weeksLabel":"Weeks 1–2",
        "topics":[
          "Python refresher: syntax, functions, OOP",
          "Working with JSON, CSV, and APIs",
          "Data handling using NumPy, Pandas, Matplotlib",
          "Setting up professional environments (VS Code, Jupyter, Git, Conda/venv)",
          "Machine learning fundamentals: supervised vs. unsupervised learning",
          "Regression, classification, and clustering",
          "Model evaluation and validation",
          "Scikit-learn pipelines and performance metrics"
        ],
        "outcome":"Gain strong Python and ML foundations, understand core modeling concepts, and build end-to-end ML pipelines.",
        "weeklyStructure":[],
        "outcomes":[],
        "resources":[]
      },
      {
        "title":"Deep Learning and Transformers",
        "weeksLabel":"Weeks 3–4",
        "topics":[
          "Neural network basics, activation and loss functions",
          "Gradient descent and backpropagation",
          "TensorFlow and PyTorch fundamentals",
          "Building and training deep neural networks",
          "Attention mechanism and self-attention",
          "Encoder-decoder architecture",
          "Transformer architecture explained in depth",
          "BERT, GPT, and modern transformer models",
          "Tokenization, embeddings, and transfer learning"
        ],
        "outcome":"Develop a deep understanding of neural networks and modern transformer-based architectures that power today''s AI systems.",
        "weeklyStructure":[],
        "outcomes":[],
        "resources":[]
      },
      {
        "title":"Large Language Models and Fine-Tuning",
        "weeksLabel":"Weeks 5–6",
        "topics":[
          "How LLMs work internally: token prediction, context windows",
          "Model inference pipeline and sampling strategies",
          "Prompt engineering and response control",
          "Open-source vs. closed-source LLMs (GPT, LLaMA, Mistral, etc.)",
          "Parameter-efficient fine-tuning (LoRA, QLoRA, PEFT)",
          "Dataset preparation and tokenization for fine-tuning",
          "Model evaluation, alignment, and optimization",
          "Using the Hugging Face Trainer",
          "Quantization and model compression"
        ],
        "outcome":"Master the inner workings of LLMs and learn to fine-tune or adapt them for specialized tasks and domains.",
        "weeklyStructure":[],
        "outcomes":[],
        "resources":[]
      },
      {
        "title":"Building Agentic Systems",
        "weeksLabel":"Weeks 7–10",
        "topics":[
          "Retrieval-Augmented Generation (RAG): principles and pipeline",
          "Vector embeddings, FAISS, ChromaDB, and Pinecone",
          "Designing knowledge-aware chatbots",
          "Memory systems: short-term, long-term, and vector memory",
          "Persistent memory with LangChain and LlamaIndex",
          "Tool calling and function execution",
          "Defining schemas, connecting APIs, and multi-tool orchestration",
          "LangChain components: chains, agents, memory",
          "LangGraph for graph-based reasoning",
          "Combining RAG, memory, and tool calling for cohesive workflows"
        ],
        "outcome":"Learn to build autonomous, reasoning AI systems that can remember, use tools, and interact dynamically with the real world.",
        "weeklyStructure":[],
        "outcomes":[],
        "resources":[]
      },
      {
        "title":"Deployment and Capstone Project",
        "weeksLabel":"Weeks 11–12",
        "topics":[
          "Deploying LLMs using FastAPI",
          "Model inference optimization with vLLM",
          "Containerization using Docker",
          "Scaling, caching, and monitoring with LangFuse and OpenDevin",
          "Testing and benchmarking agentic performance",
          "Capstone: Build and deploy a complete agentic AI system"
        ],
        "outcome":"Graduate as a certified Agentic AI Engineer, capable of deploying production-grade agentic systems.",
        "extras":{
          "projectTitle":"Capstone Project",
          "projectDescription":"Design, build, and deploy an agentic AI system that can reason, remember, and act — integrated with RAG, memory, and tool calling.",
          "examples":[
            "Research Copilot: RAG + memory + tool calling for document intelligence",
            "AI Mentor: Conversational assistant that recalls user context",
            "Health Companion: API-integrated agent for personalized insights"
          ],
          "deliverables":[
            "Fully functional deployed AI agent",
            "Documentation and presentation",
            "Final report and portfolio submission"
          ]
        },
        "weeklyStructure":[],
        "outcomes":[],
        "resources":[]
      }
    ],
    "name":"Agentic AI Engineering Flagship Program",
    "offeredBy":{
      "name":"Gradus India",
      "subtitle":"A subsidiary of Century Finance Limited",
      "logo":"/assets/images/cfl.png"
    },
    "programme":"Gradus X",
    "programmeSlug":"gradus-x",
    "skills":[
      "Python Programming",
      "Deep Learning",
      "LLM Fine-Tuning",
      "RAG Systems",
      "Memory & Tool Calling",
      "Agentic AI Engineering"
    ],
    "stats":{
      "modules":5,
      "mode":"Online / Hybrid",
      "level":"Intermediate–Advanced",
      "duration":"12 Weeks"
    },
    "toolsFrameworks":[
      "Languages & Libraries: Python, PyTorch, Hugging Face",
      "Vector Databases: FAISS, ChromaDB, Pinecone",
      "Agentic Frameworks: LangChain, LangGraph, LlamaIndex",
      "Deployment & Ops: FastAPI, Docker, vLLM, LangFuse"
    ],
    "updatedAt":{"$date":"2025-12-22T10:39:58.866Z"},
    "isVisible":true,
    "prereqsList":[],
    "targetAudience":[]
  }'::jsonb
) ON CONFLICT (id) DO UPDATE SET 
  slug = EXCLUDED.slug,
  course_slug = EXCLUDED.course_slug,
  name = EXCLUDED.name,
  programme = EXCLUDED.programme,
  programme_slug = EXCLUDED.programme_slug,
  is_visible = EXCLUDED.is_visible,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at,
  doc = EXCLUDED.doc;
