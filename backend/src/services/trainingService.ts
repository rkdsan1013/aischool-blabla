// backend/src/services/trainingService.ts
import { nanoid } from "nanoid";
import { generateVocabularyQuestionsRaw } from "../ai/generators/vocabulary";
import { generateSentenceQuestionsRaw } from "../ai/generators/sentence";
import { generateBlankQuestionsRaw } from "../ai/generators/blank";
import {
  generateWritingQuestionsRaw,
  verifyWritingWithLLM,
} from "../ai/generators/writing"; // [수정] AI 폴더에서 import
import { generateSpeakingQuestionsRaw } from "../ai/generators/speaking";

export type TrainingType =
  | "vocabulary"
  | "sentence"
  | "blank"
  | "writing"
  | "speaking";

export interface QuestionItem {
  id: string;
  type: TrainingType;
  question: string;
  options?: string[] | undefined;
  correct?: string | string[] | undefined;
}

// DUMMY 데이터 (LLM 실패 시 fallback)
const DUMMY: Record<TrainingType, QuestionItem[]> = {
  vocabulary: [
    {
      id: "v1",
      type: "vocabulary",
      question: "사과",
      options: ["Apple", "Banana", "Orange", "Grape"],
      correct: "Apple",
    },
  ],
  sentence: [
    {
      id: "s1",
      type: "sentence",
      question: "나는 배고프다",
      options: ["I", "hungry", "am", "is", "happy"],
      correct: ["I", "am", "hungry"],
    },
  ],
  blank: [],
  writing: [],
  speaking: [],
};

// --- [헬퍼 함수] ---
function cleanString(s: string): string {
  return s.trim().replace(/[.,!?]$/, "");
}

function shuffleArray<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
}

function normalizeOptionsAndCorrect(item: unknown): {
  options: string[];
  correct: string;
} {
  const rawOptions: string[] = Array.isArray((item as any)?.options)
    ? (item as any).options
        .map((o: any) => cleanString(String(o ?? "")))
        .filter((s: string) => s !== "")
    : [];

  let correctCandidate: string =
    typeof (item as any)?.correct === "string"
      ? cleanString(String((item as any).correct))
      : "";

  const deduped: string[] = Array.from(new Set(rawOptions));
  if (correctCandidate !== "" && !deduped.includes(correctCandidate)) {
    deduped.unshift(correctCandidate);
  }
  let options = deduped.slice(0, 4);
  while (options.length < 4) options.push("(unknown)");
  if (correctCandidate === "") correctCandidate = options[0]!;

  shuffleArray(options);

  if (!options.includes(correctCandidate)) {
    options[0] = correctCandidate;
  }
  return { options, correct: correctCandidate };
}

/**
 * 정답 검증 로직 (기존 규칙 기반)
 * Writing은 별도 LLM 함수를 사용하므로 여기서는 Fallback 역할만 하거나 제외됨.
 */
export function verifyUserAnswer(
  type: TrainingType,
  userAnswer: string | string[],
  correctAnswer: string | string[]
): boolean {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[.,!?]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  if (type === "vocabulary" || type === "blank") {
    return normalize(String(userAnswer)) === normalize(String(correctAnswer));
  } else if (type === "sentence") {
    if (Array.isArray(userAnswer) && Array.isArray(correctAnswer)) {
      if (userAnswer.length !== correctAnswer.length) return false;
      return userAnswer.every(
        (word, idx) => normalize(word) === normalize(correctAnswer[idx] ?? "")
      );
    }
    return normalize(String(userAnswer)) === normalize(String(correctAnswer));
  } else if (type === "writing") {
    // [수정] Writing은 기본적으로 LLM 검증을 권장하므로,
    // 이 함수가 호출된다면 정확히 일치하는지(혹은 배열에 포함되는지)만 확인
    const user = normalize(String(userAnswer));
    const correctCandidates = Array.isArray(correctAnswer)
      ? correctAnswer
      : [String(correctAnswer)];
    return correctCandidates.some((candidate) => normalize(candidate) === user);
  } else if (type === "speaking") {
    return true;
  }
  return false;
}

/**
 * Writing 전용 검증 서비스 래퍼
 * 컨트롤러에서 사용하기 위해 export
 */
export async function verifyWritingAnswerService(
  question: string,
  intendedAnswer: string,
  userAnswer: string
) {
  return await verifyWritingWithLLM(question, intendedAnswer, userAnswer);
}

// --- [헬퍼 함수 완료] ---

/**
 * getQuestionsByType
 * LLM 호출, 재시도, 파싱, 정규화, 패딩 통합
 */
export async function getQuestionsByType(
  type: TrainingType,
  opts?: { level?: string | undefined; level_progress?: number | undefined }
): Promise<QuestionItem[]> {
  const level: string = typeof opts?.level === "string" ? opts.level : "C2";
  const level_progress: number =
    typeof opts?.level_progress === "number" ? opts.level_progress : 50;

  const MAX_RETRIES = 3;
  let parsed: unknown = null;
  let lastError: Error | null = null;
  let raw: string = "";

  try {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        switch (type) {
          case "vocabulary":
            raw = await generateVocabularyQuestionsRaw(level, level_progress);
            break;
          case "sentence":
            raw = await generateSentenceQuestionsRaw(level, level_progress);
            break;
          case "blank":
            raw = await generateBlankQuestionsRaw(level, level_progress);
            break;
          case "writing":
            raw = await generateWritingQuestionsRaw(level, level_progress);
            break;
          case "speaking":
            raw = await generateSpeakingQuestionsRaw(level, level_progress);
            break;
          default:
            return DUMMY[type] ?? [];
        }

        try {
          parsed = JSON.parse(String(raw));
        } catch (err) {
          const match = String(raw).match(/\[[\s\S]*\]/);
          if (match) {
            try {
              parsed = JSON.parse(match[0]);
            } catch (e) {
              parsed = null;
            }
          } else {
            parsed = null;
          }
        }

        if (Array.isArray(parsed)) {
          lastError = null;
          break;
        } else {
          lastError = new Error("Parsed result is not array");
        }
      } catch (llmError) {
        lastError = llmError as Error;
        console.error(
          `[TRAINING SERVICE] Attempt ${attempt} failed:`,
          llmError
        );
      }
    }

    if (!Array.isArray(parsed)) {
      console.error(
        `[TRAINING SERVICE] All ${MAX_RETRIES} attempts failed. Last error:`,
        lastError
      );
      return DUMMY[type] ?? [];
    }

    const items = (parsed as any[]).slice(0, 10);
    let normalized: QuestionItem[];

    // --- 유형별 정규화 로직 ---
    if (type === "vocabulary" || type === "blank") {
      normalized = items.map((item: any) => {
        const id = nanoid();
        const question = item?.question
          ? String(item.question).trim()
          : "(unknown)";
        const { options, correct } = normalizeOptionsAndCorrect(item);
        return { id, type, question, options, correct };
      });
    } else if (type === "sentence") {
      normalized = items.map((item: any) => {
        const id = nanoid();
        const question = item?.question
          ? String(item.question).trim()
          : "(unknown)";

        const correctWords = Array.isArray(item?.correct)
          ? item.correct.map((s: any) => cleanString(String(s)))
          : [];

        const distractorWords = Array.isArray(item?.options)
          ? item.options.map((s: any) => cleanString(String(s)))
          : [];

        const finalOptions = [...correctWords, ...distractorWords];
        shuffleArray(finalOptions);

        return {
          id,
          type,
          question,
          options: finalOptions,
          correct: correctWords,
        };
      });
    } else if (type === "writing") {
      normalized = items.map((item: any) => {
        const id = nanoid();
        const question = item?.question
          ? String(item.question).trim()
          : "(unknown question)";

        // [수정] 이제 correct는 문자열로 옴. 프론트 통일성을 위해 배열로 래핑
        let correctArr: string[] = [];
        if (typeof item?.correct === "string") {
          correctArr = [String(item.correct).trim()];
        } else if (Array.isArray(item?.correct)) {
          // 혹시 모델이 배열로 줄 경우 대비
          correctArr = item.correct.map(String);
        } else {
          correctArr = [""];
        }

        return {
          id,
          type: "writing",
          question: question,
          options: [],
          correct: correctArr, // [의도한 정답 1개]
        };
      });
    } else if (type === "speaking") {
      normalized = items.map((item: any) => {
        const id = nanoid();
        const question = item?.question
          ? String(item.question).trim()
          : "(unknown question)";

        return {
          id,
          type: "speaking",
          question: question,
          options: [],
          correct: question,
        };
      });
    } else {
      return DUMMY[type] ?? [];
    }

    // 패딩 보장
    if (normalized.length < 10) {
      const padded = normalized.slice();
      for (let i = padded.length; i < 10; i++) {
        const isSentence = type === "sentence";
        const isWriting = type === "writing";
        const isSpeaking = type === "speaking";

        let options: string[] = [];
        let correct: string | string[] = "(pad)";

        if (isSentence) {
          options = [];
          correct = [];
        } else if (isWriting) {
          options = [];
          correct = ["(pad)"];
        } else if (isSpeaking) {
          options = [];
          correct = "(pad)";
        } else {
          options = ["(pad1)", "(pad2)", "(pad3)", "(pad4)"];
          correct = "(pad1)";
        }

        padded.push({
          id: nanoid(),
          type,
          question: `(random pad ${i + 1})`,
          options: options,
          correct: correct,
        });
      }
      return padded;
    }

    return normalized;
  } catch (err) {
    console.error(`[TRAINING SERVICE] Error:`, err);
    return DUMMY[type] ?? [];
  }
}
