# Cognito authentication and roles

The frontend uses Auth.js with the Cognito authorization-code flow. The API
accepts Cognito **access tokens** only and verifies the signature against the
user pool's JWKS, along with the issuer, token type, and app-client ID.

## Configuration

Set these values in both the frontend and backend runtime environments:

- `COGNITO_ISSUER`: `https://cognito-idp.<region>.amazonaws.com/<user-pool-id>`
- `COGNITO_CLIENT_ID`: the Cognito public app-client ID

Set `AUTH_SECRET` in the frontend runtime to a securely generated,
server-only value shared by frontend instances.

The Cognito app client must issue access tokens and have the configured callback
and sign-out URLs. Assign each user to one of the existing Cognito groups:
`Admin`, `SRE`, or `Viewer`. An authenticated user with no recognized group is
not authorized.

## Enforcement

- Browser pages require a signed-in user with a recognized role.
- The frontend sends the session's Cognito access token as a bearer token to
  the API.
- Every API router is protected. `/` remains a public health check.
- Missing or invalid tokens return `401`; a valid user without an assigned
  application role receives `403`.
- If a user belongs to multiple recognized groups, role precedence is
  `Admin`, then `SRE`, then `Viewer`.

All current API features are read-only with respect to the cluster; chat and
incident analysis do not execute remediation. Role-specific configuration
management and approved remediation actions are not implemented yet. Any
future write endpoint must enforce its role policy on the backend and require
explicit action approval.

Intended permissions for future write features are: Admins manage configuration
and approve actions; SREs request remediation with explicit approval for each
action; Viewers remain read-only. No cluster-changing action is currently
available to any role.

The frontend refreshes expired access tokens using the Cognito refresh-token
grant. If refresh fails or the refresh token expires, the frontend reports that
the user needs to sign in again. Refresh tokens stay server-side in the
encrypted Auth.js JWT cookie and are never returned in the session.

## Validation

From `api/`, run `python -m pytest -q`. From `frontend/`, run `npm run build`
and `npm audit`.
