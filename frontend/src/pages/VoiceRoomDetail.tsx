// frontend/src/pages/VoiceRoomDetail.tsx
// cspell:ignore voiceroom
import { Buffer } from "buffer";

if (typeof window !== "undefined") {
  if (!window.Buffer) window.Buffer = Buffer;
  if (!window.global) window.global = window;

  if (!window.process) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).process = { env: {} };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const process = (window as any).process;

  if (!process.nextTick) {
    process.nextTick = (cb: () => void) => {
      if (typeof queueMicrotask === "function") {
        queueMicrotask(cb);
      } else {
        setTimeout(cb, 0);
      }
    };
  }
  if (!process.version) process.version = "";
  if (!process.env) process.env = {};
}

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Mic,
  MicOff,
  Users,
  MessageSquare,
  Volume2,
  PhoneOff,
  AlertCircle,
  Send,
  Loader2,
  UserMinus,
  MoreHorizontal,
  Sparkles,
  VolumeX,
} from "lucide-react";
import io, { Socket } from "socket.io-client";
import Peer from "simple-peer";
import VoiceRoomService, { type VoiceRoom } from "../services/voiceroomService";
import FloatingFeedbackCard from "../components/FloatingFeedbackCard";
import { useProfile } from "../hooks/useProfile";
import { useVoiceRoomRecorder } from "../hooks/useVoiceRoomRecorder";
import type {
  FeedbackPayload,
  ErrorType,
} from "../components/FloatingFeedbackCard";

/* ----------------------------- Types ----------------------------- */

type Participant = {
  socketId: string;
  userId: number;
  name: string;
  isSpeaking: boolean;
  speakingTime: number;
  isMuted: boolean;
  stream?: MediaStream;
};

interface TranscriptItem {
  id: string;
  speaker: string;
  text: string;
  timestamp: Date;
  feedback?: FeedbackPayload;
  interim?: boolean;
  isAnalyzing?: boolean;
}

interface UserInfo {
  userId: number;
  name: string;
  isMuted?: boolean;
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

interface SocketUser {
  socketId: string;
  userId: number;
  name: string;
  isMuted?: boolean;
}

type SafariWindow = Window &
  typeof globalThis & {
    webkitAudioContext: typeof AudioContext;
  };

/* ----------------------------- Static Helpers ----------------------------- */

const SPEECH_THRESHOLD = 0.02;
const SPEECH_HOLD_TIME = 1000;
const TOOLTIP_GAP_BELOW = 12;
const TOOLTIP_GAP_ABOVE = 6;
const HEADER_HEIGHT = 70;

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}

function tokenizeWithIndices(text: string): { token: string; index: number }[] {
  const parts = text.split(/(\s+)/);
  const tokens: { token: string; index: number }[] = [];
  let wordIndex = 0;
  for (const part of parts) {
    if (/\s+/.test(part)) {
      tokens.push({ token: part, index: -1 });
    } else {
      tokens.push({ token: part, index: wordIndex });
      wordIndex++;
    }
  }
  return tokens;
}

function isMobileUA(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Android|iPhone|iPad|iPod|Mobile|BlackBerry|IEMobile|Opera Mini/i.test(
    ua
  );
}

function makeId() {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    // ignore
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isWordErrored(index: number, feedback?: FeedbackPayload) {
  if (!feedback) return { errored: false, kind: null as ErrorType | null };
  for (const e of feedback.errors) {
    if (e.type !== "style" && e.index === index) {
      return { errored: true, kind: e.type };
    }
  }
  return { errored: false, kind: null as ErrorType | null };
}

function hasStyleError(feedback?: FeedbackPayload) {
  return Boolean(feedback?.errors.find((e) => e.type === "style"));
}

/* -------------------------------- Component -------------------------------- */

export default function VoiceRoomDetail(): React.ReactElement {
  const navigate = useNavigate();
  const { id: roomId } = useParams<{ id: string }>();
  const { profile, isProfileLoading } = useProfile();

  // --- Refs ---
  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<{ peerID: string; peer: Peer.Instance }[]>([]);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);
  const participantAnalyzers = useRef<Map<string, AnalyserNode>>(new Map());
  const lastSpeakingTimeRef = useRef<Map<string, number>>(new Map());

  // ID & Transcript Refs
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const participantsRef = useRef<HTMLDivElement | null>(null);
  const bubbleRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const transcriptIdsRef = useRef<Set<string>>(new Set());
  const transcriptStateRef = useRef<TranscriptItem[]>([]);

  // --- State ---
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("방 접속 준비 중...");
  const [roomInfo, setRoomInfo] = useState<VoiceRoom | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [sessionTime, setSessionTime] = useState(0);
  const [inputText, setInputText] = useState("");

  const [menuState, setMenuState] = useState<{
    socketId: string;
    userId: number;
    name: string;
    x: number;
    y: number;
  } | null>(null);

  const [activeTooltipMsgId, setActiveTooltipMsgId] = useState<string | null>(
    null
  );
  const [activeTooltipWordIndexes, setActiveTooltipWordIndexes] = useState<
    number[]
  >([]);

  const [cardPos, setCardPos] = useState<{
    top: number;
    left: number;
    width: number;
    isAbove: boolean;
  }>({ top: 0, left: 0, width: 0, isAbove: false });

  const isHost = roomInfo?.host_id === profile?.user_id;
  const isMobile = isMobileUA();

  const isMutedRef = useRef(isMuted);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const profileRef = useRef(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    transcriptStateRef.current = transcript;
  }, [transcript]);

  const addOrUpdateTranscript = useCallback((item: TranscriptItem) => {
    setTranscript((prev) => {
      const index = prev.findIndex((t) => t.id === item.id);
      if (index !== -1) {
        const newTranscript = [...prev];
        newTranscript[index] = { ...newTranscript[index], ...item };
        return newTranscript;
      } else {
        if (transcriptIdsRef.current.has(item.id)) return prev;
        transcriptIdsRef.current.add(item.id);
        return [...prev, item];
      }
    });
  }, []);

  // -----------------------------------------------------------------------
  // [1] Recorder Callback Handlers
  // -----------------------------------------------------------------------

  const onInterimResult = useCallback((text: string, id: string) => {
    const item: TranscriptItem = {
      id,
      speaker: "나",
      text,
      timestamp: new Date(),
      interim: true,
      isAnalyzing: false,
    };

    setTranscript((prev) => {
      const index = prev.findIndex((t) => t.id === id);
      if (index !== -1) {
        const newArr = [...prev];
        newArr[index] = { ...newArr[index], ...item };
        return newArr;
      } else {
        transcriptIdsRef.current.add(id);
        return [...prev, item];
      }
    });
  }, []);

  const onFinalResult = useCallback((text: string, id: string) => {
    setTranscript((prev) => {
      const index = prev.findIndex((t) => t.id === id);
      // 기존 항목이 있다면 isAnalyzing 상태를 유지
      const wasAnalyzing = index !== -1 ? prev[index].isAnalyzing : false;

      const finalItem: TranscriptItem = {
        id,
        speaker: "나",
        text: text.trim(),
        timestamp: new Date(),
        interim: false,
        isAnalyzing: wasAnalyzing,
      };

      if (index !== -1) {
        const newArr = [...prev];
        newArr[index] = { ...newArr[index], ...finalItem };
        return newArr;
      } else {
        transcriptIdsRef.current.add(id);
        return [...prev, finalItem];
      }
    });

    socketRef.current?.emit("local_transcript", {
      id,
      speaker: profileRef.current ? profileRef.current.name : "나",
      text: text.trim(),
      timestamp: new Date().toISOString(),
    });
  }, []);

  const onAudioCaptured = useCallback((blob: Blob, id: string) => {
    setTranscript((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isAnalyzing: true } : t))
    );

    const currentTranscript = transcriptStateRef.current;
    const contextMessages = currentTranscript
      .slice(-5)
      .map((t) => `${t.speaker}: ${t.text}`);

    blob.arrayBuffer().then((buffer) => {
      socketRef.current?.emit("audio_message", {
        audio: buffer,
        tempId: id,
        context: contextMessages,
      });
    });
  }, []);

  // -----------------------------------------------------------------------
  // [2] Use Custom Recorder Hook
  // -----------------------------------------------------------------------
  const { start: startRecording, stop: stopRecording } = useVoiceRoomRecorder({
    onInterimResult,
    onFinalResult,
    onAudioCaptured,
  });

  useEffect(() => {
    if (isMuted) {
      stopRecording();
    } else {
      if (socketRef.current?.connected) {
        startRecording();
      }
    }
  }, [isMuted, startRecording, stopRecording]);

  /* ------------------ Audio Analyzer (Visualizer) ------------------ */
  const attachAnalyzer = useCallback(
    (socketId: string, stream: MediaStream) => {
      if (
        !audioContextRef.current ||
        audioContextRef.current.state === "closed"
      )
        return;
      const ctx = audioContextRef.current;
      if (stream.getAudioTracks().length === 0) return;

      try {
        if (participantAnalyzers.current.has(socketId)) return;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        participantAnalyzers.current.set(socketId, analyser);
      } catch (e) {
        console.warn("AudioContext connect warning:", e);
      }
    },
    []
  );

  const updateParticipantStreamRef = useRef<
    (id: string, s: MediaStream) => void
  >(() => {});
  const updateParticipantStream = useCallback(
    (socketId: string, stream: MediaStream) => {
      setParticipants((prev) => {
        const target = prev.find((p) => p.socketId === socketId);
        if (target && target.stream === stream) return prev;
        return prev.map((p) =>
          p.socketId === socketId ? { ...p, stream } : p
        );
      });
      attachAnalyzer(socketId, stream);
    },
    [attachAnalyzer]
  );

  useEffect(() => {
    updateParticipantStreamRef.current = updateParticipantStream;
  }, [updateParticipantStream]);

  const startAudioAnalysis = useCallback(() => {
    if (audioContextRef.current) return;
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as SafariWindow).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      if (localStreamRef.current) {
        attachAnalyzer("me", localStreamRef.current);
      }

      const analyze = () => {
        if (
          !audioContextRef.current ||
          audioContextRef.current.state === "closed"
        )
          return;
        const updates: { id: string; speaking: boolean }[] = [];
        const now = Date.now();

        participantAnalyzers.current.forEach((analyser, socketId) => {
          const bufferLength = analyser.fftSize;
          const dataArray = new Float32Array(bufferLength);
          analyser.getFloatTimeDomainData(dataArray);
          let sumSquares = 0;
          for (let i = 0; i < bufferLength; i++) {
            sumSquares += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sumSquares / bufferLength);

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
  }, [attachAnalyzer]);

  const handleKickUser = () => {
    if (!menuState) return;
    const { socketId, userId, name } = menuState;
    if (
      window.confirm(
        `'${name}'님을 강퇴하시겠습니까?\n강퇴된 사용자는 이 방에 다시 입장할 수 없습니다.`
      )
    ) {
      socketRef.current?.emit("kick_user", {
        roomId,
        targetUserId: userId,
        targetSocketId: socketId,
      });
    }
    setMenuState(null);
  };

  /* ------------------ Main Effect (Init & Socket) ------------------ */
  useEffect(() => {
    if (!roomId || isProfileLoading) return;
    if (!profile) {
      alert("로그인이 필요합니다.");
      navigate("/auth");
      return;
    }

    let isMounted = true;
    const analyzersRef = participantAnalyzers.current;
    const transcriptIds = transcriptIdsRef.current;

    const initRoom = async () => {
      try {
        setStatusMessage("방 정보를 불러오는 중...");
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

        setStatusMessage("마이크 권한 요청 중...");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        });
        localStreamRef.current = stream;

        const audioTrack = stream.getAudioTracks()[0];
        const initialIsMuted = audioTrack ? !audioTrack.enabled : false;
        setIsMuted(initialIsMuted);
        isMutedRef.current = initialIsMuted;

        setParticipants((prev) => {
          if (prev.some((p) => p.socketId === "me")) return prev;
          return [
            {
              socketId: "me",
              userId: profile.user_id,
              name: profile.name,
              isSpeaking: false,
              speakingTime: 0,
              isMuted: initialIsMuted,
              stream,
            },
          ];
        });

        setIsLoading(false);
        startAudioAnalysis();

        setStatusMessage("서버 연결 시도 중...");
        if (socketRef.current) {
          socketRef.current.removeAllListeners();
          socketRef.current.disconnect();
        }

        const socket = io("http://localhost:3000", {
          transports: ["websocket"],
          withCredentials: true,
          forceNew: true,
        });
        socketRef.current = socket;

        socket.on("connect", () => {
          console.log("✅ [VoiceRoom] 소켓 연결됨", socket.id);
          socket.emit("join_room", {
            roomId,
            userId: profile.user_id,
            name: profile.name,
            isMuted: isMutedRef.current,
          });
          if (!isMutedRef.current) {
            startRecording();
          }
        });

        socket.on("connect_error", (err) => {
          console.error("❌ Socket Error:", err);
          if (isMounted) setStatusMessage("서버 연결 실패... 재시도 중");
        });

        socket.on("room_closed", () => {
          if (socketRef.current) socketRef.current.disconnect();
          stopRecording();
          alert("호스트가 퇴장하여 방이 종료되었습니다.");
          navigate("/voiceroom");
        });

        socket.on("kicked", () => {
          if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
          }
          stopRecording();
          if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((t) => t.stop());
          }
          alert("호스트에 의해 강퇴되었습니다.");
          navigate("/voiceroom");
        });

        socket.on("error_message", (msg: string) => {
          if (socketRef.current) socketRef.current.disconnect();
          stopRecording();
          alert(msg);
          navigate("/voiceroom");
        });

        socket.on("room_full", () => {
          if (socketRef.current) socketRef.current.disconnect();
          alert("방이 꽉 찼습니다.");
          navigate("/voiceroom");
        });

        const createPeer = (
          targetId: string,
          initiator: boolean,
          stream: MediaStream
        ) => {
          const peer = new Peer({ initiator, trickle: false, stream });

          peer.on("signal", (signal) => {
            if (initiator) {
              socketRef.current?.emit("sending_signal", {
                userToSignal: targetId,
                callerID: socket.id || "",
                signal,
                userInfo: {
                  userId: profile.user_id,
                  name: profile.name,
                  isMuted: isMutedRef.current,
                },
              });
            } else {
              socketRef.current?.emit("returning_signal", {
                signal,
                callerID: targetId,
              });
            }
          });

          peer.on("stream", (rs) =>
            updateParticipantStreamRef.current(targetId, rs)
          );
          return peer;
        };

        socket.on("all_users", (users: SocketUser[]) => {
          if (!socket.id) return;
          const newPeers: { peerID: string; peer: Peer.Instance }[] = [];
          const newParticipants: Participant[] = [];
          users.forEach((user) => {
            if (peersRef.current.find((p) => p.peerID === user.socketId))
              return;
            const peer = createPeer(user.socketId, true, stream);
            newPeers.push({ peerID: user.socketId, peer });
            newParticipants.push({
              socketId: user.socketId,
              userId: user.userId,
              name: user.name,
              isSpeaking: false,
              speakingTime: 0,
              isMuted: !!user.isMuted,
            });
          });
          peersRef.current.push(...newPeers);
          setParticipants((prev) => {
            const unique = newParticipants.filter(
              (np) => !prev.some((p) => p.socketId === np.socketId)
            );
            return [...prev, ...unique];
          });
        });

        socket.on("user_joined", (payload: UserJoinedPayload) => {
          setParticipants((prev) => {
            if (prev.find((p) => p.socketId === payload.callerID)) return prev;
            return [
              ...prev,
              {
                socketId: payload.callerID,
                userId: payload.userInfo.userId,
                name: payload.userInfo.name,
                isSpeaking: false,
                speakingTime: 0,
                isMuted: !!payload.userInfo.isMuted,
              },
            ];
          });
          if (!peersRef.current.find((p) => p.peerID === payload.callerID)) {
            const peer = createPeer(payload.callerID, false, stream);
            peer.signal(payload.signal);
            peersRef.current.push({ peerID: payload.callerID, peer });
          }
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
          if (peerObj)
            try {
              peerObj.peer.destroy();
            } catch {
              /* safe destroy */
            }
          peersRef.current = peersRef.current.filter((p) => p.peerID !== id);
          setParticipants((prev) => prev.filter((p) => p.socketId !== id));
          participantAnalyzers.current.delete(id);
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

        socket.on("transcript_item", (item: TranscriptItem) => {
          const normalized = {
            ...item,
            timestamp: new Date(item.timestamp),
            interim: false,
            isAnalyzing: false,
          };
          addOrUpdateTranscript(normalized);
        });

        socket.on(
          "transcript_complete",
          (payload: {
            id: string;
            text: string;
            feedback: FeedbackPayload;
            speaker: string;
          }) => {
            setTranscript((prev) => {
              const index = prev.findIndex((t) => t.id === payload.id);
              const updatedItem: TranscriptItem = {
                id: payload.id,
                speaker: payload.speaker,
                text: payload.text,
                timestamp: index !== -1 ? prev[index].timestamp : new Date(),
                feedback: payload.feedback,
                interim: false,
                isAnalyzing: false, // ✅ 분석 완료 -> 상태 해제
              };

              if (index !== -1) {
                const newArr = [...prev];
                newArr[index] = updatedItem;
                return newArr;
              } else {
                if (transcriptIdsRef.current.has(payload.id))
                  return [...prev, updatedItem];
                transcriptIdsRef.current.add(payload.id);
                return [...prev, updatedItem];
              }
            });
          }
        );
      } catch (err) {
        console.error("Init Error:", err);
        if (!isMounted) return;
        alert("방 입장 오류");
        navigate("/voiceroom");
      }
    };

    initRoom();

    return () => {
      isMounted = false;
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      stopRecording();
      if (localStreamRef.current)
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      peersRef.current.forEach(({ peer }) => {
        try {
          peer.destroy();
        } catch {
          /* safe */
        }
      });
      peersRef.current = [];
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      analyzersRef.clear();
      transcriptIds.clear();
    };
  }, [
    roomId,
    navigate,
    profile,
    isProfileLoading,
    startRecording,
    stopRecording,
    startAudioAnalysis,
    addOrUpdateTranscript,
  ]);

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  useEffect(() => {
    setParticipants((prev) =>
      prev.map((p) => (p.socketId === "me" ? { ...p, isMuted } : p))
    );
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !isMuted;
      socketRef.current?.emit("toggle_mute", isMuted);
    }
  }, [isMuted]);

  useEffect(() => {
    setTranscript([]);
    transcriptIdsRef.current.clear();
    const t = setInterval(() => setSessionTime((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const analyzingStatusKey = transcript
    .map((t) => (t.isAnalyzing ? "1" : "0"))
    .join("");
  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [transcript.length, analyzingStatusKey]);

  const handleLeaveRoom = () => {
    if (socketRef.current) socketRef.current.disconnect();
    stopRecording();
    navigate("/voiceroom");
  };

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;

    const finalId = makeId();
    const newTranscript: TranscriptItem = {
      id: finalId,
      speaker: "나",
      text,
      timestamp: new Date(),
      isAnalyzing: true,
    };

    addOrUpdateTranscript(newTranscript);
    setInputText("");

    socketRef.current?.emit("local_transcript", {
      id: finalId,
      speaker: profileRef.current ? profileRef.current.name : "나",
      text: text,
      timestamp: new Date().toISOString(),
    });

    const currentTranscript = transcriptStateRef.current;
    socketRef.current?.emit("text_analysis", {
      id: finalId,
      text: text,
      context: currentTranscript
        .slice(-5)
        .map((t) => `${t.speaker}: ${t.text}`),
    });
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // --- 툴팁 위치 로직 ---
  const updateCardPosition = useCallback(
    (msgId: string) => {
      if (isMobile) return;

      const node = bubbleRefs.current[msgId];
      if (!node) return;

      const rect = node.getBoundingClientRect();
      const viewportW = window.innerWidth;
      // [수정] 미사용 변수 제거
      // const viewportH = window.innerHeight;

      const desiredWidth = 360;
      const center = rect.left + rect.width / 2;
      let left = center - desiredWidth / 2;
      left = Math.max(8, Math.min(left, viewportW - desiredWidth - 8));

      const estimatedCardHeight = 200;

      const spaceAbove = rect.top - HEADER_HEIGHT;
      const preferAbove = spaceAbove >= estimatedCardHeight + TOOLTIP_GAP_ABOVE;

      let top;
      if (preferAbove) {
        top = rect.top - TOOLTIP_GAP_ABOVE;
      } else {
        top = rect.bottom + TOOLTIP_GAP_BELOW;
      }

      setCardPos({ top, left, width: desiredWidth, isAbove: preferAbove });
    },
    [isMobile]
  );

  function onWordInteract(
    msgId: string,
    wordIndex: number,
    feedback?: FeedbackPayload
  ) {
    if (!feedback) return;
    const errorsForWord = feedback.errors.filter((e) => e.index === wordIndex);
    if (errorsForWord.length === 0) return;
    setActiveTooltipMsgId(msgId);
    setActiveTooltipWordIndexes([wordIndex]);
    requestAnimationFrame(() => updateCardPosition(msgId));
  }

  function onSentenceInteract(msgId: string, feedback?: FeedbackPayload) {
    if (!feedback) return;
    if (!hasStyleError(feedback)) return;
    setActiveTooltipMsgId(msgId);
    setActiveTooltipWordIndexes([]);
    requestAnimationFrame(() => updateCardPosition(msgId));
  }

  function closeTooltip() {
    setActiveTooltipMsgId(null);
    setActiveTooltipWordIndexes([]);
  }

  // 스크롤/리사이즈 시 툴팁 위치 업데이트
  useEffect(() => {
    function onScroll() {
      if (activeTooltipMsgId && !isMobile)
        updateCardPosition(activeTooltipMsgId);
    }
    function onResize() {
      if (activeTooltipMsgId && !isMobile)
        updateCardPosition(activeTooltipMsgId);
    }
    const scrollContainer = transcriptRef.current;
    if (scrollContainer)
      scrollContainer.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      if (scrollContainer)
        scrollContainer.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [activeTooltipMsgId, updateCardPosition, isMobile]);

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
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-gray-200 shrink-0">
        <div className="max-w-4xl w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center text-white shadow-md">
                <Users className="w-4.5 h-4.5" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm sm:text-base font-bold">
                  {roomInfo?.name || "초보자 환영방"}
                </span>
                <span className="text-xs text-gray-600">
                  {participants.length}명 · {formatTime(sessionTime)}
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
                  : "bg-gray-100 text-gray-500"
              } hover:brightness-95 transition-colors`}
              style={{ width: 40, height: 40 }}
            >
              {isSpeakerOn ? (
                <Volume2 className="w-5 h-5" />
              ) : (
                <VolumeX className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={toggleMute}
              className={`p-2.5 rounded-full flex items-center justify-center ${
                isMuted ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-700"
              } hover:brightness-95 transition-colors`}
              style={{ width: 40, height: 40 }}
            >
              {isMuted ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={handleLeaveRoom}
              className="flex items-center gap-1 px-4 py-1.5 rounded-full bg-red-600 text-white text-sm hover:bg-red-700 transition-colors"
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <PhoneOff className="w-4 h-4 text-white" />
              </div>
              <span className="hidden sm:inline font-medium">나가기</span>
            </button>
          </div>
        </div>
      </header>

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

      <main className="flex-1 flex flex-col min-h-0">
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 pt-4 pb-0 flex-1 flex flex-col gap-4">
          <div className="w-full border-b border-gray-100">
            <div
              ref={participantsRef}
              className="flex gap-3 overflow-x-auto py-3 px-3 scrollbar-hide"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {participants.map((p) => (
                <div
                  key={p.socketId}
                  className="flex-none w-20 text-center relative group"
                >
                  <div
                    className="relative mx-auto w-14 h-14 cursor-pointer"
                    onClick={(e) => {
                      if (isHost && p.socketId !== "me") {
                        e.stopPropagation();
                        if (menuState?.socketId === p.socketId) {
                          setMenuState(null);
                        } else {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setMenuState({
                            socketId: p.socketId,
                            userId: p.userId,
                            name: p.name,
                            x: rect.left + rect.width / 2,
                            y: rect.bottom + 8,
                          });
                        }
                      }
                    }}
                  >
                    {p.isSpeaking && (
                      <div className="absolute inset-0 rounded-full ring-4 ring-rose-400 ring-opacity-60 animate-pulse" />
                    )}
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold shadow-md border-2 border-white ${
                        p.socketId === "me"
                          ? "bg-linear-to-br from-rose-400 to-rose-600"
                          : "bg-gray-300"
                      }`}
                    >
                      {p.name.charAt(0)}
                    </div>
                    {p.isMuted && (
                      <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-1 border-2 border-white shadow-sm flex items-center justify-center">
                        <MicOff className="w-3 h-3 text-white" />
                      </div>
                    )}
                    {isHost && p.socketId !== "me" && (
                      <div className="absolute inset-0 hover:bg-black/20 rounded-full transition-colors flex items-center justify-center group-hover:opacity-100 opacity-0">
                        <MoreHorizontal className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-xs font-medium text-gray-900 truncate">
                    {p.name}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <section className="flex-1 relative min-h-0 flex flex-col">
            <div className="flex items-center justify-between px-1 py-2 border-b border-gray-100 mb-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-rose-500" />
                <span className="text-sm font-bold text-gray-800">
                  실시간 자막 & 피드백
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                <span className="font-medium">LIVE</span>
              </div>
            </div>

            <div
              ref={transcriptRef}
              className="flex-1 overflow-y-auto px-2 pb-4 scrollbar-hide"
            >
              {transcript.map((item) => {
                const isMe =
                  item.speaker === "나" || item.speaker === profile?.name;
                const tokens = isMe
                  ? tokenizeWithIndices(item.text)
                  : [{ token: item.text, index: -1 }];
                const styleError = hasStyleError(item.feedback);

                return (
                  <div
                    key={item.id}
                    className={`flex ${
                      isMe ? "justify-end" : "justify-start"
                    } mb-4`}
                  >
                    <div
                      className={`w-full max-w-[85%] sm:max-w-[75%] ${
                        isMe ? "items-end" : "items-start"
                      } flex flex-col gap-1`}
                    >
                      <div
                        className={`flex items-center gap-2 ${
                          isMe ? "flex-row-reverse justify-end" : ""
                        }`}
                      >
                        <span className="text-xs font-bold text-gray-700">
                          {item.speaker}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {item.timestamp.toLocaleTimeString("ko-KR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div
                        ref={(el) => {
                          bubbleRefs.current[item.id] = el;
                        }}
                        className={`rounded-2xl px-4 py-3 text-[15px] sm:text-base leading-relaxed shadow-sm transition-all
                        ${
                          isMe
                            ? "bg-rose-500 text-white rounded-tr-none"
                            : "bg-white text-gray-800 border border-gray-200 rounded-tl-none"
                        } 
                        ${
                          styleError && isMe
                            ? "ring-2 ring-yellow-300 cursor-pointer hover:ring-4"
                            : ""
                        }
                        ${item.interim ? "opacity-80" : ""}`}
                        onMouseEnter={() =>
                          !isMobile &&
                          styleError &&
                          isMe &&
                          onSentenceInteract(item.id, item.feedback)
                        }
                        onMouseLeave={() => !isMobile && closeTooltip()}
                        onClick={() =>
                          isMobile &&
                          styleError &&
                          isMe &&
                          onSentenceInteract(item.id, item.feedback)
                        }
                      >
                        <div className="whitespace-pre-wrap wrap-break-word">
                          {isMe ? (
                            <span>
                              {tokens.map(({ token, index }, i) => {
                                if (index === -1)
                                  return <span key={i}>{token}</span>;

                                const res = item.feedback
                                  ? isWordErrored(index, item.feedback)
                                  : { errored: false, kind: null };

                                let highlight = "";
                                if (res.kind === "word")
                                  highlight =
                                    "bg-red-400/40 underline decoration-red-200 decoration-2";
                                else if (res.kind === "grammar")
                                  highlight =
                                    "bg-yellow-400/40 underline decoration-yellow-200 decoration-2";
                                else if (res.kind === "spelling")
                                  highlight =
                                    "bg-orange-400/40 underline decoration-orange-200 decoration-2";

                                return (
                                  <span
                                    key={i}
                                    className={`rounded-sm px-0.5 inline-block transition-colors ${highlight} ${
                                      res.errored
                                        ? "cursor-pointer hover:bg-opacity-60"
                                        : ""
                                    }`}
                                    onMouseEnter={() =>
                                      !isMobile &&
                                      res.errored &&
                                      onWordInteract(
                                        item.id,
                                        index,
                                        item.feedback
                                      )
                                    }
                                    onMouseLeave={() =>
                                      !isMobile && closeTooltip()
                                    }
                                    onClick={(e) => {
                                      if (res.errored && isMobile) {
                                        e.stopPropagation();
                                        onWordInteract(
                                          item.id,
                                          index,
                                          item.feedback
                                        );
                                      }
                                    }}
                                  >
                                    {token}
                                  </span>
                                );
                              })}
                            </span>
                          ) : (
                            <span>{item.text}</span>
                          )}
                        </div>
                        {item.isAnalyzing && (
                          <div className="mt-2 flex items-center gap-2 text-white/90 text-xs bg-white/20 rounded-lg px-2 py-1 w-fit animate-pulse">
                            <Sparkles size={12} />
                            <span>분석 중...</span>
                          </div>
                        )}
                        {styleError && isMe && !item.isAnalyzing && (
                          <div className="mt-2 flex items-center gap-1.5 text-yellow-200 bg-yellow-900/20 px-2 py-1 rounded-md border border-yellow-200/30 w-fit">
                            <AlertCircle size={14} />
                            <span className="text-xs font-medium">
                              표현 개선 제안
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Input Area */}
            <div className="border-t border-gray-100 bg-white py-3">
              <div className="max-w-4xl mx-auto w-full px-0 sm:px-6 flex items-center gap-3">
                <div className="flex-1">
                  <input
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="메시지를 입력하세요..."
                    className="w-full rounded-full bg-gray-50 border border-gray-200 px-5 py-3.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-200 transition-all"
                  />
                </div>
                <button
                  onClick={handleSend}
                  className="w-11 h-11 rounded-full bg-rose-500 flex items-center justify-center text-white shadow-md hover:bg-rose-600 transition-colors active:scale-95"
                >
                  <Send className="w-5 h-5 ml-0.5" />
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* User Menu Popup */}
      {menuState && (
        <div
          style={{
            position: "fixed",
            top: menuState.y,
            left: menuState.x,
            transform: "translateX(-50%)",
            zIndex: 9999,
          }}
          className="bg-white rounded-xl shadow-xl border border-gray-100 py-1 min-w-[140px] overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleKickUser}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <UserMinus className="w-4 h-4" />
            강퇴하기
          </button>
        </div>
      )}

      {/* Feedback Card */}
      <FloatingFeedbackCard
        show={Boolean(activeTooltipMsgId)}
        top={cardPos.top}
        left={cardPos.left}
        width={cardPos.width}
        onClose={closeTooltip}
        mobile={isMobile}
        feedback={transcript.find((t) => t.id === activeTooltipMsgId)?.feedback}
        activeWordIndexes={activeTooltipWordIndexes}
        isAbove={cardPos.isAbove}
      />
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
