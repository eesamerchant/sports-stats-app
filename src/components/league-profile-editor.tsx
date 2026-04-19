"use client";

import { useState, useRef } from "react";
import { Loader2 } from "lucide-react";

interface LeagueProfileEditorProps {
  leagueId: string;
  initialData: {
    logo_url: string | null;
    website: string | null;
    social_facebook: string | null;
    social_instagram: string | null;
    social_twitter: string | null;
    social_tiktok: string | null;
    join_mode: string;
  };
  supabaseUrl: string;
}

export default function LeagueProfileEditor({
  leagueId,
  initialData,
  supabaseUrl,
}: LeagueProfileEditorProps) {
  const [logo, setLogo] = useState<string | null>(initialData.logo_url);
  const [website, setWebsite] = useState(initialData.website ?? "");
  const [facebook, setFacebook] = useState(initialData.social_facebook ?? "");
  const [instagram, setInstagram] = useState(initialData.social_instagram ?? "");
  const [twitter, setTwitter] = useState(initialData.social_twitter ?? "");
  const [tiktok, setTiktok] = useState(initialData.social_tiktok ?? "");
  const [joinMode, setJoinMode] = useState(initialData.join_mode ?? "open");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage("");

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const ext = file.name.split(".").pop();
      const path = `${leagueId}/logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("league-logos")
        .upload(path, file, { upsert: true });

      if (uploadError) {
        setMessage("Failed to upload logo");
        return;
      }

      const { data: urlData } = supabase.storage
        .from("league-logos")
        .getPublicUrl(path);

      const newUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      setLogo(newUrl);

      // Save to league record
      const { error: updateError } = await supabase
        .from("leagues")
        .update({ logo_url: newUrl })
        .eq("id", leagueId);

      if (updateError) {
        setMessage("Logo uploaded but failed to save");
      } else {
        setMessage("Logo updated");
      }
    } catch {
      setMessage("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const { error } = await supabase
        .from("leagues")
        .update({
          website: website || null,
          social_facebook: facebook || null,
          social_instagram: instagram || null,
          social_twitter: twitter || null,
          social_tiktok: tiktok || null,
          join_mode: joinMode,
        })
        .eq("id", leagueId);

      if (error) {
        setMessage("Failed to save: " + error.message);
      } else {
        setMessage("Settings saved");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch {
      setMessage("Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Logo Upload */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          League Logo
        </h3>
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 rounded-lg border-2 border-dashed border-border bg-secondary flex items-center justify-center overflow-hidden">
            {logo ? (
              <img
                src={logo}
                alt="League logo"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-xs text-muted-foreground text-center px-1">
                No logo
              </span>
            )}
          </div>
          <div className="space-y-2">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition disabled:opacity-50"
            >
              {uploading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" /> Uploading...
                </span>
              ) : (
                "Upload Logo"
              )}
            </button>
            <p className="text-xs text-muted-foreground">PNG, JPG up to 2MB</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Website */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Website</label>
        <input
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://yourleague.com"
          className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Social Links */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Social Media
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Facebook</label>
            <input
              type="text"
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
              placeholder="facebook.com/yourleague"
              className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Instagram</label>
            <input
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@yourleague"
              className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">X (Twitter)</label>
            <input
              type="text"
              value={twitter}
              onChange={(e) => setTwitter(e.target.value)}
              placeholder="@yourleague"
              className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">TikTok</label>
            <input
              type="text"
              value={tiktok}
              onChange={(e) => setTiktok(e.target.value)}
              placeholder="@yourleague"
              className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Join Mode */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Join Permissions
        </h3>
        <p className="text-xs text-muted-foreground">
          Control how players can join your league.
        </p>
        <div className="grid gap-2">
          {[
            { value: "open", label: "Open — Anyone with league ID or code can join" },
            { value: "admin_approval", label: "Admin Approval — Requires league admin to accept" },
            { value: "manager_approval", label: "Admin or Manager — Admin or team manager can accept" },
            { value: "invite_only", label: "Invite Only — Only via direct link or email invite" },
          ].map((opt) => (
            <label
              key={opt.value}
              className={`flex items-center gap-3 rounded-md border-2 px-4 py-3 cursor-pointer transition ${
                joinMode === opt.value
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              <input
                type="radio"
                name="join_mode"
                value={opt.value}
                checked={joinMode === opt.value}
                onChange={(e) => setJoinMode(e.target.value)}
                className="accent-primary"
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
        >
          {saving && <Loader2 className="h-3 w-3 animate-spin" />}
          Save Settings
        </button>
        {message && (
          <span className={`text-sm ${message.includes("Failed") || message.includes("failed") ? "text-red-400" : "text-green-400"}`}>
            {message}
          </span>
        )}
      </div>
    </div>
  );
}
