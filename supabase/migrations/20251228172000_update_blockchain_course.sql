INSERT INTO course (
  id, slug, course_slug, name, programme, programme_slug, is_visible, created_at, updated_at, doc
) VALUES (
  '{"$oid": "690dca230c7f03983dc0b6e1"}',
  'gradus-x/blockchain-development-fundamentals',
  'blockchain-development-fundamentals',
  'Blockchain Development Fundamentals',
  'Gradus X',
  'gradus-x',
  TRUE,
  '2025-11-07T10:29:54.402Z'::timestamptz,
  '2025-11-19T03:21:46.132Z'::timestamptz,
  $${
  "_id": { "$oid": "690dca230c7f03983dc0b6e1" },
  "slug": "gradus-x/blockchain-development-fundamentals",
  "__v": 0,
  "aboutProgram": [
    "The Blockchain Development Program is a hands-on, project-oriented course that teaches you how to design, build, and deploy decentralized applications (DApps) on modern blockchain ecosystems.",
    "You’ll learn the fundamentals of blockchain architecture, cryptography, and consensus mechanisms, then progress to smart contract development, Web3 integration, and emerging technologies like Layer 2 scaling, DeFi, and AI-integrated blockchain systems.",
    "By the end, you’ll have built real decentralized apps and gained a deep understanding of how blockchain is powering the next generation of digital systems."
  ],
  "capstone": {
    "summary": "Design, build, and deploy a decentralized application integrating:",
    "bullets": [
      "Smart contracts using Solidity",
      "Web3-enabled frontend interaction",
      "Token creation and on-chain functionality",
      "Deployment and architecture documentation"
    ]
  },
  "careerOutcomes": [
    "Blockchain Developer",
    "Smart Contract Engineer",
    "Web3 Developer",
    "DeFi Engineer",
    "Full Stack DApp Developer"
  ],
  "courseSlug": "blockchain-development-fundamentals",
  "createdAt": { "$date": "2025-11-07T10:29:54.402Z" },
  "details": {
    "effort": "8-10 hours per week",
    "language": "English",
    "prerequisites": "Basic programming knowledge (JavaScript or Python preferred)"
  },
  "hero": {
    "subtitle": "Build the Future of Decentralized Technology",
    "priceINR": 18000,
    "enrolledText": "467 already enrolled"
  },
  "instructors": [
    { "name": "Gradus Mentor", "subtitle": "Industry Practitioner - 120k learners" },
    { "name": "Guest Expert", "subtitle": "Blockchain Architect - 27k learners" }
  ],
  "learn": [
    "Understand blockchain fundamentals and cryptographic principles",
    "Develop and deploy smart contracts using Solidity",
    "Build decentralized apps (DApps) with Web3.js and React",
    "Integrate token standards (ERC-20, ERC-721, ERC-1155)",
    "Explore DeFi, NFTs, Layer 2 scaling, and AI-blockchain applications"
  ],
  "modules": [
    {
      "title": "Blockchain & Smart Contracts",
      "weeksLabel": "Weeks 1–2",
      "topics": [
        "Introduction to blockchain and decentralized systems",
        "Consensus mechanisms: Proof of Work, Proof of Stake",
        "Ethereum and EVM architecture",
        "Writing and deploying smart contracts with Solidity",
        "Hands-on practice with Remix IDE and Ganache"
      ],
      "outcome": "Understand blockchain internals, transaction flows, and deploy basic smart contracts.",
      "weeklyStructure": [],
      "outcomes": [],
      "resources": []
    },
    {
      "title": "DApp & Web3 Development",
      "weeksLabel": "Weeks 3–4",
      "topics": [
        "Connecting frontend to blockchain using Web3.js / Ethers.js",
        "Building decentralized apps (React + Web3)",
        "Token standards and contracts (ERC-20, ERC-721, ERC-1155)",
        "NFT minting, trading, and marketplace concepts",
        "Wallet integration (MetaMask) and on-chain interaction"
      ],
      "outcome": "Build full-stack decentralized applications and integrate smart contracts with frontend interfaces.",
      "weeklyStructure": [],
      "outcomes": [],
      "resources": []
    },
    {
      "title": "Advanced Blockchain & Capstone",
      "weeksLabel": "Weeks 5–6",
      "topics": [
        "Layer 2 networks (Polygon, Arbitrum, Optimism)",
        "Interoperability and cross-chain bridges",
        "DeFi protocols, yield farming, and decentralized exchanges",
        "AI and blockchain synergy — data integrity, automation, and tokenized AI models"
      ],
      "outcome": "Create and deploy complete decentralized systems, mastering Web3, Layer 2s, and AI-blockchain convergence.",
      "extras": {
        "projectTitle": "Capstone Project",
        "projectDescription": "Design and deploy a decentralized application with smart contract automation and Web3 integration.",
        "examples": [
          "NFT Marketplace DApp",
          "DeFi Staking Platform",
          "AI-integrated Blockchain Dashboard"
        ],
        "deliverables": [
          "Custom smart contract repository",
          "DApp frontend connected to a testnet",
          "Deployment report and architecture summary"
        ]
      },
      "weeklyStructure": [],
      "outcomes": [],
      "resources": []
    }
  ],
  "name": "Blockchain Development Fundamentals",
  "offeredBy": {
    "name": "Gradus India",
    "subtitle": "A subsidiary of Century Finance Limited",
    "logo": "/assets/images/cfl.png"
  },
  "programme": "Gradus X",
  "programmeSlug": "gradus-x",
  "skills": [
    "Smart Contracts",
    "DApp Development",
    "Web3 Integration",
    "DeFi & NFTs",
    "AI-Blockchain Systems"
  ],
  "stats": {
    "modules": 3,
    "mode": "Online",
    "level": "Intermediate",
    "duration": "6 Weeks"
  },
  "toolsFrameworks": [
    "Blockchain: Ethereum, Polygon, Arbitrum",
    "Languages: Solidity, JavaScript, TypeScript",
    "Frameworks: Hardhat, Truffle, Web3.js, Ethers.js",
    "Frontend: React, Next.js",
    "Testing & Deployment: Remix, Ganache, MetaMask, Alchemy",
    "Emerging Tech: Chainlink, IPFS, AI Integrations"
  ],
  "updatedAt": { "$date": "2025-11-19T03:21:46.132Z" },
  "image": {
    "url": "https://res.cloudinary.com/dnp3j8xb1/image/upload/v1762850650/courses/ucvhawazhe4i7qcnqvyh.jpg",
    "alt": "",
    "publicId": "courses/ucvhawazhe4i7qcnqvyh"
  }
}
$$::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  course_slug = EXCLUDED.course_slug,
  name = EXCLUDED.name,
  programme = EXCLUDED.programme,
  programme_slug = EXCLUDED.programme_slug,
  is_visible = EXCLUDED.is_visible,
  updated_at = EXCLUDED.updated_at,
  doc = EXCLUDED.doc;

-- Post-insert fixes for price consistency (Automatic)
UPDATE public.course
SET price_inr = 18000
WHERE id = '{"$oid": "690dca230c7f03983dc0b6e1"}';

UPDATE public.enrollments
SET 
  price_base = 18000,
  price_tax = 3240,
  price_total = 21240
WHERE course_id = '{"$oid": "690dca230c7f03983dc0b6e1"}';
