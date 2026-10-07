import type { DefaultSession } from 'next-auth';

export type CognitoRole = 'Admin' | 'SRE' | 'Viewer';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    authError?: 'RefreshTokenError';
    user: DefaultSession['user'] & {
      role?: CognitoRole;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    accessTokenExpires?: number;
    role?: CognitoRole;
    refreshToken?: string;
    error?: 'RefreshTokenError';
  }
}
