// frontend/src/pages/VoiceRoomCreate.tsx
// cspell:ignore voiceroom
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, AlignLeft, Users, BarChart3, ChevronLeft } from "lucide-react";
import VoiceRoomService from "../services/voiceroomService";
import { useAuth } from "../hooks/useAuth";

// 레벨 타입 정의
type VoiceRoomLevel = "ANY" | "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

type FormState = {
  name: string;
  description: string;
  maxParticipants: string;
  level: VoiceRoomLevel;
};

// API 에러 응답 타입 정의
interface ApiErrorResponse {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

const VoiceRoomCreate: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthLoading } = useAuth();

  const [formData, setFormData] = useState<FormState>({
    name: "",
    description: "",
    maxParticipants: "8", // 기본값 8
    level: "ANY",
  });

  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (submitting) return;

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      level: formData.level,
      max_participants: Number(formData.maxParticipants),
    };

    try {
      VoiceRoomService.validateCreatePayload(payload);
      setSubmitting(true);
      const created = await VoiceRoomService.createRoom(payload);
      navigate(`/voiceroom/${created.room_id}`);
    } catch (err: unknown) {
      console.error("방 생성 실패:", err);
      let message = "방 생성 중 오류가 발생했습니다.";
      const apiError = err as ApiErrorResponse;
      if (apiError.response?.data?.message) {
        message = apiError.response.data.message;
      } else if (apiError.message) {
        message = apiError.message;
      } else if (err instanceof Error) {
        message = err.message;
      }
      alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate("/voiceroom");
  };

  const levelOptions: { value: VoiceRoomLevel; label: string; desc: string }[] =
    [
      { value: "ANY", label: "Any", desc: "누구나" },
      { value: "A1", label: "A1", desc: "입문" },
      { value: "A2", label: "A2", desc: "초급" },
      { value: "B1", label: "B1", desc: "중급" },
      { value: "B2", label: "B2", desc: "중상급" },
      { value: "C1", label: "C1", desc: "고급" },
      { value: "C2", label: "C2", desc: "원어민" },
    ];

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
              aria-label="뒤로 가기"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">
              새로운 방 만들기
            </h1>
          </div>
          {/* 우측 X 버튼 제거됨 */}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card: Basic Info */}
          <section className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Mic className="w-5 h-5 text-rose-500" />
                기본 정보
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                방의 주제와 설명을 입력해주세요.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-bold text-gray-700 mb-1.5 ml-1"
                >
                  방 이름
                </label>
                <div className="relative">
                  <input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="예: 초보자 프리토킹 환영합니다"
                    required
                    className="w-full rounded-2xl bg-gray-50 border border-gray-200 px-4 py-3.5 text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-bold text-gray-700 mb-1.5 ml-1"
                >
                  방 설명
                </label>
                <div className="relative">
                  <AlignLeft className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="어떤 대화를 나누고 싶으신가요?"
                    required
                    rows={3}
                    className="w-full rounded-2xl bg-gray-50 border border-gray-200 pl-11 pr-4 py-3.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all resize-none"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Card: Settings */}
          <section className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" />
                참여 설정
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                인원 제한과 난이도를 설정하세요.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-1.5 ml-1">
                  <label
                    htmlFor="maxParticipants"
                    className="text-sm font-bold text-gray-700"
                  >
                    최대 인원
                  </label>
                  <span className="text-sm font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md">
                    {formData.maxParticipants}명
                  </span>
                </div>
                <div className="relative flex items-center gap-4 bg-gray-50 rounded-2xl p-4 border border-gray-200">
                  <Users className="w-5 h-5 text-gray-400 shrink-0" />
                  <input
                    id="maxParticipants"
                    name="maxParticipants"
                    type="range"
                    min={2}
                    max={8}
                    step={1}
                    value={formData.maxParticipants}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        maxParticipants: e.target.value,
                      }))
                    }
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                  <span className="text-xs text-gray-400 shrink-0">8명</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700 mb-2 ml-1 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-gray-400" />
                  권장 레벨
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {levelOptions.map((opt) => {
                    const isSelected = formData.level === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setFormData((p) => ({ ...p, level: opt.value }))
                        }
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all duration-200 relative overflow-hidden ${
                          isSelected
                            ? "bg-rose-500 border-rose-600 text-white shadow-md scale-105 z-10"
                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                        }`}
                      >
                        <span
                          className={`text-sm font-bold ${
                            isSelected ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {opt.label}
                        </span>
                        <span
                          className={`text-[10px] mt-0.5 ${
                            isSelected ? "text-rose-100" : "text-gray-400"
                          }`}
                        >
                          {opt.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-rose-500 text-white px-6 py-4 text-base font-bold shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  생성 중...
                </>
              ) : (
                "방 만들기 완료"
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default VoiceRoomCreate;
