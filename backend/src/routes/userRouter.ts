// backend/src/routes/userRouter.ts
import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import {
  getMyProfileHandler,
  updateMyProfileHandler,
  deleteMyAccountHandler,
  changePasswordHandler,
  getMyAttendanceHandler,
  getMyHistoryHandler, // [추가] 히스토리 핸들러 import
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
 * [필수] 이 부분이 누락되어 404 에러가 발생했습니다.
 */
router.get("/me/history", requireAuth, getMyHistoryHandler);

export default router;
