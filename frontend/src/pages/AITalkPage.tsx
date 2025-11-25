// frontend/src/pages/AITalkPage.tsx
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
  colorClass: string;
  colorHex: string;
  context?: string;
}

/* API 응답 데이터 타입 정의 (any 대체용) */
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

  // 불필요한 ref 제거됨 (titleRef, descRef, ctxRef)

  const getScenarioStyle = (title: string) => {
    if (title.includes("카페")) {
      return {
        icon: <Coffee className="w-5 h-5 sm:w-6 sm:h-6" />,
        colorClass: "bg-amber-500",
        colorHex: "#f59e0b",
      };
    }
    if (title.includes("면접")) {
      return {
        icon: <Briefcase className="w-5 h-5 sm:w-6 sm:h-6" />,
        colorClass: "bg-rose-500",
        colorHex: "#fb7185",
      };
    }
    if (title.includes("여행")) {
      return {
        icon: <Plane className="w-5 h-5 sm:w-6 sm:h-6" />,
        colorClass: "bg-blue-500",
        colorHex: "#3b82f6",
      };
    }
    if (title.includes("쇼핑")) {
      return {
        icon: <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />,
        colorClass: "bg-pink-500",
        colorHex: "#ec4899",
      };
    }
    if (title.includes("학교")) {
      return {
        icon: <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />,
        colorClass: "bg-indigo-500",
        colorHex: "#6366f1",
      };
    }
    if (title.includes("데이트")) {
      return {
        icon: <Heart className="w-5 h-5 sm:w-6 sm:h-6" />,
        colorClass: "bg-red-500",
        colorHex: "#ef4444",
      };
    }
    if (title.includes("스몰토크")) {
      return {
        icon: <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />,
        colorClass: "bg-orange-500",
        colorHex: "#f97316",
      };
    }
    return {
      icon: <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />,
      colorClass: "bg-gradient-to-br from-rose-500 to-pink-500",
      colorHex: "#fb7185",
    };
  };

  useEffect(() => {
    const fetchScenarios = async () => {
      try {
        const data = await aiTalkService.getScenarios();

        const official: DisplayScenario[] = [];
        const custom: DisplayScenario[] = [];

        // any 타입 제거 및 ApiScenario 인터페이스 적용
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
              colorClass: style.colorClass,
              colorHex: style.colorHex,
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
              colorClass:
                "bg-gradient-to-br from-cyan-400 via-fuchsia-500 to-amber-400",
              colorHex: "#06b6d4",
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

  // 불필요한 handleScenarioClick 제거됨

  const handleCreateNavigate = () => navigate("/ai-talk/custom-scenario");

  const openModal = (s: DisplayScenario) => {
    setModalScenario(s);
  };

  // 불필요한 closeModal 제거됨 (인라인 함수로 대체되어 사용 중이거나 불필요)

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
        colorClass: style.colorClass,
        colorHex: style.colorHex,
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
   * ModalCard
   * - 읽기 모드: 상황 설명 컨테이너만 스크롤 가능(모달은 스크롤 없음)
   * - 편집 모드: 초기 작성 내용(제목/설명/컨텍스트) 모두 숨기고 인풋 컨테이너만 표시
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

    // 읽기 모드에서만 사용되는 상황 설명 컨테이너 스타일
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
          className="fixed inset-0 bg-black/40"
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
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-4 sm:p-5"
            style={{
              border: "1px solid rgba(0,0,0,0.06)",
              // 모달 자체는 스크롤 없음
              maxHeight: "80vh",
            }}
          >
            {localIsEditing ? (
              // 편집 모드: 초기 내용 모두 숨기고 인풋 컨테이너만 표시
              <>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-base sm:text-lg text-foreground">
                    시나리오 수정
                  </h3>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-md hover:bg-gray-100"
                    type="button"
                    aria-label="닫기"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="w-full bg-white rounded-xl p-3 space-y-3">
                  <input
                    ref={localTitleRef}
                    value={localTitle}
                    onChange={(e) => {
                      handleInputStart();
                      setLocalTitle(e.target.value);
                    }}
                    name="title"
                    className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-foreground"
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
                    className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm"
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
                    className="w-full bg-white border border-gray-200 rounded-md p-3 text-sm resize-none"
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

                  <div className="flex gap-2">
                    <button
                      onClick={handleLocalSave}
                      className="flex-1 bg-rose-500 text-white px-3 py-2 rounded-lg"
                      type="button"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => {
                        handleCancelLocal();
                      }}
                      className="flex-1 bg-white border px-3 py-2 rounded-lg"
                      type="button"
                    >
                      취소
                    </button>
                  </div>
                </div>
              </>
            ) : (
              // 읽기 모드: 헤더 + 상황 설명(컨테이너 스크롤) + 액션들
              <>
                <div className="flex items-start gap-3">
                  <div
                    className={`${scenario.colorClass} text-white p-2.5 rounded-xl shadow-md shrink-0`}
                    style={{ border: `1px solid ${scenario.colorHex}` }}
                  >
                    {scenario.icon}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div>
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className="font-semibold text-base sm:text-lg text-foreground truncate">
                          {scenario.title}
                        </h3>
                      </div>

                      <div className="mt-1">
                        <p className="text-sm text-muted-foreground truncate">
                          {scenario.description}
                        </p>

                        <div
                          className="text-sm text-muted-foreground mt-3"
                          style={contextScrollStyle}
                          aria-label="상황 설명"
                        >
                          <p style={{ margin: 0 }}>
                            {scenario.context || "상세 컨텍스트가 없습니다."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={onClose}
                    className="ml-auto p-2 rounded-md hover:bg-gray-100"
                    type="button"
                    aria-label="닫기"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mt-4">
                  {scenario.userId === null ? (
                    <div className="grid gap-2">
                      <button
                        onClick={() => onStartConversation(scenario)}
                        className="w-full flex items-center justify-between bg-rose-500 text-white px-4 py-2 rounded-xl shadow-md hover:bg-rose-600 transition"
                        type="button"
                      >
                        <div className="flex items-center gap-3">
                          <Play className="w-5 h-5" />
                          <span className="font-medium">대화 시작</span>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-70" />
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      <button
                        onClick={() => onStartConversation(scenario)}
                        className="w-full flex items-center justify-between bg-rose-500 text-white px-4 py-2 rounded-xl shadow-md hover:bg-rose-600 transition"
                        type="button"
                      >
                        <div className="flex items-center gap-3">
                          <Play className="w-5 h-5" />
                          <span className="font-medium">대화 시작</span>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-70" />
                      </button>

                      <button
                        onClick={startEditingLocal}
                        className="w-full flex items-center justify-between bg-white border px-4 py-2 rounded-xl shadow-sm hover:bg-gray-50 transition"
                        type="button"
                      >
                        <div className="flex items-center gap-3">
                          <Edit3 className="w-5 h-5" />
                          <span className="font-medium">수정</span>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-50" />
                      </button>

                      <button
                        onClick={handleDeleteRequest}
                        className="w-full flex items-center justify-between bg-white border px-4 py-2 rounded-xl shadow-sm hover:bg-gray-50 transition text-red-600"
                        type="button"
                      >
                        <div className="flex items-center gap-3">
                          <Trash2 className="w-5 h-5" />
                          <span className="font-medium">삭제</span>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-50" />
                      </button>
                    </div>
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
          className="fixed inset-0 bg-black/40"
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
            className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-4 sm:p-5"
            style={{ border: "1px solid rgba(0,0,0,0.06)" }}
          >
            <div className="flex items-start gap-3">
              <div
                className="bg-red-100 text-red-600 p-2.5 rounded-xl shrink-0"
                style={{ border: "1px solid rgba(220,38,38,0.08)" }}
              >
                <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-base sm:text-lg text-foreground">
                  삭제 하시겠습니까?
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  선택한 시나리오 "{scenario.title}" 을(를) 삭제하시겠습니까?
                </p>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={handleConfirm}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-xl"
                type="button"
                disabled={loading}
              >
                {loading ? "삭제 중..." : "예"}
              </button>
              <button
                onClick={onCancel}
                className="flex-1 bg-white border px-4 py-2 rounded-xl"
                type="button"
                disabled={loading}
              >
                아니오
              </button>
            </div>
          </div>
        </div>
      </>
    );

    return ReactDOM.createPortal(content, document.body);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <section className="mb-8 sm:mb-12">
          <div className="mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">
              대화 시나리오
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground text-pretty">
              상황에 맞는 시나리오를 선택하여 AI와 대화를 시작하세요
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {officialScenarios.map((s) => (
              <button
                key={s.id}
                onClick={() => openModal(s)}
                className="border-2 border-gray-200 group relative bg-card rounded-2xl p-4 sm:p-5 text-left cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                type="button"
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div
                    className={`${s.colorClass} text-white p-2.5 sm:p-3 rounded-xl shrink-0 shadow-md group-hover:scale-110 transition-transform duration-300`}
                    style={{ border: `1px solid ${s.colorHex}` }}
                  >
                    {s.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                      <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">
                        {s.title}
                      </h3>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate whitespace-nowrap overflow-hidden">
                      {s.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h2 className="text-xl sm:2xl font-bold mb-1 sm:mb-2">
                나만의 시나리오
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground text-pretty">
                원하는 상황을 직접 만들어 연습하세요
              </p>
            </div>
            <button
              onClick={handleCreateNavigate}
              className="flex items-center bg-rose-500 text-white px-3 py-2 rounded-xl shadow-md hover:bg-rose-600 transition-all"
              type="button"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">시나리오 만들기</span>
              <span className="sm:hidden">만들기</span>
            </button>
          </div>

          {customScenarios.length === 0 ? (
            <div className="border-3 border-gray-200 border-dashed rounded-2xl p-8 sm:p-12 text-center bg-card">
              <div className="bg-linear-to-br from-rose-100 to-pink-100 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-rose-500" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold mb-2 text-foreground">
                아직 만든 시나리오가 없어요
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6 max-w-md mx-auto text-pretty">
                나만의 대화 상황을 만들어 더욱 효과적으로 학습해보세요
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {customScenarios.map((s) => (
                <div
                  key={s.id}
                  className="group relative bg-card rounded-2xl p-4 sm:p-5 cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-gray-200"
                  onClick={() => openModal(s)}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div
                      className={`${s.colorClass} text-white p-2.5 sm:p-3 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300 shrink-0`}
                      style={{ border: `1px solid ${s.colorHex}` }}
                    >
                      {s.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                        <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">
                          {s.title}
                        </h3>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 text-pretty">
                        {s.description}
                      </p>
                    </div>
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
