# Incident history storage

Incident analysis results are saved to a private MySQL RDS instance and can be
opened from the dashboard's **History** section. Each saved entry contains its
authenticated Cognito subject, namespace, pod, Kubernetes warning reasons and
messages, a bounded log excerpt, and the AI/fallback explanation, remediation
recommendations, and suggested `kubectl` runbook.

Entries are scoped to the Cognito `sub`; one row is kept per account and
unique pod/event signature. Re-analysis updates the saved plan and last-seen
time instead of creating a duplicate. History is limited to the most recent 50
entries by default (API limit 1-100). Suggestions remain non-executing.

## Provisioning and application connection

The `incident_history_db` Terraform module creates a single-AZ, private,
encrypted MySQL RDS instance in the VPC's private subnets. Its default size is
`db.t4g.micro`, with 20 GiB gp3 storage and autoscaling up to 100 GiB. Network
ingress is limited to the EKS node security group. RDS manages its master
password in AWS Secrets Manager; the secret value is not output by Terraform.
Deletion protection is enabled and automated backups are retained for seven
days. This is a small development starting point, not an HA production
database. Review AWS pricing in `ap-south-1` before applying Terraform.

After applying infrastructure and verifying the Terraform outputs, configure
the `ai-devops-db-secrets` Kubernetes Secret in the `ai-devops` namespace with
a `DATABASE_URL` key. Build that URL from the RDS endpoint, database name, and
managed credentials retrieved securely from the Secrets Manager ARN output.
Percent-encode credentials and use the `mysql+pymysql` SQLAlchemy URL form.
Do not commit the URL, password, secret JSON, or Kubernetes Secret manifest.
The API requires TLS when connecting to MySQL and initializes the history table
on first use. Without `DATABASE_URL`, analysis history requests fail explicitly
with `503`; no history is silently dropped.

The current API container uses a private RDS network path; ensure its EKS nodes
are in the configured VPC. The instance is never publicly accessible.

## Endpoints

- `GET /history?limit=50`: list the authenticated user's saved incident
  analyses.
- `GET /analyze-incidents`: analyze current warning incidents and upsert their
  history records for the authenticated user.

All API endpoints require a valid Cognito access token. History has no
cross-account lookup endpoint.
