// frontend/src/services/aiTalkService.ts

import { apiClient, handleApiError } from "../api";

// --- 1. 타입 정의 ---

export interface AIScenario {
  scenario_id: number;
  user_id: number | null;
  title: string;
  description: string;
  context: string;
  created_at?: string;
}

export interface CreateScenarioRequest {
  title: string;
  description: string;
  context: string;
}

export interface UpdateScenarioRequest {
  title?: string;
  description?: string;
  context?: string;
}

export interface AISession {
  session_id: number;
  scenario_id: number;
  user_id: number;
  started_at: string;
  ended_at: string | null;
}

export interface AIFeedback {
  explanation: string;
  suggestion: string;
  errors: Array<{
    index?: number;
    word?: string;
    type: "grammar" | "spelling" | "word" | "style";
    message: string;
  }>;
}

export interface AIMessage {
  message_id: number;
  session_id: number;
  sender_role: "user" | "ai";
  content: string;
  created_at: string;
  feedback?: AIFeedback | null;
}

// ✅ 응답 타입 수정: ended 필드 추가
export interface SendMessageResponse {
  userMessage: AIMessage;
  aiMessage: AIMessage;
  audioData?: string | null; // Base64 audio string
  ended?: boolean; // ✅ 대화 종료 여부 (Backend에서 is_finished가 true면 true)
}

// --- 2. 개별 함수 Export ---

export async function createScenario(
  payload: CreateScenarioRequest
): Promise<AIScenario> {
  try {
    const { data } = await apiClient.post<AIScenario>(
      "/ai-talk/scenarios",
      payload
    );
    return data;
  } catch (error) {
    return handleApiError(error, "시나리오 생성");
  }
}

export async function updateScenario(
  scenarioId: number,
  payload: UpdateScenarioRequest
): Promise<AIScenario> {
  try {
    const { data } = await apiClient.put<AIScenario>(
      `/ai-talk/scenarios/${scenarioId}`,
      payload
    );
    return data;
  } catch (error) {
    return handleApiError(error, "시나리오 수정");
  }
}

// --- 3. 메인 서비스 객체 Export ---

export const aiTalkService = {
  // === 시나리오 관련 ===
  async getScenarios(): Promise<AIScenario[]> {
    try {
      const { data } = await apiClient.get<AIScenario[]>("/ai-talk/scenarios");
      return data;
    } catch (error) {
      return handleApiError(error, "시나리오 목록 조회");
    }
  },

  async getScenarioById(scenarioId: number): Promise<AIScenario> {
    try {
      const { data } = await apiClient.get<AIScenario>(
        `/ai-talk/scenarios/${scenarioId}`
      );
      return data;
    } catch (error) {
      return handleApiError(error, "시나리오 상세 조회");
    }
  },

  async createCustomScenario(
    payload: CreateScenarioRequest
  ): Promise<AIScenario> {
    return createScenario(payload);
  },

  async updateCustomScenario(
    scenarioId: number,
    payload: UpdateScenarioRequest
  ): Promise<AIScenario> {
    return updateScenario(scenarioId, payload);
  },

  async deleteCustomScenario(scenarioId: number): Promise<void> {
    try {
      await apiClient.delete(`/ai-talk/scenarios/${scenarioId}`);
    } catch (error) {
      return handleApiError(error, "시나리오 삭제");
    }
  },

  // === 대화 세션 관련 ===

  /**
   * 대화 세션 시작
   * - AI의 첫 음성 메시지도 함께 반환될 수 있음
   */
  async startSession(scenarioId: number): Promise<{
    session: AISession;
    initialMessages: AIMessage[];
    audioData?: string | null; // 첫 인사 오디오
  }> {
    try {
      const { data } = await apiClient.post<{
        session: AISession;
        initialMessages: AIMessage[];
        audioData?: string | null;
      }>("/ai-talk/sessions", { scenario_id: scenarioId });
      return data;
    } catch (error) {
      return handleApiError(error, "대화 세션 시작");
    }
  },

  /**
   * 텍스트 메시지 전송
   */
  async sendMessage(
    sessionId: number,
    content: string
  ): Promise<SendMessageResponse> {
    try {
      const { data } = await apiClient.post<SendMessageResponse>(
        `/ai-talk/sessions/${sessionId}/messages`,
        { content }
      );
      return data;
    } catch (error) {
      return handleApiError(error, "메시지 전송");
    }
  },

  /**
   * ✅ 음성 메시지 전송 (Blob 업로드)
   */
  async sendAudioMessage(
    sessionId: number,
    audioBlob: Blob
  ): Promise<SendMessageResponse> {
    try {
      const formData = new FormData();
      // 파일명은 확장자를 webm으로 지정 (백엔드 STT가 처리)
      formData.append("audio", audioBlob, "recording.webm");

      const { data } = await apiClient.post<SendMessageResponse>(
        `/ai-talk/sessions/${sessionId}/audio`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      return data;
    } catch (error) {
      return handleApiError(error, "음성 메시지 전송");
    }
  },

  /**
   * 세션 종료
   */
  async endSession(sessionId: number): Promise<void> {
    try {
      await apiClient.patch(`/ai-talk/sessions/${sessionId}/end`);
    } catch (error) {
      return handleApiError(error, "대화 종료");
    }
  },

  createScenario,
  updateScenario,
};

export default aiTalkService;
