<template>
  <div class="users-root">
    <div class="users-header">
      <h1 class="page-title">👥 用户管理</h1>
      <div class="users-actions">
        <el-input
          v-model="search"
          placeholder="搜索用户名/学号/邮箱"
          clearable
          @keyup.enter="onSearch"
          style="width: 280px"
        />
      </div>
    </div>

    <el-table
      v-loading="loading"
      :data="filteredUsers"
      border
      stripe
      style="width: 100%; border-radius: 12px; margin-top: 16px"
      empty-text="暂无用户数据"
    >
      <el-table-column prop="id" label="ID" width="60" align="center" />
      <el-table-column label="头像" width="80" align="center">
        <template #default="{ row }">
          <img :src="fullAvatarUrl(row.avatar)" class="avatar" alt="头像" />
        </template>
      </el-table-column>
      <el-table-column prop="username" label="用户名" />
      <el-table-column prop="studentId" label="学号" />
      <el-table-column prop="email" label="邮箱" />
      <el-table-column prop="role" label="角色" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.role === 'admin' ? 'danger' : 'success'">
            {{ row.role === 'admin' ? '管理员' : '普通用户' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'info'">
            {{ row.status === 'active' ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="300" align="center">
        <template #default="{ row }">
          <el-button
            size="small"
            type="primary"
            @click="openDialog(row)"
            :disabled="row.role === 'admin' && !canEditAdmin(row)"
          >
            编辑
          </el-button>
          <el-button
            size="small"
            :type="row.status === 'active' ? 'warning' : 'success'"
            @click="toggleStatus(row)"
          >
            {{ row.status === 'active' ? '禁用' : '启用' }}
          </el-button>
          <el-button
            size="small"
            type="info"
            @click="resetPassword(row)"
          >
            重置密码
          </el-button>
          <el-button
            size="small"
            type="danger"
            @click="deleteUser(row)"
            :disabled="row.role === 'admin' && Number(row.id) === currentUserId"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pager" style="display: flex; justify-content: flex-end; margin-top: 12px">
      <el-pagination
        background
        layout="prev, pager, next, jumper, ->, total"
        :current-page="page"
        :page-size="limit"
        :total="total"
        @current-change="onPageChange"
        @size-change="onSizeChange"
      />
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="编辑用户"
      width="400px"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="学号" prop="studentId">
          <el-input v-model="form.studentId" placeholder="请输入学号" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" type="email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="头像">
          <el-upload
            class="dialog-avatar-uploader"
            action="#"
            :show-file-list="false"
            :auto-upload="false"
            accept="image/*"
            @change="handleAvatarChange"
          >
            <img v-if="avatarPreview" :src="avatarPreview" class="dialog-avatar" />
            <div v-else class="dialog-avatar placeholder">上传头像</div>
          </el-upload>
          <div class="avatar-hint">支持 JPG/PNG，最大 2MB</div>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status" placeholder="请选择状态">
            <el-option label="启用" value="active" />
            <el-option label="禁用" value="inactive" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive, onBeforeUnmount, watch } from 'vue'
import request, { ASSET_BASE_URL } from '@/utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/store/user'

const defaultAvatar = '/default-avatar.png'

// 状态管理
const users = ref([])
const loading = ref(false)
const search = ref('')
const page = ref(1)
const limit = ref(10)
const total = ref(0)

// 对话框相关
const dialogVisible = ref(false)
const currentId = ref(null)
const formRef = ref(null)
const form = reactive({
  username: '',
  studentId: '',
  email: '',
  status: 'active'
})
const avatarPreview = ref('')
const avatarFile = ref(null)
const canEditAdmin = (row) => {
  if (!row) return false
  if (row.role !== 'admin') return true
  return Number(row.id) === currentUserId.value
}
const userStore = useUserStore()
userStore.load?.()
const currentUserId = computed(() => Number(userStore.id || localStorage.getItem('userId') || 0))

// 表单验证规则（修复可能的语法错误）
const rules = reactive({
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  studentId: [{ required: true, message: '请输入学号', trigger: 'blur' }],
  email: [{ type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
})

const releaseAvatarPreview = () => {
  if (avatarPreview.value && avatarPreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(avatarPreview.value)
  }
}

const handleAvatarChange = (uploadFile) => {
  if (!uploadFile?.raw) return
  releaseAvatarPreview()
  avatarFile.value = uploadFile.raw
  avatarPreview.value = URL.createObjectURL(uploadFile.raw)
}

// 搜索过滤（修复计算属性依赖问题）
const filteredUsers = computed(() => {
  if (!search.value) return users.value
  const keyword = search.value.toLowerCase()
  return users.value.filter(user => 
    (user.username && user.username.toLowerCase().includes(keyword)) ||
    (user.studentId && user.studentId.toLowerCase().includes(keyword)) ||
    (user.email && user.email.toLowerCase().includes(keyword))
  )
})

// 获取用户列表（修复异步错误处理）
const fetchUsers = async () => {
  loading.value = true
  try {
    const res = await request.get('/users', {
      params: { page: page.value, limit: limit.value, keyword: search.value || undefined }
    })
    const payload = res.data || {}
    users.value = payload.data || []
    total.value = payload.total || users.value.length
  } catch (err) {
    console.error('获取用户失败:', err)
    ElMessage.error('加载用户数据失败')
    users.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

// 打开对话框（修复表单重置逻辑）
const openDialog = (row = null) => {
  if (!row) return
  dialogVisible.value = true
  currentId.value = row.id
  form.username = row.username || ''
  form.studentId = row.studentId || ''
  form.email = row.email || ''
  form.status = row.status || 'active'
  releaseAvatarPreview()
  avatarFile.value = null
  avatarPreview.value = row.avatar ? fullAvatarUrl(row.avatar) : ''
}

// 提交表单（修复参数传递问题）
const submitForm = async () => {
  try {
    if (!formRef.value) return
    await formRef.value.validate()
    
    if (!currentId.value) return
    const payload = {
      username: form.username,
      studentId: form.studentId,
      email: form.email,
      status: form.status
    }
    if (avatarFile.value) {
      const formData = new FormData()
      Object.entries(payload).forEach(([key, value]) => {
        formData.append(key, value ?? '')
      })
      formData.append('avatar', avatarFile.value)
      await request.put(`/users/${currentId.value}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    } else {
      await request.put(`/users/${currentId.value}`, payload)
    }
    ElMessage.success('用户信息更新成功')
    dialogVisible.value = false
    fetchUsers()
  } catch (err) {
    if (err !== 'cancel') {
      console.error('表单提交失败:', err)
      ElMessage.error('操作失败，请重试')
    }
  }
}

// 切换用户状态
const toggleStatus = async (row) => {
  try {
    const newStatus = row.status === 'active' ? 'inactive' : 'active'
    
    // 如果是管理员，添加特殊提示
    if (row.role === 'admin') {
      const action = newStatus === 'active' ? '启用' : '禁用'
      await ElMessageBox.confirm(
        `确定要${action}管理员 ${row.username} 吗？${newStatus === 'inactive' ? '禁用后该管理员将无法登录系统。' : ''}`,
        `${action}管理员确认`,
        {
          type: 'warning',
          confirmButtonText: '确定',
          cancelButtonText: '取消'
        }
      )
    }
    
    await request.patch(`/users/${row.id}/status`, { status: newStatus })
    row.status = newStatus
    ElMessage.success(`用户已${newStatus === 'active' ? '启用' : '禁用'}`)
  } catch (err) {
    if (err !== 'cancel') {
      console.error('状态切换失败:', err)
      ElMessage.error(err.response?.data?.error || '状态修改失败')
    }
  }
}

// 重置密码
const resetPassword = async (row) => {
  try {
    const isSelf = Number(row.id) === currentUserId.value
    const confirmMessage = isSelf
      ? `确定要将自己的密码重置为 123456 吗？\n\n重置后您需要使用新密码重新登录。`
      : `确定要将 ${row.username} 的密码重置为 123456 吗？`
    
    await ElMessageBox.confirm(
      confirmMessage,
      '重置密码确认',
      {
        type: 'warning',
        confirmButtonText: '确定重置',
        cancelButtonText: '取消'
      }
    )
    await request.post(`/users/${row.id}/reset-password`, {
      password: '123456'
    })
    ElMessage.success('密码已重置为 123456')
    
    // 如果重置的是自己的密码，提示需要重新登录
    if (isSelf) {
      ElMessage.warning('您的密码已重置，请使用新密码重新登录')
    }
  } catch (err) {
    if (err !== 'cancel') {
      console.error('密码重置失败:', err)
      ElMessage.error(err.response?.data?.error || '密码重置失败')
    }
  }
}

// 删除用户
const deleteUser = async (row) => {
  try {
    // 不能删除当前登录的用户
    if (Number(row.id) === currentUserId.value) {
      ElMessage.warning('不能删除当前登录的用户')
      return
    }
    
    // 如果是管理员，显示特殊警告
    const isAdmin = row.role === 'admin'
    const confirmMessage = isAdmin
      ? `⚠️ 警告：您即将删除管理员账户 ${row.username}！\n\n删除管理员账户可能导致系统管理功能受限，请谨慎操作。\n\n删除后该用户的所有借阅记录将被自动归还。\n\n确定要继续吗？`
      : `确定要删除用户 ${row.username} 吗？删除后该用户的所有借阅记录将被自动归还。`
    
    await ElMessageBox.confirm(
      confirmMessage,
      isAdmin ? '删除管理员确认' : '删除确认',
      {
        type: 'danger',
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        dangerouslyUseHTMLString: false
      }
    )
    await request.delete(`/users/${row.id}`)
    ElMessage.success('用户已删除')
    fetchUsers()
  } catch (err) {
    if (err !== 'cancel') {
      console.error('用户删除失败:', err)
      ElMessage.error(err.response?.data?.error || '删除失败')
    }
  }
}

// 分页与搜索事件
const onPageChange = (p) => { page.value = p; fetchUsers() }
const onSizeChange = (s) => { limit.value = s; page.value = 1; fetchUsers() }
const onSearch = () => { page.value = 1; fetchUsers() }

const fullAvatarUrl = (url) => {
  if (!url) return defaultAvatar
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const base = ASSET_BASE_URL.replace(/\/$/, '')
  const normalized = url.startsWith('/') ? url : `/${url}`
  return `${base}${normalized}`
}

// 初始化加载
onMounted(fetchUsers)

watch(dialogVisible, (visible) => {
  if (!visible) {
    releaseAvatarPreview()
    avatarPreview.value = ''
    avatarFile.value = null
  }
})

onBeforeUnmount(releaseAvatarPreview)
</script>

<style scoped>
.users-root {
  padding: 24px;
  background: #f7f6f2;
  min-height: 100vh;
  box-sizing: border-box;
}

.users-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.page-title {
  margin: 0;
  color: #7a9eb1;
  font-size: 24px;
  font-weight: 600;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.dialog-avatar-uploader {
  display: inline-block;
}

.dialog-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid #e5e5e5;
}

.dialog-avatar.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  background: #f5f5f5;
  font-size: 12px;
}

.avatar-hint {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.pager {
  margin-top: 16px;
}

/* 修复可能的样式冲突 */
::v-deep .el-dialog__body {
  padding: 20px;
}

::v-deep .el-form-item {
  margin-bottom: 16px;
}
</style>