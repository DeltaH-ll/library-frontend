<template>
  <div class="dashboard-root">
    <!-- 加载状态 -->
    <div v-if="loading" class="full-loading">
      <el-loading-spinner />
      <div class="loading-text">加载数据中...</div>
    </div>

    <!-- 📊 统计卡片 -->
    <div class="stats-section" v-else>
      <div class="stat-card" v-for="(item, i) in statCards" :key="i">
        <div class="stat-icon">{{ item.icon }}</div>
        <div class="stat-content">
          <div class="stat-label">{{ item.label }}</div>
          <div class="stat-value">{{ item.value }}</div>
        </div>
      </div>
    </div>

    <!-- 图表区 -->
    <div class="charts-section" >
      <div class="section-title">📈 数据分析中心</div>
      <div class="dashboard-charts">
        <div class="dashboard-chart-wrap">
          <div class="chart-header"><h3>图书状态分布</h3></div>
          <div ref="pieRef" class="dashboard-chart"></div>
        </div>

        <div class="dashboard-chart-wrap">
          <div class="chart-header"><h3>系统总览</h3></div>
          <div ref="barRef" class="dashboard-chart"></div>
        </div>

        <div class="dashboard-chart-wrap">
          <div class="chart-header"><h3>近7天借阅趋势</h3></div>
          <div ref="lineRef" class="dashboard-chart"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import * as echarts from 'echarts'
import request from '@/utils/request'
import { ElMessage, ElLoading } from 'element-plus'

// 状态管理
const stats = ref({
  books: 0,
  borrowed: 0,
  users: 0,
  inLibrary: 0,
  borrowRate: 0
})

const borrowTrend = ref([])
const loading = ref(true)

// 图表相关
const pieRef = ref(null)
const barRef = ref(null)
const lineRef = ref(null)
let pieChart, barChart, lineChart, loadingInstance

// 仪表卡片配置
const statCards = computed(() => [
  { label: '图书总数', value: stats.value.books, icon: '📚' },
  { label: '借出图书', value: stats.value.borrowed, icon: '📖' },
  { label: '用户总数', value: stats.value.users, icon: '👥' },
  { label: '在馆图书', value: stats.value.inLibrary, icon: '🏛️' },
  { label: '借阅率', value: stats.value.borrowRate + '%', icon: '📊' }
])

// 数据获取（增强错误处理）
const fetchStats = async () => {
  try {
    // 显示全屏加载
    loadingInstance = ElLoading.service({
      lock: true,
      text: '加载数据中...',
      background: 'rgba(255, 255, 255, 0.7)'
    })

    const response = await request.get('/stats/overview')
    const payload = response.data || {}
    stats.value = payload.data || stats.value
    borrowTrend.value = (payload.trend || []).map(item => ({
      date: item.day,
      count: item.total
    }))

    renderAllCharts()

  } catch (err) {
    console.error('数据加载失败:', err)
    
    // 针对性错误处理
    if (err.response?.status === 403) {
      ElMessage.error('没有访问权限，请联系管理员')
    } else {
      ElMessage.error('数据加载失败，请稍后重试')
    }
  } finally {
    loading.value = false
    loadingInstance?.close() // 关闭加载
  }
}

// ECharts渲染函数
const renderPie = () => {
  if (!pieRef.value) return
  if (!pieChart) {
    pieChart = echarts.init(pieRef.value)
    window.addEventListener('resize', () => pieChart.resize())
  }
  pieChart.setOption({
    tooltip: { trigger: 'item' },
    legend: { bottom: 20, left: 'center' },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        label: { show: false },
        data: [
          { value: stats.value.inLibrary, name: '在馆图书' },
          { value: stats.value.borrowed, name: '借出图书' }
        ],
        color: ['#91cc75', '#5470c6']
      }
    ]
  })
}

const renderBar = () => {
  if (!barRef.value) return
  if (!barChart) {
    barChart = echarts.init(barRef.value)
    window.addEventListener('resize', () => barChart.resize())
  }
  barChart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: ['图书', '借出', '用户'] },
    yAxis: { type: 'value', min: 0 },
    series: [
      {
        type: 'bar',
        data: [stats.value.books, stats.value.borrowed, stats.value.users],
        itemStyle: {
          color: params => ['#91cc75', '#5470c6', '#fac858'][params.dataIndex],
          borderRadius: [6, 6, 0, 0]
        },
        barWidth: '50%'
      }
    ]
  })
}

const renderLine = () => {
  if (!lineRef.value) return
  if (!lineChart) {
    lineChart = echarts.init(lineRef.value)
    window.addEventListener('resize', () => lineChart.resize())
  }
  lineChart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { 
      type: 'category', 
      data: borrowTrend.value.map(i => i.date),
      axisLabel: { rotate: 30, interval: 0 }
    },
    yAxis: { type: 'value', min: 0, axisLabel: { formatter: '{value} 次' } },
    series: [
      {
        type: 'line',
        smooth: true,
        data: borrowTrend.value.map(i => i.count),
        lineStyle: { color: '#5470c6', width: 3 },
        areaStyle: { color: 'rgba(84,112,198,0.2)' },
        itemStyle: { color: '#5470c6' },
        markPoint: { data: [{ type: 'max', name: '最大值' }] }
      }
    ]
  })
}

const renderAllCharts = () => {
  renderPie()
  renderBar()
  renderLine()
}

// 监听数据变化更新图表
watch([stats, borrowTrend], () => {
  renderAllCharts()
})

// 页面挂载时加载数据
onMounted(() => {
  fetchStats()
})

// 页面卸载时清理
onUnmounted(() => {
  if (pieChart) pieChart.dispose()
  if (barChart) barChart.dispose()
  if (lineChart) lineChart.dispose()
  window.removeEventListener('resize', () => {})
  loadingInstance?.close()
})
</script>

<style scoped>
.dashboard-root {
  width: 100%;
  height: 100%;
  padding: 24px;
  box-sizing: border-box;
  background: #f5f6f8;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* 加载状态样式 */
.full-loading {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.8);
  z-index: 9999;
}

.loading-text {
  margin-top: 20px;
  color: #666;
  font-size: 16px;
}

/* 统计卡片区 */
.stats-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  gap: 20px;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.stat-icon {
  font-size: 42px;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border-radius: 12px;
  color: white;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #333;
}

.stat-label {
  color: #666;
  font-size: 14px;
}

.section-title {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 28px;
  text-align: center;
  color: #444;
}

/* 图表区 */
.dashboard-charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 32px;
  flex: 1;
}

.dashboard-chart-wrap {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.dashboard-chart {
  width: 100%;
  height: 320px;
}

.chart-header {
  margin-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 8px;
}

.chart-header h3 {
  margin: 0;
  color: #555;
  font-size: 16px;
}
</style>