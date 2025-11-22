<template>
  <div class="login-root">
    <div class="bg-overlay"></div>

    <el-card class="login-card">
      <div class="welcome">
        <p class="welcome-title">欢迎回来 👋</p>
        <p class="welcome-desc">一句问候，一次借阅，开启今天的阅读之旅</p>
      </div>

      <el-form
        :model="form"
        :rules="rules"
        ref="formRef"
        label-width="90px"
        class="login-form"
      >
        <el-form-item label="登录账号" prop="identifier">
          <el-input
            v-model="form.identifier"
            autocomplete="off"
            placeholder="请输入用户名 / 邮箱 / 学号"
            clearable
          />
        </el-form-item>

        <el-form-item label="登录密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            autocomplete="off"
            placeholder="请输入密码"
            show-password
          />
        </el-form-item>

        <el-form-item class="btn-row">
          <el-button type="primary" @click="onLogin" :loading="loading" round block>
            立即登录
          </el-button>
        </el-form-item>
      </el-form>

      <div class="extra-action">
        <span>还没有账号？</span>
        <el-button type="text" @click="goRegister">马上注册</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/user'

const router = useRouter()
const store = useUserStore()

const form = ref({ identifier: '', password: '' })
const formRef = ref(null)
const loading = ref(false)

const rules = {
  identifier: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const onLogin = async () => {
  if (!formRef.value) {
    ElMessage.error('表单未初始化，请刷新页面重试')
    return
  }

  try {
    await formRef.value.validate()
    loading.value = true

    // 发送登录请求（确保接口地址正确）
    const res = await request.post('/auth/login', form.value)
    const responseData = res.data || {}

    // 1. 处理后端返回的错误状态
    if (!responseData.success) {
      ElMessage.error('登录失败：' + (responseData.msg || '用户名或密码错误'))
      return
    }

    // 2. 验证核心数据是否存在（增强兼容性提示）
    if (!responseData.user) {
      console.error('登录响应缺少用户信息', responseData)
      ElMessage.error('登录失败：服务器未返回用户信息')
      return
    }

    // 3. 单独验证 token（针对后端未返回 token 的情况）
    if (!responseData.token) {
      console.error('登录响应缺少 token', responseData)
      ElMessage.error('登录失败：服务器未返回认证令牌，请联系管理员')
      return
    }

    const user = responseData.user
    // 4. 验证用户信息完整性
    const missingFields = []
    if (!user.id) missingFields.push('用户ID')
    if (!user.username) missingFields.push('用户名')
    if (!user.role) missingFields.push('用户角色')
    
    if (missingFields.length > 0) {
      console.error('用户信息不完整', user)
      ElMessage.error(`登录失败：用户信息缺少${missingFields.join('、')}`)
      return
    }

    // 5. 更新状态管理与本地存储
    store.login({
      username: user.username,
      role: user.role,
      id: user.id,
      token: responseData.token,
      email: user.email,
      studentId: user.studentId,
      avatar: user.avatar
    })

    ElMessage.success(`欢迎回来，${user.username}`)

    // 7. 根据角色跳转
    if (user.role === 'admin') {
      router.push('/admin/dashboard')
    } else {
      router.push('/user/my-borrow')
    }

  } catch (err) {
    // 细化错误处理
    if (err.isAxiosError) {
      console.error('登录请求错误：', err)
      if (err.message.includes('Network Error')) {
        ElMessage.error('网络错误，请检查后端是否启动或地址是否正确')
      } else if (err.response?.status === 403) {
        ElMessage.error('跨域权限被拒绝，请检查后端CORS配置')
      } else {
        ElMessage.error(`请求失败：${err.response?.status || '未知错误'}`)
      }
    } else if (err.name !== 'ValidationError') {
      console.error('登录异常：', err)
      ElMessage.error('登录失败，请重试')
    }
  } finally {
    loading.value = false
  }
}

const goRegister = () => router.push('/register')
</script>

<style scoped>
/* 样式保持不变 */
.login-root {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: url('/images/login-background.jpg') no-repeat center center;
  background-size: cover;
  background-attachment: fixed;
  overflow: hidden;
}
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
.login-card {
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
.login-card:hover {
  transform: translateY(-4px);
}
.welcome {
  text-align: left;
  margin-bottom: 18px;
}
.welcome-title {
  font-size: 22px;
  font-weight: 600;
  color: #4a6572;
  margin: 0;
}
.welcome-desc {
  margin: 4px 0 12px;
  color: #7a8c99;
  font-size: 13px;
}
.login-form {
  margin-top: 8px;
}
.btn-row {
  margin-top: 6px;
}
.extra-action {
  text-align: center;
  margin-top: 4px;
  color: #7a8c99;
}
.extra-action span {
  margin-right: 4px;
}
</style>