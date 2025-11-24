import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // ✅ Node.js 폴리필 플러그인 추가
    nodePolyfills({
      // simple-peer 및 socket.io-client가 필요로 하는 모듈 포함
      include: ["buffer", "process", "util", "stream"],
      globals: {
        Buffer: true, // Buffer 전역 변수 활성화
        global: true, // global 전역 변수 활성화 (이게 핵심 해결책)
        process: true, // process 전역 변수 활성화
      },
    }),
  ],
  resolve: {
    alias: {
      // 일부 의존성 패키지를 위한 별칭 설정 (필요 시 활성화)
      // util: 'util',
    },
  },
});
