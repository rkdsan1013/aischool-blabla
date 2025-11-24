// backend/src/ai/generators/blank.ts
import { generateText } from "../text";

/**
 * getBlankDifficultyRule
 * CEFR 수준에 따라 빈칸 문제의 난이도와 정답/오답 규칙을 반환
 */
function getBlankDifficultyRule(level: string): string {
  switch (level) {
    case "A1":
    case "A2":
      return `4. **(핵심 규칙: A1/A2)** 문장은 아주 일상적이고 단순해야 하며, 빈칸에 들어갈 정답 단어는 **기본 동사/명사/형용사(단일 단어)** 여야 합니다. 문장은 실제 대화나 초급 교재에서 흔히 볼 수 있는 표현을 사용하세요(시험용으로 과도하게 꼬지 마세요). 'options'에는 **정답 1개 + 현실적으로 헷갈릴 수 있는 3개의 오답(같은 품사, 자연스러운 형태)**를 포함하세요. 예: she ___ to school every day. options: ["goes", "go", "going", "went"]. 오답은 문법적으로 완전히 무의미하지 않도록 하세요.`;
    case "B1":
      return `4. **(핵심 규칙: B1)** 문장은 주어+동사+목적어 중심이지만 실제 말하기/글쓰기에서 쓰일 법한 문맥으로 구성하세요. 시제·주어-동사 일치·전치사 선택 등 현실적 혼동 포인트를 포함하되, 지나치게 비현실적인 선택지는 피하세요. 정답은 단일 단어이며, 오답 3개는 시제/형태/조동사/전치사 등에서 현실적으로 헷갈리는 후보여야 합니다.`;
    case "B2":
      return `4. **(핵심 규칙: B2)** 분사구문, 완료형, 진행형 등 조금 더 복잡한 형태를 사용할 수 있지만 문장은 여전히 자연스러워야 합니다. 오답은 형태 변화나 의미 미세 차이에서 오는 혼동을 유도하되, '문장을 일부러 비문으로 만드는' 선택지는 사용하지 마세요. 수준에 맞는 실제 예문 스타일(뉴스, 이메일, 대화)을 우선하세요.`;
    case "C1":
    case "C2":
    default:
      return `4. **(핵심 규칙: C1/C2)** 복합문(관계사, 가정법, 고급 동사구 등)을 사용해도 좋지만 표현은 실제 네이티브가 쓸 법한 자연스러운 문장으로 만드세요. 빈칸에는 정확한 형태(품사/시제/수 일치)를 요구합니다. 오답 3개는 문법적·의미적 미묘한 차이(빈도 높은 대체표현, 어휘 콜로케이션 오류, 시제 혼동 등)로 구성하되, 실무적·일상적 맥락에서 이해 가능한 선택지로 하세요.`;
  }
}

/**
 * generateBlankQuestionsRaw
 * 'blank' 유형(빈칸 채우기) 문제 10개 생성
 */
export async function generateBlankQuestionsRaw(
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

  const difficultyRule = getBlankDifficultyRule(normalizedLevel);

  const prompt = [
    `당신은 영어 빈칸 채우기 문제 출제 AI입니다.`,
    `사용자 CEFR 수준: \`${normalizedLevel}\``,
    ``,
    `--- [지시] ---`,
    `1. 사용자의 수준(\`${normalizedLevel}\`)에 맞는 빈칸 채우기 문제 10개를 출제하세요.`,
    `2. 각 문제는 반드시 다음 JSON 객체 형태로만 출력하세요:`,
    `   {"question": "문장 (빈칸은 ___으로 표기)", "options": ["정답단어", "오답1", "오답2", "오답3"]}`,
    `3. 'question'의 문장은 자연스럽고 실제 사용 맥락(대화, 이메일, 공지, 기사 등)에서 쓰일 법한 표현이어야 합니다. 절대 '수능식'으로 과도하게 꼬거나 비일상적 표현을 만들지 마세요.`,
    `4. **[중요] options 배열 구성 규칙:**`,
    `   - 배열의 길이는 반드시 4개여야 합니다.`,
    `   - **첫 번째 요소(인덱스 0)는 반드시 '정답'이어야 합니다.**`,
    `   - 나머지 3개 요소는 '오답'이어야 합니다.`,
    `5. 오답은 '완전한 잘못'이나 '문장 성립 불가'를 피하고, 실제 학습자가 혼동할 수 있는 현실적인 대안(시제/형태/전치사/조동사/어법 차이 등)으로 구성하세요.`,
    `6. 문장에는 문화적/정치적/성적으로 민감한 내용이 없어야 합니다.`,
    `7. **(다양성 규칙)** 문제 10개는 서로 중복되지 않아야 하며, 다양한 문법 포인트(시제, 수일치, 전치사, 조동사, 관용구 등)를 고루 다루세요. 또한 빈칸의 위치도 문장 앞/중간/뒤로 다양하게 배치하고, 문장의 종류(평서문, 의문문, 부정문 등)도 섞어서 구성하세요.`,
    `8. 출력은 "오직" JSON 배열 단일 파일로만 하세요. (설명 금지, correct 필드 포함 금지)`,
    `9. 예시: [{"question":"She ___ to work by bus every morning","options":["goes","go","going","went"]}, ...]`,
    difficultyRule,
    `10. 추가 제약:`,
    `   - 문장을 일부러 복잡하게 만들기 위해 비문을 넣지 마세요.`,
    `   - 지역적 표기(미국/영국) 차이가 있는 경우 표준 미국식 표현을 기본으로 사용하되, 필요하면 대안 표기를 '허용'으로 분류하라(출력에는 표기하지 않음).`,
    `   - 각 문제마다 어떤 문법 포인트를 다루는지 내부적으로는 고려하되(출력엔 표시 금지), 동일 유형의 문제가 연속으로 나오지 않게 하세요.`,
  ].join("\n");

  console.log("[BLANK GEN] Prompt generated.");

  const res = await generateText({
    prompt,
    model: "gpt-5.1", // 또는 gpt-4o
    maxTokens: 2000,
    temperature: 0.7,
  });

  return res.text;
}
