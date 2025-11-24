// backend/src/index.ts
import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRouter from "./routes/authRouter";
import userRouter from "./routes/userRouter";
import trainingRouter from "./routes/trainingRouter";
import aiTalkRoutes from "./routes/aiTalkRouter";
import llmRouter from "./ai/router";
import voiceroomRouter from "./routes/voiceroomRouter";
import voiceRoomSocket from "./socket/voiceRoomSocket";

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ✅ [수정] 개발 환경 CORS 허용 범위 확대
const allowedOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
};

app.use(cors(corsOptions));

// ✅ [수정] Socket.io CORS 설정 동기화
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"], // 연결 방식 모두 허용
});

// 소켓 로직 연결
voiceRoomSocket(io);

// 라우터 등록
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/training", trainingRouter);
app.use("/api/ai-talk", aiTalkRoutes);
app.use("/api/llm", llmRouter);
app.use("/api/voice-room", voiceroomRouter);

app.use((err: any, req: any, res: any, next: any) => {
  console.error("[global error]", err && err.stack ? err.stack : err);
  const status = err?.status || 500;
  const message = err?.message || "서버 내부 오류";
  res.status(status).json({ message });
});

const PORT = Number(process.env.PORT || 3000);

server.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
  console.log(
    `🔌 소켓 서버 대기 중... (Allowing: ${allowedOrigins.join(", ")})`
  );
});
