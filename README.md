# BoardProject Frontend (React + Vite)

게시판 프로젝트 프론트엔드입니다. **개발 환경에서는 Vite 프록시(`/api`)를 통해 백엔드로 요청**하고, 운영 환경에서는 **`VITE_API_URL`을 통해 직접 백엔드로 요청**합니다.

## 🛠 Tech Stack

- **React**: 19.2.0
- **Vite**: 7.2.4
- **React Router DOM**: 7.10.1
- **Axios**: 1.13.2

## 🔗 Backend Information

이 프론트엔드는 Spring Boot 기반 백엔드와 연동됩니다.

### 백엔드 기술 스택

- **Java**: 17
- **Spring Boot**: 3.5.7
- **Database**: MySQL (JPA/Hibernate)
- **Cache**: Redis
- **Search Engine**: Typesense
- **File Storage**: AWS S3
- **Security**: Spring Security + JWT

### 백엔드 주요 기능

- **Account**: 회원 가입, 정보 수정, 등급(Grade) 및 포인트 관리
- **Authentication**: 로그인, 로그아웃, 토큰 재발급 (Refresh Token)
- **Post & Comment**: 게시글/댓글 CRUD, 좋아요(Reaction) 기능
- **Search**: Typesense를 이용한 게시글 검색
- **Report**: 게시글/댓글 신고, 신고 사유 및 처리 상태 관리
- **Admin**: 관리자 기능
- **File**: AWS S3를 이용한 파일 업로드/삭제

### 백엔드 실행 전제 조건

프론트엔드를 정상적으로 사용하려면 백엔드가 다음 조건을 만족해야 합니다:

- 백엔드 서버가 `http://localhost:8080`에서 실행 중이어야 합니다
- MySQL, Redis가 실행 중이어야 합니다
- Typesense가 실행 중이어야 합니다 (검색 기능 사용 시)
- AWS S3 설정이 완료되어 있어야 합니다 (이미지 업로드 기능 사용 시)

백엔드 실행 방법은 [BoardProject-back README](../board-back/BoardProject-back/README.md)를 참고하세요.

## 프로젝트 실행 방법

### 프론트 실행

```bash
npm install
npm run dev
```

- 기본 접속: Vite가 출력하는 Local URL (예: `http://localhost:5173`)

### 백엔드(로컬)와 함께 실행 전제

- 기본 전제: 백엔드가 `http://localhost:8080`에서 실행 중
- 다른 포트를 쓰면 아래 **환경변수**의 `VITE_DEV_API_URL`로 바꾸세요.

## 필수 env

이 프로젝트는 `.env` 파일이 없어도 **로컬 개발은 동작**하도록 구성되어 있습니다(기본값 사용).

### 개발(DEV)

- **`VITE_DEV_API_URL` (선택)**: dev에서 Vite 프록시가 붙을 백엔드 주소
  - 기본값: `http://localhost:8080`
  - 예) 백엔드가 8081이면 `VITE_DEV_API_URL=http://localhost:8081`

예시 파일: `.env.development.local`

```env
VITE_DEV_API_URL=http://localhost:8080
```

### 운영(PROD)

- **`VITE_API_URL` (필수)**: 운영에서 프론트가 직접 호출할 백엔드 Base URL

예시 파일: `.env.production.local`

```env
VITE_API_URL=https://api.example.com
```

## 아키텍처

### 요청 흐름(중요)

- **개발(DEV)**:

  - 브라우저 → `http://localhost:<vite_port>/api/...`
  - Vite Dev Server Proxy → `VITE_DEV_API_URL`(기본 `http://localhost:8080`) → 백엔드
  - 장점: 브라우저 CORS 이슈를 피함
  - 관련 파일: `vite.config.js`, `src/api/axios.js`

- **운영(PROD)**:
  - 브라우저 → `VITE_API_URL + /api/...` → 백엔드
  - 관련 파일: `src/api/axios.js`

### 인증(토큰) 흐름

- Access Token은 `localStorage.accessToken`
- Refresh Token은 `localStorage.refreshToken`
- 모든 API 요청에 `Authorization: Bearer <accessToken>` 자동 첨부
- 401 발생 시 `/api/user/refresh`로 토큰 갱신 시도 후 원 요청 재시도
  - 403은 재발급 시도 없이 즉시 실패 처리
  - 관련 파일: `src/api/axios.js`

### 폴더 구조(요약)

- **`src/api/`**: axios 클라이언트 및 API 모듈
  - `axios.js`: Axios 인스턴스 및 인터셉터 (토큰 자동 추가, 자동 갱신)
  - `auth.js`: 인증 관련 API (로그인, 회원가입, 프로필 수정 등)
  - `post.js`: 게시글 관련 API (CRUD, 검색, 반응 등)
  - `comment.js`: 댓글 관련 API (CRUD)
  - `report.js`: 신고 관련 API
  - `admin.js`: 관리자 관련 API
  - `aws.js`: 파일 업로드/삭제 API
- **`src/pages/`**: 라우팅 단위 페이지
  - `Home.jsx`: 홈 페이지
  - `Login.jsx`: 로그인 페이지
  - `Signup.jsx`: 회원가입 페이지
  - `PostList.jsx`: 게시글 목록 페이지
  - `PostDetail.jsx`: 게시글 상세 페이지
  - `PostWrite.jsx`: 게시글 작성 페이지
  - `PostEdit.jsx`: 게시글 수정 페이지
  - `PostMy.jsx`: 내 게시글 목록 페이지
  - `Profile.jsx`: 프로필 페이지
  - `Admin.jsx`: 관리자 페이지
- **`src/components/`**: 재사용 UI 컴포넌트
  - `Layout.jsx`: 레이아웃 컴포넌트
  - `ProtectedRoute.jsx`: 인증이 필요한 라우트 보호 컴포넌트
  - `Button.jsx`, `Input.jsx`, `Textarea.jsx`: 기본 UI 컴포넌트
  - `ErrorNotice.jsx`: 에러 알림 컴포넌트
  - `ReportModal.jsx`: 신고 모달 컴포넌트
- **`src/context/`**: 전역 상태/인증 컨텍스트
  - `AuthContext.jsx`: 사용자 인증 상태 관리
- **`src/utils/`**: 유틸리티 함수
  - `error.js`: 에러 처리 유틸리티
  - `logger.js`: 로깅 유틸리티

## 📚 API References

백엔드 API 문서는 Swagger UI를 통해 확인할 수 있습니다:

- **Swagger UI**: http://localhost:8080/swagger-ui/index.html

백엔드 서버가 실행 중일 때만 접근 가능합니다.

## 🔍 트러블슈팅

### "Provisional headers are shown" / 프록시 에러(ETIMEDOUT/ECONNREFUSED)

- **원인**: dev 프록시 타겟이 잘못되었거나 백엔드가 내려가 있음
- **해결**
  - 백엔드가 실제로 실행 중인지 확인(`http://localhost:8080` 등)
  - 백엔드 포트가 다르면 `VITE_DEV_API_URL`을 설정
  - `npm run dev`를 여러 번 띄웠다면 모두 종료 후 하나만 실행

### 401 Unauthorized 에러

- **원인**: Access Token이 만료되었거나 없음
- **해결**
  - 자동으로 토큰 갱신을 시도합니다
  - 갱신 실패 시 로그인 페이지로 리다이렉트됩니다
  - `localStorage`에 `accessToken`과 `refreshToken`이 있는지 확인

### 403 Forbidden 에러

- **원인**: 권한이 없는 리소스에 접근 시도
- **해결**
  - 해당 기능에 필요한 권한이 있는지 확인
  - 관리자 기능은 관리자 권한이 필요합니다

### CORS 에러

- **원인**: 개발 환경에서 프록시가 제대로 설정되지 않음
- **해결**
  - `vite.config.js`의 프록시 설정 확인
  - 백엔드 CORS 설정 확인 (운영 환경)
