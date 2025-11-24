// backend/src/models/voiceroomModel.ts
import { Pool } from "mysql2/promise";
import { RowDataPacket, ResultSetHeader } from "mysql2";

export type VoiceRoomLevel = "ANY" | "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type VoiceRoomRow = {
  room_id: number;
  name: string;
  description: string;
  level: VoiceRoomLevel;
  max_participants: number;
  current_participants: number;
  host_id: number; // ✅ [추가]
  host_name: string;
  created_at: string | null;
  preview_users?: string;
};

export async function insertVoiceRoom(
  pool: Pool,
  payload: {
    name: string;
    description: string;
    level: VoiceRoomLevel;
    max_participants: number;
    host_id: number; // ✅ [추가]
    host_name: string;
  }
): Promise<number> {
  const conn = await pool.getConnection();
  try {
    const [result] = (await conn.execute(
      `INSERT INTO voice_room (name, description, level, max_participants, current_participants, host_id, host_name)
       VALUES (?, ?, ?, ?, 0, ?, ?)`,
      [
        payload.name,
        payload.description,
        payload.level,
        payload.max_participants,
        payload.host_id,
        payload.host_name,
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
      `SELECT room_id, name, description, level, max_participants, current_participants, host_id, host_name, created_at
       FROM voice_room WHERE room_id = ?`,
      [roomId]
    )) as unknown as [RowDataPacket[] & VoiceRoomRow[], any];
    return rows[0] ?? null;
  } finally {
    conn.release();
  }
}

export async function selectVoiceRooms(
  pool: Pool,
  options?: { page?: number; size?: number; level?: VoiceRoomLevel }
): Promise<VoiceRoomRow[]> {
  const page = Math.max(1, Math.floor(Number(options?.page || 1)));
  const size = Math.min(
    100,
    Math.max(1, Math.floor(Number(options?.size || 20)))
  );
  const offset = (page - 1) * size;

  const conn = await pool.getConnection();
  try {
    let sql = `
      SELECT 
        r.*,
        (
          SELECT GROUP_CONCAT(CONCAT(vrp.user_id, '|', up.name, '|', IFNULL(up.profile_img, 'null')) SEPARATOR ',')
          FROM voice_room_participants vrp
          JOIN user_profiles up ON vrp.user_id = up.user_id
          WHERE vrp.room_id = r.room_id
        ) as preview_users
      FROM voice_room r
    `;

    const params: any[] = [];

    if (options?.level && options.level !== "ANY") {
      sql += ` WHERE r.level = ? `;
      params.push(options.level);
    }

    sql += ` ORDER BY r.created_at DESC LIMIT ${size} OFFSET ${offset}`;

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

export async function addRoomParticipant(
  pool: Pool,
  roomId: number,
  userId: number
): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      `INSERT IGNORE INTO voice_room_participants (room_id, user_id) VALUES (?, ?)`,
      [roomId, userId]
    );
    await conn.execute(
      `UPDATE voice_room 
       SET current_participants = (SELECT COUNT(*) FROM voice_room_participants WHERE room_id = ?)
       WHERE room_id = ?`,
      [roomId, roomId]
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function removeRoomParticipant(
  pool: Pool,
  roomId: number,
  userId: number
): Promise<number> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      `DELETE FROM voice_room_participants WHERE room_id = ? AND user_id = ?`,
      [roomId, userId]
    );
    await conn.execute(
      `UPDATE voice_room 
       SET current_participants = (SELECT COUNT(*) FROM voice_room_participants WHERE room_id = ?)
       WHERE room_id = ?`,
      [roomId, roomId]
    );
    const [rows] = (await conn.execute(
      `SELECT current_participants FROM voice_room WHERE room_id = ?`,
      [roomId]
    )) as unknown as [RowDataPacket[], any];

    await conn.commit();
    return rows[0]?.current_participants ?? 0;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ✅ [신규] 강퇴 처리 (Ban)
export async function banUser(
  pool: Pool,
  roomId: number,
  userId: number
): Promise<void> {
  const conn = await pool.getConnection();
  try {
    // 1. Ban 목록에 추가
    await conn.execute(
      `INSERT IGNORE INTO voice_room_bans (room_id, user_id) VALUES (?, ?)`,
      [roomId, userId]
    );
    // 2. 참여 목록에서 제거 (강퇴이므로)
    await conn.execute(
      `DELETE FROM voice_room_participants WHERE room_id = ? AND user_id = ?`,
      [roomId, userId]
    );
    // 3. 카운트 갱신
    await conn.execute(
      `UPDATE voice_room 
         SET current_participants = (SELECT COUNT(*) FROM voice_room_participants WHERE room_id = ?)
         WHERE room_id = ?`,
      [roomId, roomId]
    );
  } finally {
    conn.release();
  }
}

// ✅ [신규] 강퇴 여부 확인
export async function checkIsBanned(
  pool: Pool,
  roomId: number,
  userId: number
): Promise<boolean> {
  const conn = await pool.getConnection();
  try {
    const [rows] = (await conn.execute(
      `SELECT 1 FROM voice_room_bans WHERE room_id = ? AND user_id = ?`,
      [roomId, userId]
    )) as unknown as [RowDataPacket[], any];
    return rows.length > 0;
  } finally {
    conn.release();
  }
}
