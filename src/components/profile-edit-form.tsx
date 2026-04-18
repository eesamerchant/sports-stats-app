"use client";

import { useState, useRef, useActionState } from "react";
import { updatePlayerProfile, type CreatePlayerState } from "@/lib/actions/player";
import { createClient } from "@/lib/supabase/client";

type PlayerData = {
  id: string;
  user_id: string;
  handle: string;
  display_name: string;
  player_number: number;
  bats: "L" | "R" | "S" | null;
  throws: "L" | "R" | null;
  photo_url: string | null;
  bio: string | null;
  hometown: string | null;
};

export function ProfileEditForm({ player }: { player: PlayerData }) {
  const [state, formAction, pending] = useActionState(updatePlayerProfile, {});
  const [photoUrl, setPhotoUrl] = useState(player.photo_url);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const initials = player.display_name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${player.user_id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      // Update the player's photo_url in the database
      const { error: updateError } = await supabase
        .from("players")
        .update({ photo_url: publicUrl })
        .eq("id", player.id);

      if (updateError) throw updateError;

      setPhotoUrl(publicUrl + "?t=" + Date.now()); // cache bust
    } catch (err: any) {
      alert("Failed to upload photo: " + (err.message || "Unknown error"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Photo section */}
      <div className="flex items-center gap-6">
        <div className="relative">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={player.display_name}
              className="h-24 w-24 rounded-full object-cover border-2 border-border"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/20 text-primary text-2xl font-bold border-2 border-border">
              {initials}
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotoUpload}
            className="hidden"
          />
        </div>
        <div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition"
          >
            {uploading ? "Uploading..." : "Change Photo"}
          </button>
          <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, or WebP. Max 2MB.</p>
        </div>
      </div>

      {/* Read-only info */}
      <div className="flex items-center gap-4">
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Player ID</p>
          <p className="font-mono font-semibold text-primary">#{player.player_number}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Handle</p>
          <p className="font-medium">@{player.handle}</p>
        </div>
      </div>

      {/* Edit form */}
      <form action={formAction} className="space-y-5">
        {state.error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {state.error}
          </div>
        )}

        <div>
          <label htmlFor="display_name" className="block text-sm font-medium mb-1">Display Name</label>
          <input
            id="display_name"
            name="display_name"
            type="text"
            defaultValue={player.display_name}
            required
            className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="bats" className="block text-sm font-medium mb-1">Bats</label>
            <select
              id="bats"
              name="bats"
              defaultValue={player.bats || ""}
              className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm"
            >
              <option value="">Not set</option>
              <option value="L">Left</option>
              <option value="R">Right</option>
              <option value="S">Switch</option>
            </select>
          </div>
          <div>
            <label htmlFor="throws" className="block text-sm font-medium mb-1">Throws</label>
            <select
              id="throws"
              name="throws"
              defaultValue={player.throws || ""}
              className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm"
            >
              <option value="">Not set</option>
              <option value="L">Left</option>
              <option value="R">Right</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="hometown" className="block text-sm font-medium mb-1">Hometown</label>
          <input
            id="hometown"
            name="hometown"
            type="text"
            defaultValue={player.hometown || ""}
            placeholder="City, State"
            className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground"
          />
        </div>

        <div>
          <label htmlFor="bio" className="block text-sm font-medium mb-1">Bio</label>
          <textarea
            id="bio"
            name="bio"
            defaultValue={player.bio || ""}
            rows={4}
            maxLength={500}
            placeholder="Tell us about yourself..."
            className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition"
        >
          {pending ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
