// backend/src/controllers/leaderboardController.ts
import { Request, Response, NextFunction } from "express";
import {
  getLeaderboard,
  getUserWithRank,
} from "../services/leaderboardService";

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
    return res.json({ data });
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
    const userId = Number(idParam);
    if (Number.isNaN(userId)) {
      return res.status(400).json({ message: "잘못된 사용자 ID입니다." });
    }

    const item = await getUserWithRank(userId);
    if (!item) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    return res.json({ data: item });
  } catch (err) {
    next(err);
  }
}
