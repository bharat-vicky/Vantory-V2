import type { UnifiedParsedResume } from "./resume-parser";
import { skillsInText } from "../taxonomy/text-skills";

const dateToken = "(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\.?\\s+)?(?:19|20)\\d{2}(?:[-/]\\d{1,2})?";
const rangePattern = new RegExp(`(${dateToken})\\s*(?:[-–—]|to)\\s*(${dateToken}|Present|Current|Now)`, "i");

export function dateRange(text: string) {
  const match = text.match(rangePattern);
  return match ? { startDate: match[1], endDate: match[2], label: match[0] } : null;
}

export function parseExperienceLines(lines: string[]): UnifiedParsedResume["experiences"] {
  const entries: UnifiedParsedResume["experiences"] = [];
  let current: UnifiedParsedResume["experiences"][number] | undefined;
  let pending: string[] = [];
  const makeEntry = (header: string[], dates?: ReturnType<typeof dateRange>) => {
    const heading = header.join(" ").replace(dates?.label || /$^/, "").replace(/[()|]+/g, " ").trim();
    const at = heading.match(/^(.*?)\s+(?:at|@)\s+(.+)$/i);
    return { role: at?.[1]?.trim() || (header[0] || "").replace(dates?.label || /$^/, "").replace(/[()|]+/g, " ").trim(), company: at?.[2]?.trim() || header[1]?.trim() || "", location: "", startDate: dates?.startDate || "", endDate: dates?.endDate || "", description: "", bullets: [] as string[] };
  };
  for (const line of lines) {
    const dates = dateRange(line);
    if (dates) {
      const header = line.replace(dates.label, "").replace(/[()|]+/g, " ").trim();
      current = makeEntry([...pending, ...(header ? [header] : [])], dates);
      pending = []; entries.push(current); continue;
    }
    if (/^[•*\-]\s*/.test(line)) {
      if (!current) { current = makeEntry(pending); entries.push(current); pending = []; }
      current.bullets.push(line.replace(/^[•*\-]\s*/, ""));
    } else if (current && /^(built|developed|implemented|created|analysed|analyzed|led|managed|designed|worked|improved|reduced|delivered)\b/i.test(line)) {
      current.bullets.push(line);
    } else {
      pending.push(line);
    }
  }
  if (pending.length) {
    if (current) current.description = pending.join(" ");
    else entries.push(makeEntry(pending));
  }
  return entries;
}

export function parseEducationLines(lines: string[]): UnifiedParsedResume["education"] {
  const entries: UnifiedParsedResume["education"] = [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (!/bachelor|master|doctor|ph\.?d|b\.?\s?tech|m\.?\s?tech|b\.?\s?e\b|b\.?\s?s\b|bca|mca|bsc|msc|diploma|degree/i.test(line)) continue;
    const dates = dateRange(line) || dateRange(lines[index + 1] || "");
    const institution = [lines[index - 1], line, lines[index + 1]].find(value => value && /university|college|institute|school/i.test(value)) || "";
    entries.push({ degree: line.replace(dates?.label || /$^/, "").trim(), fieldOfStudy: "", institution, startDate: dates?.startDate || "", endDate: dates?.endDate || "" });
  }
  return entries;
}

export function parseProjectLines(lines: string[]): UnifiedParsedResume["projects"] {
  if (!lines.length) return [];
  return [{ title: lines[0].replace(/^[•*\-]\s*/, ""), techStack: skillsInText(lines.join(" ")), description: "", bullets: lines.slice(1).map(line => line.replace(/^[•*\-]\s*/, "")) }];
}
