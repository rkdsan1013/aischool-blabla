// backend/src/ai/generators/speaking.ts
import { generateText } from "../text";
import { transcribeAudio } from "../audio";
import { normalizeForCompare } from "../../utils/normalization";

function getSpeakingStyleRule(level: string): string {
  switch (level) {
    case "A1":
    case "A2":
      return `4. **(핵심 규칙: A1/A2)** 3~6단어의 짧고 명확한 문장을 만드세요. 인사, 자기소개, 날씨...`;
    case "B1":
    case "B2":
      return `4. **(핵심 규칙: B1/B2)** 7~12단어의 자연스러운 구어체 문장을 만드세요. **축약형(I'm, We'll)** 사용...`;
    case "C1":
    case "C2":
    default:
      return `4. **(핵심 규칙: C1/C2)** 10~15단어 내외의 호흡이 긴 문장을 만드세요. 고급 억양과 강세...`;
  }
}

export async function generateSpeakingQuestionsRaw(
  level: string = "C2",
  level_progress: number = 50
): Promise<string> {
  const QUESTION_COUNT = 10; // [변경] 변수로 추출 및 10개로 복구

  const allowedLevels = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const normalizedLevel = allowedLevels.includes(String(level).toUpperCase())
    ? String(level).toUpperCase()
    : "C2";

  const styleRule = getSpeakingStyleRule(normalizedLevel);

  const prompt = [
    `당신은 영어 말하기/발음 교정 전문 AI 코치입니다.`,
    `사용자 CEFR 수준: \`${normalizedLevel}\``,
    "",
    `--- [지시] ---`,
    `1. 사용자의 수준(\`${normalizedLevel}\`)에 맞춰, 따라 읽기(Shadowing) 연습에 적합한 영어 문장 ${QUESTION_COUNT}개를 생성하세요.`,
    `2. **'question' 필드에 사용자가 소리 내어 읽을 '영어 문장'을 넣으세요.**`,
    `3. 문장은 문법적으로 완벽해야 하며, 실제 원어민이 사용하는 자연스러운 표현이어야 합니다.`,
    styleRule,
    `5. ${QUESTION_COUNT}개의 문장은 서로 주제나 패턴이 중복되지 않게 다양하게 구성하세요.`,
    `6. 민감한 주제는 피하세요.`,
    `7. 오직 JSON 배열 단일 파일로만 출력하세요.`,
    `8. JSON 구조: {"question": "English sentence here..."}`,
  ].join("\n");

  const res = await generateText({
    prompt,
    model: "gpt-4o-mini", // 속도 최적화 유지
    maxTokens: 2000, // 토큰 상향
    temperature: 0.7,
    context: "SPEAKING GEN",
  });

  return res.text;
}

export async function verifySpeakingWithAudio(
  audioBuffer: Buffer,
  targetSentence: string,
  fileExtension: string = "webm"
): Promise<{ isCorrect: boolean; transcript: string; similarity: number }> {
  try {
    const userTranscript = await transcribeAudio(audioBuffer, fileExtension);

    console.log(`[Speaking] Target: "${targetSentence}"`);
    console.log(`[Speaking] User:   "${userTranscript}"`);

    const normTarget = normalizeForCompare(targetSentence);
    const normUser = normalizeForCompare(userTranscript);

    const isCorrect = normTarget === normUser;

    return {
      isCorrect,
      transcript: userTranscript,
      similarity: isCorrect ? 100 : 0,
    };
  } catch (error) {
    console.error("[Speaking] Verification Failed:", error);
    return { isCorrect: false, transcript: "", similarity: 0 };
  }
}
