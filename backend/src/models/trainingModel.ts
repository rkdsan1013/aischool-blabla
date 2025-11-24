import { pool } from "../config/db";
import { RowDataPacket } from "mysql2";
import { getTierByScore } from "../utils/gamification";

export interface SessionCompletionData {
  type: string;
  score: number;
  durationSeconds: number;
  sessionData?: any[];
}

/**
 * [헬퍼 함수] 한국 시간(KST) 기준 날짜 문자열(YYYY-MM-DD) 반환
 */
function getKSTDateString(date: Date = new Date()): string {
  const kstDate = new Date(
    date.toLocaleString("en-US", { timeZone: "Asia/Seoul" })
  );

  const year = kstDate.getFullYear();
  const month = String(kstDate.getMonth() + 1).padStart(2, "0");
  const day = String(kstDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * [헬퍼 함수] DB에서 가져온 Date 객체를 문자열로 안전하게 변환
 */
function formatDBDateToString(
  dateInput: Date | string | null | undefined
): string | null {
  if (!dateInput) return null;
  // DB에서 가져온 값이 이미 Date 객체라면 KST 기준으로 날짜만 추출
  return getKSTDateString(new Date(dateInput));
}

/**
 * 학습 세션 완료 처리 (핵심 로직)
 */
export async function completeTrainingSessionInDB(
  userId: number,
  data: SessionCompletionData
) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // [TS 오류 수정] nullish coalescing으로 명확한 타입 할당
    // sessionData가 있으면 문자열 변환, 없으면 null
    const sessionJson: string | null = data.sessionData
      ? JSON.stringify(data.sessionData)
      : null;

    // 2. training_sessions에 기록 저장
    // [TS 오류 수정] 'as any[]'로 타입 단언하여 TS 컴파일러 에러 방지
    await connection.execute(
      `INSERT INTO training_sessions 
       (user_id, type, score, duration_seconds, session_data, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        userId,
        data.type,
        data.score,
        data.durationSeconds,
        sessionJson,
      ] as any[]
    );

    // 3. 프로필 통계 조회 (Lock)
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT streak_count, last_study_date, total_study_time, completed_lessons, score 
       FROM user_profiles 
       WHERE user_id = ? 
       FOR UPDATE`,
      [userId]
    );

    if (!rows[0]) throw new Error("Profile not found");
    const profile = rows[0];

    // 4. 스트릭(Streak) 계산 로직
    // 오늘 날짜 (KST 기준)
    const todayKSTStr = getKSTDateString(new Date());

    // DB에 저장된 마지막 학습 날짜 (KST 기준 변환)
    const lastDateKSTStr = formatDBDateToString(profile.last_study_date);

    let newStreak = profile.streak_count;

    // [중요] 오늘 날짜와 DB 날짜가 같으면, 이미 오늘 학습한 것이므로 스트릭을 증가시키지 않음
    if (lastDateKSTStr === todayKSTStr) {
      console.log(
        `[Streak] 오늘(${todayKSTStr}) 이미 학습함. 스트릭 유지: ${newStreak}`
      );
    } else {
      // 오늘 처음 학습하는 경우 -> "어제" 학습했는지 확인

      // 어제 날짜 구하기 (KST 기준 오늘 - 1일)
      const todayDateObj = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" })
      );
      todayDateObj.setDate(todayDateObj.getDate() - 1);
      const yesterdayKSTStr = getKSTDateString(todayDateObj);

      if (lastDateKSTStr === yesterdayKSTStr) {
        // 어제 기록이 있으면 연속 학습 성공
        newStreak += 1;
        console.log(
          `[Streak] 연속 학습 성공! (${yesterdayKSTStr} -> ${todayKSTStr})`
        );
      } else {
        // 어제 기록이 없으면 스트릭 초기화 (오늘부터 1일)
        newStreak = 1;
        console.log(`[Streak] 연속 학습 끊김. 1일차로 초기화.`);
      }
    }

    // 5. 나머지 통계 계산
    // [수정됨] 학습 시간을 '초 단위' 그대로 저장 (DB 스키마가 INT라면 문제 없음)
    const addedSeconds = data.durationSeconds;
    const newTotalTime = (profile.total_study_time || 0) + addedSeconds;
    const newCompletedLessons = (profile.completed_lessons || 0) + 1;
    const newTotalScore = (profile.score || 0) + data.score;
    const newTier = getTierByScore(newTotalScore);

    // 6. 프로필 업데이트 실행
    // last_study_date에는 반드시 KST 기준의 오늘 날짜를 저장
    await connection.execute(
      `UPDATE user_profiles 
       SET 
         streak_count = ?,
         last_study_date = ?,
         total_study_time = ?,
         completed_lessons = ?,
         score = ?,
         tier = ?
       WHERE user_id = ?`,
      [
        newStreak,
        todayKSTStr, // 중요: 여기도 KST 문자열을 넣어 DB 날짜의 일관성 유지
        newTotalTime, // 초 단위 누적 값
        newCompletedLessons,
        newTotalScore,
        newTier,
        userId,
      ] as any[]
    );

    await connection.commit();

    // [수정됨] 리턴값 명확화 (addedMinutes -> addedSeconds)
    return {
      streak: newStreak,
      totalScore: newTotalScore,
      tier: newTier,
      addedSeconds,
    };
  } catch (err) {
    await connection.rollback();
    console.error("[TrainingModel] Complete Session Error:", err);
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * 단순 점수 업데이트 함수
 */
export async function updateUserScoreAndTier(
  userId: number,
  pointsToAdd: number
): Promise<{ newScore: number; newTier: string }> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `UPDATE user_profiles SET score = score + ? WHERE user_id = ?`,
      [pointsToAdd, userId] as any[]
    );
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT score FROM user_profiles WHERE user_id = ?`,
      [userId]
    );
    if (!rows[0]) throw new Error("User profile not found");
    const currentScore = rows[0].score as number;
    const newTier = getTierByScore(currentScore);
    await connection.execute(
      `UPDATE user_profiles SET tier = ? WHERE user_id = ?`,
      [newTier, userId] as any[]
    );
    await connection.commit();
    return { newScore: currentScore, newTier };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}
