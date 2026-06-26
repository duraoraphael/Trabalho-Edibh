import axios from "axios";
import { emitAlert } from "./alerts";

export const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) return null;
  try {
    const response = await axios.post(`${API_URL}/auth/refresh`, null, { params: { token: refreshToken } });
    const { access_token, refresh_token } = response.data;
    localStorage.setItem("access_token", access_token);
    localStorage.setItem("refresh_token", refresh_token);
    return access_token;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      emitAlert({
        type: "warning",
        title: "Sessão expirada",
        message: "Faça login novamente para continuar.",
      });
      window.location.href = "/login";
    }

    if (!error.response) {
      emitAlert({
        type: "error",
        title: "Erro de rede",
        message: "Não foi possível se comunicar com o servidor.",
      });
    } else if (error.response.status >= 500) {
      emitAlert({
        type: "error",
        title: "Erro interno",
        message: "O servidor encontrou um erro inesperado.",
      });
    }

    console.error("API error", {
      status: error.response?.status,
      url: originalRequest?.url,
      method: originalRequest?.method,
      data: error.response?.data,
      message: error.message,
    });

    return Promise.reject(error);
  }
);

export function getApiErrorMessage(err: any, fallback: string): string {
  return err?.response?.data?.detail || err?.message || fallback;
}

export default api;
