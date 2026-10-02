<template>
  <div class="page-shell">
    <div class="page-heading">
      <div><h1 class="page-title">运行总览</h1><p class="page-subtitle">实时聚合任务、工单、设施和路线状态，快速定位需要处理的运维事项。</p></div>
      <el-button :icon="Refresh" @click="loadData">刷新数据</el-button>
    </div>

    <div class="metric-grid">
      <div v-for="item in metrics" :key="item.label" class="metric-card" :style="{ '--metric-color': item.color }">
        <div class="metric-icon"><component :is="item.icon" /></div>
        <div><span>{{ item.label }}</span><strong>{{ item.value }}</strong><small>{{ item.hint }}</small></div>
      </div>
    </div>

    <div class="chart-grid">
      <section class="panel"><div class="panel-header"><span class="panel-title">工单状态分布</span><el-tag type="success" effect="plain" round>闭环监控</el-tag></div><div ref="ticketChartRef" class="chart"></div></section>
      <section class="panel"><div class="panel-header"><span class="panel-title">设施健康结构</span><el-tag :type="healthyRate >= 90 ? 'success' : healthyRate >= 70 ? 'warning' : 'danger'" effect="plain" round>健康率 {{ healthyRate }}%</el-tag></div><div ref="facilityChartRef" class="chart"></div></section>
    </div>

    <section class="panel">
      <div class="panel-header"><span class="panel-title">最近工单</span><el-button text type="primary" @click="$router.push('/tickets')">进入工单看板</el-button></div>
      <el-table :data="tickets.slice(0, 8)" stripe class="clickable-table" :row-class-name="rowClassName" @row-click="openTicket">
        <el-table-column prop="ticketNo" label="工单编号" min-width="150" />
        <el-table-column prop="facilityName" label="设施" min-width="130" />
        <el-table-column prop="issueDesc" label="故障描述" min-width="220" show-overflow-tooltip />
        <el-table-column label="状态" width="116"><template #default="{ row }"><span class="status-pill" :style="ticketPillStyle(row.ticketStatus)"><i class="pill-dot" />{{ ticketStatusMap[row.ticketStatus] || '未知' }}</span></template></el-table-column>
        <el-table-column prop="assigneeName" label="维修人" width="100"><template #default="{ row }">{{ row.assigneeName || '未指派' }}</template></el-table-column>
        <el-table-column label="派发时间" width="150"><template #default="{ row }">{{ formatTime(row.assignTime) }}</template></el-table-column>
      </el-table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { markRaw, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { Bell, Calendar, CircleCheck, OfficeBuilding, Refresh } from '@element-plus/icons-vue'
import { getStatisticsOverview, type NameValue, type Ticket } from '@/api/system'
import { facilityStatusMap, ticketStatusMap, formatTime } from '@/utils/format'
import { TICKET_STATUS_META, TICKET_TONE, rowToneClass, statusPillStyle } from '@/utils/statusMeta'

const router = useRouter()
const tickets = ref<Ticket[]>([])
const ticketStatusStats = ref<NameValue[]>([])
const facilityStatusStats = ref<NameValue[]>([])
/** 设施状态语义色：正常绿 / 故障红 / 停用灰，替代原先所有柱子同一个颜色。 */
const FACILITY_TONE: Record<string, string> = { '0': '#16a34a', '1': '#ef4444', '2': '#94a3b8' }
/** 工单图表语义色，取共享色板的主色，与工单看板分栏配色保持一致。 */
const TICKET_CHART_TONE: Record<string, string> = {
  '0': '#f59e0b', '1': '#14b8a6', '2': '#3b82f6', '3': '#22c55e', '4': '#94a3b8'
}
/** 设施健康率（正常占比），展示在设施面板标题右侧。 */
const healthyRate = ref(0)

function ticketPillStyle(status?: string) { return statusPillStyle(TICKET_STATUS_META[status || ''] || TICKET_STATUS_META['4']) }
function rowClassName({ row }: { row: Ticket }) { return rowToneClass(TICKET_TONE[row.ticketStatus || ''] || 'closed') }
/** 最近工单支持点击行直接打开对应工单详情，省去在看板中再次查找。 */
function openTicket(row: Ticket) { if (row.ticketId) router.push({ path: '/tickets', query: { ticketId: row.ticketId } }) }

const ticketChartRef = ref<HTMLElement>()
const facilityChartRef = ref<HTMLElement>()
let ticketChart: echarts.ECharts | undefined
let facilityChart: echarts.ECharts | undefined

const metrics = ref([
  { label: '执行中任务', value: 0, hint: '实时巡检任务', color: '#0f766e', icon: markRaw(Calendar) },
  { label: '待处理工单', value: 0, hint: '待派发 / 待维修', color: '#f59e0b', icon: markRaw(Bell) },
  { label: '故障设施', value: 0, hint: '需要关注', color: '#ef4444', icon: markRaw(OfficeBuilding) },
  { label: '已完成工单', value: 0, hint: '累计完成', color: '#16a34a', icon: markRaw(CircleCheck) }
])

async function loadData() {
  const result: any = await getStatisticsOverview()
  const overview = result.data || result
  ticketStatusStats.value = overview.ticketStatus || []
  facilityStatusStats.value = overview.facilityStatus || []
  tickets.value = overview.recentTickets || []
  metrics.value[0].value = Number(overview.runningTask || 0)
  metrics.value[1].value = Number(overview.pendingTicket || 0)
  metrics.value[2].value = Number(overview.facilityFault || 0)
  metrics.value[3].value = Number(overview.completedTicket || 0)
  await nextTick()
  renderCharts()
}

function renderCharts() {
  ticketChart?.dispose()
  facilityChart?.dispose()
  ticketChart = echarts.init(ticketChartRef.value!)
  facilityChart = echarts.init(facilityChartRef.value!)

  /* ---- 工单状态分布：环形图 + 中心总数，图例带数量 ---- */
  const ticketCountMap = new Map(ticketStatusStats.value.map(item => [item.name, Number(item.value || 0)]))
  const ticketData = Object.entries(ticketStatusMap).map(([status, name]) => ({
    name,
    value: ticketCountMap.get(name) || 0,
    itemStyle: { color: TICKET_CHART_TONE[status] }
  }))
  const ticketTotal = ticketData.reduce((sum, item) => sum + item.value, 0)
  ticketChart.setOption({
    tooltip: { trigger: 'item', formatter: (item: any) => `${item.marker}${item.name}<br/>${item.value} 张（${item.percent}%）` },
    legend: {
      bottom: 0, icon: 'circle', itemWidth: 8, itemHeight: 8,
      textStyle: { color: '#64748b', fontSize: 12 },
      formatter: (name: string) => {
        const hit = ticketData.find(item => item.name === name)
        return `${name} ${hit ? hit.value : 0}`
      }
    },
    graphic: [
      { type: 'text', left: 'center', top: '36%', style: { text: String(ticketTotal), fontSize: 32, fontWeight: 700, fill: '#0f172a', fontFamily: 'inherit' } },
      { type: 'text', left: 'center', top: '47%', style: { text: '工单总数', fontSize: 12, fill: '#94a3b8', fontFamily: 'inherit' } }
    ],
    series: [{
      type: 'pie', radius: ['52%', '72%'], center: ['50%', '44%'],
      avoidLabelOverlap: true,
      label: { formatter: (item: any) => item.value > 0 ? `${item.name} ${item.value}` : '', color: '#475569', fontSize: 12 },
      labelLine: { length: 8, length2: 10, lineStyle: { color: '#cbd5e1' } },
      data: ticketData,
      itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 3 }
    }]
  })

  /* ---- 设施健康结构：按状态着色 + 柱顶数值 + 占比提示 ---- */
  const facilityCountMap = new Map(facilityStatusStats.value.map(item => [item.name, Number(item.value || 0)]))
  const facilityData = Object.entries(facilityStatusMap).map(([status, name]) => ({
    name,
    value: facilityCountMap.get(name) || 0,
    color: FACILITY_TONE[status]
  }))
  const facilityTotal = facilityData.reduce((sum, item) => sum + item.value, 0)
  healthyRate.value = facilityTotal ? Math.round((facilityData[0].value / facilityTotal) * 1000) / 10 : 0
  facilityChart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const item = params[0]
        const pct = facilityTotal ? Math.round((item.value / facilityTotal) * 1000) / 10 : 0
        return `${item.marker}${item.name}<br/>${item.value} 处（${pct}%）`
      }
    },
    grid: { left: 38, right: 20, top: 36, bottom: 28 },
    xAxis: {
      type: 'category',
      data: facilityData.map(item => item.name),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      axisLabel: { color: '#475569', fontSize: 12 }
    },
    yAxis: {
      type: 'value', minInterval: 1,
      splitLine: { lineStyle: { color: '#edf2f7' } },
      axisLabel: { color: '#94a3b8' }
    },
    series: [{
      type: 'bar', barWidth: 46,
      data: facilityData.map(item => ({ value: item.value, itemStyle: { color: item.color, borderRadius: [8, 8, 0, 0] } })),
      label: { show: true, position: 'top', formatter: '{c}', color: '#334155', fontWeight: 600, fontSize: 13 }
    }]
  })
}

function resizeCharts() { ticketChart?.resize(); facilityChart?.resize() }
onMounted(() => { loadData(); window.addEventListener('resize', resizeCharts) })
onBeforeUnmount(() => { window.removeEventListener('resize', resizeCharts); ticketChart?.dispose(); facilityChart?.dispose() })
</script>

<style scoped>
.metric-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
.metric-card { display: flex; gap: 16px; align-items: center; padding: 20px; border-radius: 16px; background: #fff; border: 1px solid var(--ops-border); box-shadow: 0 8px 24px rgba(15,23,42,.04); }
.metric-icon { width: 48px; height: 48px; display: grid; place-items: center; border-radius: 14px; color: var(--metric-color); background: color-mix(in srgb, var(--metric-color) 12%, white); font-size: 22px; }
.metric-card span, .metric-card small { display: block; color: var(--ops-muted); font-size: 12px; }
.metric-card strong { display: block; margin: 6px 0 3px; font-size: 28px; color: var(--metric-color); }
.chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
.chart { height: 330px; }
.clickable-table :deep(.el-table__row) { cursor: pointer; }
@media (max-width: 1100px) { .metric-grid { grid-template-columns: repeat(2, 1fr); } .chart-grid { grid-template-columns: 1fr; } }
</style>
