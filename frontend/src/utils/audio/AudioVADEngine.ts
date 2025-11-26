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

  private options: VADOptions;

  constructor(options: VADOptions) {
    this.options = {
      silenceDuration: 1500,
      minVolumeThreshold: 0.02,
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

      // ✅ [수정] 타입 단언을 구체적으로 변경
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as SafariWindow).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      await this.audioContext.resume();

      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;

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

    if (rms > threshold) {
      this.silenceStartTimestamp = null;
      if (!this.isTalking) {
        this.isTalking = true;
        this.options.onSpeechStart();
      }
    } else {
      if (this.isTalking) {
        if (this.silenceStartTimestamp === null) {
          this.silenceStartTimestamp = Date.now();
        } else {
          const silenceDuration = Date.now() - this.silenceStartTimestamp;
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
  }

  getStream() {
    return this.mediaStream;
  }
}
