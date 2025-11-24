// backend/src/ai/client.ts
import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.warn(
    "OPENAI_API_KEY가 설정되어 있지 않습니다. LLM 호출은 실패할 수 있습니다."
  );
}

export const openai = new OpenAI({ apiKey });

export async function sendChat(options: {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  model?: string | undefined;
  maxTokens?: number | undefined;
  temperature?: number | undefined;
}): Promise<{ text: string; raw: unknown }> {
  const {
    messages,
    model = "gpt-4o-mini",
    maxTokens = 800,
    temperature = 0.2,
  } = options;

  try {
    // openai SDK 호출
    const resp = await (openai as any).chat.completions.create({
      model,
      messages,
      max_completion_tokens: maxTokens,
      temperature,
    });

    const choices = (resp as any)?.choices;
    const text =
      Array.isArray(choices) && choices.length > 0
        ? String(choices[0]?.message?.content ?? "")
        : "";

    return { text, raw: resp };
  } catch (err) {
    console.error("[LLM CLIENT] error while calling OpenAI:", err);
    throw err;
  }
}
