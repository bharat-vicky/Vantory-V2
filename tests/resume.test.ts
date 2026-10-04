import test from "node:test";
import {previewPageCount} from "../lib/resume/preview-pages";
import {saveResumeContent} from "../lib/resume/resume-service";

test("Invalid resume names cannot silently save a mismatched library title",async()=>{
 await assert.rejects(()=>saveResumeContent("owner","resume",{title:" "} as any),/1–120 characters/);
 await assert.rejects(()=>saveResumeContent("owner","resume",{title:"x".repeat(121)} as any),/1–120 characters/);
});

test("A4 preview rounding does not create an empty page, but real overflow does",()=>{
 const width=793.7,height=width*297/210;
 assert.equal(previewPageCount(width,height+0.7),1);
 assert.equal(previewPageCount(width,height+10),2);
 assert.equal(previewPageCount(width,height*2+0.5),2);
 assert.equal(previewPageCount(0,height),1);
});
import assert from "node:assert";
import { escapeLatex } from "../lib/resume/latex/escapeLatex";
import { generateLatexSource } from "../lib/resume/latex/renderer";
import {
  parseResumeContent,
  serializeResumeContent,
} from "../lib/resume/serialization";
import { ResumeData, defaultResumeSettings } from "../lib/resume/types";
import { createResumeFromProfile } from "../lib/resume/resume-service";
import { replaceUniqueResumeText } from "../lib/resume/text-replacement";
import { GET as getResumePdf } from "../app/api/resumes/[id]/pdf/route";

test("Resume download endpoint rejects unauthenticated requests", async () => {
  const response = await getResumePdf(
    new Request("http://localhost/api/resumes/private-resume/pdf"),
    { params: Promise.resolve({ id: "private-resume" }) },
  );

  assert.strictEqual(response.status, 401);
  assert.strictEqual(
    response.headers.get("Cache-Control"),
    "private, no-store",
  );
});

test("LaTeX Special Characters Escaping", () => {
  assert.strictEqual(escapeLatex("John & Jane"), "John \\& Jane");
  assert.strictEqual(escapeLatex("50%"), "50\\%");
  assert.strictEqual(escapeLatex("C++ & $100"), "C++ \\& \\$100");
  assert.strictEqual(escapeLatex("Node.js_Developer"), "Node.js\\_Developer");
  assert.strictEqual(escapeLatex("Issue #123"), "Issue \\#123");
  assert.strictEqual(escapeLatex("{code}"), "\\{code\\}");
});

test("Resume Data Serialization & Deserialization", () => {
  const sampleData: ResumeData = {
    title: "Test Resume",
    personalInfo: {
      fullName: "Alex Morgan",
      headline: "Software Engineer",
      email: "alex@example.com",
      phone: "+1 555 0000",
      location: "San Francisco, CA",
      linkedin: "https://linkedin.com/in/alex",
      github: "https://github.com/alex",
      portfolio: "https://alex.dev",
      leetcode: "https://leetcode.com/alex",
    },
    summary: "Passionate developer.",
    skills: [
      { id: "1", category: "Languages", skills: ["Python", "TypeScript"] },
    ],
    experience: [],
    education: [],
    projects: [],
    certifications: [],
    achievements: [],
    settings: defaultResumeSettings,
  };

  const serialized = serializeResumeContent(sampleData);
  assert.ok(typeof serialized === "string");

  const parsed = parseResumeContent(serialized);
  assert.strictEqual(parsed.personalInfo.fullName, "Alex Morgan");
  assert.strictEqual(parsed.skills.length, 1);
  assert.strictEqual(parsed.skills[0].category, "Languages");
});

test("Resume parsing removes embedded certificate and achievement files", () => {
  const parsed = parseResumeContent(
    JSON.stringify({
      certifications: [
        {
          name: "Certificate",
          credentialUrl: "data:application/pdf;base64,ZmFrZQ==",
          pdfFileName: "certificate.pdf",
        },
      ],
      achievements: [
        {
          title: "Award",
          proofUrl: "data:application/pdf;base64,ZmFrZQ==",
          pdfFileName: "proof.pdf",
        },
      ],
    }),
  );

  assert.equal(parsed.certifications[0].credentialUrl, undefined);
  assert.equal(parsed.certifications[0].pdfFileName, undefined);
  assert.equal(parsed.achievements[0].proofUrl, undefined);
  assert.equal(parsed.achievements[0].pdfFileName, undefined);
});

test("Legacy resume parsing does not invent a professional headline", () => {
  const parsed = parseResumeContent(
    JSON.stringify({ personalInfo: { fullName: "Alex Morgan" } }),
  );

  assert.equal(parsed.personalInfo.fullName, "Alex Morgan");
  assert.equal(parsed.personalInfo.headline, "");
  assert.deepStrictEqual(parsed.skills, []);
  assert.deepStrictEqual(parsed.experience, []);
});

test("Profile seed contains only candidate-provided claims", () => {
  const resume = createResumeFromProfile({
    name: "Alex Morgan",
    email: "alex@example.com",
    profile: {
      headline: null,
      bio: null,
      phone: null,
      location: null,
      githubUrl: null,
      linkedinUrl: null,
      portfolioUrl: null,
      skills: null,
      education: null,
    },
  });

  assert.strictEqual(resume.personalInfo.fullName, "Alex Morgan");
  assert.strictEqual(resume.personalInfo.email, "alex@example.com");
  assert.strictEqual(resume.personalInfo.headline, "");
  assert.strictEqual(resume.summary, "");
  assert.deepStrictEqual(resume.skills, []);
  assert.deepStrictEqual(resume.experience, []);
  assert.deepStrictEqual(resume.education, []);
});

test("AI resume replacement changes one unique occurrence and rejects ambiguity", () => {
  const sampleData: ResumeData = {
    title: "Test Resume",
    personalInfo: {
      fullName: "Alex Morgan",
      headline: "Engineer",
      email: "alex@example.com",
      phone: "",
      location: "",
      linkedin: "",
      github: "",
      portfolio: "",
      leetcode: "",
    },
    summary: "Builds reliable services.",
    skills: [],
    experience: [
      {
        id: "exp-1",
        role: "Engineer",
        company: "",
        location: "",
        startDate: "",
        endDate: "",
        isCurrent: false,
        description: "",
        bullets: [],
      },
    ],
    education: [],
    projects: [],
    certifications: [],
    achievements: [],
    settings: defaultResumeSettings,
  };

  const replaced = replaceUniqueResumeText(sampleData, "reliable", "resilient");
  assert.equal(replaced.resumeData?.summary, "Builds resilient services.");
  assert.equal(sampleData.summary, "Builds reliable services.");

  const ambiguous = replaceUniqueResumeText(
    sampleData,
    "Engineer",
    "Developer",
  );
  assert.equal(ambiguous.resumeData, null);
  assert.equal(ambiguous.matchCount, 2);

  const contactChange = replaceUniqueResumeText(
    sampleData,
    "alex@example.com",
    "new@example.com",
  );
  assert.equal(contactChange.resumeData, null);
  assert.equal(contactChange.matchCount, 0);
  assert.equal(sampleData.personalInfo.email, "alex@example.com");
});

test("LaTeX Document Template Source Generation", () => {
  const sampleData: ResumeData = {
    title: "Test Resume",
    personalInfo: {
      fullName: "Alex Morgan",
      headline: "Full Stack Engineer",
      email: "alex@example.com",
      phone: "+1 555 123 4567",
      location: "Bengaluru, India",
      linkedin: "",
      github: "",
      portfolio: "",
      leetcode: "",
    },
    summary: "Experienced developer.",
    skills: [{ id: "1", category: "Languages", skills: ["Python", "C++"] }],
    experience: [],
    education: [],
    projects: [],
    certifications: [],
    achievements: [],
    settings: defaultResumeSettings,
  };

  const latex = generateLatexSource(sampleData);
  assert.ok(latex.includes("\\documentclass[10pt,a4paper]{article}"));
  assert.ok(latex.includes("\\usepackage[utf8]{inputenc}"));
  assert.ok(!latex.includes("💼"));
  const minimalLatex = generateLatexSource({
    ...sampleData,
    settings: {
      ...defaultResumeSettings,
      templateId: "latex-minimal",
      fontSize: "lg",
      margins: "compact",
    },
  });
  assert.ok(minimalLatex.includes("\\documentclass[10pt,a4paper]{article}"));
  assert.ok(minimalLatex.includes("top=28pt,bottom=28pt,left=34pt,right=34pt"));
  assert.ok(
    minimalLatex.includes("\\renewcommand{\\familydefault}{\\sfdefault}"),
  );
  assert.ok(latex.includes("Alex Morgan"));
  assert.ok(latex.includes("Python, C++"));
  assert.ok(latex.includes("\\end{document}"));
});

test("Resume GET does not create records and saves require explicit ID and revision",async()=>{
 const {db}=await import("../lib/db");const {stubMethod}=await import("./fixtures");const {getCandidateResumes,saveCandidateResume}=await import("../lib/resume/resume-service");
 const restores=[stubMethod(db.resume,"findMany",async()=>[]),stubMethod(db.resume,"findFirst",async()=>({id:"111111111111111111111111",title:"Saved",templateId:"classic",updatedAt:new Date()})),stubMethod(db.resume,"updateMany",async()=>({count:0}))];
 try{assert.deepEqual(await getCandidateResumes("owner"),[]);await assert.rejects(()=>saveCandidateResume("owner",{}),/Choose the resume/);await assert.rejects(()=>saveCandidateResume("owner",{id:"111111111111111111111111",content:parseResumeContent("{}")} ),/Reload/);await assert.rejects(()=>saveCandidateResume("owner",{id:"111111111111111111111111",content:parseResumeContent("{}"),expectedUpdatedAt:new Date().toISOString()}),/changed in another tab/);}finally{restores.reverse().forEach(r=>r());}
});
