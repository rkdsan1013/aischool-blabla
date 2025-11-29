import {
  fetchProfiles,
  fetchProfilesWithRank,
  fetchProfileById,
  fetchProfileWithRankById,
} from "../models/leaderboardModel";

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
  // 모델에서 단순 fetchProfiles만 제공하는 환경을 고려해 기존 로직 유지
  const raw = await fetchProfiles(limit);

  const normalized = raw.map((r) => {
    const streak =
      typeof (r as any).streak_count === "number"
        ? (r as any).streak_count
        : typeof (r as any).streakCount === "number"
        ? (r as any).streakCount
        : typeof (r as any).streak === "number"
        ? (r as any).streak
        : 0;

    return {
      id: String((r as any).user_id ?? (r as any).id ?? "").trim(),
      name: (r as any).name ?? "익명",
      score: Number((r as any).score ?? 0),
      tier: (r as any).tier ?? "Bronze",
      streak_count: Number(streak ?? 0),
    };
  });

  // 정렬: score desc, tier 우선순위 (높은 우선순위가 먼저)
  normalized.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const tp = tierPriority(a.tier) - tierPriority(b.tier);
    if (tp !== 0) return tp;
    return a.id.localeCompare(b.id);
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

    result.push({
      id: cur.id,
      name: cur.name,
      score: cur.score,
      tier: cur.tier,
      rank: rankToAssign,
      streak_count: cur.streak_count,
    });

    prevScore = cur.score;
    prevTier = cur.tier;
    prevRank = rankToAssign;
  }

  return result.slice(0, limit);
}

/**
 * 특정 사용자 id의 프로필과 해당 사용자의 순위를 함께 반환.
 * - userId는 string | number 허용
 * - 모델에서 rank를 직접 제공하는 함수(fetchProfileWithRankById)가 있으면 우선 사용
 * - 없으면 전체 리더보드에서 검색
 */
export async function getUserWithRank(
  userId: string | number
): Promise<LeaderItem | null> {
  const normalizedIdStr = String(userId ?? "").trim();
  if (!normalizedIdStr) return null;

  // 1) 모델에서 rank 포함 단일 조회가 가능한 경우 우선 시도
  try {
    const profileWithRank = await fetchProfileWithRankById(normalizedIdStr);
    if (profileWithRank) {
      return {
        id: String(profileWithRank.user_id),
        name: profileWithRank.name,
        score: profileWithRank.score,
        tier: profileWithRank.tier,
        rank: profileWithRank.rank,
        streak_count: profileWithRank.streak_count,
      };
    }
  } catch (err) {
    // 폴백으로 전체 조회 진행 (치명적 에러는 상위에서 처리)
  }

  // 2) 폴백: 전체 리더보드에서 해당 id를 찾아 반환 (rank 포함)
  try {
    const all = await getLeaderboard(Number.MAX_SAFE_INTEGER);
    const found =
      all.find((it) => String(it.id).trim() === normalizedIdStr) ?? null;
    return found;
  } catch (err) {
    throw err;
  }
}
