// backend/src/ai/generators/feedback.ts
import { generateText, parseJSON } from "../text";

/**
 * 사용자 레벨에 따른 피드백 강도 조절 가이드
 */
function getLevelInstruction(level: string = "A1"): string {
  switch (level.toUpperCase()) {
    case "A1":
    case "A2":
      return "The user is a beginner. Focus only on critical grammar and vocabulary errors. Be very encouraging.";
    case "B1":
    case "B2":
      return "The user is intermediate. Correct grammar, awkward phrasing, and suggest better vocabulary.";
    case "C1":
    case "C2":
      return "The user is advanced. Focus on nuance, tone, sophistication, and native-like flow.";
    default:
      return "Focus on basic grammar errors.";
  }
}

/**
 * 단어 인덱스 맵 생성 (인덱스 정합성 보장용)
 */
function createWordIndexMap(text: string): string {
  const parts = text.split(/(\s+)/);
  let wordIndex = 0;
  const map: string[] = [];

  parts.forEach((part) => {
    if (!/\s+/.test(part) && part.trim().length > 0) {
      map.push(`${wordIndex}: "${part}"`);
      wordIndex++;
    }
  });

  return map.join(", ");
}

/**
 * 독립적인 피드백 생성 함수
 * - 다른 페이지(작문, 문법 검사 등)에서 재사용 가능
 */
export async function generateFeedbackOnly(
  userMessage: string,
  level: string,
  context?: string // 선택적: 특정 상황에서의 피드백이 필요할 경우
): Promise<any> {
  const levelInst = getLevelInstruction(level);
  const wordIndexMap = createWordIndexMap(userMessage);

  const contextPrompt = context
    ? `Context: "${context}"\n(Adjust style feedback based on this context)`
    : "Context: General English practice";

  const systemPrompt = `
    You are an expert AI English tutor.
    Your ONLY task is to analyze the user's sentence and provide structured feedback.
    
    Target User Level: ${level}
    ${levelInst}
    
    ${contextPrompt}

    [CRITICAL RULES]
    1. Analyze grammar, spelling, word choice, and style.
    2. If the sentence is perfect, return an empty errors array but provide a better/native suggestion if possible.
    3. Feedback ('explanation', 'message') MUST be in KOREAN.
    
    [IMPORTANT RULE FOR ERROR INDEXING]
    - Use [Word Index Map] to find the exact "index".
    - For 'style' errors, SET "index" TO null.

    IMPORTANT: Output ONLY valid JSON.
    
    JSON Structure:
    {
      "explanation": "Brief explanation in Korean",
      "suggestion": "Corrected or better natural version",
      "errors": [
        {
          "index": number | null,
          "word": "error_word",
          "type": "grammar" | "spelling" | "word" | "style",
          "message": "Error description in Korean"
        }
      ]
    }
  `;

  const userPrompt = `
    [Analyze this sentence]
    "${userMessage}"

    [Word Index Map]
    ${wordIndexMap}
  `;

  const res = await generateText({
    prompt: userPrompt,
    system: systemPrompt,
    temperature: 0.2, // 피드백은 창의성보다 정확성이 중요하므로 낮게 설정
    model: "gpt-4o",
  });

  return parseJSON(res.text);
}
