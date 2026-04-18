/** Generate a round-robin schedule for given teams */
export function generateRoundRobin(
  teams: string[],
  rounds: number = 1
): Array<{ home: string; away: string; round: number }> {
  const matchups: Array<{ home: string; away: string; round: number }> = [];
  const teamList = [...teams];

  // If odd number of teams, add a "BYE"
  if (teamList.length % 2 !== 0) teamList.push("BYE");
  const total = teamList.length;

  for (let roundNum = 0; roundNum < rounds; roundNum++) {
    // Reset team order for each full round-robin pass
    const rotatingTeams = [...teamList];

    for (let round = 0; round < total - 1; round++) {
      for (let i = 0; i < total / 2; i++) {
        const home = rotatingTeams[i];
        const away = rotatingTeams[total - 1 - i];
        if (home !== "BYE" && away !== "BYE") {
          matchups.push({
            home: roundNum % 2 === 0 ? home : away,
            away: roundNum % 2 === 0 ? away : home,
            round: roundNum * (total - 1) + round + 1,
          });
        }
      }
      // Rotate teams (keep first fixed)
      const last = rotatingTeams.pop()!;
      rotatingTeams.splice(1, 0, last);
    }
  }

  return matchups;
}
