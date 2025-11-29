import { Router } from "express";
import {
  vocabularyHandler,
  sentenceHandler,
  blankHandler,
  writingHandler,
  speakingHandler,
} from "./controller";

const router = Router();

/**
 * POST /api/ai/vocabulary
 * (단어 문제 생성)
 */
router.post("/vocabulary", vocabularyHandler);

/**
 * POST /api/ai/sentence
 * (문장 순서 맞추기 문제 생성)
 */
router.post("/sentence", sentenceHandler);

/**
 * POST /api/ai/blank
 * (빈칸 채우기 문제 생성)
 */
router.post("/blank", blankHandler);

/**
 * POST /api/ai/writing
 * (작문 문제 생성)
 */
router.post("/writing", writingHandler);

/**
 * POST /api/ai/speaking
 * (말하기/쉐도잉 문제 생성)
 */
router.post("/speaking", speakingHandler);

export default router;
