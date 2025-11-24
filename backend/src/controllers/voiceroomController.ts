// backend/src/controllers/voiceroomController.ts
import { Pool } from "mysql2/promise";
import * as service from "../services/voiceroomService";

/** POST /voice-room */
export async function createRoom(
  pool: Pool,
  payload: any,
  user?: { name: string } // ✅ [수정] 유저 정보 수신
) {
  const hostName = user?.name || "Unknown";
  return await service.createVoiceRoom(pool, {
    ...payload,
    host_name: hostName,
  });
}

/** GET /voice-room */
export async function listRooms(pool: Pool, options?: any) {
  return await service.listVoiceRooms(pool, options);
}

/** GET /voice-room/:id */
export async function getRoomById(pool: Pool, roomId: any) {
  return await service.getVoiceRoomById(pool, roomId);
}

/** PUT /voice-room/:id */
export async function updateRoom(pool: Pool, roomId: any, payload: any) {
  return await service.updateVoiceRoom(pool, roomId, payload);
}

/** PATCH /voice-room/:id */
export async function patchRoom(pool: Pool, roomId: any, payload: any) {
  return await service.patchVoiceRoom(pool, roomId, payload);
}

/** DELETE /voice-room/:id */
export async function deleteRoom(pool: Pool, roomId: any) {
  return await service.deleteVoiceRoom(pool, roomId);
}
