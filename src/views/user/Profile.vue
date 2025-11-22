<template>
  <div class="profile-root">
    <h1 class="page-title">👤 我的资料</h1>

    <!-- 基本信息 -->
    <div class="profile-card" v-loading="loadingProfile">
      <div class="avatar-section">
        <el-upload
          class="avatar-uploader"
          action="#"
          :show-file-list="false"
          :auto-upload="false"
          :on-change="handleAvatarChange"
          accept="image/*"
        >
          <img v-if="avatarUrl" :src="avatarUrl" class="avatar-img" />
          <div v-else class="avatar-placeholder">上传头像</div>
        </el-upload>
        <p class="avatar-tip">点击头像可更换</p>
      </div>

      <div class="info-section">
        <el-form
          :model="form"
          :rules="rules"
          label-width="100px"
          class="info-form"
        >
          <el-form-item label="用户名" prop="username">
            <el-input v-model="form.username" />
          </el-form-item>
          
          <!-- 新增学号字段 -->
          <el-form-item label="学号" prop="studentId">
            <el-input v-model="form.studentId" />
          </el-form-item>

          <el-form-item label="邮箱" prop="email">
            <el-input v-model="form.email" />
          </el-form-item>

          <el-form-item label="角色">
            <el-tag :type="userStore.role === 'admin' ? 'danger' : 'success'">
              {{ userStore.role === 'admin' ? '管理员' : '普通用户' }}
            </el-tag>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="submitProfile" :loading="loadingProfile">保存修改</el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <!-- 修改密码 -->
    <div class="password-card">
      <h3 class="section-title">🔒 修改密码</h3>
      <el-form
        :model="passwordForm"
        :rules="passwordRules"
        label-width="100px"
        class="password-form"
      >
        <el-form-item label="旧密码" prop="oldPassword">
          <el-input v-model="passwordForm.oldPassword" type="password" />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="passwordForm.newPassword" type="password" />
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input v-model="passwordForm.confirmPassword" type="password" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="changePassword">更新密码</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import request, { ASSET_BASE_URL } from '@/utils/request'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()

const form = ref({
  username: '',
  studentId: '',
  email: '',
  avatar: ''
})

const loadingProfile = ref(false)
const avatarPreview = ref('')
const avatarFile = ref(null)

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  studentId: [{ required: true, message: '请输入学号', trigger: 'blur' }],
  email: [{ type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }]
}

// 修改密码表单
const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const passwordRules = {
  oldPassword: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
  newPassword: [{ required: true, message: '请输入新密码', trigger: 'blur' }],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== passwordForm.value.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else callback()
      },
      trigger: 'blur'
    }
  ]
}

const resolveAvatar = (url) => {
  if (!url) return '/default-avatar.png'
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const base = ASSET_BASE_URL.replace(/\/$/, '')
  const normalized = url.startsWith('/') ? url : `/${url}`
  return `${base}${normalized}`
}

const avatarUrl = computed(() => avatarPreview.value || resolveAvatar(form.value.avatar))

const loadProfile = async () => {
  loadingProfile.value = true
  try {
    const res = await request.get('/users/me/profile')
    const data = res.data?.data || {}
    form.value = {
      username: data.username || '',
      studentId: data.studentId || '',
      email: data.email || '',
      avatar: data.avatar || ''
    }
    userStore.updateProfile(data)
  } catch (err) {
    console.error('获取个人资料失败:', err)
    ElMessage.error('加载资料失败，请稍后重试')
  } finally {
    loadingProfile.value = false
  }
}

// 更新头像
const handleAvatarChange = (file) => {
  if (avatarPreview.value) {
    URL.revokeObjectURL(avatarPreview.value)
  }
  avatarFile.value = file.raw
  avatarPreview.value = URL.createObjectURL(file.raw)
}

const submitProfile = async () => {
  if (!form.value.username) {
    ElMessage.warning('用户名不能为空')
    return
  }
  const formData = new FormData()
  formData.append('username', form.value.username)
  formData.append('studentId', form.value.studentId || '')
  formData.append('email', form.value.email || '')
  if (avatarFile.value) {
    formData.append('avatar', avatarFile.value)
  }

  try {
    await request.put('/users/me/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    ElMessage.success('资料已更新')
    avatarFile.value = null
    avatarPreview.value = ''
    await loadProfile()
  } catch (err) {
    console.error('更新资料失败:', err)
    ElMessage.error(err.response?.data?.error || '更新失败，请稍后重试')
  }
}

// 修改密码
const changePassword = async () => {
  if (
    !passwordForm.value.oldPassword ||
    !passwordForm.value.newPassword ||
    !passwordForm.value.confirmPassword
  ) {
    ElMessage.warning('请完整填写所有字段')
    return
  }

  if (passwordForm.value.oldPassword === passwordForm.value.newPassword) {
    ElMessage.warning('新密码不能与旧密码相同')
    return
  }

  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    ElMessage.error('两次新密码不一致')
    return
  }

  try {
    await request.put('/users/me/password', {
      oldPassword: passwordForm.value.oldPassword,
      newPassword: passwordForm.value.newPassword
    })
    ElMessage.success('密码修改成功')
    passwordForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
  } catch (err) {
    console.error('修改密码失败:', err)
    ElMessage.error(err.response?.data?.error || '密码修改失败')
  }
}

onMounted(() => {
  userStore.load()
  loadProfile()
})

onBeforeUnmount(() => {
  if (avatarPreview.value) {
    URL.revokeObjectURL(avatarPreview.value)
  }
})
</script>

<style scoped>
.profile-root {
  padding: 24px;
  background: #f7f6f2;
  min-height: 100vh;
  box-sizing: border-box;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #7a9eb1;
  margin-bottom: 24px;
}

/* 资料卡片 */
.profile-card {
  display: flex;
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  margin-bottom: 40px;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 200px;
  border-right: 1px solid #eee;
  padding-right: 24px;
}

.avatar-uploader {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px dashed #dcdfe6;
  cursor: pointer;
}
.avatar-img {
  width: 120px;
  height: 120px;
  object-fit: cover;
}
.avatar-placeholder {
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 14px;
}
.avatar-tip {
  margin-top: 8px;
  color: #999;
  font-size: 12px;
}

.info-section {
  flex: 1;
  padding-left: 24px;
}
.info-form {
  max-width: 400px;
}

/* 修改密码卡片 */
.password-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}
.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #7a9eb1;
  margin-bottom: 16px;
}
.password-form {
  max-width: 400px;
}
</style>