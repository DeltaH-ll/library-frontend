import { defineStore } from "pinia";

export const useUserStore = defineStore("user", {
  state: () => ({
    username: "", // 用户名
    role: "", // 角色（admin/user）
    id: "", // 用户ID
    token: "", // 认证令牌
    email: "",
    studentId: "",
    avatar: "",
  }),
  actions: {
    // 登录：存储用户信息
    login(userInfo = {}) {
      this.username = userInfo.username || "";
      this.role = userInfo.role || "user";
      this.id = userInfo.id || "";
      this.token = userInfo.token || "";
      this.email = userInfo.email || "";
      this.studentId = userInfo.studentId || "";
      this.avatar = userInfo.avatar || "";

      localStorage.setItem("token", this.token);
      localStorage.setItem("username", this.username);
      localStorage.setItem("role", this.role);
      localStorage.setItem("userId", this.id);
      localStorage.setItem("email", this.email);
      localStorage.setItem("studentId", this.studentId);
      localStorage.setItem("avatar", this.avatar);
    },

    // 加载：从localStorage恢复用户状态
    load() {
      this.token = localStorage.getItem("token") || "";
      this.username = localStorage.getItem("username") || "";
      this.role = localStorage.getItem("role") || "";
      this.id = localStorage.getItem("userId") || "";
      this.email = localStorage.getItem("email") || "";
      this.studentId = localStorage.getItem("studentId") || "";
      this.avatar = localStorage.getItem("avatar") || "";
    },

    updateProfile(profile = {}) {
      if (profile.username !== undefined) {
        this.username = profile.username;
        localStorage.setItem("username", profile.username);
      }
      if (profile.email !== undefined) {
        this.email = profile.email || "";
        localStorage.setItem("email", this.email);
      }
      if (profile.studentId !== undefined) {
        this.studentId = profile.studentId || "";
        localStorage.setItem("studentId", this.studentId);
      }
      if (profile.avatar !== undefined) {
        this.avatar = profile.avatar || "";
        localStorage.setItem("avatar", this.avatar);
      }
    },

    // 退出登录：清空状态和存储
    logout() {
      this.username = "";
      this.role = "";
      this.id = "";
      this.token = "";
      this.email = "";
      this.studentId = "";
      this.avatar = "";
      [
        "token",
        "username",
        "role",
        "userId",
        "email",
        "studentId",
        "avatar",
      ].forEach((key) => localStorage.removeItem(key));
    },
  },
});
