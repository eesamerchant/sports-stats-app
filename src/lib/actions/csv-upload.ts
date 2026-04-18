"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type CsvUploadState = {
  error?: string;
  success?: boolean;
  rowErrors?: Array<{ row: number; message: string }>;
};

const STAT_COLUMNS = ["pa","ab","r","h","doubles","triples","hr","rbi","bb","so","sf","hbp","ab_risp","h_risp"] as const;

type PlayerStatRow = {
  player_name: string;
  membership_id: string;
  [key: string]: string | number;
};

/** Upload batch stats from parsed CSV rows */
export async function uploadBatchStats(
  gameId: string,
  rows: Array<{
    membership_id: string;
    pa: number; ab: number; r: number; h: number;
    doubles: number; triples: number; hr: number; rbi: number;
    bb: number; so: number; sf: number; hbp: number;
    ab_risp: number; h_risp: number;
  }>
): Promise<CsvUploadState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rowErrors: Array<{ row: number; message: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const { error } = await supabase
      .from("softball_game_player_stats")
      .upsert(
        {
          game_id: gameId,
          membership_id: row.membership_id,
          gp: 1,
          pa: row.pa,
          ab: row.ab,
          r: row.r,
          h: row.h,
          doubles: row.doubles,
          triples: row.triples,
          hr: row.hr,
          rbi: row.rbi,
          bb: row.bb,
          so: row.so,
          sf: row.sf,
          hbp: row.hbp,
          ab_risp: row.ab_risp,
          h_risp: row.h_risp,
        },
        { onConflict: "game_id,membership_id" }
      );

    if (error) {
      rowErrors.push({ row: i + 1, message: error.message });
    }
  }

  if (rowErrors.length > 0) {
    return { rowErrors, error: `${rowErrors.length} row(s) failed` };
  }

  revalidatePath("/leagues");
  return { success: true };
}
