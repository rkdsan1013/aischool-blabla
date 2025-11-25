// backend/src/ai/generators/vocabulary.ts
import { generateText } from "../text";

function getDistractorRule(level: string): string {
  switch (level) {
    case "A1":
    case "A2":
      return `5. **(핵심 규칙: A1/A2)** 'options'의 첫 번째(정답)를 제외한 나머지 3개의 오답은, 정답과 **의미적으로 전혀 관련이 없는** \`${level}\` 수준의 다른 **무작위 기초 단어**여야 합니다. (즉, '의미 범주'로 묶지 마세요)`;
    case "B1":
      return `5. **(핵심 규칙: B1)** 'options'의 첫 번째(정답)를 제외한 나머지 3개의 오답은, 'question'의 번역으로는 **명백히 틀리지만(incorrect)**, 정답과 **철자 또는 발음이 비슷하여** 헷갈리기 쉬운 \`${level}\` 수준의 단어여야 합니다.`;
    case "B2":
      return `5. **(핵심 규칙: B2)** 'options'의 첫 번째(정답)를 제외한 나머지 3개의 오답은, 'question'의 번역으로는 **명백히 틀리지만**, 정답과 **유사한 의미 범주(semantic category)**에 속하여 헷갈릴 수 있는 \`${level}\` 수준의 단어여야 합니다. (단, 유의어를 나열하여 정답이 모호해지는 것을 금지합니다.)`;
    case "C1":
    case "C2":
    default:
      return `5. **(핵심 규칙: C1/C2)** 'options'의 첫 번째(정답)를 제외한 나머지 3개의 오답은, 'question'의 번역으로는 **명백히 틀리지만**, (A) 정답과 철자/발음이 비슷하거나 (B) 정답과 미묘한 뉘앙스 차이가 있는 유의어/반의어 등, \`${level}\` 수준에서 헷갈릴 수 있는 단어들로 **정교하게 복합 구성**하세요. (정답이 될 수 있는 유의어를 오답에 포함하지 마세요.)`;
  }
}

export async function generateVocabularyQuestionsRaw(
  level: string = "C2",
  level_progress: number = 50
): Promise<string> {
  const QUESTION_COUNT = 10; // [변경] 변수로 추출 및 10개로 복구

  const allowedLevels = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const normalizedLevel = allowedLevels.includes(String(level).toUpperCase())
    ? String(level).toUpperCase()
    : "C2";

  let lp = Number(level_progress);
  if (Number.isNaN(lp) || lp < 0) lp = 0;
  if (lp > 100) lp = 100;

  const distractorRule = getDistractorRule(normalizedLevel);

  const prompt = [
    `당신은 영어 문제 출제 AI입니다.`,
    `사용자 CEFR 수준: \`${normalizedLevel}\``,
    ``,
    `--- [지시] ---`,
    `1. 사용자의 수준(\`${normalizedLevel}\`)에 맞는 단어 문제 ${QUESTION_COUNT}개를 출제하세요.`,
    `2. 'question'은 번역할 '단일 한국어 단어'여야 합니다. (문장 X)`,
    `3. 'options'는 4개의 영어 단어여야 합니다.`,
    `4. **[중요] options 배열 구성 규칙:**`,
    `   - **배열의 첫 번째 요소(인덱스 0)는 반드시 '정답' 단어여야 합니다.**`,
    `   - 나머지 3개 요소는 오답이어야 합니다.`,
    `   - 'options' 배열의 4개 항목은 서로 고유해야 합니다. (중복 금지)`,
    distractorRule,
    `7. **(다양성 규칙)** ${QUESTION_COUNT}개의 'question' 단어는 서로 중복되지 않아야 하며, 다양한 주제(명사, 동사, 형용사 등)에서 골고루 선정해야 합니다.`,
    `8. **(무작위성 규칙)** 매번 요청 시마다, 가장 흔하고 예측 가능한 단어로 시작하지 말고, 창의적이고 무작위적인 새로운 단어 조합을 생성하세요.`,
    `9. 오직 JSON 배열 단일 파일로만 출력하세요. (설명 금지, correct 필드 포함 금지)`,
    `10. JSON 구조: [{"question": "...", "options": ["정답", "오답", "오답", "오답"]}]`,
  ].join("\n");

  const res = await generateText({
    prompt,
    model: "gpt-4o-mini", // 속도 최적화 유지
    maxTokens: 2000, // 토큰 상향
    temperature: 0.7,
    context: "VOCAB GEN",
  });

  return res.text;
}
