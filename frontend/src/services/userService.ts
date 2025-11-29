// frontend/src/services/userService.ts
import { apiClient, handleApiError } from "../api";
import type { AxiosError } from "axios";

// ==========================================
// 사용자 관련 타입 (프론트에서 사용하는 응답 타입)
// ==========================================
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

// ==========================================
// Conversation 관련 타입 (간단 매핑)
// ==========================================
export interface ConversationMessageDetail {
  messageId: number;
  role: "user" | "ai";
  content: string;
  createdAt: string;
  feedback?: {
    correction?: string;
    explanation?: string;
    score?: number;
  } | null;
}

export interface ConversationDetailResponse {
  sessionId: number;
  topic: string;
  scenarioDescription?: string;
  startedAt: string;
  completedAt: string | null;
  totalMessages: number;
  overallScore?: number;
  generalFeedback?: string;
  messages: ConversationMessageDetail[];
}

// ==========================================
// Training 관련 타입 (추가)
// ==========================================
export type TrainingType =
  | "vocabulary"
  | "sentence"
  | "blank"
  | "writing"
  | "speaking";

export interface TrainingSessionSummary {
  sessionId: number;
  userId?: number;
  type: TrainingType;
  score: number;
  durationSeconds: number;
  createdAt: string;
}

export interface TrainingQuestionItem {
  questionId: string;
  questionText: string;
  options?: string[];
  userAnswer?: string;
  correctAnswer?: string;
  isCorrect?: boolean;
  // 추가 필드가 있으면 여기에 확장 가능
  [key: string]: unknown;
}

export interface TrainingSessionDetail {
  sessionId: number;
  userId?: number;
  type: TrainingType;
  score: number;
  durationSeconds: number;
  // session_data 컬럼은 DB에서 JSON으로 저장되므로 API는 배열 또는 JSON 문자열을 반환할 수 있음
  // 실제 API 응답에 맞춰 필요 시 파싱 로직을 추가하세요.
  sessionData: TrainingQuestionItem[] | null;
  createdAt: string;
}

// ==========================================
// API 함수들
// ==========================================

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
    if (status === 401) return null;
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
 * 사용자 레벨 및 진척도 업데이트
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

/**
 * 회화 상세 기록 조회
 */
export async function getConversationDetail(
  sessionId: string | number
): Promise<ConversationDetailResponse | null> {
  try {
    const cleanId = String(sessionId).replace(/[^0-9]/g, "");
    const res = await apiClient.get<ConversationDetailResponse>(
      `/user/me/history/conversation/${cleanId}`
    );
    return res.data;
  } catch (error) {
    handleApiError(error, "회화 상세 기록 조회");
    return null;
  }
}

/* ===========================
   Training 관련 API 함수들
   ===========================
   아래 함수들은 training_sessions 테이블 및 session_data(JSON)를 기반으로
   학습(Training) 기록을 조회하기 위한 헬퍼입니다.

   주의:
   - 실제 백엔드 엔드포인트는 프로젝트에 맞춰 조정하세요.
   - session_data가 문자열(JSON)로 반환되는 경우, 호출자에서 파싱하거나
     여기에서 파싱 로직을 추가할 수 있습니다.
*/

/**
 * 내 학습(Training) 세션 목록 조회
 *
 * 반환 타입: TrainingSessionSummary[]
 * 엔드포인트 예시: GET /user/me/history/training
 *
 * (나중에 실제 API가 다르면 경로를 변경하세요)
 */
export async function getMyTrainingHistory(): Promise<
  TrainingSessionSummary[]
> {
  try {
    const res = await apiClient.get<TrainingSessionSummary[]>(
      "/user/me/history/training"
    );
    return res.data;
  } catch (error) {
    handleApiError(error, "학습 기록 조회");
    return [];
  }
}

/**
 * 특정 학습(Training) 세션 상세 조회
 *
 * sessionId: DB의 session_id 또는 API에서 사용하는 식별자
 * 반환: TrainingSessionDetail | null
 *
 * 엔드포인트 예시: GET /user/me/history/training/:sessionId
 */
export async function getTrainingDetail(
  sessionId: string | number
): Promise<TrainingSessionDetail | null> {
  try {
    const cleanId = String(sessionId).replace(/[^0-9]/g, "");
    const res = await apiClient.get<TrainingSessionDetail>(
      `/user/me/history/training/${cleanId}`
    );

    // 백엔드가 sessionData를 문자열(JSON)로 반환하는 경우 자동 파싱 시도
    const data = res.data;
    if (data && data.sessionData && typeof data.sessionData === "string") {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (data as any).sessionData = JSON.parse(
          data.sessionData as unknown as string
        );
      } catch {
        // 파싱 실패 시 그대로 반환 (호출자에서 처리 가능)
      }
    }

    return data;
  } catch (error) {
    handleApiError(error, "학습 상세 조회");
    return null;
  }
}
