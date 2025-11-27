// frontend/src/services/userService.ts
import { apiClient, handleApiError } from "../api";
import type { AxiosError } from "axios";

export type UserProfileResponse = {
  user_id: number;
  email: string;
  name: string;
  level?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | null;
  level_progress?: number | null;
  streak_count?: number | null;
  total_study_time?: number | null;
  profile_img?: string | null;
  completed_lessons?: number;
  score?: number;
  tier?: string;
};

export interface AttendanceStat {
  date: string;
  count: number;
}

export interface HistoryRecord {
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

/**
 * 내 프로필 조회
 */
export async function getMyProfile(): Promise<UserProfileResponse | null> {
  try {
    const res = await apiClient.get<UserProfileResponse>("/user/me");
    return res.data;
  } catch (error: unknown) {
    const axiosErr = error as AxiosError | undefined;
    const status = axiosErr?.response?.status;

    if (status === 401) {
      return null;
    }

    handleApiError(error, "프로필 조회");
    return null;
  }
}

/**
 * 사용자 프로필 업데이트
 */
export async function updateUserProfile(
  data: Partial<UserProfileResponse>
): Promise<UserProfileResponse | null> {
  try {
    const res = await apiClient.put<UserProfileResponse>("/user/me", data);
    return res.data;
  } catch (error: unknown) {
    handleApiError(error, "프로필 업데이트");
    return null;
  }
}

/**
 * [수정됨] 사용자 레벨 및 진척도 업데이트
 * levelProgress 추가
 */
export async function updateUserLevel(
  level: string,
  levelProgress: number
): Promise<void> {
  try {
    await apiClient.put("/user/me/level", { level, levelProgress });
  } catch (error: unknown) {
    handleApiError(error, "레벨 업데이트");
  }
}

/**
 * 사용자 비밀번호 변경
 */
export async function changePassword(
  current: string,
  next: string
): Promise<boolean> {
  try {
    await apiClient.put("/user/me/password", {
      currentPassword: current,
      newPassword: next,
    });
    return true;
  } catch (error: unknown) {
    handleApiError(error, "비밀번호 변경");
    return false;
  }
}

/**
 * 사용자 계정 삭제
 */
export async function deleteUser(): Promise<boolean> {
  try {
    await apiClient.delete("/user/me");
    return true;
  } catch (error: unknown) {
    handleApiError(error, "회원 탈퇴");
    return false;
  }
}

/**
 * 내 출석(학습) 기록 조회
 */
export async function getMyAttendance(): Promise<AttendanceStat[]> {
  try {
    const res = await apiClient.get<AttendanceStat[]>("/user/me/attendance");
    return res.data;
  } catch (error) {
    handleApiError(error, "출석 기록 조회");
    return [];
  }
}

/**
 * 통합 히스토리 조회
 */
export async function getMyHistory(): Promise<HistoryRecord[]> {
  try {
    const res = await apiClient.get<HistoryRecord[]>("/user/me/history");
    return res.data;
  } catch (error) {
    handleApiError(error, "히스토리 조회");
    return [];
  }
}
