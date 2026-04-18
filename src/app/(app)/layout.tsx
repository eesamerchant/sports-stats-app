import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: player } = await supabase
    .from("players")
    .select("handle, display_name")
    .eq("user_id", user.id)
    .single();

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border">
        <nav className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-bold text-primary">
              Sports Stats
            </Link>
            <div className="hidden sm:flex items-center gap-4 text-sm">
              <Link
                href="/dashboard"
                className="text-muted-foreground hover:text-foreground transition"
              >
                Dashboard
              </Link>
              <Link
                href="/leagues/join"
                className="text-muted-foreground hover:text-foreground transition"
              >
                Join League
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {player ? (
              <div className="flex items-center gap-3">
                <Link
                  href={`/players/${player.handle}`}
                  className="text-sm text-muted-foreground hover:text-foreground transition"
                >
                  @{player.handle}
                </Link>
                <Link
                  href="/settings/profile"
                  className="text-xs text-muted-foreground hover:text-primary transition"
                >
                  Edit
                </Link>
              </div>
            ) : (
              <Link
                href="/onboarding/player"
                className="text-sm text-muted-foreground hover:text-foreground transition"
              >
                Create Profile
              </Link>
            )}
            <SignOutButton />
          </div>
        </nav>
      </header>

      {children}
    </div>
  );
}
