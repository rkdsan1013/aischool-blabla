// frontend/src/pages/Training.tsx
import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  useLayoutEffect,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X, Loader2, Check } from "lucide-react";

import Vocabulary from "../components/Vocabulary";
import Sentence from "../components/Sentence";
import Blank from "../components/Blank";
import Writing from "../components/Writing";
import Speaking from "../components/Speaking";
import type {
  QuestionItem,
  TrainingType,
  TrainingSessionDetail,
} from "../services/trainingService";
import {
  fetchTrainingQuestions,
  verifyAnswer,
  completeTrainingSession,
} from "../services/trainingService";
import { useProfile } from "../hooks/useProfile";

type ExtendedQuestionItem = QuestionItem & {
  canonical_preferred?: string;
  preferred?: string;
};

function isLocState(
  obj: unknown
): obj is { startType?: TrainingType; questions?: QuestionItem[] } {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  const hasStart = typeof o.startType === "string";
  const hasQuestions = Array.isArray(o.questions);
  return hasStart || hasQuestions;
}

const FOOTER_BASE_HEIGHT = 64;
const SAFE_BOTTOM = 12;
const FEEDBACK_AREA_MIN_HEIGHT = 100;
const FOOTER_BUTTON_AREA_HEIGHT = FOOTER_BASE_HEIGHT + SAFE_BOTTOM;

function normalizeForCompare(s: string) {
  return s
    .normalize("NFKC")
    .replace(/[\u2018\u2019\u201C\u201D]/g, "'")
    .replace(/\u00A0/g, " ")
    .replace(/[.,!?]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const TrainingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { profile, setProfileLocal } = useProfile();

  const locState = isLocState(location.state)
    ? (location.state as {
        startType?: TrainingType;
        questions?: QuestionItem[];
      })
    : undefined;

  const rawStart = locState && (locState as Record<string, unknown>).startType;
  const startType =
    typeof rawStart === "string" ? (rawStart as TrainingType) : undefined;

  const [questions, setQuestions] = useState<QuestionItem[] | null>(
    locState?.questions ?? null
  );
  const [loading, setLoading] = useState<boolean>(
    !locState?.questions && Boolean(startType)
  );
  const [index, setIndex] = useState<number>(0);

  const [correctCount, setCorrectCount] = useState<number>(0);
  const [sessionScore, setSessionScore] = useState<number>(0);

  const [history, setHistory] = useState<TrainingSessionDetail[]>([]);
  const startTimeRef = useRef<number>(Date.now());

  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<string[]>([]);
  const [writingValue, setWritingValue] = useState<string>("");

  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<boolean>(false);

  const [answerToShow, setAnswerToShow] = useState<string | null>(null);
  const [answerLabel, setAnswerLabel] = useState<string>("정답");

  const [finalTranscript, setFinalTranscript] = useState<string | null>(null);

  const [feedbackContentHeight, setFeedbackContentHeight] = useState(
    FEEDBACK_AREA_MIN_HEIGHT
  );
  const feedbackContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!startType && !questions) {
      console.error("잘못된 접근입니다. 훈련은 홈에서 시작해주세요.");
      navigate("/home");
      return;
    }

    if (!questions && startType) {
      const load = async () => {
        try {
          setLoading(true);
          const data = await fetchTrainingQuestions(startType);
          setQuestions(data);
          setIndex(0);
          setCorrectCount(0);
          setSessionScore(0);
          setHistory([]);
          startTimeRef.current = Date.now();
        } catch (err) {
          console.error(err);
          navigate("/home");
        } finally {
          setLoading(false);
        }
      };
      void load();
    }
  }, [startType, questions, navigate]);

  const currentQuestion: ExtendedQuestionItem | null = useMemo(
    () =>
      questions && questions[index]
        ? (questions[index] as ExtendedQuestionItem)
        : null,
    [questions, index]
  );

  const stableOptions = useMemo(() => {
    if (!currentQuestion) return [];
    if (currentQuestion.type === "writing") return [];
    return currentQuestion.options ? [...currentQuestion.options] : [];
  }, [currentQuestion]);

  const totalSteps = questions?.length ?? 0;
  const overallProgress =
    totalSteps === 0
      ? 0
      : ((showFeedback ? index + 1 : index) / Math.max(totalSteps, 1)) * 100;
  const isLastQuestion = index === (questions?.length ?? 1) - 1;

  const handleClose = () => {
    navigate("/home");
  };

  const resetQuestionState = () => {
    setSelectedAnswer(null);
    setSelectedOrder([]);
    setWritingValue("");
    setShowFeedback(false);
    setIsCorrect(false);
    setVerifying(false);
    setAnswerToShow(null);
    setAnswerLabel("정답");
    setFinalTranscript(null);
    setFeedbackContentHeight(FEEDBACK_AREA_MIN_HEIGHT);
  };

  const handleSelect = (option: string) => {
    if (showFeedback || verifying) return;
    setSelectedAnswer(option);
  };
  const handlePickPart = (part: string) => {
    if (showFeedback || verifying) return;
    setSelectedOrder((s) => (s.includes(part) ? s : [...s, part]));
  };
  const handleRemovePart = (part: string) => {
    if (showFeedback || verifying) return;
    setSelectedOrder((s) => s.filter((x) => x !== part));
  };
  const handleReorder = (next: string[]) => {
    if (showFeedback || verifying) return;
    setSelectedOrder(next);
  };
  const handleWritingChange = (v: string) => {
    if (showFeedback || verifying) return;
    setWritingValue(v);
  };

  const arraysEqual = (a: string[], b: string[]) =>
    a.length === b.length &&
    a.every((v, i) => v.trim() === (b[i] ?? "").trim());

  const handleSpeakingComplete = async (audioBlob: Blob) => {
    if (!currentQuestion) return;

    setVerifying(true);
    setShowFeedback(true);

    try {
      const result = await verifyAnswer({
        type: "speaking",
        userAnswer: audioBlob,
        correctAnswer: currentQuestion.correct ?? [],
      });

      setIsCorrect(result.isCorrect);

      if (result.transcript) {
        setFinalTranscript(result.transcript);
      }

      if (result.isCorrect) {
        setCorrectCount((prev) => prev + 1);
        setSessionScore((prev) => prev + result.points);
        setAnswerToShow(null);
      } else {
        setAnswerLabel("인식된 문장");
        setAnswerToShow(result.transcript ?? "인식 실패");
      }

      const detail: TrainingSessionDetail = {
        questionId: currentQuestion.id,
        questionText: currentQuestion.question,
        options: currentQuestion.options ?? [],
        userAnswer: result.transcript ?? "(Audio/No Transcript)",
        correctAnswer: String(currentQuestion.correct),
        isCorrect: result.isCorrect,
      };
      setHistory((prev) => [...prev, detail]);
    } catch (err) {
      console.error(err);
      setAnswerLabel("오류 발생");
      setAnswerToShow("채점 중 오류가 발생했습니다.");
    } finally {
      setVerifying(false);
    }
  };

  const handleCheckAnswer = async () => {
    if (!currentQuestion || verifying) return;

    setAnswerToShow(null);
    setAnswerLabel("정답");

    let userAnswerForBackend: string | string[] | Blob = "";
    let localCorrect = false;

    if (
      currentQuestion.type === "vocabulary" ||
      currentQuestion.type === "blank"
    ) {
      userAnswerForBackend = selectedAnswer ?? "";
      const correctField = currentQuestion.correct;
      localCorrect =
        typeof correctField === "string"
          ? correctField === selectedAnswer
          : Array.isArray(correctField)
          ? !!selectedAnswer && correctField.includes(selectedAnswer)
          : false;

      setIsCorrect(localCorrect);
      if (localCorrect) setCorrectCount((prev) => prev + 1);
      setShowFeedback(true);

      if (!localCorrect) {
        const correct = currentQuestion.correct;
        setAnswerToShow(Array.isArray(correct) ? correct[0] : correct ?? "");
      }
    } else if (currentQuestion.type === "sentence") {
      userAnswerForBackend = selectedOrder;
      if (Array.isArray(currentQuestion.correct)) {
        localCorrect = arraysEqual(currentQuestion.correct, selectedOrder);
      } else if (typeof currentQuestion.correct === "string") {
        localCorrect = currentQuestion.correct === selectedOrder.join(" ");
      }

      setIsCorrect(localCorrect);
      if (localCorrect) setCorrectCount((prev) => prev + 1);
      setShowFeedback(true);

      if (!localCorrect) {
        const correct = currentQuestion.correct;
        setAnswerToShow(
          Array.isArray(correct) ? correct.join(" ") : correct ?? ""
        );
      }
    } else if (currentQuestion.type === "writing") {
      userAnswerForBackend = writingValue;
      setVerifying(true);
      setShowFeedback(true);
    }

    try {
      const result = await verifyAnswer({
        type: currentQuestion.type,
        userAnswer: userAnswerForBackend,
        correctAnswer: currentQuestion.correct ?? [],
        extra: { questionText: currentQuestion.question },
      });

      if (currentQuestion.type === "writing") {
        const serverCorrect = result.isCorrect;
        setIsCorrect(serverCorrect);

        if (serverCorrect) {
          setCorrectCount((prev) => prev + 1);
          setSessionScore((prev) => prev + result.points);

          const intended = Array.isArray(currentQuestion.correct)
            ? currentQuestion.correct[0]
            : currentQuestion.correct;

          const normUser = normalizeForCompare(writingValue);
          const normIntended = normalizeForCompare(intended || "");

          if (intended && normUser !== normIntended) {
            setAnswerLabel("이런 표현도 있어요");
            setAnswerToShow(intended);
          } else {
            setAnswerToShow(null);
          }
        } else {
          setAnswerLabel("정답");
          setAnswerToShow(
            Array.isArray(currentQuestion.correct)
              ? currentQuestion.correct[0]
              : currentQuestion.correct ?? ""
          );
        }
      } else {
        if (result.isCorrect) {
          setSessionScore((prev) => prev + result.points);
        }
      }

      let storedUserAnswer = "";
      if (Array.isArray(userAnswerForBackend)) {
        storedUserAnswer = userAnswerForBackend.join(" ");
      } else {
        storedUserAnswer = String(userAnswerForBackend);
      }
      const storedCorrectAnswer = Array.isArray(currentQuestion.correct)
        ? currentQuestion.correct.join(" ")
        : String(currentQuestion.correct ?? "");

      const detail: TrainingSessionDetail = {
        questionId: currentQuestion.id,
        questionText: currentQuestion.question,
        options: currentQuestion.options ?? [],
        userAnswer: storedUserAnswer,
        correctAnswer: storedCorrectAnswer,
        isCorrect:
          currentQuestion.type === "writing" ? result.isCorrect : localCorrect,
      };
      setHistory((prev) => [...prev, detail]);
    } catch (err) {
      console.error("[Frontend] Verification failed", err);
      if (currentQuestion.type === "writing") {
        setIsCorrect(false);
        setAnswerLabel("오류");
        setAnswerToShow("채점 중 문제가 발생했습니다.");
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleNext = () => {
    if (!questions) return;
    if (index < questions.length - 1) {
      setIndex((i) => i + 1);
      resetQuestionState();
    } else {
      handleTrainingComplete();
    }
  };

  const handleTrainingComplete = async () => {
    if (!startType) return;

    const endTime = Date.now();
    // 시간 계산 (초 단위)
    const durationSec = Math.floor((endTime - startTimeRef.current) / 1000);

    try {
      const res = await completeTrainingSession({
        type: startType,
        score: sessionScore,
        durationSeconds: durationSec,
        sessionData: history,
      });

      if (profile && res.stats) {
        // [수정] 서비스 타입에 맞게 addedSeconds 사용
        const addedSeconds = res.stats.addedSeconds ?? durationSec;

        setProfileLocal({
          ...profile,
          streak_count: res.stats.streak,
          score: res.stats.totalScore,
          tier: res.stats.tier,
          // 기존 총 학습 시간(초)에 이번 학습 시간(초) 추가
          total_study_time: (profile.total_study_time || 0) + addedSeconds,
          completed_lessons: (profile.completed_lessons || 0) + 1,
        });
      }
    } catch (err) {
      console.error("학습 기록 저장 실패:", err);
    }

    navigate("/training/result", {
      replace: true,
      state: {
        correctCount: correctCount,
        totalCount: questions?.length ?? 0,
        trainingType: startType,
        earnedScore: sessionScore,
      },
    });
  };

  useLayoutEffect(() => {
    if (showFeedback && feedbackContentRef.current) {
      const currentContentHeight = feedbackContentRef.current.scrollHeight;
      setFeedbackContentHeight(
        Math.max(currentContentHeight, FEEDBACK_AREA_MIN_HEIGHT)
      );
    }
  }, [
    showFeedback,
    isCorrect,
    currentQuestion?.correct,
    answerToShow,
    verifying,
    answerLabel,
  ]);

  const footerVisualHeight = showFeedback
    ? FOOTER_BUTTON_AREA_HEIGHT + feedbackContentHeight
    : FOOTER_BUTTON_AREA_HEIGHT;

  const MAIN_CONTENT_PADDING_BOTTOM =
    FOOTER_BUTTON_AREA_HEIGHT + feedbackContentHeight;

  const canCheck = useMemo(() => {
    if (!currentQuestion) return false;
    switch (currentQuestion.type) {
      case "sentence":
        return selectedOrder.length > 0;
      case "writing":
        return writingValue.trim().length > 0;
      case "speaking":
        return false;
      default:
        return selectedAnswer != null;
    }
  }, [currentQuestion, selectedOrder, writingValue, selectedAnswer]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500" />
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="text-gray-500">
          문제를 불러오는 중이거나, 문제가 없습니다.
        </div>
        <button
          onClick={() => navigate("/home")}
          className="mt-4 text-rose-500 font-bold"
        >
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  const renderQuestionComponent = (item: QuestionItem) => {
    switch (item.type) {
      case "vocabulary":
        return (
          <Vocabulary
            question={item.question}
            options={stableOptions}
            selected={selectedAnswer}
            onSelect={handleSelect}
            correctAnswer={
              Array.isArray(item.correct) ? item.correct[0] : item.correct ?? ""
            }
            showFeedback={showFeedback}
          />
        );
      case "sentence":
        return (
          <Sentence
            question={item.question}
            options={stableOptions}
            selectedOrder={selectedOrder}
            onPick={handlePickPart}
            onRemove={handleRemovePart}
            onReorder={handleReorder}
            showFeedback={showFeedback}
            isCorrect={isCorrect}
          />
        );
      case "blank":
        return (
          <Blank
            question={item.question}
            options={stableOptions}
            selected={selectedAnswer}
            onSelect={handleSelect}
            correctAnswer={
              Array.isArray(item.correct) ? item.correct[0] : item.correct ?? ""
            }
            showFeedback={showFeedback}
          />
        );
      case "writing":
        return (
          <Writing
            sentence={String(item.question ?? "")}
            value={writingValue}
            onChange={handleWritingChange}
            disabled={showFeedback || verifying}
          />
        );
      case "speaking":
        return (
          <Speaking
            key={item.id}
            prompt={item.question}
            onRecord={handleSpeakingComplete}
            serverTranscript={finalTranscript}
          />
        );
      default:
        return (
          <div className="py-6 text-center text-gray-500">
            지원하지 않는 문제 유형입니다.
          </div>
        );
    }
  };

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <header className="flex-none border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex-1 px-3">
            <div className="mt-2">
              <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500 transition-all duration-300"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center text-gray-600 rounded-md hover:bg-gray-100 transition"
            aria-label="닫기"
            type="button"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      <main
        className="flex-1 max-w-4xl mx-auto w-full px-4 pt-4 overflow-y-auto relative"
        style={{ paddingBottom: `${MAIN_CONTENT_PADDING_BOTTOM}px` }}
      >
        {showFeedback && (
          <div
            className="absolute inset-0 bg-transparent"
            style={{ zIndex: 30, pointerEvents: "auto" }}
            aria-hidden="true"
          />
        )}
        <fieldset
          disabled={showFeedback || verifying}
          className="w-full flex flex-col gap-4 h-full"
        >
          {renderQuestionComponent(currentQuestion)}
          <div className="flex-1" />
        </fieldset>
      </main>

      <div
        className="fixed left-0 right-0 bottom-0 z-50 flex justify-center"
        style={{ pointerEvents: "none" }}
      >
        <div
          className="max-w-4xl w-full relative overflow-hidden"
          style={{
            height: `${footerVisualHeight}px`,
            transition: "height 260ms ease",
            pointerEvents: "auto",
          }}
        >
          <div
            className={`absolute bottom-0 left-0 right-0 transition-transform duration-300 ease-out ${
              showFeedback ? "translate-y-0" : "translate-y-full"
            } ${
              verifying
                ? "bg-gray-50 border-t border-gray-200"
                : isCorrect
                ? "bg-green-100 border-t border-green-200"
                : "bg-rose-100 border-t border-rose-200"
            } rounded-t-2xl shadow-2xl`}
            style={{
              height: "100%",
              zIndex: 5,
              pointerEvents: showFeedback ? "auto" : "none",
            }}
          >
            <div
              ref={feedbackContentRef}
              className="max-w-4xl mx-auto w-full flex items-start gap-3 p-4"
              style={{ minHeight: `${FEEDBACK_AREA_MIN_HEIGHT}px` }}
            >
              {showFeedback && (
                <>
                  {verifying ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
                      <span className="text-gray-600 font-semibold">
                        채점 중입니다...
                      </span>
                    </div>
                  ) : (
                    <>
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isCorrect ? "bg-green-500" : "bg-rose-500"
                        }`}
                      >
                        {isCorrect ? (
                          <Check className="w-6 h-6 text-white" />
                        ) : (
                          <X className="w-6 h-6 text-white" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div
                          className={`text-lg font-semibold ${
                            isCorrect ? "text-green-800" : "text-rose-800"
                          }`}
                        >
                          {isCorrect ? "정답입니다!" : "아쉬워요!"}
                        </div>
                        {((!isCorrect &&
                          currentQuestion?.type !== "speaking") ||
                          (isCorrect && answerToShow) ||
                          (!isCorrect &&
                            currentQuestion?.type === "speaking")) && (
                          <div className="mt-1">
                            <div className="text-sm text-gray-600">
                              {answerLabel}
                            </div>
                            <div className="text-base font-bold text-gray-900 mt-1 break-keep">
                              {answerToShow}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          <div
            className="absolute bottom-0 left-0 right-0 w-full"
            style={{
              height: `${FOOTER_BUTTON_AREA_HEIGHT}px`,
              paddingBottom: `${SAFE_BOTTOM}px`,
              zIndex: 10,
              pointerEvents: "auto",
            }}
          >
            <div
              className="flex items-center max-w-4xl mx-auto w-full px-4"
              style={{ height: `${FOOTER_BASE_HEIGHT}px` }}
            >
              <div className="w-full px-0">
                {verifying ? (
                  <button
                    disabled
                    className="w-full h-12 rounded-xl font-semibold text-base bg-gray-200 text-gray-400 cursor-wait flex items-center justify-center gap-2"
                    style={{ pointerEvents: "auto" }}
                  >
                    채점 중...
                  </button>
                ) : !showFeedback ? (
                  <button
                    onClick={handleCheckAnswer}
                    disabled={
                      !canCheck ||
                      currentQuestion?.type === "speaking" ||
                      verifying
                    }
                    className={`w-full h-12 rounded-xl font-semibold text-base transition duration-200 ${
                      canCheck &&
                      currentQuestion?.type !== "speaking" &&
                      !verifying
                        ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20 active:scale-[.98]"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                    style={{ pointerEvents: "auto" }}
                  >
                    {currentQuestion?.type === "speaking"
                      ? "말하기를 완료하세요"
                      : "정답 확인"}
                  </button>
                ) : isLastQuestion ? (
                  <button
                    onClick={handleTrainingComplete}
                    className={`w-full h-12 rounded-xl font-semibold text-base transition duration-200 text-white shadow-lg active:scale-[.98] ${
                      isCorrect
                        ? "bg-green-600 shadow-green-500/20"
                        : "bg-rose-600 shadow-rose-500/20"
                    }`}
                    style={{ pointerEvents: "auto" }}
                  >
                    학습 종료
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    className={`w-full h-12 rounded-xl font-semibold text-base transition duration-200 text-white shadow-lg active:scale-[.98] ${
                      isCorrect
                        ? "bg-green-600 shadow-green-500/20"
                        : "bg-rose-600 shadow-rose-500/20"
                    }`}
                    style={{ pointerEvents: "auto" }}
                  >
                    다음 문제
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingPage;
