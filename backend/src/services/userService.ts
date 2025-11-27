// backend/src/services/userService.ts
import {
  findUserByEmail as findUserByEmailModel,
  findUserWithProfileById,
  createUserAndProfileTransaction,
  updateUserProfileInDB,
  deleteUserTransaction,
  updateUserPasswordInDB,
  getUserAttendanceStats as getUserAttendanceStatsModel,
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

// ✅ [수정됨] 유저 레벨 및 진척도 업데이트 전용 함수
export async function updateUserLevel(
  userId: number,
  level: string,
  levelProgress: number // 추가됨
): Promise<void> {
  const validLevels = ["A1", "A2", "B1", "B2", "C1", "C2"];
  if (!validLevels.includes(level)) {
    throw new Error("Invalid CEFR level");
  }

  // DB 업데이트: level과 level_progress 동시 반영
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

// 출석 데이터 조회 서비스
export async function getUserAttendanceStats(
  userId: number
): Promise<{ date: string; count: number }[]> {
  return await getUserAttendanceStatsModel(userId);
}
