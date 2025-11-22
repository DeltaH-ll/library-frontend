<template>
  <div class="borrow-root">
    <div class="borrow-header">
      <h1 class="borrow-title">📖 借阅管理</h1>
      <div style="display:flex;gap:12px;align-items:center;">
        <el-button type="primary" @click="openDialog">借书</el-button>
      </div>
    </div>

    <!-- 搜索 + 表格 -->
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
      <div style="display:flex; gap:8px; align-items:center;">
        <el-input 
          v-model="q" 
          placeholder="按书名、借阅人、学号或邮箱搜索" 
          clearable 
          @keyup.enter="onSearchEnter" 
          style="width:320px" 
        />
        <el-button @click="onSearchEnter">查询</el-button>
      </div>
      <div style="color:#666">共 <strong>{{ total }}</strong> 条借阅记录</div>
    </div>

    <el-table
      :data="records"
      border
      v-loading="loading"
      empty-text="暂无借阅记录"
      style="width: 100%; border-radius: 12px; margin-top: 8px;"
    >
      <el-table-column prop="id" label="ID" width="60" align="center" />
      <el-table-column label="封面" width="110" align="center">
        <template #default="{ row }">
          <img
            v-if="row.cover_url"
            :src="fullCoverUrl(row.cover_url)"
            class="cover-thumb"
            alt="封面"
          />
          <span v-else class="no-cover">暂无</span>
        </template>
      </el-table-column>
      <el-table-column prop="book_title" label="书名" />
      <el-table-column prop="username" label="借阅人" />
      <el-table-column prop="studentId" label="学号" />
      <el-table-column prop="email" label="邮箱" />
      <el-table-column prop="borrow_date" label="借出时间" width="200" />
      <el-table-column prop="return_date" label="还书时间" width="200" />
      <el-table-column prop="status" label="状态" width="120" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === '已还' ? 'success' : (row.status === '借出' ? 'warning' : 'info')">
            {{ row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" align="center">
        <template #default="{ row }">
          <el-button
            size="small"
            v-if="row.status === '借出'"
            type="success"
            @click="returnBook(row.id)"
          >还书</el-button>
          <el-button
            size="small"
            type="danger"
            @click="deleteRecord(row.id)"
          >删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div style="text-align:right; margin-top:12px;">
      <el-pagination
        :current-page="page"
        :page-size="limit"
        :total="total"
        layout="prev, pager, next, jumper"
        @current-change="onPageChange"
      />
    </div>

    <!-- 借书对话框 -->
    <el-dialog v-model="dialogVisible" title="借书" width="520px">
      <el-form ref="formRef" :model="form" label-width="90px">
        <el-form-item label="图书" prop="book_id" :rules="[{ required: true, message: '请选择图书', trigger: 'change' }]">
          <el-select v-model="form.book_id" placeholder="请选择图书" filterable style="width: 100%;">
            <el-option
              v-for="book in availableBooks"
              :key="book.id"
              :label="`${book.title}（剩 ${book.available_count} / 总 ${book.total_count}）`"
              :value="book.id"
            />
          </el-select>
        </el-form-item>

        <!-- 管理员选择借阅人 -->
        <el-form-item v-if="isAdmin" label="借阅人" prop="user_id" :rules="[{ required: true, message: '请选择借阅人', trigger: 'change' }]">
          <el-select v-model="form.user_id" placeholder="请选择用户" filterable style="width:100%">
            <el-option
              v-for="u in users"
              :key="u.id"
              :label="`${u.username}（学号：${u.studentId || '无'} | 邮箱：${u.email || '无'}）`"
              :value="u.id"
            />
          </el-select>
        </el-form-item>

      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="onSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import request, { ASSET_BASE_URL } from '@/utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'

// 状态管理
const records = ref([])
const total = ref(0)
const page = ref(1)
const limit = ref(6)
const q = ref('')
const loading = ref(false)

// 对话框相关
const dialogVisible = ref(false)
const form = ref({ book_id: '', user_id: '' })
const formRef = ref(null)
const submitting = ref(false)

// 辅助数据
const books = ref([])
const users = ref([])
const availableBooks = computed(() => {
  // 安全过滤可借图书
  return (books.value || []).filter(book => {
    return Number(book?.available_count || 0) > 0
  })
})

const fullCoverUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const base = ASSET_BASE_URL.replace(/\/$/, '')
  const normalized = url.startsWith('/') ? url : `/${url}`
  return `${base}${normalized}`
}

// 权限相关 - 从本地存储获取用户信息
const currentUserId = localStorage.getItem('userId') || null
const currentUserRole = localStorage.getItem('role') || null
const isAdmin = computed(() => currentUserRole === 'admin')
// 时间格式化 - 兼容多种时间格式
const formatDateTime = (value) => {
  if (!value) return '—'
  
  // 处理不同格式的时间字符串
  const timestamp = Date.parse(value.replace(/-/g, '/')) // 兼容iOS日期解析
  if (isNaN(timestamp)) return value
  
  const date = new Date(timestamp)
  const pad = (num) => String(num).padStart(2, '0')
  
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

// 获取借阅记录
const fetchRecords = async () => {
  loading.value = true
  try {
    const response = await request.get('/borrow', {
      params: { 
        page: page.value, 
        limit: limit.value, 
        q: q.value.trim() // 去除搜索关键词空格
      }
    })

    const resData = response.data || {}
    const rawRecords = resData.data || []
    total.value = resData.total ?? rawRecords.length
    
    // 格式化记录数据
    records.value = rawRecords.map(record => ({
      ...record,
      borrow_date: formatDateTime(record.borrow_date),
      return_date: formatDateTime(record.return_date),
      username: record.username || '未知用户',
      studentId: record.studentId || '—',
      email: record.email || '—'
    }))
  } catch (err) {
    console.error('获取借阅记录失败:', err)
    const errorMsg = err.response?.status === 401 
      ? '请先登录' 
      : err.response?.status === 404 
        ? '借阅记录接口不存在' 
        : '加载借阅记录失败'
    ElMessage.error(errorMsg)
    records.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

// 获取图书列表（用于借书选择）
const fetchBooksForSelect = async () => {
  try {
    const response = await request.get('/books', {
      params: { page: 1, limit: 1000, status: '在馆' }
    })
    
    const resData = response.data || {}
    books.value = resData.data || []
  } catch (err) {
    console.error('获取图书列表失败:', err)
    ElMessage.error('加载图书列表失败，无法借书')
    books.value = []
  }
}

// 获取用户列表（管理员用）
const fetchUsers = async () => {
  if (!isAdmin.value) return // 非管理员不加载用户列表
  
  try {
    const response = await request.get('/users')
    const resData = response.data || {}
    users.value = resData.data || []
  } catch (err) {
    console.error('获取用户列表失败:', err)
    ElMessage.error('加载用户列表失败')
    users.value = []
  }
}

// 打开借书对话框
const openDialog = () => {
  // 初始化表单（非管理员自动填充当前用户ID）
  form.value = {
    book_id: '',
    user_id: isAdmin.value ? '' : (currentUserId || '')
  }
  dialogVisible.value = true
  
  // 预加载数据
  fetchBooksForSelect()
  if (isAdmin.value) {
    fetchUsers()
  }
}

// 提交借书
const onSubmit = async () => {
  if (!formRef.value) return
  
  // 表单验证
  try {
    await formRef.value.validate()
  } catch (err) {
    ElMessage.error('请填写完整借书信息')
    return
  }

  submitting.value = true
  try {
    // 根据权限构造请求体
    const payload = isAdmin.value
      ? { book_id: form.value.book_id, user_id: form.value.user_id }
      : { book_id: form.value.book_id }

    const response = await request.post('/borrow', payload)

    if (response.data?.success) {
      ElMessage.success('借书成功')
      dialogVisible.value = false
      // 刷新数据
      fetchRecords()
      fetchBooksForSelect()
    } else {
      ElMessage.error('借书失败：' + (response.data?.error || '未知错误'))
    }
  } catch (err) {
    console.error('借书请求失败:', err)
    const errorMsg = err.response?.data?.error || '网络错误，借书失败'
    ElMessage.error(errorMsg)
  } finally {
    submitting.value = false
  }
}

// 还书操作
const returnBook = async (borrowId) => {
  if (!borrowId) return
  
  try {
    await ElMessageBox.confirm('确认归还该图书吗？', '还书确认', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const response = await request.put(
      `/borrow/${borrowId}/return`
    )

    if (response.data?.success) {
      ElMessage.success('还书成功')
      fetchRecords()
      fetchBooksForSelect()
    } else {
      ElMessage.error('还书失败：' + (response.data?.error || '未知错误'))
    }
  } catch (err) {
    // 忽略用户取消操作
    if (err !== 'cancel') {
      console.error('还书请求失败:', err)
      ElMessage.error('还书失败，请重试')
    }
  }
}

// 删除借阅记录
const deleteRecord = async (borrowId) => {
  if (!borrowId) return
  
  try {
    await ElMessageBox.confirm('确认删除该借阅记录吗？删除后ID将自动重新排序。', '删除确认', {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const response = await request.delete(`/borrow/${borrowId}`)

    if (response.data?.success) {
      ElMessage.success('删除成功')
      fetchRecords()
      fetchBooksForSelect()
    } else {
      ElMessage.error('删除失败：' + (response.data?.error || '未知错误'))
    }
  } catch (err) {
    // 忽略用户取消操作
    if (err !== 'cancel') {
      console.error('删除借阅记录失败:', err)
      const errorMsg = err.response?.data?.error || '删除失败，请重试'
      ElMessage.error(errorMsg)
    }
  }
}

// 分页和搜索事件处理
const onPageChange = (newPage) => {
  page.value = newPage
  fetchRecords()
}

const onSearchEnter = () => {
  page.value = 1 // 搜索时重置页码
  fetchRecords()
}

// 监听权限变化，重新加载用户列表
watch(isAdmin, (newVal) => {
  if (newVal) {
    fetchUsers()
  }
})

// 页面初始化加载数据
onMounted(() => {
  fetchRecords()
  fetchBooksForSelect()
  if (isAdmin.value) {
    fetchUsers()
  }
})
</script>

<style scoped>
.borrow-root {
  width: 100%;
  padding: 24px;
  background: #f7f6f2;
  min-height: 100vh;
  box-sizing: border-box;
}

.borrow-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.borrow-title {
  color: #7a9eb1;
  font-size: 24px;
  font-weight: 600;
  margin: 0;
}

.cover-thumb {
  width: 60px;
  height: 80px;
  object-fit: cover;
  border-radius: 4px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}

.no-cover {
  color: #999;
  font-size: 12px;
}

.el-tag {
  font-size: 13px;
  padding: 4px 8px;
}

/* 修复表格边框圆角显示问题 */
:deep(.el-table) {
  border-radius: 12px;
  overflow: hidden;
}

/* 优化加载状态显示 */
:deep(.el-loading-mask) {
  border-radius: 12px;
}
</style>