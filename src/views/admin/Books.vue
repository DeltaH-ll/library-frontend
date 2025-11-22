<template>
  <div class="books-root">
    <div class="books-header">
      <h1 class="books-title">📚 图书管理</h1>
      <div class="books-actions">
        <el-input
          v-model="search"
          placeholder="搜索书名或作者（按回车查询）"
          clearable
          @clear="onSearchClear"
          @keyup.enter="onSearchEnter"
          style="width: 280px"
        />
        <!-- 价格筛选组件 -->
        <div class="price-filter">
          <el-input
            v-model="minPrice"
            placeholder="最低价格"
            type="number"
            step="0.01"
            style="width: 120px"
            min="0"
          />
          <span style="color: #999; margin: 0 8px">至</span>
          <el-input
            v-model="maxPrice"
            placeholder="最高价格"
            type="number"
            step="0.01"
            style="width: 120px"
            min="0"
          />
          <el-button type="default" @click="onPriceFilter">筛选</el-button>
          <el-button type="text" @click="resetPriceFilter" style="color: #999">重置</el-button>
        </div>
        <el-button type="primary" @click="openAddDialog">新增图书</el-button>
      </div>
    </div>

    <el-table
      v-loading="loading"
      :data="books"
      border
      style="width: 100%; border-radius: 12px; margin-top: 16px"
      empty-text="暂无图书数据"
    >
      <el-table-column prop="id" label="ID" width="60" align="center" />
      <el-table-column label="封面" width="100" align="center">
        <template #default="{ row }">
          <img
            v-if="row.cover_url"
            :src="fullCoverUrl(row.cover_url)"
            class="book-cover"
            alt="封面"
          />
          <span v-else class="no-cover">暂无</span>
        </template>
      </el-table-column>
      <el-table-column prop="title" label="书名" />
      <el-table-column prop="author" label="作者" />
      <el-table-column prop="price" label="价格" width="120" align="center">
        <template #default="{ row }">
          {{ formatPrice(row.price) }}
        </template>
      </el-table-column>
      <el-table-column
        prop="publish_date"
        label="出版日期"
        :formatter="formatDate"
        width="140"
      />
      <el-table-column label="库存" width="160" align="center">
        <template #default="{ row }">
          <div style="line-height:1.1">
            <div><strong>{{ row.available_count ?? '—' }}</strong> 可借</div>
            <div style="color:#999">总 {{ row.total_count ?? '—' }}</div>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="140" align="center">
        <template #default="{ row }">
          <el-tag :type="tagFor(row)" disable-transitions>
            {{ statusFor(row) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220" align="center">
        <template #default="scope">
          <el-button size="small" type="primary" @click="openEditDialog(scope.row)">编辑</el-button>
          <el-button size="small" type="danger" @click="deleteBook(scope.row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pager" style="display:flex; justify-content:flex-end; margin-top: 12px;">
      <el-pagination
        background
        layout="prev, pager, next, jumper, ->, total"
        :current-page="page"
        :page-size="limit"
        :total="total"
        @current-change="onPageChange"
      />
    </div>

    <BookDialog
      v-model="dialogVisible"
      :isEdit="isEdit"
      :formData="currentBook"
      @submit="handleDialogSubmit"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request, { ASSET_BASE_URL } from '@/utils/request'
import BookDialog from '../../components/BookDialog.vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const books = ref([])
const search = ref('')
const dialogVisible = ref(false)
const isEdit = ref(false)
const currentBook = ref(null)
const loading = ref(false)

const page = ref(1)
const limit = ref(6)
const total = ref(0)

// 价格筛选相关数据
const minPrice = ref('')
const maxPrice = ref('')

// 价格格式化（处理非数字情况）
const formatPrice = (price) => {
  const num = Number(price)
  if (Number.isFinite(num)) {
    return `¥${num.toFixed(2)}`
  }
  return '¥0.00'
}

// 获取图书列表（修正接口路径）
const fetchBooks = async () => {
  loading.value = true
  try {
    const res = await request.get('/books', {
      params: {
        page: page.value,
        limit: limit.value,
        keyword: search.value || undefined,
        minPrice: minPrice.value ? Number(minPrice.value) : undefined,
        maxPrice: maxPrice.value ? Number(maxPrice.value) : undefined
      }
    })
    const payload = res.data || {}
    books.value = payload.data || []
    total.value = payload.total || 0
  } catch (err) {
    console.error('加载图书失败:', err)
    // 更详细的错误提示
    const errorMsg = err.response?.status === 404 
      ? '接口不存在，请检查后端是否启动或路径是否正确'
      : '加载图书失败，请稍后重试'
    ElMessage.error(errorMsg)
  } finally {
    loading.value = false
  }
}

// 搜索相关方法
const onSearchEnter = () => { page.value = 1; fetchBooks() }
const onSearchClear = () => { page.value = 1; search.value = ''; fetchBooks() }

// 分页相关方法
const onPageChange = (p) => { page.value = p; fetchBooks() }

// 价格筛选方法
const onPriceFilter = () => {
  page.value = 1
  fetchBooks()
}
const resetPriceFilter = () => {
  minPrice.value = ''
  maxPrice.value = ''
  page.value = 1
  fetchBooks()
}

// 日期格式化
const formatDate = (row, column, value) => {
  if (!value) return '—'
  const d = new Date(value)
  return isNaN(d.getTime()) ? value : d.toLocaleDateString()
}

// 封面图片完整路径
const fullCoverUrl = (cover_url) => {
  if (!cover_url) return ''
  if (cover_url.startsWith('http://') || cover_url.startsWith('https://')) {
    return cover_url
  }
  const base = ASSET_BASE_URL.replace(/\/$/, '')
  const normalized = cover_url.startsWith('/') ? cover_url : `/${cover_url}`
  return `${base}${normalized}`
}

// 打开新增对话框
const openAddDialog = () => {
  isEdit.value = false
  currentBook.value = {
    total_count: 1,
    price: 0
  }
  dialogVisible.value = true
}

// 打开编辑对话框
const openEditDialog = (book) => {
  isEdit.value = true
  currentBook.value = {
    id: book.id,
    title: book.title,
    author: book.author,
    publish_date: book.publish_date || '',
    total_count: book.total_count ?? 1,
    cover_url: book.cover_url || null,
    price: typeof book.price === 'number' ? book.price : 0
  }
  dialogVisible.value = true
}

// 提交表单（新增/编辑）
const handleDialogSubmit = async (book) => {
  try {
    // 格式化日期
    if (book.publish_date instanceof Date) {
      book.publish_date = book.publish_date.toISOString().slice(0, 10)
    }
    // 确保价格为数字
    const bookPrice = typeof book.price === 'number' ? book.price : Number(book.price) || 0

    // 处理文件上传
    const hasFile = book.coverFile instanceof File
    if (hasFile) {
      const form = new FormData()
      form.append('title', book.title)
      form.append('author', book.author || '')
      form.append('publisher', book.publisher || '')
      form.append('publish_date', book.publish_date || '')
      form.append('total_count', book.total_count ?? 1)
      form.append('price', bookPrice)
      form.append('cover', book.coverFile)
      
      if (isEdit.value) {
        await request.put(`/books/${book.id}`, form, { 
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        ElMessage.success('图书编辑成功')
      } else {
        await request.post('/books', form, { 
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        ElMessage.success('新增图书成功')
      }
    } else {
      // 普通JSON提交
      const payload = {
        title: book.title,
        author: book.author,
        publisher: book.publisher || null,
        publish_date: book.publish_date,
        total_count: book.total_count ?? 1,
        cover_url: book.cover_url || null,
        price: bookPrice
      }
      
      if (isEdit.value) {
        await request.put(`/books/${book.id}`, payload)
        ElMessage.success('图书编辑成功')
      } else {
        await request.post('/books', payload)
        ElMessage.success('新增图书成功')
      }
    }

    dialogVisible.value = false
    fetchBooks()
  } catch (err) {
    console.error('保存图书失败:', err)
    let msg = '保存失败，请检查输入或服务器状态'
    if (err?.response?.data?.error) {
      msg = err.response.data.error
    } else if (err?.response?.data?.message) {
      msg = err.response.data.message
    } else if (err?.message) {
      msg = err.message
    }
    // 如果是开发环境，显示更详细的错误信息
    if (process.env.NODE_ENV === 'development' && err?.response?.data?.details) {
      console.error('详细错误信息:', err.response.data.details)
    }
    ElMessage.error(msg)
  }
}

// 删除图书
const deleteBook = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除这本图书吗？', '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await request.delete(`/books/${id}`)
    ElMessage.success('删除成功')
    fetchBooks()
  } catch (err) {
    if (err && err !== 'cancel') {
      console.error('删除图书失败:', err)
      const msg = err?.response?.data?.error || '删除失败'
      ElMessage.error(msg)
    }
  }
}

// 状态标签文字
const statusFor = (row) => {
  const total = Number(row.total_count)
  const avail = Number(row.available_count)
  const safeTotal = Number.isFinite(total) ? total : 0
  const safeAvail = Number.isFinite(avail) ? avail : 0
  if (safeTotal <= 0) return '不可借阅'
  if (safeAvail >= safeTotal) return '全部在馆'
  if (safeAvail <= 0) return '不可借阅'
  return '部分借出'
}

// 状态标签样式
const tagFor = (row) => {
  const s = statusFor(row)
  if (s === '全部在馆') return 'success'
  if (s === '部分借出') return 'warning'
  return 'danger'
}

// 页面挂载时加载数据
onMounted(() => { fetchBooks() })
</script>

<style scoped>
.books-root {
  width: 100%;
  min-height: 100%;
  padding: 24px;
  background: #f7f6f2;
  box-sizing: border-box;
}

.books-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.books-title {
  color: #7a9eb1;
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.books-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.price-filter {
  display: flex;
  align-items: center;
  gap: 8px;
}

.book-cover {
  width: 60px;
  height: 80px;
  object-fit: cover;
  border-radius: 4px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.no-cover {
  color: #999;
  font-size: 13px;
}

.pager {
  margin-top: 12px;
}
</style>