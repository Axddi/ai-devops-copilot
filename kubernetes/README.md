# EKS demo deployment

The signed-in app uses the existing EKS cluster and private MySQL RDS instance.
Its API and frontend Services stay `ClusterIP`. An optional public showcase is
available as a separate, read-only frontend and internet-facing Network Load
Balancer; that AWS load balancer incurs ongoing charges while it exists.

## Local access and Cognito

The Cognito app client is configured with the localhost callback URL. After
deploying, run this command from a machine with `kubectl` access:

```powershell
kubectl port-forward -n ai-devops service/ai-devops-frontend 3001:3000
```

Open `http://localhost:3001`. Keep the port-forward process running while
using the app. Cognito allows localhost HTTP callbacks for development; a
public HTTP endpoint cannot be used for Cognito sign-in. Public access requires
a domain and HTTPS or an additional HTTPS edge service.
The EKS frontend uses a separate Auth.js cookie prefix so its local demo
session does not collide with a concurrently running localhost development
server on another port.

## Public read-only showcase

The separate `ai-devops-public-demo` service exposes only a demo-mode frontend.
It serves `/demo`, redirects other page routes to the demo, disables Auth.js
routes, and displays sanitized pod/deployment readiness for the
`ai-devops` namespace. It does not expose logs, incident history, AI analysis,
credentials, or remediation controls. The public API route returns only
deployment names and replica counts plus pod names, phase, readiness, and
container waiting reason; it is cached for ten seconds. The normal signed-in
dashboard and its authenticated APIs are unchanged.

The public link is the AWS load balancer hostname assigned to the Service
(`/demo` is the landing page). This is HTTP-only and intended for a project showcase, not production use; it
does not enable Cognito sign-in. The public subnets and internet gateway
already exist in the VPC, so this setup does not create NAT gateways or
compute instances. The Network Load Balancer does incur hourly and traffic
charges. To remove the public endpoint and its load balancer:

```powershell
kubectl delete -f kubernetes/demo-frontend-service.yaml
kubectl delete -f kubernetes/demo-frontend-deployment.yaml
```

## Required secrets

Create these Kubernetes Secrets in namespace `ai-devops` without committing
their values:

- `ai-devops-db-secrets`: `DATABASE_URL` for the least-privilege MySQL app user
  on the private RDS instance. Use the `mysql+pymysql` URL scheme and percent
  encode username/password. The API verifies TLS using the AWS RDS CA bundle
  for `ap-south-1`.
- `ai-devops-secrets`: optional `GROQ_API_KEY` to enable AI analysis. If it is
  absent, incident analysis continues with Kubernetes-derived fallback output.
- `ai-devops-frontend-secrets`: a unique, persistent `AUTH_SECRET` for the
  NextAuth session cookies. Do not reuse development credentials.

The API's Cognito issuer and public app-client ID are non-secret deployment
configuration in `backend-deployment.yaml`.

## Apply and verify

Build and push the API and frontend images to the configured ECR repositories,
then set each deployment manifest to the matching immutable image tag.

```powershell
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/backend-rbac.yaml
kubectl apply -f kubernetes/backend-service.yaml
kubectl apply -f kubernetes/frontend-service.yaml
kubectl apply -f kubernetes/backend-deployment.yaml
kubectl apply -f kubernetes/frontend-deployment.yaml
kubectl apply -f kubernetes/demo-frontend-deployment.yaml
kubectl apply -f kubernetes/demo-frontend-service.yaml
kubectl rollout status -n ai-devops deployment/ai-devops-api
kubectl rollout status -n ai-devops deployment/ai-devops-frontend
kubectl rollout status -n ai-devops deployment/ai-devops-public-demo
kubectl port-forward -n ai-devops service/ai-devops-frontend 3001:3000
```

Read the public demo URL from
`kubectl get service ai-devops-public-demo -n ai-devops`. Its AWS-assigned
hostname can take several minutes to appear.

The RDS database is private and only permits connections from the EKS node
security group. Verify that history reads and writes work through the
authenticated app before using the deployment.
