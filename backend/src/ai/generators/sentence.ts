import { generateText } from "../text";

/**
 * CEFR 레벨별 문장 구성(순서 맞추기) 난이도 규칙
 */
function getSentenceComplexityRule(level: string): string {
  switch (level) {
    // A1/A2: 3-6 단어, 단순 구조
    case "A1":
    case "A2":
      return `4. **(핵심 규칙: A1/A2)** \`correct\` 배열의 길이는 **반드시 3~6개**여야 하며, 이 길이 안에서 간단한 주어-동사-목적어 구조를 사용해야 합니다. (길이 제한 절대 준수)`;

    // B1: 5-8 단어, 아이디어 연결
    case "B1":
      return `4. **(핵심 규칙: B1)** \`correct\` 배열의 길이는 **반드시 5~8개**여야 하며, 이 길이 안에서 접속사나 부사구를 활용해 두 아이디어를 연결해야 합니다. (길이 제한 절대 준수)`;

    // B2: 6-10 단어, 상세 수식
    case "B2":
      return `4. **(핵심 규칙: B2)** \`correct\` 배열의 길이는 **반드시 6~10개**여야 하며, 이 길이 안에서 관계대명사 절이나 다양한 시제를 활용해야 합니다. (길이 제한 절대 준수)`;

    // C1/C2: 8-15 단어, 복잡/추상적 구조 (15개로 완화됨)
    case "C1":
    case "C2":
    default:
      return `4. **(핵심 규칙: C1/C2)** \`correct\` 배열의 길이는 **반드시 8개에서 15개 사이**여야 하며, 이 길이 제한 안에서 고급 문법, 추상적 개념, 또는 관용적 표현을 포함한 복잡한 문장을 생성해야 합니다. (길이 제한을 절대 초과하지 마세요.)`;
  }
}

/**
 * generateSentenceQuestionsRaw
 * 'sentence' 유형의 문제를 생성 (문장 순서 맞추기)
 *
 * 변경 요지:
 * - 한국어 문장이 주어지면, LLM이 해당 한국어 문장의 핵심 단어들(명사/동사/형용사/부사 등)에 대응하는
 *   영어 단어(또는 동의어/유의어)를 반드시 'options' 또는 'correct'에 포함하도록 프롬프트에 명시합니다.
 * - 예시: "마트"가 있으면 "mart", "market", "mall" 중 적어도 하나가 options 또는 correct에 포함되어야 함.
 */
export async function generateSentenceQuestionsRaw(
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

  // 레벨에 맞는 오답 규칙을 동적으로 생성
  const complexityRule = getSentenceComplexityRule(normalizedLevel);

  const prompt = [
    `당신은 영어 문장 구성 문제 출제 AI입니다.`,
    `사용자 CEFR 수준: \`${normalizedLevel}\``,
    "",
    `--- [지시] ---`,
    `1. 사용자의 수준(\`${normalizedLevel}\`)에 맞는 문장 순서 맞추기 문제 10개를 출제하세요.`,
    `2. 'question'은 힌트가 될 '단일 한국어 번역 문장'이어야 합니다.`,
    `3. 'correct'는 'question'을 번역한 '올바른 순서의 영어 단어 배열'이어야 합니다.`,
    ``,

    // 동적으로 생성된 복잡도 규칙(규칙 4) 삽입
    complexityRule,

    ``,

    // 핵심 추가 규칙: 한국어 핵심 단어의 영어 번역 후보 포함 강제
    `**(핵심 규칙: 한국어-영어 일치)** 'question'에 포함된 한국어 문장의 핵심 단어들(명사, 동사, 형용사, 부사 등)은 반드시 영어 단어로 'correct' 또는 'options'에 포함되어야 합니다. 예를 들어 '마트'가 문장에 있으면 'mart', 'market', 'mall' 중 적어도 하나를 포함하세요. 모든 핵심 한국어 단어에 대해 적어도 하나의 영어 번역 후보가 'correct' 또는 'options'에 포함되어야 합니다. (이 규칙은 절대적으로 준수되어야 합니다.)`,

    `5. **(핵심 규칙: 오답)** 'options' 배열에는 'correct' 배열에 포함되지 않는 **2~3개의 '오답(distractor)' 단어만** 포함해야 합니다.`,
    `6. 이 '오답' 단어들은 문법적으로 헷갈리거나(예: 'go' vs 'goes', 'am' vs 'is') 문맥상 그럴듯해 보여야 합니다.`,
    `7. **(다양성 규칙)** 10개의 문제는 서로 중복되지 않아야 하며, 다양한 문법 구조(평서문, 의문문 등)를 골고루 선정해야 합니다.`,
    `8. **(무작위성 규칙)** 매번 요청 시마다, 가장 흔하고 예측 가능한 문장으로 시작하지 말고, 창의적이고 무작위적인 새로운 문장 조합을 생성하세요.`,
    `9. 오직 JSON 배열 단일 파일로만 출력하세요. (설명 금지)`,
    `10. JSON 구조: {"question": "...", "options": ["오답1", "오답2"], "correct": ["정답1", "정답2", "..."]}`,
    ``,
    `--- [출력 검증 예시 및 추가 지시] ---`,
    `- 각 문제의 'question'은 한국어 문장 한 줄(완전한 문장)로 제공하세요.`,
    `- 'correct'는 영어 단어 배열이며, 배열의 각 항목은 하나의 영어 단어(또는 축약형/표준 형태)여야 합니다. (구두점이나 추가 문자는 제외)`,
    `- 'options'에는 distractor만 포함하되, 위의 한국어-영어 일치 규칙을 만족하도록 핵심 한국어 단어의 영어 번역 후보가 반드시 포함되어야 합니다.`,
    `- 출력은 반드시 유효한 JSON이어야 하며, 배열 길이는 정확히 10개의 문제 객체여야 합니다.`,
    `- 예시(형식): {"question":"나는 사과를 사기 위해 마트를 갔다","options":["goes","bought"],"correct":["I","went","to","the","market","to","buy","an","apple"]}`,
  ].join("\n");

  console.log("[SENTENCE GEN] Prompt generated.");

  const res = await generateText({
    prompt,
    model: "gpt-5.1",
    maxTokens: 2000,
    temperature: 0.7,
  });

  return res.text;
}
