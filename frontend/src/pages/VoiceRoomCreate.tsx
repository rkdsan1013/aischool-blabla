// frontend/src/pages/VoiceRoomCreate.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import VoiceRoomService from "../services/voiceroomService";

// 레벨 타입 정의
type VoiceRoomLevel = "ANY" | "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

type FormState = {
  name: string;
  description: string;
  maxParticipants: string;
  level: VoiceRoomLevel; // string -> 구체적인 타입으로 변경
};

// API 에러 응답 타입 정의 (Axios 구조 가정)
interface ApiErrorResponse {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

function useAuth() {
  const [isLoading] = useState<boolean>(false);
  const [user] = useState<{ id: string; name: string } | null>({
    id: "1",
    name: "TestUser",
  });
  return { user, isLoading };
}

const VoiceRoomCreate: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  const [formData, setFormData] = useState<FormState>({
    name: "",
    description: "",
    maxParticipants: "8",
    level: "ANY",
  });

  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!isLoading && !user) navigate("/login");
  }, [user, isLoading, navigate]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500" />
      </div>
    );
  }

  // 폼 제출 처리
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (submitting) return;

    console.log("Form Data:", formData);

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      level: formData.level, // 더 이상 as any 불필요
      max_participants: Number(formData.maxParticipants),
    };

    try {
      // 유효성 검사
      VoiceRoomService.validateCreatePayload({
        name: payload.name,
        description: payload.description,
        level: payload.level,
        max_participants: payload.max_participants,
      });

      setSubmitting(true);
      console.log("Sending POST /voice-room with:", payload);

      const created = await VoiceRoomService.createRoom(payload);

      console.log("Created room:", created);

      navigate("/voiceroom");
    } catch (err: unknown) {
      // [수정] any 대신 unknown 사용 및 타입 좁히기(Type Narrowing)
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

  const levelOptions: { value: VoiceRoomLevel; label: string }[] = [
    { value: "ANY", label: "제한 없음" },
    { value: "A1", label: "A1" },
    { value: "A2", label: "A2" },
    { value: "B1", label: "B1" },
    { value: "B2", label: "B2" },
    { value: "C1", label: "C1" },
    { value: "C2", label: "C2" },
  ];

  return (
    <div className="h-[100dvh] bg-white flex flex-col">
      <header className="w-full bg-rose-500 text-white flex-shrink-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 sm:px-6 py-4">
          <h1 className="text-lg font-semibold">새로운 방 만들기</h1>
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center text-white hover:bg-white/10 rounded px-2 py-1"
            aria-label="닫기"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      <main className="w-full flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24">
          <section className="w-full p-0">
            <div className="mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
                방 설정
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
                다른 학습자들과 함께할 방을 만들어보세요
              </p>
            </div>

            <form
              id="room-create-form"
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-900"
                >
                  방 이름
                </label>
                <input
                  id="name"
                  name="name"
                  placeholder="예: 초보자 환영방"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-900"
                >
                  방 설명
                </label>
                <input
                  id="description"
                  name="description"
                  placeholder="예: 일상 대화 연습"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  required
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="maxParticipants"
                  className="block text-sm font-medium text-gray-900"
                >
                  최대 참여 인원
                </label>
                <div className="mt-1">
                  <input
                    id="maxParticipants"
                    name="maxParticipants"
                    type="number"
                    min={1}
                    max={100}
                    value={formData.maxParticipants}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        maxParticipants: e.target.value,
                      }))
                    }
                    required
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-900">
                  권장 레벨
                </label>
                <div className="mt-1">
                  <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 sm:grid sm:grid-cols-7 sm:overflow-visible">
                    {levelOptions.map((opt) => {
                      const isSelected = formData.level === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            setFormData((p) => ({ ...p, level: opt.value }))
                          }
                          className={`
                            flex-shrink-0 px-4 py-2.5 sm:px-0 rounded-lg text-sm font-medium border transition-all
                            focus:outline-none focus:ring-2 focus:ring-rose-300 whitespace-nowrap
                            ${
                              isSelected
                                ? "bg-rose-500 border-rose-500 text-white shadow-md"
                                : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                            }
                          `}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-400 mt-1 sm:hidden">
                    좌우로 스크롤하여 선택할 수 있습니다.
                  </p>
                </div>
              </div>
            </form>
          </section>
        </div>
      </main>

      <footer className="w-full bg-white border-t border-gray-200 flex-shrink-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 h-12 rounded-lg border border-gray-200 bg-white text-gray-700 text-lg font-semibold hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition"
              disabled={submitting}
            >
              취소
            </button>
            <button
              type="submit"
              form="room-create-form"
              className="flex-1 h-12 rounded-lg bg-rose-500 text-white text-lg font-semibold shadow-lg hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-300 transition disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? "생성 중..." : "방 만들기"}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default VoiceRoomCreate;
