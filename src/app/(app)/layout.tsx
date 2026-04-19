import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { UserMenu } from "@/components/user-menu";

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
    .select("handle, display_name, photo_url")
    .eq("user_id", user.id)
    .single();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-lg">
        <nav className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-bold text-primary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20M2 12h20" />
              </svg>
              <span className="hidden sm:inline">Sports Stats</span>
            </Link>
            <div className="hidden sm:flex items-center gap-1 text-sm">
              <Link
                href="/dashboard"
                className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition"
              >
                Dashboard
              </Link>
              <Link
                href="/leagues/join"
                className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition"
              >
                Join League
              </Link>
            </div>
          </div>

          <UserMenu
            player={player ? {
              handle: player.handle,
              displayName: player.display_name,
              photoUrl: player.photo_url,
            } : null}
          />
        </nav>
      </header>

      {children}
    </div>
  );
}
