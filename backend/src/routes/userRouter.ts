// backend/src/routes/userRouter.ts
import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import {
  getMyProfileHandler,
  updateMyProfileHandler,
  deleteMyAccountHandler,
  changePasswordHandler,
  getMyAttendanceHandler, // [추가]
} from "../controllers/userController";

const router = Router();

router.get("/me", requireAuth, getMyProfileHandler);
router.put("/me", requireAuth, updateMyProfileHandler);
router.put("/me/password", requireAuth, changePasswordHandler);
router.delete("/me", requireAuth, deleteMyAccountHandler);

// [추가] 출석 통계 조회
router.get("/me/attendance", requireAuth, getMyAttendanceHandler);

export default router;
