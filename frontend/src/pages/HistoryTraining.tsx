// frontend/src/pages/HistoryTraining.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import BlankHistory from "../components/BlankHistory";
import VocabularyHistory from "../components/VocabularyHistory";
import SentenceHistory from "../components/SentenceHistory";
import WritingHistory from "../components/WritingHistory";
import SpeakingHistory from "../components/SpeakingHistory";
import {
  getMyTrainingHistory,
  getTrainingDetail,
} from "../services/userService";

/* ----------------------------- 로컬 타입 정의 ----------------------------- */
type QuestionType =
  | "vocabulary"
  | "blank"
  | "sentence"
  | "speaking"
  | "writing";

type TrainingDetailItem = {
  questionId: string | number;
  questionText: string;
  questionType: QuestionType;
  options?: string[];
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
};

type TrainingDetailResponse = {
  sessionId: string;
  trainingType: QuestionType;
  completedAt: string;
  correctCount: number;
  totalCount: number;
  score: number;
  details: TrainingDetailItem[];
};

/* ----------------------------- 유틸 함수 ----------------------------- */
const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    vocabulary: "단어 학습",
    blank: "빈칸 채우기",
    sentence: "문장 배열",
    speaking: "말하기 연습",
    writing: "작문 연습",
  };
  return labels[type] || type;
};

const formatDateKorean = (iso: string) =>
  new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/* ----------------------------- 컴포넌트 ----------------------------- */
const HistoryTraining: React.FC = () => {
  const params = useParams<{ sessionId?: string }>();
  const navigate = useNavigate();
  const routeParam = params.sessionId ?? null;

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [trainingDetail, setTrainingDetail] =
    useState<TrainingDetailResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /* 
    우선순위:
    1) 라우트 파라미터 (useParams)
    2) 쿼리 파라미터 ?sessionId=...
    3) 사용자의 학습 목록에서 가장 최근 세션 (fallback)
  */
  useEffect(() => {
    // 1) route param 우선 사용
    if (routeParam) {
      setSessionId(routeParam);
      return;
    }

    // 2) 쿼리 파라미터 확인
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("sessionId");
    if (sid) {
      setSessionId(sid);
      return;
    }

    // 3) fallback: 사용자의 학습 목록에서 첫 항목(최신)을 가져와 기본값으로 설정
    (async () => {
      try {
        setLoading(true);
        const list = await getMyTrainingHistory();
        if (list && list.length > 0) {
          const first = (list as any)[0];
          setSessionId(String(first.sessionId ?? first.sessionId));
        } else {
          setSessionId(null);
        }
      } catch (err) {
        // 목록 조회 실패는 무시하고 빈 상태로 둠(다음 effect에서 처리)
      } finally {
        setLoading(false);
      }
    })();
    // routeParam이 바뀔 때마다 재실행되도록 의존성에 포함
  }, [routeParam]);

  useEffect(() => {
    if (!sessionId) {
      setTrainingDetail(null);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        // sessionId가 "train-12" 같은 형식일 수 있으므로 숫자만 추출
        const numericCandidate = String(sessionId).replace(/[^0-9]/g, "");
        const idToFetch =
          numericCandidate.length > 0 ? Number(numericCandidate) : sessionId;
        const detail = await getTrainingDetail(idToFetch);
        if (!mounted) return;

        if (!detail) {
          setTrainingDetail(null);
          setError("해당 학습 기록을 찾을 수 없습니다.");
        } else {
          // 서비스에서 반환하는 구조가 다를 수 있으므로 안전하게 매핑
          const mapped: TrainingDetailResponse = {
            sessionId: String(
              (detail as any).sessionId ?? detail.sessionId ?? ""
            ),
            trainingType:
              (detail as any).trainingType ??
              (detail as any).type ??
              "vocabulary",
            completedAt:
              (detail as any).completedAt ??
              (detail as any).createdAt ??
              new Date().toISOString(),
            correctCount: Number((detail as any).correctCount ?? 0),
            totalCount: Number(
              (detail as any).totalCount ??
                ((detail as any).details ? (detail as any).details.length : 0)
            ),
            score: Number((detail as any).score ?? 0),
            details: Array.isArray((detail as any).details)
              ? (detail as any).details.map((it: any, idx: number) => ({
                  questionId: it.questionId ?? it.id ?? `q-${idx}`,
                  questionText: it.questionText ?? it.question ?? "",
                  questionType:
                    it.questionType ??
                    (detail as any).trainingType ??
                    "vocabulary",
                  options: Array.isArray(it.options)
                    ? it.options.map(String)
                    : undefined,
                  userAnswer: it.userAnswer ?? it.answer ?? "",
                  correctAnswer: it.correctAnswer ?? it.correct ?? "",
                  isCorrect: !!it.isCorrect,
                }))
              : [],
          };

          setTrainingDetail(mapped);
        }
      } catch (err) {
        setError("학습 기록을 불러오는 중 오류가 발생했습니다.");
        setTrainingDetail(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [sessionId]);

  const accuracy = useMemo(() => {
    if (!trainingDetail) return 0;
    return Math.round(
      (trainingDetail.correctCount / Math.max(1, trainingDetail.totalCount)) *
        100
    );
  }, [trainingDetail]);

  const playTTS = (text: string, lang = "en-US") => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      window.speechSynthesis.speak(utterance);
    } catch {
      // ignore
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  /* ----------------------------- 렌더 ----------------------------- */
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{error}</p>
          <p className="text-xs text-gray-400 mb-4">
            sessionId: {sessionId ?? "없음"}
          </p>
          <button
            onClick={handleBack}
            className="text-rose-500 font-bold hover:underline"
            aria-label="뒤로가기"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (!trainingDetail) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-500 mb-4">학습 기록이 없습니다.</p>
          <button
            onClick={handleBack}
            className="text-rose-500 font-bold hover:underline"
            aria-label="뒤로가기"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 헤더: HistoryAI와 동일한 레이아웃 폭/패딩 기준 적용 */}
      <header className="w-full bg-white/80 backdrop-blur-md shrink-0 border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14 sm:h-16">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={handleBack}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
              aria-label="뒤로가기"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                {getTypeLabel(trainingDetail.trainingType)}
              </h1>
              <p className="text-xs text-gray-500">
                {formatDateKorean(trainingDetail.completedAt)}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠: HistoryAI와 동일한 max-width, 패딩, 간격 적용 */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 mb-6 overflow-hidden">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {trainingDetail.correctCount}/{trainingDetail.totalCount}
              </p>
              <p className="text-sm text-gray-500 mt-1">정답률</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-rose-500">{accuracy}%</p>
              <p className="text-sm text-gray-500 mt-1">정확도</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-500">
                {trainingDetail.score}점
              </p>
              <p className="text-sm text-gray-500 mt-1">획득 점수</p>
            </div>
          </div>
        </div>

        {/* 문제별 결과: 카드 스타일과 간격을 HistoryAI와 맞춤 */}
        <div className="space-y-6">
          {trainingDetail.details.map(
            (detail: TrainingDetailItem, index: number) => (
              <section
                key={String(detail.questionId) + "-" + index}
                className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200"
                aria-labelledby={`question-${detail.questionId}`}
              >
                <div className="flex items-center justify-between mb-6">
                  <span
                    id={`question-${detail.questionId}`}
                    className="text-sm font-semibold text-gray-500"
                  >
                    문제 {index + 1}
                  </span>
                  <div
                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${
                      detail.isCorrect
                        ? "bg-green-100 text-green-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {detail.isCorrect ? "정답" : "오답"}
                  </div>
                </div>

                {detail.questionType === "vocabulary" && (
                  <VocabularyHistory
                    question={detail.questionText}
                    options={detail.options ?? []}
                    userAnswer={detail.userAnswer}
                    correctAnswer={detail.correctAnswer}
                    isCorrect={detail.isCorrect}
                  />
                )}

                {detail.questionType === "blank" && (
                  <BlankHistory
                    question={detail.questionText}
                    options={detail.options ?? []}
                    userAnswer={detail.userAnswer}
                    correctAnswer={detail.correctAnswer}
                    isCorrect={detail.isCorrect}
                  />
                )}

                {detail.questionType === "sentence" && (
                  <SentenceHistory
                    question={detail.questionText}
                    userAnswer={detail.userAnswer}
                    correctAnswer={detail.correctAnswer}
                    isCorrect={detail.isCorrect}
                  />
                )}

                {detail.questionType === "writing" && (
                  <WritingHistory
                    question={detail.questionText}
                    userAnswer={detail.userAnswer}
                    correctAnswer={detail.correctAnswer}
                    isCorrect={detail.isCorrect}
                  />
                )}

                {detail.questionType === "speaking" && (
                  <div>
                    <SpeakingHistory
                      question={detail.questionText}
                      userAnswer={detail.userAnswer}
                      correctAnswer={detail.correctAnswer}
                      isCorrect={detail.isCorrect}
                    />
                  </div>
                )}
              </section>
            )
          )}
        </div>
      </main>
    </div>
  );
};

export default HistoryTraining;
