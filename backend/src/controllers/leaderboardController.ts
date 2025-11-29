import { Request, Response, NextFunction } from "express";
import {
  getLeaderboard,
  getUserWithRank,
} from "../services/leaderboardService";

/**
 * Helper: normalize streak field names from various sources
 */
function normalizeStreakField<T extends Record<string, any>>(obj: T) {
  const streak =
    typeof obj.streak_count === "number"
      ? obj.streak_count
      : typeof obj.streakCount === "number"
      ? obj.streakCount
      : typeof obj.streak === "number"
      ? obj.streak
      : 0;
  return {
    ...obj,
    streak_count: streak,
  };
}

/**
 * GET /api/leaderboard?limit=50
 */
export async function handleGetLeaderboard(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const limitParam = req.query.limit;
    const limit =
      typeof limitParam === "string"
        ? parseInt(limitParam, 10)
        : Number(limitParam) || 50;

    const data = await getLeaderboard(limit);

    // 안전하게 배열인지 확인하고 streak 필드 정규화
    const normalized =
      Array.isArray(data) && data.length > 0
        ? data.map((item) => normalizeStreakField(item as Record<string, any>))
        : [];

    return res.json({ data: normalized });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/leaderboard/:id
 * 특정 사용자와 해당 사용자의 순위를 반환
 */
export async function handleGetLeaderboardById(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const idParam = req.params.id;
    if (!idParam) {
      return res.status(400).json({ message: "사용자 ID가 필요합니다." });
    }

    // id가 숫자형일 수도 있고 문자열일 수도 있으므로 유연하게 처리
    const item = await getUserWithRank(idParam);
    if (!item) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    // streak 필드 정규화
    const normalizedItem = normalizeStreakField(item as Record<string, any>);

    return res.json({ data: normalizedItem });
  } catch (err) {
    next(err);
  }
}
