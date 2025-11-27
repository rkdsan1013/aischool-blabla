// frontend/src/services/authService.ts
import { apiClient, handleApiError } from "../api";

// 응답 타입 정의
export interface LoginResponse {
  message: string;
}

export interface SignupResponse {
  message: string;
}

export interface LogoutResponse {
  message: string;
}

// 로그인
export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  try {
    const res = await apiClient.post<LoginResponse>("/auth/login", {
      email,
      password,
    });
    return res.data;
  } catch (error) {
    handleApiError(error, "로그인");
  }
}

// ✅ [수정됨] score 제거, level만 전달
export async function signup(
  name: string,
  email: string,
  password: string,
  level?: string // 추가
): Promise<SignupResponse> {
  try {
    const res = await apiClient.post<SignupResponse>("/auth/register", {
      name,
      email,
      password,
      level, // 전달
      // score는 전달하지 않음 (서버 DB Default 0 사용)
    });
    return res.data;
  } catch (error) {
    handleApiError(error, "회원가입");
  }
}

// 로그아웃
export async function logout(): Promise<LogoutResponse> {
  try {
    const res = await apiClient.post<LogoutResponse>("/auth/logout", {});
    return res.data;
  } catch (error) {
    handleApiError(error, "로그아웃");
  }
}
