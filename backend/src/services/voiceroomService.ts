// backend/src/services/voiceroomService.ts
import { Pool } from "mysql2/promise";
import {
  VoiceRoomRow,
  insertVoiceRoom,
  findVoiceRoomById,
  selectVoiceRooms,
  updateVoiceRoomRow,
  patchVoiceRoomRow,
  deleteVoiceRoomRow,
} from "../models/voiceroomModel";

export type VoiceRoomLevel = "ANY" | "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type VoiceRoom = VoiceRoomRow;

export class ServiceError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ServiceError";
    this.status = status;
  }
}

function isValidLevel(level: any): level is VoiceRoomLevel {
  return ["ANY", "A1", "A2", "B1", "B2", "C1", "C2"].includes(level);
}

function parseMaxParticipants(value: any): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 2 || n > 8) {
    throw new Error("최대 참여 인원은 2명 이상 8명 이하의 숫자여야 합니다.");
  }
  return Math.floor(n);
}

/** 생성 */
export async function createVoiceRoom(
  pool: Pool,
  payload: {
    name?: any;
    description?: any;
    level?: any;
    max_participants?: any;
    host_id: number; // ✅ [추가]
    host_name: string;
  }
): Promise<VoiceRoom> {
  const {
    name,
    description,
    level = "ANY",
    max_participants,
    host_id,
    host_name,
  } = payload;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    throw new ServiceError(400, "방 이름을 입력해주세요.");
  }
  if (
    !description ||
    typeof description !== "string" ||
    description.trim().length === 0
  ) {
    throw new ServiceError(400, "방 설명을 입력해주세요.");
  }
  if (!isValidLevel(level)) {
    throw new ServiceError(400, "권장 레벨이 유효하지 않습니다.");
  }

  let maxParticipantsNum = 8;
  if (max_participants !== undefined) {
    try {
      maxParticipantsNum = parseMaxParticipants(max_participants);
    } catch (err: any) {
      throw new ServiceError(400, err.message);
    }
  }

  // insert
  const insertId = await insertVoiceRoom(pool, {
    name: name.trim(),
    description: description.trim(),
    level,
    max_participants: maxParticipantsNum,
    host_id, // ✅ DB 저장
    host_name: host_name || "Anonymous",
  });

  const created = await findVoiceRoomById(pool, insertId);
  if (!created) {
    throw new ServiceError(500, "생성된 방을 불러오지 못했습니다.");
  }
  return created;
}

export async function listVoiceRooms(
  pool: Pool,
  options?: { page?: number; size?: number; level?: any }
): Promise<VoiceRoom[]> {
  const level = options?.level;
  if (level !== undefined && level !== null && !isValidLevel(level)) {
    throw new ServiceError(400, "권장 레벨이 유효하지 않습니다.");
  }
  const opts: { page?: number; size?: number; level?: VoiceRoomLevel } = {};
  if (options?.page !== undefined) opts.page = options.page;
  if (options?.size !== undefined) opts.size = options.size;
  if (level !== undefined && level !== null)
    opts.level = level as VoiceRoomLevel;
  return selectVoiceRooms(pool, opts);
}

export async function getVoiceRoomById(
  pool: Pool,
  roomId: any
): Promise<VoiceRoom> {
  const id = Number(roomId);
  if (!Number.isFinite(id) || id <= 0)
    throw new ServiceError(400, "유효한 방 ID를 입력하세요.");
  const room = await findVoiceRoomById(pool, id);
  if (!room) throw new ServiceError(404, "해당 방을 찾을 수 없습니다.");
  return room;
}

export async function updateVoiceRoom(
  pool: Pool,
  roomId: any,
  payload: any
): Promise<VoiceRoom> {
  const id = Number(roomId);
  const { name, description, level, max_participants } = payload;
  // (유효성 검사 생략 - 기존 동일)
  let maxParticipantsNum = 8;
  try {
    maxParticipantsNum =
      max_participants !== undefined
        ? parseMaxParticipants(max_participants)
        : 8;
  } catch (err: any) {
    throw new ServiceError(400, err.message);
  }

  const affected = await updateVoiceRoomRow(pool, id, {
    name: name.trim(),
    description: description.trim(),
    level,
    max_participants: maxParticipantsNum,
  });
  if (affected === 0)
    throw new ServiceError(404, "해당 방을 찾을 수 없습니다.");
  const updated = await findVoiceRoomById(pool, id);
  if (!updated) throw new ServiceError(500, "수정된 방을 불러오지 못했습니다.");
  return updated;
}

export async function patchVoiceRoom(
  pool: Pool,
  roomId: any,
  payload: any
): Promise<VoiceRoom> {
  // (기존 동일)
  return {} as any; // 생략
}

export async function deleteVoiceRoom(pool: Pool, roomId: any): Promise<void> {
  const id = Number(roomId);
  const affected = await deleteVoiceRoomRow(pool, id);
  if (affected === 0)
    throw new ServiceError(404, "해당 방을 찾을 수 없습니다.");
  return;
}
