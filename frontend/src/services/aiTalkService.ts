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

export interface AIFeedbackError {
  index?: number | null;
  word?: string;
  type: "grammar" | "spelling" | "word" | "style";
  message: string;
}

export interface AIFeedback {
  explanation: string;
  suggestion: string;
  errors: AIFeedbackError[];
}

export interface AIMessage {
  message_id: number;
  session_id: number;
  sender_role: "user" | "ai";
  content: string;
  created_at: string;
  feedback?: AIFeedback | null;
}

// 응답 타입: userMessage / aiMessage는 가능한 한 non-null로 정의
export interface SendMessageResponse {
  userMessage: AIMessage;
  aiMessage: AIMessage;
  audioData?: string | null; // Base64 audio string
  ended?: boolean; // 대화 종료 여부
  resultLevel?: string | null;
  resultProgress?: number | null;
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
   * 대화 세션 시작 (기존 시나리오 기반)
   * - AI의 첫 음성 메시지도 함께 반환될 수 있음
   */
  async startSession(scenarioId: number): Promise<{
    session: AISession;
    initialMessages: AIMessage[];
    audioData?: string | null;
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
      // 타입 보장: 서버가 userMessage/aiMessage를 항상 반환한다고 가정
      return data;
    } catch (error) {
      return handleApiError(error, "메시지 전송");
    }
  },

  /**
   * ✅ 음성 메시지 전송 (Blob 업로드) - 기존 세션용
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

  // === 레벨 테스트 전용 API (인증 없이 호출 가능) ===

  /**
   * 레벨 테스트 세션 시작
   * - selectedLevel: 사용자가 선택한 예상 레벨 (예: "A1")
   * - 반환 형식은 기존 startSession과 동일한 형태를 따름
   */
  async startLevelTest(selectedLevel: string): Promise<{
    session: { session_id: number };
    initialMessages: AIMessage[];
    audioData?: string | null;
  }> {
    try {
      const { data } = await apiClient.post<{
        session: { session_id: number };
        initialMessages: AIMessage[];
        audioData?: string | null;
      }>("/ai-talk/level-test/start", { selectedLevel });
      return data;
    } catch (error) {
      return handleApiError(error, "레벨 테스트 시작");
    }
  },

  /**
   * 레벨 테스트용 오디오 업로드
   * - endpoint: /ai-talk/level-test/:sessionId/audio
   */
  async sendLevelTestAudio(
    sessionId: number,
    audioBlob: Blob,
    level?: string
  ): Promise<SendMessageResponse> {
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      if (level) formData.append("level", level);

      const { data } = await apiClient.post<SendMessageResponse>(
        `/ai-talk/level-test/${sessionId}/audio`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      return data;
    } catch (error) {
      return handleApiError(error, "레벨 테스트 음성 전송");
    }
  },

  /**
   * 레벨 테스트 세션 종료 (선택적)
   */
  async endLevelTest(sessionId: number): Promise<void> {
    try {
      await apiClient.patch(`/ai-talk/level-test/${sessionId}/end`);
    } catch (error) {
      return handleApiError(error, "레벨 테스트 종료");
    }
  },

  createScenario,
  updateScenario,
};

export default aiTalkService;
