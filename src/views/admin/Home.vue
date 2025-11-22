<template>
  <el-container class="admin-layout">
    <!-- 左侧侧边栏 -->
    <el-aside width="220px" class="sidebar">
      <div class="logo">📚 图书管理系统</div>

      <el-menu
        router
        background-color="#2d3a4b"
        text-color="#fff"
        active-text-color="#ffd04b"
        class="menu"
      >
        <el-menu-item index="/admin/dashboard">
          <i class="el-icon-menu"></i>
          <span>仪表盘</span>
        </el-menu-item>
        <el-menu-item index="/admin/books">
          <i class="el-icon-reading"></i>
          <span>图书管理</span>
        </el-menu-item>
        <el-menu-item index="/admin/borrow">
          <i class="el-icon-notebook-2"></i>
          <span>借阅管理</span>
        </el-menu-item>
        <el-menu-item index="/admin/users">
          <i class="el-icon-user"></i>
          <span>用户管理</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 右侧主区域 -->
    <el-container class="main-container">
      <!-- 顶部栏 -->
      <el-header class="header">
        <div class="left">
          欢迎，管理员 {{ username }}
          <el-avatar
            v-if="avatar"
            :src="avatar"
            :size="32"
            class="admin-avatar"
          >
            {{ username.charAt(0).toUpperCase() }}
          </el-avatar>
        </div>
        <div class="right">
          <el-button type="primary" size="small" @click="goHome" plain>主页</el-button>
          <el-button type="danger" size="small" @click="logout">退出</el-button>
        </div>
      </el-header>

      <!-- 内容区：router-view 渲染子页面 -->
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { useUserStore } from "@/store/user";
import { ASSET_BASE_URL } from "@/utils/request";

const router = useRouter();
const store = useUserStore();
store.load();
const username = ref(store.username || "admin");
const avatar = ref("");

const resolveAvatar = (value) => {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  const base = ASSET_BASE_URL.replace(/\/$/, "");
  const normalized = value.startsWith("/") ? value : `/${value}`;
  return `${base}${normalized}`;
};

const syncProfile = () => {
  username.value = store.username || localStorage.getItem("username") || "admin";
  avatar.value = resolveAvatar(store.avatar || localStorage.getItem("avatar") || "");
};

syncProfile();

// 退出登录
const logout = () => {
  store.logout();
  ElMessage.success("已退出登录");
  router.push("/login");
};

const goHome = () => {
  router.push("/admin/dashboard");
};
</script>

<style scoped>
.admin-layout {
  height: 100vh; /* 占满整个视口高度 */
  display: flex;
  overflow: hidden;
  background-color: transparent;
}

/* 侧边栏样式 */
.sidebar {
  background-color: #2d3a4b;
  color: #fff;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.logo {
  font-weight: bold;
  font-size: 18px;
  text-align: center;
  padding: 20px 0;
  background: #1f2a37;
  color: white;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.menu {
  flex: 1;
  border-right: none;
  overflow-y: auto;
}

/* 右侧主区域 */
.main-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  background: #f9f9f9;
}

/* 顶部 */
.header {
  background: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 60px;
  border-bottom: 1px solid #e6e6e6;
  flex-shrink: 0;
}

.admin-avatar {
  margin-left: 12px;
  border: 1px solid #ebeef5;
}

/* 内容区：独立滚动 */
.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  box-sizing: border-box;
  background: transparent;
}
</style>
