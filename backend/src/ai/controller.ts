// backend/src/ai/controller.ts
import { Request, Response } from "express";
import { nanoid } from "nanoid";
import { generateVocabularyQuestionsRaw } from "./generators/vocabulary";
import { generateSentenceQuestionsRaw } from "./generators/sentence";
import { generateBlankQuestionsRaw } from "./generators/blank";
import { generateWritingQuestionsRaw } from "./generators/writing";
import { generateSpeakingQuestionsRaw } from "./generators/speaking";

/**
 * 유틸리티: 배열 셔플 (Fisher-Yates Shuffle)
 */
function shuffleArray<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
}

/**
 * [변경] options 보정 로직
 * Vocabulary, Blank 유형 전용:
 * 1. LLM은 options[0]에 정답을 담아서 반환함 (토큰 절약).
 * 2. 이를 분리(pop)하여 correct 필드에 할당.
 * 3. options 배열을 섞음.
 * 4. 최종적으로 { options, correct } 구조 반환.
 */
function normalizeOptionsAndCorrect(item: any): {
  options: string[];
  correct: string;
} {
  // 1. rawOptions 추출
  const rawOptions: string[] = Array.isArray(item?.options)
    ? item.options
        .map((o: any) => String(o ?? "").trim())
        .filter((s: string) => s !== "")
    : [];

  // 2. 정답 후보 추출 (규칙: 0번 인덱스가 정답)
  // [수정] rawOptions[0]이 undefined일 경우를 대비해 ?? 연산자로 string 타입 보장
  let correctCandidate: string = rawOptions[0] ?? "(unknown)";

  // 중복 제거 (혹시 모를 LLM 오류 대비)
  let deduped = Array.from(new Set(rawOptions));

  // 3. 4개가 안 되면 채워넣기 (fallback)
  while (deduped.length < 4) {
    deduped.push(`(option ${deduped.length + 1})`);
  }
  // 4개로 자르기 (혹시 4개 초과 시)
  deduped = deduped.slice(0, 4);

  // 잘린 배열 안에 정답(원래 0번)이 있는지 확인하고, 없으면 강제 주입
  if (!deduped.includes(correctCandidate)) {
    deduped[0] = correctCandidate;
  }

  // 4. 셔플 (여기서 정답의 위치가 섞임)
  shuffleArray(deduped);

  return { options: deduped, correct: correctCandidate };
}

/**
 * 공통 LLM 호출 및 파싱 유틸
 */
async function callAndParseLLM(
  generator: (level?: string, level_progress?: number) => Promise<string>,
  level?: string,
  level_progress?: number,
  maxItems = 10
): Promise<unknown[] | { raw: string; error?: Error }> {
  const MAX_RETRIES = 3;
  let parsed: unknown = null;
  let lastError: Error | null = null;
  let raw: string = "";

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      raw = await generator(level, level_progress);

      try {
        parsed = JSON.parse(String(raw));
      } catch (err) {
        const match = String(raw).match(/\[[\s\S]*\]/);
        if (match) {
          try {
            parsed = JSON.parse(match[0]);
          } catch (err2) {
            lastError = err2 as Error;
            parsed = null;
          }
        } else {
          lastError = err as Error;
          parsed = null;
        }
      }

      if (Array.isArray(parsed)) {
        return (parsed as any[]).slice(0, maxItems);
      } else {
        lastError = new Error("Parsed result is not array");
      }
    } catch (llmError) {
      lastError = llmError as Error;
    }
  }

  return { raw, error: lastError ?? new Error("LLM parse failed") };
}

/**
 * POST /api/llm/vocabulary
 */
export async function vocabularyHandler(req: Request, res: Response) {
  try {
    const user = req.user;
    if (!user)
      return res.status(401).json({ message: "User not authenticated" });

    const level: string | undefined = (user as any).level;
    const level_progress: number | undefined = (user as any).level_progress;

    const parsed = await callAndParseLLM(
      generateVocabularyQuestionsRaw,
      level,
      level_progress
    );
    if (!Array.isArray(parsed)) {
      const { raw, error } = parsed as any;
      console.error("[LLM CONTROLLER][vocabulary] failed:", error);
      return res
        .status(502)
        .json({ error: "LLM returned invalid JSON (expected array).", raw });
    }

    const items = (parsed as any[]).slice(0, 10);
    const normalized = items.map((item: any) => {
      const id = nanoid();
      const question =
        typeof item?.question === "string" && item.question.trim() !== ""
          ? item.question.trim()
          : "(unknown question)";

      // 0번 인덱스 정답 추출 및 셔플
      const { options, correct } = normalizeOptionsAndCorrect(item);

      return {
        id,
        type: "vocabulary" as const,
        question,
        options,
        correct,
      };
    });

    if (normalized.length < 10) {
      const padded = normalized.slice();
      for (let i = padded.length; i < 10; i++) {
        padded.push({
          id: nanoid(),
          type: "vocabulary" as const,
          question: `(random word ${i + 1})`,
          options: ["(unknown1)", "(unknown2)", "(unknown3)", "(unknown4)"],
          correct: "(unknown1)",
        });
      }
      return res.json(padded);
    }

    return res.json(normalized);
  } catch (err) {
    console.error("[LLM CONTROLLER][vocabulary] unexpected error:", err);
    return res.status(500).json({ error: "LLM generation failed" });
  }
}

/**
 * POST /api/llm/sentence
 * (주의: Sentence 유형은 options가 오답 모음, correct가 정답 배열이므로 위 로직을 적용하지 않음)
 */
export async function sentenceHandler(req: Request, res: Response) {
  try {
    const user = req.user;
    if (!user)
      return res.status(401).json({ message: "User not authenticated" });

    const level: string | undefined = (user as any).level;
    const level_progress: number | undefined = (user as any).level_progress;

    const parsed = await callAndParseLLM(
      generateSentenceQuestionsRaw,
      level,
      level_progress
    );
    if (!Array.isArray(parsed)) {
      const { raw, error } = parsed as any;
      console.error("[LLM CONTROLLER][sentence] failed:", error);
      return res
        .status(502)
        .json({ error: "LLM returned invalid JSON (expected array).", raw });
    }

    const items = (parsed as any[]).slice(0, 10);
    const normalized = items.map((item: any) => {
      const id = nanoid();
      const question =
        typeof item?.question === "string" && item.question.trim() !== ""
          ? item.question.trim()
          : "(unknown question)";

      const correctWords: string[] = Array.isArray(item?.correct)
        ? item.correct.map(String).filter((s: string) => s !== "")
        : [];

      // "distractor"는 교육학 전문 용어이므로 스펠링 체크 경고는 무시해도 됩니다.
      const distractorWords: string[] = Array.isArray(item?.options)
        ? item.options.map(String).filter((s: string) => s !== "")
        : [];

      const finalOptions = [...correctWords, ...distractorWords];
      const uniq = Array.from(new Set(finalOptions));
      shuffleArray(uniq);

      return {
        id,
        type: "sentence" as const,
        question,
        options: uniq,
        correct: correctWords,
      };
    });

    if (normalized.length < 10) {
      const padded = normalized.slice();
      for (let i = padded.length; i < 10; i++) {
        padded.push({
          id: nanoid(),
          type: "sentence" as const,
          question: `(random pad ${i + 1})`,
          options: [],
          correct: [],
        });
      }
      return res.json(padded);
    }

    return res.json(normalized);
  } catch (err) {
    console.error("[LLM CONTROLLER][sentence] unexpected error:", err);
    return res.status(500).json({ error: "LLM generation failed" });
  }
}

/**
 * POST /api/llm/blank
 */
export async function blankHandler(req: Request, res: Response) {
  try {
    const user = req.user;
    if (!user)
      return res.status(401).json({ message: "User not authenticated" });

    const level: string | undefined = (user as any).level;
    const level_progress: number | undefined = (user as any).level_progress;

    const parsed = await callAndParseLLM(
      generateBlankQuestionsRaw,
      level,
      level_progress
    );
    if (!Array.isArray(parsed)) {
      const { raw, error } = parsed as any;
      console.error("[LLM CONTROLLER][blank] failed:", error);
      return res
        .status(502)
        .json({ error: "LLM returned invalid JSON (expected array).", raw });
    }

    const items = (parsed as any[]).slice(0, 10);
    const normalized = items.map((item: any) => {
      const id = nanoid();
      const question =
        typeof item?.question === "string" && item.question.trim() !== ""
          ? item.question.trim()
          : "(unknown question)";

      // 0번 인덱스 정답 추출 및 셔플
      const { options, correct } = normalizeOptionsAndCorrect(item);

      return {
        id,
        type: "blank" as const,
        question,
        options,
        correct,
      };
    });

    if (normalized.length < 10) {
      const padded = normalized.slice();
      for (let i = padded.length; i < 10; i++) {
        padded.push({
          id: nanoid(),
          type: "blank" as const,
          question: `(random blank ${i + 1})`,
          options: ["(unknown1)", "(unknown2)", "(unknown3)", "(unknown4)"],
          correct: "(unknown1)",
        });
      }
      return res.json(padded);
    }

    return res.json(normalized);
  } catch (err) {
    console.error("[LLM CONTROLLER][blank] unexpected error:", err);
    return res.status(500).json({ error: "LLM generation failed" });
  }
}

/**
 * POST /api/llm/writing
 */
export async function writingHandler(req: Request, res: Response) {
  try {
    const user = req.user;
    if (!user)
      return res.status(401).json({ message: "User not authenticated" });

    const level: string | undefined = (user as any).level;
    const level_progress: number | undefined = (user as any).level_progress;

    const parsed = await callAndParseLLM(
      generateWritingQuestionsRaw,
      level,
      level_progress
    );
    if (!Array.isArray(parsed)) {
      const { raw, error } = parsed as any;
      console.error("[LLM CONTROLLER][writing] failed:", error);
      return res
        .status(502)
        .json({ error: "LLM returned invalid JSON (expected array).", raw });
    }

    const items = (parsed as any[]).slice(0, 10);
    const normalized = items.map((item: any) => {
      const id = nanoid();

      // question: 한국어 문장
      const question =
        typeof item?.question === "string" && item.question.trim() !== ""
          ? item.question.trim()
          : "(unknown question)";

      // correct: 정답 영어 문장 배열
      let correctArr: string[] = [];
      if (Array.isArray(item?.correct)) {
        correctArr = item.correct
          .map(String)
          .filter((s: string) => s.trim() !== "");
      } else if (typeof item?.correct === "string") {
        correctArr = [item.correct.trim()];
      }

      if (correctArr.length === 0) {
        correctArr.push("(no correct answer provided)");
      }

      return {
        id,
        type: "writing" as const,
        question,
        options: [],
        correct: correctArr,
      };
    });

    if (normalized.length < 10) {
      const padded = normalized.slice();
      for (let i = padded.length; i < 10; i++) {
        padded.push({
          id: nanoid(),
          type: "writing" as const,
          question: `(random writing ${i + 1})`,
          options: [],
          correct: ["(unknown)"],
        });
      }
      return res.json(padded);
    }

    return res.json(normalized);
  } catch (err) {
    console.error("[LLM CONTROLLER][writing] unexpected error:", err);
    return res.status(500).json({ error: "LLM generation failed" });
  }
}

/**
 * POST /api/llm/speaking
 */
export async function speakingHandler(req: Request, res: Response) {
  try {
    const user = req.user;
    if (!user)
      return res.status(401).json({ message: "User not authenticated" });

    const level: string | undefined = (user as any).level;
    const level_progress: number | undefined = (user as any).level_progress;

    const parsed = await callAndParseLLM(
      generateSpeakingQuestionsRaw,
      level,
      level_progress
    );

    if (!Array.isArray(parsed)) {
      const { raw, error } = parsed as any;
      console.error("[LLM CONTROLLER][speaking] failed:", error);
      return res
        .status(502)
        .json({ error: "LLM returned invalid JSON (expected array).", raw });
    }

    const items = (parsed as any[]).slice(0, 10);
    const normalized = items.map((item: any) => {
      const id = nanoid();
      const question =
        typeof item?.question === "string" && item.question.trim() !== ""
          ? item.question.trim()
          : "(unknown question)";

      return {
        id,
        type: "speaking" as const,
        question, // 따라 읽을 영어 문장
        options: [],
        correct: question, // 정답(원문)
      };
    });

    if (normalized.length < 10) {
      const padded = normalized.slice();
      for (let i = padded.length; i < 10; i++) {
        padded.push({
          id: nanoid(),
          type: "speaking" as const,
          question: `(random speaking ${i + 1})`,
          options: [],
          correct: `(random speaking ${i + 1})`,
        });
      }
      return res.json(padded);
    }

    return res.json(normalized);
  } catch (err) {
    console.error("[LLM CONTROLLER][speaking] unexpected error:", err);
    return res.status(500).json({ error: "LLM generation failed" });
  }
}
