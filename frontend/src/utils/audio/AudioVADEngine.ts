// frontend/src/utils/audio/AudioVADEngine.ts

// Safari 호환을 위한 타입 확장
type SafariWindow = Window &
  typeof globalThis & {
    webkitAudioContext: typeof AudioContext;
  };

export interface VADOptions {
  onSpeechStart: () => void;
  onSpeechEnd: () => void;
  onVolumeChange?: (volume: number) => void;
  silenceDuration?: number;
  minVolumeThreshold?: number;
  // ✅ 잡음 방지용 옵션 (기본값 10으로 상향 조정 예정)
  minSpeechFrames?: number;
}

export class AudioVADEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private filter: BiquadFilterNode | null = null;

  private isTalking = false;
  private silenceStartTimestamp: number | null = null;
  private rafId: number | null = null;

  // ✅ 발화 지속 카운터 (잡음 필터링용)
  private speechActiveCounter = 0;

  private options: VADOptions;

  constructor(options: VADOptions) {
    this.options = {
      silenceDuration: 1500, // 1.5초 침묵 시 종료
      minVolumeThreshold: 0.02, // 볼륨 임계값

      // ✅ [핵심 수정] 기본값을 10으로 설정 (약 0.2초 지속되어야 발화로 인정)
      // 마우스 클릭, 키보드 소리 등 짧은 잡음은 이 횟수를 채우지 못해 무시됨
      minSpeechFrames: 10,

      ...options,
    };
  }

  async start() {
    if (this.audioContext) return;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as SafariWindow).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      await this.audioContext.resume();

      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;

      // 사람 목소리 대역만 통과시키는 필터 (저주파 소음 차단)
      this.filter = this.audioContext.createBiquadFilter();
      this.filter.type = "highpass";
      this.filter.frequency.value = 100;

      this.source.connect(this.filter);
      this.filter.connect(this.analyser);

      this.detect();
    } catch (err) {
      console.error("VAD Start Error:", err);
      throw err;
    }
  }

  private detect() {
    if (!this.analyser) return;

    const bufferLength = this.analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);
    this.analyser.getFloatTimeDomainData(dataArray);

    let sumSquares = 0;
    for (let i = 0; i < bufferLength; i++) {
      sumSquares += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sumSquares / bufferLength);

    if (this.options.onVolumeChange) {
      this.options.onVolumeChange(rms * 100);
    }

    const threshold = this.options.minVolumeThreshold!;
    const minFrames = this.options.minSpeechFrames!;

    // ✅ 발화 감지 및 잡음 제거 로직
    if (rms > threshold) {
      // 소리가 임계값을 넘음
      this.silenceStartTimestamp = null; // 침묵 타이머 리셋

      if (!this.isTalking) {
        // 아직 말하는 중이 아니라면 카운터 증가 (진짜 말인지 확인 중)
        this.speechActiveCounter++;

        // ✅ 연속으로 10프레임(약 0.2초) 이상 큰 소리가 유지되어야 비로소 발화 시작
        if (this.speechActiveCounter > minFrames) {
          this.isTalking = true;
          this.options.onSpeechStart();
        }
      } else {
        // 이미 말하고 있는 상태라면 카운터 유지 (안전장치)
        this.speechActiveCounter = minFrames + 1;
      }
    } else {
      // 소리가 작음 (침묵 or 잡음 끝)
      this.speechActiveCounter = 0; // ✅ 카운터 즉시 초기화 -> 짧은 잡음은 여기서 걸러짐

      if (this.isTalking) {
        if (this.silenceStartTimestamp === null) {
          this.silenceStartTimestamp = Date.now();
        } else {
          const silenceDuration = Date.now() - this.silenceStartTimestamp;
          // 일정 시간(1.5초) 이상 침묵이 유지되어야 발화 종료로 판단
          if (silenceDuration > this.options.silenceDuration!) {
            this.isTalking = false;
            this.silenceStartTimestamp = null;
            this.options.onSpeechEnd();
          }
        }
      }
    }

    this.rafId = requestAnimationFrame(() => this.detect());
  }

  stop() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.source) this.source.disconnect();
    if (this.filter) this.filter.disconnect();
    if (this.analyser) this.analyser.disconnect();
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
    }
    if (this.audioContext) {
      this.audioContext.close();
    }

    this.audioContext = null;
    this.analyser = null;
    this.mediaStream = null;
    this.isTalking = false;
    this.speechActiveCounter = 0;
  }

  getStream() {
    return this.mediaStream;
  }
}
