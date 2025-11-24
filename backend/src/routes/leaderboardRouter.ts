// backend/src/routes/leaderboardRouter.ts
import express from "express";
import {
  handleGetLeaderboard,
  handleGetLeaderboardById,
} from "../controllers/leaderboardController";

const router = express.Router();

/**
 * GET /api/leaderboard
 * optional query: ?limit=50
 */
router.get("/", handleGetLeaderboard);

/**
 * GET /api/leaderboard/:id
 */
router.get("/:id", handleGetLeaderboardById);

export default router;
