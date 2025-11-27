// backend/src/routes/userRouter.ts
import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import {
  getMyProfileHandler,
  updateMyProfileHandler,
  deleteMyAccountHandler,
  changePasswordHandler,
  getMyAttendanceHandler,
  getMyHistoryHandler,
  updateLevelHandler, // [추가]
} from "../controllers/userController";

const router = Router();

/**
 * GET /api/user/me
 */
router.get("/me", requireAuth, getMyProfileHandler);

/**
 * PUT /api/user/me
 */
router.put("/me", requireAuth, updateMyProfileHandler);

/**
 * PUT /api/user/me/level
 * [추가] 레벨 테스트 결과 업데이트용
 */
router.put("/me/level", requireAuth, updateLevelHandler);

/**
 * PUT /api/user/me/password
 */
router.put("/me/password", requireAuth, changePasswordHandler);

/**
 * DELETE /api/user/me
 */
router.delete("/me", requireAuth, deleteMyAccountHandler);

/**
 * GET /api/user/me/attendance
 * 출석 통계 조회
 */
router.get("/me/attendance", requireAuth, getMyAttendanceHandler);

/**
 * GET /api/user/me/history
 * 통합 히스토리 조회
 */
router.get("/me/history", requireAuth, getMyHistoryHandler);

export default router;
