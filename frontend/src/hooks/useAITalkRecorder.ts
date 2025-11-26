// frontend/src/hooks/useAITalkRecorder.ts
import { useRef, useState, useCallback, useEffect } from "react";
import { AudioVADEngine } from "../utils/audio/AudioVADEngine";

export function useAITalkRecorder(onAudioCaptured: (blob: Blob) => void) {
  const vadRef = useRef<AudioVADEngine | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const [isTalking, setIsTalking] = useState(false);

  const stop = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (vadRef.current) {
      vadRef.current.stop();
      vadRef.current = null;
    }
    setIsRecording(false);
    setIsTalking(false);
  }, []);

  const start = useCallback(async () => {
    if (isRecording) return;

    try {
      const vad = new AudioVADEngine({
        silenceDuration: 1500,
        minVolumeThreshold: 0.015,
        onSpeechStart: () => {
          setIsTalking(true);
          console.log("🗣️ 발화 감지 시작");
        },
        onSpeechEnd: () => {
          setIsTalking(false);
          console.log("🤫 발화 종료 -> 전송");
          stop(); // ✅ 의존성 배열에 stop 추가로 해결됨
        },
      });

      await vad.start();
      vadRef.current = vad;

      const stream = vad.getStream();
      if (!stream) throw new Error("Stream not found");

      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size > 3000) {
          onAudioCaptured(blob);
        }
        chunksRef.current = [];
      };

      recorder.start();
      setIsRecording(true);
    } catch (e) {
      console.error("Recorder start failed", e);
    }
  }, [isRecording, onAudioCaptured, stop]); // ✅ stop 추가

  useEffect(() => {
    return () => {
      if (vadRef.current) vadRef.current.stop();
    };
  }, []);

  return { isRecording, isTalking, start, stop };
}
