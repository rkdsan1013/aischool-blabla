// frontend/src/pages/VoiceRoomDetail.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Mic, MicOff, Users, Volume2, PhoneOff, Loader2 } from "lucide-react";
import io, { Socket } from "socket.io-client";
import Peer from "simple-peer";
import VoiceRoomService, { type VoiceRoom } from "../services/voiceroomService";
import { useProfile } from "../hooks/useProfile"; // ✅ useProfile Hook 사용

// --- Types ---
interface Participant {
  socketId: string;
  userId: number;
  name: string;
  isSpeaking: boolean;
  isMuted: boolean;
  stream?: MediaStream;
}

interface UserInfo {
  userId: number;
  name: string;
}

interface SignalPayload {
  userToSignal: string;
  callerID: string;
  signal: Peer.SignalData;
  userInfo: UserInfo;
}

interface ReturnSignalPayload {
  signal: Peer.SignalData;
  id: string;
}

interface UserJoinedPayload {
  signal: Peer.SignalData;
  callerID: string;
  userInfo: UserInfo;
}

type SafariWindow = Window &
  typeof globalThis & {
    webkitAudioContext: typeof AudioContext;
  };

const SPEECH_THRESHOLD = 0.02;
const SPEECH_HOLD_TIME = 1000;

export default function VoiceRoomDetail(): React.ReactElement {
  const navigate = useNavigate();
  const { id: roomId } = useParams<{ id: string }>();

  // ✅ [핵심] 전역 프로필 정보 사용
  const { profile, isProfileLoading } = useProfile();

  // --- Refs ---
  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<{ peerID: string; peer: Peer.Instance }[]>([]);
  const localStreamRef = useRef<MediaStream | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);
  const participantAnalysers = useRef<Map<string, AnalyserNode>>(new Map());
  const lastSpeakingTimeRef = useRef<Map<string, number>>(new Map());

  // --- State ---
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("방 접속 준비 중...");
  const [roomInfo, setRoomInfo] = useState<{ name: string } | null>(null);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  // --- Helpers ---
  const attachAnalyser = useCallback(
    (socketId: string, stream: MediaStream) => {
      if (!audioContextRef.current) return;
      const ctx = audioContextRef.current;
      if (stream.getAudioTracks().length === 0) return;

      try {
        if (participantAnalysers.current.has(socketId)) return;

        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        participantAnalysers.current.set(socketId, analyser);
      } catch (e) {
        console.warn("AudioContext connect warning:", e);
      }
    },
    []
  );

  const updateParticipantStream = useCallback(
    (socketId: string, stream: MediaStream) => {
      setParticipants((prev) => {
        const target = prev.find((p) => p.socketId === socketId);
        if (target && target.stream === stream) return prev;
        return prev.map((p) =>
          p.socketId === socketId ? { ...p, stream } : p
        );
      });
      attachAnalyser(socketId, stream);
    },
    [attachAnalyser]
  );

  // --- Initialize ---
  useEffect(() => {
    // 1. roomId가 없거나 프로필 로딩 중이면 대기
    if (!roomId) return;
    if (isProfileLoading) return;

    // 2. 로그인 체크 (프로필이 없으면 로그인 페이지로)
    if (!profile) {
      alert("로그인이 필요합니다.");
      navigate("/auth");
      return;
    }

    let isMounted = true;
    const analysersMap = participantAnalysers.current;

    const initRoom = async () => {
      try {
        console.log("🚀 [VoiceRoom] 초기화 시작");
        console.log("👤 [User] 접속자:", profile.name, profile.user_id);

        // 3. 방 정보 조회
        if (isMounted) setStatusMessage("방 정보를 불러오는 중...");
        const roomDataPromise = VoiceRoomService.getRoomById(Number(roomId));
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 5000)
        );

        const data = (await Promise.race([
          roomDataPromise,
          timeoutPromise,
        ])) as VoiceRoom;
        if (!isMounted) return;
        setRoomInfo(data);

        // 4. 마이크 권한 요청
        if (isMounted) setStatusMessage("마이크 권한 요청 중...");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        });
        localStreamRef.current = stream;

        if (!isMounted) return;

        // 5. 내 정보 UI 추가 (useProfile 값 사용)
        setParticipants([
          {
            socketId: "me",
            userId: profile.user_id,
            name: profile.name,
            isSpeaking: false,
            isMuted: false,
            stream: stream,
          },
        ]);

        // 6. VAD 시작
        if (isMounted) setIsLoading(false);
        startAudioAnalysis();

        // 7. 소켓 연결
        if (isMounted) setStatusMessage("서버 연결 시도 중...");
        socketRef.current = io("http://localhost:3000", {
          transports: ["websocket"],
          withCredentials: true,
        });
        const socket = socketRef.current;

        socket.on("connect", () => {
          console.log("✅ [VoiceRoom] 소켓 연결됨");
          // useProfile 값으로 입장 요청
          socket.emit("join_room", {
            roomId,
            userId: profile.user_id,
            name: profile.name,
          });
        });

        socket.on("connect_error", (err) => {
          console.error("❌ [VoiceRoom] 소켓 연결 에러:", err);
          if (isMounted) setStatusMessage("서버 연결 실패... 재시도 중");
        });

        // --- WebRTC Event Handlers ---
        const createPeer = (
          userToSignal: string,
          callerID: string,
          stream: MediaStream,
          userInfo: UserInfo
        ) => {
          const peer = new Peer({ initiator: true, trickle: false, stream });
          peer.on("signal", (signal) => {
            socketRef.current?.emit("sending_signal", {
              userToSignal,
              callerID,
              signal,
              userInfo,
            } as SignalPayload);
          });
          peer.on("stream", (remoteStream) => {
            updateParticipantStream(userToSignal, remoteStream);
          });
          return peer;
        };

        const addPeer = (
          incomingSignal: Peer.SignalData,
          callerID: string,
          stream: MediaStream
        ) => {
          const peer = new Peer({ initiator: false, trickle: false, stream });
          peer.on("signal", (signal) => {
            socketRef.current?.emit("returning_signal", { signal, callerID });
          });
          peer.on("stream", (remoteStream) => {
            updateParticipantStream(callerID, remoteStream);
          });
          peer.signal(incomingSignal);
          return peer;
        };

        socket.on(
          "all_users",
          (
            users: Array<{ socketId: string; userId: number; name: string }>
          ) => {
            if (!socket.id) return;

            const newPeers: { peerID: string; peer: Peer.Instance }[] = [];
            const newParticipants: Participant[] = [];

            users.forEach((user) => {
              if (peersRef.current.find((p) => p.peerID === user.socketId))
                return;

              const peer = createPeer(
                user.socketId,
                socket.id as string,
                stream,
                {
                  userId: profile.user_id,
                  name: profile.name,
                }
              );

              newPeers.push({ peerID: user.socketId, peer });
              newParticipants.push({
                socketId: user.socketId,
                userId: user.userId,
                name: user.name,
                isSpeaking: false,
                isMuted: false,
              });
            });

            peersRef.current.push(...newPeers);
            setParticipants((prev) => [...prev, ...newParticipants]);

            if (isMounted) setIsLoading(false);
          }
        );

        socket.on("user_joined", (payload: UserJoinedPayload) => {
          if (peersRef.current.find((p) => p.peerID === payload.callerID))
            return;

          const peer = addPeer(payload.signal, payload.callerID, stream);
          peersRef.current.push({ peerID: payload.callerID, peer });

          setParticipants((prev) => {
            if (prev.find((p) => p.socketId === payload.callerID)) return prev;
            return [
              ...prev,
              {
                socketId: payload.callerID,
                userId: payload.userInfo.userId,
                name: payload.userInfo.name,
                isSpeaking: false,
                isMuted: false,
              },
            ];
          });
        });

        socket.on(
          "receiving_returned_signal",
          (payload: ReturnSignalPayload) => {
            const item = peersRef.current.find((p) => p.peerID === payload.id);
            item?.peer.signal(payload.signal);
          }
        );

        socket.on("user_left", (id: string) => {
          const peerObj = peersRef.current.find((p) => p.peerID === id);
          if (peerObj) peerObj.peer.destroy();
          peersRef.current = peersRef.current.filter((p) => p.peerID !== id);
          setParticipants((prev) => prev.filter((p) => p.socketId !== id));
          participantAnalysers.current.delete(id);
        });

        socket.on(
          "user_mute_change",
          (payload: { socketId: string; isMuted: boolean }) => {
            setParticipants((prev) =>
              prev.map((p) =>
                p.socketId === payload.socketId
                  ? { ...p, isMuted: payload.isMuted }
                  : p
              )
            );
          }
        );

        socket.on("room_full", () => {
          alert("방이 꽉 찼습니다.");
          navigate("/voiceroom");
        });
      } catch (err: unknown) {
        console.error("🚨 초기화 실패:", err);
        if (!isMounted) return;

        let errorMessage = "방에 입장할 수 없습니다.";
        if (err instanceof Error && err.message === "Timeout") {
          errorMessage = "서버 응답이 지연되고 있습니다.";
        }
        if (err instanceof DOMException && err.name === "NotAllowedError") {
          errorMessage = "마이크 권한을 허용해주세요.";
        }
        alert(errorMessage);
        navigate("/voiceroom");
      }
    };

    initRoom();

    return () => {
      isMounted = false;
      socketRef.current?.disconnect();
      socketRef.current = null;

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      peersRef.current.forEach(({ peer }) => peer.destroy());
      peersRef.current = [];

      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) audioContextRef.current.close();

      analysersMap.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, profile, isProfileLoading]); // ✅ profile 변경 시 재실행

  // --- VAD Logic ---
  const startAudioAnalysis = useCallback(() => {
    if (audioContextRef.current) return;

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as SafariWindow).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      if (localStreamRef.current) {
        attachAnalyser("me", localStreamRef.current);
      }

      const analyze = () => {
        if (!audioContextRef.current) return;

        const updates: { id: string; speaking: boolean }[] = [];
        const now = Date.now();

        participantAnalysers.current.forEach((analyser, socketId) => {
          const bufferLength = analyser.fftSize;
          const dataArray = new Float32Array(bufferLength);
          analyser.getFloatTimeDomainData(dataArray);

          let sumSquares = 0;
          for (let i = 0; i < bufferLength; i++) {
            sumSquares += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sumSquares / bufferLength);

          // Hysteresis 적용
          if (rms > SPEECH_THRESHOLD) {
            lastSpeakingTimeRef.current.set(socketId, now);
            updates.push({ id: socketId, speaking: true });
          } else {
            const lastTime = lastSpeakingTimeRef.current.get(socketId) || 0;
            if (now - lastTime < SPEECH_HOLD_TIME) {
              updates.push({ id: socketId, speaking: true });
            } else {
              updates.push({ id: socketId, speaking: false });
            }
          }
        });

        if (updates.length > 0) {
          setParticipants((prev) => {
            let hasChanges = false;
            const nextState = prev.map((p) => {
              const update = updates.find((u) => u.id === p.socketId);
              if (update && update.speaking !== p.isSpeaking) {
                hasChanges = true;
                return { ...p, isSpeaking: update.speaking };
              }
              return p;
            });
            return hasChanges ? nextState : prev;
          });
        }
        animationRef.current = requestAnimationFrame(analyze);
      };
      analyze();
    } catch (e) {
      console.error("VAD Start Error:", e);
    }
  }, [attachAnalyser]);

  // --- Handlers ---
  const toggleMute = () => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      const newMuted = !audioTrack.enabled;
      audioTrack.enabled = newMuted;
      setIsMuted(!newMuted);
      socketRef.current?.emit("toggle_mute", !newMuted);
    }
  };

  const handleLeaveRoom = () => {
    navigate("/voiceroom");
  };

  // 로딩 화면
  if (isProfileLoading || (isLoading && !roomInfo)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-rose-500" />
        <p className="text-gray-600 font-medium">{statusMessage}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-screen w-screen overflow-hidden bg-white text-gray-900 flex flex-col">
      {/* Remote Audios */}
      {participants.map((p) => {
        if (p.socketId === "me" || !p.stream) return null;
        return (
          <AudioPlayer
            key={p.socketId}
            stream={p.stream}
            isSpeakerOn={isSpeakerOn}
          />
        );
      })}

      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-gray-200 flex-shrink-0">
        <div className="max-w-4xl w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center text-white shadow-md">
                <Users className="w-4.5 h-4.5" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm sm:text-base font-bold">
                  {roomInfo?.name || "보이스룸"}
                </span>
                <span className="text-xs text-gray-600">
                  {participants.length}명 참여 중
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsSpeakerOn((s) => !s)}
              className={`p-2.5 rounded-full flex items-center justify-center ${
                isSpeakerOn
                  ? "bg-rose-50 text-rose-600"
                  : "bg-gray-50 text-gray-500"
              } hover:brightness-95`}
            >
              {isSpeakerOn ? (
                <Volume2 className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5 opacity-50" />
              )}
            </button>

            <button
              onClick={toggleMute}
              className={`p-2.5 rounded-full flex items-center justify-center ${
                isMuted ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-700"
              } hover:brightness-95`}
            >
              {isMuted ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={handleLeaveRoom}
              className="flex items-center gap-1 px-4.5 py-1.5 rounded-full bg-red-600 text-white text-sm hover:bg-red-700"
            >
              <div className="w-8 h-8 flex items-center justify-center">
                <PhoneOff className="w-4 h-4 text-white" />
              </div>
              <span className="hidden sm:inline">나가기</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col min-h-0 bg-gray-50">
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 pt-8 pb-8 flex-1 flex flex-col items-center justify-center">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 w-full">
            {participants.map((p) => (
              <div key={p.socketId} className="flex flex-col items-center">
                <div className="relative w-24 h-24 sm:w-32 sm:h-32">
                  {/* Speaking Pulse */}
                  {p.isSpeaking && !p.isMuted && (
                    <div className="absolute inset-0 rounded-full ring-4 ring-rose-400 ring-opacity-60 animate-pulse" />
                  )}
                  <div
                    className={`w-full h-full rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg transition-transform duration-200 ${
                      p.socketId === "me"
                        ? "bg-gradient-to-br from-rose-400 to-rose-600"
                        : "bg-white text-gray-700 border-2 border-gray-200"
                    }`}
                  >
                    {p.name.charAt(0)}
                  </div>
                  {p.isMuted && (
                    <div className="absolute bottom-0 right-0 bg-gray-800 text-white p-1.5 rounded-full shadow-sm border-2 border-white">
                      <MicOff className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <div className="mt-3 text-center">
                  <div className="font-semibold text-gray-900 text-lg truncate max-w-[120px]">
                    {p.name} {p.socketId === "me" && "(나)"}
                  </div>
                  <div className="text-xs text-gray-500 font-medium mt-0.5">
                    {p.isSpeaking && !p.isMuted ? "말하는 중..." : "대기 중"}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!isLoading && participants.length === 1 && (
            <div className="mt-12 text-center text-gray-500">
              <p>다른 참여자를 기다리고 있습니다...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const AudioPlayer: React.FC<{ stream: MediaStream; isSpeakerOn: boolean }> = ({
  stream,
  isSpeakerOn,
}) => {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  useEffect(() => {
    if (ref.current) ref.current.muted = !isSpeakerOn;
  }, [isSpeakerOn]);
  return <audio ref={ref} autoPlay playsInline />;
};
