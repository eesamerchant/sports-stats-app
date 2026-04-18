import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="container flex min-h-dvh flex-col items-center justify-center gap-8 py-16 text-center">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          softball · v0.1
        </p>
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-6xl">
          One profile.<br />Every league you play in.
        </h1>
        <p className="mx-auto max-w-xl text-balance text-lg text-muted-foreground">
          Run your softball league. Let players see their stats — at-bats, RISP,
          OPS — rolled up across every team they&apos;ve been on.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/signup?role=manager"
          className="rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground transition hover:opacity-90"
        >
          Start a league
        </Link>
        <Link
          href="/signup?role=player"
          className="rounded-md border border-border bg-background px-6 py-3 font-medium transition hover:bg-accent"
        >
          Join as a player
        </Link>
      </div>

      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
