// backend/src/models/userModel.ts
import { pool } from "../config/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";

// CEFR 레벨 타입 유니온
export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

// 기본 User 타입 (users 테이블)
export type User = {
  user_id: number;
  email: string;
  password?: string;
  created_at?: string;
  updated_at?: string;
};

// 프로필이 포함된 User 타입 (JOIN 결과)
export type UserWithProfile = User & {
  name: string | null;
  level: CEFRLevel | null;
  level_progress: number | null;
  profile_img: string | null;
  streak_count: number | null;
  total_study_time: number | null;
  completed_lessons: number | null;
  score: number | null;
  tier: string | null;
  last_study_date: Date | null;
};

// 통합 히스토리 아이템 타입
export interface UserHistoryItem {
  id: string;
  type: "TRAINING" | "CONVERSATION";
  subType: string;
  title: string;
  date: string;
  score?: number;
  durationSeconds?: number;
  messageCount?: number;
  preview?: string;
}

// 회화 세션 상세 정보 타입
export interface ConversationSessionRow extends RowDataPacket {
  session_id: number;
  topic: string;
  description: string;
  started_at: string;
  ended_at: string | null;
}

// 회화 메시지 + 피드백 타입
export interface ConversationMessageRow extends RowDataPacket {
  message_id: number;
  sender_role: "user" | "ai";
  content: string;
  created_at: string;
  feedback_data: any; // JSON
}

// Training 세션 Row 타입 (training_sessions 테이블)
// session_data 컬럼은 MySQL JSON 타입으로 저장되어 있으며, mysql2 설정에 따라
// JS 객체로 바로 반환되거나 문자열로 반환될 수 있으므로 서비스/모델에서 안전하게 파싱합니다.
export interface TrainingSessionRow extends RowDataPacket {
  session_id: number;
  user_id: number;
  type: "vocabulary" | "sentence" | "blank" | "writing" | "speaking";
  score: number;
  duration_seconds: number;
  session_data: any; // JSON
  created_at: string;
}

/**
 * users 테이블에서 이메일로 사용자 조회
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const [rows] = await pool.execute<User[] & RowDataPacket[]>(
    "SELECT * FROM users WHERE email = ?",
    [email]
  );
  return rows[0] ?? null;
}

/**
 * user + profile JOIN 조회
 */
export async function findUserWithProfileById(
  userId: number
): Promise<UserWithProfile | null> {
  const [rows] = await pool.execute<UserWithProfile[] & RowDataPacket[]>(
    `SELECT 
      u.user_id, u.email, u.password, u.created_at, u.updated_at,
      p.name, p.level, p.level_progress, p.profile_img,
      p.streak_count, p.total_study_time, p.completed_lessons,
      p.score, p.tier, p.last_study_date
     FROM users u
     LEFT JOIN user_profiles p ON u.user_id = p.user_id
     WHERE u.user_id = ?`,
    [userId]
  );

  return rows[0] ?? null;
}

/**
 * 회원가입 트랜잭션 (users + user_profiles)
 */
export async function createUserAndProfileTransaction(user: {
  name: string;
  email: string;
  password: string;
  level?: string;
}): Promise<{ user_id: number; email: string }> {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [userInsertResult] = await connection.execute<ResultSetHeader>(
      "INSERT INTO users (email, password) VALUES (?, ?)",
      [user.email, user.password]
    );

    const newUserId = userInsertResult.insertId;
    if (!newUserId) {
      throw new Error("유저 생성에 실패했습니다.");
    }

    const initialLevel = user.level || "A1";

    await connection.execute(
      `INSERT INTO user_profiles 
       (user_id, name, level, level_progress) 
       VALUES (?, ?, ?, ?)`,
      [newUserId, user.name, initialLevel, 0]
    );

    await connection.commit();
    return { user_id: newUserId, email: user.email };
  } catch (error) {
    await connection.rollback();
    console.error("[DB] 회원가입 트랜잭션 롤백", error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * user_profiles 업데이트
 */
export async function updateUserProfileInDB(
  userId: number,
  payload: Partial<{
    name: string | null;
    profile_img: string | null;
    level: CEFRLevel | null;
    level_progress: number | null;
    streak_count: number | null;
    total_study_time: number | null;
    completed_lessons: number | null;
    score: number | null;
    tier: string | null;
    last_study_date: string | null;
  }>
): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];

  if (payload.name !== undefined) {
    fields.push("name = ?");
    values.push(payload.name);
  }
  if (payload.profile_img !== undefined) {
    fields.push("profile_img = ?");
    values.push(payload.profile_img);
  }
  if (payload.level !== undefined) {
    fields.push("level = ?");
    values.push(payload.level);
  }
  if (payload.level_progress !== undefined) {
    fields.push("level_progress = ?");
    values.push(payload.level_progress);
  }
  if (payload.streak_count !== undefined) {
    fields.push("streak_count = ?");
    values.push(payload.streak_count);
  }
  if (payload.total_study_time !== undefined) {
    fields.push("total_study_time = ?");
    values.push(payload.total_study_time);
  }
  if (payload.completed_lessons !== undefined) {
    fields.push("completed_lessons = ?");
    values.push(payload.completed_lessons);
  }
  if (payload.score !== undefined) {
    fields.push("score = ?");
    values.push(payload.score);
  }
  if (payload.tier !== undefined) {
    fields.push("tier = ?");
    values.push(payload.tier);
  }
  if (payload.last_study_date !== undefined) {
    fields.push("last_study_date = ?");
    values.push(payload.last_study_date);
  }

  if (fields.length === 0) return;

  values.push(userId);
  const sql = `UPDATE user_profiles SET ${fields.join(", ")} WHERE user_id = ?`;

  await pool.execute(sql, values);
}

/**
 * users 비밀번호 업데이트
 */
export async function updateUserPasswordInDB(
  userId: number,
  hashedPassword: string
): Promise<void> {
  await pool.execute("UPDATE users SET password = ? WHERE user_id = ?", [
    hashedPassword,
    userId,
  ]);
}

/**
 * 사용자 삭제 트랜잭션
 */
export async function deleteUserTransaction(userId: number): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute("DELETE FROM user_profiles WHERE user_id = ?", [
      userId,
    ]);
    await connection.execute("DELETE FROM users WHERE user_id = ?", [userId]);
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * 사용자의 최근 1년간 일별 학습 횟수 조회
 */
export async function getUserAttendanceStats(
  userId: number
): Promise<{ date: string; count: number }[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT 
       DATE_FORMAT(created_at, '%Y-%m-%d') as date, 
       COUNT(*) as count
     FROM training_sessions
     WHERE user_id = ? 
       AND created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
     GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
     ORDER BY date ASC`,
    [userId]
  );

  return rows as { date: string; count: number }[];
}

/**
 * 사용자의 모든 학습/회화 이력을 통합 조회
 */
export async function getUserHistoryStats(
  userId: number
): Promise<UserHistoryItem[]> {
  // 1. Training 기록 조회
  const [trainRows] = await pool.execute<RowDataPacket[]>(
    `SELECT 
       CONCAT('train-', session_id) as id,
       'TRAINING' as type,
       CASE type 
         WHEN 'vocabulary' THEN '단어'
         WHEN 'sentence' THEN '문장'
         WHEN 'blank' THEN '빈칸'
         WHEN 'writing' THEN '작문'
         WHEN 'speaking' THEN '스피킹'
         ELSE type 
       END as subType,
       CASE type 
         WHEN 'vocabulary' THEN '단어 학습'
         WHEN 'sentence' THEN '문장 배열 연습'
         WHEN 'blank' THEN '빈칸 채우기'
         WHEN 'writing' THEN '작문 연습'
         WHEN 'speaking' THEN '스피킹 훈련'
         ELSE '학습 세션'
       END as title,
       created_at as date,
       score,
       duration_seconds as durationSeconds,
       NULL as messageCount,
       NULL as preview
     FROM training_sessions
     WHERE user_id = ?`,
    [userId]
  );

  // 2. AI Conversation 기록 조회
  const [convRows] = await pool.execute<RowDataPacket[]>(
    `SELECT 
       CONCAT('conv-', s.session_id) as id,
       'CONVERSATION' as type,
       IFNULL(sc.title, '자유 대화') as title,
       '회화' as subType, 
       s.started_at as date,
       NULL as score,
       NULL as durationSeconds,
       (SELECT COUNT(*) FROM ai_messages m WHERE m.session_id = s.session_id) as messageCount,
       (SELECT content FROM ai_messages m WHERE m.session_id = s.session_id ORDER BY created_at ASC LIMIT 1) as preview
     FROM ai_sessions s
     LEFT JOIN ai_scenarios sc ON s.scenario_id = sc.scenario_id
     WHERE s.user_id = ?`,
    [userId]
  );

  const combined = [
    ...(trainRows as UserHistoryItem[]),
    ...(convRows as UserHistoryItem[]),
  ];
  combined.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return combined;
}

/**
 * 회화 세션 기본 정보 조회 (권한 확인 포함)
 */
export async function getConversationSessionById(
  userId: number,
  sessionId: number
): Promise<ConversationSessionRow | null> {
  const [rows] = await pool.execute<ConversationSessionRow[]>(
    `SELECT 
       s.session_id, 
       sc.title as topic, 
       sc.description, 
       s.started_at, 
       s.ended_at
     FROM ai_sessions s
     JOIN ai_scenarios sc ON s.scenario_id = sc.scenario_id
     WHERE s.session_id = ? AND s.user_id = ?`,
    [sessionId, userId]
  );
  return rows[0] ?? null;
}

/**
 * 회화 메시지 및 피드백 목록 조회
 */
export async function getConversationMessagesBySessionId(
  sessionId: number
): Promise<ConversationMessageRow[]> {
  const [rows] = await pool.execute<ConversationMessageRow[]>(
    `SELECT 
       m.message_id, 
       m.sender_role, 
       m.content, 
       m.created_at,
       f.feedback_data
     FROM ai_messages m
     LEFT JOIN ai_feedbacks f ON m.message_id = f.message_id
     WHERE m.session_id = ?
     ORDER BY m.created_at ASC`,
    [sessionId]
  );
  return rows;
}

/* ===========================
   Training 세션 관련 모델 함수 추가
   - training_sessions 테이블 접근을 담당합니다.
   - 서비스 레이어에서 호출되어 프론트가 기대하는 형태로 정규화합니다.
   =========================== */

/**
 * userId에 대한 training_sessions 목록 조회
 */
export async function getTrainingSessionsByUserId(
  userId: number
): Promise<TrainingSessionRow[]> {
  const [rows] = await pool.execute<TrainingSessionRow[] & RowDataPacket[]>(
    `SELECT 
       session_id,
       user_id,
       type,
       score,
       duration_seconds,
       session_data,
       created_at
     FROM training_sessions
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [userId]
  );

  return rows as TrainingSessionRow[];
}

/**
 * 특정 training session을 session_id로 조회
 */
export async function getTrainingSessionById(
  sessionId: number
): Promise<TrainingSessionRow | null> {
  const [rows] = await pool.execute<TrainingSessionRow[] & RowDataPacket[]>(
    `SELECT 
       session_id,
       user_id,
       type,
       score,
       duration_seconds,
       session_data,
       created_at
     FROM training_sessions
     WHERE session_id = ?`,
    [sessionId]
  );

  return (rows as TrainingSessionRow[])[0] ?? null;
}
