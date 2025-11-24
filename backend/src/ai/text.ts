// backend/src/ai/text.ts
import { sendChat } from "./client";

export interface TextGenResponse {
  text: string;
  raw?: unknown;
}

/**
 * 텍스트 생성 공통 함수
 */
export async function generateText(params: {
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  system?: string;
}): Promise<TextGenResponse> {
  // 시스템 메시지 기본값: JSON 출력을 권장하도록 설정
  const systemMsg =
    params.system ||
    `You are a helpful assistant. Output ONLY valid JSON. Do not add any conversational filler before or after the JSON.`;
  const userMsg = params.prompt;

  try {
    const res = await sendChat({
      messages: [
        { role: "system", content: systemMsg },
        { role: "user", content: userMsg },
      ],
      model: params.model,
      maxTokens: params.maxTokens,
      temperature: params.temperature,
    });

    return { text: res.text, raw: res.raw };
  } catch (err) {
    console.error("[AI Text] Generation error:", err);
    throw err;
  }
}

/**
 * JSON 파싱 헬퍼 (강화된 버전)
 * - 마크다운 제거
 * - 문자열 내에서 첫 번째 '{'와 마지막 '}'를 찾아 그 사이만 파싱
 */
export function parseJSON<T>(text: string): T {
  try {
    // 1. 마크다운 코드 블록 제거
    let cleaned = text.replace(/```json\s?|```/g, "").trim();

    // 2. JSON 객체 부분만 추출 (앞뒤 잡담 제거)
    const firstOpen = cleaned.indexOf("{");
    const lastClose = cleaned.lastIndexOf("}");

    if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
      cleaned = cleaned.substring(firstOpen, lastClose + 1);
    }

    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON Parse Error. Input text:", text);
    // 파싱 실패 시 에러를 던져서 상위에서 처리하거나, 기본값 처리가 필요함
    throw new Error("AI response is not valid JSON");
  }
}
