import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Report paths and credential names only; never print credential values.
const git = (...args) => execFileSync("git", ["-c", `safe.directory=${process.cwd().replaceAll("\\", "/")}`, ...args], { maxBuffer: 128 * 1024 * 1024 });
const patterns = [
  ["Google API key", /AIza[\w-]{35}/],
  ["GitHub token", /(?:gh[pousr]_[\w]{30,}|github_pat_[\w]{40,})/],
  ["AWS access key", /(?:AKIA|ASIA)[A-Z0-9]{16}/],
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["database credentials", /mongodb(?:\+srv)?:\/\/[^\s<>:"/]+:[^\s<>@]+@/],
];
let localSecrets = [];
try {
  localSecrets = readFileSync(".env", "utf8").split(/\r?\n/).flatMap(line => {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || !/(?:SECRET|TOKEN|PASSWORD|PASS|API_KEY|MONGODB_URI)$/.test(match[1])) return [];
    const value = match[2].replace(/^(["'])(.*)\1$/, "$2");
    if (value.length < 12 || /your-|replace-with-|<username>|<password>/.test(value)) return [];
    return [[match[1], value]];
  });
} catch (error) { if (error.code !== "ENOENT") throw error; }
let findings = 0;
const scan = (label, content) => {
  const text = content.toString("utf8");
  const types = patterns.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
  for (const [name, value] of localSecrets) if (text.includes(value)) types.push(`local ${name}`);
  if (types.length) { console.error(`${label}: ${[...new Set(types)].join(", ")}`); findings++; }
};
const files = git("ls-files", "--cached", "--others", "--exclude-standard", "-z").toString().split("\0").filter(Boolean);
for (const file of new Set(files)) {
  if (/(^|\/)\.env(?:\.|$)/.test(file) && file !== ".env.example") {
    console.error(`${file}: environment file included in repository`); findings++;
  }
  try { scan(file, readFileSync(file)); } catch (error) { if (error.code !== "ENOENT") throw error; }
}
if (process.argv.includes("--history")) {
  const entries = git("rev-list", "--objects", "--all").toString().trim().split("\n").filter(Boolean);
  const paths = new Map(entries.map(entry => [entry.split(" ")[0], entry.slice(entry.indexOf(" ") + 1)]));
  const batch = execFileSync("git", ["-c", `safe.directory=${process.cwd().replaceAll("\\", "/")}`, "cat-file", "--batch"], {
    input: [...paths.keys()].join("\n") + "\n", maxBuffer: 256 * 1024 * 1024,
  });
  let offset = 0;
  while (offset < batch.length) {
    const end = batch.indexOf(10, offset);
    const [id, type, length] = batch.subarray(offset, end).toString().split(" ");
    const size = Number(length);
    if (!Number.isFinite(size)) throw new Error("Could not read Git history object.");
    offset = end + 1;
    if (type === "blob") scan(`history ${id.slice(0, 12)} ${paths.get(id)}`, batch.subarray(offset, offset + size));
    offset += size + 1;
  }
}
if (findings) { console.error(`Found ${findings} possible credential exposures. Review before pushing.`); process.exitCode = 1; }
else console.log(`No matches in ${new Set(files).size} publishable files${process.argv.includes("--history") ? " or reachable Git history" : ""}. Pattern checks are not a guarantee against all secrets.`);
