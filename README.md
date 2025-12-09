# 🗣️ 블라블라 (Blabla) - AI 맞춤형 외국어 학습 서비스

> **학습자의 수준과 관심사에 맞춘 외국어 학습 AI 서비스** > 사용자가 원하는 상황을 설정하여 AI와 롤플레잉하고, 다른 학습자와 실시간으로 소통하며 실전 회화 감각을 익힐 수 있는 플랫폼입니다.

<br/>

## 📝 프로젝트 소개 (Project Overview)

**블라블라(Blabla)** 는 기존의 정해진 커리큘럼을 따라가는 수동적인 학습 방식에서 벗어나, 학습자가 주도적으로 상황(Context)을 설정하고 대화하는 능동적인 영어 회화 서비스입니다.

- **개발 기간**: 2025.09.25 - 2025.12.10
- **주요 목표**: 학습자가 원하는 상황에서 AI와 자유롭게 대화하며 실전 감각을 익히고, 개인의 학습 효율성과 지속성을 극대화하는 것.

<br/>

## ✨ 주요 기능 (Key Features)

### 1. 🎯 AI 레벨 테스트 & 맞춤형 난이도
- 가입 시 AI와의 프리토킹 인터뷰를 통해 사용자의 회화 실력을 진단합니다.
- 국제 표준 **CEFR(A1-C2)** 등급으로 레벨을 판정하고, 이에 맞춰 콘텐츠 난이도가 자동 조정됩니다.

### 2. 🎭 사용자 커스텀 AI 시나리오 (Role-Play)
- **커스텀 모드**: "공항에서 짐을 잃어버렸을 때", "BTS 콘서트 티켓팅 실패 후 환불 요청" 등 사용자가 원하는 구체적인 상황을 입력하면 AI가 해당 페르소나를 연기합니다.
- **프리셋 모드**: 비즈니스, 여행, 일상 등 빈번하게 사용되는 상황 템플릿을 제공합니다.

### 3. ⚡ 실시간 피드백 & 분석
- 사용자의 발화를 STT(Speech-to-Text)로 변환하고, LLM이 문법, 어휘, 자연스러움을 분석합니다.
- 대화 도중 즉각적인 교정 리포트를 제공하며, 틀린 표현은 별도로 저장되어 복습할 수 있습니다.

### 4. 🎙️ 보이스룸 (Voice Room)
- **WebRTC 기반 실시간 음성 채팅**: AI뿐만 아니라 실제 사용자들과 영어로 대화할 수 있는 커뮤니티 공간입니다.
- 주제별, 레벨별 방 개설이 가능하며 실시간 다자간 소통을 지원합니다.

### 5. 🏆 게이미피케이션 (Gamification)
- **티어 시스템**: Bronze부터 Challenger까지 학습량에 따른 등급 시스템 도입.
- **연속 학습(Streak)**: 매일 학습을 유도하는 잔디 심기 및 통계 대시보드를 제공합니다.

<br/>

## 🛠️ 기술 스택 (Tech Stack)

### Frontend
- **Framework**: React 19, Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Communication**: Axios, Socket.io-client
- **WebRTC**: simple-peer (음성 채팅)
- **Icons**: Lucide-react

### Backend
- **Runtime**: Node.js
- **Framework**: Express
- **Language**: TypeScript
- **Database**: MySQL (mysql2)
- **AI Integration**: OpenAI API
- **Socket**: Socket.io (실시간 신호 처리)
- **Auth**: JWT (Jose, Bcrypt), Cookie-parser

<br/>

## 📂 프로젝트 구조 (Project Structure)

```bash
aischool-blabla/
├── backend/
│   ├── src/
│   │   ├── ai/             # AI 연동 및 프롬프트 생성 (generators/)
│   │   ├── config/         # DB 연결 설정 (db.ts)
│   │   ├── controllers/    # API 요청 처리 컨트롤러
│   │   ├── middlewares/    # 인증 미들웨어 (auth.ts)
│   │   ├── models/         # DB 쿼리 및 모델 정의
│   │   ├── routes/         # API 라우팅 정의
│   │   ├── services/       # 비즈니스 로직 처리
│   │   ├── socket/         # 소켓 이벤트 핸들러 (voiceRoomSocket.ts)
│   │   ├── utils/          # 유틸리티 (JWT, Gamification 등)
│   │   └── index.ts        # 서버 엔트리 포인트
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/
    ├── public/             # 정적 리소스
    ├── src/
    │   ├── api/            # Axios 인스턴스 설정
    │   ├── components/     # 재사용 가능한 UI 컴포넌트
    │   ├── contexts/       # Context API 정의 (Auth, Profile)
    │   ├── hooks/          # 커스텀 훅 (useAITalkRecorder, useVoiceRoomRecorder 등)
    │   ├── layouts/        # 레이아웃 컴포넌트 (Nav 포함/미포함)
    │   ├── pages/          # 주요 페이지 (Home, AITalk, VoiceRoom, Training 등)
    │   ├── providers/      # Context Provider (AuthProvider, ProfileProvider)
    │   ├── routes/         # 라우팅 설정 및 보호된 라우트
    │   ├── services/       # API 호출 서비스 함수
    │   ├── utils/          # 유틸리티 (AudioVADEngine 등)
    │   ├── App.tsx         # 메인 앱 컴포넌트
    │   └── main.tsx        # 프론트엔드 진입점
    ├── package.json
    └── vite.config.ts

<br>

## ⚙️ 설치 및 실행 방법 (Getting Started)

이 프로젝트는 `backend`와 `frontend`가 분리되어 있습니다. 각각의 터미널에서 실행해야 합니다.

### 사전 요구사항 (Prerequisites)

  - Node.js (v18 이상 권장)
  - MySQL Server

### 1\. 레포지토리 클론 (Clone)

```bash
git clone [https://github.com/username/aischool-blabla.git](https://github.com/username/aischool-blabla.git)
cd aischool-blabla
```

### 2\. 백엔드 설정 (Backend Setup)

```bash
cd backend
npm install
```

**환경 변수 설정 (.env)** `backend` 루트 디렉토리에 `.env` 파일을 생성하고 다음 내용을 입력하세요.

```env
DB_HOST=your_db_host
DB_PORT=your_db_port
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
OPENAI_API_KEY=your_openai_api_key
```

**실행**

```bash
# 개발 모드 실행
npm run dev
```

### 3\. 프론트엔드 설정 (Frontend Setup)

```bash
cd frontend
npm install
```

**환경 변수 설정 (.env)** `frontend` 루트 디렉토리에 `.env` 파일을 생성하고 다음 내용을 입력하세요.

```env
VITE_API_URL=your_api_url
```

**실행**

```bash
npm run dev
```

<br>

## 👥 팀원 및 역할 (Team)

|    이름    |         역할         |                                  담당 업무                                   |
| :--------: | :------------------: | :-------------------------------------------------------------------------- |
| **서강산** | 팀장, PM, Full-Stack |  프로젝트 총괄, AI 모델 연동, 백엔드/프론트엔드 개발, WebRTC 보이스룸 구현   |
| **국태은** |   팀원, Full-Stack   | DB 스키마 설계, UI/UX 설계, 대시보드 및 통계 기능, 백엔드/프론트엔드 개발 |
