// backend/src/controllers/aiTalkController.ts
import { Request, Response } from "express";
import { aiTalkService } from "../services/aiTalkService";

export const aiTalkController = {
  // GET /api/scenarios
  getScenarios: async (req: Request, res: Response) => {
    try {
      const userId = req.user!.user_id;
      const scenarios = await aiTalkService.getScenarios(userId);
      res.json(scenarios);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // GET /api/scenarios/:id
  getScenarioById: async (req: Request, res: Response) => {
    try {
      const scenarioId = Number(req.params.id);
      const scenario = await aiTalkService.getScenarioById(scenarioId);
      if (!scenario) {
        return res.status(404).json({ message: "Scenario not found" });
      }
      res.json(scenario);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // POST /api/scenarios
  createScenario: async (req: Request, res: Response) => {
    try {
      const userId = req.user!.user_id;
      const { title, description, context } = req.body;
      const newScenario = await aiTalkService.createCustomScenario(userId, {
        title,
        description,
        context,
      });
      res.status(201).json(newScenario);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to create scenario" });
    }
  },

  // PUT /api/scenarios/:id
  updateScenario: async (req: Request, res: Response) => {
    try {
      const userId = req.user!.user_id;
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
      res.status(500).json({ message: "Update failed" });
    }
  },

  // DELETE /api/scenarios/:id
  deleteScenario: async (req: Request, res: Response) => {
    try {
      const userId = req.user!.user_id;
      const scenarioId = Number(req.params.id);
      const success = await aiTalkService.deleteCustomScenario(
        scenarioId,
        userId
      );
      if (!success)
        return res.status(403).json({ message: "Forbidden or Not Found" });
      res.json({ message: "Deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Delete failed" });
    }
  },

  // POST /api/sessions
  startSession: async (req: Request, res: Response) => {
    try {
      const userId = req.user!.user_id;
      const level = req.user!.level || "A1";
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
      console.error(error);
      res.status(500).json({ message: "Failed to start session" });
    }
  },

  // POST /api/sessions/:id/messages
  sendMessage: async (req: Request, res: Response) => {
    try {
      const userId = req.user!.user_id;
      const level = req.user!.level || "A1";
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

      res.json({
        ...result,
        audioData: audioBase64,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to send message" });
    }
  },

  // POST /api/sessions/:id/audio
  sendAudio: async (req: Request, res: Response) => {
    try {
      const userId = req.user!.user_id;
      const level = req.user!.level || "A1";
      const sessionId = Number(req.params.id);
      const audioFile = req.file;

      if (!audioFile) {
        return res.status(400).json({ message: "No audio file uploaded" });
      }

      const result = await aiTalkService.processUserAudio(
        sessionId,
        userId,
        audioFile.buffer,
        level
      );

      const audioBase64 = result.aiAudio
        ? result.aiAudio.toString("base64")
        : null;

      res.json({
        ...result,
        audioData: audioBase64,
      });
    } catch (error) {
      console.error("[Controller] sendAudio error:", error);
      res.status(500).json({ message: "Failed to process audio message" });
    }
  },

  // PATCH /api/sessions/:id/end
  endSession: async (req: Request, res: Response) => {
    try {
      const userId = req.user!.user_id;
      const sessionId = Number(req.params.id);
      await aiTalkService.endSession(sessionId, userId);
      res.json({ message: "Session ended" });
    } catch (error) {
      res.status(500).json({ message: "Failed to end session" });
    }
  },

  // ✅ [신규 추가] 텍스트 분석/피드백 핸들러
  analyzeText: async (req: Request, res: Response) => {
    try {
      const userId = req.user!.user_id;
      const level = req.user!.level || "A1";
      const { content, context } = req.body;

      if (!content) {
        return res.status(400).json({ message: "Content is required" });
      }

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
