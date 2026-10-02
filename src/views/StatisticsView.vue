<template>
  <div class="page-shell">
    <div class="page-heading">
      <div><h1 class="page-title">统计分析</h1><p class="page-subtitle">汇总设施健康度、巡检趋势、工单结构、维修结果和工作量排名。</p></div>
      <el-button :icon="Refresh" @click="loadData">刷新</el-button>
    </div>

    <div class="metric-grid">
      <div v-for="item in metrics" :key="item.label" class="metric-card" :style="{ '--metric-color': item.color }">
        <div><span>{{ item.label }}</span><strong>{{ item.value }}</strong><small>{{ item.hint }}</small></div>
      </div>
    </div>

    <div class="chart-grid">
      <section class="panel"><div class="panel-header"><span class="panel-title">月度巡检趋势</span></div><div ref="trendRef" class="chart"></div></section>
      <section class="panel"><div class="panel-header"><span class="panel-title">月度异常率</span></div><div ref="rateRef" class="chart"></div></section>
      <section class="panel"><div class="panel-header"><span class="panel-title">工单状态分布</span></div><div ref="ticketRef" class="chart"></div></section>
      <section class="panel"><div class="panel-header"><span class="panel-title">工单最终处置</span></div><div ref="resultRef" class="chart"></div></section>
      <section class="panel"><div class="panel-header"><span class="panel-title">维修人当前负载</span></div><div ref="repairerLoadRef" class="chart"></div></section>
      <section class="panel"><div class="panel-header"><span class="panel-title">维修人历史工作量</span></div><div ref="repairerWorkloadRef" class="chart"></div></section>
      <section class="panel"><div class="panel-header"><span class="panel-title">巡检人工作量 TOP10</span></div><div ref="workloadRef" class="chart"></div></section>
      <section class="panel"><div class="panel-header"><span class="panel-title">故障设施 TOP10</span></div><div ref="faultRef" class="chart"></div></section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import * as echarts from 'echarts'
import { Refresh } from '@element-plus/icons-vue'
import { getStatisticsOverview, type StatisticsOverview } from '@/api/system'

const metrics = ref([
  { label: '设施总数', value: 0, hint: '在册设施档案', color: '#0f766e' },
  { label: '故障设施', value: 0, hint: '当前故障状态', color: '#ef4444' },
  { label: '待处理工单', value: 0, hint: '待派发 / 待维修', color: '#f59e0b' },
  { label: '今日巡检', value: 0, hint: '今日提交记录', color: '#0ea5e9' }
])

const trendRef = ref<HTMLElement>()
const rateRef = ref<HTMLElement>()
const ticketRef = ref<HTMLElement>()
const resultRef = ref<HTMLElement>()
const repairerLoadRef = ref<HTMLElement>()
const repairerWorkloadRef = ref<HTMLElement>()
const workloadRef = ref<HTMLElement>()
const faultRef = ref<HTMLElement>()
const charts: echarts.ECharts[] = []

async function loadData() {
  const result: any = await getStatisticsOverview()
  const data: StatisticsOverview = result.data || {}
  metrics.value[0].value = data.facilityCount || 0
  metrics.value[1].value = data.facilityFault || 0
  metrics.value[2].value = data.pendingTicket || 0
  metrics.value[3].value = data.todayRecord || 0
  await nextTick()
  charts.forEach(chart => chart.dispose())
  charts.length = 0
  renderTrend(data)
  renderRate(data)
  renderPie(ticketRef.value!, data.ticketStatus || [], ['#f59e0b', '#0ea5e9', '#6366f1', '#16a34a', '#94a3b8'])
  renderPie(resultRef.value!, data.repairResult || [], ['#16a34a', '#ef4444', '#f59e0b', '#94a3b8'])
  renderBar(repairerLoadRef.value!, data.repairerCurrentLoad || [], '#f59e0b', true)
  renderBar(repairerWorkloadRef.value!, data.repairerWorkload || [], '#6366f1', true)
  renderBar(workloadRef.value!, data.inspectorWorkload || [], '#0f766e', true)
  renderBar(faultRef.value!, data.faultFacilityTop10 || [], '#ef4444', true)
}

function renderTrend(data: StatisticsOverview) {
  const chart = echarts.init(trendRef.value!)
  charts.push(chart)
  const months = (data.monthlyRecord || []).map(item => item.month || '')
  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, icon: 'circle' },
    grid: { left: 40, right: 20, top: 24, bottom: 48 },
    xAxis: { type: 'category', data: months },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#edf2f7' } } },
    series: [
      { name: '正常', type: 'bar', stack: 'total', data: (data.monthlyRecord || []).map(item => item.normal || 0), itemStyle: { color: '#16a34a', borderRadius: [0, 0, 0, 0] } },
      { name: '异常', type: 'bar', stack: 'total', data: (data.monthlyRecord || []).map(item => item.abnormal || 0), itemStyle: { color: '#ef4444', borderRadius: [6, 6, 0, 0] } }
    ]
  })
}

function renderRate(data: StatisticsOverview) {
  const chart = echarts.init(rateRef.value!)
  charts.push(chart)
  chart.setOption({
    tooltip: { trigger: 'axis', valueFormatter: (value: number) => value + '%' },
    grid: { left: 46, right: 24, top: 24, bottom: 32 },
    xAxis: { type: 'category', data: (data.monthlyAbnormalRate || []).map(item => item.month || '') },
    yAxis: { type: 'value', axisLabel: { formatter: '{value}%' }, splitLine: { lineStyle: { color: '#edf2f7' } } },
    series: [{ name: '异常率', type: 'line', smooth: true, areaStyle: { opacity: .18 }, lineStyle: { width: 3, color: '#f59e0b' }, itemStyle: { color: '#f59e0b' }, data: (data.monthlyAbnormalRate || []).map(item => item.rate || 0) }]
  })
}

function renderPie(element: HTMLElement, data: Array<{ name?: string; value?: number }>, colors: string[]) {
  const chart = echarts.init(element)
  charts.push(chart)
  chart.setOption({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, icon: 'circle' },
    color: colors,
    series: [{ type: 'pie', radius: ['46%', '68%'], center: ['50%', '44%'], label: { formatter: (item: any) => item.value > 0 ? `${item.name}\n${item.value}` : '' }, data: data.map(item => ({ name: item.name, value: item.value || 0 })), itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 3 } }]
  })
}

function renderBar(element: HTMLElement, data: Array<{ name?: string; value?: number }>, color: string, horizontal = false) {
  const chart = echarts.init(element)
  charts.push(chart)
  const labels = data.map(item => item.name || '未命名')
  const values = data.map(item => item.value || 0)
  const axis = horizontal
    ? { xAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: '#edf2f7' } } }, yAxis: { type: 'category', data: labels, inverse: true } }
    : { xAxis: { type: 'category', data: labels }, yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: '#edf2f7' } } } }
  chart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: horizontal ? 96 : 44, right: 24, top: 24, bottom: 32 },
    ...axis,
    series: [{ type: 'bar', barWidth: horizontal ? 14 : 28, data: values, itemStyle: { color, borderRadius: horizontal ? [0, 7, 7, 0] : [8, 8, 0, 0] } }]
  })
}

function resizeCharts() { charts.forEach(chart => chart.resize()) }
onMounted(() => { loadData(); window.addEventListener('resize', resizeCharts) })
onBeforeUnmount(() => { window.removeEventListener('resize', resizeCharts); charts.forEach(chart => chart.dispose()) })
</script>

<style scoped>
.metric-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
.metric-card { padding: 20px; border-radius: 16px; background: #fff; border: 1px solid var(--ops-border); box-shadow: 0 8px 24px rgba(15,23,42,.04); border-left: 4px solid var(--metric-color); }
.metric-card span, .metric-card small { display: block; color: var(--ops-muted); font-size: 12px; }
.metric-card strong { display: block; margin: 6px 0 3px; font-size: 28px; color: var(--metric-color); }
.chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
.chart { height: 300px; }
@media (max-width: 1100px) { .metric-grid { grid-template-columns: repeat(2, 1fr); } .chart-grid { grid-template-columns: 1fr; } }
</style>
