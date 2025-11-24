// backend/src/socket/voiceRoomSocket.ts
import { Server, Socket } from "socket.io";

interface User {
  socketId: string;
  userId: number;
  name: string;
}

const users: Record<string, User[]> = {};
const socketToRoom: Record<string, string> = {};

export default function voiceRoomSocket(io: Server) {
  io.on("connection", (socket: Socket) => {
    // ✅ [로그] 연결 성공 시 무조건 출력
    console.log(`✅ [Socket] New Client Connected: ${socket.id}`);

    // 1. 방 입장
    socket.on("join_room", (data) => {
      console.log(`📩 [Socket] join_room 요청:`, data);

      const { roomId, userId, name } = data;

      if (users[roomId]) {
        const length = users[roomId].length;
        if (length >= 8) {
          socket.emit("room_full");
          return;
        }
        users[roomId].push({ socketId: socket.id, userId, name });
      } else {
        users[roomId] = [{ socketId: socket.id, userId, name }];
      }

      socketToRoom[socket.id] = roomId;
      socket.join(roomId);

      const usersInThisRoom = users[roomId].filter(
        (user) => user.socketId !== socket.id
      );

      console.log(
        `📤 [Socket] 기존 유저 목록 전송 (${usersInThisRoom.length}명) -> ${socket.id}`
      );
      socket.emit("all_users", usersInThisRoom);

      console.log(
        `👤 [Socket] User joined: ${name} (${userId}) in Room ${roomId}`
      );
    });

    // 2. Offer
    socket.on("sending_signal", (payload) => {
      // console.log(`🔄 [Socket] Sending signal from ${payload.callerID} to ${payload.userToSignal}`);
      io.to(payload.userToSignal).emit("user_joined", {
        signal: payload.signal,
        callerID: payload.callerID,
        userInfo: payload.userInfo,
      });
    });

    // 3. Answer
    socket.on("returning_signal", (payload) => {
      // console.log(`🔄 [Socket] Returning signal from ${socket.id} to ${payload.callerID}`);
      io.to(payload.callerID).emit("receiving_returned_signal", {
        signal: payload.signal,
        id: socket.id,
      });
    });

    // 4. Mute Toggle
    socket.on("toggle_mute", (isMuted: boolean) => {
      const roomId = socketToRoom[socket.id];
      if (roomId) {
        socket
          .to(roomId)
          .emit("user_mute_change", { socketId: socket.id, isMuted });
      }
    });

    // 5. Disconnect
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
