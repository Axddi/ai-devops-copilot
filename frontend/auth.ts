import NextAuth from "next-auth";
import Cognito from "next-auth/providers/cognito";

const cognitoRoles = ["Admin", "SRE", "Viewer"] as const;
const cookiePrefix = process.env.AUTH_COOKIE_PREFIX;
const secureCookies = process.env.AUTH_URL?.startsWith("https://") ?? false;

const appCookies = cookiePrefix
  ? {
      sessionToken: {
        name: `${cookiePrefix}.session-token`,
        options: { httpOnly: true, sameSite: "lax" as const, path: "/", secure: secureCookies },
      },
      callbackUrl: {
        name: `${cookiePrefix}.callback-url`,
        options: { httpOnly: true, sameSite: "lax" as const, path: "/", secure: secureCookies },
      },
      csrfToken: {
        name: `${cookiePrefix}.csrf-token`,
        options: { httpOnly: true, sameSite: "lax" as const, path: "/", secure: secureCookies },
      },
      pkceCodeVerifier: {
        name: `${cookiePrefix}.pkce-code-verifier`,
        options: { httpOnly: true, sameSite: "lax" as const, path: "/", secure: secureCookies },
      },
      state: {
        name: `${cookiePrefix}.state`,
        options: { httpOnly: true, sameSite: "lax" as const, path: "/", secure: secureCookies },
      },
      nonce: {
        name: `${cookiePrefix}.nonce`,
        options: { httpOnly: true, sameSite: "lax" as const, path: "/", secure: secureCookies },
      },
    }
  : undefined;

function isCognitoRole(value: unknown): value is (typeof cognitoRoles)[number] {
  return cognitoRoles.some((role) => role === value);
}

function roleFromGroups(groups: unknown): (typeof cognitoRoles)[number] | undefined {
  if (!Array.isArray(groups)) return undefined;
  return cognitoRoles.find((role) => groups.some((group) => isCognitoRole(group) && group === role));
}

async function refreshAccessToken(token: {
  accessToken?: string;
  accessTokenExpires?: number;
  refreshToken?: string;
  role?: (typeof cognitoRoles)[number];
  error?: "RefreshTokenError";
}) {
  if (!token.refreshToken) {
    return { ...token, error: "RefreshTokenError" as const };
  }

  try {
    const issuer = process.env.COGNITO_ISSUER;
    const clientId = process.env.COGNITO_CLIENT_ID;
    if (!issuer || !clientId) throw new Error("Cognito is not configured");

    const discoveryResponse = await fetch(
      `${issuer.replace(/\/$/, "")}/.well-known/openid-configuration`,
      { signal: AbortSignal.timeout(5000), cache: "no-store" }
    );
    if (!discoveryResponse.ok) throw new Error("Cognito discovery failed");

    const discovery: unknown = await discoveryResponse.json();
    if (
      typeof discovery !== "object" ||
      discovery === null ||
      !("token_endpoint" in discovery) ||
      typeof discovery.token_endpoint !== "string"
    ) {
      throw new Error("Cognito token endpoint is unavailable");
    }

    const response = await fetch(discovery.token_endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        refresh_token: token.refreshToken,
      }),
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Cognito token refresh failed");

    const refreshed: unknown = await response.json();
    if (
      typeof refreshed !== "object" ||
      refreshed === null ||
      !("access_token" in refreshed) ||
      typeof refreshed.access_token !== "string" ||
      !("expires_in" in refreshed) ||
      typeof refreshed.expires_in !== "number"
    ) {
      throw new Error("Cognito returned an invalid refresh response");
    }

    return {
      ...token,
      accessToken: refreshed.access_token,
      accessTokenExpires: Date.now() + refreshed.expires_in * 1000,
      refreshToken:
        "refresh_token" in refreshed && typeof refreshed.refresh_token === "string"
          ? refreshed.refresh_token
          : token.refreshToken,
      error: undefined,
    };
  } catch {
    return { ...token, error: "RefreshTokenError" as const };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Cognito({
      clientId: process.env.COGNITO_CLIENT_ID!,
      issuer: process.env.COGNITO_ISSUER!,
      client: {
        token_endpoint_auth_method: "none",
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },
  cookies: appCookies,
  callbacks: {
    authorized({ auth, request }) {
      if (process.env.PUBLIC_DEMO_MODE === "true") {
        return request.nextUrl.pathname === "/demo" ||
          request.nextUrl.pathname.startsWith("/demo/")
          ? true
          : Response.redirect(new URL("/demo", process.env.PUBLIC_DEMO_URL));
      }
      if (request.nextUrl.pathname === "/unauthorized") return true;
      if (auth?.user && !auth.user.role) {
        return Response.redirect(new URL("/unauthorized", request.nextUrl));
      }
      return Boolean(auth?.user?.role);
    },
    async jwt({ token, account, profile }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
        token.accessTokenExpires = account.expires_at
          ? account.expires_at * 1000
          : Date.now() + 60 * 60 * 1000;
        token.refreshToken = account.refresh_token;
      }

      if (profile) {
        token.role = roleFromGroups(profile["cognito:groups"]);
      }

      if (
        typeof token.accessTokenExpires === "number" &&
        Date.now() >= token.accessTokenExpires - 60_000
      ) {
        return refreshAccessToken({
          accessToken:
            typeof token.accessToken === "string" ? token.accessToken : undefined,
          accessTokenExpires: token.accessTokenExpires,
          refreshToken:
            typeof token.refreshToken === "string" ? token.refreshToken : undefined,
          role: isCognitoRole(token.role) ? token.role : undefined,
          error:
            token.error === "RefreshTokenError" ? token.error : undefined,
        });
      }

      return token;
    },
    session({ session, token }) {
      session.accessToken = isCognitoRole(token.role) &&
        typeof token.accessToken === "string" &&
        typeof token.accessTokenExpires === "number" &&
        Date.now() < token.accessTokenExpires
        ? token.accessToken
        : undefined;
      session.authError =
        token.error === "RefreshTokenError" ? token.error : undefined;
      session.user.role = isCognitoRole(token.role) ? token.role : undefined;
      return session;
    },
  },
});