"use client";

import { signOut } from "@/lib/actions/auth";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="text-sm text-muted-foreground hover:text-foreground transition"
      >
        Sign out
      </button>
    </form>
  );
}
