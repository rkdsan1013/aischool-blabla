// frontend/src/pages/VoiceRoomPage.tsx
// cspell:ignore voiceroom

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Lock,
  Plus,
  Radio,
  Search,
  Loader2,
  Mic,
  Sparkles,
} from "lucide-react";
import VoiceRoomService from "../services/voiceroomService";
import type { VoiceRoom } from "../services/voiceroomService";
import { useProfile } from "../hooks/useProfile";

interface PreviewUser {
  id: number;
  name: string;
  image: string | null;
}

interface Room {
  id: string;
  name: string | null;
  topic: string | null;
  host: string | null;
  participants: number | null;
  maxParticipants: number | null;
  level: string | null;
  isPrivate: boolean | null;
  previewUsers: PreviewUser[];
}

export default function VoiceRoomPage() {
  const navigate = useNavigate();
  const { profile, isProfileLoading } = useProfile();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [query, setQuery] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 로그인 체크
  useEffect(() => {
    if (!isProfileLoading && !profile) {
      navigate("/auth");
    }
  }, [profile, isProfileLoading, navigate]);

  // 방 목록 조회
  const fetchRooms = async (isBackground = false) => {
    try {
      if (!isBackground) setIsLoading(true);
      const data: VoiceRoom[] = await VoiceRoomService.getRooms();

      const mapped: Room[] = data.map((v) => {
        let previews: PreviewUser[] = [];
        if (v.preview_users) {
          previews = v.preview_users.split(",").map((str) => {
            const [userIdStr, userName, userImage] = str.split("|");
            return {
              id: Number(userIdStr),
              name: userName || "User",
              image: userImage !== "null" && userImage ? userImage : null,
            };
          });
        }
        return {
          id: String(v.room_id),
          name: v.name ?? null,
          topic: v.description ?? null,
          host: v.host_name ?? "알 수 없음",
          participants: v.current_participants ?? 0,
          maxParticipants:
            v.max_participants !== undefined && v.max_participants !== null
              ? Number(v.max_participants)
              : null,
          level: v.level ?? null,
          isPrivate: null,
          previewUsers: previews,
        };
      });

      mapped.sort((a, b) => parseInt(b.id, 10) - parseInt(a.id, 10));
      setRooms(mapped);
      if (!isBackground) setErrorMessage(null);
    } catch (err: unknown) {
      console.error("Fetch Error:", err);
      if (!isBackground) {
        setErrorMessage("목록을 불러오지 못했습니다. 다시 시도해주세요.");
        setRooms([]);
      }
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    fetchRooms();
    const refreshTimeout = setTimeout(() => {
      if (mounted) fetchRooms(true);
    }, 300);
    const intervalId = setInterval(() => {
      if (mounted) fetchRooms(true);
    }, 3000);
    return () => {
      mounted = false;
      clearTimeout(refreshTimeout);
      clearInterval(intervalId);
    };
  }, []);

  const handleJoinRoom = (roomId: string) => navigate(`/voiceroom/${roomId}`);
  const handleCreateRoom = () => navigate("/voiceroom/create");

  const filteredRooms = useMemo(() => {
    const q = query.trim().toLowerCase();
    const baseList = !q
      ? rooms
      : rooms.filter(
          (r) =>
            (r.name ?? "").toLowerCase().includes(q) ||
            (r.topic ?? "").toLowerCase().includes(q) ||
            (r.host ?? "").toLowerCase().includes(q) ||
            (r.level ?? "").toLowerCase().includes(q)
        );
    return [...baseList].sort(
      (a, b) => parseInt(b.id, 10) - parseInt(a.id, 10)
    );
  }, [rooms, query]);

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-gray-900">
      {/* ========================================
        HERO SECTION (Mobile-First Redesign) 
        - 둥근 하단 모서리 (Modern App Style)
        - 배경 패턴 추가
        - 모바일: 세로 배치 / 데스크톱: 가로 배치
        ========================================
      */}
      <div className="relative bg-white pb-10 pt-4 rounded-b-[2.5rem] shadow-lg shadow-rose-100/50 overflow-hidden z-10">
        {/* Background Decoration */}
        <div className="absolute inset-0 bg-gradient-to-b from-rose-50 via-white to-white pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-rose-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
        <div className="absolute -top-10 -left-10 w-48 h-48 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30" />

        <div className="relative max-w-5xl mx-auto px-6 pt-6">
          {/* Header Content */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-100 text-rose-600 rounded-full text-xs font-bold mb-4 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              실시간 음성채팅
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight mb-3">
              함께 대화하며
              <br />
              <span className="text-rose-500">실력을 키워보세요</span>
            </h1>

            <p className="text-slate-500 text-sm sm:text-base font-medium leading-relaxed max-w-lg mx-auto">
              전 세계 친구들과 실시간으로 연결되어
              <br className="sm:hidden" />
              자연스럽게 언어를 배워보세요.
            </p>
          </div>

          {/* Search & Action Bar (Mobile: Stacked, Desktop: Row) */}
          <div className="flex flex-col sm:flex-row items-center gap-3 max-w-2xl mx-auto">
            <div className="relative w-full group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-gray-400 group-focus-within:text-rose-500 transition-colors" />
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="관심있는 주제나 레벨 검색..."
                className="w-full pl-12 pr-4 h-14 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-base rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all shadow-inner"
              />
            </div>

            <button
              onClick={handleCreateRoom}
              className="w-full sm:w-auto min-w-[160px] h-14 flex items-center justify-center gap-2 bg-rose-500 text-white font-bold text-base rounded-2xl shadow-lg shadow-rose-500/30 hover:bg-rose-600 hover:shadow-rose-600/40 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 transition-all duration-200"
            >
              <Plus className="w-5 h-5" />
              <span>방 만들기</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================
        ROOM LIST SECTION 
        ========================================
      */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-end justify-between mb-6 px-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Mic className="w-5 h-5 text-rose-500" />
              지금 대화 중
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1 ml-0.5">
              총 {filteredRooms.length}개의 방이 열려있어요
            </p>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && rooms.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-rose-500" />
            <p className="text-slate-400 font-medium text-sm">
              목록을 불러오는 중...
            </p>
          </div>
        )}

        {/* Error State */}
        {errorMessage && (
          <div className="mx-4 p-4 bg-red-50 text-red-600 rounded-2xl text-center text-sm font-medium border border-red-100">
            {errorMessage}
          </div>
        )}

        {/* Rooms Grid */}
        {!isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredRooms.map((room, index) => {
              const participants = room.participants ?? 0;
              const maxParticipants = room.maxParticipants ?? 8;
              const isFull = participants >= maxParticipants;
              const levelColor =
                room.level === "초급"
                  ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                  : room.level === "중급"
                  ? "bg-blue-50 text-blue-600 border-blue-100"
                  : room.level === "고급"
                  ? "bg-purple-50 text-purple-600 border-purple-100"
                  : "bg-slate-100 text-slate-600 border-slate-200";

              return (
                <div
                  key={room.id}
                  className="group bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-rose-100/50 hover:border-rose-200 transition-all duration-300 flex flex-col relative overflow-hidden"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Card Top Row */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${levelColor} flex items-center gap-1`}
                      >
                        <Sparkles className="w-3 h-3" />
                        {room.level ?? "전체"}
                      </span>
                      {room.isPrivate && (
                        <div className="w-6 h-6 flex items-center justify-center bg-slate-50 rounded-lg text-slate-400 border border-slate-100">
                          <Lock className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    <div
                      className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${
                        isFull
                          ? "bg-red-50 text-red-500"
                          : "bg-slate-50 text-slate-500"
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      {participants}/{maxParticipants}
                    </div>
                  </div>

                  {/* Title & Topic */}
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-1 leading-snug group-hover:text-rose-600 transition-colors line-clamp-1">
                      {room.name ?? "이름 없는 방"}
                    </h3>
                    <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                      {room.topic ?? "자유롭게 대화해요!"}
                    </p>
                  </div>

                  {/* Footer: Users & Action */}
                  <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex -space-x-2">
                      {room.previewUsers.slice(0, 3).map((u) => (
                        <div
                          key={u.id}
                          className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm relative z-0 group-hover:z-10 transition-all"
                        >
                          {u.image ? (
                            <img
                              src={u.image}
                              alt={u.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-rose-100 text-rose-500 text-[10px] font-bold">
                              {u.name[0]}
                            </div>
                          )}
                        </div>
                      ))}
                      {room.previewUsers.length === 0 && (
                        <div className="text-xs text-slate-400 font-medium py-1">
                          첫 참가자가 되어보세요!
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleJoinRoom(room.id)}
                      disabled={isFull}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                        isFull
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : "bg-slate-900 text-white hover:bg-rose-500 shadow-md hover:shadow-rose-200"
                      }`}
                    >
                      {isFull ? "Full" : "참여"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty States */}
        {!isLoading && rooms.length > 0 && filteredRooms.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              검색 결과가 없어요
            </h3>
            <p className="text-slate-500 text-sm mt-1">
              다른 키워드로 검색해보세요.
            </p>
          </div>
        )}

        {!isLoading && rooms.length === 0 && (
          <div className="text-center py-16 px-4">
            <div className="w-20 h-20 bg-gradient-to-br from-rose-100 to-rose-50 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
              <Radio className="w-10 h-10 text-rose-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              대화방이 텅 비었어요!
            </h3>
            <p className="text-slate-500 text-sm mb-6 max-w-xs mx-auto">
              지금 방을 만들면 전 세계 친구들이
              <br />
              금방 찾아올 거예요.
            </p>
            <button
              onClick={handleCreateRoom}
              className="px-6 py-3 bg-rose-500 text-white font-bold rounded-2xl hover:bg-rose-600 shadow-lg shadow-rose-200 transition-all"
            >
              첫 번째 방 만들기
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
