"use client";

import { useState, useRef } from "react";
import { uploadBatchStats, type CsvUploadState } from "@/lib/actions/csv-upload";

type RosterMember = {
  id: string;
  player_name: string;
  player_handle: string;
};

type ParsedRow = {
  player_name: string;
  matched_membership_id: string | null;
  pa: number; ab: number; r: number; h: number;
  doubles: number; triples: number; hr: number; rbi: number;
  bb: number; so: number; sf: number; hbp: number;
  ab_risp: number; h_risp: number;
};

export function CsvUploadForm({
  gameId,
  roster,
}: {
  gameId: string;
  roster: RosterMember[];
}) {
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CsvUploadState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function matchPlayer(name: string): string | null {
    const lower = name.toLowerCase().trim();
    const match = roster.find(
      (r) =>
        r.player_name.toLowerCase() === lower ||
        r.player_handle.toLowerCase() === lower
    );
    return match?.id ?? null;
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setResult(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      try {
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 2) {
          setError("CSV must have a header row and at least one data row.");
          return;
        }

        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
        const nameIdx = headers.findIndex((h) =>
          ["player", "name", "player_name"].includes(h)
        );
        if (nameIdx === -1) {
          setError("CSV must have a 'Player' or 'Name' column.");
          return;
        }

        const colMap: Record<string, number> = {};
        const aliases: Record<string, string[]> = {
          pa: ["pa", "plate_appearances"],
          ab: ["ab", "at_bats"],
          r: ["r", "runs"],
          h: ["h", "hits"],
          doubles: ["2b", "doubles"],
          triples: ["3b", "triples"],
          hr: ["hr", "home_runs", "homerun"],
          rbi: ["rbi"],
          bb: ["bb", "walks"],
          so: ["so", "k", "strikeouts"],
          sf: ["sf", "sac_fly"],
          hbp: ["hbp", "hit_by_pitch"],
          ab_risp: ["ab_risp"],
          h_risp: ["h_risp"],
        };

        for (const [field, names] of Object.entries(aliases)) {
          const idx = headers.findIndex((h) => names.includes(h));
          if (idx !== -1) colMap[field] = idx;
        }

        const rows: ParsedRow[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map((c) => c.trim());
          const playerName = cols[nameIdx];
          if (!playerName) continue;

          const row: any = { player_name: playerName, matched_membership_id: matchPlayer(playerName) };
          for (const field of Object.keys(aliases)) {
            row[field] = colMap[field] !== undefined ? (parseInt(cols[colMap[field]]) || 0) : 0;
          }
          rows.push(row as ParsedRow);
        }

        setParsedRows(rows);
      } catch (err) {
        setError("Failed to parse CSV file.");
      }
    };
    reader.readAsText(file);
  }

  async function handleSubmit() {
    const validRows = parsedRows.filter((r) => r.matched_membership_id);
    if (validRows.length === 0) {
      setError("No rows matched to roster players.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await uploadBatchStats(
        gameId,
        validRows.map((r) => ({
          membership_id: r.matched_membership_id!,
          pa: r.pa, ab: r.ab, r: r.r, h: r.h,
          doubles: r.doubles, triples: r.triples, hr: r.hr, rbi: r.rbi,
          bb: r.bb, so: r.so, sf: r.sf, hbp: r.hbp,
          ab_risp: r.ab_risp, h_risp: r.h_risp,
        }))
      );
      setResult(res);
      if (res.success) setParsedRows([]);
    } catch {
      setError("Upload failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const unmatchedCount = parsedRows.filter((r) => !r.matched_membership_id).length;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Upload CSV</label>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          onChange={handleFile}
          className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:opacity-90 file:cursor-pointer"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          CSV must have columns: Player, PA, AB, R, H, 2B, 3B, HR, RBI, BB, SO, SF, HBP, AB_RISP, H_RISP
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {result?.success && (
        <div className="rounded-md bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-400">
          Stats uploaded successfully!
        </div>
      )}

      {result?.rowErrors && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm">
          {result.rowErrors.map((e) => (
            <p key={e.row} className="text-destructive">Row {e.row}: {e.message}</p>
          ))}
        </div>
      )}

      {parsedRows.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 pr-3 font-medium">Player</th>
                  <th className="pb-2 pr-3 font-medium">Match</th>
                  <th className="pb-2 px-1 font-medium text-center">PA</th>
                  <th className="pb-2 px-1 font-medium text-center">AB</th>
                  <th className="pb-2 px-1 font-medium text-center">R</th>
                  <th className="pb-2 px-1 font-medium text-center">H</th>
                  <th className="pb-2 px-1 font-medium text-center">2B</th>
                  <th className="pb-2 px-1 font-medium text-center">3B</th>
                  <th className="pb-2 px-1 font-medium text-center">HR</th>
                  <th className="pb-2 px-1 font-medium text-center">RBI</th>
                  <th className="pb-2 px-1 font-medium text-center">BB</th>
                  <th className="pb-2 px-1 font-medium text-center">SO</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.map((row, i) => (
                  <tr key={i} className={`border-b border-border/50 ${!row.matched_membership_id ? "opacity-50" : ""}`}>
                    <td className="py-1.5 pr-3">{row.player_name}</td>
                    <td className="py-1.5 pr-3">
                      {row.matched_membership_id ? (
                        <span className="text-green-400 text-xs">Matched</span>
                      ) : (
                        <span className="text-destructive text-xs">No match</span>
                      )}
                    </td>
                    <td className="py-1.5 px-1 text-center">{row.pa}</td>
                    <td className="py-1.5 px-1 text-center">{row.ab}</td>
                    <td className="py-1.5 px-1 text-center">{row.r}</td>
                    <td className="py-1.5 px-1 text-center">{row.h}</td>
                    <td className="py-1.5 px-1 text-center">{row.doubles}</td>
                    <td className="py-1.5 px-1 text-center">{row.triples}</td>
                    <td className="py-1.5 px-1 text-center">{row.hr}</td>
                    <td className="py-1.5 px-1 text-center">{row.rbi}</td>
                    <td className="py-1.5 px-1 text-center">{row.bb}</td>
                    <td className="py-1.5 px-1 text-center">{row.so}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {unmatchedCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {unmatchedCount} player(s) could not be matched to the roster and will be skipped.
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || parsedRows.filter((r) => r.matched_membership_id).length === 0}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
          >
            {submitting ? "Uploading..." : `Upload ${parsedRows.filter((r) => r.matched_membership_id).length} player stats`}
          </button>
        </>
      )}
    </div>
  );
}
