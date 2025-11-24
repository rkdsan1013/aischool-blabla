// backend/src/ai/generators/writing.ts
import { generateText } from "../text";

/**
 * generateWritingQuestionsRaw
 * (기존 코드와 동일, 변경 없음)
 */
export async function generateWritingQuestionsRaw(
  level: string = "C2",
  level_progress: number = 50
): Promise<string> {
  const allowedLevels = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const normalizedLevel = allowedLevels.includes(String(level).toUpperCase())
    ? String(level).toUpperCase()
    : "C2";

  let lp = Number(level_progress);
  if (Number.isNaN(lp) || lp < 0) lp = 0;
  if (lp > 100) lp = 100;

  const prompt = [
    `당신은 영어 작문 문제 출제 AI입니다.`,
    `사용자 CEFR 수준: \`${normalizedLevel}\``,
    "",
    `--- [지시] ---`,
    `1. 사용자의 수준(\`${normalizedLevel}\`)에 맞는 작문(영작) 문제 10개를 출제하세요.`,
    `2. 'question': 번역할 자연스러운 **한국어 문장**`,
    `3. 'correct': 해당 한국어 문장을 가장 완벽하게 번역한 **단 하나의 영어 문장** (문자열)`,
    `   - 문맥상 가장 적절하고 자연스러운 표현 하나만 제시하세요.`,
    `   - 문장은 반드시 대문자로 시작하고 마침표로 끝나야 합니다.`,
    `4. **(수준 반영)**`,
    `   - A1/A2: 기본 어휘와 단순한 시제 (I eat apple.)`,
    `   - B1/B2: 다양한 시제, 조동사, 접속사 활용`,
    `   - C1/C2: 세련된 관용구, 가정법, 도치 등 고급 문체 사용`,
    `5. 10개의 문제는 서로 주제가 겹치지 않게 다양하게 구성하세요.`,
    `6. 민감한 주제(정치/성/차별 등)는 피하세요.`,
    `7. 오직 JSON 배열 단일 파일로만 출력하세요. (마크다운 코드블록 없이 Raw JSON)`,
    `8. JSON 구조: [{"question": "한국어 문장", "correct": "Single English sentence."}]`,
  ].join("\n");

  console.log("[WRITING GEN] Prompt generated.");

  const res = await generateText({
    prompt,
    model: "gpt-4o",
    maxTokens: 2500,
    temperature: 0.7,
  });

  return res.text;
}

/**
 * verifyWritingWithLLM
 * reasoning을 생성하지만, 반환 시에는 필요한 데이터만 정제하여 리턴합니다.
 */
export async function verifyWritingWithLLM(
  question: string,
  intendedAnswer: string,
  userAnswer: string
): Promise<{ isCorrect: boolean; feedback?: string }> {
  const prompt = [
    `Role: English Language Teacher`,
    `Task: Verify the user's translation.`,
    `Source(KR): "${question}"`,
    `Intended(EN): "${intendedAnswer}"`,
    `User(EN): "${userAnswer}"`,
    `---`,
    `Guidelines:`,
    `1. Analyze the meaning, grammar, and nuance. (Think step-by-step)`,
    `2. If the meaning matches and grammar is natural, it is Correct.`,
    `3. Minor typos or punctuation errors are acceptable.`,
    `4. Output JSON: { "isCorrect": boolean, "reasoning": "Why?" }`,
    // reasoning 필드는 정확한 판단을 유도하기 위한 장치입니다 (Chain of Thought).
  ].join("\n");

  try {
    const res = await generateText({
      prompt,
      model: "gpt-4o-mini",
      maxTokens: 300,
      temperature: 0.0,
    });

    const jsonMatch = res.text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : "{}";
    const parsed = JSON.parse(jsonStr);

    // [수정] reasoning은 로그로만 남기고, 실제 리턴값에서는 제외하거나 선택적으로 사용
    if (!parsed.isCorrect) {
      console.log(`[Wrong Reasoning]: ${parsed.reasoning}`);
    }

    return {
      isCorrect: !!parsed.isCorrect,
      // feedback: parsed.reasoning // 프론트에서 안 쓰면 굳이 리턴하지 않아도 됨
    };
  } catch (e) {
    console.error("[Verify Writing] LLM Error:", e);
    const normUser = userAnswer.toLowerCase().replace(/[^a-z0-9]/g, "");
    const normIntended = intendedAnswer.toLowerCase().replace(/[^a-z0-9]/g, "");

    return {
      isCorrect: normUser === normIntended,
    };
  }
}
