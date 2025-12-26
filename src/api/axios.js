import axios from "axios";

// API Base URL 정책
// - 개발(DEV): 브라우저의 CORS 이슈를 피하기 위해 Vite proxy("/api")를 항상 사용합니다.
//              => baseURL을 비워두면 same-origin으로 요청되고, vite.config.js의 proxy가 백엔드로 전달합니다.
// - 운영(PROD): 프론트가 별도 도메인이라면 VITE_API_URL을 반드시 설정하세요. (예: https://api.example.com)
const API_BASE_URL = import.meta.env.DEV
  ? ""
  : (import.meta.env.VITE_API_URL ?? "").trim();

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// refresh 전용(무한 루프 방지용: apiClient 인터셉터 미사용)
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// 요청 인터셉터: JWT 토큰 자동 추가
apiClient.interceptors.request.use(
  config => {
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터: 토큰 만료 시 자동 갱신
apiClient.interceptors.response.use(
  response => {
    return response;
  },
  async error => {
    // 네트워크/CORS/연결 문제 디버깅용(응답이 아예 없는 케이스)
    if (!error.response) {
      console.error("API 요청 실패(응답 없음):", {
        message: error.message,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        method: error.config?.method,
      });
    }
    const originalRequest = error.config;

    // 403 에러는 권한 문제이므로 토큰 재발급 시도하지 않음
    if (error.response?.status === 403) {
      console.error("403 Forbidden - 권한이 없습니다.");
      console.error("요청 URL:", originalRequest.url);
      // 403은 토큰 재발급으로 해결되지 않으므로 그대로 반환
      return Promise.reject(error);
    }

    // 401 에러이고 아직 재시도하지 않은 경우 - 토큰 재발급 시도
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // 토큰이 없는 경우 바로 로그인 페이지로
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        console.error("토큰이 없습니다. 로그인 페이지로 이동합니다.");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (refreshToken) {
          console.log("토큰 재발급 시도 중...");
          const response = await refreshClient.post("/api/user/refresh", {
            refreshToken: refreshToken,
          });

          // 서버 응답 구조에 따라 다양한 필드명 시도
          const tokenData = response.data;
          const newAccessToken =
            tokenData.AccessToken ||
            tokenData.accessToken ||
            tokenData.access_token;
          const newRefreshToken =
            tokenData.RefreshToken ||
            tokenData.refreshToken ||
            tokenData.refresh_token;

          if (newAccessToken && newRefreshToken) {
            console.log("토큰 재발급 성공. 원래 요청 재시도...");
            localStorage.setItem("accessToken", newAccessToken);
            localStorage.setItem("refreshToken", newRefreshToken);

            // 원래 요청 재시도
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return apiClient(originalRequest);
          } else {
            console.error("토큰 갱신 응답 구조:", tokenData);
            throw new Error("토큰 갱신 실패: 응답에 토큰이 없습니다.");
          }
        } else {
          console.error("리프레시 토큰이 없습니다.");
          throw new Error("리프레시 토큰이 없습니다.");
        }
      } catch (refreshError) {
        // 리프레시 토큰도 만료되었거나 갱신 실패한 경우 로그아웃
        console.error("토큰 갱신 실패:", refreshError);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
