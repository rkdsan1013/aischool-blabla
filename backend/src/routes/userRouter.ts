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
  updateLevelHandler,
  getConversationDetailHandler,
  getTrainingHistoryListHandler,
  getTrainingDetailHandler,
} from "../controllers/userController";

const router = Router();

/**
 * GET /api/user/me
 * 내 프로필 조회
 */
router.get("/me", requireAuth, getMyProfileHandler);

/**
 * PUT /api/user/me
 * 내 프로필 수정
 */
router.put("/me", requireAuth, updateMyProfileHandler);

/**
 * PUT /api/user/me/level
 * 레벨 테스트 결과 업데이트
 */
router.put("/me/level", requireAuth, updateLevelHandler);

/**
 * PUT /api/user/me/password
 * 비밀번호 변경
 */
router.put("/me/password", requireAuth, changePasswordHandler);

/**
 * DELETE /api/user/me
 * 회원 탈퇴
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

/**
 * GET /api/user/me/history/training
 * 학습(Training) 세션 목록 조회
 */
router.get("/me/history/training", requireAuth, getTrainingHistoryListHandler);

/**
 * GET /api/user/me/history/training/:sessionId
 * 특정 학습(Training) 세션 상세 조회
 */
router.get(
  "/me/history/training/:sessionId",
  requireAuth,
  getTrainingDetailHandler
);

/**
 * GET /api/user/me/history/conversation/:sessionId
 * 회화 상세 조회 (채팅 로그 및 피드백)
 */
router.get(
  "/me/history/conversation/:sessionId",
  requireAuth,
  getConversationDetailHandler
);

export default router;
