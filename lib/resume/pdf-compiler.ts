import PDFDocument from "pdfkit/js/pdfkit.standalone";
import { ResumeData, defaultResumeSettings } from "./types";

export interface PDFCompilerResult {
  buffer: Buffer;
  pageCount: number;
  fileName: string;
}

/**
 * Compiles structured ResumeData into an industrial-grade, ATS-compatible,
 * vector A4 PDF using strict LaTeX typesetting rules and margins.
 */
export async function compileResumePdf(
  data: ResumeData,
): Promise<PDFCompilerResult> {
  const safeData = data || {};
  const personalInfo = safeData.personalInfo || {
    fullName: "Candidate",
    headline: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    github: "",
    portfolio: "",
    leetcode: "",
  };
  const summary = safeData.summary || "";
  const skills = safeData.skills || [];
  const experience = safeData.experience || [];
  const education = safeData.education || [];
  const projects = safeData.projects || [];
  const certifications = safeData.certifications || [];
  const achievements = safeData.achievements || [];
  const settings = safeData.settings || defaultResumeSettings;
  const sectionOrder =
    settings.sectionOrder || defaultResumeSettings.sectionOrder;
  const sectionVisibility =
    settings.sectionVisibility || defaultResumeSettings.sectionVisibility;

  const marginPresets = {
    compact: { vertical: 28, horizontal: 34 },
    normal: { vertical: 40, horizontal: 45 },
    spacious: { vertical: 52, horizontal: 57 },
  };
  const margins = marginPresets[settings.margins] || marginPresets.normal;
  const fontSizeScale = { sm: 0.9, md: 1, lg: 1.1 }[settings.fontSize];
  const templateScale =
    settings.templateId === "latex-minimal"
      ? 0.91
      : settings.templateId === "latex-classic"
        ? 1.04
        : 1;
  const fontScale = fontSizeScale * templateScale;
  const fonts =
    settings.templateId === "latex-minimal"
      ? {
          regular: "Helvetica",
          bold: "Helvetica-Bold",
          italic: "Helvetica-Oblique",
        }
      : {
          regular: "Times-Roman",
          bold: "Times-Bold",
          italic: "Times-Italic",
        };

  return new Promise((resolve, reject) => {
    try {
      // Create an A4 document with the selected page margins.
      const doc = new PDFDocument({
        size: "A4",
        margins: {
          top: margins.vertical,
          bottom: margins.vertical,
          left: margins.horizontal,
          right: margins.horizontal,
        },
        compress: false,
        info: {
          Title: `${personalInfo.fullName || "Resume"} — Vantory`,
          Author: personalInfo.fullName || "Candidate",
          Subject: "Professional Candidate Resume — Vantory Platform",
          Keywords: "Resume, ATS, Curriculum Vitae, Professional, Vantory",
          Creator: "Vantory PDFKit Resume Engine",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => {
        const buffer = Buffer.concat(chunks);
        const pageCount = doc.bufferedPageRange().count || 1;
        const fileName = `${(personalInfo.fullName || "Resume").replace(/\s+/g, "_")}_Vantory.pdf`;
        resolve({ buffer, pageCount, fileName });
      });
      doc.on("error", (err: Error) => reject(err));

      const margin = margins.horizontal;
      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const contentWidth = pageWidth - margin * 2;
      const maxUsableY = pageHeight - margins.vertical - 10;

      // Page Break Guard Helper
      const ensureSpace = (neededHeight: number) => {
        if (doc.y + neededHeight > maxUsableY) {
          doc.addPage();
        }
      };

      // --- 1. HEADER SECTION ---
      doc
        .font(fonts.bold)
        .fontSize(22 * fontScale)
        .fillColor("#000000");
      doc.text(personalInfo.fullName || "Your Name", { align: "center" });

      if (personalInfo.headline) {
        doc.moveDown(0.15);
        doc
          .font(fonts.regular)
          .fontSize(10.5 * fontScale)
          .fillColor("#333333");
        doc.text(personalInfo.headline, { align: "center" });
      }

      // Contact Line 1 (Location | Email | Phone)
      const contactItems: { text: string; link?: string }[] = [];
      if (personalInfo.location)
        contactItems.push({ text: personalInfo.location });
      if (personalInfo.email)
        contactItems.push({
          text: personalInfo.email,
          link: `mailto:${personalInfo.email}`,
        });
      if (personalInfo.phone) contactItems.push({ text: personalInfo.phone });

      if (contactItems.length > 0) {
        doc.moveDown(0.25);
        doc
          .font(fonts.regular)
          .fontSize(9.5 * fontScale)
          .fillColor("#222222");
        let startX = margin;
        const contactY = doc.y;

        let totalW = 0;
        contactItems.forEach((item, idx) => {
          totalW += doc.widthOfString(item.text);
          if (idx < contactItems.length - 1)
            totalW += doc.widthOfString("   |   ");
        });
        startX = Math.max(margin, (pageWidth - totalW) / 2);

        doc.text("", startX, contactY, { continued: true });
        contactItems.forEach((item, idx) => {
          if (item.link) {
            doc.text(item.text, {
              link: item.link,
              underline: false,
              continued: idx < contactItems.length - 1,
            });
          } else {
            doc.text(item.text, { continued: idx < contactItems.length - 1 });
          }
          if (idx < contactItems.length - 1) {
            doc.text("   |   ", { continued: true });
          }
        });
        doc.text("");
      }

      // Contact Line 2 Social Links (LinkedIn  GitHub  Portfolio  LeetCode) - Native PDFKit Vector Icons
      const socialItems: {
        id: "linkedin" | "github" | "portfolio" | "leetcode";
        label: string;
        url: string;
      }[] = [];
      if (personalInfo.linkedin)
        socialItems.push({
          id: "linkedin",
          label: "LinkedIn",
          url: personalInfo.linkedin,
        });
      if (personalInfo.github)
        socialItems.push({
          id: "github",
          label: "GitHub",
          url: personalInfo.github,
        });
      if (personalInfo.portfolio)
        socialItems.push({
          id: "portfolio",
          label: "Portfolio",
          url: personalInfo.portfolio,
        });
      if (personalInfo.leetcode)
        socialItems.push({
          id: "leetcode",
          label: "LeetCode",
          url: personalInfo.leetcode,
        });

      if (socialItems.length > 0) {
        doc.moveDown(0.25);
        doc.font(fonts.regular).fontSize(9.5 * fontScale);

        const iconWidth = 10;
        const iconTextGap = 3;
        const itemSpacing = 18;

        let totalSocialW = 0;
        const itemWidths: number[] = socialItems.map((item) => {
          const textW =
            item.id === "leetcode"
              ? doc.widthOfString("</> LeetCode")
              : doc.widthOfString(item.label);
          return (item.id === "leetcode" ? 0 : iconWidth + iconTextGap) + textW;
        });

        totalSocialW =
          itemWidths.reduce((a, b) => a + b, 0) +
          (socialItems.length - 1) * itemSpacing;
        let currentX = Math.max(margin, (pageWidth - totalSocialW) / 2);
        const currentY = doc.y;

        socialItems.forEach((item, idx) => {
          if (item.id === "linkedin") {
            // Draw Briefcase Icon
            doc.save();
            doc.lineWidth(0.8).strokeColor("#000000").fillColor("#000000");
            doc.roundedRect(currentX, currentY + 2.5, 9, 6.5, 1).stroke();
            doc.rect(currentX + 3, currentY + 1, 3, 1.5).stroke();
            doc
              .moveTo(currentX, currentY + 5.5)
              .lineTo(currentX + 9, currentY + 5.5)
              .stroke();
            doc.restore();

            doc
              .font(fonts.regular)
              .fontSize(9.5 * fontScale)
              .fillColor("#000000");
            doc.text(item.label, currentX + iconWidth + iconTextGap, currentY, {
              link: item.url,
              underline: true,
              continued: false,
            });
          } else if (item.id === "github") {
            // Draw Laptop Icon
            doc.save();
            doc.lineWidth(0.8).strokeColor("#000000");
            doc.rect(currentX + 1, currentY + 2, 7, 5).stroke();
            doc
              .moveTo(currentX, currentY + 7.5)
              .lineTo(currentX + 9, currentY + 7.5)
              .stroke();
            doc.restore();

            doc
              .font(fonts.regular)
              .fontSize(9.5 * fontScale)
              .fillColor("#000000");
            doc.text(item.label, currentX + iconWidth + iconTextGap, currentY, {
              link: item.url,
              underline: true,
              continued: false,
            });
          } else if (item.id === "portfolio") {
            // Draw Globe Icon
            doc.save();
            doc.lineWidth(0.7).strokeColor("#000000");
            doc.circle(currentX + 4.5, currentY + 5, 4).stroke();
            doc
              .moveTo(currentX + 0.5, currentY + 5)
              .lineTo(currentX + 8.5, currentY + 5)
              .stroke();
            doc
              .moveTo(currentX + 4.5, currentY + 1)
              .lineTo(currentX + 4.5, currentY + 9)
              .stroke();
            doc.restore();

            doc
              .font(fonts.regular)
              .fontSize(9.5 * fontScale)
              .fillColor("#000000");
            doc.text(item.label, currentX + iconWidth + iconTextGap, currentY, {
              link: item.url,
              underline: true,
              continued: false,
            });
          } else if (item.id === "leetcode") {
            // </> Code Icon + LeetCode
            doc
              .font(fonts.bold)
              .fontSize(9.5 * fontScale)
              .fillColor("#000000");
            doc.text("</> ", currentX, currentY, {
              underline: false,
              continued: true,
            });
            doc
              .font(fonts.regular)
              .fontSize(9.5 * fontScale)
              .fillColor("#000000");
            doc.text(item.label, {
              link: item.url,
              underline: true,
              continued: false,
            });
          }

          currentX += itemWidths[idx] + itemSpacing;
        });

        doc.y = currentY + 14;
      }

      doc.moveDown(0.2);

      // Section Renderer Helper (Deterministic 4-6pt spacing & 0.75pt divider)
      const renderSectionHeading = (title: string) => {
        ensureSpace(35);
        doc.moveDown(0.3);
        doc
          .font(fonts.bold)
          .fontSize(11 * fontScale)
          .fillColor("#000000");
        doc.text(title.toUpperCase(), margin, doc.y, { align: "left" });

        const currentY = doc.y + 3;
        doc.lineWidth(0.75).strokeColor("#000000");
        doc
          .moveTo(margin, currentY)
          .lineTo(pageWidth - margin, currentY)
          .stroke();
        doc.y = currentY + 6;
      };

      // --- DYNAMIC SECTIONS RENDERER ---
      for (const sectionId of sectionOrder) {
        if (!sectionVisibility[sectionId]) continue;

        // --- SUMMARY ---
        if (sectionId === "summary" && summary) {
          renderSectionHeading("Professional Summary");
          doc
            .font(fonts.regular)
            .fontSize(9.5 * fontScale)
            .fillColor("#111111")
            .lineGap(2);
          doc.text(summary, margin, doc.y, {
            width: contentWidth,
            align: "left",
          });
        }

        // --- SKILLS ---
        if (sectionId === "skills" && skills && skills.length > 0) {
          renderSectionHeading("Technical Skills");
          doc
            .font(fonts.regular)
            .fontSize(9.5 * fontScale)
            .fillColor("#111111")
            .lineGap(2.5);

          for (const cat of skills) {
            if (cat.skills && cat.skills.length > 0) {
              ensureSpace(16);
              const joinedSkills = cat.skills.join(", ");
              doc
                .font(fonts.bold)
                .text(`${cat.category}: `, margin, doc.y, { continued: true });
              doc.font(fonts.regular).text(joinedSkills);
              doc.y += 2.5;
            }
          }
        }

        // --- EXPERIENCE ---
        if (sectionId === "experience" && experience && experience.length > 0) {
          renderSectionHeading("Work Experience");

          for (const exp of experience) {
            ensureSpace(45);
            const dateStr = `${exp.startDate || ""} – ${exp.isCurrent ? "Present" : exp.endDate || ""}`;

            // Left Role / Right Date
            const roleY = doc.y;
            doc
              .font(fonts.bold)
              .fontSize(10 * fontScale)
              .fillColor("#000000");
            doc.text(exp.role, margin, roleY, { width: contentWidth - 120 });

            doc
              .font(fonts.regular)
              .fontSize(10 * fontScale)
              .fillColor("#000000");
            doc.text(dateStr, margin, roleY, {
              width: contentWidth,
              align: "right",
            });

            // Company (Left) / Location (Right)
            const afterRoleY = Math.max(doc.y, roleY + 13);
            const compName = exp.company || "";
            const compLoc = exp.location || "";

            doc
              .font(fonts.italic)
              .fontSize(9.5 * fontScale)
              .fillColor("#333333");
            doc.text(compName, margin, afterRoleY, {
              width: contentWidth - 140,
            });

            if (compLoc) {
              doc
                .font(fonts.italic)
                .fontSize(9.5 * fontScale)
                .fillColor("#333333");
              doc.text(compLoc, margin, afterRoleY, {
                width: contentWidth,
                align: "right",
              });
            }

            // Bullets
            if (exp.bullets && exp.bullets.length > 0) {
              doc.moveDown(0.2);
              doc
                .font(fonts.regular)
                .fontSize(9.5 * fontScale)
                .fillColor("#111111")
                .lineGap(2);
              for (const b of exp.bullets) {
                if (b.trim()) {
                  ensureSpace(18);
                  doc.text(`•   ${b.trim()}`, margin + 12, doc.y, {
                    width: contentWidth - 12,
                  });
                }
              }
            }
            doc.moveDown(0.4);
          }
        }

        // --- PROJECTS ---
        if (sectionId === "projects" && projects && projects.length > 0) {
          renderSectionHeading("Projects");

          for (const proj of projects) {
            ensureSpace(45);

            const projY = doc.y;
            doc
              .font(fonts.bold)
              .fontSize(10 * fontScale)
              .fillColor("#000000");
            doc.text(proj.title, margin, projY, { width: contentWidth - 160 });

            // Links (GitHub   Live Demo) right-aligned like Image 1
            const links: { label: string; url: string }[] = [];
            if (proj.repoUrl)
              links.push({ label: "GitHub", url: proj.repoUrl });
            if (proj.liveUrl)
              links.push({ label: "Live Demo", url: proj.liveUrl });

            if (links.length > 0) {
              doc
                .font(fonts.regular)
                .fontSize(9.5 * fontScale)
                .fillColor("#000000");
              let linkW = 0;
              links.forEach((l, idx) => {
                linkW += doc.widthOfString(l.label);
                if (idx < links.length - 1) linkW += doc.widthOfString("   ");
              });

              doc.text("", pageWidth - margin - linkW, projY, {
                continued: true,
              });
              links.forEach((l, idx) => {
                doc.text(l.label, {
                  link: l.url,
                  underline: false,
                  continued: idx < links.length - 1,
                });
                if (idx < links.length - 1)
                  doc.text("   ", { continued: true });
              });
              doc.text("");
            }

            // Tech Stack line
            const afterTitleY = Math.max(doc.y, projY + 13);
            if (proj.techStack && proj.techStack.length > 0) {
              doc
                .font(fonts.italic)
                .fontSize(9.5 * fontScale)
                .fillColor("#333333");
              doc.text(proj.techStack.join(", "), margin, afterTitleY);
            }

            // Bullets
            if (proj.bullets && proj.bullets.length > 0) {
              doc.moveDown(0.2);
              doc
                .font(fonts.regular)
                .fontSize(9.5 * fontScale)
                .fillColor("#111111")
                .lineGap(2);
              for (const b of proj.bullets) {
                if (b.trim()) {
                  ensureSpace(18);
                  doc.text(`•   ${b.trim()}`, margin + 12, doc.y, {
                    width: contentWidth - 12,
                  });
                }
              }
            }
            doc.moveDown(0.4);
          }
        }

        // --- EDUCATION ---
        if (sectionId === "education" && education && education.length > 0) {
          renderSectionHeading("Education");

          for (const edu of education) {
            ensureSpace(30);
            const eduY = doc.y;
            const dateStr = `${edu.startDate || ""} – ${edu.endDate || ""}`;

            doc
              .font(fonts.bold)
              .fontSize(10 * fontScale)
              .fillColor("#000000");
            const degreeText = `${edu.degree}${edu.fieldOfStudy ? `, ${edu.fieldOfStudy}` : ""}`;
            doc.text(degreeText, margin, eduY, { width: contentWidth - 120 });

            doc
              .font(fonts.regular)
              .fontSize(10 * fontScale)
              .fillColor("#000000");
            doc.text(dateStr, margin, eduY, {
              width: contentWidth,
              align: "right",
            });

            const afterDegreeY = Math.max(doc.y, eduY + 13);
            const instText = `${edu.institution}${edu.location ? `, ${edu.location}` : ""}`;
            doc
              .font(fonts.italic)
              .fontSize(9.5 * fontScale)
              .fillColor("#333333");
            doc.text(instText, margin, afterDegreeY, {
              width: contentWidth - 120,
            });

            if (edu.grade) {
              doc
                .font(fonts.regular)
                .fontSize(9.5 * fontScale)
                .fillColor("#333333");
              doc.text(`(${edu.grade})`, margin, afterDegreeY, {
                width: contentWidth,
                align: "right",
              });
            }
            doc.moveDown(0.3);
          }
        }

        // --- CERTIFICATIONS ---
        if (
          sectionId === "certifications" &&
          certifications &&
          certifications.length > 0
        ) {
          renderSectionHeading("Certifications");

          for (const cert of certifications) {
            ensureSpace(20);
            const certY = doc.y;
            const certTitle = `${cert.name} — ${cert.issuer} (${cert.issueDate || ""})`;

            doc
              .font(fonts.bold)
              .fontSize(9.5 * fontScale)
              .fillColor("#000000");
            doc.text(certTitle, margin, certY, { width: contentWidth - 100 });

            if (cert.credentialUrl) {
              doc
                .font(fonts.bold)
                .fontSize(9.5 * fontScale)
                .fillColor("#000000");
              const labelText = "[Verify]";
              const labelW = doc.widthOfString(labelText);
              const linkX = pageWidth - margin - labelW - 9;

              // Draw Top-Right Arrow Vector Icon
              doc.save();
              doc.lineWidth(0.8).strokeColor("#000000");
              doc
                .moveTo(linkX, certY + 7)
                .lineTo(linkX + 6, certY + 1)
                .stroke();
              doc
                .moveTo(linkX + 2, certY + 1)
                .lineTo(linkX + 6, certY + 1)
                .lineTo(linkX + 6, certY + 5)
                .stroke();
              doc.restore();

              doc.text(labelText, linkX + 9, certY, {
                link: cert.credentialUrl,
                underline: false,
              });
            }
            doc.moveDown(0.3);
          }
        }

        // --- ACHIEVEMENTS ---
        if (
          sectionId === "achievements" &&
          achievements &&
          achievements.length > 0
        ) {
          renderSectionHeading("Achievements");

          for (const ach of achievements) {
            ensureSpace(22);
            const achY = doc.y;

            doc
              .font(fonts.bold)
              .fontSize(9.5 * fontScale)
              .fillColor("#000000");
            doc.text(`${ach.title}: `, margin, achY, {
              continued: !!ach.description,
            });

            if (ach.description) {
              doc
                .font(fonts.regular)
                .fontSize(9.5 * fontScale)
                .fillColor("#111111");
              doc.text(ach.description, { width: contentWidth - 100 });
            }

            if (ach.proofUrl) {
              doc
                .font(fonts.bold)
                .fontSize(9.5 * fontScale)
                .fillColor("#000000");
              const labelText = "[Proof]";
              const labelW = doc.widthOfString(labelText);
              const linkX = pageWidth - margin - labelW - 9;

              // Draw Top-Right Arrow Vector Icon
              doc.save();
              doc.lineWidth(0.8).strokeColor("#000000");
              doc
                .moveTo(linkX, achY + 7)
                .lineTo(linkX + 6, achY + 1)
                .stroke();
              doc
                .moveTo(linkX + 2, achY + 1)
                .lineTo(linkX + 6, achY + 1)
                .lineTo(linkX + 6, achY + 5)
                .stroke();
              doc.restore();

              doc.text(labelText, linkX + 9, achY, {
                link: ach.proofUrl,
                underline: false,
              });
            }
            doc.moveDown(0.3);
          }
        }
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
