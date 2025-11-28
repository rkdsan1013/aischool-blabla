// frontend/src/pages/VoiceRoomPage.tsx
// cspell:ignore voiceroom

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Lock, Plus, Radio, Search, Loader2, Mic } from "lucide-react";
import VoiceRoomService from "../services/voiceroomService";
import type { VoiceRoom } from "../services/voiceroomService";
import { useProfile } from "../hooks/useProfile";

/**
 * UI에서 사용하는 Room 타입
 */
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

  // 전역 상태에서 유저 정보 가져오기
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
        // 참여자 미리보기 정보 파싱
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

      // 최신순 정렬
      mapped.sort((a, b) => parseInt(b.id, 10) - parseInt(a.id, 10));
      setRooms(mapped);
      if (!isBackground) setErrorMessage(null);
    } catch (err: unknown) {
      console.error("보이스룸 목록 로드 실패:", err);
      if (!isBackground) {
        setErrorMessage(
          "보이스룸을 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요."
        );
        setRooms([]);
      }
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  };

  // 초기 로드 및 폴링
  useEffect(() => {
    let mounted = true;

    // 1. 최초 실행
    fetchRooms();

    // 2. 방금 나간 방 업데이트를 위한 빠른 재조회
    const refreshTimeout = setTimeout(() => {
      if (mounted) fetchRooms(true);
    }, 300);

    // 3. 주기적 갱신 (3초마다)
    const intervalId = setInterval(() => {
      if (mounted) fetchRooms(true);
    }, 3000);

    return () => {
      mounted = false;
      clearTimeout(refreshTimeout);
      clearInterval(intervalId);
    };
  }, []);

  const handleJoinRoom = (roomId: string) => {
    navigate(`/voiceroom/${roomId}`);
  };

  const handleCreateRoom = () => {
    navigate("/voiceroom/create");
  };

  // 검색 필터링
  const filteredRooms = useMemo(() => {
    const q = query.trim().toLowerCase();
    const baseList = !q
      ? rooms
      : rooms.filter((r) => {
          return (
            (r.name ?? "").toLowerCase().includes(q) ||
            (r.topic ?? "").toLowerCase().includes(q) ||
            (r.host ?? "").toLowerCase().includes(q) ||
            (r.level ?? "").toLowerCase().includes(q)
          );
        });

    return [...baseList].sort(
      (a, b) => parseInt(b.id, 10) - parseInt(a.id, 10)
    );
  }, [rooms, query]);

  // [수정됨]: pb-16 / md:pb-0
  return (
    <div className="min-h-screen bg-slate-50 pb-16 md:pb-0 text-gray-900">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* Hero / Banner Section */}
        <section>
          <div className="w-full bg-linear-to-br from-rose-500 to-pink-600 rounded-3xl p-6 sm:p-10 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            {/* 배경 데코 */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-rose-300 opacity-20 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/10 text-xs font-bold mb-4 shadow-sm">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>LIVE VOICE CHAT</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-1 leading-tight tracking-tight">
                함께 대화하며
                <br />
                실력을 키워보세요
              </h1>
            </div>

            {/* Action Buttons inside Banner */}
            <div className="relative z-10 flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <button
                onClick={handleCreateRoom}
                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-rose-600 font-bold rounded-xl shadow-md hover:bg-rose-50 transition-all active:scale-[0.98]"
              >
                <Plus className="w-5 h-5" />
                <span>방 만들기</span>
              </button>
            </div>
          </div>
        </section>

        {/* Search & Filter Section */}
        <section className="sticky top-4 z-20">
          <div className="bg-white/80 backdrop-blur-md p-2 rounded-2xl shadow-sm border border-gray-200">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="방 이름, 주제, 호스트, 레벨로 검색해보세요..."
                className="w-full pl-12 pr-4 py-2.5 bg-transparent text-base placeholder:text-gray-400 focus:outline-none rounded-xl"
              />
            </div>
          </div>
        </section>

        {/* Room List Section */}
        <section>
          <div className="flex items-center justify-between mb-6 px-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Mic className="w-6 h-6 text-rose-500" />
                활성 대화방
              </h2>
              <span className="bg-rose-100 text-rose-600 text-xs font-bold px-2 py-0.5 rounded-full">
                {filteredRooms.length}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-200">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>실시간</span>
            </div>
          </div>

          {/* 로딩 상태 */}
          {isLoading && rooms.length === 0 && (
            <div className="min-h-[300px] flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-rose-500" />
              <p className="text-gray-500 font-medium animate-pulse">
                대화방을 불러오는 중...
              </p>
            </div>
          )}

          {/* 에러 메시지 */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-center text-sm font-medium mb-6">
              {errorMessage}
            </div>
          )}

          {/* 방 목록 그리드 */}
          {!isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {filteredRooms.map((room, index) => {
                const participants = room.participants ?? 0;
                const maxParticipants = room.maxParticipants ?? 8;
                const levelLabel = room.level ?? "전체";
                const hostLabel = room.host ?? "알 수 없음";
                const topicLabel = room.topic ?? "자유롭게 대화해요!";
                const isFull = participants >= maxParticipants;

                return (
                  <div
                    key={room.id}
                    className="group relative bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-sm hover:shadow-md hover:border-rose-100 transition-all duration-300 hover:-translate-y-1 flex flex-col"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        {/* Level Badge - Unified Style */}
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                            levelLabel === "초급"
                              ? "bg-green-50 text-green-600 border-green-100"
                              : levelLabel === "중급"
                              ? "bg-blue-50 text-blue-600 border-blue-100"
                              : levelLabel === "고급"
                              ? "bg-purple-50 text-purple-600 border-purple-100"
                              : "bg-gray-50 text-gray-600 border-gray-100"
                          }`}
                        >
                          {levelLabel}
                        </span>
                        {room.isPrivate && (
                          <div className="bg-gray-50 border border-gray-100 p-1 rounded-md text-gray-400">
                            <Lock className="w-3 h-3" />
                          </div>
                        )}
                      </div>

                      {/* Participants Count Badge */}
                      <div
                        className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full border ${
                          isFull
                            ? "bg-red-50 text-red-600 border-red-100"
                            : "bg-gray-50 text-gray-600 border-gray-100"
                        }`}
                      >
                        <Users className="w-3 h-3" />
                        <span>
                          {participants}/{maxParticipants}
                        </span>
                      </div>
                    </div>

                    {/* Title & Topic */}
                    <div className="mb-4 flex-1">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 group-hover:text-rose-600 transition-colors truncate">
                        {room.name ?? "이름 없는 방"}
                      </h3>
                      <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                        {topicLabel}
                      </p>
                    </div>

                    {/* Footer: Host & Avatars */}
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="font-medium">HOST</span>
                        <span className="text-gray-900 font-semibold max-w-20 truncate">
                          {hostLabel}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Avatars */}
                        <div className="flex -space-x-2">
                          {room.previewUsers.slice(0, 3).map((user) => (
                            <div
                              key={user.id}
                              className="w-7 h-7 rounded-full border-2 border-white bg-gray-100 overflow-hidden shadow-sm"
                              title={user.name}
                            >
                              {user.image ? (
                                <img
                                  src={user.image}
                                  alt={user.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-[10px] font-bold">
                                  {user.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                          ))}
                          {room.previewUsers.length > 3 && (
                            <div className="w-7 h-7 rounded-full border-2 border-white bg-gray-50 flex items-center justify-center text-[10px] font-bold text-gray-400 shadow-sm">
                              +{room.previewUsers.length - 3}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleJoinRoom(room.id)}
                          disabled={isFull}
                          className={`px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-[0.95] ${
                            isFull
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "bg-rose-500 text-white hover:bg-rose-600 shadow-rose-200"
                          }`}
                        >
                          {isFull ? "Full" : "참여"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty State (Filtered) */}
          {!isLoading && filteredRooms.length === 0 && rooms.length > 0 && (
            <div className="text-center py-16 bg-white rounded-3xl border border-gray-200 shadow-sm">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                검색 결과가 없습니다
              </h3>
              <p className="text-gray-500 text-sm mb-6">
                다른 키워드로 검색하거나 새로운 방을 만들어보세요.
              </p>
              <button
                onClick={handleCreateRoom}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-500 text-white text-sm font-bold rounded-xl hover:bg-rose-600 transition-all shadow-md shadow-rose-100"
              >
                <Plus className="w-4 h-4" />방 만들기
              </button>
            </div>
          )}

          {/* Empty State (No Rooms) */}
          {!isLoading && rooms.length === 0 && (
            <div className="text-center py-16 bg-white rounded-3xl border border-gray-200 shadow-sm">
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
                <Radio className="w-8 h-8 text-rose-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                아직 개설된 대화방이 없습니다
              </h3>
              <p className="text-gray-500 text-sm mb-6">
                첫 번째 대화방을 만들어보세요!
              </p>
              <button
                onClick={handleCreateRoom}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-500 text-white text-sm font-bold rounded-xl hover:bg-rose-600 transition-all shadow-md shadow-rose-100"
              >
                <Plus className="w-4 h-4" />방 만들기
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
