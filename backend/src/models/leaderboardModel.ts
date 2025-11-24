// backend/src/models/leaderboardModel.ts
import { pool } from "../config/db";
import type { RowDataPacket } from "mysql2";

/**
 * DB에서 반환되는 행 타입을 명시합니다.
 */
export type RawProfileRow = RowDataPacket & {
  user_id: number;
  name: string;
  score: number;
  tier: string;
};

/**
 * 상위 프로필 목록 조회
 */
export async function fetchProfiles(limit = 50): Promise<RawProfileRow[]> {
  const lim = Number(limit) || 50;

  const sql = `
    SELECT user_id, name, score, tier
    FROM user_profiles
    ORDER BY score DESC, user_id ASC
    LIMIT ?
  `;

  const [rows] = await pool.query<RowDataPacket[]>(sql, [lim]);
  return rows as RawProfileRow[];
}

/**
 * 특정 사용자 조회 (없으면 null 반환)
 */
export async function fetchProfileById(
  userId: number
): Promise<RawProfileRow | null> {
  const sql = `
    SELECT user_id, name, score, tier
    FROM user_profiles
    WHERE user_id = ?
    LIMIT 1
  `;

  const [rows] = await pool.query<RowDataPacket[]>(sql, [userId]);
  const arr = rows as RawProfileRow[];

  // 명시적으로 undefined를 null로 변환하여 반환 타입과 일치시킵니다.
  const first = arr[0];
  return first ?? null;
}
