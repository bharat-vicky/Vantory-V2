import { ResumeData } from "./types";

type ResumePathSegment = string | number;

interface TextMatch {
  path: ResumePathSegment[];
  value: string;
  start: number;
}

interface EditableTextField {
  path: ResumePathSegment[];
  value: string | undefined;
}

function getEditableTextFields(data: ResumeData): EditableTextField[] {
  return [
    { path: ["summary"], value: data.summary },
    { path: ["personalInfo", "headline"], value: data.personalInfo.headline },
    ...data.skills.flatMap((category, categoryIndex) => [
      {
        path: ["skills", categoryIndex, "category"],
        value: category.category,
      },
      ...category.skills.map((skill, skillIndex) => ({
        path: ["skills", categoryIndex, "skills", skillIndex],
        value: skill,
      })),
    ]),
    ...data.experience.flatMap((item, index) => [
      { path: ["experience", index, "role"], value: item.role },
      { path: ["experience", index, "description"], value: item.description },
      ...item.bullets.map((bullet, bulletIndex) => ({
        path: ["experience", index, "bullets", bulletIndex],
        value: bullet,
      })),
    ]),
    ...data.education.flatMap((item, index) => [
      { path: ["education", index, "degree"], value: item.degree },
      { path: ["education", index, "fieldOfStudy"], value: item.fieldOfStudy },
      { path: ["education", index, "coursework"], value: item.coursework },
    ]),
    ...data.projects.flatMap((item, index) => [
      { path: ["projects", index, "title"], value: item.title },
      { path: ["projects", index, "description"], value: item.description },
      ...item.techStack.map((technology, technologyIndex) => ({
        path: ["projects", index, "techStack", technologyIndex],
        value: technology,
      })),
      ...item.bullets.map((bullet, bulletIndex) => ({
        path: ["projects", index, "bullets", bulletIndex],
        value: bullet,
      })),
    ]),
    ...data.certifications.flatMap((item, index) => [
      { path: ["certifications", index, "name"], value: item.name },
      { path: ["certifications", index, "issuer"], value: item.issuer },
    ]),
    ...data.achievements.flatMap((item, index) => [
      { path: ["achievements", index, "title"], value: item.title },
      { path: ["achievements", index, "description"], value: item.description },
    ]),
  ];
}

function findTextMatches(data: ResumeData, searchText: string): TextMatch[] {
  if (!searchText) return [];

  const matches: TextMatch[] = [];
  for (const field of getEditableTextFields(data)) {
    if (typeof field.value !== "string") continue;

    let start = field.value.indexOf(searchText);
    while (start !== -1) {
      matches.push({ path: field.path, value: field.value, start });
      start = field.value.indexOf(searchText, start + searchText.length);
    }
  }

  return matches;
}

export function replaceUniqueResumeText(
  resumeData: ResumeData,
  selectedText: string,
  replacementText: string,
): { resumeData: ResumeData | null; matchCount: number } {
  const matches = findTextMatches(resumeData, selectedText.trim());
  if (matches.length !== 1)
    return { resumeData: null, matchCount: matches.length };

  const match = matches[0];
  const updated = JSON.parse(JSON.stringify(resumeData)) as ResumeData;
  let target: unknown = updated;

  for (const segment of match.path.slice(0, -1)) {
    if (!target || typeof target !== "object") {
      return { resumeData: null, matchCount: 0 };
    }
    target = (target as Record<string | number, unknown>)[segment];
  }

  const lastSegment = match.path[match.path.length - 1];
  if (!target || typeof target !== "object" || lastSegment === undefined) {
    return { resumeData: null, matchCount: 0 };
  }

  (target as Record<string | number, unknown>)[lastSegment] =
    `${match.value.slice(0, match.start)}${replacementText}${match.value.slice(match.start + selectedText.trim().length)}`;

  return { resumeData: updated, matchCount: 1 };
}
