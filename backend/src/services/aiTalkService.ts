// backend/src/services/aiTalkService.ts
import { aiTalkModel } from "../models/aiTalkModel";
import { pool } from "../config/db";
import { RowDataPacket } from "mysql2";
import {
  generateTalkOpening,
  generateTalkResponse,
} from "../ai/generators/talk";
import { transcribeAudio, generateSpeech } from "../ai/audio";
import { levelTestStore } from "./levelTestStore";
import {
  generateLevelTestStart,
  generateLevelTestResponse,
} from "../ai/generators/levelTest";

/**
 * aiTalkService
 * - 기존 시나리오/세션 로직 유지 (DB 사용)
 * - 레벨 테스트 전용 로직은 메모리 스토어(levelTestStore)를 사용 (DB 사용 안 함)
 *
 * userId는 게스트의 경우 null로 전달될 수 있음.
 */

export const aiTalkService = {
  // --- 시나리오 CRUD ---
  getScenarios: async (userId: number | null) => {
    return await aiTalkModel.getScenarios(userId ?? 0);
  },

  getScenarioById: async (scenarioId: number) => {
    return await aiTalkModel.getScenarioById(scenarioId);
  },

  createCustomScenario: async (
    userId: number | null,
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
    userId: number | null,
    data: any
  ) => {
    return await aiTalkModel.updateScenario(scenarioId, userId ?? 0, data);
  },

  deleteCustomScenario: async (scenarioId: number, userId: number | null) => {
    return await aiTalkModel.deleteScenario(scenarioId, userId ?? 0);
  },

  // --- 기존 대화 세션 로직 (DB 기반) ---

  // 1. 세션 시작 (기존 시나리오 기반)
  startSession: async (
    userId: number | null,
    scenarioId: number,
    level: string
  ) => {
    const scenario = await aiTalkModel.getScenarioById(scenarioId);
    if (!scenario) throw new Error("Scenario not found");

    const sessionId = await aiTalkModel.createSession(userId ?? 0, scenarioId);

    let openingText = "";
    try {
      openingText = await generateTalkOpening(scenario.context, level);
    } catch (e) {
      console.error("LLM Opening Error:", e);
      openingText = "Hello! I'm ready to talk.";
    }

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

  // 2. 텍스트 메시지 전송 (기존)
  processUserMessage: async (
    sessionId: number,
    userId: number | null,
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
      await aiTalkModel.endSession(sessionId, userId ?? 0);
    }

    return {
      userMessage: { ...userMsgObj, feedback },
      aiMessage: aiMsgObj,
      aiAudio,
      ended: isFinished,
    };
  },

  // 3. 음성 메시지 처리 (기존)
  processUserAudio: async (
    sessionId: number,
    userId: number | null,
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

  // 4. 세션 종료 (기존)
  endSession: async (sessionId: number, userId: number | null) => {
    return await aiTalkModel.endSession(sessionId, userId ?? 0);
  },

  // -------------------------
  // 레벨 테스트 전용 로직 (메모리 기반, DB 사용 안 함)
  // -------------------------

  /**
   * startLevelTestSession
   * - 메모리 세션 생성, LLM로 첫 질문 생성
   */
  startLevelTestSession: async (userId: number | null, level: string) => {
    // 1) create memory session
    const openingHint = `Please introduce yourself briefly. Say your name, where you're from, and one hobby.`;
    const session = levelTestStore.create(userId, level, openingHint);

    // 2) ask LLM to generate a tailored opening prompt
    let openingText = openingHint;
    let aiAudio: Buffer | null = null;
    try {
      const gen = await generateLevelTestStart(
        level,
        "Level test conversation"
      );
      openingText = gen.opening ?? openingHint;
      // optional: if generator returns audioData (base64), we could decode to Buffer
      if (gen.audioData) {
        try {
          aiAudio = Buffer.from(gen.audioData, "base64");
        } catch (e) {
          aiAudio = null;
        }
      }
    } catch (e) {
      console.error("LevelTest LLM start error:", e);
      openingText = openingHint;
    }

    // 3) save AI opening to memory session
    levelTestStore.appendMessage(session.sessionId, "ai", openingText);

    // 4) optionally generate TTS for openingText
    if (!aiAudio) {
      try {
        aiAudio = await generateSpeech(openingText);
      } catch (e) {
        console.error("TTS generation failed for level test opening:", e);
        aiAudio = null;
      }
    }

    return {
      session_id: session.sessionId,
      initial_messages: session.messages,
      aiAudio,
    };
  },

  /**
   * processLevelTestAudio
   * - STT -> LLM generator (generateLevelTestResponse) 호출 -> 메모리 저장 -> 결과 반환
   * - LLM이 is_finished를 결정하면, result (level/progress)를 포함해서 반환
   */
  processLevelTestAudio: async (
    sessionId: number,
    userId: number | null,
    audioBuffer: Buffer,
    levelHint: string
  ) => {
    // 1) STT
    let transcribed = "";
    try {
      transcribed = await transcribeAudio(audioBuffer, "webm");
      if (!transcribed) transcribed = "(Unintelligible)";
    } catch (e) {
      console.error("STT error (level test):", e);
      throw new Error("Failed to transcribe audio");
    }

    // 2) memory session 확인
    const session = levelTestStore.get(sessionId);
    if (!session) {
      throw new Error("Level test session not found");
    }

    // 3) append user message
    const userMsg = levelTestStore.appendMessage(
      sessionId,
      "user",
      transcribed
    );

    // 4) prepare history for LLM (all messages)
    const history = session.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // 5) call LLM generator to analyze and produce next reply / termination decision / result
    let genResult;
    try {
      genResult = await generateLevelTestResponse({
        selectedLevel: levelHint ?? session.level,
        context: "Level test conversation",
        history,
        userMessage: transcribed,
      });
    } catch (e) {
      console.error("LevelTest LLM response error:", e);
      // fallback simple reply
      genResult = {
        reply: "Thank you. Let's continue.",
        is_finished: false,
        audioData: null,
        result: null,
      };
    }

    // 6) append AI reply to memory
    if (genResult.reply) {
      levelTestStore.appendMessage(sessionId, "ai", genResult.reply);
    }

    // 7) if finished, mark session metadata and optionally store result
    if (genResult.is_finished) {
      session.metadata = session.metadata ?? {};
      session.metadata.finalResult = genResult.result ?? null;
      session.expiresAt = null; // keep until explicit deletion if desired
      session.level = genResult.result?.level ?? session.level;
    }

    // 8) generate TTS for AI reply if audioData not provided
    let aiAudio: Buffer | null = null;
    if (genResult.audioData) {
      try {
        aiAudio = Buffer.from(genResult.audioData, "base64");
      } catch (e) {
        aiAudio = null;
      }
    }
    if (!aiAudio && genResult.reply) {
      try {
        aiAudio = await generateSpeech(genResult.reply);
      } catch (e) {
        console.error("TTS generation failed (level test reply):", e);
        aiAudio = null;
      }
    }

    // 9) prepare response payload
    const responsePayload: any = {
      userMessage: userMsg,
      aiMessage: {
        role: "ai",
        content: genResult.reply ?? "",
      },
      aiAudio,
      ended: !!genResult.is_finished,
      // result fields only meaningful when ended === true
      resultLevel: genResult.result?.level ?? null,
      resultProgress:
        typeof genResult.result?.progress === "number"
          ? genResult.result.progress
          : null,
    };

    return responsePayload;
  },

  /**
   * endLevelTestSession
   */
  endLevelTestSession: async (sessionId: number, userId: number | null) => {
    const existed = levelTestStore.delete(sessionId);
    return existed;
  },

  // -------------------------
  // 독립 문장 분석
  // -------------------------
  analyzeSentence: async (
    userId: number | null,
    content: string,
    level: string,
    context?: string
  ) => {
    try {
      // If there's an existing feedback generator, reuse it; otherwise return a placeholder
      // For now, throw not implemented to indicate this is optional
      throw new Error("analyzeSentence not implemented in this build");
    } catch (error) {
      console.error("analyzeSentence failed:", error);
      throw new Error("Failed to analyze text");
    }
  },
};

export default aiTalkService;
