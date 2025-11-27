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
  streak_count: number;
};

/**
 * 상위 프로필 목록 조회
 */
export async function fetchProfiles(limit = 50): Promise<RawProfileRow[]> {
  const lim = Number(limit) || 50;

  const sql = `
    SELECT user_id, name, score, tier, COALESCE(streak_count, 0) AS streak_count
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
    SELECT user_id, name, score, tier, COALESCE(streak_count, 0) AS streak_count
    FROM user_profiles
    WHERE user_id = ?
    LIMIT 1
  `;

  const [rows] = await pool.query<RowDataPacket[]>(sql, [userId]);
  const arr = rows as RawProfileRow[];

  const first = arr[0];
  return first ?? null;
}

/**
 * 추가된 함수들 (rank 포함 반환)
 *
 * 주의: DB가 MySQL 8+여야 윈도우 함수 사용 가능
 */

/**
 * 티어 우선순위를 SQL에서 사용하기 위한 CASE 표현식
 */
const TIER_PRIORITY_CASE = `
  CASE
    WHEN tier = 'Challenger' THEN 1
    WHEN tier = 'Master' THEN 2
    WHEN tier = 'Diamond' THEN 3
    WHEN tier = 'Platinum' THEN 4
    WHEN tier = 'Gold' THEN 5
    WHEN tier = 'Silver' THEN 6
    WHEN tier = 'Bronze' THEN 7
    ELSE 8
  END
`;

/**
 * 상위 프로필 목록 조회 (rank 포함)
 * 반환 타입은 DB RowDataPacket이 아닌 우리가 사용하는 plain object 타입으로 명시합니다.
 */
export async function fetchProfilesWithRank(limit = 50): Promise<
  {
    user_id: number;
    name: string;
    score: number;
    tier: string;
    streak_count: number;
    rank: number;
  }[]
> {
  const lim = Number(limit) || 50;

  const sql = `
    SELECT
      user_id,
      name,
      score,
      tier,
      COALESCE(streak_count, 0) AS streak_count,
      RANK() OVER (ORDER BY score DESC, ${TIER_PRIORITY_CASE} ASC, user_id ASC) AS rank
    FROM user_profiles
    ORDER BY score DESC, ${TIER_PRIORITY_CASE} ASC, user_id ASC
    LIMIT ?
  `;

  const [rows] = await pool.query<RowDataPacket[]>(sql, [lim]);
  // rows는 RowDataPacket[] 형태이므로 any로 읽어와 우리가 원하는 plain object로 매핑
  return (rows as any[]).map((r: any) => ({
    user_id: Number(r.user_id),
    name: r.name ?? "",
    score: Number(r.score ?? 0),
    tier: r.tier ?? "Bronze",
    streak_count: Number(r.streak_count ?? 0),
    rank: Number(r.rank ?? 0),
  }));
}

/**
 * 특정 사용자 조회 (rank 포함)
 * - userId는 숫자 또는 숫자형 문자열을 허용
 * - 반환값이 없으면 null
 */
export async function fetchProfileWithRankById(
  userId: number | string
): Promise<{
  user_id: number;
  name: string;
  score: number;
  tier: string;
  streak_count: number;
  rank: number;
} | null> {
  const uid = Number(userId);
  if (Number.isNaN(uid)) return null;

  const sql = `
    SELECT user_id, name, score, tier, streak_count, rank FROM (
      SELECT
        user_id,
        name,
        score,
        tier,
        COALESCE(streak_count, 0) AS streak_count,
        RANK() OVER (ORDER BY score DESC, ${TIER_PRIORITY_CASE} ASC, user_id ASC) AS rank
      FROM user_profiles
    ) AS ranked
    WHERE user_id = ?
    LIMIT 1
  `;

  const [rows] = await pool.query<RowDataPacket[]>(sql, [uid]);
  const arr = rows as any[];

  if (!arr || arr.length === 0) return null;

  const r = arr[0];
  return {
    user_id: Number(r.user_id),
    name: r.name ?? "",
    score: Number(r.score ?? 0),
    tier: r.tier ?? "Bronze",
    streak_count: Number(r.streak_count ?? 0),
    rank: Number(r.rank ?? 0),
  };
}
