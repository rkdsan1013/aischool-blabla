// backend/src/socket/voiceRoomSocket.ts
import { Server, Socket } from "socket.io";
// import { transcribeAudio } from "../ai/audio";
// import { generateFeedbackOnly } from "../ai/generators/feedback";

interface User {
  socketId: string;
  userId: number;
  name: string;
  level?: string;
}

const users: Record<string, User[]> = {};
const socketToRoom: Record<string, string> = {};

// Helper: ID 생성
function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function voiceRoomSocket(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log(`✅ [Socket] New Client Connected: ${socket.id}`);

    // 1. 방 입장
    socket.on("join_room", (data) => {
      console.log(`📩 [Socket] join_room 요청:`, data);

      const { roomId, userId, name, userLevel = "A1" } = data; // userLevel 받기 (없으면 A1)

      // 사용자 정보 저장
      const newUser = { socketId: socket.id, userId, name, level: userLevel };

      if (users[roomId]) {
        const length = users[roomId].length;
        if (length >= 8) {
          socket.emit("room_full");
          return;
        }
        users[roomId].push(newUser);
      } else {
        users[roomId] = [newUser];
      }

      socketToRoom[socket.id] = roomId;
      socket.join(roomId);

      const usersInThisRoom = users[roomId].filter(
        (user) => user.socketId !== socket.id
      );

      socket.emit("all_users", usersInThisRoom);

      console.log(
        `👤 [Socket] User joined: ${name} (${userId}) in Room ${roomId}`
      );
    });

    // ... (기존 Signaling, Mute 로직 생략 - 그대로 유지) ...
    socket.on("sending_signal", (payload) => {
      io.to(payload.userToSignal).emit("user_joined", {
        signal: payload.signal,
        callerID: payload.callerID,
        userInfo: payload.userInfo,
      });
    });

    socket.on("returning_signal", (payload) => {
      io.to(payload.callerID).emit("receiving_returned_signal", {
        signal: payload.signal,
        id: socket.id,
      });
    });

    socket.on("toggle_mute", (isMuted: boolean) => {
      const roomId = socketToRoom[socket.id];
      if (roomId) {
        socket
          .to(roomId)
          .emit("user_mute_change", { socketId: socket.id, isMuted });
      }
    });

    // ✅ [변경] 로컬 텍스트 단순 중계 (API 미사용 모드)
    socket.on(
      "local_transcript",
      (payload: {
        id: string;
        speaker: string;
        text: string;
        timestamp: string;
      }) => {
        const roomId = socketToRoom[socket.id];
        if (!roomId) return;

        console.log(
          `📝 [Transcript Relay] ${payload.speaker}: ${payload.text}`
        );

        // 1. 나를 포함한 방 전체에 자막 전송
        // (발화자 본인은 이미 로컬에 텍스트가 있지만, 타임스탬프 동기화 등을 위해 덮어씌워도 무방)
        io.to(roomId).emit("transcript_item", payload);

        /* // 2. AI 피드백 생성 (현재 주석 처리됨)
      try {
        const user = users[roomId]?.find((u) => u.socketId === socket.id);
        const userLevel = user?.level || "A1";
        
        // const feedback = await generateFeedbackOnly(payload.text, userLevel);
        // socket.emit("feedback_update", { id: payload.id, feedback });
      } catch (e) {
        console.error(e);
      }
      */
      }
    );

    /* // ❌ [주석 처리] 오디오 처리 로직 비활성화
    socket.on("process_audio", async (audioBuffer: Buffer) => {
       // ... 기존 Whisper 로직 주석 ...
    });
    */

    // Disconnect
    socket.on("disconnect", () => {
      console.log(`❌ [Socket] Disconnected: ${socket.id}`);
      const roomId = socketToRoom[socket.id];
      if (roomId) {
        let room = users[roomId];
        if (room) {
          room = room.filter((user) => user.socketId !== socket.id);
          users[roomId] = room;
        }
        socket.to(roomId).emit("user_left", socket.id);
        delete socketToRoom[socket.id];
      }
    });
  });
}
