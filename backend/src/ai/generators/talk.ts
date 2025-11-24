// backend/src/ai/generators/talk.ts
import { generateText, parseJSON } from "../text";

function getLevelInstruction(level: string = "A1"): string {
  switch (level.toUpperCase()) {
    case "A1":
    case "A2":
      return "The user is a beginner (A1-A2). Use simple vocabulary and short, clear sentences. Speak slowly.";
    case "B1":
    case "B2":
      return "The user is intermediate (B1-B2). Use natural daily conversation skills and common idioms.";
    case "C1":
    case "C2":
      return "The user is advanced (C1-C2). Use sophisticated vocabulary and nuanced expressions.";
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

export async function generateTalkOpening(
  context: string,
  level: string
): Promise<string> {
  const levelInst = getLevelInstruction(level);

  const systemPrompt = `
    You are a roleplay partner in a specific situation for an English learner.
    ${levelInst}
    
    [CRITICAL LANGUAGE RULE]
    - You MUST speak ONLY in ENGLISH.
    
    [CRITICAL CONTENT RULES]
    1. Do NOT say "Welcome to our chat".
    2. Start the roleplay IMMEDIATELY as the character defined in the context.
    3. Speak exactly like a human in that situation.
    
    Output ONLY valid JSON.
  `;

  const userPrompt = `
    [Scenario Context]
    "${context}"

    Task: Generate the FIRST opening sentence to start this conversation naturally in English.
    
    Response Format (JSON):
    {
      "opening": "Your opening line here"
    }
  `;

  const res = await generateText({
    prompt: userPrompt,
    system: systemPrompt,
    temperature: 0.7,
    model: "gpt-4o",
  });

  const parsed = parseJSON<{ opening: string }>(res.text);
  return parsed.opening;
}

/**
 * 2. 대화 응답 + 피드백 + [종료 감지]
 */
export async function generateTalkResponse(
  context: string,
  history: { role: string; content: string }[],
  userMessage: string,
  level: string
): Promise<{ reply: string; feedback: any; is_finished: boolean }> {
  const levelInst = getLevelInstruction(level);

  const historyText = history
    .map((msg) => `${msg.role === "user" ? "User" : "AI"}: ${msg.content}`)
    .join("\n");

  const wordIndexMap = createWordIndexMap(userMessage);

  const systemPrompt = `
    You are a roleplay partner in a specific situation for an English learner.
    
    [Current Scenario Context]
    "${context}"
    
    [Target User Level]
    ${level}
    
    [Instructions]
    1. ${levelInst}
    2. ACT as the character in the context.
    3. Speak naturally like a human.
    
    [CRITICAL LANGUAGE RULE]
    - Response ('reply') MUST be in ENGLISH.
    - Feedback ('explanation', 'message') MUST be in KOREAN.

    [TERMINATION RULES - IMPORTANT]
    - Analyze if the conversation has reached a natural conclusion.
    - Set "is_finished": true IF:
      1. The user says goodbye (e.g., "Bye", "See you", "Have a nice day").
      2. The user indicates they want to stop (e.g., "I have to go", "Stop").
      3. The scenario's goal is clearly achieved and there is nothing more to say.
    - If "is_finished": true, give a final natural farewell message in 'reply'.

    [IMPORTANT RULE FOR ERROR INDEXING]
    - Use [Word Index Map] to find the exact "index".
    - For 'style' errors, SET "index" TO null.
    
    IMPORTANT: Output ONLY valid JSON.
    
    JSON Structure:
    {
      "reply": "Your natural response here (ENGLISH)",
      "is_finished": boolean, 
      "feedback": {
        "explanation": "Brief explanation in Korean",
        "suggestion": "Corrected natural version",
        "errors": [
          {
            "index": number | null,
            "word": "error_word",
            "type": "grammar" | "spelling" | "word" | "style",
            "message": "Error description in Korean"
          }
        ]
      }
    }
  `;

  const userPrompt = `
    [Chat History]
    ${historyText}
    
    [Current Message Info]
    Text: "${userMessage}"
    Word Index Map: [ ${wordIndexMap} ]
  `;

  const res = await generateText({
    prompt: userPrompt,
    system: systemPrompt,
    temperature: 0.4,
    model: "gpt-4o",
  });

  return parseJSON<{ reply: string; feedback: any; is_finished: boolean }>(
    res.text
  );
}
