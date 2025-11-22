<template>
  <div class="register-root">
    <!-- 背景模糊层 -->
    <div class="bg-overlay"></div>

    <!-- 注册卡片 -->
    <el-card class="register-card">
      <h2 class="register-title">注册新账号</h2>

      <el-form :model="form" :rules="rules" ref="formRef" label-width="90px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" autocomplete="off" />
        </el-form-item>

        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" autocomplete="off" placeholder="请输入常用邮箱" />
        </el-form-item>

        <el-form-item label="学号" prop="studentId">
          <el-input v-model="form.studentId" autocomplete="off" placeholder="请输入学号" />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" autocomplete="off" />
        </el-form-item>

        <el-form-item label="确认密码" prop="confirm">
          <el-input v-model="form.confirm" type="password" autocomplete="off" />
        </el-form-item>

        <!-- 角色选择 -->
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" placeholder="请选择角色" style="width: 100%;">
            <el-option label="普通用户" value="user" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>

        <!-- 邀请码（仅管理员需要） -->
        <el-form-item 
          v-if="form.role === 'admin'" 
          label="邀请码" 
          prop="inviteCode"
        >
          <el-input 
            v-model="form.inviteCode" 
            autocomplete="off" 
            placeholder="请输入管理员邀请码"
            type="password"
            show-password
          />
        </el-form-item>

        <el-form-item label="头像(可选)">
          <el-upload
            class="avatar-uploader"
            action="#"
            :show-file-list="false"
            :auto-upload="false"
            accept="image/*"
            @change="handleAvatarChange"
          >
            <img v-if="avatarPreview" :src="avatarPreview" class="avatar-preview" />
            <div v-else class="avatar-placeholder">
              <i class="el-icon-plus"></i>
              <span>上传头像</span>
            </div>
          </el-upload>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="onRegister">注册</el-button>
          <el-button type="text" @click="goLogin">返回登录</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'

const router = useRouter()
const form = ref({
  username: '',
  email: '',
  studentId: '',
  password: '',
  confirm: '',
  role: 'user', // 默认普通用户
  inviteCode: '' // 邀请码
})
const formRef = ref(null)
const avatarFile = ref(null)
const avatarPreview = ref('')

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }
  ],
  studentId: [{ required: true, message: '请输入学号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  confirm: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== form.value.password) {
          callback(new Error('两次输入密码不一致'))
        } else callback()
      },
      trigger: 'blur'
    }
  ],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  inviteCode: [
    {
      validator: (rule, value, callback) => {
        // 只有选择管理员时才需要验证邀请码
        if (form.value.role === 'admin') {
          if (!value) {
            callback(new Error('请输入管理员邀请码'))
          } else if (value !== '123qwe') {
            callback(new Error('邀请码不正确'))
          } else {
            callback()
          }
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

const onRegister = () => {
  formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        const formData = new FormData()
        formData.append('username', form.value.username)
        formData.append('email', form.value.email)
        formData.append('studentId', form.value.studentId)
        formData.append('password', form.value.password)
        formData.append('role', form.value.role)
        if (form.value.role === 'admin') {
          formData.append('inviteCode', form.value.inviteCode)
        }
        if (avatarFile.value) {
          formData.append('avatar', avatarFile.value)
        }
        await request.post('/auth/register', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        ElMessage.success('注册成功，请登录')
        router.push('/login')
      } catch (e) {
        ElMessage.error(e.response?.data?.error || '注册失败')
      }
    }
  })
}

const goLogin = () => router.push('/login')

const handleAvatarChange = (uploadFile) => {
  if (!uploadFile?.raw) return
  if (avatarPreview.value) {
    URL.revokeObjectURL(avatarPreview.value)
  }
  avatarFile.value = uploadFile.raw
  avatarPreview.value = URL.createObjectURL(uploadFile.raw)
}

// 监听角色变化，切换为普通用户时清空邀请码
watch(() => form.value.role, (newRole) => {
  if (newRole !== 'admin') {
    form.value.inviteCode = ''
  }
})

onBeforeUnmount(() => {
  if (avatarPreview.value) {
    URL.revokeObjectURL(avatarPreview.value)
  }
})
</script>

<style scoped>
.register-root {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;

  /* ✅ 背景图（public/images/login-background.jpg） */
  background: url('/images/login-background.jpg') no-repeat center center;
  background-size: cover;
  background-attachment: fixed;
  overflow: hidden;
}

/* 模糊遮罩层 */
.bg-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(247, 246, 242, 0.4);
  backdrop-filter: blur(6px);
  z-index: 0;
}

/* 注册卡片 */
.register-card {
  position: relative;
  z-index: 1;
  width: 380px;
  border-radius: 16px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.15);
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  padding: 20px 24px;
  transition: all 0.3s ease;
}
.register-card:hover {
  transform: translateY(-4px);
}

/* 标题 */
.register-title {
  text-align: center;
  color: #7a9eb1;
  margin-bottom: 24px;
  font-weight: 600;
}

.avatar-uploader {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 90px;
  height: 90px;
  border: 1px dashed #dcdfe6;
  border-radius: 50%;
  cursor: pointer;
  color: #9fa6ad;
  background: #f9fafb;
}
.avatar-preview {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  object-fit: cover;
}
.avatar-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 12px;
}
</style>
