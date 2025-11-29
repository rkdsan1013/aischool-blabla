// src/pages/AITalkCustomScenario.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ChevronLeft,
  Pencil,
  FileText,
  MessageSquare,
  Info,
} from "lucide-react";
// 외부 서비스 임포트
import { aiTalkService } from "../services/aiTalkService";
import type { AIScenario } from "../services/aiTalkService";

interface CustomScenario {
  id: string;
  title: string;
  description: string;
  context: string;
}

function getEditIdFromSearch(search: string) {
  try {
    const qp = new URLSearchParams(search);
    return qp.get("edit");
  } catch {
    return null;
  }
}

function parseError(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error && err.message) return err.message;

  if (typeof err === "object" && err !== null) {
    const e = err as Record<string, unknown>;

    if (typeof e.message === "string") return e.message;
    if (typeof e.statusText === "string") return e.statusText;

    const response = e.response;
    if (typeof response === "object" && response !== null) {
      const r = response as Record<string, unknown>;
      const data = r.data;
      if (typeof data === "object" && data !== null) {
        const d = data as Record<string, unknown>;
        if (typeof d.message === "string") return d.message;
        if (Array.isArray(d.errors) && d.errors.length > 0) {
          const first = d.errors[0];
          if (typeof first === "object" && first !== null) {
            const f = first as Record<string, unknown>;
            if (typeof f.message === "string") return f.message;
          }
        }
      }
    }
  }

  return "저장 중 오류가 발생했습니다";
}

const AITalkCustomScenario: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [editId, setEditId] = useState<string | null>(() =>
    getEditIdFromSearch(location.search)
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setEditId(getEditIdFromSearch(location.search));
  }, [location.search]);

  useEffect(() => {
    if (!editId) {
      setTitle("");
      setDescription("");
      setContext("");
      return;
    }

    try {
      const saved = localStorage.getItem("customScenarios");
      if (!saved) return;
      const arr: CustomScenario[] = JSON.parse(saved);
      const found = arr.find((s) => s.id === editId);
      if (found) {
        setTitle(found.title ?? "");
        setDescription(found.description ?? "");
        setContext(found.context ?? "");
      }
    } catch {
      // parse error 무시
    }
  }, [editId]);

  const adjustTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [adjustTextareaHeight, context]);

  const handleContextChange = useCallback(
    (value: string) => {
      setContext(value);
      requestAnimationFrame(adjustTextareaHeight);
    },
    [adjustTextareaHeight]
  );

  const persistLocal = (scenarios: CustomScenario[]) => {
    try {
      localStorage.setItem("customScenarios", JSON.stringify(scenarios));
    } catch {
      // ignore
    }
  };

  const handleSave = async () => {
    setError(null);
    if (!title.trim() || !description.trim() || !context.trim()) {
      setError("모든 필드를 입력해주세요");
      return;
    }

    setLoading(true);
    const payload: { title: string; description: string; context: string } = {
      title: title.trim(),
      description: description.trim(),
      context: context.trim(),
    };

    try {
      // editId가 존재하지만 숫자가 아닌 경우(로컬 전용 id) -> 로컬만 업데이트
      if (editId && Number.isNaN(Number(editId))) {
        let scenarios: CustomScenario[] = [];
        try {
          const saved = localStorage.getItem("customScenarios");
          scenarios = saved ? JSON.parse(saved) : [];
        } catch {
          scenarios = [];
        }

        const idx = scenarios.findIndex((s) => s.id === editId);
        const newEntry: CustomScenario = {
          id: editId,
          title: payload.title,
          description: payload.description,
          context: payload.context,
        };
        if (idx !== -1) scenarios[idx] = newEntry;
        else scenarios.push(newEntry);
        persistLocal(scenarios);
        navigate("/ai-talk");
        return;
      }

      let savedScenario: AIScenario;

      if (editId) {
        const scenarioIdNum = Number(editId);
        if (Number.isNaN(scenarioIdNum)) {
          throw new Error("유효하지 않은 시나리오 ID입니다");
        }
        savedScenario = await aiTalkService.updateCustomScenario(
          scenarioIdNum,
          payload
        );
      } else {
        savedScenario = await aiTalkService.createCustomScenario(payload);
      }

      const savedId = String(savedScenario.scenario_id);

      // [Logic Restored]: scenarios와 persistLocal 사용
      let scenarios: CustomScenario[] = [];
      try {
        const saved = localStorage.getItem("customScenarios");
        scenarios = saved ? JSON.parse(saved) : [];
      } catch {
        scenarios = [];
      }

      const idx = scenarios.findIndex((s) => s.id === savedId);
      const newEntry: CustomScenario = {
        id: savedId,
        title: savedScenario.title,
        description: savedScenario.description,
        context: savedScenario.context,
      };
      if (idx !== -1) scenarios[idx] = newEntry;
      else scenarios.push(newEntry);

      persistLocal(scenarios);

      navigate("/ai-talk");
    } catch (err: unknown) {
      console.error("save error:", err);
      setError(parseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/ai-talk");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
              aria-label="뒤로 가기"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">
              {editId ? "시나리오 수정" : "시나리오 만들기"}
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl text-sm font-medium animate-fade-in">
            {error}
          </div>
        )}

        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          {/* Card: Basic Info */}
          <section className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-rose-500" />
                기본 정보
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                AI와 대화할 주제를 설정해주세요.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-bold text-gray-700 mb-1.5 ml-1"
                >
                  시나리오 제목 <span className="text-rose-500">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 병원에서 진료 받기"
                  className="w-full rounded-2xl bg-gray-50 border border-gray-200 px-4 py-3.5 text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  disabled={loading}
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-bold text-gray-700 mb-1.5 ml-1"
                >
                  간단한 설명 <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <FileText className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                  <input
                    id="description"
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="예: 증상을 설명하고 진료를 받는 상황"
                    className="w-full rounded-2xl bg-gray-50 border border-gray-200 pl-11 pr-4 py-3.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Card: Context */}
          <section className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-500" />
                상황 설정
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                AI에게 부여할 역할과 상황을 구체적으로 알려주세요.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="context"
                  className="block text-sm font-bold text-gray-700 mb-1.5 ml-1"
                >
                  상황 설명 <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="context"
                  ref={textareaRef}
                  value={context}
                  onChange={(e) => handleContextChange(e.target.value)}
                  placeholder={
                    "AI가 어떤 역할을 하고, 어떤 상황인지 자세히 설명해주세요.\n\n예시:\n당신은 병원 접수처 직원입니다. 환자가 처음 방문했고, 증상을 듣고 적절한 진료과를 안내해주세요. 친절하고 전문적인 태도로 대화하며, 필요한 서류나 절차에 대해서도 안내해주세요."
                  }
                  rows={6}
                  className="w-full rounded-2xl bg-gray-50 border border-gray-200 p-4 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all resize-none leading-relaxed"
                  onInput={adjustTextareaHeight}
                  disabled={loading}
                />
              </div>

              {/* Tip Box */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3 text-sm text-blue-700">
                <Info className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Tip:</strong> AI의 역할, 말투, 대화의 목적, 사용자의
                  레벨 등을 구체적으로 작성할수록 더 자연스럽고 유용한 대화
                  연습이 가능합니다.
                </p>
              </div>
            </div>
          </section>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="w-full rounded-2xl bg-rose-500 text-white px-6 py-4 text-base font-bold shadow-md shadow-rose-200 hover:bg-rose-600 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  저장 중...
                </>
              ) : editId ? (
                "수정 완료"
              ) : (
                "시나리오 저장"
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default AITalkCustomScenario;
