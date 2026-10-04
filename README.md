# Vantory

A career and recruitment platform for candidates, companies, and academic institutes. Built with Next.js 15, React 19, TypeScript, Tailwind CSS, Prisma 6, MongoDB, and Google Gemini.

Features include resume editing and PDF export, ATS analysis, job applications, AI mock interviews, preparation workspaces, institute analytics, and support tickets.

## Local setup

Use Node.js 22 and npm. Run `npm ci` for reproducible installs using the committed lockfile.

Copy `.env.example` to `.env` and replace placeholders locally. Never commit credentials.

- `MONGODB_URI`: MongoDB Atlas connection string. Prisma transactions require a replica set. URL-encode special characters in credentials.
- `JWT_SECRET`: a unique random secret of at least 32 characters.
- `NEXT_PUBLIC_APP_URL`: `http://localhost:3000` for development.
- Google OAuth, Gemini, and SMTP settings: configure these to enable corresponding features. Authentication emails require working SMTP.

Generate a secret locally:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Initialize the selected development database, then start the app:

```sh
npm run db:generate
npm run db:push
npm run dev
```

Prisma's MongoDB connector uses `db push`, rather than SQL migrations. Database backups are local-only and ignored.

## Checks before pushing

```sh
npm run security:check
npm run security:history
npm run typecheck
npm run lint
npm test
npm run build
npm audit
git status --short
git diff --cached --stat
```

The secret checker scans tracked and non-ignored files for common credential patterns and values from the local `.env`; `security:history` also checks reachable Git objects. It reports paths and credential names without printing values. Pattern checks cannot guarantee detection of every secret. If a credential was committed, rotate it and remove it from history before publishing.

Keep `.env.example`, this README, and technical documentation under `docs/` in the repository. Internal planning and research documents, credentials, local databases, build output, and agent configuration are ignored. Ignore rules do not remove earlier commits; previously committed documents remain available in history.

## Deploy to Vercel

1. Push the reviewed source and lockfile to GitHub, then import the repository into Vercel.
2. Select the **Next.js** framework preset, repository root, and **Node.js 22.x**. Use `npm ci` to install and `npm run build` to build. Keep default Next.js output settings; static export cannot serve this app's API routes.
3. Add environment variables in Vercel before building. Use separate databases and credentials for Preview and Production. Keep production credentials out of untrusted pull request previews.
4. Set `MONGODB_URI`, a random `JWT_SECRET`, and `NEXT_PUBLIC_APP_URL` with the exact HTTPS deployment domain. Configure Atlas network access and a database user with the permissions the app needs.
5. Set Google OAuth credentials and `GOOGLE_REDIRECT_URI` to `https://YOUR-DOMAIN/api/auth/google/callback`. Register that exact callback in Google Cloud. Use separately configured OAuth credentials for previews if needed.
6. Configure `GEMINI_API_KEY`, model names, and SMTP credentials. Set the support recipient and optional `SMTP_FROM`. Only public URLs and contact information belong in `NEXT_PUBLIC_*` variables; this prefix exposes values to browsers.
7. Run `npm run db:push` once from a trusted environment configured for the intended production database. Review schema changes before repeating it. The build generates Prisma Client; it does not change the schema.
8. Deploy and check registration/login, OAuth, password reset and verification emails, resume PDF export, ATS/AI requests, jobs, and support ticket delivery. `/api/health` checks app availability; it does not verify database or provider connectivity.

Optional code execution requires a separately hosted, patched Judge0 service with execution network access disabled. Configure `JUDGE0_URL` and `JUDGE0_TOKEN` only on the server. The rest of the platform, including quizzes, works without this service; code checks remain explicitly unavailable until it is configured.

### Production reliability checks

- Use `GEMINI_MODEL=gemini-3.5-flash-lite` and `INTERVIEW_MODEL=gemini-3.5-flash-lite`, or a reviewed model that is accessible to your API key. The previous `gemini-2.5-flash` default returned HTTP 404 for this project. The transport recovers unavailable legacy 2.5 models with the supported default and records the actual model in assessment metadata.
- Run `node scripts/check-platform-services.mjs` for safe configuration checks. `--list-models` queries supported model names; `--probe-ai` sends a tiny synthetic JSON request. `node --import tsx scripts/check-platform-services.mjs --probe-assessment` validates a synthetic SQL interview answer through the real transport and rubric. These probes use no candidate records but consume a small amount of API usage. Never print environment values or raw provider errors.
- Authentication throttling uses atomic `AuthRateLimit` records in MongoDB rather than instance-local counters. Prisma generation is required after pulling these changes; the normal build already does it. Run `node scripts/setup-rate-limit-index.mjs` once against the target database to create the TTL index for expired counters. This creates an index only in the rate-limit collection; it does not change user/resume/application records. The limiter works without the TTL index, but expired records otherwise need cleanup.
- Basic `/api/health` remains a process-availability check. `GET /api/internal/readiness`, protected by `Authorization: Bearer <CRON_SECRET>` with a secret of at least 32 characters, checks database reachability and reports integration configuration without exposing keys. A `configured_not_probed` integration status is not proof that its provider is healthy.
- `AI_REQUEST_FAILED` and `INTERVIEW_OUTPUT_REJECTED` logs contain failure categories and validation metadata, not candidate content. Use these to distinguish inaccessible models, quota/auth errors, timeouts, incomplete output and invalid response formats.
- Before production release, verify PDF exports and AI feedback in the deployed environment, install the rate-limit TTL index, and review the public data-use and usage-guideline pages with the platform operator. Those pages describe product behavior; commercial terms and a jurisdiction-specific retention policy still need operator review.

### Troubleshoot sign-in availability

`Sign-in is temporarily unavailable.` is the login route's generic HTTP 503 response for an unexpected server error. Invalid credentials produce HTTP 401 with a different message. Check the runtime error after `Login failed due to an unexpected server error.` in Vercel Logs to identify the failing dependency.

Run `npm run auth:check` on each local network. This read-only diagnostic loads environment files using Next.js rules and checks production JWT requirements, MongoDB SRV/TXT and host DNS, TCP reachability, and Prisma user/session reads. It never prints credentials or account data and does not test passwords, SMTP, or database writes. It tests the local configuration, not Vercel's deployed environment.

If only one network works, check Atlas Network Access for that network's public IP, DNS SRV resolution, and outbound MongoDB ports. For Vercel, allow the deployment's outbound addresses in Atlas; allowing only your laptop's IP is insufficient. Standard Vercel deployments use dynamic outbound IPs; MongoDB's [Vercel integration documentation](https://www.mongodb.com/docs/atlas/reference/partner-integrations/vercel/) describes the `0.0.0.0/0` access-list requirement for that setup. This permits connection attempts from any IPv4 address while database authentication remains required; use restricted access when your deployment provides fixed outbound IPs.

Confirm Production has the intended `MONGODB_URI` (including the correct database name), a valid random `JWT_SECRET`, and the HTTPS app URL. Redeploy after changing Vercel environment variables. Unverified accounts also require working SMTP to send verification links. Do not disable password checking or email verification to work around an unavailable dependency.

Support retries use an external scheduler that sends **POST** to `/api/internal/support-dispatch` with `Authorization: Bearer <CRON_SECRET>`. Use an independent random secret of at least 32 characters. Vercel Cron invokes routes using GET, so this POST endpoint cannot be scheduled directly with a Vercel cron entry.

The rate limiter stores counters in process memory. Limits are not shared across Vercel instances and reset on cold starts. Use a shared store before relying on strict global quotas or abuse protection.

### Verification and remaining limitations

The preparation checks passed all 126 unit tests, TypeScript checks, lint (with existing warnings), and a production build. The build ran locally on Node.js 20.15; use Node.js 22 for deployment and repeat external service checks there.

The production dependency audit reports zero vulnerabilities. The full audit still reports seven high severity findings through the unpatched `braces` dependency in Tailwind 3 and ESLint build tooling. Avoid `npm audit fix --force` without reviewing proposed framework and Tailwind major upgrades. Recheck advisories before deployment and plan the tooling upgrade or replacement.

Reference documentation: [Vercel Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [public framework environment variables](https://vercel.com/docs/environment-variables/framework-environment-variables), and [Vercel Cron](https://vercel.com/docs/cron-jobs).
