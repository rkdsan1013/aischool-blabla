// frontend/src/pages/VoiceRoomDetail.tsx
// cspell:ignore voiceroom

// ----------------------------------------------------------------------
// [Critical Fix] Advanced Polyfill for simple-peer
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
// ----------------------------------------------------------------------

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
} from "lucide-react";
import io, { Socket } from "socket.io-client";
import Peer from "simple-peer";
import VoiceRoomService, { type VoiceRoom } from "../services/voiceroomService";
import FloatingFeedbackCard from "../components/FloatingFeedbackCard";
import { useProfile } from "../hooks/useProfile";
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
}

interface UserInfo {
  userId: number;
  name: string;
  isMuted?: boolean;
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

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    [key: number]: {
      isFinal: boolean;
      [key: number]: { transcript: string };
      length: number;
    };
    length: number;
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

interface ISpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
}

type SafariWindow = Window &
  typeof globalThis & {
    webkitAudioContext: typeof AudioContext;
    webkitSpeechRecognition?: new () => ISpeechRecognition;
    SpeechRecognition?: new () => ISpeechRecognition;
  };

/* ----------------------------- Static Helpers ----------------------------- */

const SPEECH_THRESHOLD = 0.02;
const SPEECH_HOLD_TIME = 1000;
const TOOLTIP_GAP_BELOW = 12;
const TOOLTIP_GAP_ABOVE = 6;

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

  // [API 연동 대기] 주석 처리된 Recorder
  // const recorderRef = useRef<MediaRecorder | null>(null);

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const interimIdRef = useRef<string | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const participantsRef = useRef<HTMLDivElement | null>(null);
  const bubbleRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const transcriptIdsRef = useRef<Set<string>>(new Set());

  // --- State ---
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("방 접속 준비 중...");
  const [roomInfo, setRoomInfo] = useState<{ name: string } | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [sessionTime, setSessionTime] = useState(0);
  const [inputText, setInputText] = useState("");

  // Tooltip
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

  const isMobile = isMobileUA();

  // Sync Refs
  const isMutedRef = useRef(isMuted);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const profileRef = useRef(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  // Global Error Handler
  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      if (
        e.message &&
        (e.message.includes("_readableState") ||
          e.message.includes("process.nextTick"))
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return true;
      }
    };
    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  // --- Transcript Helpers ---
  const addOrUpdateTranscript = useCallback((item: TranscriptItem) => {
    setTranscript((prev) => {
      if (transcriptIdsRef.current.has(item.id)) {
        return prev.map((t) => (t.id === item.id ? { ...t, ...item } : t));
      }
      transcriptIdsRef.current.add(item.id);
      return [...prev, item];
    });
  }, []);

  /*
  // [API 연동 대기] 추후 서버 API 연동 시 주석 해제하여 사용
  const sendTranscriptToServer = useCallback(
    async (item: {
      id: string;
      speaker?: string;
      text: string;
      timestamp?: Date | string;
      feedback?: FeedbackPayload | null;
    }) => {
      if (!roomId) return;
      try {
        await fetch(`/voice-room/${roomId}/transcript`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: item.id,
            speaker: item.speaker || (profile ? profile.name : "unknown"),
            text: item.text,
            timestamp: item.timestamp
              ? new Date(item.timestamp).toISOString()
              : new Date().toISOString(),
            feedback: item.feedback || null,
          }),
        });
      } catch {
        // silent fail
      }
    },
    [roomId, profile]
  );
  */

  /* ------------------ Audio Analyzer (VAD) ------------------ */
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

  /* ------------------ Local Speech Recognition ------------------ */
  const startLocalRecognition = useCallback(() => {
    const w = window as unknown as SafariWindow;
    const RecognitionClass = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!RecognitionClass) return;
    if (recognitionRef.current) return;

    try {
      const recognition = new RecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setParticipants((prev) =>
          prev.map((p) =>
            p.socketId === "me" ? { ...p, isSpeaking: true } : p
          )
        );
      };

      recognition.onend = () => {
        setParticipants((prev) =>
          prev.map((p) =>
            p.socketId === "me" ? { ...p, isSpeaking: false } : p
          )
        );
        // Restart if not muted and socket is active
        if (!isMutedRef.current && (socketRef.current?.connected ?? true)) {
          setTimeout(() => {
            try {
              recognition.start();
            } catch {
              /* ignore */
            }
          }, 200);
        }
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = "";
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        if (interimTranscript.trim().length > 0) {
          const interimId = interimIdRef.current || `interim-me`;
          interimIdRef.current = interimId;
          const item: TranscriptItem = {
            id: interimId,
            speaker: "나",
            text: interimTranscript,
            timestamp: new Date(),
            interim: true,
          };
          setTranscript((prev) => {
            const exists = prev.find((t) => t.id === interimId);
            if (exists) {
              return prev.map((t) => (t.id === interimId ? item : t));
            } else {
              transcriptIdsRef.current.add(interimId);
              return [...prev, item];
            }
          });
        }

        if (finalTranscript.trim().length > 0) {
          const finalItem: TranscriptItem = {
            id: makeId(),
            speaker: "나",
            text: finalTranscript.trim(),
            timestamp: new Date(),
            interim: false,
          };
          setTranscript((prev) => {
            const filtered = interimIdRef.current
              ? prev.filter((t) => t.id !== interimIdRef.current)
              : prev;
            if (interimIdRef.current) {
              transcriptIdsRef.current.delete(interimIdRef.current);
            }
            interimIdRef.current = null;
            transcriptIdsRef.current.add(finalItem.id);
            return [...filtered, finalItem];
          });

          socketRef.current?.emit("local_transcript", {
            id: finalItem.id,
            speaker: profileRef.current ? profileRef.current.name : "나",
            text: finalItem.text,
            timestamp: new Date().toISOString(),
          });
        }
      };

      recognitionRef.current = recognition;
      if (!isMutedRef.current) {
        try {
          recognition.start();
        } catch {
          /* ignore */
        }
      }
    } catch (e) {
      console.warn("Failed to initialize SpeechRecognition", e);
      recognitionRef.current = null;
    }
  }, []); // [Fix] Empty dependency array (stable logic)

  const stopLocalRecognition = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      rec.onresult = null;
      rec.onend = null;
      rec.onstart = null;
      rec.onerror = null;
      rec.stop();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
    if (interimIdRef.current) {
      const idToRemove = interimIdRef.current;
      setTranscript((prev) => prev.filter((t) => t.id !== idToRemove));
      transcriptIdsRef.current.delete(idToRemove);
      interimIdRef.current = null;
    }
  }, []);

  /* ------------------ Main Effect ------------------ */
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

        // Initial hardware mute check
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
        });

        socket.on("connect_error", (err) => {
          console.error("❌ Socket Error:", err);
          if (isMounted) setStatusMessage("서버 연결 실패... 재시도 중");
        });

        // --- Helpers for Socket Events ---
        const createPeer = (
          targetId: string,
          initiator: boolean,
          stream: MediaStream
        ) => {
          const peer = new Peer({ initiator, trickle: false, stream });

          peer.on("signal", (signal) => {
            if (initiator) {
              const payload: SignalPayload = {
                userToSignal: targetId,
                callerID: socket.id || "",
                signal,
                userInfo: {
                  userId: profile.user_id,
                  name: profile.name,
                  isMuted: isMutedRef.current,
                },
              };
              socketRef.current?.emit("sending_signal", payload);
            } else {
              socketRef.current?.emit("returning_signal", {
                signal,
                callerID: targetId,
              });
            }
          });

          peer.on("stream", (remoteStream) => {
            updateParticipantStreamRef.current(targetId, remoteStream);
          });

          peer.on("error", (err) => {
            console.warn(`Peer error with ${targetId}:`, err);
          });

          return peer;
        };

        // 1. Existing Users
        socket.on(
          "all_users",
          (
            users: Array<{
              socketId: string;
              userId: number;
              name: string;
              isMuted?: boolean;
            }>
          ) => {
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
              const uniqueNew = newParticipants.filter(
                (np) => !prev.some((p) => p.socketId === np.socketId)
              );
              return [...prev, ...uniqueNew];
            });
          }
        );

        // 2. New User Joined
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
          if (peerObj) {
            try {
              peerObj.peer.destroy();
            } catch {
              /* safe destroy */
            }
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

        socket.on("room_full", () => {
          alert("방이 꽉 찼습니다.");
          navigate("/voiceroom");
        });

        socket.on("transcript_item", (item: TranscriptItem) => {
          const normalized: TranscriptItem = {
            ...item,
            timestamp: new Date(item.timestamp),
            interim: false,
          };
          if (interimIdRef.current) {
            const idToRemove = interimIdRef.current;
            setTranscript((prev) => prev.filter((t) => t.id !== idToRemove));
            transcriptIdsRef.current.delete(idToRemove);
            interimIdRef.current = null;
          }
          addOrUpdateTranscript(normalized);
        });

        socket.on(
          "feedback_update",
          (payload: { id: string; feedback: FeedbackPayload }) => {
            setTranscript((prev) =>
              prev.map((t) =>
                t.id === payload.id ? { ...t, feedback: payload.feedback } : t
              )
            );
          }
        );

        startLocalRecognition();
      } catch (err) {
        console.error("🚨 Init Error:", err);
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
      stopLocalRecognition();

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      peersRef.current.forEach(({ peer }) => {
        try {
          peer.destroy();
        } catch {
          /* safe */
        }
      });
      peersRef.current = [];

      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        audioContextRef.current.close();
      }

      analyzersRef.clear();
      transcriptIds.clear();

      /*
      // [API 연동 대기]
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        try { recorderRef.current.stop(); } catch { }
      }
      recorderRef.current = null;
      */
    };
  }, [
    roomId,
    profile,
    isProfileLoading,
    navigate,
    startAudioAnalysis,
    startLocalRecognition,
    stopLocalRecognition,
    addOrUpdateTranscript,
  ]);

  /* ------------------ Mute Toggle ------------------ */
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

      if (isMuted) {
        stopLocalRecognition();
      } else {
        startLocalRecognition();
      }
    }
  }, [isMuted, startLocalRecognition, stopLocalRecognition]);

  /* ------------------ Scroll & Timer ------------------ */
  useEffect(() => {
    setTranscript([]);
    transcriptIdsRef.current.clear();
    const t = setInterval(() => setSessionTime((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [transcript.length]);

  /* ------------------ Handlers ------------------ */
  const handleLeaveRoom = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    stopLocalRecognition();
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
    };
    addOrUpdateTranscript(newTranscript);
    setInputText("");

    // 1. 소켓 전송 (실시간 공유)
    socketRef.current?.emit("local_transcript", {
      id: finalId,
      speaker: profileRef.current ? profileRef.current.name : "나",
      text: text,
      timestamp: new Date().toISOString(),
    });

    /*
    // [API 연동 대기]
    sendTranscriptToServer({
      id: finalId,
      speaker: newTranscript.speaker,
      text: newTranscript.text,
      timestamp: newTranscript.timestamp,
    });
    */
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Tooltip positioning
  const updateCardPosition = useCallback((msgId: string) => {
    const node = bubbleRefs.current[msgId];
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    const desiredWidth = Math.min(rect.width, viewportW * 0.92);
    const center = rect.left + rect.width / 2;
    let left = center - desiredWidth / 2;
    left = Math.max(8, Math.min(left, viewportW - desiredWidth - 8));

    const estimatedCardHeight = 160;
    const spaceBelow = viewportH - rect.bottom;
    const spaceAbove = rect.top;

    let top: number;
    let isAbove = false;

    if (spaceBelow >= estimatedCardHeight + TOOLTIP_GAP_BELOW) {
      top = rect.bottom + TOOLTIP_GAP_BELOW;
      isAbove = false;
    } else if (spaceAbove >= estimatedCardHeight + TOOLTIP_GAP_ABOVE) {
      isAbove = true;
      top = rect.top - TOOLTIP_GAP_ABOVE;
    } else {
      isAbove = spaceAbove >= spaceBelow;
      if (isAbove) {
        top = rect.top - TOOLTIP_GAP_ABOVE;
      } else {
        const maxAllowedTop = Math.max(8, viewportH - estimatedCardHeight - 8);
        top = Math.min(rect.bottom + TOOLTIP_GAP_BELOW, maxAllowedTop);
      }
    }
    setCardPos({ top, left, width: desiredWidth, isAbove });
    if (rect.bottom < 0 || rect.top > viewportH) closeTooltip();
  }, []);

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
    updateCardPosition(msgId);
  }

  function onSentenceInteract(msgId: string, feedback?: FeedbackPayload) {
    if (!feedback) return;
    if (!hasStyleError(feedback)) return;
    setActiveTooltipMsgId(msgId);
    setActiveTooltipWordIndexes([]);
    updateCardPosition(msgId);
  }

  function closeTooltip() {
    setActiveTooltipMsgId(null);
    setActiveTooltipWordIndexes([]);
  }

  useEffect(() => {
    function onScroll() {
      if (activeTooltipMsgId) updateCardPosition(activeTooltipMsgId);
    }
    function onResize() {
      if (activeTooltipMsgId) updateCardPosition(activeTooltipMsgId);
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
  }, [activeTooltipMsgId, updateCardPosition]);

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
      <header className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-gray-200 flex-shrink-0">
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
                  : "bg-gray-50 text-gray-500"
              } hover:brightness-95`}
              style={{ width: 40, height: 40 }}
            >
              <Volume2 className="w-5 h-5" />
            </button>
            <button
              onClick={toggleMute}
              className={`p-2.5 rounded-full flex items-center justify-center ${
                isMuted ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-700"
              } hover:brightness-95`}
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

      {/* Hidden Audios */}
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0">
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 pt-4 pb-0 flex-1 flex flex-col gap-4">
          {/* Participants List */}
          <div className="w-full border-b border-gray-100">
            <div
              ref={participantsRef}
              className="flex gap-3 overflow-x-auto py-3 px-3 no-scrollbar"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {participants.map((p) => (
                <div key={p.socketId} className="flex-none w-20 text-center">
                  <div className="relative mx-auto w-14 h-14">
                    {p.isSpeaking && (
                      <div className="absolute inset-0 rounded-full ring-4 ring-rose-400 ring-opacity-60 animate-pulse" />
                    )}
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold shadow-md ${
                        p.socketId === "me" ? "bg-rose-500" : "bg-gray-300"
                      }`}
                    >
                      {p.name.charAt(0)}
                    </div>
                    {/* Mute Icon Overlay */}
                    {p.isMuted && (
                      <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-1 border-2 border-white shadow-sm flex items-center justify-center">
                        <MicOff className="w-3 h-3 text-white" />
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

          {/* Transcript Area */}
          <section className="flex-1 relative min-h-0">
            <div className="flex items-center justify-between px-1 py-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-rose-500" />
                <span className="text-sm font-bold">
                  실시간 자막 & AI 피드백
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-rose-600">
                <div className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse" />
                <span className="font-medium">LIVE</span>
              </div>
            </div>

            <div
              ref={transcriptRef}
              className="absolute inset-x-0 top-[56px] overflow-y-auto px-3"
              style={{
                bottom: 92,
                paddingBottom: 12,
                background: "white",
              }}
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
                      className={`w-full max-w-[90%] ${
                        isMe ? "items-end" : "items-start"
                      } flex flex-col gap-2`}
                    >
                      <div
                        className={`flex items-center gap-2 ${
                          isMe ? "flex-row-reverse justify-end" : ""
                        }`}
                      >
                        <span className="text-xs font-medium text-gray-600">
                          {item.speaker}
                        </span>
                        <span className="text-xs text-gray-400">
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
                        className={`${
                          isMe
                            ? "bg-rose-500 text-white"
                            : "bg-gray-100 text-gray-900"
                        } rounded-2xl p-3 ${
                          styleError && isMe ? "ring-2 ring-yellow-300" : ""
                        } ${item.interim ? "opacity-80 italic" : ""}`}
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
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {isMe ? (
                            <span>
                              {tokens.map(({ token, index }, i) => {
                                if (index === -1)
                                  return (
                                    <span key={`${item.id}-ws-${i}`}>
                                      {token}
                                    </span>
                                  );
                                const res = item.feedback
                                  ? isWordErrored(index, item.feedback)
                                  : { errored: false, kind: null };
                                const highlight =
                                  res.kind === "word"
                                    ? "bg-blue-600/30 underline decoration-2 underline-offset-2"
                                    : res.kind === "grammar"
                                    ? "bg-purple-600/30 underline decoration-dotted"
                                    : res.kind === "spelling"
                                    ? "bg-orange-500/30 underline decoration-wavy"
                                    : "";

                                return (
                                  <span
                                    key={`${item.id}-w-${index}`}
                                    className={`rounded-sm px-0.5 inline-block ${highlight} ${
                                      res.errored ? "cursor-pointer" : ""
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
                                    onClick={() =>
                                      isMobile &&
                                      res.errored &&
                                      onWordInteract(
                                        item.id,
                                        index,
                                        item.feedback
                                      )
                                    }
                                  >
                                    {token}
                                  </span>
                                );
                              })}
                            </span>
                          ) : (
                            <span>{item.text}</span>
                          )}
                        </p>
                        {styleError && isMe && (
                          <div className="mt-2 flex items-center gap-2 text-yellow-900">
                            <AlertCircle size={16} />
                            <span className="text-[13px]">
                              문장 전체 스타일 개선 필요
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input Footer */}
            <div
              className="absolute left-0 right-0 bottom-0 border-t border-gray-100 bg-white flex items-center"
              style={{ height: 92, padding: 0, boxShadow: "none" }}
            >
              <div className="max-w-4xl mx-auto w-full px-0 sm:px-6 flex items-center gap-3">
                <div className="flex-1">
                  <input
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="메시지를 입력하세요..."
                    className="w-full rounded-xl bg-gray-50 border border-gray-200 px-5 py-4 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-200"
                  />
                </div>
                <button
                  onClick={handleSend}
                  className="w-12 h-12 rounded-full bg-rose-500 flex items-center justify-center text-white shadow-md hover:bg-rose-600"
                >
                  <Send className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

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

      <style>
        {`@keyframes ringPulse {
            0% { box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.40); }
            70% { box-shadow: 0 0 0 14px rgba(244, 63, 94, 0.00); }
            100% { box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.00); }
          }`}
      </style>
    </div>
  );
}

/* ----------------------------- AudioPlayer ----------------------------- */

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
