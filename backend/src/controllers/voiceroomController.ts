// backend/src/controllers/voiceroomController.ts
import { Pool } from "mysql2/promise";
import * as service from "../services/voiceroomService";

/** POST /voice-room */
export async function createRoom(
  pool: Pool,
  payload: any,
  user?: { user_id: number; name: string } // ✅ [수정] id 포함
) {
  const hostName = user?.name || "Unknown";
  const hostId = user?.user_id || 0; // Host ID 전달
  return await service.createVoiceRoom(pool, {
    ...payload,
    host_name: hostName,
    host_id: hostId,
  });
}

// ... 나머지 함수들은 기존과 동일 ...
export async function listRooms(pool: Pool, options?: any) {
  return await service.listVoiceRooms(pool, options);
}
export async function getRoomById(pool: Pool, roomId: any) {
  return await service.getVoiceRoomById(pool, roomId);
}
export async function updateRoom(pool: Pool, roomId: any, payload: any) {
  return await service.updateVoiceRoom(pool, roomId, payload);
}
export async function patchRoom(pool: Pool, roomId: any, payload: any) {
  return await service.patchVoiceRoom(pool, roomId, payload);
}
export async function deleteRoom(pool: Pool, roomId: any) {
  return await service.deleteVoiceRoom(pool, roomId);
}
