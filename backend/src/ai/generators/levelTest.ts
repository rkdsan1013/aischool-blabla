// backend/src/ai/generators/levelTest.ts
import { generateText, parseJSON } from "../text";

/**
 * Level test generator
 * - LLM에게 종료 판단을 맡기고, 난이도를 동적으로 조절하도록 지시합니다.
 * - 피드백 필드는 반환하지 않으며, 대화가 종료될 때 LLM이 최종 level/result를 포함해서 반환합니다.
 *
 * 출력 JSON 스키마 (LLM이 반드시 이 형식의 JSON만 출력해야 함)
 * {
 *   "reply": "AI's next prompt or final farewell (ENGLISH)",
 *   "is_finished": boolean,
 *   "audioData": null, // optional base64 audio (현재는 null 허용)
 *   "result": { "level": "A1|A2|B1|B2|C1|C2", "progress": number } // include only if is_finished === true
 * }
 */

function getLevelInstruction(level: string = "A1"): string {
  switch (level.toUpperCase()) {
    case "A1":
    case "A2":
      return "The user is a beginner (A1-A2). Use simple vocabulary and short, clear sentences. Ask short, concrete questions and encourage short answers.";
    case "B1":
    case "B2":
      return "The user is intermediate (B1-B2). Use natural daily conversation, ask follow-up questions, and encourage elaboration.";
    case "C1":
    case "C2":
      return "The user is advanced (C1-C2). Use sophisticated vocabulary, ask opinionated or abstract questions, and encourage nuanced responses.";
    default:
      return "The user is a beginner. Use simple English.";
  }
}

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
 * Generate opening prompt for level test
 */
export async function generateLevelTestStart(
  selectedLevel: string,
  context?: string
): Promise<{ opening: string; audioData?: string | null }> {
  const levelInst = getLevelInstruction(selectedLevel);

  const systemPrompt = `
You are an AI examiner conducting a CEFR-aligned spoken level test.
${levelInst}

[CRITICAL]
- All 'reply' outputs MUST be in ENGLISH.
- Output ONLY valid JSON in the exact format requested.

Task:
- Produce a single natural opening prompt to start the spoken level test.
- Tailor the opening to the provided selectedLevel.
- Keep it short and invite the user to speak.

Response JSON:
{
  "opening": "Opening prompt in English",
  "audioData": null
}
  `;

  const userPrompt = `
SelectedLevel: "${selectedLevel}"
Context: "${context ?? "General conversational test"}"
Instruction: Provide a natural opening prompt for the user to respond to.
  `;

  const res = await generateText({
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.7,
    model: "gpt-4o",
    context: "LEVEL_TEST_START",
  });

  const parsed = parseJSON<{ opening: string; audioData?: string | null }>(
    res.text
  );

  return {
    opening: parsed.opening,
    audioData: parsed.audioData ?? null,
  };
}

/**
 * Generate next AI reply during level test
 * - LLM decides whether to finish the test (is_finished).
 * - If finishing, include result { level, progress }.
 */
export async function generateLevelTestResponse(params: {
  selectedLevel: string;
  context?: string;
  history: { role: "ai" | "user"; content: string }[];
  userMessage: string;
}): Promise<{
  reply: string;
  is_finished: boolean;
  audioData?: string | null;
  result?: { level: string; progress: number } | null;
}> {
  const {
    selectedLevel,
    context = "General conversational level test",
    history,
    userMessage,
  } = params;
  const levelInst = getLevelInstruction(selectedLevel);

  const historyText = history
    .map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.content}`)
    .join("\n");

  const wordIndexMap = createWordIndexMap(userMessage);

  const systemPrompt = `
You are an AI examiner conducting a CEFR-aligned spoken level test.
${levelInst}

[LANGUAGE RULES]
- 'reply' MUST be in ENGLISH.

[ROLE]
- Act as a natural human interlocutor.
- Ask follow-up questions, request clarification, or push for more complex language as appropriate.

[TERMINATION RULE - LLM DECIDES]
- Decide whether the test should end now. Set "is_finished": true if:
  * The user explicitly says they want to stop or says goodbye.
  * The user's demonstrated ability is sufficient to determine a CEFR level with confidence.
  * The scenario's communicative goal is achieved and further questions would not change the level estimate.
- If "is_finished": true, include a concise natural farewell in 'reply' (ENGLISH) and include a 'result' object with final "level" and "progress" (0-100).
- If "is_finished": false, produce a natural follow-up prompt in 'reply' to continue the test.

[OUTPUT]
- Output ONLY valid JSON matching the schema below.

JSON Schema:
{
  "reply": "AI reply in English",
  "is_finished": boolean,
  "audioData": null,
  "result": { "level": "A1|A2|B1|B2|C1|C2", "progress": number } // include only if is_finished === true
}
  `;

  const userPrompt = `
[Context]
"${context}"

[SelectedLevelHint]
"${selectedLevel}"

[ChatHistory]
${historyText}

[CurrentUserUtterance]
Text: "${userMessage}"
Word Index Map: [ ${wordIndexMap} ]

Task:
- Analyze the user's latest utterance in the context of the conversation.
- Provide the next AI reply and decide whether to finish the test.
- If finishing, include a final CEFR level and progress (0-100).
  `;

  const res = await generateText({
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.25,
    model: "gpt-4o",
    context: "LEVEL_TEST_RESPONSE",
  });

  const parsed = parseJSON<{
    reply: string;
    is_finished: boolean;
    audioData?: string | null;
    result?: { level: string; progress: number } | null;
  }>(res.text);

  const reply = parsed.reply ?? "";
  const is_finished = !!parsed.is_finished;
  const audioData = parsed.audioData ?? null;
  const result = parsed.result ?? null;

  return { reply, is_finished, audioData, result };
}
