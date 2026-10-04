import nextEnv from "@next/env";
import { PrismaClient } from "@prisma/client";
import { resolveSrv, resolveTxt, lookup } from "node:dns/promises";
import { createConnection } from "node:net";

// Read-only checks. Never print URLs, credentials, account data, or raw errors.
nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
let failures = 0;
function report(ok, label, advice = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${advice ? `: ${advice}` : ""}`);
  if (!ok) failures++;
}

const secret = process.env.JWT_SECRET?.trim();
report(
  Boolean(secret && secret.length >= 32 && !secret.startsWith("replace-with-") &&
    !["your-super-secret-jwt-key-here", "vantory_super_secret_jwt_key_monochrome_2026"].includes(secret)),
  "JWT_SECRET production requirements",
  "Production needs a unique random secret of at least 32 characters.",
);

async function tcp(host, port) {
  await new Promise((resolve, reject) => {
    const socket = createConnection({ host, port });
    socket.setTimeout(5000);
    socket.once("connect", () => { socket.destroy(); resolve(); });
    socket.once("error", (error) => { socket.destroy(); reject(error); });
    socket.once("timeout", () => { socket.destroy(); reject(new Error("timeout")); });
  });
}

async function checkDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    report(false, "MONGODB_URI", "Set it in the environment being tested.");
    return;
  }
  let url;
  try {
    if (uri.startsWith("mongodb+srv://")) url = new URL(uri);
    else if (!uri.startsWith("mongodb://")) throw new Error();
  } catch {
    report(false, "MONGODB_URI format", "Use the Atlas driver connection string.");
    return;
  }
  if (url?.protocol === "mongodb+srv:") {
    const resolverTimeout = setTimeout(() => {
      console.error("FAIL DNS check timed out. Check this network's DNS resolver.");
      process.exit(1);
    }, 10000);
    let nodes;
    try {
      [nodes] = await Promise.all([
        resolveSrv(`_mongodb._tcp.${url.hostname}`),
        resolveTxt(url.hostname).catch((error) => {
          if (error.code !== "ENODATA") throw error;
          return [];
        }),
      ]);
      await Promise.all(nodes.map((node) => lookup(node.name)));
      report(nodes.length > 0, "MongoDB DNS resolution");
    } catch {
      report(false, "MongoDB DNS resolution", "Check the network DNS resolver or use an Atlas-provided standard connection string.");
      return;
    } finally {
      clearTimeout(resolverTimeout);
    }
    const connections = await Promise.allSettled(nodes.map((node) => tcp(node.name, node.port)));
    report(connections.some((result) => result.status === "fulfilled"), "MongoDB TCP reachability",
      "TCP alone does not verify TLS, Atlas IP access, or credentials.");
  }

  // Shorter timeouts apply only to this diagnostic; app configuration is untouched.
  const separator = uri.includes("?") ? "&" : "?";
  const diagnosticUri = `${uri}${separator}serverSelectionTimeoutMS=8000&connectTimeoutMS=5000`;
  const client = new PrismaClient({ datasources: { db: { url: diagnosticUri } }, log: [] });
  try {
    await client.user.findFirst({ select: { id: true } });
    await client.authSession.findFirst({ select: { id: true } });
    report(true, "Prisma user and session reads");
  } catch (error) {
    const message = String(error.message);
    const advice = /authentication failed|P1000/i.test(message)
      ? "Check the Atlas database username/password and URL encoding."
      : /not authorized|unauthorized|P1010/i.test(message)
        ? "Check the database user's permissions."
        : /DNS|lookup|resolve|SRV/i.test(message)
          ? "Check DNS resolution on this network."
          : "Check Atlas IP access, cluster availability, TLS/firewall, and the deployment connection string.";
    report(false, "Prisma database access", advice);
  } finally {
    await client.$disconnect();
  }
}

await checkDatabase();
console.log("This checks configuration and database reads; it does not verify passwords, email delivery, or session writes.");
process.exitCode = failures ? 1 : 0;
