// frontend/src/services/leaderboardService.ts
import { apiClient, handleApiError } from "../api/index";

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

// 서버 응답 데이터의 가능한 형태를 정의하여 any 사용 방지
interface RawLeaderItem {
  id?: string | number;
  userId?: string | number;
  name?: string;
  username?: string;
  score?: string | number;
  points?: string | number;
  tier?: string;
  user_tier?: string;
  streak_count?: string | number;
  streakCount?: string | number;
  rank?: string | number;
}

// API 응답 래퍼 (data 속성 유무 대응)
type LeaderboardApiResponse =
  | RawLeaderItem[]
  | { data: RawLeaderItem[] }
  | RawLeaderItem
  | { data: RawLeaderItem };

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

const parseNumber = (v: unknown, fallback = 0) => {
  const n = parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : fallback;
};

const normalizeRawItem = (d: RawLeaderItem, idx: number): LeaderItem => ({
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
    // apiClient 사용 (AxiosResponse 타입을 명시하지 않고 추론 사용하거나 제네릭으로 데이터 타입 지정)
    const res = await apiClient.get<LeaderboardApiResponse>("/leaderboard", {
      params: { limit },
    });

    // 데이터 구조 유연하게 처리 (res.data 자체가 배열일 수도, { data: [...] } 일 수도 있음)
    // 타입 가드를 통해 안전하게 배열로 변환
    let rawList: RawLeaderItem[] = [];

    if (Array.isArray(res.data)) {
      rawList = res.data;
    } else if (
      res.data &&
      "data" in res.data &&
      Array.isArray((res.data as { data: RawLeaderItem[] }).data)
    ) {
      rawList = (res.data as { data: RawLeaderItem[] }).data;
    }

    const normalized: LeaderItem[] = rawList.map((d, i) =>
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
    const res = await apiClient.get<LeaderboardApiResponse>(
      `/leaderboard/${encodeURIComponent(normalizedId)}`
    );

    let raw: RawLeaderItem | null = null;

    if (res.data) {
      if ("data" in res.data && !Array.isArray(res.data.data)) {
        raw = res.data.data as RawLeaderItem;
      } else if (!Array.isArray(res.data)) {
        raw = res.data as RawLeaderItem;
      }
    }

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

    // safe property access for error status without 'any'
    const status = (err as { response?: { status?: number } })?.response
      ?.status;

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
