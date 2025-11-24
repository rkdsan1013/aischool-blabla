import { Pool } from "mysql2/promise";
import { RowDataPacket, ResultSetHeader } from "mysql2";

/**
 * DB 레이어: SQL 실행만 담당
 * - pool을 주입받아 쿼리 실행 후 결과를 반환합니다.
 * - 비즈니스 유효성 검사는 서비스 레이어에서 수행하세요.
 */

export type VoiceRoomLevel = "ANY" | "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type VoiceRoomRow = {
  room_id: number;
  name: string;
  description: string;
  level: VoiceRoomLevel;
  max_participants: number;
  current_participants: number;
  created_at: string | null;
};

export async function insertVoiceRoom(
  pool: Pool,
  payload: {
    name: string;
    description: string;
    level: VoiceRoomLevel;
    max_participants: number;
  }
): Promise<number> {
  const conn = await pool.getConnection();
  try {
    const [result] = (await conn.execute(
      `INSERT INTO voice_room (name, description, level, max_participants, current_participants)
       VALUES (?, ?, ?, ?, 0)`,
      [
        payload.name,
        payload.description,
        payload.level,
        payload.max_participants,
      ]
    )) as unknown as [ResultSetHeader, any];
    return result.insertId;
  } finally {
    conn.release();
  }
}

export async function findVoiceRoomById(
  pool: Pool,
  roomId: number
): Promise<VoiceRoomRow | null> {
  const conn = await pool.getConnection();
  try {
    const [rows] = (await conn.execute(
      `SELECT room_id, name, description, level, max_participants, current_participants, created_at
       FROM voice_room WHERE room_id = ?`,
      [roomId]
    )) as unknown as [RowDataPacket[] & VoiceRoomRow[], any];
    return rows[0] ?? null;
  } finally {
    conn.release();
  }
}

// ✅ [수정] LIMIT/OFFSET 파라미터 바인딩 문제 해결
export async function selectVoiceRooms(
  pool: Pool,
  options?: { page?: number; size?: number; level?: VoiceRoomLevel }
): Promise<VoiceRoomRow[]> {
  // 입력값 정수 변환 및 안전성 확보
  const page = Math.max(1, Math.floor(Number(options?.page || 1)));
  const size = Math.min(
    100,
    Math.max(1, Math.floor(Number(options?.size || 20)))
  );
  const offset = (page - 1) * size;

  const conn = await pool.getConnection();
  try {
    let sql = `
        SELECT room_id, name, description, level, max_participants, current_participants, created_at
        FROM voice_room
      `;
    const params: any[] = [];

    // 레벨 필터링 (ANY가 아닐 때만 조건 추가)
    if (options?.level && options.level !== "ANY") {
      sql += ` WHERE level = ? `;
      params.push(options.level);
    }

    // [Critical Fix] LIMIT와 OFFSET은 ? 대신 직접 정수를 주입합니다.
    // execute() 사용 시 LIMIT ? 문법에서 타입 에러가 빈번하게 발생하기 때문입니다.
    sql += ` ORDER BY created_at DESC LIMIT ${size} OFFSET ${offset}`;

    const [rows] = (await conn.execute(sql, params)) as unknown as [
      RowDataPacket[] & VoiceRoomRow[],
      any
    ];
    return rows;
  } catch (err: unknown) {
    const stackOrMessage =
      err instanceof Error ? err.stack ?? err.message : String(err);
    console.error("[selectVoiceRooms] SQL execution error:", stackOrMessage);
    throw err;
  } finally {
    conn.release();
  }
}

export async function updateVoiceRoomRow(
  pool: Pool,
  roomId: number,
  payload: {
    name: string;
    description: string;
    level: VoiceRoomLevel;
    max_participants: number;
  }
): Promise<number> {
  const conn = await pool.getConnection();
  try {
    const [result] = (await conn.execute(
      `UPDATE voice_room
       SET name = ?, description = ?, level = ?, max_participants = ?
       WHERE room_id = ?`,
      [
        payload.name,
        payload.description,
        payload.level,
        payload.max_participants,
        roomId,
      ]
    )) as unknown as [ResultSetHeader, any];
    return result.affectedRows;
  } finally {
    conn.release();
  }
}

export async function patchVoiceRoomRow(
  pool: Pool,
  roomId: number,
  updates: { sql: string; params: any[] }
): Promise<number> {
  const conn = await pool.getConnection();
  try {
    const sql = `UPDATE voice_room SET ${updates.sql} WHERE room_id = ?`;
    const params = [...updates.params, roomId];
    const [result] = (await conn.execute(sql, params)) as unknown as [
      ResultSetHeader,
      any
    ];
    return result.affectedRows;
  } finally {
    conn.release();
  }
}

export async function deleteVoiceRoomRow(
  pool: Pool,
  roomId: number
): Promise<number> {
  const conn = await pool.getConnection();
  try {
    const [result] = (await conn.execute(
      `DELETE FROM voice_room WHERE room_id = ?`,
      [roomId]
    )) as unknown as [ResultSetHeader, any];
    return result.affectedRows;
  } finally {
    conn.release();
  }
}

export async function incrementParticipants(
  pool: Pool,
  roomId: number
): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.execute(
      `UPDATE voice_room SET current_participants = current_participants + 1 WHERE room_id = ?`,
      [roomId]
    );
  } finally {
    conn.release();
  }
}

export async function decrementParticipants(
  pool: Pool,
  roomId: number
): Promise<number> {
  const conn = await pool.getConnection();
  try {
    // 인원 감소 (음수 방지)
    await conn.execute(
      `UPDATE voice_room SET current_participants = GREATEST(current_participants - 1, 0) WHERE room_id = ?`,
      [roomId]
    );

    // 현재 인원 확인 후 반환
    const [rows] = (await conn.execute(
      `SELECT current_participants FROM voice_room WHERE room_id = ?`,
      [roomId]
    )) as unknown as [
      RowDataPacket[] & { current_participants: number }[],
      any
    ];

    return rows[0]?.current_participants ?? 0;
  } finally {
    conn.release();
  }
}
