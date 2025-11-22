<template>
  <div class="books-root">
    <div class="books-header">
      <h1 class="books-title">📚 图书列表</h1>
      <div class="books-actions">
        <el-input
          v-model="search"
          placeholder="搜索书名或作者（按回车查询）"
          clearable
          @clear="onSearchClear"
          @keyup.enter="onSearchEnter"
          style="width: 280px"
        />
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
      <el-table-column label="操作" width="180" align="center">
        <template #default="{ row }">
          <el-button
            size="small"
            type="default"
            @click="openDetail(row)"
          >
            查看
          </el-button>
          <el-button
            size="small"
            type="primary"
            @click="borrowBook(row)"
            :disabled="Number(row.available_count) <= 0"
          >
            {{ Number(row.available_count) > 0 ? '借阅' : '已借完' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页组件（与admin风格一致） -->
    <div class="pager" style="display:flex; justify-content:flex-end; margin-top: 12px;">
      <el-pagination
        background
        layout="prev, pager, next, jumper, ->, total"
        :current-page="page"
        :page-size="limit"
        :total="total"
        @current-change="onPageChange"
        @size-change="onSizeChange"
        :page-sizes="[5,10,20,50]"
      />
    </div>
  </div>

  <el-drawer v-model="detailVisible" title="图书详情" size="35%">
    <div v-if="detailLoading" class="detail-loading">加载中...</div>
    <div v-else-if="detailBook" class="detail-content">
      <img
        v-if="detailBook.cover_url"
        :src="fullCoverUrl(detailBook.cover_url)"
        alt="封面"
        class="detail-cover"
      />
      <div class="detail-info">
        <p><strong>书名：</strong>{{ detailBook.title }}</p>
        <p><strong>作者：</strong>{{ detailBook.author || '未知' }}</p>
        <p><strong>出版社：</strong>{{ detailBook.publisher || '—' }}</p>
        <p><strong>出版日期：</strong>{{ formatDate(null, null, detailBook.publish_date) }}</p>
        <p><strong>价格：</strong>{{ formatPrice(detailBook.price) }}</p>
        <p><strong>库存：</strong>{{ detailBook.available_count }} / {{ detailBook.total_count }}</p>
        <p><strong>状态：</strong>{{ statusFor(detailBook) }}</p>
      </div>
    </div>
    <div v-else class="detail-empty">暂无详情</div>
  </el-drawer>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request, { ASSET_BASE_URL } from '@/utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()

// 状态管理（与admin端一致风格）
const books = ref([])
const search = ref('')
const loading = ref(false)
const page = ref(1)
const limit = ref(10)
const total = ref(0)
const detailVisible = ref(false)
const detailLoading = ref(false)
const detailBook = ref(null)

// 价格格式化（避免toFixed报错）
const formatPrice = (price) => {
  const num = Number(price)
  if (Number.isFinite(num)) {
    return `¥${num.toFixed(2)}`
  }
  return '¥0.00'
}

// 图书状态（与admin端统一）
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
const tagFor = (row) => {
  const s = statusFor(row)
  if (s === '全部在馆') return 'success'
  if (s === '部分借出') return 'warning'
  return 'danger'
}

// 日期格式化
const formatDate = (row, column, value) => {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d)) return value
  return d.toLocaleDateString()
}

// 封面地址拼接
const fullCoverUrl = (cover_url) => {
  if (!cover_url) return ''
  if (cover_url.startsWith('http://') || cover_url.startsWith('https://')) return cover_url
  const base = ASSET_BASE_URL.replace(/\/$/, '')
  const normalized = cover_url.startsWith('/') ? cover_url : `/${cover_url}`
  return base + normalized
}

// 获取图书列表（带分页，与admin共用接口）
const fetchBooks = async () => {
  loading.value = true
  try {
    const res = await request.get('/books', {
      params: {
        page: page.value,
        limit: limit.value,
        keyword: search.value || undefined
      }
    })
    const payload = res.data || {}
    books.value = payload.data || []
    total.value = payload.total || 0
  } catch (err) {
    console.error(err)
    ElMessage.error('加载图书失败')
  } finally {
    loading.value = false
  }
}

// 借阅图书
const borrowBook = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要借阅《${row.title}》吗？`, '借阅确认', {
      type: 'warning'
    })
    await request.post('/borrow', {
      book_id: row.id
    })
    ElMessage.success('借阅成功')
    fetchBooks() // 刷新库存
  } catch (err) {
    if (err !== 'cancel') {
      const msg = err?.response?.data?.error || '借阅失败'
      ElMessage.error(msg)
    }
  }
}

// 分页和搜索事件
const onSearchEnter = () => { page.value = 1; fetchBooks() }
const onSearchClear = () => { page.value = 1; search.value = ''; fetchBooks() }
const onPageChange = (p) => { page.value = p; fetchBooks() }
const onSizeChange = (s) => { limit.value = s; page.value = 1; fetchBooks() }

const openDetail = async (book) => {
  detailVisible.value = true
  detailLoading.value = true
  try {
    const res = await request.get(`/books/${book.id}`)
    detailBook.value = res.data?.data || book
  } catch (err) {
    console.error('加载图书详情失败:', err)
    detailBook.value = book
  } finally {
    detailLoading.value = false
  }
}

// 页面加载时获取数据
onMounted(fetchBooks)
</script>

<style scoped>
/* 保持与admin/Books.vue一致的样式 */
.books-root {
  width: 100%;
  min-height: 100%;
  padding: 0;
  background: transparent;
  box-sizing: border-box;
}

.books-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
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

.detail-loading {
  text-align: center;
  padding: 24px 0;
  color: #666;
}

.detail-content {
  display: flex;
  gap: 16px;
}

.detail-cover {
  width: 160px;
  height: 220px;
  object-fit: cover;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.detail-info {
  flex: 1;
  line-height: 1.8;
  color: #555;
}

.detail-info p {
  margin: 4px 0;
}

.detail-empty {
  color: #999;
}
</style>