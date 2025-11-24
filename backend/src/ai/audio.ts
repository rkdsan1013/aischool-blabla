// backend/src/ai/audio.ts
import fs from "fs";
import path from "path";
import os from "os";
import { openai } from "./client";

/**
 * STT (Speech-to-Text): 오디오 버퍼를 텍스트로 변환
 * Model: whisper-1
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  fileExtension: string = "webm"
): Promise<string> {
  // 임시 파일 경로 생성
  const tempFilePath = path.join(
    os.tmpdir(),
    `stt_${Date.now()}_${Math.random()
      .toString(36)
      .substring(7)}.${fileExtension}`
  );

  try {
    // 1. 버퍼를 임시 파일로 저장
    fs.writeFileSync(tempFilePath, audioBuffer);

    // 2. OpenAI Whisper API 호출
    const response = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-1",
      language: "en", // 필요시 파라미터로 분리 가능
    });

    return response.text.trim();
  } catch (error) {
    console.error("[AI Audio] Transcribe Error:", error);
    throw error;
  } finally {
    // 3. 임시 파일 삭제 (Cleanup)
    try {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    } catch (cleanupErr) {
      console.warn("[AI Audio] Failed to delete temp file:", cleanupErr);
    }
  }
}

/**
 * TTS (Text-to-Speech): 텍스트를 오디오 버퍼로 변환
 * Model: tts-1
 */
export async function generateSpeech(
  text: string,
  voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" = "alloy"
): Promise<Buffer> {
  try {
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice,
      input: text,
    });

    // ArrayBuffer -> Buffer 변환
    return Buffer.from(await mp3.arrayBuffer());
  } catch (error) {
    console.error("[AI Audio] TTS Error:", error);
    throw error;
  }
}
