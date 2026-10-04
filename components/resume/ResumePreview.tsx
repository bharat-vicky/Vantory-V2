"use client";

import React from "react";
import { ResumeData, defaultResumeSettings } from "@/lib/resume/types";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

export interface ResumePreviewProps {
  data: ResumeData;
  className?: string;
}

export function ResumePreview({ data, className }: ResumePreviewProps) {
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
  const {
    sectionOrder = defaultResumeSettings.sectionOrder,
    sectionVisibility = defaultResumeSettings.sectionVisibility,
    templateId = "classic-monochrome",
  } = settings || {};

  const isMinimal = templateId === "latex-minimal";
  const isOverleaf = templateId === "latex-classic";
  const fontScale = { sm: 0.9, md: 1, lg: 1.1 }[settings.fontSize || "md"];
  const baseFontSize = isMinimal ? 10 : isOverleaf ? 11.5 : 11;
  const previewMargins = {
    compact: { vertical: "10mm", horizontal: "12mm" },
    normal: { vertical: "14mm", horizontal: "16mm" },
    spacious: { vertical: "18mm", horizontal: "20mm" },
  }[settings.margins || "normal"];
  const scaledFontRules = [
    ...[9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5].map(
      (size) =>
        `#resume-a4-preview [class~="text-[${size}px]"] { font-size: ${size * fontScale}px !important; }`,
    ),
    `#resume-a4-preview .text-xl { font-size: ${20 * fontScale}px !important; }`,
    `#resume-a4-preview .text-2xl { font-size: ${24 * fontScale}px !important; }`,
  ].join("\n");

  const renderSectionTitle = (title: string) => {
    if (isMinimal) {
      return (
        <div className="mt-3 mb-1 block w-full">
          <h2 className="text-[11px] font-bold font-sans text-neutral-900 uppercase tracking-widest block m-0 p-0 leading-tight">
            {title}
          </h2>
          <div className="border-b border-neutral-300 w-full mt-1 mb-2" />
        </div>
      );
    }

    if (isOverleaf) {
      return (
        <div className="mt-3.5 mb-1.5 block w-full">
          <h2 className="text-[12.5px] font-black font-serif text-black uppercase tracking-widest block m-0 p-0 leading-tight">
            {title}
          </h2>
          <div className="border-b-2 border-black w-full mt-1 mb-2" />
        </div>
      );
    }

    return (
      <div className="mt-3.5 mb-1.5 block w-full">
        <h2 className="text-[12px] font-bold font-serif text-black uppercase tracking-wider block m-0 p-0 leading-tight">
          {title}
        </h2>
        <div
          style={{
            borderBottom: "1.2px solid #000000",
            width: "100%",
            marginTop: "3px",
            marginBottom: "4px",
          }}
        />
      </div>
    );
  };

  return (
    <div
      id="resume-a4-preview"
      data-font-size={settings.fontSize || "md"}
      className={cn(
        "bg-white text-black border border-neutral-300 shadow-2xl rounded-sm px-[16mm] py-[14mm] w-[210mm] max-w-[210mm] min-h-[297mm] h-auto shrink-0 leading-relaxed text-left selection:bg-neutral-900 selection:text-white print:p-0 print:border-none print:shadow-none font-serif text-[11px] box-border",
        isMinimal && "font-sans text-[10px] px-[14mm] py-[12mm]",
        isOverleaf && "font-serif text-[11.5px] px-[16mm] py-[15mm]",
        className,
      )}
      style={{
        fontSize: `${baseFontSize * fontScale}px`,
        paddingBlock: previewMargins.vertical,
        paddingInline: previewMargins.horizontal,
      }}
    >
      <style>{scaledFontRules}</style>
      {/* Resume Header */}
      <header className="text-center pb-1 mb-2.5">
        <h1
          className={cn(
            "text-2xl font-bold tracking-tight text-black mb-0.5",
            isMinimal
              ? "font-sans font-extrabold text-xl"
              : "font-serif text-2xl",
          )}
        >
          {personalInfo.fullName || "Your Name"}
        </h1>

        {personalInfo.headline && (
          <p
            className={cn(
              "text-[11.5px] font-medium text-neutral-800 mb-1",
              isMinimal
                ? "font-sans text-[10.5px]"
                : "font-serif text-[11.5px]",
            )}
          >
            {personalInfo.headline}
          </p>
        )}

        {/* Contact Info Row */}
        <div
          className="text-center text-[11px] font-serif text-black my-1"
          style={{
            textAlign: "center",
            fontSize: `${11 * fontScale}px`,
            color: "#000",
          }}
        >
          {personalInfo.location && <span>{personalInfo.location}</span>}

          {personalInfo.location &&
            (personalInfo.email || personalInfo.phone) && (
              <span className="text-neutral-400 font-sans mx-1.5">|</span>
            )}

          {personalInfo.email && (
            <a
              href={`mailto:${personalInfo.email}`}
              className="text-black no-underline hover:underline"
            >
              <span className="mr-1">✉</span>
              <span>{personalInfo.email}</span>
            </a>
          )}

          {personalInfo.email && personalInfo.phone && (
            <span className="text-neutral-400 font-sans mx-1.5">|</span>
          )}

          {personalInfo.phone && <span>{personalInfo.phone}</span>}
        </div>

        {/* Links Row */}
        <div
          className="text-center text-[10.5px] font-serif text-black mt-1"
          style={{
            textAlign: "center",
            fontSize: `${10.5 * fontScale}px`,
            color: "#000",
          }}
        >
          {personalInfo.linkedin && (
            <a
              href={personalInfo.linkedin}
              target="_blank"
              rel="noreferrer"
              className="text-black no-underline hover:underline mx-2"
            >
              <span className="mr-1 font-sans text-[10px]">💼</span>
              <span className="underline">LinkedIn</span>
            </a>
          )}

          {personalInfo.github && (
            <a
              href={personalInfo.github}
              target="_blank"
              rel="noreferrer"
              className="text-black no-underline hover:underline mx-2"
            >
              <span className="mr-1 font-sans text-[10px]">💻</span>
              <span className="underline">GitHub</span>
            </a>
          )}

          {personalInfo.portfolio && (
            <a
              href={personalInfo.portfolio}
              target="_blank"
              rel="noreferrer"
              className="text-black no-underline hover:underline mx-2"
            >
              <span className="mr-1 font-sans text-[10px]">🌐</span>
              <span className="underline">Portfolio</span>
            </a>
          )}

          {personalInfo.leetcode && (
            <a
              href={personalInfo.leetcode}
              target="_blank"
              rel="noreferrer"
              className="text-black no-underline hover:underline mx-2"
            >
              <span className="mr-1 font-mono text-[10px] font-bold">
                &lt;/&gt;
              </span>
              <span className="underline">LeetCode</span>
            </a>
          )}
        </div>
      </header>

      {/* Render Sections in Configured Section Order */}
      <div className="space-y-2.5">
        {sectionOrder.map((sectionId) => {
          if (!sectionVisibility[sectionId]) return null;

          // Professional Summary Section
          if (sectionId === "summary" && summary) {
            return (
              <section key="summary" className="space-y-0.5">
                {renderSectionTitle("Professional Summary")}
                <p className="text-[10.5px] leading-relaxed text-neutral-900 pt-0.5">
                  {summary}
                </p>
              </section>
            );
          }

          // Technical Skills Section
          if (sectionId === "skills" && skills && skills.length > 0) {
            return (
              <section key="skills" className="space-y-0.5">
                {renderSectionTitle("Technical Skills")}
                <ul className="text-[10.5px] space-y-0.5 pt-0.5">
                  {skills.map((cat, idx) => (
                    <li key={cat.id || idx}>
                      <span className="font-bold text-black">
                        {cat.category}:{" "}
                      </span>
                      <span className="text-neutral-900">
                        {cat.skills.join(", ")}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          }

          // Education Section
          if (sectionId === "education" && education && education.length > 0) {
            return (
              <section key="education" className="space-y-1">
                {renderSectionTitle("Education")}
                <div className="space-y-1 pt-0.5">
                  {education.map((edu, idx) => (
                    <div key={edu.id || idx} className="space-y-0.5">
                      <div className="flex justify-between items-baseline text-[11px]">
                        <span className="font-bold text-black">
                          {edu.degree}
                        </span>
                        <span className="text-[10.5px] text-neutral-800">
                          {edu.startDate} – {edu.endDate}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline text-[10.5px] italic text-neutral-800">
                        <span>
                          {edu.institution}
                          {edu.location ? `, ${edu.location}` : ""}
                        </span>
                        {edu.grade && (
                          <span className="not-italic text-[10px] font-mono text-neutral-700">
                            ({edu.grade})
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          }

          // Work Experience Section
          if (
            sectionId === "experience" &&
            experience &&
            experience.length > 0
          ) {
            return (
              <section key="experience" className="space-y-1.5">
                {renderSectionTitle("Work Experience")}
                <div className="space-y-2 pt-0.5">
                  {experience.map((exp, idx) => (
                    <div key={exp.id || idx} className="space-y-0.5">
                      <div className="flex justify-between items-baseline text-[11px]">
                        <span className="font-bold text-black">{exp.role}</span>
                        <span className="text-[10.5px] text-neutral-800">
                          {exp.startDate} –{" "}
                          {exp.isCurrent ? "Present" : exp.endDate}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline italic text-[10.5px] text-neutral-800">
                        <span>{exp.company}</span>
                        {exp.location && <span>{exp.location}</span>}
                      </div>

                      {exp.bullets && exp.bullets.length > 0 && (
                        <ul className="list-disc list-inside text-[10.5px] space-y-0.5 pt-0.5 text-neutral-900 pl-1">
                          {exp.bullets.map((bullet, bIdx) => (
                            <li key={bIdx} className="leading-snug">
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            );
          }

          // Featured Projects Section
          if (sectionId === "projects" && projects && projects.length > 0) {
            return (
              <section key="projects" className="space-y-1.5">
                {renderSectionTitle("Featured Projects")}
                <div className="space-y-2 pt-0.5">
                  {projects.map((proj, idx) => (
                    <div key={proj.id || idx} className="space-y-0.5">
                      <div className="flex justify-between items-baseline text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-black">
                            {proj.title}
                          </span>
                          {proj.liveUrl && (
                            <a
                              href={proj.liveUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-0.5 text-[10px] text-black font-sans font-semibold hover:underline"
                            >
                              <ExternalLink className="w-3 h-3 text-neutral-900" />
                              <span>[Link]</span>
                            </a>
                          )}
                        </div>
                        {proj.techStack && proj.techStack.length > 0 && (
                          <span className="text-[10px] font-mono text-neutral-700">
                            [{proj.techStack.join(", ")}]
                          </span>
                        )}
                      </div>

                      {proj.bullets && proj.bullets.length > 0 && (
                        <ul className="list-disc list-inside text-[10.5px] space-y-0.5 pt-0.5 text-neutral-900 pl-1">
                          {proj.bullets.map((bullet, bIdx) => (
                            <li key={bIdx} className="leading-snug">
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            );
          }

          // Certifications Section
          if (
            sectionId === "certifications" &&
            certifications &&
            certifications.length > 0
          ) {
            return (
              <section key="certifications" className="space-y-1">
                {renderSectionTitle("Certifications")}
                <ul className="text-[10.5px] space-y-0.5 pt-0.5">
                  {certifications.map((cert, idx) => (
                    <li
                      key={cert.id || idx}
                      className="flex justify-between items-baseline"
                    >
                      <div>
                        <span className="font-bold text-black">
                          {cert.name}
                        </span>
                        <span className="text-neutral-800">
                          {" "}
                          – {cert.issuer}
                        </span>
                      </div>
                      {cert.issueDate && (
                        <span className="text-[10px] text-neutral-700">
                          {cert.issueDate}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          }

          // Achievements Section
          if (
            sectionId === "achievements" &&
            achievements &&
            achievements.length > 0
          ) {
            return (
              <section key="achievements" className="space-y-1">
                {renderSectionTitle("Achievements")}
                <ul className="list-disc list-inside text-[10.5px] space-y-0.5 pt-0.5 text-neutral-900 pl-1">
                  {achievements.map((ach, idx) => (
                    <li key={ach.id || idx} className="leading-snug">
                      <span className="font-bold text-black">
                        {ach.title}:{" "}
                      </span>
                      <span>{ach.description}</span>
                      {ach.proofUrl && (
                        <a
                          href={ach.proofUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-black font-sans font-semibold hover:underline ml-2 shrink-0"
                          title="View Proof"
                        >
                          <ExternalLink className="w-3 h-3 text-neutral-900" />
                          <span>[Proof]</span>
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
