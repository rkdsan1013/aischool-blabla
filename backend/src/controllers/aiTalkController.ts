// backend/src/controllers/aiTalkController.ts
import { Request, Response } from "express";
import { aiTalkService } from "../services/aiTalkService";

/**
 * aiTalkController
 * - 기존 인증 필요 핸들러는 requireAuth 미들웨어로 보호됨
 * - 레벨 테스트 핸들러는 인증 없이 동작 (req.user가 없을 수 있음)
 */

export const aiTalkController = {
  // GET /api/ai-talk/scenarios  (인증 필요)
  getScenarios: async (req: Request, res: Response) => {
    try {
      const userId = req.user ? req.user.user_id : null;
      const scenarios = await aiTalkService.getScenarios(userId);
      res.json(scenarios);
    } catch (error) {
      console.error("[Controller] getScenarios error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // GET /api/ai-talk/scenarios/:id  (인증 필요)
  getScenarioById: async (req: Request, res: Response) => {
    try {
      const scenarioId = Number(req.params.id);
      const scenario = await aiTalkService.getScenarioById(scenarioId);
      if (!scenario)
        return res.status(404).json({ message: "Scenario not found" });
      res.json(scenario);
    } catch (error) {
      console.error("[Controller] getScenarioById error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // POST /api/ai-talk/scenarios  (인증 필요)
  createScenario: async (req: Request, res: Response) => {
    try {
      const userId = req.user ? req.user.user_id : null;
      const { title, description, context } = req.body;
      const newScenario = await aiTalkService.createCustomScenario(userId, {
        title,
        description,
        context,
      });
      res.status(201).json(newScenario);
    } catch (error) {
      console.error("[Controller] createScenario error:", error);
      res.status(500).json({ message: "Failed to create scenario" });
    }
  },

  // PUT /api/ai-talk/scenarios/:id  (인증 필요)
  updateScenario: async (req: Request, res: Response) => {
    try {
      const userId = req.user ? req.user.user_id : null;
      const scenarioId = Number(req.params.id);
      const success = await aiTalkService.updateCustomScenario(
        scenarioId,
        userId,
        req.body
      );
      if (!success)
        return res.status(403).json({ message: "Forbidden or Not Found" });
      res.json({ message: "Updated successfully" });
    } catch (error) {
      console.error("[Controller] updateScenario error:", error);
      res.status(500).json({ message: "Update failed" });
    }
  },

  // DELETE /api/ai-talk/scenarios/:id  (인증 필요)
  deleteScenario: async (req: Request, res: Response) => {
    try {
      const userId = req.user ? req.user.user_id : null;
      const scenarioId = Number(req.params.id);
      const success = await aiTalkService.deleteCustomScenario(
        scenarioId,
        userId
      );
      if (!success)
        return res.status(403).json({ message: "Forbidden or Not Found" });
      res.json({ message: "Deleted successfully" });
    } catch (error) {
      console.error("[Controller] deleteScenario error:", error);
      res.status(500).json({ message: "Delete failed" });
    }
  },

  // POST /api/ai-talk/sessions  (인증 필요)
  startSession: async (req: Request, res: Response) => {
    try {
      const userId = req.user!.user_id;
      const level = req.user!.level ?? "A1";
      const { scenario_id } = req.body;

      const result = await aiTalkService.startSession(
        userId,
        scenario_id,
        level
      );
      const audioBase64 = result.aiAudio
        ? result.aiAudio.toString("base64")
        : null;

      res.status(201).json({
        session: { session_id: result.session_id },
        initialMessages: result.initial_messages,
        audioData: audioBase64,
      });
    } catch (error) {
      console.error("[Controller] startSession error:", error);
      res.status(500).json({ message: "Failed to start session" });
    }
  },

  // POST /api/ai-talk/sessions/:id/messages  (인증 필요)
  sendMessage: async (req: Request, res: Response) => {
    try {
      const userId = req.user!.user_id;
      const level = req.user!.level ?? "A1";
      const sessionId = Number(req.params.id);
      const { content } = req.body;

      const result = await aiTalkService.processUserMessage(
        sessionId,
        userId,
        content,
        level
      );
      const audioBase64 = result.aiAudio
        ? result.aiAudio.toString("base64")
        : null;

      res.json({ ...result, audioData: audioBase64 });
    } catch (error) {
      console.error("[Controller] sendMessage error:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  },

  // POST /api/ai-talk/sessions/:id/audio  (인증 필요)
  sendAudio: async (req: Request, res: Response) => {
    try {
      const userId = req.user!.user_id;
      const level = req.user!.level ?? "A1";
      const sessionId = Number(req.params.id);
      const audioFile = req.file;
      if (!audioFile)
        return res.status(400).json({ message: "No audio file uploaded" });

      const result = await aiTalkService.processUserAudio(
        sessionId,
        userId,
        audioFile.buffer,
        level
      );
      const audioBase64 = result.aiAudio
        ? result.aiAudio.toString("base64")
        : null;

      res.json({ ...result, audioData: audioBase64 });
    } catch (error) {
      console.error("[Controller] sendAudio error:", error);
      res.status(500).json({ message: "Failed to process audio message" });
    }
  },

  // PATCH /api/ai-talk/sessions/:id/end  (인증 필요)
  endSession: async (req: Request, res: Response) => {
    try {
      const userId = req.user!.user_id;
      const sessionId = Number(req.params.id);
      await aiTalkService.endSession(sessionId, userId);
      res.json({ message: "Session ended" });
    } catch (error) {
      console.error("[Controller] endSession error:", error);
      res.status(500).json({ message: "Failed to end session" });
    }
  },

  // -------------------------
  // 레벨 테스트 전용 핸들러 (인증 없음)
  // -------------------------

  // POST /api/ai-talk/level-test/start
  startLevelTest: async (req: Request, res: Response) => {
    try {
      const userId = req.user ? req.user.user_id : null;
      const selectedLevel = req.body?.selectedLevel ?? req.user?.level ?? "A1";

      const result = await aiTalkService.startLevelTestSession(
        userId,
        selectedLevel
      );
      const audioBase64 = result.aiAudio
        ? result.aiAudio.toString("base64")
        : null;

      res.status(201).json({
        session: { session_id: result.session_id },
        initialMessages: result.initial_messages,
        audioData: audioBase64,
      });
    } catch (error) {
      console.error("[Controller] startLevelTest error:", error);
      res.status(500).json({ message: "Failed to start level test" });
    }
  },

  // POST /api/ai-talk/level-test/:id/audio
  sendLevelTestAudio: async (req: Request, res: Response) => {
    try {
      const userId = req.user ? req.user.user_id : null;
      const level = req.body?.level ?? req.user?.level ?? "A1";
      const sessionId = Number(req.params.id);
      const audioFile = req.file;

      if (!audioFile) {
        return res.status(400).json({ message: "No audio file uploaded" });
      }

      const result = await aiTalkService.processLevelTestAudio(
        sessionId,
        userId,
        audioFile.buffer,
        level
      );

      const audioBase64 = result.aiAudio
        ? result.aiAudio.toString("base64")
        : null;

      // Normalize response shape expected by frontend
      res.json({
        userMessage: result.userMessage,
        aiMessage: result.aiMessage,
        audioData: audioBase64,
        ended: result.ended,
        resultLevel: result.resultLevel ?? null,
        resultProgress: result.resultProgress ?? null,
      });
    } catch (error) {
      console.error("[Controller] sendLevelTestAudio error:", error);
      if ((error as Error).message?.includes("session not found")) {
        return res
          .status(404)
          .json({ message: "Level test session not found" });
      }
      res.status(500).json({ message: "Failed to process level test audio" });
    }
  },

  // PATCH /api/ai-talk/level-test/:id/end
  endLevelTest: async (req: Request, res: Response) => {
    try {
      const userId = req.user ? req.user.user_id : null;
      const sessionId = Number(req.params.id);
      const ok = await aiTalkService.endLevelTestSession(sessionId, userId);
      if (!ok) return res.status(404).json({ message: "Session not found" });
      res.json({ message: "Level test session ended" });
    } catch (error) {
      console.error("[Controller] endLevelTest error:", error);
      res.status(500).json({ message: "Failed to end level test session" });
    }
  },

  // POST /api/ai-talk/analyze  (인증 필요)
  analyzeText: async (req: Request, res: Response) => {
    try {
      const userId = req.user ? req.user.user_id : null;
      const level = req.user?.level ?? "A1";
      const { content, context } = req.body;
      if (!content)
        return res.status(400).json({ message: "Content is required" });

      const result = await aiTalkService.analyzeSentence(
        userId,
        content,
        level,
        context
      );
      res.json(result);
    } catch (error) {
      console.error("[Controller] analyzeText error:", error);
      res.status(500).json({ message: "Failed to analyze text" });
    }
  },
};

export default aiTalkController;
