// backend/src/routes/aiTalkRouter.ts
import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middlewares/auth";
import { aiTalkController } from "../controllers/aiTalkController";

const aiTalkRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

/* Public (no auth) level test routes */
aiTalkRouter.post("/level-test/start", aiTalkController.startLevelTest);
aiTalkRouter.post(
  "/level-test/:id/audio",
  upload.single("audio"),
  aiTalkController.sendLevelTestAudio
);
aiTalkRouter.patch("/level-test/:id/end", aiTalkController.endLevelTest);

/* Auth-protected routes */
const authRouter = Router();
authRouter.use(requireAuth);

// scenarios
authRouter.get("/scenarios", aiTalkController.getScenarios);
authRouter.get("/scenarios/:id", aiTalkController.getScenarioById);
authRouter.post("/scenarios", aiTalkController.createScenario);
authRouter.put("/scenarios/:id", aiTalkController.updateScenario);
authRouter.delete("/scenarios/:id", aiTalkController.deleteScenario);

// sessions & messages
authRouter.post("/sessions", aiTalkController.startSession);
authRouter.post("/sessions/:id/messages", aiTalkController.sendMessage);
authRouter.post(
  "/sessions/:id/audio",
  upload.single("audio"),
  aiTalkController.sendAudio
);
authRouter.patch("/sessions/:id/end", aiTalkController.endSession);

aiTalkRouter.use("/", authRouter);

export default aiTalkRouter;
