// backend/src/ai/audio.ts
import fs from "fs";
import path from "path";
import os from "os";
import { openai } from "./client";

/**
 * STT (Speech-to-Text): 오디오 버퍼를 텍스트로 변환
 * Model: whisper-1
 * Cost: Audio duration (seconds)
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
    const startTime = Date.now();

    // 1. 버퍼를 임시 파일로 저장
    fs.writeFileSync(tempFilePath, audioBuffer);

    // 2. OpenAI Whisper API 호출
    // response_format: "verbose_json"을 사용해야 duration(초) 정보를 받을 수 있습니다.
    const response = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-1",
      language: "en",
      response_format: "verbose_json",
    });

    const endTime = Date.now();
    const processTime = endTime - startTime;

    // [AUDIO USAGE LOG] STT는 오디오 길이(초)로 과금됨
    const duration = (response as any).duration; // verbose_json 응답에 포함됨
    console.log(
      `[AUDIO USAGE] [STT] Model: whisper-1 | Process Time: ${processTime}ms | Audio Duration: ${duration}s`
    );

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
 * Cost: Character count
 */
export async function generateSpeech(
  text: string,
  voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" = "alloy"
): Promise<Buffer> {
  try {
    const startTime = Date.now();

    // [AUDIO USAGE LOG] TTS는 글자 수(Length)로 과금됨
    // 요청 전에 길이를 미리 계산
    const charCount = text.length;

    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice,
      input: text,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());

    const endTime = Date.now();
    const processTime = endTime - startTime;

    console.log(
      `[AUDIO USAGE] [TTS] Model: tts-1 | Process Time: ${processTime}ms | Input Chars: ${charCount}`
    );

    return buffer;
  } catch (error) {
    console.error("[AI Audio] TTS Error:", error);
    throw error;
  }
}
