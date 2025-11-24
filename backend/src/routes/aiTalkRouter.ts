// backend/src/routes/aiTalkRouter.ts
import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middlewares/auth";
import { aiTalkController } from "../controllers/aiTalkController";

const aiTalkRouter = Router();

// Multer 설정 (메모리에 버퍼로 저장)
const upload = multer({ storage: multer.memoryStorage() });

// 모든 라우트에 로그인 인증 적용
aiTalkRouter.use(requireAuth);

// --- 시나리오 관련 ---
aiTalkRouter.get("/scenarios", aiTalkController.getScenarios);
aiTalkRouter.get("/scenarios/:id", aiTalkController.getScenarioById);
aiTalkRouter.post("/scenarios", aiTalkController.createScenario);
aiTalkRouter.put("/scenarios/:id", aiTalkController.updateScenario);
aiTalkRouter.delete("/scenarios/:id", aiTalkController.deleteScenario);

// --- 세션 및 메시지 관련 ---
aiTalkRouter.post("/sessions", aiTalkController.startSession);

// 텍스트 메시지 전송
aiTalkRouter.post("/sessions/:id/messages", aiTalkController.sendMessage);

// 오디오 메시지 전송
aiTalkRouter.post(
  "/sessions/:id/audio",
  upload.single("audio"),
  aiTalkController.sendAudio
);

aiTalkRouter.patch("/sessions/:id/end", aiTalkController.endSession);

// ✅ [신규 추가] 독립적인 피드백 분석 API (회화 세션 없이 사용 가능)
aiTalkRouter.post("/analyze", aiTalkController.analyzeText);

export default aiTalkRouter;
