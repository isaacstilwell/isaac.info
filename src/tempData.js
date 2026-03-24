const workData = [
  {
    title: "Three-Pillars",
    position: "Developer",
    start: new Date(2025, 1, 12),
    end: new Date(2025, 8, 1),
    path: "three-pillars",
    points: [
      "Built React admin panel enabling staff to modify 250+ LLM prompts and other records directly in the database, eliminating administrator overhead and reducing database update time by 75%",
      "Migrated vanilla JavaScript and HTML frontend to React, improving project maintainability and increasing team development speed by 25%+",
      "Migrated 20+ endpoints from session-based to JWT authentication, eliminating server-side session storage and enabling stateless backend architecture",
      "Integrated Stripe payment processing with support for subscriptions, one-time purchases, and student discounts",
    ],
  },
  {
    title: "CharityWatch",
    position: "Intern",
    start: new Date(2024, 5, 29),
    end: new Date(2024, 8, 1),
    path: "charitywatch",
    points: [
      "Designed and implemented frontend and document processing pipeline for AI charity evaluation PoC, handling S3 upload, PDF-to-markdown parsing, NoSQL integration, and CSV export functionality",
      "Built AWS Lambda functions for organization-specific authentication, PDF upload/parsing, and NoSQL interfacing to process 1000+ page tax documents with asynchronous PDF-to-markdown conversion",
      "Engineered Astro + Tailwind frontend with document upload, real-time processing status, editable audit parameters, and CSV export functionality for results analysis",
      "Presented completed PoC to board and CEO, receiving positive response and interest in continued development",
    ],
  },
  {
    title: "Familial",
    position: "Intern",
    start: new Date(2024, 6, 12),
    end: new Date(2024, 8, 1),
    path: "familial",
    points: [
      "Spearheaded end-to-end restructure of core estate-planning questionnaire driving 40% increase in feature usage",
      "Redesigned corporate portal to feature relevant user analytics, contributing to two new corporate partnerships",
      "Augmented estate tracking feature by implementing storage for important documents and digital account info",
    ],
  },
  {
    title: "IbisGen",
    position: "Intern",
    start: new Date(2023, 8, 29),
    end: new Date(2024, 5, 1),
    path: "ibisgen",
    points: [
      "Developed analytics platform using NestJS and PostgreSQL to track user activity and costs for 30+ beta users",
      "Revitalized company homepage using Tailwind and Astro for a more polished and professional interface",
      "Created customizable LLM task sequences using RxJS observables, Tailwind, and PostgreSQL",
      "Built RESTful API for LLM agent to interface with Outlook emails in event-driven microservices architecture",
    ],
  },
];

const projectData = [
  {
    title: "Trace",
    position: null,
    start: new Date(2025, 10, 12),
    end: new Date(2025, 11, 4),
    path: "trace",
    points: [
        "Designed FastAPI service to locate physical datacenter addresses for all IP addresses in a traceroute response",
        "Integrated API response into Vite frontend to display datacenter locations and route statistics for traceroute results on user input IP addresses"
    ],
  },
  {
    title: "isaac.info V2.0",
    position: null,
    start: new Date(2026, 1, 12),
    end: new Date(2026, 2, 24),
    path: "meta",
    points: [
      "Implemented algorithm to procedurally generate planet and asteroids with three.js for background scene",
      "Designed custom information sheet in Figma and implemented using HTML and CSS for structure and JavaScript to generate custom SVG outlines",
      "Built custom classes to manage data and scene state, enabling interaction between main HTML content and canvas drawings",
    ],
  },

];

const aboutData = [
    {
        title: "Isaac Stilwell",
        position: null,
        start: new Date(2003, 3, 12),
        end: null,
        path: "ios",
        points: [
            "Received BA in Chemistry and BS in Computer Science from the University of Chicago (class of 2025)",
            "Pursuing MS in Computer Science with a specialization in app development at the University of Chicago (class of 2027)",
            "Hobbies include building keyboards, building computers, the cello, tennis, skiing, Sekiro, and Minecraft",
        ]
    }
]

export { workData, projectData, aboutData };