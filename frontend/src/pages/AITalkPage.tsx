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

interface DisplayScenario {
  id: number;
  userId?: number | null;
  title: string;
  description: string;
  icon: React.ReactNode;
  textClass: string;
  context?: string;
}

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

  const getScenarioStyle = (title: string) => {
    if (title.includes("카페")) {
      return {
        icon: <Coffee className="w-5 h-5 sm:w-6 sm:h-6" />,
        textClass: "text-amber-600",
      };
    }
    if (title.includes("면접")) {
      return {
        icon: <Briefcase className="w-5 h-5 sm:w-6 sm:h-6" />,
        textClass: "text-rose-600",
      };
    }
    if (title.includes("여행")) {
      return {
        icon: <Plane className="w-5 h-5 sm:w-6 sm:h-6" />,
        textClass: "text-blue-600",
      };
    }
    if (title.includes("쇼핑")) {
      return {
        icon: <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />,
        textClass: "text-pink-600",
      };
    }
    if (title.includes("학교")) {
      return {
        icon: <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />,
        textClass: "text-indigo-600",
      };
    }
    if (title.includes("데이트")) {
      return {
        icon: <Heart className="w-5 h-5 sm:w-6 sm:h-6" />,
        textClass: "text-red-600",
      };
    }
    if (title.includes("스몰토크")) {
      return {
        icon: <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />,
        textClass: "text-orange-600",
      };
    }
    return {
      icon: <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />,
      textClass: "text-fuchsia-600",
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
            official.push({
              id: item.scenario_id,
              userId: null,
              title: item.title,
              description: item.description,
              context: item.context,
              icon: style.icon,
              textClass: style.textClass,
            });
          } else {
            custom.push({
              id: item.scenario_id,
              userId: item.user_id,
              title: item.title,
              description: item.description,
              context: item.context,
              icon: <Pen className="w-5 h-5 sm:w-6 sm:h-6" />,
              textClass: "text-cyan-600",
            });
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
  const openModal = (s: DisplayScenario) => setModalScenario(s);
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
        textClass: style.textClass,
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

    useEffect(() => {
      setLocalTitle(scenario.title ?? "");
      setLocalDescription(scenario.description ?? "");
      setLocalContext(scenario.context ?? "");
      setLocalIsEditing(false);
      editingStartedRef.current = false;
    }, [scenario]);

    const handleLocalSave = async () => {
      const title = (localTitle ?? "").trim();
      if (!title) return;
      try {
        await onSave(scenario.id, {
          title,
          description: localDescription,
          context: localContext,
        });
        setLocalIsEditing(false);
      } catch (err) {
        console.error(err);
      }
    };

    return ReactDOM.createPortal(
      <>
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          // backdrop-blur-[1.1px]"
          onClick={onClose}
          style={{ zIndex: 9999 }}
        />
        <div
          className="fixed inset-0 flex items-center justify-center px-4 sm:px-6"
          style={{ zIndex: 10000 }}
        >
          <div
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-5 sm:p-6"
            style={{ maxHeight: "80vh", overflowY: "auto" }}
          >
            {localIsEditing ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg">수정하기</h3>
                  <button onClick={onClose}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <input
                  ref={localTitleRef}
                  value={localTitle}
                  onChange={(e) => setLocalTitle(e.target.value)}
                  className="w-full border p-3 rounded-xl"
                  placeholder="제목"
                />
                <input
                  value={localDescription}
                  onChange={(e) => setLocalDescription(e.target.value)}
                  className="w-full border p-3 rounded-xl"
                  placeholder="설명"
                />
                <textarea
                  value={localContext}
                  onChange={(e) => setLocalContext(e.target.value)}
                  className="w-full border p-3 rounded-xl h-32"
                  placeholder="컨텍스트"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleLocalSave}
                    className="flex-1 bg-rose-500 text-white p-3 rounded-xl font-bold"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => setLocalIsEditing(false)}
                    className="flex-1 border p-3 rounded-xl"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`bg-gray-50 ${scenario.textClass} w-12 h-12 flex items-center justify-center rounded-2xl shadow-sm shrink-0 border border-gray-100`}
                    >
                      {scenario.icon}
                    </div>

                    {/* Content column: title, subtitle (description), context
                        All three start at the same horizontal position (aligned with title) */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-bold text-lg sm:text-xl text-gray-900 truncate">
                          {scenario.title}
                        </h3>
                        <button
                          onClick={onClose}
                          className="text-gray-400 -mr-2"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <p className="text-sm text-gray-500 mt-2">
                        {scenario.description}
                      </p>

                      <div className="mt-3 bg-gray-50 rounded-xl p-3 text-sm text-gray-600 border border-gray-100 max-h-36 overflow-y-auto">
                        {scenario.context || "상세 컨텍스트가 없습니다."}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => onStartConversation(scenario)}
                    className="w-full flex items-center justify-between bg-rose-500 text-white px-4 py-3 rounded-2xl shadow-md hover:bg-rose-600 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-white/20 p-1.5 rounded-lg">
                        <Play className="w-5 h-5 fill-current" />
                      </div>
                      <span className="font-bold text-lg">대화 시작하기</span>
                    </div>
                    <ChevronRight className="w-5 h-5 opacity-80" />
                  </button>
                  {scenario.userId !== null && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => setLocalIsEditing(true)}
                        className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 px-4 py-3 rounded-xl shadow-sm hover:bg-gray-50"
                      >
                        <Edit3 className="w-4 h-4" /> <span>수정</span>
                      </button>
                      <button
                        onClick={() => onRequestDelete(scenario)}
                        className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 px-4 py-3 rounded-xl shadow-sm hover:bg-red-50 text-red-600"
                      >
                        <Trash2 className="w-4 h-4" /> <span>삭제</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </>,
      document.body
    );
  };

  const ConfirmModal: React.FC<{
    scenario: DisplayScenario;
    onConfirm: (id: number) => Promise<void>;
    onCancel: () => void;
  }> = ({ scenario, onConfirm, onCancel }) => {
    const [loading, setLoading] = useState(false);
    return ReactDOM.createPortal(
      <>
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onCancel}
          style={{ zIndex: 9999 }}
        />
        <div
          className="fixed inset-0 flex items-center justify-center px-4"
          style={{ zIndex: 10000 }}
        >
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold mb-2">시나리오 삭제</h3>
            <p className="text-gray-600 mb-6">
              "{scenario.title}"을(를) 삭제하시겠습니까?
            </p>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 border p-3 rounded-xl"
              >
                취소
              </button>
              <button
                onClick={async () => {
                  setLoading(true);
                  await onConfirm(scenario.id);
                  setLoading(false);
                }}
                className="flex-1 bg-red-600 text-white p-3 rounded-xl"
              >
                {loading ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      </>,
      document.body
    );
  };

  // [수정됨] pb-16 / md:pb-0
  return (
    <div className="min-h-screen bg-slate-50 pb-16 md:pb-0 text-gray-900">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        <section>
          <div
            onClick={handleLevelTestNavigate}
            className="w-full bg-linear-to-br from-violet-600 to-indigo-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex items-center justify-between relative overflow-hidden group"
          >
            <div className="relative z-10 flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold border border-white/10">
                  AI LEVEL TEST
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black mb-2">
                내 영어 회화 레벨은?
              </h2>
              <p className="text-indigo-100 opacity-90">
                CEFR 기준으로 내 실력을 측정하세요.
              </p>
            </div>
            <div className="relative z-10 bg-white/20 p-4 rounded-full border border-white/10">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
          </div>
        </section>

        <section>
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-2 text-gray-900 flex items-center gap-2">
              대화 시나리오
            </h2>
            <p className="text-sm sm:text-base text-gray-500">
              상황에 맞는 시나리오를 선택하여 AI와 대화를 시작하세요
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {officialScenarios.map((s) => (
              <button
                key={s.id}
                onClick={() => openModal(s)}
                className="group relative bg-white rounded-2xl p-4 sm:p-5 text-left cursor-pointer shadow-sm border border-gray-200 hover:shadow-md hover:border-rose-100 transition-all duration-300 hover:-translate-y-1 active:scale-[0.99]"
              >
                <div className="flex items-center gap-4">
                  {/* [Modified]: Added shadow-sm for consistency */}
                  <div
                    className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center bg-gray-50 border border-gray-100 shadow-sm ${s.textClass} transition-transform duration-300 group-hover:scale-110`}
                  >
                    {s.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base sm:text-lg text-gray-900 truncate group-hover:text-rose-600 transition-colors">
                      {s.title}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">
                      {s.description}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-rose-500" />
                </div>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2 text-gray-900 flex items-center gap-2">
                나만의 시나리오
              </h2>
              <p className="text-sm sm:text-base text-gray-500">
                원하는 상황을 직접 만들어 연습하세요
              </p>
            </div>
            <button
              onClick={handleCreateNavigate}
              className="flex items-center bg-rose-500 text-white px-4 py-2.5 rounded-xl shadow-md hover:bg-rose-600 transition-all active:scale-[0.98] font-bold text-sm"
            >
              <Plus className="w-4 h-4 mr-1.5" /> 만들기
            </button>
          </div>

          {customScenarios.length === 0 ? (
            <div className="border-2 border-gray-200 border-dashed rounded-3xl p-10 text-center bg-white/50">
              <div className="bg-rose-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-100">
                <Pen className="w-10 h-10 text-rose-400" />
              </div>
              <h3 className="text-lg font-bold mb-2">
                아직 만든 시나리오가 없어요
              </h3>
              <p className="text-gray-500 mb-6">
                내가 연습하고 싶은 상황이 있다면 직접 만들어보세요.
              </p>
              <button
                onClick={handleCreateNavigate}
                className="bg-white border px-5 py-2.5 rounded-xl font-bold text-gray-600"
              >
                첫 시나리오 만들기
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {customScenarios.map((s) => (
                <div
                  key={s.id}
                  onClick={() => openModal(s)}
                  className="group relative bg-white rounded-2xl p-4 sm:p-5 cursor-pointer shadow-sm border border-gray-200 hover:shadow-md hover:border-rose-100 transition-all duration-300 hover:-translate-y-1 active:scale-[0.99]"
                >
                  <div className="flex items-center gap-4">
                    {/* [Modified]: Added shadow-sm for consistency */}
                    <div
                      className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center bg-gray-50 border border-gray-100 shadow-sm ${s.textClass} transition-transform duration-300 group-hover:scale-110`}
                    >
                      {s.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base sm:text-lg text-gray-900 truncate group-hover:text-rose-600 transition-colors">
                        {s.title}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">
                        {s.description}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-rose-500" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      {confirmScenario && (
        <ConfirmModal
          scenario={confirmScenario}
          onConfirm={async (id) => {
            await deleteScenario(id);
          }}
          onCancel={() => setConfirmScenario(null)}
        />
      )}
      {modalScenario && !confirmScenario && (
        <ModalCard
          scenario={modalScenario}
          onClose={() => setModalScenario(null)}
          onStartConversation={startConversation}
          onRequestDelete={(s) => setConfirmScenario(s)}
          onSave={async (id, payload) => {
            await saveEditParent(id, payload);
            setModalScenario((prev) => (prev ? { ...prev, ...payload } : prev));
          }}
        />
      )}
    </div>
  );
};

export default AITalkPage;
