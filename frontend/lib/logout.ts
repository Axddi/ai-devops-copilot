"use client";

import { signOut } from "next-auth/react";

export async function logout() {
  await signOut({
    redirect: false,
  });

  window.location.href =
    `https://ai-devops-dev.auth.ap-south-1.amazoncognito.com/logout` +
    `?client_id=${process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID}` +
    `&logout_uri=http://localhost:3000`;
}