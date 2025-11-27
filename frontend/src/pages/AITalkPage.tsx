// frontend/src/pages/AITalkPage.tsx
// cspell:ignore CEFR
import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import {
  Coffee,
  Briefcase,
  Plane,
  ShoppingBag,
  GraduationCap,
  Heart,
  MessageCircle,
  Sparkles,
  Plus,
  ChevronRight,
  Trash2,
  Edit3,
  Play,
  X,
  Pen,
  TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { aiTalkService } from "../services/aiTalkService";

/* 화면 표시용 데이터 타입 */
interface DisplayScenario {
  id: number;
  userId?: number | null;
  title: string;
  description: string;
  icon: React.ReactNode;
  bgClass: string; // 배경색 클래스 (예: bg-amber-100)
  textClass: string; // 텍스트/아이콘 색상 클래스 (예: text-amber-600)
  borderClass: string; // 테두리 색상 클래스 (예: border-amber-200)
  context?: string;
}

/* API 응답 데이터 타입 정의 */
interface ApiScenario {
  scenario_id: number;
  user_id: number | null;
  title: string;
  description: string;
  context?: string;
}

const AITalkPage: React.FC = () => {
  const navigate = useNavigate();

  const [officialScenarios, setOfficialScenarios] = useState<DisplayScenario[]>(
    []
  );
  const [customScenarios, setCustomScenarios] = useState<DisplayScenario[]>([]);
  const [modalScenario, setModalScenario] = useState<DisplayScenario | null>(
    null
  );

  const [confirmScenario, setConfirmScenario] =
    useState<DisplayScenario | null>(null);

  // 디자인 시스템에 맞춘 색상 스타일 매핑
  const getScenarioStyle = (title: string) => {
    if (title.includes("카페")) {
      return {
        icon: <Coffee className="w-5 h-5 sm:w-6 sm:h-6" />,
        bgClass: "bg-amber-100",
        textClass: "text-amber-600",
        borderClass: "border-amber-200",
      };
    }
    if (title.includes("면접")) {
      return {
        icon: <Briefcase className="w-5 h-5 sm:w-6 sm:h-6" />,
        bgClass: "bg-rose-100",
        textClass: "text-rose-600",
        borderClass: "border-rose-200",
      };
    }
    if (title.includes("여행")) {
      return {
        icon: <Plane className="w-5 h-5 sm:w-6 sm:h-6" />,
        bgClass: "bg-blue-100",
        textClass: "text-blue-600",
        borderClass: "border-blue-200",
      };
    }
    if (title.includes("쇼핑")) {
      return {
        icon: <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />,
        bgClass: "bg-pink-100",
        textClass: "text-pink-600",
        borderClass: "border-pink-200",
      };
    }
    if (title.includes("학교")) {
      return {
        icon: <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />,
        bgClass: "bg-indigo-100",
        textClass: "text-indigo-600",
        borderClass: "border-indigo-200",
      };
    }
    if (title.includes("데이트")) {
      return {
        icon: <Heart className="w-5 h-5 sm:w-6 sm:h-6" />,
        bgClass: "bg-red-100",
        textClass: "text-red-600",
        borderClass: "border-red-200",
      };
    }
    if (title.includes("스몰토크")) {
      return {
        icon: <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />,
        bgClass: "bg-orange-100",
        textClass: "text-orange-600",
        borderClass: "border-orange-200",
      };
    }
    return {
      icon: <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />,
      bgClass: "bg-fuchsia-100",
      textClass: "text-fuchsia-600",
      borderClass: "border-fuchsia-200",
    };
  };

  useEffect(() => {
    const fetchScenarios = async () => {
      try {
        const data = await aiTalkService.getScenarios();

        const official: DisplayScenario[] = [];
        const custom: DisplayScenario[] = [];

        data.forEach((item: ApiScenario) => {
          const style = getScenarioStyle(item.title);

          if (item.user_id === null) {
            const formatted: DisplayScenario = {
              id: item.scenario_id,
              userId: null,
              title: item.title,
              description: item.description,
              context: item.context,
              icon: style.icon,
              bgClass: style.bgClass,
              textClass: style.textClass,
              borderClass: style.borderClass,
            };
            official.push(formatted);
          } else {
            const formatted: DisplayScenario = {
              id: item.scenario_id,
              userId: item.user_id,
              title: item.title,
              description: item.description,
              context: item.context,
              icon: <Pen className="w-5 h-5 sm:w-6 sm:h-6" />,
              bgClass: "bg-cyan-100",
              textClass: "text-cyan-600",
              borderClass: "border-cyan-200",
            };
            custom.push(formatted);
          }
        });

        setOfficialScenarios(official);
        setCustomScenarios(custom);
      } catch (error) {
        console.error("시나리오 로딩 실패:", error);
      }
    };

    fetchScenarios();
  }, []);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    if (modalScenario || confirmScenario) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = prevOverflow || "";
    };
  }, [modalScenario, confirmScenario]);

  const handleCreateNavigate = () => navigate("/ai-talk/custom-scenario");

  const handleLevelTestNavigate = () => navigate("/ai-talk/level-test");

  const openModal = (s: DisplayScenario) => {
    setModalScenario(s);
  };

  const startConversation = (s: DisplayScenario) => {
    setModalScenario(null);
    navigate("/ai-talk/chat", { state: { scenarioId: s.id } });
  };

  const deleteScenario = async (id: number) => {
    try {
      await aiTalkService.deleteCustomScenario(id);
      setCustomScenarios((prev) => prev.filter((c) => c.id !== id));
      setConfirmScenario(null);
      setModalScenario(null);
    } catch (error) {
      console.error("삭제 실패:", error);
      setConfirmScenario(null);
    }
  };

  const saveEditParent = async (
    id: number,
    payload: { title: string; description: string; context: string }
  ) => {
    try {
      await aiTalkService.updateCustomScenario(id, payload);

      const style = getScenarioStyle(payload.title);
      const updated: DisplayScenario = {
        id,
        userId: null,
        title: payload.title,
        description: payload.description,
        context: payload.context,
        icon: style.icon,
        bgClass: style.bgClass,
        textClass: style.textClass,
        borderClass: style.borderClass,
      };

      setCustomScenarios((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updated } : c))
      );

      if (modalScenario && modalScenario.id === id) {
        setModalScenario((prev) => (prev ? { ...prev, ...payload } : prev));
      }
    } catch (error) {
      console.error("수정 실패:", error);
      throw error;
    }
  };

  /**
   * ModalCard Component
   */
  const ModalCard: React.FC<{
    scenario: DisplayScenario;
    onClose: () => void;
    onStartConversation: (s: DisplayScenario) => void;
    onRequestDelete: (s: DisplayScenario) => void;
    onSave: (
      id: number,
      payload: { title: string; description: string; context: string }
    ) => Promise<void>;
  }> = ({
    scenario,
    onClose,
    onStartConversation,
    onRequestDelete,
    onSave,
  }) => {
    const [localTitle, setLocalTitle] = useState<string>(scenario.title ?? "");
    const [localDescription, setLocalDescription] = useState<string>(
      scenario.description ?? ""
    );
    const [localContext, setLocalContext] = useState<string>(
      scenario.context ?? ""
    );
    const [localIsEditing, setLocalIsEditing] = useState<boolean>(false);

    const editingStartedRef = useRef<boolean>(false);

    const localTitleRef = useRef<HTMLInputElement | null>(null);
    const localDescRef = useRef<HTMLInputElement | null>(null);
    const localCtxRef = useRef<HTMLTextAreaElement | null>(null);

    useEffect(() => {
      setLocalTitle(scenario.title ?? "");
      setLocalDescription(scenario.description ?? "");
      setLocalContext(scenario.context ?? "");
      setLocalIsEditing(false);
      editingStartedRef.current = false;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scenario.id]);

    const startEditingLocal = () => {
      if (scenario.userId === null) return;
      setLocalIsEditing(true);
      setTimeout(() => {
        localTitleRef.current?.focus();
      }, 0);
    };

    const handleLocalSave = async () => {
      if (scenario.userId === null) return;
      const title = (localTitle ?? "").trim();
      if (!title) return;
      const description = (localDescription ?? "").trim();
      const context = (localContext ?? "").trim();

      try {
        await onSave(scenario.id, { title, description, context });
        setLocalIsEditing(false);
        editingStartedRef.current = false;
      } catch (err) {
        console.error(err);
      }
    };

    const handleInputStart = () => {
      if (!editingStartedRef.current) editingStartedRef.current = true;
    };

    const handleCancelLocal = () => {
      setLocalTitle(scenario.title ?? "");
      setLocalDescription(scenario.description ?? "");
      setLocalContext(scenario.context ?? "");
      setLocalIsEditing(false);
      editingStartedRef.current = false;
    };

    const handleDeleteRequest = () => {
      onRequestDelete(scenario);
    };

    const contextScrollStyle: React.CSSProperties = {
      maxHeight: "9rem",
      overflowY: "auto",
      whiteSpace: "pre-wrap",
      overflowWrap: "break-word",
      wordBreak: "break-word",
    };

    const modalContent = (
      <>
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
          style={{ zIndex: 9999 }}
        />

        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 flex items-center justify-center px-4 sm:px-6"
          style={{ zIndex: 10000 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-5 sm:p-6"
            style={{
              border: "1px solid rgba(0,0,0,0.06)",
              maxHeight: "80vh",
            }}
          >
            {localIsEditing ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg sm:text-xl text-gray-900">
                    시나리오 수정
                  </h3>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
                    type="button"
                    aria-label="닫기"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="w-full space-y-3">
                  <input
                    ref={localTitleRef}
                    value={localTitle}
                    onChange={(e) => {
                      handleInputStart();
                      setLocalTitle(e.target.value);
                    }}
                    name="title"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                    placeholder="시나리오 제목"
                  />

                  <input
                    ref={localDescRef}
                    value={localDescription}
                    onChange={(e) => {
                      handleInputStart();
                      setLocalDescription(e.target.value);
                    }}
                    name="description"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                    placeholder="간단한 설명"
                  />

                  <textarea
                    ref={localCtxRef}
                    value={localContext}
                    onChange={(e) => {
                      handleInputStart();
                      setLocalContext(e.target.value);
                    }}
                    name="context"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                    rows={6}
                    placeholder="시나리오 상세 컨텍스트"
                    style={{
                      lineHeight: 1.5,
                      height: "160px",
                      maxHeight: "320px",
                      overflowY: "auto",
                      whiteSpace: "pre-wrap",
                      overflowWrap: "break-word",
                      wordBreak: "break-word",
                    }}
                  />

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleLocalSave}
                      className="flex-1 bg-rose-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-rose-600 transition active:scale-[0.98]"
                      type="button"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => {
                        handleCancelLocal();
                      }}
                      className="flex-1 bg-white border border-gray-200 px-4 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition active:scale-[0.98]"
                      type="button"
                    >
                      취소
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-4 mb-6">
                  <div
                    className={`${scenario.bgClass} ${scenario.textClass} p-3 rounded-2xl shadow-sm shrink-0 border ${scenario.borderClass}`}
                  >
                    {scenario.icon}
                  </div>

                  <div className="min-w-0 flex-1 pt-1">
                    <div className="flex items-center gap-2 min-w-0 mb-1">
                      <h3 className="font-bold text-lg sm:text-xl text-gray-900 truncate">
                        {scenario.title}
                      </h3>
                    </div>

                    <p className="text-sm text-gray-500 leading-relaxed mb-3">
                      {scenario.description}
                    </p>

                    <div
                      className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 border border-gray-100"
                      style={contextScrollStyle}
                      aria-label="상황 설명"
                    >
                      <p style={{ margin: 0 }}>
                        {scenario.context || "상세 컨텍스트가 없습니다."}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 -mr-2 -mt-2"
                    type="button"
                    aria-label="닫기"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  {scenario.userId === null ? (
                    <button
                      onClick={() => onStartConversation(scenario)}
                      className="w-full flex items-center justify-between bg-rose-500 text-white px-5 py-4 rounded-2xl shadow-md hover:bg-rose-600 transition active:scale-[0.98]"
                      type="button"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-1.5 rounded-lg">
                          <Play className="w-5 h-5 fill-current" />
                        </div>
                        <span className="font-bold text-lg">대화 시작하기</span>
                      </div>
                      <ChevronRight className="w-5 h-5 opacity-80" />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => onStartConversation(scenario)}
                        className="w-full flex items-center justify-between bg-rose-500 text-white px-5 py-4 rounded-2xl shadow-md hover:bg-rose-600 transition active:scale-[0.98]"
                        type="button"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-white/20 p-1.5 rounded-lg">
                            <Play className="w-5 h-5 fill-current" />
                          </div>
                          <span className="font-bold text-lg">
                            대화 시작하기
                          </span>
                        </div>
                        <ChevronRight className="w-5 h-5 opacity-80" />
                      </button>

                      <div className="flex gap-3">
                        <button
                          onClick={startEditingLocal}
                          className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 px-4 py-3 rounded-xl shadow-sm hover:bg-gray-50 transition active:scale-[0.98] text-gray-700 font-medium"
                          type="button"
                        >
                          <Edit3 className="w-4 h-4" />
                          <span>수정</span>
                        </button>

                        <button
                          onClick={handleDeleteRequest}
                          className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 px-4 py-3 rounded-xl shadow-sm hover:bg-red-50 hover:border-red-100 hover:text-red-600 transition active:scale-[0.98] text-gray-700 font-medium"
                          type="button"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>삭제</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </>
    );

    return ReactDOM.createPortal(modalContent, document.body);
  };

  const ConfirmModal: React.FC<{
    scenario: DisplayScenario;
    onConfirm: (id: number) => Promise<void>;
    onCancel: () => void;
  }> = ({ scenario, onConfirm, onCancel }) => {
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
      setLoading(true);
      try {
        await onConfirm(scenario.id);
      } finally {
        setLoading(false);
      }
    };

    const content = (
      <>
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onCancel}
          aria-hidden="true"
          style={{ zIndex: 9999 }}
        />

        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 flex items-center justify-center px-4 sm:px-6"
          style={{ zIndex: 10000 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5 sm:p-6"
            style={{ border: "1px solid rgba(0,0,0,0.06)" }}
          >
            <div className="flex items-start gap-4">
              <div className="bg-red-100 text-red-600 p-3 rounded-full shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-lg text-gray-900">
                  시나리오 삭제
                </h3>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                  "{scenario.title}" 시나리오를 삭제하시겠습니까?
                  <br />
                  삭제된 내용은 복구할 수 없습니다.
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 bg-white border border-gray-200 px-4 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition active:scale-[0.98]"
                type="button"
                disabled={loading}
              >
                취소
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 bg-red-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-red-700 transition active:scale-[0.98] shadow-md shadow-red-200"
                type="button"
                disabled={loading}
              >
                {loading ? "삭제 중..." : "삭제하기"}
              </button>
            </div>
          </div>
        </div>
      </>
    );

    return ReactDOM.createPortal(content, document.body);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-gray-900">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* CEFR 레벨 테스트 배너 섹션 */}
        <section>
          <div
            onClick={handleLevelTestNavigate}
            className="w-full bg-linear-to-br from-violet-600 to-indigo-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex items-center justify-between relative overflow-hidden group"
            role="button"
            aria-label="CEFR 레벨 테스트 하러가기"
          >
            {/* 장식용 배경 원 */}
            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-48 h-48 bg-white opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity duration-500"></div>
            <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-32 h-32 bg-indigo-400 opacity-20 rounded-full blur-2xl"></div>

            <div className="relative z-10 flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md border border-white/10 shadow-sm">
                  AI LEVEL TEST
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black mb-2 leading-tight">
                내 영어 회화 레벨은?
              </h2>
              <p className="text-indigo-100 text-sm sm:text-base opacity-90 text-pretty leading-relaxed max-w-md">
                CEFR 기준으로 내 실력을 측정하고
                <br className="hidden sm:block" /> 맞춤형 학습 시나리오를
                추천받으세요.
              </p>
            </div>

            <div className="relative z-10 bg-white/20 p-4 rounded-full backdrop-blur-sm ml-4 group-hover:scale-110 transition-transform duration-300 shadow-inner border border-white/10">
              <TrendingUp className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
          </div>
        </section>

        <section>
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-2 text-gray-900 flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-rose-500" />
              대화 시나리오
            </h2>
            <p className="text-sm sm:text-base text-gray-500 text-pretty">
              상황에 맞는 시나리오를 선택하여 AI와 대화를 시작하세요
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {officialScenarios.map((s) => (
              <button
                key={s.id}
                onClick={() => openModal(s)}
                className="group relative bg-white rounded-2xl p-5 text-left cursor-pointer shadow-sm border border-gray-200 hover:shadow-md hover:border-rose-100 transition-all duration-300 hover:-translate-y-1 active:scale-[0.99]"
                type="button"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`${s.bgClass} ${s.textClass} p-3.5 rounded-2xl shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-300 border ${s.borderClass}`}
                  >
                    {s.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-base sm:text-lg text-gray-900 truncate group-hover:text-rose-600 transition-colors">
                        {s.title}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-500 truncate whitespace-nowrap overflow-hidden">
                      {s.description}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-rose-500 group-hover:translate-x-1 transition-all mt-1" />
                </div>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2 text-gray-900 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-amber-500" />
                나만의 시나리오
              </h2>
              <p className="text-sm sm:text-base text-gray-500 text-pretty">
                원하는 상황을 직접 만들어 연습하세요
              </p>
            </div>
            <button
              onClick={handleCreateNavigate}
              className="flex items-center bg-rose-500 text-white px-4 py-2.5 rounded-xl shadow-md hover:bg-rose-600 transition-all active:scale-[0.98] font-bold text-sm"
              type="button"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">시나리오 만들기</span>
              <span className="sm:hidden">만들기</span>
            </button>
          </div>

          {customScenarios.length === 0 ? (
            <div className="border-2 border-gray-200 border-dashed rounded-3xl p-10 sm:p-16 text-center bg-white/50">
              <div className="bg-rose-50 w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-100 shadow-sm">
                <Pen className="w-10 h-10 sm:w-12 sm:h-12 text-rose-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 text-gray-900">
                아직 만든 시나리오가 없어요
              </h3>
              <p className="text-sm sm:text-base text-gray-500 mb-8 max-w-md mx-auto text-pretty leading-relaxed">
                내가 연습하고 싶은 상황이 있다면 직접 만들어보세요.
                <br />
                AI가 그 상황에 맞춰 대화해드립니다.
              </p>
              <button
                onClick={handleCreateNavigate}
                className="inline-flex items-center bg-white border border-gray-200 px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm"
              >
                첫 시나리오 만들기
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {customScenarios.map((s) => (
                <div
                  key={s.id}
                  className="group relative bg-white rounded-2xl p-5 cursor-pointer shadow-sm border border-gray-200 hover:shadow-md hover:border-rose-100 transition-all duration-300 hover:-translate-y-1 active:scale-[0.99]"
                  onClick={() => openModal(s)}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`${s.bgClass} ${s.textClass} p-3.5 rounded-2xl shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-300 border ${s.borderClass}`}
                    >
                      {s.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-base sm:text-lg text-gray-900 truncate group-hover:text-rose-600 transition-colors">
                          {s.title}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2 text-pretty leading-relaxed">
                        {s.description}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-rose-500 group-hover:translate-x-1 transition-all mt-1" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {confirmScenario ? (
        <ConfirmModal
          scenario={confirmScenario}
          onConfirm={async (id) => {
            await deleteScenario(id);
          }}
          onCancel={() => {
            setConfirmScenario(null);
          }}
        />
      ) : (
        modalScenario && (
          <ModalCard
            key={modalScenario.id}
            scenario={modalScenario}
            onClose={() => setModalScenario(null)}
            onStartConversation={startConversation}
            onRequestDelete={(s) => {
              setConfirmScenario(s);
            }}
            onSave={async (id, payload) => {
              await saveEditParent(id, payload);
              setModalScenario((prev) =>
                prev ? { ...prev, ...payload } : prev
              );
            }}
          />
        )
      )}
    </div>
  );
};

export default AITalkPage;
