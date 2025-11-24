// backend/src/models/aiTalkModel.ts
import { pool } from "../config/db";
import { ResultSetHeader, RowDataPacket } from "mysql2";

/**
 * DB row 타입 정의
 */
export interface AIScenario {
  scenario_id: number;
  user_id: number | null;
  title: string;
  description: string;
  context: string;
  created_at?: Date | string | null;
}

export interface AIMessage {
  message_id: number;
  session_id: number;
  sender_role: "user" | "ai";
  content: string;
  created_at: Date;
}

/**
 * aiTalkModel
 * - ai_scenarios, ai_sessions, ai_messages, ai_feedbacks 테이블과 상호작용
 */
export const aiTalkModel = {
  // 1. 시나리오 목록 조회
  async getScenarios(userId: number): Promise<AIScenario[]> {
    const query = `
      SELECT * FROM ai_scenarios
      WHERE user_id IS NULL OR user_id = ?
      ORDER BY user_id IS NOT NULL, created_at DESC
    `;
    const [rows] = await pool.query<RowDataPacket[]>(query, [userId]);
    return rows as AIScenario[];
  },

  // 2. 특정 시나리오 조회
  async getScenarioById(scenarioId: number): Promise<AIScenario | null> {
    const query = `SELECT * FROM ai_scenarios WHERE scenario_id = ? LIMIT 1`;
    const [rows] = await pool.query<RowDataPacket[]>(query, [scenarioId]);
    const result = (rows as AIScenario[])[0];
    return result ?? null;
  },

  // 3. 커스텀 시나리오 생성
  async createScenario(
    userId: number | null,
    title: string,
    description: string,
    context: string
  ): Promise<number> {
    const query = `
      INSERT INTO ai_scenarios (user_id, title, description, context)
      VALUES (?, ?, ?, ?)
    `;
    const [result] = await pool.query<ResultSetHeader>(query, [
      userId,
      title,
      description,
      context,
    ]);
    return result.insertId;
  },

  // 4. 커스텀 시나리오 수정
  async updateScenario(
    scenarioId: number,
    userId: number,
    data: { title?: string; description?: string; context?: string }
  ): Promise<boolean> {
    const query = `
      UPDATE ai_scenarios
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          context = COALESCE(?, context),
          updated_at = NOW()
      WHERE scenario_id = ? AND user_id = ?
    `;
    const [result] = await pool.query<ResultSetHeader>(query, [
      data.title ?? null,
      data.description ?? null,
      data.context ?? null,
      scenarioId,
      userId,
    ]);
    return result.affectedRows > 0;
  },

  // 5. 시나리오 삭제
  async deleteScenario(scenarioId: number, userId: number): Promise<boolean> {
    const query = `DELETE FROM ai_scenarios WHERE scenario_id = ? AND user_id = ?`;
    const [result] = await pool.query<ResultSetHeader>(query, [
      scenarioId,
      userId,
    ]);
    return result.affectedRows > 0;
  },

  // 6. 세션 생성 (DB의 ai_sessions 테이블과 매칭)
  async createSession(userId: number, scenarioId: number): Promise<number> {
    // started_at은 DB 기본값(CURRENT_TIMESTAMP)을 사용해도 되지만, 명시적으로 NOW() 사용
    const query = `
      INSERT INTO ai_sessions (user_id, scenario_id, status, started_at)
      VALUES (?, ?, 'ACTIVE', NOW())
    `;
    const [result] = await pool.query<ResultSetHeader>(query, [
      userId,
      scenarioId,
    ]);
    return result.insertId;
  },

  // 7. 메시지 생성 (DB의 ai_messages 테이블과 매칭)
  async createMessage(
    sessionId: number,
    role: "user" | "ai",
    content: string
  ): Promise<AIMessage> {
    const query = `
      INSERT INTO ai_messages (session_id, sender_role, content, created_at)
      VALUES (?, ?, ?, NOW())
    `;
    const [result] = await pool.query<ResultSetHeader>(query, [
      sessionId,
      role,
      content,
    ]);

    return {
      message_id: result.insertId,
      session_id: sessionId,
      sender_role: role,
      content,
      created_at: new Date(),
    };
  },

  // 7b. 세션의 모든 메시지 조회 (유틸)
  async getMessagesBySession(sessionId: number): Promise<AIMessage[]> {
    const query = `
      SELECT message_id, session_id, sender_role, content, created_at
      FROM ai_messages
      WHERE session_id = ?
      ORDER BY created_at ASC
    `;
    const [rows] = await pool.query<RowDataPacket[]>(query, [sessionId]);

    return (rows as any[]).map((r) => ({
      message_id: r.message_id,
      session_id: r.session_id,
      sender_role: r.sender_role,
      content: r.content,
      created_at:
        r.created_at instanceof Date ? r.created_at : new Date(r.created_at),
    })) as AIMessage[];
  },

  // 8. 피드백 저장 (DB의 ai_feedbacks 테이블과 매칭)
  async createFeedback(messageId: number, feedbackData: any): Promise<void> {
    const query = `
      INSERT INTO ai_feedbacks (message_id, feedback_data, created_at)
      VALUES (?, ?, NOW())
    `;
    // feedbackData 객체를 JSON 문자열로 변환하여 저장
    await pool.query(query, [messageId, JSON.stringify(feedbackData)]);
  },

  // 9. 세션 종료
  async endSession(sessionId: number, userId: number): Promise<boolean> {
    const query = `
      UPDATE ai_sessions
      SET status = 'COMPLETED', ended_at = NOW()
      WHERE session_id = ? AND user_id = ? AND status = 'ACTIVE'
    `;
    const [result] = await pool.query<ResultSetHeader>(query, [
      sessionId,
      userId,
    ]);
    return result.affectedRows > 0;
  },
};
