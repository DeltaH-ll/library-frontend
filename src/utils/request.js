import axios from "axios";
import { ElMessage } from "element-plus";
import router from "@/router";
import { useUserStore } from "@/store/user";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE || "http://111.231.168.29/api";
export const ASSET_BASE_URL =
  import.meta.env.VITE_ASSET_BASE ||
  API_BASE_URL.replace(/\/api\/?$/, "");

const request = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 增加到30秒，因为ID重新排序操作可能需要较长时间
});

request.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

request.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.msg ||
      error.response?.data?.error ||
      error.message;

    if (status === 401) {
      try {
        const store = useUserStore();
        store.logout();
      } catch (e) {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("username");
        localStorage.removeItem("userId");
        localStorage.removeItem("avatar");
        localStorage.removeItem("email");
        localStorage.removeItem("studentId");
      }
      if (router.currentRoute.value.path !== "/login") {
        router.push("/login");
      }
      ElMessage.error(message || "登录已过期，请重新登录");
    } else if (status === 403) {
      ElMessage.error(message || "权限不足");
    } else if (message && status !== 422) {
      ElMessage.error(message);
    } else {
      ElMessage.error("请求失败，请稍后重试");
    }
    return Promise.reject(error);
  }
);

export default request;

