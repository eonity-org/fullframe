/**
 * The scoring engine — pure functions over the
 * `fullframe-votes/2` export, deterministic given the same input:
 *
 *   1. Per juror, a work's score is the weighted mean of that juror's
 *      criterion scores (each first normalized to [0,1] by its scale).
 *   2. A work's final score is the mean across the jurors who scored it.
 *
 * Ties break by vote coverage (more complete first), then hash — total
 * order, no randomness.
 */

export interface VotesExport {
  criteria: Array<{
    id: number;
    name: string;
    scale_max: number;
    weight: number;
  }>;
  jurors: Array<{ id: number; name: string; revoked: boolean }>;
  votes: Array<{
    juror_id: number;
    resource_hash: string;
    criterion_id: number;
    score: number;
  }>;
}

export interface WorkScore {
  hash: string;
  /** Final aggregate in [0,1]. */
  score: number;
  /** Mean per criterion id, raw scale. */
  byCriterion: Record<number, number>;
  /** Per-juror aggregate preserved in the scoring record. */
  byJuror: Record<number, number>;
  /** votes cast / votes possible for this work. */
  coverage: number;
}

export function computeScores(data: VotesExport): WorkScore[] {
  const criteria = new Map(data.criteria.map((c) => [c.id, c]));
  const activeJurors = data.jurors.filter((j) => !j.revoked).map((j) => j.id);

  // juror → hash → criterion → score
  const byJuror = new Map<number, Map<string, Map<number, number>>>();
  const hashes = new Set<string>();
  for (const vote of data.votes) {
    if (
      !activeJurors.includes(vote.juror_id) ||
      !criteria.has(vote.criterion_id)
    )
      continue;
    hashes.add(vote.resource_hash);
    if (!byJuror.has(vote.juror_id)) byJuror.set(vote.juror_id, new Map());
    const works = byJuror.get(vote.juror_id)!;
    if (!works.has(vote.resource_hash))
      works.set(vote.resource_hash, new Map());
    works.get(vote.resource_hash)!.set(vote.criterion_id, vote.score);
  }

  // Per-juror weighted work scores in [0,1].
  const jurorWorkScores = new Map<number, Map<string, number>>();
  for (const [jurorId, works] of byJuror) {
    const scores = new Map<string, number>();
    for (const [hash, votes] of works) {
      let acc = 0;
      let weightSeen = 0;
      for (const [criterionId, score] of votes) {
        const criterion = criteria.get(criterionId)!;
        acc += (score / criterion.scale_max) * criterion.weight;
        weightSeen += criterion.weight;
      }
      // Missing criteria don't drag the mean down — weight only what was scored.
      if (weightSeen > 0) scores.set(hash, acc / weightSeen);
    }
    jurorWorkScores.set(jurorId, scores);
  }

  const results: WorkScore[] = [];
  for (const hash of hashes) {
    const perJuror: Record<number, number> = {};
    for (const [jurorId, scores] of jurorWorkScores) {
      const value = scores.get(hash);
      if (value !== undefined) perJuror[jurorId] = value;
    }
    const jurorValues = Object.values(perJuror);
    if (jurorValues.length === 0) continue;

    const byCriterion: Record<number, number> = {};
    for (const criterion of data.criteria) {
      const raw: number[] = [];
      for (const jurorId of activeJurors) {
        const score = byJuror.get(jurorId)?.get(hash)?.get(criterion.id);
        if (score !== undefined) raw.push(score);
      }
      if (raw.length)
        byCriterion[criterion.id] = raw.reduce((a, b) => a + b, 0) / raw.length;
    }

    const possible = activeJurors.length * data.criteria.length;
    const cast = activeJurors.reduce(
      (sum, jurorId) => sum + (byJuror.get(jurorId)?.get(hash)?.size ?? 0),
      0,
    );

    results.push({
      hash,
      score: jurorValues.reduce((a, b) => a + b, 0) / jurorValues.length,
      byCriterion,
      byJuror: perJuror,
      coverage: possible > 0 ? cast / possible : 0,
    });
  }

  results.sort(
    (a, b) =>
      b.score - a.score ||
      b.coverage - a.coverage ||
      a.hash.localeCompare(b.hash),
  );
  return results;
}
