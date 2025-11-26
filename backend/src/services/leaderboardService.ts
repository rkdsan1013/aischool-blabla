// backend/src/services/leaderboardService.ts
import { fetchProfiles } from "../models/leaderboardModel";

export type LeaderItem = {
  id: string;
  name: string;
  score: number;
  tier: string;
  rank: number;
  streak_count?: number;
};

const TIER_ORDER = [
  "Challenger",
  "Master",
  "Diamond",
  "Platinum",
  "Gold",
  "Silver",
  "Bronze",
] as const;

function tierPriority(tier?: string) {
  const idx = TIER_ORDER.indexOf(
    (tier ?? "Bronze") as (typeof TIER_ORDER)[number]
  );
  return idx === -1 ? TIER_ORDER.length : idx;
}

/**
 * 서버에서 가져온 raw rows를 정렬(점수 desc, 동점 시 tier 우선)하고
 * rank를 부여하여 반환합니다.
 */
export async function getLeaderboard(limit = 50): Promise<LeaderItem[]> {
  const raw = await fetchProfiles(limit);

  // 정규화: id, name, score, tier, streak_count 모두 보장
  const normalized: {
    id: string;
    name: string;
    score: number;
    tier: string;
    streak_count: number;
  }[] = raw.map((r) => {
    const streak =
      typeof (r as any).streak_count === "number"
        ? (r as any).streak_count
        : typeof (r as any).streakCount === "number"
        ? (r as any).streakCount
        : typeof (r as any).streak === "number"
        ? (r as any).streak
        : 0;

    return {
      id: String((r as any).user_id ?? (r as any).id ?? ""),
      name: (r as any).name ?? "익명",
      score: Number((r as any).score ?? 0),
      tier: (r as any).tier ?? "Bronze",
      streak_count: Number(streak ?? 0),
    };
  });

  // 정렬: score desc, tier 우선순위 (높은 우선순위가 먼저)
  normalized.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return tierPriority(a.tier) - tierPriority(b.tier);
  });

  // 순위 부여: 동점 & 동일 티어 -> 동일 rank
  const result: LeaderItem[] = [];
  let prevScore: number | null = null;
  let prevTier: string | null = null;
  let prevRank = 0;

  for (let i = 0; i < normalized.length; i++) {
    const cur = normalized[i];
    if (!cur) continue;

    let rankToAssign: number;
    if (i === 0) {
      rankToAssign = 1;
    } else {
      const sameScore = cur.score === prevScore;
      const sameTier = cur.tier === prevTier;
      rankToAssign = sameScore && sameTier ? prevRank : i + 1;
    }

    const item: LeaderItem = {
      id: cur.id,
      name: cur.name,
      score: cur.score,
      tier: cur.tier,
      rank: rankToAssign,
      streak_count: cur.streak_count,
    };

    result.push(item);

    prevScore = cur.score;
    prevTier = cur.tier;
    prevRank = rankToAssign;
  }

  return result.slice(0, limit);
}

/**
 * 특정 사용자 id의 프로필과 해당 사용자의 순위를 함께 반환.
 * 주의: 현재 구현은 전체 리더보드를 가져와 순위를 계산합니다.
 * 대규모 데이터에서는 DB 레벨에서 순위를 계산하는 방식으로 변경 권장.
 */
export async function getUserWithRank(
  userId: number
): Promise<LeaderItem | null> {
  // 충분히 큰 limit을 사용해 전체를 가져옴 (운영에서는 비효율)
  const all = await getLeaderboard(Number.MAX_SAFE_INTEGER);
  const found = all.find((it) => Number(it.id) === Number(userId));
  return found ?? null;
}
