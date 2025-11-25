// backend/src/ai/client.ts
import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.warn(
    "OPENAI_API_KEY가 설정되어 있지 않습니다. LLM 호출은 실패할 수 있습니다."
  );
}

export const openai = new OpenAI({ apiKey });

/**
 * 토큰 사용량 정보를 담는 인터페이스
 */
export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

/**
 * Chat Completion 요청 함수
 * - exactOptionalPropertyTypes: true 호환을 위해
 * 입력 파라미터의 optional 타입들에 '| undefined'를 명시했습니다.
 */
export async function sendChat(options: {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  model?: string | undefined; // [수정] | undefined 추가
  maxTokens?: number | undefined; // [수정] | undefined 추가
  temperature?: number | undefined; // [수정] | undefined 추가
  context?: string | undefined; // [수정] | undefined 추가
}): Promise<{
  text: string;
  raw: unknown;
  usage?: TokenUsage | undefined; // [기존 수정 유지]
}> {
  const {
    messages,
    model = "gpt-4o-mini",
    maxTokens = 800,
    temperature = 0.2,
    context = "GENERAL",
  } = options;

  try {
    const startTime = Date.now();

    // openai SDK 호출
    const resp = await (openai as any).chat.completions.create({
      model,
      messages,
      max_completion_tokens: maxTokens,
      temperature,
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    const choices = (resp as any)?.choices;
    const text =
      Array.isArray(choices) && choices.length > 0
        ? String(choices[0]?.message?.content ?? "")
        : "";

    // --- Usage 데이터 추출 및 로깅 ---
    const usage = (resp as any)?.usage as TokenUsage | undefined;

    if (usage) {
      console.log(
        `[LLM USAGE] [${context}] Model: ${model} | Time: ${duration}ms | ` +
          `Input: ${usage.prompt_tokens} + Output: ${usage.completion_tokens} = Total: ${usage.total_tokens}`
      );
    } else {
      console.warn(
        `[LLM USAGE] [${context}] Warning: usage data missing for model ${model}`
      );
    }
    // --------------------------------

    return { text, raw: resp, usage };
  } catch (err) {
    console.error(`[LLM CLIENT] [${context}] error while calling OpenAI:`, err);
    throw err;
  }
}
