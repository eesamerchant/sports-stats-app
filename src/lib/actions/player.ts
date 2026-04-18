"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { z } from "zod";

const CreatePlayerSchema = z.object({
  handle: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores"),
  display_name: z.string().min(1).max(100),
  bats: z.enum(["L", "R", "S"]).nullable().optional(),
  throws: z.enum(["L", "R"]).nullable().optional(),
  bio: z.string().max(500).optional(),
  hometown: z.string().max(100).optional(),
});

export type CreatePlayerState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createPlayerProfile(
  _prev: CreatePlayerState,
  formData: FormData
): Promise<CreatePlayerState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const parsed = CreatePlayerSchema.safeParse({
    handle: formData.get("handle"),
    display_name: formData.get("display_name"),
    bats: formData.get("bats") || null,
    throws: formData.get("throws") || null,
    bio: formData.get("bio") || undefined,
    hometown: formData.get("hometown") || undefined,
  });

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { error } = await supabase.from("players").insert({
    user_id: user.id,
    handle: parsed.data.handle,
    display_name: parsed.data.display_name,
    bats: parsed.data.bats ?? null,
    throws: parsed.data.throws ?? null,
    bio: parsed.data.bio ?? null,
    hometown: parsed.data.hometown ?? null,
    photo_url: null,
  });

  if (error) {
    if (error.code === "23505" && error.message.includes("handle")) {
      return { error: "That handle is already taken. Try another one." };
    }
    return { error: error.message };
  }

  redirect("/dashboard");
}

const UpdatePlayerSchema = z.object({
  display_name: z.string().min(1).max(100),
  bats: z.enum(["L", "R", "S"]).nullable().optional(),
  throws: z.enum(["L", "R"]).nullable().optional(),
  bio: z.string().max(500).optional(),
  hometown: z.string().max(100).optional(),
});

export async function updatePlayerProfile(
  _prev: CreatePlayerState,
  formData: FormData
): Promise<CreatePlayerState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const parsed = UpdatePlayerSchema.safeParse({
    display_name: formData.get("display_name"),
    bats: formData.get("bats") || null,
    throws: formData.get("throws") || null,
    bio: formData.get("bio") || undefined,
    hometown: formData.get("hometown") || undefined,
  });

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { error } = await supabase
    .from("players")
    .update({
      display_name: parsed.data.display_name,
      bats: parsed.data.bats ?? null,
      throws: parsed.data.throws ?? null,
      bio: parsed.data.bio ?? null,
      hometown: parsed.data.hometown ?? null,
    })
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  redirect("/dashboard");
}
