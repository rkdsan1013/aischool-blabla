// src/services/leaderboardService.ts
import { apiClient, handleApiError } from "../api/index";
import type { AxiosResponse } from "axios";

export type LeaderItem = {
  id: string;
  name: string;
  score: number;
  tier?: string;
  rank?: number;
};

const TIER_ORDER = [
  "Challenger",
  "Master",
  "Diamond",
  "Platinum",
  "Gold",
  "Silver",
  "Bronze",
];

const tierPriority = (tier?: string) => {
  const idx = TIER_ORDER.indexOf(tier ?? "");
  return idx === -1 ? TIER_ORDER.length : idx;
};

/**
 * 서버에서 리더보드 데이터를 가져와 정규화 및 정렬, 순위 부여 후 반환합니다.
 * - 우선순위: score 내림차순, 동점 시 tier 우선순위
 * - 동점 & 동일 티어인 경우 동일 rank 부여
 */
export async function getLeaderboard({
  limit = 50,
}: {
  limit?: number;
} = {}): Promise<LeaderItem[]> {
  try {
    const res: AxiosResponse = await apiClient.get("/leaderboard", {
      params: { limit },
    });

    // 서버 응답 형태에 따라 data 추출
    const raw = (res.data && (res.data.data ?? res.data)) ?? [];

    // 정규화
    const normalized: LeaderItem[] = (raw as any[]).map((d, i) => ({
      id: d.id ?? d.userId ?? `u-${i}`,
      name: d.name ?? d.username ?? "익명",
      score: typeof d.score === "number" ? d.score : Number(d.score ?? 0),
      tier: d.tier ?? "Bronze",
      rank: undefined,
    }));

    // 정렬: score desc, tier 우선순위
    normalized.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return tierPriority(a.tier) - tierPriority(b.tier);
    });

    // 순위 부여 (동점 & 동일 티어 -> 동일 순위)
    const withRank: LeaderItem[] = [];
    let prevScore: number | null = null;
    let prevTier: string | null = null;
    let prevRank = 0;
    for (let i = 0; i < normalized.length; i++) {
      const cur = normalized[i];
      if (i === 0) {
        prevRank = 1;
        cur.rank = prevRank;
      } else {
        const sameScore = cur.score === prevScore;
        const sameTier = cur.tier === prevTier;
        if (sameScore && sameTier) {
          cur.rank = prevRank;
        } else {
          cur.rank = i + 1;
          prevRank = cur.rank;
        }
      }
      prevScore = cur.score;
      prevTier = cur.tier ?? null;
      withRank.push(cur);
    }

    // limit 적용 (서버에서 이미 제한했더라도 안전하게 처리)
    return withRank.slice(0, limit);
  } catch (err) {
    // handleApiError는 ServiceError를 던집니다.
    handleApiError(err, "리더보드 조회");
  }
}
