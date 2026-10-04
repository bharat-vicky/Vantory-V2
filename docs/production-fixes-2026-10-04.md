# Vantory reliability fixes — 4 October 2026

These changes are implemented in the local project. They have **not been pushed or deployed to Vercel**. Existing user changes to `package.json`, the README, and the authentication diagnostic script were preserved.

## Problems addressed

| Area | Cause and correction |
| --- | --- |
| AI assessments | The configured Gemini 2.5 model returned HTTP 404 with this key. The available Gemini 3.5 Flash Lite model passed a real provider probe. Requests now use bounded retries, sanitized diagnostics, and provider-enforced output schemas. A real interview assessment also passed after fixing the expected string answer outline. Legacy 2.5 model names can recover from 404 once; permission and quota errors do not trigger a model switch. |
| Mobile navigation | An unstable close callback retriggered the drawer effect. The callback is stable, and the drawer now supports Escape, contained keyboard focus, focus restoration, and inaccessible background content while open. |
| ATS results | Historical reports could appear to describe newly selected inputs. Reports now show their original resume, role, date, and description and mark changed inputs or resume revisions as needing another analysis. The improve-resume link follows the report's resume. |
| Saved jobs | Saved-job responses did not include application state. Existing applications now link to their application view; expired or closed jobs cannot offer a new application. |
| Dashboard errors | Failed requests looked like empty results. Failures now show an explicit retry state and unavailable metrics rather than false zeroes. |
| Resume editing | Added an autosaved resume name with server validation. Corrected one-page preview rounding and contained A4 preview overflow. |
| Authentication | Login and account recovery now use atomic, shared MongoDB rate-limit counters rather than relying on one server process. Identifiers are hashed, and database failures fail closed. |
| Operational checks | Added a secret-protected readiness endpoint distinguishing database reachability from unprobed AI/runner configuration, plus safe diagnostic scripts. |
| Product clarity | Fixed currency/bullet encoding, replaced placeholder information links with data-use/security/usage/browser-storage pages, labeled illustrative examples and planned subscription offerings, and corrected unsupported PDF and assessment claims. |
| Code execution | Runner configuration is validated, with a clear unavailable state when absent. No substitute execution or invented results are supplied. |

## Verification completed

- 139 automated tests passed, with zero failures.
- Production build passed compilation, type checking, lint checks, and static page generation. There are 15 existing non-blocking lint warnings.
- Real Gemini model and full interview assessment probes passed. These used synthetic content, not the candidate's resume or answers.
- Browser checks passed for local candidate login, persistent mobile navigation, drawer Escape behavior, ATS stale-result messaging, one-page resume preview, and saved-job links to existing applications.
- A temporary test bookmark was removed after verification.
- The MongoDB TTL index for the new authentication counters was created on the connected database. It expires temporary rate-limit counters, not candidate records.

## Deployment and remaining scope

1. Review and deploy this local change set through the existing Git/Vercel workflow. The live Vercel site still runs its previous code.
2. Keep Gemini credentials in environment settings. Set `GEMINI_MODEL` and `INTERVIEW_AI_MODEL` to `gemini-3.5-flash-lite`, or use the updated defaults. The diagnostic script can verify the model available to the configured key.
3. Configure a sufficiently strong `CRON_SECRET` to use `/api/internal/readiness`. Configured provider status does not prove an external provider is healthy.
4. Judge0 is optional for the platform as a whole. It is required only for executing and automatically scoring code submissions. Without it, login, resumes, ATS, jobs, interviews, and knowledge checks remain available. Connect a secured external runner later when code execution is needed.
5. Full commercial terms, operational retention/deletion decisions, and any future subscription checkout still require product-owner work. The new information pages describe current behavior and do not implement automatic account deletion or billing.

This work addresses the observed candidate issues; it does not establish that every administrator/institute workflow or third-party integration has been tested.
