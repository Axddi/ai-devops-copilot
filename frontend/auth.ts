import NextAuth from "next-auth";
import Cognito from "next-auth/providers/cognito";

export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: true,

  logger: {
    error(code, metadata) {
      console.error(code);
      console.error(metadata);
    },
    warn(code) {
      console.warn(code);
    },
    debug(code, metadata) {
      console.log(code);
      console.log(metadata);
    },
  },

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
});