# Upgrade and bug-fix tracker

Scope agreed: the six areas in the Phase 2 roadmap image. The extra repository
notes (Bedrock expansion, Redis, EC2 deployment, Terraform, Kubernetes/
Prometheus infrastructure, and CI) are outside this pass.

## Completed and verified

- **Incident analysis and context**
  - Align `/analyze-incidents` with the dashboard namespace and active incident
    summaries.
  - Correct fallback analysis to use both singular event fields and plural
    incident-summary fields.
  - Remove credential-presence output and log provider failures through the
    service logger.
  - Prevent Gemini/Groq smoke-test scripts from making provider calls during
    pytest collection.
- **Chat context**
  - Add role-validated, bounded conversation history (20 turns, 4,000
    characters per message).
  - Send recent turns from the UI through the configured same-origin backend
    route; provide loading, timeout, invalid-response, and connection errors.
  - Return generic provider errors from the API instead of leaking provider
    exception details.
- **Dashboard**
  - Replace fabricated flat time-series charts with current Prometheus CPU and
    memory usage by node; display unavailable metrics as unavailable.
  - Populate the Alerts section with live Kubernetes warning/event data.
  - Correct pod readiness for pending pods without container statuses,
    completed-pod health, empty-cluster health, and dashboard timeouts.
- **Security/dependencies**
  - Remove Auth.js debug logging that could expose authentication metadata.
  - Upgrade Next.js to 16.4.0 and refresh both npm and pnpm lockfiles. Compatible
    Auth.js and transitive dependency fixes were applied.
  - Map Cognito groups into the session and require an assigned role for
    frontend pages; show a sign-out/recovery page when the account lacks a
    recognized group.
  - Verify Cognito access-token signature, issuer, app-client ID, token type,
    and role on backend API routers; leave the root health check public.
  - Document required auth setup in `AUTHENTICATION.md`.
- **Incident history**
  - Add a private, encrypted single-AZ MySQL RDS module, bounded storage
    autoscaling, Secrets Manager-managed credentials, and EKS-only ingress.
  - Store pod errors, logs, analysis, suggestions, and runbooks by Cognito
    subject; deduplicate repeated event signatures.
  - Add an authenticated, user-scoped frontend History section and document
    deployment in `INCIDENT_HISTORY.md`.
- **Authentication and frontend usability**
  - Add Cognito role enforcement and access-token refresh; unauthorized users
    get a recovery/sign-out page.
  - Improve chat loading and failure feedback, dashboard navigation, and
    accessible controls.
- **Operational docs and linting**
  - Document authentication, incident-history setup, demo procedures, and
    deployment/configuration in the corresponding guides and `README.md`.
  - Add flat ESLint configuration and lint the frontend without the vulnerable
    `eslint-config-next` dependency.
- **Demo scenarios**
  - Document isolated-namespace setup, expected failure signals, inspection,
    and cleanup in `demo-apps/README.md`.
  - Pin the crash demo image and cap the CPU stress workload.

Files and tests are in the current worktree; no commit has been made.

## Validation results

- `python -B -m pytest -q` from `api/`: **12 passed**.
- `npx tsc --noEmit` from `frontend/`: **passed**.
- `npm run build` from `frontend/`: **passed** with type checking enabled.
- `npm run lint` from `frontend/`: **passed** with ESLint 10 flat config.
- `npm audit` from `frontend/`: **0 vulnerabilities** after replacing the
  vulnerable `eslint-config-next` dependency tree.
- All three `demo-apps/**/*.yaml` manifests: **parsed successfully**.
- `terraform fmt -check` and `terraform validate`: **passed**.
- `terraform plan`: **64 to add, 0 to change, 0 to destroy**; no apply was run.
- Deployment and demo YAML manifests: **parsed successfully**.

## Remaining work

- **Live environment validation:** no real Cognito user pool or disposable
  Kubernetes cluster was available. Verify role mapping/token refresh against
  Cognito, and execute demo scenarios on a disposable cluster.
- **Terraform state and provisioning:** the repository has no configured
  remote backend/state. The plan used empty local state and therefore proposes
  recreating the existing VPC/EKS/Cognito resources as well as RDS. Do not
  apply this plan. Configure the correct state/backend and review a fresh plan
  before any provisioning.
- **Incident history connection:** securely create Kubernetes Secret
  `ai-devops-db-secrets` with `DATABASE_URL` sourced from the RDS-managed
  Secrets Manager credentials after approved provisioning. DB connectivity is
  not live-tested; the DB schema currently initializes with SQLAlchemy
  `create_all`, so add migrations before schema evolution.
- **Alert-rule management:** the Alerts view reports Kubernetes events; it
  does not create or manage persistent alert rules. Confirm whether that
  capability is required.
- **Security and Auth:** Basic membership enforcement is implemented. No
  role-specific write/configuration endpoints exist; remediation remains
  suggestion-only as requested. Configure `COGNITO_ISSUER` and
  `COGNITO_CLIENT_ID` in both runtimes and verify with users assigned to each
  Cognito group.

## Resume checklist

1. Configure and validate Cognito sign-in, role claims, and token refresh.
2. Configure the correct Terraform backend/state; review costs and a fresh plan
   before provisioning RDS or any infrastructure.
3. Securely provision/inject `DATABASE_URL` and test incident history against
   the live database.
4. Exercise demo scenarios on a disposable cluster and decide whether
   persistent alert-rule management is required.
