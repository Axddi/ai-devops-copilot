"use client";

import { signOut } from "next-auth/react";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center text-foreground">
      <h1 className="text-2xl font-semibold">Role assignment required</h1>
      <p className="max-w-lg text-muted-foreground">
        Your Cognito account is signed in but is not assigned to an application
        role. Ask an administrator to add you to the Admin, SRE, or Viewer group,
        then sign in again.
      </p>
      <button
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
        onClick={() => signOut({ callbackUrl: "/api/auth/signin" })}
      >
        Sign out
      </button>
    </main>
  );
}
