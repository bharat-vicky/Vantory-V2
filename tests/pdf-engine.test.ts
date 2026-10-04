import test from "node:test";
import assert from "node:assert";
import { compileResumePdf } from "../lib/resume/pdf-compiler";
import { ResumeData, defaultResumeSettings } from "../lib/resume/types";

const sampleData: ResumeData = {
  title: "Software Engineer Resume",
  personalInfo: {
    fullName: "Anupam Singh",
    headline: "Full Stack & Generative AI Engineer",
    email: "anupamsingh8095@gmail.com",
    phone: "7307679920",
    location: "Varanasi, India",
    linkedin: "https://linkedin.com/in/anupamsingh",
    github: "https://github.com/ANUPAM456",
    portfolio: "https://anupamsingh.dev",
    leetcode: "https://leetcode.com/anupamsingh",
  },
  summary:
    "Computer Science undergraduate specializing in Generative AI and full-stack engineering with LangChain and Next.js.",
  skills: [
    {
      id: "sk-1",
      category: "Languages",
      skills: ["Python", "JavaScript", "TypeScript", "SQL"],
    },
    {
      id: "sk-2",
      category: "Full-Stack Development",
      skills: ["React.js", "Next.js", "Tailwind CSS", "Node.js"],
    },
  ],
  experience: [
    {
      id: "exp-1",
      role: "Software Engineer Intern",
      company: "SkillAssociate Technologies",
      location: "Bengaluru, India",
      startDate: "2024",
      endDate: "Present",
      isCurrent: true,
      description: "Building production campus placement engine.",
      bullets: [
        "Architected real-time candidate ATS scoring pipelines.",
        "Engineered microservices with Next.js and Prisma.",
      ],
    },
  ],
  education: [
    {
      id: "edu-1",
      degree: "B.Tech in Computer Science & Engineering",
      institution: "Technocrats Institute of Technology",
      location: "Bhopal, India",
      startDate: "2021",
      endDate: "2025",
      grade: "8.5 CGPA",
    },
  ],
  projects: [
    {
      id: "proj-1",
      title: "Enterprise Multi-Agent RAG Assistant",
      description: "AI-powered document intelligence system.",
      techStack: ["Next.js", "Python", "LangChain", "FastAPI"],
      liveUrl: "https://rag-demo.skillassociate.dev",
      repoUrl: "https://github.com/ANUPAM456/rag-assistant",
      bullets: ["Architected RAG pipeline with Qdrant vector search."],
    },
  ],
  certifications: [
    {
      id: "cert-1",
      name: "AWS Certified Solutions Architect",
      issuer: "Amazon Web Services",
      issueDate: "2025",
      credentialUrl: "https://credly.com/badges/aws-solutions-architect",
    },
  ],
  achievements: [
    {
      id: "ach-1",
      title: "Winner — Global AI Hackathon 2025",
      description:
        "Awarded 1st place among 500+ competing international developer teams.",
      proofUrl: "https://hackathon.dev/winners/2025",
    },
  ],
  settings: defaultResumeSettings,
};

test("PDF Compiler - Output binary structure & magic header", async () => {
  const result = await compileResumePdf(sampleData);
  assert.ok(Buffer.isBuffer(result.buffer), "Output must be a Buffer");
  assert.ok(
    result.buffer.length > 500,
    "Buffer size must be non-trivial (>500 bytes)",
  );

  // PDF Magic Bytes Check (%PDF-)
  const pdfHeader = result.buffer.subarray(0, 5).toString("ascii");
  assert.strictEqual(
    pdfHeader,
    "%PDF-",
    "Generated binary must begin with PDF magic header %PDF-",
  );

  assert.strictEqual(result.fileName, "Anupam_Singh_Vantory.pdf");
  assert.ok(result.pageCount >= 1, "Page count must be >= 1");
});

test("PDF Compiler - Contains candidate name and section titles in PDF stream", async () => {
  const result = await compileResumePdf(sampleData);
  const pdfTextContent = result.buffer.toString("latin1");

  assert.ok(
    pdfTextContent.includes("Anupam"),
    "PDF text layer must contain candidate name",
  );
  assert.ok(
    pdfTextContent.includes("anupamsingh8095@gmail.com"),
    "PDF text layer must contain email",
  );
  const encodedCompanyName = Buffer.from("SkillAssociate", "ascii").toString(
    "hex",
  );
  assert.ok(
    pdfTextContent.includes(encodedCompanyName),
    "PDF text layer must contain experience company",
  );
});

test("PDF Compiler - Applies template fonts and margin presets", async () => {
  const compact = await compileResumePdf({
    ...sampleData,
    settings: {
      ...defaultResumeSettings,
      templateId: "latex-minimal",
      fontSize: "sm",
      margins: "compact",
    },
  });
  const spacious = await compileResumePdf({
    ...sampleData,
    settings: {
      ...defaultResumeSettings,
      templateId: "classic-monochrome",
      fontSize: "lg",
      margins: "spacious",
    },
  });

  const compactText = compact.buffer.toString("latin1");
  const spaciousText = spacious.buffer.toString("latin1");
  assert.ok(compactText.includes("/BaseFont /Helvetica"));
  assert.ok(compactText.includes("1 0 0 1 34 "));
  assert.ok(spaciousText.includes("/BaseFont /Times-Roman"));
  assert.ok(spaciousText.includes("1 0 0 1 57 "));
});

test("LaTeX Renderer - Renders social icons and hidelinks hyperref setup", async () => {
  const { generateLatexSource } = await import("../lib/resume/latex/renderer");
  const latex = generateLatexSource(sampleData);

  assert.ok(
    latex.includes("hidelinks=true"),
    "LaTeX source must configure hidelinks=true in hyperref",
  );
  assert.ok(
    latex.includes("colorlinks=false"),
    "LaTeX source must disable colored links",
  );
  assert.ok(
    latex.includes("LinkedIn"),
    "LaTeX source must contain LinkedIn link",
  );
  assert.ok(latex.includes("GitHub"), "LaTeX source must contain GitHub link");
  assert.ok(
    latex.includes("Portfolio"),
    "LaTeX source must contain Portfolio link",
  );
  assert.ok(
    latex.includes("LeetCode"),
    "LaTeX source must contain LeetCode link",
  );
  assert.ok(latex.includes("\\usepackage[utf8]{inputenc}"));
  assert.ok(!latex.includes("💼"));
  const escapedUrlLatex = generateLatexSource({
    ...sampleData,
    personalInfo: {
      ...sampleData.personalInfo,
      github: "https://github.com/name_with_underscores",
    },
  });
  assert.ok(
    escapedUrlLatex.includes("https://github.com/name\\_with\\_underscores"),
  );
});
