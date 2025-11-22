<template>
  <div class="user-home">
    <!-- 顶部导航 -->
    <el-header class="header">
      <div class="logo">📚 图书管理系统（用户端）</div>
      <div class="user-info">
        <el-avatar
          class="user-avatar"
          :size="34"
          :src="avatar"
        >
          {{ username.charAt(0).toUpperCase() }}
        </el-avatar>
        <span class="username">{{ username }}</span>
        <el-button type="text" @click="logout">退出登录</el-button>
      </div>
    </el-header>

    <el-container class="main-container">
      <!-- 左侧侧边栏（颜色与管理员端统一） -->
      <el-aside width="200px" class="sidebar">
        <el-menu
          router
          background-color="#364554"
          text-color="#bfcbd9"
          active-text-color="#409EFF"
          class="user-menu"
        >
          <el-menu-item index="/user/book-list">
            <i class="el-icon-reading"></i>
            <span>图书列表</span>
          </el-menu-item>
          <el-menu-item index="/user/my-borrow">
            <i class="el-icon-notebook-2"></i>
            <span>我的借阅</span>
          </el-menu-item>
          <el-menu-item index="/user/profile">
            <i class="el-icon-user"></i>
            <span>个人资料</span>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <!-- 主内容区 -->
      <el-main class="content">
        <router-view />
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/user'
import { ASSET_BASE_URL } from '@/utils/request'

const router = useRouter()
const userStore = useUserStore()

const username = ref('用户')
const avatar = ref('')

const resolveAvatar = (value) => {
  if (!value) return ''
  if (value.startsWith('http://') || value.startsWith('https://')) return value
  const base = ASSET_BASE_URL.replace(/\/$/, '')
  const normalized = value.startsWith('/') ? value : `/${value}`
  return `${base}${normalized}`
}

const loadUser = () => {
  const name = userStore.username || localStorage.getItem('username') || '用户'
  username.value = name
  const avatarValue = userStore.avatar || localStorage.getItem('avatar') || ''
  avatar.value = resolveAvatar(avatarValue)
}

onMounted(() => {
  userStore.load?.()
  loadUser()
})

const logout = () => {
  userStore.logout()
  avatar.value = ''
  username.value = '用户'
  ElMessage.success('退出成功')
  router.push('/login')
}
</script>

<style scoped>
.user-home {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: #f7f6f2;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  height: 60px;
}

.logo {
  font-size: 18px;
  font-weight: 600;
  color: #7a9eb1;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  border: 1px solid #ebeef5;
}

.username {
  color: #333;
  font-size: 14px;
  font-weight: 500;
}

.main-container {
  display: flex;
  height: calc(100vh - 60px);
  overflow: hidden;
}

.sidebar {
  background: #364554; /* 与管理员端一致的侧边栏背景色 */
  box-shadow: none;
}

.user-menu {
  border-right: none;
}

.el-menu-item {
  color: #bfcbd9; /* 未选中文字颜色 */
}

.el-menu-item.is-active {
  color: #409EFF; /* 选中文字颜色 */
  background-color: #2f3d4c; /* 选中项背景色 */
}

.content {
  padding: 24px;
  overflow-y: auto;
  background: #f7f6f2;
}
</style>