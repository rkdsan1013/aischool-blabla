// backend/src/services/userService.ts
import {
  findUserByEmail as findUserByEmailModel,
  findUserWithProfileById,
  createUserAndProfileTransaction,
  updateUserProfileInDB,
  deleteUserTransaction,
  updateUserPasswordInDB,
  getUserAttendanceStats as getUserAttendanceStatsModel,
  getConversationSessionById,
  getConversationMessagesBySessionId,
} from "../models/userModel";
import bcrypt from "bcrypt";

/**
 * 서비스 레이어의 User 타입
 */
export type UserRow = {
  user_id: number;
  email: string;
  password?: string;
  created_at?: string;
  updated_at?: string;
  name?: string | null;
  level?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | null;
  level_progress?: number | null;
  profile_img?: string | null;
  streak_count?: number | null;
  total_study_time?: number | null;
  completed_lessons?: number | null;
  score?: number | null;
  tier?: string | null;
};

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const user = await findUserByEmailModel(email);
  if (!user) return null;
  return {
    user_id: user.user_id,
    email: user.email,
    ...(typeof user.password === "string" ? { password: user.password } : {}),
  };
}

export async function getUserById(userId: number): Promise<UserRow | null> {
  const row = await findUserWithProfileById(userId);
  if (!row) return null;

  const result: UserRow = {
    user_id: row.user_id,
    email: row.email,
    ...(typeof row.created_at === "string"
      ? { created_at: row.created_at }
      : {}),
    ...(typeof row.updated_at === "string"
      ? { updated_at: row.updated_at }
      : {}),
    name: row.name,
    level: row.level,
    level_progress: row.level_progress,
    profile_img: row.profile_img,
    streak_count: row.streak_count,
    total_study_time: row.total_study_time,
    completed_lessons: row.completed_lessons,
    score: row.score ?? 0,
    tier: row.tier ?? "Bronze",
  };

  return result;
}

export async function getUserWithPasswordById(
  userId: number
): Promise<{ user_id: number; email: string; password?: string } | null> {
  const row = await findUserWithProfileById(userId);
  if (!row) return null;

  const result: { user_id: number; email: string; password?: string } = {
    user_id: row.user_id,
    email: row.email,
  };

  if (typeof row.password === "string") {
    result.password = row.password;
  }

  return result;
}

export async function createUserAndProfile(user: {
  name: string;
  email: string;
  password: string;
}): Promise<{ user_id: number; email: string }> {
  return await createUserAndProfileTransaction(user);
}

function sanitizePayload<T extends Record<string, unknown>>(
  payload: T
): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(payload) as (keyof T)[]) {
    const value = payload[key];
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

export async function updateUserProfile(
  userId: number,
  payload: Partial<{
    name: string | null;
    profile_img: string | null;
    level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | null;
    level_progress: number | null;
    streak_count: number | null;
    total_study_time: number | null;
    completed_lessons: number | null;
    score: number | null;
    tier: string | null;
  }>
): Promise<void> {
  const clean = sanitizePayload(payload);
  await updateUserProfileInDB(userId, clean);
}

export async function updateUserLevel(
  userId: number,
  level: string,
  levelProgress: number
): Promise<void> {
  const validLevels = ["A1", "A2", "B1", "B2", "C1", "C2"];
  if (!validLevels.includes(level)) {
    throw new Error("Invalid CEFR level");
  }

  await updateUserProfileInDB(userId, {
    level: level as any,
    level_progress: levelProgress,
  });
}

export async function deleteUser(userId: number): Promise<void> {
  await deleteUserTransaction(userId);
}

export async function deleteUserById(userId: number): Promise<void> {
  await deleteUserTransaction(userId);
}

export async function changeUserPassword(
  userId: number,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await getUserWithPasswordById(userId);
  if (!user || !user.password) {
    throw new Error("User not found");
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    throw new Error("Current password incorrect");
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await updateUserPasswordInDB(userId, hashed);
}

export async function getUserAttendanceStats(
  userId: number
): Promise<{ date: string; count: number }[]> {
  return await getUserAttendanceStatsModel(userId);
}

/**
 * 회화 상세 응답 타입
 */
export type ConversationDetailResult = {
  sessionId: number;
  topic: string;
  scenarioDescription: string;
  startedAt: string;
  completedAt: string | null;
  totalMessages: number;
  overallScore?: number | undefined;
  generalFeedback?: string | undefined;
  messages: Array<{
    messageId: number;
    role: "user" | "ai";
    content: string;
    createdAt: string;
    feedback?: any;
  }>;
};

export async function getConversationDetail(
  userId: number,
  sessionId: number
): Promise<ConversationDetailResult | null> {
  const session = await getConversationSessionById(userId, sessionId);
  if (!session) {
    return null;
  }

  const rawMessages = await getConversationMessagesBySessionId(sessionId);

  let totalScore = 0;
  let scoreCount = 0;

  const messages = rawMessages.map((msg) => {
    let feedback = null;
    if (msg.feedback_data) {
      try {
        feedback =
          typeof msg.feedback_data === "string"
            ? JSON.parse(msg.feedback_data)
            : msg.feedback_data;
      } catch {
        feedback = msg.feedback_data;
      }
    }

    if (feedback && typeof feedback.score === "number") {
      totalScore += feedback.score;
      scoreCount += 1;
    }

    return {
      messageId: msg.message_id,
      role: msg.sender_role,
      content: msg.content,
      createdAt: msg.created_at,
      feedback,
    };
  });

  const overallScore = scoreCount > 0 ? totalScore / scoreCount : undefined;

  return {
    sessionId: session.session_id,
    topic: session.topic,
    scenarioDescription: session.description,
    startedAt: session.started_at,
    completedAt: session.ended_at,
    totalMessages: messages.length,
    overallScore,
    generalFeedback: undefined,
    messages,
  };
}

/**
 * Training 관련 타입 (프론트가 기대하는 형태로 정규화)
 */
export type TrainingHistoryDetail = {
  questionId: string | number;
  questionText: string;
  questionType: "vocabulary" | "blank" | "sentence" | "speaking" | "writing";
  options?: string[];
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
};

export type TrainingHistoryData = {
  sessionId: string;
  trainingType: "vocabulary" | "blank" | "sentence" | "speaking" | "writing";
  completedAt: string;
  correctCount: number;
  totalCount: number;
  score: number;
  details: TrainingHistoryDetail[];
};
