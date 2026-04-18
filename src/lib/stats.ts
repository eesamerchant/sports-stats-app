/**
 * Softball stat math. All functions accept raw counting stats and return
 * derived stats. Keep this file pure (no DB calls) so it's trivially testable.
 */

export type CountingStats = {
  gp: number;
  pa: number;
  ab: number;
  r: number;
  h: number;
  doubles: number;
  triples: number;
  hr: number;
  rbi: number;
  bb: number;
  so: number;
  sf: number;
  hbp?: number;
  ab_risp: number;
  h_risp: number;
};

export type DerivedStats = {
  avg: number;
  obp: number;
  slg: number;
  ops: number;
  xbh: number;
  avg_risp: number;
};

/** Batting average: H / AB. Returns 0 when AB is 0. */
export function battingAverage(h: number, ab: number): number {
  return ab === 0 ? 0 : h / ab;
}

/** On-base percentage: (H + BB + HBP) / (AB + BB + HBP + SF). */
export function onBasePercentage(
  h: number,
  bb: number,
  hbp: number,
  ab: number,
  sf: number
): number {
  const denom = ab + bb + hbp + sf;
  return denom === 0 ? 0 : (h + bb + hbp) / denom;
}

/** Slugging: total bases / AB. Singles = H - (2B + 3B + HR). */
export function sluggingPercentage(
  h: number,
  doubles: number,
  triples: number,
  hr: number,
  ab: number
): number {
  if (ab === 0) return 0;
  const singles = h - doubles - triples - hr;
  const totalBases = singles + 2 * doubles + 3 * triples + 4 * hr;
  return totalBases / ab;
}

/** Extra-base hits: 2B + 3B + HR. */
export function extraBaseHits(
  doubles: number,
  triples: number,
  hr: number
): number {
  return doubles + triples + hr;
}

/** Batting average with runners in scoring position. */
export function avgWithRisp(hRisp: number, abRisp: number): number {
  return abRisp === 0 ? 0 : hRisp / abRisp;
}

/** Compute all derived stats from counting stats. */
export function deriveStats(c: CountingStats): DerivedStats {
  const hbp = c.hbp ?? 0;
  const avg = battingAverage(c.h, c.ab);
  const obp = onBasePercentage(c.h, c.bb, hbp, c.ab, c.sf);
  const slg = sluggingPercentage(c.h, c.doubles, c.triples, c.hr, c.ab);
  return {
    avg,
    obp,
    slg,
    ops: obp + slg,
    xbh: extraBaseHits(c.doubles, c.triples, c.hr),
    avg_risp: avgWithRisp(c.h_risp, c.ab_risp),
  };
}

/** Format a batting-average-style stat as .XXX (no leading zero). */
export function formatRate(value: number): string {
  if (!Number.isFinite(value)) return ".000";
  return value.toFixed(3).replace(/^0/, "");
}

/** Sum counting stats across an array (e.g., career totals from per-game rows). */
export function sumCountingStats(rows: CountingStats[]): CountingStats {
  const start: CountingStats = {
    gp: 0,
    pa: 0,
    ab: 0,
    r: 0,
    h: 0,
    doubles: 0,
    triples: 0,
    hr: 0,
    rbi: 0,
    bb: 0,
    so: 0,
    sf: 0,
    hbp: 0,
    ab_risp: 0,
    h_risp: 0,
  };
  return rows.reduce((acc, r) => {
    acc.gp += r.gp;
    acc.pa += r.pa;
    acc.ab += r.ab;
    acc.r += r.r;
    acc.h += r.h;
    acc.doubles += r.doubles;
    acc.triples += r.triples;
    acc.hr += r.hr;
    acc.rbi += r.rbi;
    acc.bb += r.bb;
    acc.so += r.so;
    acc.sf += r.sf;
    acc.hbp = (acc.hbp ?? 0) + (r.hbp ?? 0);
    acc.ab_risp += r.ab_risp;
    acc.h_risp += r.h_risp;
    return acc;
  }, start);
}
