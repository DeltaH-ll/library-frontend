<template>
  <div class="books-root">
    <div class="books-header">
      <h1 class="books-title">📚 我的借阅</h1>
      <div class="books-actions">
        <el-input
          v-model="search"
          placeholder="搜索书名（按回车查询）"
          clearable
          @clear="onSearchClear"
          @keyup.enter="onSearchEnter"
          style="width: 280px"
        />
      </div>
    </div>

    <el-table
      v-loading="loading"
      :data="borrows"
      border
      style="width: 100%; border-radius: 12px; margin-top: 16px"
      empty-text="暂无借阅记录"
    >
      <el-table-column label="序号" width="80" align="center">
        <template #default="{ $index }">
          {{ (page - 1) * limit + $index + 1 }}
        </template>
      </el-table-column>
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
      <el-table-column prop="book_title" label="书名" />
      <el-table-column prop="book_author" label="作者" width="140" />
      <el-table-column label="价格" width="120" align="center">
        <template #default="{ row }">
          {{ formatPrice(row.book_price) }}
        </template>
      </el-table-column>
      <el-table-column prop="borrow_date" label="借出时间" width="180" />
      <el-table-column prop="return_date" label="还书时间" width="180">
        <template #default="{ row }">
          <span :style="{ color: row.return_date ? (new Date(row.return_date) < new Date() ? 'red' : '') : 'inherit' }">
            {{ row.return_date || '未归还' }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="140" align="center">
        <template #default="{ row }">
          <el-tag :type="tagFor(row)" disable-transitions>
            {{ row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" align="center">
        <template #default="{ row }">
          <el-button
            size="small"
            type="primary"
            @click="returnBook(row.id)"
            :disabled="row.status !== '借出'"
          >
            归还
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页组件（与图书列表风格一致） -->
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
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request, { ASSET_BASE_URL } from '@/utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'

// 状态管理（与图书列表一致风格）
const borrows = ref([])
const search = ref('')
const loading = ref(false)
const page = ref(1)
const limit = ref(10)
const total = ref(0)

// 状态标签样式
const tagFor = (row) => {
  switch (row.status) {
    case '借出': return 'warning'
    case '已还': return 'success'
    case '逾期': return 'danger'
    default: return 'info'
  }
}

const formatPrice = (price) => {
  const num = Number(price)
  if (Number.isFinite(num)) {
    return `¥${num.toFixed(2)}`
  }
  return '¥0.00'
}

// 封面地址拼接
const fullCoverUrl = (cover_url) => {
  if (!cover_url) return ''
  if (cover_url.startsWith('http://') || cover_url.startsWith('https://')) return cover_url
  const base = ASSET_BASE_URL.replace(/\/$/, '')
  const normalized = cover_url.startsWith('/') ? cover_url : `/${cover_url}`
  return base + normalized
}

// 获取我的借阅记录（带分页）
const fetchBorrows = async () => {
  loading.value = true
  try {
    const res = await request.get('/borrow', {
      params: {
        page: page.value,
        limit: limit.value,
        q: search.value || undefined
      }
    })
    const payload = res.data || {}
    borrows.value = payload.data || []
    total.value = payload.total || 0
  } catch (err) {
    console.error(err)
    ElMessage.error('加载借阅记录失败')
  } finally {
    loading.value = false
  }
}

// 归还图书
const returnBook = async (borrowId) => {
  try {
    await ElMessageBox.confirm('确定要归还这本书吗？', '归还确认', {
      type: 'warning'
    })
    await request.put(`/borrow/${borrowId}/return`)
    ElMessage.success('归还成功')
    fetchBorrows() // 刷新借阅记录
  } catch (err) {
    if (err !== 'cancel') {
      const msg = err?.response?.data?.error || '归还失败'
      ElMessage.error(msg)
    }
  }
}

// 分页和搜索事件（与图书列表一致）
const onSearchEnter = () => { page.value = 1; fetchBorrows() }
const onSearchClear = () => { page.value = 1; search.value = ''; fetchBorrows() }
const onPageChange = (p) => { page.value = p; fetchBorrows() }
const onSizeChange = (s) => { limit.value = s; page.value = 1; fetchBorrows() }

// 页面加载时获取数据
onMounted(fetchBorrows)
</script>

<style scoped>
/* 完整样式，修复编译错误 */
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
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1); /* 补全样式 */
}

.no-cover {
  color: #999;
  font-size: 13px;
  display: inline-block;
  width: 60px;
  height: 80px;
  line-height: 80px;
  text-align: center;
  border: 1px dashed #ccc;
}

.pager {
  margin-top: 12px;
}
</style>