import { apiClient, handleApiError } from "../api/index";
import type { AxiosResponse } from "axios";

export type LeaderItem = {
  id: string;
  name: string;
  score: number;
  tier?: string;
  streak_count?: number;
  rank?: number;
  // 클라이언트에서 편의상 현재 사용자 여부를 표시할 수 있게 추가 (선택적)
  isCurrentUser?: boolean;
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

const parseNumber = (v: any, fallback = 0) => {
  const n = parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : fallback;
};

const normalizeRawItem = (d: any, idx: number): LeaderItem => ({
  id: String(d.id ?? d.userId ?? `u-${idx}`).trim(),
  name: d.name ?? d.username ?? "익명",
  score: parseNumber(d.score ?? d.points ?? 0, 0),
  tier: d.tier ?? d.user_tier ?? "Bronze",
  streak_count: parseNumber(d.streak_count ?? d.streakCount ?? 0, 0),
  rank: undefined,
});

/**
 * 서버에서 리더보드 데이터를 가져와 정규화 및 정렬, 순위 부여 후 반환합니다.
 * - 우선순위: score 내림차순, 동점 시 tier 우선순위
 * - 동점 & 동일 티어인 경우 동일 rank 부여
 * - 에러 발생 시 handleApiError 호출 후 예외를 던집니다.
 */
export async function getLeaderboard({
  limit = 50,
}: {
  limit?: number;
} = {}): Promise<LeaderItem[]> {
  try {
    const res: AxiosResponse<any> = await apiClient.get("/leaderboard", {
      params: { limit },
    });

    const raw = (res.data && (res.data.data ?? res.data)) ?? [];

    const normalized: LeaderItem[] = (raw as any[]).map((d, i) =>
      normalizeRawItem(d, i)
    );

    // 정렬: score desc, tier 우선순위, 결정성을 위해 id 비교 추가
    normalized.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const tierDiff = tierPriority(a.tier) - tierPriority(b.tier);
      if (tierDiff !== 0) return tierDiff;
      return a.id.localeCompare(b.id);
    });

    // 순위 부여 (동점 & 동일 티어 -> 동일 순위)
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
    }

    // limit 적용: 동일 rank 그룹이 잘리는 것을 방지하려면 마지막 rank까지 포함
    const sliced = normalized.slice(0, limit);
    const lastRank = sliced[sliced.length - 1]?.rank;
    if (lastRank != null) {
      return normalized.filter((item) => item.rank! <= lastRank);
    }
    return sliced;
  } catch (err) {
    // handleApiError는 로깅/사용자용 에러 변환 등을 수행합니다.
    handleApiError(err, "리더보드 조회");
    // 호출자에서 에러를 처리할 수 있도록 재던짐
    throw err;
  }
}

/**
 * 특정 사용자(id) 한 명의 리더보드 항목을 가져옵니다.
 * - 우선적으로 `/leaderboard/{id}` 엔드포인트를 시도하고, 실패하거나 엔드포인트가 없으면 전체 리더보드를 가져와 검색합니다.
 * - 반환값이 없으면 null을 반환합니다.
 */
export async function getLeaderItemById(
  id: string
): Promise<LeaderItem | null> {
  const normalizedId = String(id ?? "").trim();
  if (!normalizedId) return null;

  // 1) 서버에 개별 조회 엔드포인트가 있는 경우 우선 시도
  try {
    const res: AxiosResponse<any> = await apiClient.get(
      `/leaderboard/${encodeURIComponent(normalizedId)}`
    );
    const raw = (res.data && (res.data.data ?? res.data)) ?? null;
    if (raw) {
      // 서버가 단일 객체를 반환하는 경우
      const item = normalizeRawItem(raw, 0);
      // 서버에서 rank를 내려주는 경우가 있다면 사용
      if (raw.rank != null)
        item.rank = Number.isFinite(Number(raw.rank))
          ? Number(raw.rank)
          : item.rank;
      return item;
    }
  } catch (err) {
    // 개별 엔드포인트가 없거나 404 등일 수 있으므로 여기서는 무조건 실패 처리하지 않고 폴백으로 진행
    // 다만 치명적 에러(인증 등)는 handleApiError로 처리
    // 404는 무시하고 전체 조회로 폴백
    const status = (err as any)?.response?.status;
    if (status && status >= 500) {
      handleApiError(err, `리더보드 개별 조회 (${id})`);
      throw err;
    }
    // 4xx (예: 404) 는 폴백으로 처리
  }

  // 2) 폴백: 전체 리더보드를 가져와서 id로 검색
  try {
    // limit을 충분히 크게 잡아 전체에서 찾도록 함
    const all = await getLeaderboard({ limit: 1000 });
    const found =
      all.find((it) => String(it.id).trim() === normalizedId) ?? null;
    return found;
  } catch (err) {
    handleApiError(err, `리더보드에서 사용자 검색 (${id})`);
    throw err;
  }
}
