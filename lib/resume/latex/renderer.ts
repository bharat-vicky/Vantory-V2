import { ResumeData } from "../types";
import { escapeLatex } from "./escapeLatex";

const escapeLatexUrl = (url: string) => escapeLatex(url);

/**
 * Renders raw LaTeX document source code from structured ResumeData.
 * Implements Font Awesome 5 vector icons, hidelinks hyperref, and deterministic tabular layout.
 */
export function generateLatexSource(data: ResumeData): string {
  const {
    personalInfo,
    summary,
    skills,
    experience,
    education,
    projects,
    certifications,
    achievements,
    settings,
  } = data;
  const { sectionOrder, sectionVisibility } = settings;
  const baseFontSize =
    settings.fontSize === "sm" ? 9 : settings.fontSize === "lg" ? 11 : 10;
  const templateScale =
    settings.templateId === "latex-minimal"
      ? 0.91
      : settings.templateId === "latex-classic"
        ? 1.04
        : 1;
  const documentFontSize = Math.max(
    8,
    Math.round(baseFontSize * templateScale),
  );
  const marginPresets = {
    compact: "top=28pt,bottom=28pt,left=34pt,right=34pt",
    normal: "top=40pt,bottom=40pt,left=45pt,right=45pt",
    spacious: "top=52pt,bottom=52pt,left=57pt,right=57pt",
  };
  const latexMargins = marginPresets[settings.margins] || marginPresets.normal;
  const fontFamily =
    settings.templateId === "latex-minimal"
      ? "\\renewcommand{\\familydefault}{\\sfdefault}"
      : "";

  const contactItems: string[] = [];
  if (personalInfo.location)
    contactItems.push(escapeLatex(personalInfo.location));
  if (personalInfo.email)
    contactItems.push(
      `\\href{${escapeLatexUrl(`mailto:${personalInfo.email}`)}}{${escapeLatex(personalInfo.email)}}`,
    );
  if (personalInfo.phone) contactItems.push(escapeLatex(personalInfo.phone));

  const socialLinks: string[] = [];
  if (personalInfo.linkedin)
    socialLinks.push(
      `\\href{${escapeLatexUrl(personalInfo.linkedin)}}{\\underline{LinkedIn}}`,
    );
  if (personalInfo.github)
    socialLinks.push(
      `\\href{${escapeLatexUrl(personalInfo.github)}}{\\underline{GitHub}}`,
    );
  if (personalInfo.portfolio)
    socialLinks.push(
      `\\href{${escapeLatexUrl(personalInfo.portfolio)}}{\\underline{Portfolio}}`,
    );
  if (personalInfo.leetcode)
    socialLinks.push(
      `\\href{${escapeLatexUrl(personalInfo.leetcode)}}{\\underline{LeetCode}}`,
    );

  let latex = `\\documentclass[${documentFontSize}pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[${latexMargins}]{geometry}
\\usepackage{fontawesome5}
\\usepackage[hidelinks]{hyperref}
\\usepackage{enumitem}
\\usepackage{titlesec}

\\hypersetup{
    colorlinks=false,
    hidelinks=true,
    pdfborder={0 0 0}
}

\\setlist[itemize]{noitemsep, topsep=2pt, parsep=2pt, partopsep=0pt, leftmargin=15pt}
\\titleformat{\\section}{\\large\\bfseries\\uppercase}{}{0em}{}[\\vspace{3pt}\\hrule height 0.75pt\\vspace{5pt}]
\\titlespacing*{\\section}{0pt}{10pt}{4pt}
${fontFamily}
\\pagestyle{empty}

\\begin{document}

% --- HEADER ---
\\begin{center}
    {\\LARGE \\bfseries ${escapeLatex(personalInfo.fullName || "Your Name")}}\\\\ [3pt]
    ${personalInfo.headline ? `{\\small \\textit{${escapeLatex(personalInfo.headline)}}}\\\\ [2pt]` : ""}
    ${contactItems.length > 0 ? `{\\small ${contactItems.join(" \\; $|$ \\; ")}}` : ""}
\\end{center}

${socialLinks.length > 0 ? `\\noindent \\hfill {\\small ${socialLinks.join(" \\qquad ")}}` : ""}
\\vspace{2pt}
`;

  // Render sections based on sectionOrder and sectionVisibility
  for (const sectionId of sectionOrder) {
    if (!sectionVisibility[sectionId]) continue;

    if (sectionId === "summary" && summary) {
      latex += `
\\section{Professional Summary}
${escapeLatex(summary)}
`;
    }

    if (sectionId === "skills" && skills && skills.length > 0) {
      latex += `
\\section{Technical Skills}
\\begin{itemize}
`;
      for (const cat of skills) {
        if (cat.skills && cat.skills.length > 0) {
          const joinedSkills = cat.skills.map((s) => escapeLatex(s)).join(", ");
          latex += `  \\item \\textbf{${escapeLatex(cat.category)}:} ${joinedSkills}\n`;
        }
      }
      latex += `\\end{itemize}\n`;
    }

    if (sectionId === "experience" && experience && experience.length > 0) {
      latex += `
\\section{Experience}
`;
      for (const exp of experience) {
        const dateStr = `${escapeLatex(exp.startDate)} -- ${exp.isCurrent ? "Present" : escapeLatex(exp.endDate)}`;
        latex += `\\noindent \\textbf{${escapeLatex(exp.role)}} \\hfill ${dateStr}\\\\
\\textit{${escapeLatex(exp.company)}${exp.location ? `, ${escapeLatex(exp.location)}` : ""}}\n`;

        if (exp.bullets && exp.bullets.length > 0) {
          latex += `\\begin{itemize}\n`;
          for (const b of exp.bullets) {
            if (b.trim()) latex += `  \\item ${escapeLatex(b)}\n`;
          }
          latex += `\\end{itemize}\n`;
        }
        latex += `\\vspace{4pt}\n`;
      }
    }

    if (sectionId === "projects" && projects && projects.length > 0) {
      latex += `
\\section{Projects}
`;
      for (const proj of projects) {
        const links: string[] = [];
        if (proj.repoUrl)
          links.push(`\\href{${escapeLatexUrl(proj.repoUrl)}}{GitHub}`);
        if (proj.liveUrl)
          links.push(`\\href{${escapeLatexUrl(proj.liveUrl)}}{Live Demo}`);
        const linkStr = links.length > 0 ? links.join(" \\quad ") : "";

        latex += `\\begin{tabular*}{\\linewidth}{@{\\extracolsep{\\fill}} l r}
  \\textbf{${escapeLatex(proj.title)}} & ${linkStr}
\\end{tabular*}\\\\
${proj.techStack && proj.techStack.length > 0 ? `\\textit{Tech Stack: ${proj.techStack.map((t) => escapeLatex(t)).join(", ")}}\\\\\n` : ""}`;

        if (proj.bullets && proj.bullets.length > 0) {
          latex += `\\begin{itemize}\n`;
          for (const b of proj.bullets) {
            if (b.trim()) latex += `  \\item ${escapeLatex(b)}\n`;
          }
          latex += `\\end{itemize}\n`;
        }
        latex += `\\vspace{4pt}\n`;
      }
    }

    if (sectionId === "education" && education && education.length > 0) {
      latex += `
\\section{Education}
`;
      for (const edu of education) {
        const dateStr = `${escapeLatex(edu.startDate)} -- ${escapeLatex(edu.endDate)}`;
        latex += `\\noindent \\textbf{${escapeLatex(edu.degree)}}${edu.fieldOfStudy ? `, ${escapeLatex(edu.fieldOfStudy)}` : ""} \\hfill ${dateStr}\\\\
\\textit{${escapeLatex(edu.institution)}${edu.location ? `, ${escapeLatex(edu.location)}` : ""}}${edu.grade ? ` \\; | \\; Grade: ${escapeLatex(edu.grade)}` : ""}\\\\
`;
      }
    }

    if (
      sectionId === "certifications" &&
      certifications &&
      certifications.length > 0
    ) {
      latex += `
\\section{Certifications}
\\begin{itemize}
`;
      for (const cert of certifications) {
        const linkStr = cert.credentialUrl
          ? ` \\hfill \\href{${escapeLatexUrl(cert.credentialUrl)}}{\\mbox{\\faExternalLinkAlt\\ [Verify]}}`
          : "";
        latex += `  \\item \\textbf{${escapeLatex(cert.name)}} -- ${escapeLatex(cert.issuer)} (${escapeLatex(cert.issueDate)})${linkStr}\n`;
      }
      latex += `\\end{itemize}\n`;
    }

    if (
      sectionId === "achievements" &&
      achievements &&
      achievements.length > 0
    ) {
      latex += `
\\section{Achievements}
\\begin{itemize}
`;
      for (const ach of achievements) {
        const linkStr = ach.proofUrl
          ? ` \\hfill \\href{${escapeLatexUrl(ach.proofUrl)}}{\\mbox{\\faExternalLinkAlt\\ [Proof]}}`
          : "";
        latex += `  \\item \\textbf{${escapeLatex(ach.title)}}${ach.description ? `: ${escapeLatex(ach.description)}` : ""}${linkStr}\n`;
      }
      latex += `\\end{itemize}\n`;
    }
  }

  latex += `\n\\end{document}`;
  return latex;
}
