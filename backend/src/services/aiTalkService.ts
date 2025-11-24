// backend/src/services/aiTalkService.ts
import { aiTalkModel } from "../models/aiTalkModel";
import { pool } from "../config/db";
import { RowDataPacket } from "mysql2";
import {
  generateTalkOpening,
  generateTalkResponse,
} from "../ai/generators/talk";
import { generateFeedbackOnly } from "../ai/generators/feedback"; // ✅ 신규 추가
import { transcribeAudio, generateSpeech } from "../ai/audio";

export const aiTalkService = {
  // --- 시나리오 CRUD ---
  getScenarios: async (userId: number) => {
    return await aiTalkModel.getScenarios(userId);
  },

  getScenarioById: async (scenarioId: number) => {
    return await aiTalkModel.getScenarioById(scenarioId);
  },

  createCustomScenario: async (
    userId: number,
    data: { title: string; description: string; context: string }
  ) => {
    const id = await aiTalkModel.createScenario(
      userId,
      data.title,
      data.description,
      data.context
    );
    return { scenario_id: id, ...data };
  },

  updateCustomScenario: async (
    scenarioId: number,
    userId: number,
    data: any
  ) => {
    return await aiTalkModel.updateScenario(scenarioId, userId, data);
  },

  deleteCustomScenario: async (scenarioId: number, userId: number) => {
    return await aiTalkModel.deleteScenario(scenarioId, userId);
  },

  // --- 대화 세션 로직 ---

  // 1. 세션 시작
  startSession: async (userId: number, scenarioId: number, level: string) => {
    const scenario = await aiTalkModel.getScenarioById(scenarioId);
    if (!scenario) throw new Error("Scenario not found");

    const sessionId = await aiTalkModel.createSession(userId, scenarioId);

    // AI 첫 마디 생성
    let openingText = "";
    try {
      openingText = await generateTalkOpening(scenario.context, level);
    } catch (e) {
      console.error("LLM Opening Error:", e);
      openingText = "Hello! I'm ready to talk.";
    }

    // AI 첫 마디 음성 생성 (TTS)
    let aiAudio: Buffer | null = null;
    try {
      aiAudio = await generateSpeech(openingText);
    } catch (e) {
      console.error("TTS generation failed for opening:", e);
    }

    const aiMessage = await aiTalkModel.createMessage(
      sessionId,
      "ai",
      openingText
    );

    return {
      session_id: sessionId,
      initial_messages: [aiMessage],
      aiAudio,
    };
  },

  // 2. 메시지 전송 (텍스트 입력 -> AI 응답 텍스트/음성)
  processUserMessage: async (
    sessionId: number,
    userId: number,
    content: string,
    level: string
  ) => {
    const userMsgObj = await aiTalkModel.createMessage(
      sessionId,
      "user",
      content
    );

    const [sessionRows] = await pool.query<RowDataPacket[]>(
      `SELECT sc.context 
       FROM ai_sessions s
       JOIN ai_scenarios sc ON s.scenario_id = sc.scenario_id
       WHERE s.session_id = ?`,
      [sessionId]
    );
    const context = sessionRows[0]?.context || "Daily conversation";

    const allMessages = await aiTalkModel.getMessagesBySession(sessionId);
    const history = allMessages
      .filter((m) => m.message_id !== userMsgObj.message_id)
      .slice(-10)
      .map((m) => ({
        role: m.sender_role,
        content: m.content,
      }));

    let reply = "I heard you.";
    let feedback = null;
    let isFinished = false;

    try {
      const llmResult = await generateTalkResponse(
        context,
        history,
        content,
        level
      );
      reply = llmResult.reply;
      feedback = llmResult.feedback;
      isFinished = llmResult.is_finished || false;
    } catch (e) {
      console.error("LLM Response Error:", e);
      reply = "Sorry, I'm having trouble thinking right now.";
    }

    let aiAudio: Buffer | null = null;
    try {
      aiAudio = await generateSpeech(reply);
    } catch (e) {
      console.error("TTS generation failed:", e);
    }

    const aiMsgObj = await aiTalkModel.createMessage(sessionId, "ai", reply);

    if (feedback) {
      await aiTalkModel.createFeedback(userMsgObj.message_id, feedback);
    }

    if (isFinished) {
      await aiTalkModel.endSession(sessionId, userId);
    }

    return {
      userMessage: { ...userMsgObj, feedback },
      aiMessage: aiMsgObj,
      aiAudio,
      ended: isFinished,
    };
  },

  // 3. 음성 메시지 처리 (오디오 입력 -> STT -> AI 처리)
  processUserAudio: async (
    sessionId: number,
    userId: number,
    audioBuffer: Buffer,
    level: string
  ) => {
    let transcribedText = "";
    try {
      transcribedText = await transcribeAudio(audioBuffer, "webm");
      if (!transcribedText) transcribedText = "(Unintelligible audio)";
    } catch (e) {
      console.error("STT Error:", e);
      throw new Error("Failed to transcribe audio");
    }

    return await aiTalkService.processUserMessage(
      sessionId,
      userId,
      transcribedText,
      level
    );
  },

  // 4. 세션 종료
  endSession: async (sessionId: number, userId: number) => {
    return await aiTalkModel.endSession(sessionId, userId);
  },

  // ✅ [신규 추가] 독립적인 문장 분석/피드백 서비스
  analyzeSentence: async (
    userId: number,
    content: string,
    level: string,
    context?: string
  ) => {
    try {
      const feedback = await generateFeedbackOnly(content, level, context);
      // 필요하다면 여기에 분석 로그 저장 로직 추가 가능
      return feedback;
    } catch (error) {
      console.error("Feedback generation failed:", error);
      throw new Error("Failed to generate feedback");
    }
  },
};
