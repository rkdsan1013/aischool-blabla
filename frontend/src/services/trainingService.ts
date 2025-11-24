// frontend/src/services/trainingService.ts
import { apiClient, handleApiError } from "../api";

export type TrainingType =
  | "vocabulary"
  | "sentence"
  | "blank"
  | "writing"
  | "speaking";

export interface QuestionItem {
  id: string;
  type: TrainingType;
  question: string;
  options?: string[];
  correct?: string | string[];
}

// 히스토리 저장용 타입
export interface TrainingSessionDetail {
  questionId: string;
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  options?: string[];
}

// Blob을 Base64로 변환하는 헬퍼 함수
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function fetchTrainingQuestions(
  type: TrainingType
): Promise<QuestionItem[]> {
  try {
    const url = `/training/${encodeURIComponent(type)}`;
    const res = await apiClient.get<QuestionItem[]>(url);
    if (res?.data && Array.isArray(res.data)) {
      return res.data;
    }
    return [];
  } catch (err) {
    try {
      handleApiError(err, "훈련 문제 로드");
    } catch {
      // Ignore
    }
    return [];
  }
}

export async function verifyAnswer(payload: {
  type: TrainingType;
  userAnswer: string | string[] | Blob;
  correctAnswer: string | string[];
  extra?: { questionText: string };
}): Promise<{
  isCorrect: boolean;
  points: number;
  totalScore?: number;
  tier?: string;
  transcript?: string;
}> {
  try {
    let finalUserAnswer = payload.userAnswer;

    if (payload.type === "speaking" && payload.userAnswer instanceof Blob) {
      finalUserAnswer = await blobToBase64(payload.userAnswer);
    }

    const res = await apiClient.post<{
      isCorrect: boolean;
      points: number;
      totalScore?: number;
      tier?: string;
      transcript?: string;
    }>("/training/verify", {
      type: payload.type,
      userAnswer: finalUserAnswer,
      correctAnswer: payload.correctAnswer,
      questionText: payload.extra?.questionText,
    });

    return {
      isCorrect: res.data?.isCorrect ?? false,
      points: res.data?.points ?? 0,
      totalScore: res.data?.totalScore,
      tier: res.data?.tier,
      transcript: res.data?.transcript,
    };
  } catch (err) {
    console.error("정답 검증 API 오류:", err);
    return { isCorrect: false, points: 0 };
  }
}

// [수정됨] 리턴 타입 stats 내부 속성 변경 (addedMinutes -> addedSeconds)
export async function completeTrainingSession(data: {
  type: TrainingType;
  score: number;
  durationSeconds: number;
  sessionData: TrainingSessionDetail[];
}): Promise<{
  message: string;
  stats?: {
    streak: number;
    totalScore: number;
    tier: string;
    addedSeconds: number; // 여기를 수정했습니다 (TS2339 해결)
  };
}> {
  try {
    const res = await apiClient.post("/training/complete", data);
    return res.data;
  } catch (err) {
    handleApiError(err, "학습 저장 실패");
    throw err;
  }
}
