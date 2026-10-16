import { JobDescription, ResumeRecord, CandidateProfile } from '../types/index.ts';

export const SAMPLE_JOBS: Array<Omit<JobDescription, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>> = [
  {
    title: 'Senior Backend Engineer',
    company: 'Apex Cloud Solutions',
    status: 'Ready',
    isSample: true,
    description: `We are looking for an experienced Senior Backend Engineer to architect, build, and maintain our high-throughput distributed microservices.
Key Responsibilities:
- Design and implement resilient REST and gRPC microservices in Node.js and TypeScript.
- Optimize high-volume PostgreSQL databases with indexing, replication, and query tuning.
- Manage Docker container deployments on AWS (ECS / EKS, Lambda, S3, RDS).
- Collaborate with frontend engineers to integrate GraphQL and RESTful APIs.
- Lead code reviews and foster engineering best practices in CI/CD automation.

Requirements:
- 4+ years of professional backend development experience.
- Strong proficiency in Node.js and TypeScript.
- Deep hands-on experience with PostgreSQL and relational data modeling.
- Solid experience with Docker containerization and AWS cloud infrastructure.
- Bachelor's degree in Computer Science, Software Engineering, or equivalent experience.`,
    requirements: {
      requiredSkills: [
        { name: 'Node.js', isCritical: true, isMustHave: true, synonyms: ['node', 'nodejs'] },
        { name: 'TypeScript', isCritical: false, isMustHave: false, synonyms: ['ts'] },
        { name: 'PostgreSQL', isCritical: false, isMustHave: false, synonyms: ['postgres', 'psql'] },
        { name: 'Docker', isCritical: false, isMustHave: false, synonyms: ['containerization'] },
        { name: 'AWS', isCritical: false, isMustHave: false, synonyms: ['amazon web services'] }
      ],
      preferredSkills: ['Redis', 'Kafka', 'CI/CD', 'GraphQL', 'Kubernetes'],
      minYearsExperience: 4,
      educationLevel: 'bachelor',
      certifications: ['AWS Certified Developer'],
      additionalCriteria: ['Production on-call rotation experience', 'System design documentation']
    }
  },
  {
    title: 'Frontend Tech Lead',
    company: 'Nova Interactive',
    status: 'Ready',
    isSample: true,
    description: `Nova Interactive is seeking a Frontend Tech Lead to steer the web client architecture and mentor a team of 6 engineers.
Key Responsibilities:
- Guide architectural decisions for modern web applications built on React and Next.js.
- Champion accessibility (WCAG AA), responsive design, and core web vitals optimization.
- Standardize design systems using Tailwind CSS and component libraries.
- Partner with product managers and UX designers on technical feasibility and delivery.

Requirements:
- 5+ years of software development experience with at least 3 years focused on React.
- Mastery of TypeScript, modern JavaScript (ES6+), and React component lifecycle.
- Deep understanding of Next.js server-side rendering (SSR) and state management.
- Experience with testing suites like Jest, Vitest, or Playwright.`,
    requirements: {
      requiredSkills: [
        { name: 'React', isCritical: true, isMustHave: true, synonyms: ['reactjs', 'react.js'] },
        { name: 'TypeScript', isCritical: true, isMustHave: false, synonyms: ['ts'] },
        { name: 'Next.js', isCritical: false, isMustHave: false, synonyms: ['nextjs'] },
        { name: 'Tailwind CSS', isCritical: false, isMustHave: false, synonyms: ['tailwind'] }
      ],
      preferredSkills: ['Playwright', 'GraphQL', 'Redux', 'System Design'],
      minYearsExperience: 5,
      educationLevel: 'bachelor',
      certifications: [],
      additionalCriteria: ['Mentorship experience', 'Web performance profiling']
    }
  }
];

export const SAMPLE_CANDIDATES_RAW: Array<{
  fileName: string;
  rawText: string;
  profile: CandidateProfile['profile'];
}> = [
  {
    fileName: 'resume_marcus_vance.pdf',
    rawText: `MARCUS VANCE
marcus.vance@example.com | (555) 342-9811 | Seattle, WA
github.com/mvance-dev | linkedin.com/in/marcus-vance

PROFESSIONAL SUMMARY
Senior Backend Engineer with 6 years of experience architecting resilient cloud microservices. Proven track record scaling distributed Node.js and TypeScript APIs handling 40M+ daily events.

WORK EXPERIENCE
Senior Backend Engineer | CloudScale Systems (2022 - Present)
- Architected core payment and transaction microservices using Node.js and TypeScript.
- Migrated legacy database schemas to PostgreSQL, reducing P99 query latency by 42%.
- Deployed and maintained Docker containers orchestrated via AWS ECS and Kubernetes.
- Integrated Redis cache layer handling 15,000 requests/second with 99.99% uptime.

Backend Software Developer | Helix Data Labs (2019 - 2022)
- Built scalable RESTful services in Node.js and Express connected to PostgreSQL.
- Automated CI/CD deployment pipelines using GitHub Actions and AWS CloudFormation.
- Collaborated in an Agile Scrum team delivering two-week release cycles.

EDUCATION
Bachelor of Science in Computer Science | University of Washington (2015 - 2019)

SKILLS & CERTIFICATIONS
Languages & Frameworks: Node.js, TypeScript, JavaScript, Express, Python
Databases & Cloud: PostgreSQL, Redis, MongoDB, AWS (ECS, S3, RDS, Lambda), Docker, Git
Certifications: AWS Certified Developer - Associate (2023)`,
    profile: {
      name: 'Marcus Vance',
      email: 'marcus.vance@example.com',
      phone: '(555) 342-9811',
      location: 'Seattle, WA',
      summary: 'Senior Backend Engineer with 6 years of experience architecting resilient cloud microservices.',
      skills: [
        { name: 'Node.js', evidenceQuote: 'Architected core payment and transaction microservices using Node.js and TypeScript.' },
        { name: 'TypeScript', evidenceQuote: 'Architected core payment and transaction microservices using Node.js and TypeScript.' },
        { name: 'PostgreSQL', evidenceQuote: 'Migrated legacy database schemas to PostgreSQL, reducing P99 query latency by 42%.' },
        { name: 'Docker', evidenceQuote: 'Deployed and maintained Docker containers orchestrated via AWS ECS and Kubernetes.' },
        { name: 'AWS', evidenceQuote: 'Deployed and maintained Docker containers orchestrated via AWS ECS and Kubernetes.' },
        { name: 'Redis', evidenceQuote: 'Integrated Redis cache layer handling 15,000 requests/second with 99.99% uptime.' },
        { name: 'Kubernetes', evidenceQuote: 'Deployed and maintained Docker containers orchestrated via AWS ECS and Kubernetes.' }
      ],
      experience: [
        {
          title: 'Senior Backend Engineer',
          company: 'CloudScale Systems',
          startYear: 2022,
          endYear: 'Present',
          years: 4,
          summary: 'Architected core payment and transaction microservices using Node.js and TypeScript.'
        },
        {
          title: 'Backend Software Developer',
          company: 'Helix Data Labs',
          startYear: 2019,
          endYear: 2022,
          years: 3,
          summary: 'Built scalable RESTful services in Node.js and Express connected to PostgreSQL.'
        }
      ],
      education: [
        {
          degree: 'Bachelor of Science',
          field: 'Computer Science',
          institution: 'University of Washington',
          year: 2019
        }
      ],
      projects: [
        {
          name: 'Distributed Event Bus',
          description: 'High-throughput Kafka and Redis streaming processor.',
          skillsUsed: ['Node.js', 'Redis', 'Docker']
        }
      ],
      certifications: ['AWS Certified Developer - Associate'],
      achievements: ['Reduced P99 query latency by 42%']
    }
  },
  {
    fileName: 'resume_elena_rostova.pdf',
    rawText: `ELENA ROSTOVA
elena.rostova@example.com | (555) 891-2340 | Austin, TX
elena-frontend.dev

PROFESSIONAL SUMMARY
Frontend Tech Lead with 7 years of expertise engineering high-performance web applications in React and Next.js. Passionate about component system architecture and web performance.

PROFESSIONAL EXPERIENCE
Lead Frontend Engineer | Horizon Web Studios (2021 - Present)
- Directed frontend architecture for enterprise client portals using React 18, Next.js, and TypeScript.
- Established design system with Tailwind CSS and Radix UI primitives adopted across 5 engineering squads.
- Implemented comprehensive E2E testing using Playwright, increasing regression coverage to 92%.
- Improved Core Web Vitals (LCP: 1.2s, CLS: 0.01) across 20+ responsive web properties.

Senior Frontend Developer | Omnichannel Inc (2018 - 2021)
- Developed complex dashboards in React, Redux, and TypeScript.
- Integrated Apollo GraphQL client for declarative data fetching with optimistic UI updates.

EDUCATION
Bachelor of Science in Software Engineering | University of Texas at Austin (2014 - 2018)

SKILLS
Frontend: React, Next.js, TypeScript, JavaScript, Tailwind CSS, HTML5, CSS3, Redux, GraphQL
Testing & Tooling: Playwright, Jest, Vitest, Webpack, Vite, Git, Agile`,
    profile: {
      name: 'Elena Rostova',
      email: 'elena.rostova@example.com',
      phone: '(555) 891-2340',
      location: 'Austin, TX',
      summary: 'Frontend Tech Lead with 7 years of expertise engineering high-performance web applications in React and Next.js.',
      skills: [
        { name: 'React', evidenceQuote: 'Directed frontend architecture for enterprise client portals using React 18, Next.js, and TypeScript.' },
        { name: 'Next.js', evidenceQuote: 'Directed frontend architecture for enterprise client portals using React 18, Next.js, and TypeScript.' },
        { name: 'TypeScript', evidenceQuote: 'Directed frontend architecture for enterprise client portals using React 18, Next.js, and TypeScript.' },
        { name: 'Tailwind CSS', evidenceQuote: 'Established design system with Tailwind CSS and Radix UI primitives adopted across 5 engineering squads.' },
        { name: 'Playwright', evidenceQuote: 'Implemented comprehensive E2E testing using Playwright, increasing regression coverage to 92%.' },
        { name: 'GraphQL', evidenceQuote: 'Integrated Apollo GraphQL client for declarative data fetching with optimistic UI updates.' }
      ],
      experience: [
        {
          title: 'Lead Frontend Engineer',
          company: 'Horizon Web Studios',
          startYear: 2021,
          endYear: 'Present',
          years: 5,
          summary: 'Directed frontend architecture for enterprise client portals using React 18, Next.js, and TypeScript.'
        },
        {
          title: 'Senior Frontend Developer',
          company: 'Omnichannel Inc',
          startYear: 2018,
          endYear: 2021,
          years: 3,
          summary: 'Developed complex dashboards in React, Redux, and TypeScript.'
        }
      ],
      education: [
        {
          degree: 'Bachelor of Science',
          field: 'Software Engineering',
          institution: 'University of Texas at Austin',
          year: 2018
        }
      ],
      projects: [
        {
          name: 'Nova Design System',
          description: 'Accessible component library built with Tailwind CSS and Storybook.',
          skillsUsed: ['React', 'TypeScript', 'Tailwind CSS']
        }
      ],
      certifications: [],
      achievements: ['Increased test regression coverage to 92%']
    }
  },
  {
    fileName: 'resume_jordan_reed.pdf',
    rawText: `JORDAN REED
jordan.reed@example.com | (555) 412-7788 | Denver, CO

PROFESSIONAL SUMMARY
Software Engineer with 2.5 years of experience in Python and Flask web development. Excited to transition towards Node.js cloud architectures.

EXPERIENCE
Junior Software Engineer | Trailhead Tech (2023 - Present)
- Built internal Python scripts and REST endpoints using Flask and SQLite.
- Contributed to frontend bug fixes in JavaScript and HTML/CSS.
- Participated in weekly code reviews and sprint retrospectives.

Intern Developer | Boulder Systems (2022 - 2023)
- Created automated unit tests using Pytest.
- Documented API endpoints with Swagger/OpenAPI.

EDUCATION
Associate Degree in Computer Information Systems | Colorado Community College (2020 - 2022)

SKILLS
Languages: Python, JavaScript, SQL
Frameworks: Flask, Express (Basic)
Tools: Git, Linux, Docker (Foundational)`,
    profile: {
      name: 'Jordan Reed',
      email: 'jordan.reed@example.com',
      phone: '(555) 412-7788',
      location: 'Denver, CO',
      summary: 'Software Engineer with 2.5 years of experience in Python and Flask web development.',
      skills: [
        { name: 'Python', evidenceQuote: 'Built internal Python scripts and REST endpoints using Flask and SQLite.' },
        { name: 'JavaScript', evidenceQuote: 'Contributed to frontend bug fixes in JavaScript and HTML/CSS.' },
        { name: 'SQL', evidenceQuote: 'Built internal Python scripts and REST endpoints using Flask and SQLite.' },
        { name: 'Docker', evidenceQuote: 'Tools: Git, Linux, Docker (Foundational)' }
      ],
      experience: [
        {
          title: 'Junior Software Engineer',
          company: 'Trailhead Tech',
          startYear: 2023,
          endYear: 'Present',
          years: 2.5,
          summary: 'Built internal Python scripts and REST endpoints using Flask and SQLite.'
        }
      ],
      education: [
        {
          degree: 'Associate Degree',
          field: 'Computer Information Systems',
          institution: 'Colorado Community College',
          year: 2022
        }
      ],
      projects: [],
      certifications: [],
      achievements: []
    }
  }
];
