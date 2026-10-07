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
  - Report missing Groq configuration separately from provider authentication
    failures; use the available `openai/gpt-oss-20b` Groq model by default
    instead of the unavailable `llama-3.3-70b-versatile`.
  - Reuse the Kubernetes API client and collect pod/event/log context
    concurrently to reduce incident-scan latency.
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
  - Deploy the application with a dedicated least-privilege MySQL user over
    verified TLS to the existing private RDS instance; keep the database URL
    in a Kubernetes Secret.
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
- **EKS demo deployment**
  - Build and publish versioned API/frontend images to ECR.
  - Deploy API and frontend with readiness/liveness probes, in-cluster API
    proxying, and narrowly scoped RBAC for pod/event/log reads.
  - Only show warning events as active incidents while their pods are currently
    unready; retained startup-probe warnings from ready pods no longer appear
    as active.
  - Keep both Services internal (`ClusterIP`) and document localhost
    `kubectl port-forward` access to avoid public load-balancer/CDN charges.
  - Isolate EKS Auth.js cookies from a concurrently running local frontend and
    add the port-forward callback URL to the existing Cognito client.
- **Public read-only showcase**
  - Add a separate demo-only frontend deployment; its page allowlist does not
    expose the private Cognito dashboard, and Auth.js endpoints are disabled
    in the public demo.
  - Add a public status API limited to deployment readiness and sanitized pod
    state in `ai-devops`, with a ten-second cache and namespace-scoped
    deployment read permission.
  - Define a separate internet-facing NLB Service for the demo. The public
    endpoint is HTTP-only and incurs AWS load-balancer charges; it does not
    provide Cognito login. The current signed-in application remains private.

Files and tests are in the current worktree; no commit has been made.

## Validation results

- `python -B -m pytest -q` from `api/`: **12 passed**.
- `python -m pytest -q` from `api/`: **15 passed**, including regressions for
  concurrent incident collection, Kubernetes client reuse, and missing-key
  error classification.
- Live authenticated API checks: chat returned a response with conversation
  history, pod/event reads and history reads returned `200`, and an
  unauthenticated pod request returned `401`. Local history currently uses
  SQLite; this does not verify the provisioned RDS connection.
- Live infrastructure inspection: EKS is `ACTIVE` with both nodes `Ready`;
  RDS `ai-devops-dev-history` is `available`, encrypted, private, deletion
  protected, and configured for seven-day backups. The authenticated API and
  frontend Services remain `ClusterIP`; no ingress controller or CloudFront
  distribution is installed.
- Live deployment: API and frontend image rollouts succeeded from versioned
  ECR tags. The in-cluster backend can list pods with its service account;
  `kubectl auth can-i` confirms only the required pod listing, namespace
  event, and pod-log permissions.
- Live incident validation: deployed API image
  `demo-20261008-active-incidents` rolled out successfully. The refreshed
  Incidents page now shows only the genuinely unready `crash-demo`; the API's
  retained startup-probe warning is excluded because its pod is Ready.
- Live RDS verification: created a dedicated `ai_devops_app` database user
  with only history-table data/creation/index permissions; removed the
  temporary RDS-admin Kubernetes Secret after bootstrapping. An in-cluster
  smoke job verified TLS connection, schema creation, insert, read, and
  cleanup against RDS; the synthetic record and job were removed.
- Live access verification: localhost:3001 port-forward serves the EKS
  frontend, Auth.js provider discovery returns `200`, Cognito redirects to its
  sign-in page with the registered localhost callback, API health returns
  `200`, and unauthenticated history access returns `401`.
- Authenticated end-to-end verification: signed in through Cognito as `Viewer`
  at localhost:3001; the EKS frontend fetched the authenticated History view,
  the API returned two account-scoped history rows from MySQL, and
  `/analyze-incidents` returned `200` and updated the MySQL-backed records.
- Configured the non-empty `GROQ_API_KEY` from `api/.env` in the Kubernetes
  Secret `ai-devops-secrets` without printing its value. The API pod loaded
  the key after rollout, and a live authenticated Incidents-page request
  succeeded with `openai/gpt-oss-20b`; the page displayed provider-generated
  root cause analysis with no fallback warning.
- Public demo deployment: the isolated `ai-devops-public-demo` frontend and
  the ten-second-cached allowlisted `/demo/status` API are live at
  `http://aff79ec20ff6d48b88edc9b9831378e1-eb5b31eae7e85162.elb.ap-south-1.amazonaws.com/demo`.
  The internet-facing NLB reports active targets; live HTTP requests returned
  the sanitized pod/deployment status, including the CrashLoopBackOff demo,
  while the protected dashboard API returned `401` and Auth.js endpoints
  returned `404`. The bare hostname redirects to the demo path and the browser
  renders live status. Both NLB targets are healthy. The public demo exposes
  workload names/status only, is HTTP-only and read-only, and incurs ongoing
  AWS load-balancer charges.
- `npx tsc --noEmit` from `frontend/`: **passed**.
- `npm run build` from `frontend/`: **passed** with type checking enabled.
- `npm run lint` from `frontend/`: **passed** with ESLint 10 flat config.
- `npm audit` from `frontend/`: **0 vulnerabilities** after replacing the
  vulnerable `eslint-config-next` dependency tree.
- All three `demo-apps/**/*.yaml` manifests: **parsed successfully**.
- `terraform fmt -check` and `terraform validate`: **passed**.
- `terraform plan`: **64 to add, 0 to change, 0 to destroy**; no apply was run.
- Deployment and demo YAML manifests: **parsed successfully**.
- Current `terraform state list`: **blocked** because no state file is present
  in `infra/environments/dev`. This checkout cannot establish which state,
  if any, tracks the observed live infrastructure; do not apply from it.
- Frontend `npm run lint`, `npx tsc --noEmit`, and `npm run build`: **passed**
  in this run.
- Frontend Auth.js cookie isolation: lint, type-check, and production image
  build **passed** after assigning EKS a separate cookie prefix.

## Remaining work

- **Live environment coverage:** the current Cognito session successfully
  accessed protected APIs and an unauthenticated request was rejected.
  Verification across all Cognito roles and token refresh remains outstanding.
  Crash, OOM, and capped-CPU demos were previously exercised in an isolated
  namespace; do not inject resource-failure demos into the current cluster
  without a disposable test target.
- **Terraform state and deployment safety:** AWS inspection confirms EKS and
  RDS resources exist, but this worktree has no state file or configured
  remote backend. Identify and securely configure the authoritative state
  before using Terraform for changes; do not apply the empty-state plan.
- **Schema evolution:** the DB schema currently initializes with SQLAlchemy
  `create_all`; add migrations before schema evolution.
- **Alert-rule management:** the Alerts view reports Kubernetes events; it
  does not create or manage persistent alert rules. Confirm whether that
  capability is required.
- **Security and Auth:** Basic membership enforcement is implemented; API
  unauthenticated access returns `401` and the EKS frontend redirects to
  Cognito. Verify the signed-in browser flow and token refresh across Cognito
  roles. No role-specific write/configuration endpoints exist; remediation
  remains suggestion-only as requested.

## Resume checklist

1. Locate/configure authoritative Terraform state before any future
   infrastructure changes; do not apply an empty-state plan.
2. Add DB migrations before schema changes and run failure-injection demos
   only on a disposable cluster.
