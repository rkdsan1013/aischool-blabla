// frontend/src/services/voiceroomService.ts
import type { AxiosResponse } from "axios";
import { apiClient, handleApiError, ServiceError } from "../api";

export type VoiceRoomLevel = "ANY" | "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type VoiceRoom = {
  room_id: number;
  name: string;
  description: string;
  level: VoiceRoomLevel;
  max_participants: number;
  current_participants: number;
  host_id: number; // ✅ [추가]
  host_name?: string;
  created_at?: string | null;
  preview_users?: string;
};

// ... (나머지는 기존 코드와 동일)
export type CreateVoiceRoomPayload = {
  name: string;
  description: string;
  level?: VoiceRoomLevel;
  max_participants?: number;
};
export type UpdateVoiceRoomPayload = Partial<CreateVoiceRoomPayload>;
export async function createRoom(
  payload: CreateVoiceRoomPayload
): Promise<VoiceRoom> {
  try {
    const body = {
      ...payload,
      max_participants:
        payload.max_participants !== undefined
          ? Number(payload.max_participants)
          : undefined,
    };
    const res: AxiosResponse<VoiceRoom> = await apiClient.post(
      "/voice-room",
      body
    );
    return res.data;
  } catch (error) {
    handleApiError(error, "보이스룸 생성");
    return Promise.reject();
  }
}
export async function getRooms(params?: {
  page?: number;
  size?: number;
  level?: VoiceRoomLevel;
}): Promise<VoiceRoom[]> {
  try {
    const res: AxiosResponse<VoiceRoom[]> = await apiClient.get("/voice-room", {
      params,
    });
    return res.data;
  } catch (error) {
    handleApiError(error, "보이스룸 목록 조회");
    return Promise.reject();
  }
}
export async function getRoomById(roomId: number): Promise<VoiceRoom> {
  try {
    const res: AxiosResponse<VoiceRoom> = await apiClient.get(
      `/voice-room/${roomId}`
    );
    return res.data;
  } catch (error) {
    handleApiError(error, `보이스룸 조회 (id: ${roomId})`);
    return Promise.reject();
  }
}
export async function updateRoom(
  roomId: number,
  payload: UpdateVoiceRoomPayload
): Promise<VoiceRoom> {
  try {
    const body = {
      ...payload,
      max_participants:
        payload.max_participants !== undefined
          ? Number(payload.max_participants)
          : undefined,
    };
    const res: AxiosResponse<VoiceRoom> = await apiClient.put(
      `/voice-room/${roomId}`,
      body
    );
    return res.data;
  } catch (error) {
    handleApiError(error, `보이스룸 수정 (id: ${roomId})`);
    return Promise.reject();
  }
}
export async function patchRoom(
  roomId: number,
  payload: UpdateVoiceRoomPayload
): Promise<VoiceRoom> {
  try {
    const body = {
      ...payload,
      max_participants:
        payload.max_participants !== undefined
          ? Number(payload.max_participants)
          : undefined,
    };
    const res: AxiosResponse<VoiceRoom> = await apiClient.patch(
      `/voice-room/${roomId}`,
      body
    );
    return res.data;
  } catch (error) {
    handleApiError(error, `보이스룸 부분 수정 (id: ${roomId})`);
    return Promise.reject();
  }
}
export async function deleteRoom(roomId: number): Promise<void> {
  try {
    await apiClient.delete(`/voice-room/${roomId}`);
    return;
  } catch (error) {
    handleApiError(error, `보이스룸 삭제 (id: ${roomId})`);
    return Promise.reject();
  }
}
export function validateCreatePayload(payload: CreateVoiceRoomPayload) {
  if (!payload.name || payload.name.trim().length === 0)
    throw new ServiceError("방 이름을 입력해주세요.");
  if (!payload.description || payload.description.trim().length === 0)
    throw new ServiceError("방 설명을 입력해주세요.");
  if (
    payload.max_participants !== undefined &&
    (!Number.isFinite(payload.max_participants) ||
      payload.max_participants < 2 ||
      payload.max_participants > 8)
  ) {
    throw new ServiceError(
      "최대 참여 인원은 2명 이상 8명 이하의 숫자여야 합니다."
    );
  }
  if (
    payload.level !== undefined &&
    !["ANY", "A1", "A2", "B1", "B2", "C1", "C2"].includes(payload.level)
  ) {
    throw new ServiceError("권장 레벨이 유효하지 않습니다.");
  }
}
const VoiceRoomService = {
  createRoom,
  getRooms,
  getRoomById,
  updateRoom,
  patchRoom,
  deleteRoom,
  validateCreatePayload,
};
export default VoiceRoomService;
