# Judge0 on AWS credits

Prepared for the Vantory production integration. This is a dedicated code-execution host, separate from the application and its MongoDB database.

## Reviewed configuration

- Region: `us-east-1`; Ubuntu 22.04 x86_64; `t3.small` (2 vCPU, 2 GB RAM).
- 30 GiB encrypted gp3 root disk, deleted on termination; 2 GB swap.
- T3 CPU credits set to **standard**, avoiding Unlimited surplus-credit charges.
- No IAM role, permanent AWS access keys, load balancer, NAT gateway, or managed database.
- Inbound TCP 80 and 443 for HTTPS certificate issuance and the authenticated API.
- Temporary SSH access only from the AWS EC2 Instance Connect regional managed prefix list; remove this rule after installation and verification.
- Judge0 CE **1.13.1**, the patched release; cgroup v1 and a required reboot.
- PostgreSQL and Redis accessible inside Docker only. Judge0 port 2358 binds to localhost.
- Random server-generated service and database secrets; no secrets in user data or Git.
- Submitted programs cannot enable network access; execution and queue limits are capped. Callbacks and additional files are disabled.
- Each sandbox permits at most 8 processes/threads so Judge0's shell wrapper and the interpreter can start. A limit of 1 prevents the wrapper from forking and makes even `print(1)` time out. CPU, memory, file-size, and wall-time limits still apply.
- HTTPS through Caddy and a public-IP-based `sslip.io` hostname. The hostname must be updated if the instance is stopped and restarted with a different public IP.
- EC2 metadata requires IMDSv2 with hop limit 1 during bootstrap; disable its endpoint after bootstrap, before candidate execution.
- The initial server trial automatically stops after 30 days. The remaining disk still consumes credits until the server is terminated.

## Credit constraint

Deploy only after the AWS console confirms the account is on its Free plan, says **“Your free plan account does not get charged,”** and has sufficient credits and access time for the trial. Do not upgrade the account to a paid plan. Access ends when the free-plan period or credits run out, whichever happens first. Keep account-specific credit balances and resource identifiers in private deployment notes.

Estimated base consumption is approximately **$21–22 per 730-hour month**: T3 small compute about $15.18, public IPv4 $3.65, and 30 GiB gp3 storage $2.40. Data transfer and any other usage consume additional credits. This is an estimate, not an AWS spending cap. The Free plan is the protection against out-of-pocket billing.

## Deployment and verification

Use `bootstrap.sh` as root user data only on this dedicated Ubuntu host. Bootstrap creates a systemd installation service and reboots into cgroup v1 before installing Docker and Judge0. Monitor `/var/log/cloud-init-output.log` and `journalctl -u vantory-judge0-install.service`.

The compiler image is large, and initial extraction can be slow on a new Standard-mode T3 instance. If a brief Unlimited-mode bootstrap burst is authorized within the credit budget, set a short automatic restoration backstop and verify the instance returns to Standard mode before candidate use. Unlimited CPU usage can consume additional credits; it is not enabled by this script.

Before exposing execution to candidates:

Copy `verify.py` to the dedicated host and run it as root to check HTTPS, token enforcement, both exercise fixtures, runtime failures, time limits, and isolation. It reads the host's protected configuration and prints no credentials. A failed check must be investigated before enabling the Vercel integration.

1. Confirm installation completed and HTTPS has a valid certificate.
2. Confirm requests without `X-Auth-Token` fail, and authenticated requests work.
3. Check `/languages` for Python and SQLite IDs; the application currently defaults to 71 and 82.
4. Verify Python and SQL execution, including incorrect answers and runtime failures.
5. Disable the EC2 metadata endpoint and remove temporary SSH access.
6. Transfer only `AUTHN_TOKEN` to the Vercel project's server-side `JUDGE0_TOKEN` environment variable, and set `JUDGE0_URL` from `/opt/vantory-judge0/endpoint.env`. Never use a `NEXT_PUBLIC_` variable for a token.
7. Redeploy Vercel and check both coding exercises on the production site and its runtime logs.

Service secrets are in `/opt/vantory-judge0/judge0-v1.13.1/judge0.conf`, readable only by root. Do not print, commit, screenshot, or paste this file into support messages. Only the execution token belongs in Vercel; the admin, Redis, and PostgreSQL secrets stay on the host.

## Retiring the trial

Remove Vercel's Judge0 configuration, then terminate the dedicated EC2 instance and verify its root disk was deleted. Remove the dedicated security group when no longer attached. Do not delete unrelated AWS resources. Never upgrade the AWS plan to keep the trial running without explicit authorization for paid usage.
