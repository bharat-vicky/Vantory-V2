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

Optional code execution requires a separately hosted, patched Judge0 service with execution network access disabled. Configure `JUDGE0_URL` and `JUDGE0_TOKEN` only on the server.

Support retries use an external scheduler that sends **POST** to `/api/internal/support-dispatch` with `Authorization: Bearer <CRON_SECRET>`. Use an independent random secret of at least 32 characters. Vercel Cron invokes routes using GET, so this POST endpoint cannot be scheduled directly with a Vercel cron entry.

The rate limiter stores counters in process memory. Limits are not shared across Vercel instances and reset on cold starts. Use a shared store before relying on strict global quotas or abuse protection.

### Verification and remaining limitations

The preparation checks passed all 126 unit tests, TypeScript checks, lint (with existing warnings), and a production build. The build ran locally on Node.js 20.15; use Node.js 22 for deployment and repeat external service checks there.

The production dependency audit reports zero vulnerabilities. The full audit still reports seven high severity findings through the unpatched `braces` dependency in Tailwind 3 and ESLint build tooling. Avoid `npm audit fix --force` without reviewing proposed framework and Tailwind major upgrades. Recheck advisories before deployment and plan the tooling upgrade or replacement.

Reference documentation: [Vercel Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [public framework environment variables](https://vercel.com/docs/environment-variables/framework-environment-variables), and [Vercel Cron](https://vercel.com/docs/cron-jobs).
