import { Router } from "express";
import {
  fetchTrainingQuestionsHandler,
  verifyAnswerHandler,
  completeTrainingHandler,
} from "../controllers/trainingController";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/:type", requireAuth, fetchTrainingQuestionsHandler);
router.post("/verify", requireAuth, verifyAnswerHandler);
router.post("/complete", requireAuth, completeTrainingHandler);

export default router;
