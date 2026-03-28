<template>
  <div class="bg-white rounded-xl shadow-lg p-4 section-gap">
    <h2 class="text-lg font-bold text-gray-800 mb-4">数据统计</h2>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- 分类分布饼图 -->
      <div>
        <h3 class="text-sm font-medium text-gray-600 mb-3">问题分类分布</h3>
        <div class="h-64">
          <canvas ref="categoryChartRef"></canvas>
        </div>
      </div>
      
      <!-- 时间趋势折线图 -->
      <div>
        <h3 class="text-sm font-medium text-gray-600 mb-3">上传时间趋势</h3>
        <div class="h-64">
          <canvas ref="trendChartRef"></canvas>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted } from 'vue'
import { Chart, registerables } from 'chart.js'
import { getCategoryName } from '@/constants/categories'

// 注册 Chart.js 组件
Chart.register(...registerables)

const props = defineProps({
  categoryStats: {
    type: Array,
    default: () => []
  },
  trendStats: {
    type: Array,
    default: () => []
  }
})

const categoryChartRef = ref(null)
const trendChartRef = ref(null)
let categoryChart = null
let trendChart = null

const createCategoryChart = () => {
  if (!categoryChartRef.value) return
  
  // 准备数据
  const labels = props.categoryStats.map(item => getCategoryName(item.category))
  const data = props.categoryStats.map(item => item.count)
  
  // 生成随机颜色
  const backgroundColors = data.map(() => {
    const r = Math.floor(Math.random() * 128) + 127
    const g = Math.floor(Math.random() * 128) + 64
    const b = Math.floor(Math.random() * 128) + 64
    return `rgba(${r}, ${g}, ${b}, 0.7)`
  })
  
  if (categoryChart) {
    categoryChart.destroy()
  }
  
  categoryChart = new Chart(categoryChartRef.value, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: backgroundColors,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: {
              size: 10
            },
            padding: 10
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || ''
              const value = context.raw || 0
              const total = context.dataset.data.reduce((a, b) => a + b, 0)
              const percentage = Math.round((value / total) * 100)
              return `${label}: ${value} (${percentage}%)`
            }
          }
        }
      }
    }
  })
}

const createTrendChart = () => {
  if (!trendChartRef.value) return
  
  // 准备数据
  const labels = props.trendStats.map(item => item.date)
  const data = props.trendStats.map(item => item.count)
  
  if (trendChart) {
    trendChart.destroy()
  }
  
  trendChart = new Chart(trendChartRef.value, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: '上传数量',
        data,
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.1)',
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top'
        }
      }
    }
  })
}

onMounted(() => {
  createCategoryChart()
  createTrendChart()
})

watch(() => props.categoryStats, () => {
  createCategoryChart()
}, { deep: true })

watch(() => props.trendStats, () => {
  createTrendChart()
}, { deep: true })

onUnmounted(() => {
  if (categoryChart) {
    categoryChart.destroy()
  }
  if (trendChart) {
    trendChart.destroy()
  }
})
</script>
