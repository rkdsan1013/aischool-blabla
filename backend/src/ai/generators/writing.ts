// backend/src/ai/generators/writing.ts
import { generateText } from "../text";

export async function generateWritingQuestionsRaw(
  level: string = "C2",
  level_progress: number = 50
): Promise<string> {
  const QUESTION_COUNT = 10;

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
    `1. 사용자의 수준(\`${normalizedLevel}\`)에 맞는 작문(영작) 문제 ${QUESTION_COUNT}개를 출제하세요.`,
    `2. 'question': 번역할 자연스러운 **한국어 문장**`,
    `3. 'correct': 해당 한국어 문장을 가장 완벽하게 번역한 **단 하나의 영어 문장** (문자열)`,
    `   - 문맥상 가장 적절하고 자연스러운 표현 하나만 제시하세요.`,
    `   - 문장은 반드시 대문자로 시작하고 마침표로 끝나야 합니다.`,
    `4. **(수준 반영)**`,
    `   - A1/A2: 기본 어휘와 단순한 시제 (I eat apple.)`,
    `   - B1/B2: 다양한 시제, 조동사, 접속사 활용`,
    `   - C1/C2: 세련된 관용구, 가정법, 도치 등 고급 문체 사용`,
    `5. ${QUESTION_COUNT}개의 문제는 서로 주제가 겹치지 않게 다양하게 구성하세요.`,
    `6. 민감한 주제(정치/성/차별 등)는 피하세요.`,
    `7. 오직 JSON 배열 단일 파일로만 출력하세요. (마크다운 코드블록 없이 Raw JSON)`,
    `8. JSON 구조: [{"question": "한국어 문장", "correct": "Single English sentence."}]`,
  ].join("\n");

  const res = await generateText({
    prompt,
    model: "gpt-5.1",
    maxTokens: 2000,
    temperature: 0.7,
    context: "WRITING GEN",
  });

  return res.text;
}

export async function verifyWritingWithLLM(
  question: string,
  intendedAnswer: string,
  userAnswer: string
): Promise<{ isCorrect: boolean; feedback?: string }> {
  const prompt = [
    `역할: 영어 교사`,
    `작업: 사용자의 번역을 검증하세요. 아래 "사용자 번역" 필드에 있는 텍스트만 채점 대상입니다.`,
    `원문(KR): "${question}"`,
    `의도된 번역(EN): "${intendedAnswer}"`,
    `사용자 번역(EN): "${userAnswer}"  // 중요: 이 필드에 있는 문자열이 실제 채점 대상입니다.`,
    `---`,
    `지침:`,
    `1. 먼저 사용자가 제출한 문자열이 번역문인지 아닌지를 판별하세요. 번역문이 아닌 경우 isCorrect=false로 처리하고 그 이유를 reasoning에 명확히 적으세요.`,
    `2. 번역문으로 판단되면 의미(semantic equivalence), 문법, 뉘앙스를 단계적으로 분석하세요.`,
    `3. 사소한 오타나 구두점 오류는 허용합니다. 그러나 문장 구조나 핵심 의미가 바뀌면 오답으로 처리하세요.`,
    `4. **(핵심 의미 판단)** 사용자 번역이 **원문(KR)**의 의미를 **완벽하고 자연스럽게** 전달하고 있다면 isCorrect=true로 판단하세요. 의도된 번역(EN)은 단순 참고용입니다. 사용자 번역이 의도된 번역과 다르더라도, **원문의 핵심 의미가 동일**하고 문법적으로 자연스러우면 정답으로 처리하세요.`, // 👈 이 부분이 수정되었습니다.
    `5. 출력 형식(JSON)만 응답하세요. 구조: { "isCorrect": boolean, "reasoning": "채점 근거(한국어)" }`,
  ].join("\n");

  try {
    const res = await generateText({
      prompt,
      model: "gpt-4o-mini", // 검증은 속도 최적화 유지
      maxTokens: 300,
      temperature: 0.0,
      context: "WRITING VERIFY",
    });

    const jsonMatch = res.text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : "{}";
    const parsed = JSON.parse(jsonStr);

    // 정답 여부와 관계없이 항상 로그 출력
    const resultStatus = parsed.isCorrect ? "Correct (O)" : "Wrong (X)";
    console.log(`\n--- [WRITING VERIFY] ${resultStatus} ---`);
    console.log(`  Question (KR): "${question}"`);
    console.log(`  User Answer (EN): "${userAnswer}"`);
    console.log(`  Intended Answer (EN): "${intendedAnswer}"`);
    console.log(`  Reasoning: ${parsed.reasoning}`);
    console.log(`--------------------------------------\n`);

    return {
      isCorrect: !!parsed.isCorrect,
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
