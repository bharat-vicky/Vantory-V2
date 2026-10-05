export interface StudentCsvRow {
  studentId: string; name: string; email: string; department: string; course: string;
  graduationYear?: number; status: "VALID" | "DUPLICATE" | "INVALID"; reason?: string;
}

// Quoted fields may contain commas, line breaks and doubled quotation marks.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], field = "", quoted = false, closed = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else { quoted = false; closed = true; } }
      else field += c;
    } else if (c === ',') { row.push(field.trim()); field = ""; closed = false; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field.trim()); if (row.some(v => v)) rows.push(row);
      row = []; field = ""; closed = false;
    } else if (c === '"' && !field.trim() && !closed) { field = ""; quoted = true; }
    else if (closed && c.trim()) throw new Error("Unexpected text after a quoted CSV field.");
    else if (c === '"') throw new Error("Quote CSV fields containing quotation marks.");
    else field += c;
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field.");
  row.push(field.trim()); if (row.some(v => v)) rows.push(row);
  return rows;
}

export function parseStudentCsv(text: string): StudentCsvRow[] {
  if (text.length > 10 * 1024 * 1024) throw new Error("CSV must be smaller than 10 MB.");
  const [header, ...records] = parseCsv(text);
  if (!header || !records.length) throw new Error("CSV must contain a header and at least one student record.");
  if (records.length > 1000) throw new Error("Import at most 1,000 students at a time.");
  const headers = header.map(v => v.toLowerCase().replace(/[\s_-]/g, ""));
  if (new Set(headers).size !== headers.length) throw new Error("CSV contains duplicate column headers.");
  const index = (...aliases: string[]) => headers.findIndex(h => aliases.includes(h));
  const nameIndex = index("fullname", "name", "studentname", "candidatename");
  const emailIndex = index("email", "emailaddress");
  if (nameIndex < 0 || emailIndex < 0) throw new Error("CSV header must contain fullName and email columns.");
  const idIndex = index("studentid", "id", "roll", "rollnumber");
  const deptIndex = index("department", "dept", "branch"), courseIndex = index("course", "program", "degree");
  const yearIndex = index("graduationyear", "year", "batch");
  const seen = new Set<string>();
  return records.map((cols, i) => {
    const email = (cols[emailIndex] || "").toLowerCase(), name = cols[nameIndex] || "";
    const year = cols[yearIndex] || "";
    const graduationYear = year ? Number(year) : undefined;
    let reason: string | undefined;
    if (cols.length !== header.length) reason = `Row ${i + 2}: expected ${header.length} columns, received ${cols.length}.`;
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) reason = "Invalid or missing email address.";
    else if (!name) reason = "Missing candidate full name.";
    else if (year && (!/^\d{4}$/.test(year) || graduationYear! < 1990 || graduationYear! > 2100)) reason = "Graduation year must be blank or a year from 1990 to 2100.";
    const duplicate = !reason && seen.has(email);
    if (!reason) seen.add(email);
    return {studentId: cols[idIndex] || "", name, email, department: cols[deptIndex] || "", course: cols[courseIndex] || "", graduationYear,
      status: reason ? "INVALID" : duplicate ? "DUPLICATE" : "VALID", reason: reason || (duplicate ? "Duplicate email entry in CSV file." : undefined)};
  });
}
