<template>
  <div class="page-shell">
    <div class="page-heading">
      <div><h1 class="page-title">设施档案</h1><p class="page-subtitle">维护设施基础信息、分类、地理坐标和现场二维码，并查看健康历史与当前工单。</p></div>
      <el-button v-permission="'system:facility:add'" type="primary" :icon="Plus" @click="openCreate">新增设施</el-button>
    </div>

    <section class="panel map-panel">
      <div class="panel-header map-header">
        <div class="map-title-wrap">
          <span class="panel-title">设施分布图</span>
          <span v-if="plottedFacilities.length" class="map-caption">
            已定位 {{ plottedFacilities.length }} 个设施 · {{ locatedAreaCount }} 个区域
          </span>
        </div>
        <div class="map-actions">
          <el-segmented v-model="mapMode" :options="mapModeOptions" size="small" class="map-mode-switch" @change="renderMap" />
          <button v-if="missingCoordinateFacilities.length" type="button" class="map-warning" @click="missingVisible = true">
            <WarningFilled />待补坐标 {{ missingCoordinateFacilities.length }}
          </button>
          <el-button text type="primary" @click="toggleMap">{{ mapVisible ? '收起' : '展开' }}</el-button>
        </div>
      </div>
      <div v-show="mapVisible" v-loading="mapLoading" class="map-stage">
        <div ref="mapRef" class="map-chart"></div>
        <div v-if="mapMode === 'area' && areaStats.length" class="map-area-index">
          <div class="area-index-head"><strong>区域分布</strong><span>设施数</span></div>
          <button
            v-for="item in areaStats"
            :key="item.areaName"
            type="button"
            class="area-index-item"
            :class="{ 'has-fault': item.fault }"
            @click="openAreaDialog(item.areaName)"
          >
            <span><i />{{ item.areaName }}</span>
            <em>{{ item.total }}</em>
          </button>
        </div>
        <div v-if="plottedFacilities.length" class="map-legend">
          <template v-if="mapMode === 'area'">
            <span class="map-legend-item"><i class="area-size-legend" />气泡大小表示设施数量</span>
            <span v-if="faultAreaCount" class="map-legend-item"><i class="area-fault-legend" />红色描边表示存在故障</span>
            <span class="map-legend-tip">悬停查看状态 · 点击区域查看设施清单</span>
          </template>
          <template v-else>
            <span v-for="item in mapLegend" :key="item.value" class="map-legend-item">
              <i :style="{ background: item.color }" />{{ item.label }}
            </span>
            <span v-if="mapMode === 'cluster'" class="map-legend-tip">圆形数字表示聚合数量 · 点击聚合点位查看设施清单</span>
            <span v-else class="map-legend-tip">滚轮缩放 · 拖拽移动 · 点击点位查看详情</span>
          </template>
        </div>
        <div v-if="!plottedFacilities.length && !mapLoading" class="map-empty">
          <strong>暂无可定位设施</strong>
          <span>请先为设施补充经纬度，或在下方列表继续筛选。</span>
        </div>
        <span class="map-source">区域边界：DataV GeoAtlas</span>
      </div>
    </section>

    <section class="panel">
      <div class="panel-body toolbar">
        <el-input v-model="query.keyword" placeholder="设施编码 / 名称 / 区域 / 位置" clearable style="width: 280px" @keyup.enter="loadList" />
        <el-input v-model="query.facilityName" placeholder="设施名称" clearable style="width: 200px" @keyup.enter="loadList" />
        <el-input v-model="query.area" placeholder="所属区域" clearable style="width: 140px" @keyup.enter="loadList" />
        <el-select v-model="query.categoryId" placeholder="设施分类" clearable style="width: 160px"><el-option v-for="item in categories" :key="item.categoryId" :label="item.categoryName" :value="item.categoryId" /></el-select>
        <el-button type="primary" @click="refreshAll">查询</el-button>
      </div>
      <div class="status-tabs">
        <button
          v-for="tab in statusTabs"
          :key="tab.value || 'all'"
          type="button"
          class="status-tab"
          :class="{ 'is-active': query.facilityStatus === tab.value }"
          :style="{ '--tab-color': tab.meta.color, '--tab-bg': tab.meta.bg, '--tab-border': tab.meta.border }"
          @click="switchStatus(tab.value)"
        >
          <i class="tab-dot" />{{ tab.label }}<em>{{ tab.count }}</em>
        </button>
      </div>
      <el-table v-loading="loading" :data="rows" stripe :row-class-name="rowClassName" @sort-change="handleSortChange">
        <el-table-column prop="facilityCode" label="设施编码" min-width="140" sortable="custom" />
        <el-table-column prop="facilityName" label="设施名称" min-width="150" sortable="custom" />
        <el-table-column prop="categoryName" label="分类" width="110"><template #default="{ row }">{{ row.categoryName || '未分类' }}</template></el-table-column>
        <el-table-column prop="area" label="区域" width="90" sortable="custom" />
        <el-table-column prop="location" label="位置" min-width="150" show-overflow-tooltip />
        <el-table-column label="经纬度" min-width="170"><template #default="{ row }">{{ row.latitude || '-' }}, {{ row.longitude || '-' }}</template></el-table-column>
        <el-table-column prop="f.facilityStatus" label="状态" width="90" sortable="custom"><template #default="{ row }"><span class="status-pill" :style="facilityPillStyle(row.facilityStatus)"><i class="pill-dot" />{{ facilityStatusMap[row.facilityStatus] || '未知' }}</span></template></el-table-column>
        <el-table-column label="操作" width="240" fixed="right"><template #default="{ row }"><el-button link type="primary" @click="openDetail(row)">详情</el-button><el-button v-permission="'system:facility:edit'" link type="primary" @click="openEdit(row)">编辑</el-button><el-button v-permission="'system:facility:edit'" link type="success" @click="refreshQr(row)">重新生成</el-button><el-button v-permission="'system:facility:remove'" link type="danger" @click="remove(row)">删除</el-button></template></el-table-column>
      </el-table>
      <PaginationBar v-model:page="query.pageNum" v-model:page-size="query.pageSize" :total="total" @change="loadList" />
    </section>

    <el-dialog v-model="dialogVisible" :title="form.facilityId ? '编辑设施' : '新增设施'" width="680px">
      <el-form :model="form" label-width="90px">
        <el-row :gutter="16"><el-col :span="12"><el-form-item label="设施编码" required><el-input v-model="form.facilityCode" :disabled="Boolean(form.facilityId)" /></el-form-item></el-col><el-col :span="12"><el-form-item label="设施名称" required><el-input v-model="form.facilityName" /></el-form-item></el-col></el-row>
        <el-row :gutter="16"><el-col :span="12"><el-form-item label="设施分类"><el-select v-model="form.categoryId" clearable style="width:100%"><el-option v-for="item in categories" :key="item.categoryId" :label="item.categoryName" :value="item.categoryId" /></el-select></el-form-item></el-col><el-col :span="12"><el-form-item label="所属区域"><el-input v-model="form.area" /></el-form-item></el-col></el-row>
        <el-form-item label="所在位置"><el-input v-model="form.location" /></el-form-item>
        <el-row :gutter="16"><el-col :span="12"><el-form-item label="纬度"><el-input-number v-model="form.latitude" :precision="6" :step="0.000001" style="width:100%" /></el-form-item></el-col><el-col :span="12"><el-form-item label="经度"><el-input-number v-model="form.longitude" :precision="6" :step="0.000001" style="width:100%" /></el-form-item></el-col></el-row>
        <el-row :gutter="16"><el-col :span="12"><el-form-item label="运行状态"><el-select v-if="!form.facilityId" v-model="form.facilityStatus" style="width:100%"><el-option label="正常" value="0" /><el-option label="故障" value="1" /><el-option label="停用" value="2" /></el-select><span v-else class="status-pill" :style="facilityPillStyle(form.facilityStatus)"><i class="pill-dot" />{{ facilityStatusMap[form.facilityStatus || ''] || '未知' }}</span><div v-if="form.facilityId" class="form-hint">由巡检和维修业务自动维护</div></el-form-item></el-col></el-row>
        <el-form-item label="设施描述"><el-input v-model="form.description" type="textarea" :rows="3" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" @click="save">保存</el-button></template>
    </el-dialog>

    <el-dialog v-model="deleteDialogVisible" title="删除设施" width="480px">
      <p>确定删除设施“{{ deleteForm.facilityName }}”吗？已被任务、巡检或工单引用的设施不能删除。</p>
      <template #footer>
        <el-button @click="deleteDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="submitDelete">确认删除</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="detailVisible" title="设施详情" size="640px">
      <template v-if="current">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="设施编码">{{ current.facilityCode }}</el-descriptions-item>
          <el-descriptions-item label="设施名称">{{ current.facilityName }}</el-descriptions-item>
          <el-descriptions-item label="设施分类">{{ current.categoryName || '未分类' }}</el-descriptions-item>
          <el-descriptions-item label="所属区域">{{ current.area || '-' }}</el-descriptions-item>
          <el-descriptions-item label="所在位置" :span="2">{{ current.location || '-' }}</el-descriptions-item>
          <el-descriptions-item label="经纬度" :span="2">{{ current.latitude || '-' }}, {{ current.longitude || '-' }}</el-descriptions-item>
          <el-descriptions-item label="运行状态"><span class="status-pill" :style="facilityPillStyle(current.facilityStatus)"><i class="pill-dot" />{{ facilityStatusMap[current.facilityStatus || ''] || '未知' }}</span></el-descriptions-item>
          <el-descriptions-item label="巡检次数">{{ records.length }}</el-descriptions-item>
          <el-descriptions-item label="设施描述" :span="2">{{ current.description || '-' }}</el-descriptions-item>
        </el-descriptions>

        <div class="drawer-section">
          <h4>设施二维码</h4>
          <div v-if="qrUrl" class="qr-wrap">
            <img :src="qrUrl" alt="设施二维码" class="qr-image" />
            <el-button link type="primary" @click="refreshQr(current)">重新生成二维码</el-button>
          </div>
          <el-empty v-else description="尚未生成二维码" :image-size="70" />
        </div>

        <div class="drawer-section">
          <h4>当前开放工单</h4>
          <el-empty v-if="!openTickets.length" description="当前没有未完成的维修工单" :image-size="70" />
          <div v-else class="ticket-list">
            <div v-for="item in openTickets" :key="item.ticketId" class="ticket-item">
              <div class="ticket-top"><span class="ticket-no">{{ item.ticketNo }}</span><el-tag size="small" round>{{ ticketStatusMap[item.ticketStatus || ''] }}</el-tag></div>
              <p>{{ item.issueDesc || '暂无故障描述' }}</p>
              <div class="ticket-meta"><span>维修人：{{ item.assigneeName || '未指派' }}</span><span>{{ formatTime(item.assignTime || item.createTime) }}</span></div>
            </div>
          </div>
        </div>

        <div class="drawer-section">
          <h4>维修历史</h4>
          <el-empty v-if="!repairHistory.length" description="暂无已完成的维修记录" :image-size="70" />
          <el-timeline v-else>
            <el-timeline-item v-for="item in repairHistory" :key="item.ticketId" :timestamp="formatTime(item.completeTime || item.updateTime)" type="success">
              <strong>{{ item.ticketNo }}</strong>
              <span class="log-status">{{ item.issueDesc || '无故障描述' }}</span>
              <p class="process-desc">维修人：{{ item.assigneeName || '-' }}{{ item.closeReason ? ' · 关闭原因：' + item.closeReason : '' }}</p>
            </el-timeline-item>
          </el-timeline>
        </div>

        <div class="drawer-section">
          <h4>巡检健康历史</h4>
          <InspectionRecordGallery :records="records" />
        </div>
      </template>
    </el-drawer>

    <el-dialog v-model="missingVisible" title="待完善坐标" width="640px">
      <p class="missing-description">以下设施已进入档案，但因缺少经纬度暂未显示在分布图中。完善坐标后即可自动定位。</p>
      <div class="missing-list">
        <button
          v-for="item in missingCoordinateFacilities"
          :key="item.facilityId"
          type="button"
          class="missing-item"
          @click="editMissingCoordinate(item)"
        >
          <span class="missing-main">
            <strong>{{ item.facilityName || '未命名设施' }}</strong>
            <small>{{ item.facilityCode || '-' }} · {{ item.area || '未分区' }} · {{ item.location || '未填写位置' }}</small>
          </span>
          <span class="status-pill" :style="facilityPillStyle(item.facilityStatus)">
            <i class="pill-dot" />{{ facilityStatusMap[item.facilityStatus || ''] || '未知' }}
          </span>
        </button>
      </div>
    </el-dialog>

    <el-dialog v-model="areaVisible" :title="`${selectedArea || '未分区'}设施`" width="720px">
      <div class="area-dialog-summary">
        <span>共 <strong>{{ areaFacilities.length }}</strong> 个设施</span>
        <span v-if="areaFaultCount" class="is-danger">故障 {{ areaFaultCount }}</span>
        <span v-if="areaDisabledCount" class="is-muted">停用 {{ areaDisabledCount }}</span>
      </div>
      <el-table :data="areaFacilities" stripe max-height="420">
        <el-table-column prop="facilityName" label="设施名称" min-width="150" />
        <el-table-column prop="facilityCode" label="设施编码" min-width="140" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <span class="status-pill" :style="facilityPillStyle(row.facilityStatus)"><i class="pill-dot" />{{ facilityStatusMap[row.facilityStatus] || '未知' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="location" label="位置" min-width="180" show-overflow-tooltip />
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }"><el-button link type="primary" @click="openAreaFacility(row)">详情</el-button></template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import PaginationBar from '@/components/PaginationBar.vue'
import InspectionRecordGallery from '@/components/InspectionRecordGallery.vue'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import * as echarts from 'echarts'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, WarningFilled } from '@element-plus/icons-vue'
import { addFacility, deleteFacility, listFacilities, listFacilityCategories, listRecords, listTickets, regenerateQrCode, updateFacility, type Facility, type FacilityCategory, type InspectionRecord, type Ticket } from '@/api/system'
import { ALL_TAB_META, FACILITY_STATUS_META, rowToneClass, statusPillStyle } from '@/utils/statusMeta'
import { facilityStatusMap, formatTime, ticketStatusMap } from '@/utils/format'
import { applyTableSort, type TableSortChange } from '@/utils/tableSort'
import xihuDistrictMap from '@/assets/maps/xihu-district.json'

const FACILITY_STATUS_CODES = ['0', '1', '2']
echarts.registerMap('xihu-district', xihuDistrictMap as any)
const loading = ref(false)
const mapLoading = ref(false)
const rows = ref<Facility[]>([])
const mapFacilities = ref<Facility[]>([])
const categories = ref<FacilityCategory[]>([])
const total = ref(0)
const counts = ref<Record<string, number>>({})
const dialogVisible = ref(false)
const deleteDialogVisible = ref(false)
const detailVisible = ref(false)
const missingVisible = ref(false)
const areaVisible = ref(false)
const selectedArea = ref('')
const areaFacilities = ref<Facility[]>([])
const mapVisible = ref(true)
const mapMode = ref<'area' | 'cluster' | 'precise'>('area')
const mapRef = ref<HTMLElement>()
const current = ref<Facility>()
const records = ref<InspectionRecord[]>([])
const tickets = ref<Ticket[]>([])
const query = reactive({ keyword: '', facilityName: '', area: '', categoryId: undefined as number | undefined, facilityStatus: '', pageNum: 1, pageSize: 10, orderByColumn: undefined as string | undefined, isAsc: undefined as string | undefined })
const emptyForm = (): Facility => ({ facilityCode: '', facilityName: '', categoryId: undefined, area: '', location: '', latitude: undefined, longitude: undefined, facilityStatus: '0', description: '' })
const form = reactive<Facility>(emptyForm())
const deleteForm = reactive({ facilityId: 0, facilityName: '' })
let mapChart: echarts.ECharts | undefined
const qrPreviewVersion = ref(Date.now())

const plottedFacilities = computed(() => mapFacilities.value.filter(item => item.latitude != null && item.longitude != null))
const missingCoordinateFacilities = computed(() => mapFacilities.value.filter(item => item.latitude == null || item.longitude == null))
const mapLegend = FACILITY_STATUS_CODES.map(code => ({
  value: code,
  label: facilityStatusMap[code] || code,
  color: FACILITY_STATUS_META[code]?.color || '#64748b'
}))
const mapModeOptions = [
  { label: '区域概览', value: 'area' },
  { label: '点位聚合', value: 'cluster' },
  { label: '精确点位', value: 'precise' }
]
const areaStats = computed(() => {
  const groups = new Map<string, { longitude: number; latitude: number; total: number; normal: number; fault: number; disabled: number }>()
  plottedFacilities.value.forEach(item => {
    const areaName = item.area || '未分区'
    const group = groups.get(areaName) || { longitude: 0, latitude: 0, total: 0, normal: 0, fault: 0, disabled: 0 }
    group.longitude += Number(item.longitude)
    group.latitude += Number(item.latitude)
    group.total += 1
    if (item.facilityStatus === '1') group.fault += 1
    else if (item.facilityStatus === '2') group.disabled += 1
    else group.normal += 1
    groups.set(areaName, group)
  })
  return Array.from(groups.entries()).map(([areaName, group]) => ({
    areaName,
    value: [group.longitude / group.total, group.latitude / group.total] as [number, number],
    total: group.total,
    normal: group.normal,
    fault: group.fault,
    disabled: group.disabled
  })).sort((left, right) => right.total - left.total || left.areaName.localeCompare(right.areaName, 'zh-CN'))
})
const locatedAreaCount = computed(() => areaStats.value.length)
const faultAreaCount = computed(() => areaStats.value.filter(item => item.fault > 0).length)
const areaFaultCount = computed(() => areaFacilities.value.filter(item => item.facilityStatus === '1').length)
const areaDisabledCount = computed(() => areaFacilities.value.filter(item => item.facilityStatus === '2').length)
const qrUrl = computed(() => {
  const path = current.value?.qrCode
  if (!path) return ''
  const separator = path.includes('?') ? '&' : '?'
  return `${import.meta.env.VITE_API_BASE}${path}${separator}v=${qrPreviewVersion.value}`
})
const openTickets = computed(() => tickets.value.filter(item => ['0', '1', '2'].includes(item.ticketStatus || '')))
const repairHistory = computed(() => tickets.value.filter(item => ['3', '4'].includes(item.ticketStatus || '')))

/** 状态计数不叠加 facilityStatus 条件，保证筛选中其它状态数量仍然可见。停用是正常业务状态，保留独立筛选项。 */
const statusTabs = computed(() => {
  const tabs = [{
    value: '',
    label: '全部',
    count: FACILITY_STATUS_CODES.reduce((sum, code) => sum + (counts.value[code] || 0), 0),
    meta: ALL_TAB_META
  }]
  FACILITY_STATUS_CODES.forEach(code => tabs.push({
    value: code,
    label: facilityStatusMap[code] || code,
    count: counts.value[code] || 0,
    meta: FACILITY_STATUS_META[code]
  }))
  return tabs
})

function facilityPillStyle(status?: string) { return statusPillStyle(FACILITY_STATUS_META[status || ''] || FACILITY_STATUS_META['0']) }
function rowClassName({ row }: { row: Facility }) {
  return rowToneClass(row.facilityStatus === '1' ? 'danger' : row.facilityStatus === '2' ? 'closed' : 'done')
}
function switchStatus(value: string) { query.facilityStatus = value; query.pageNum = 1; refreshAll() }

function handleSortChange(change: TableSortChange) {
  applyTableSort(query, change)
  query.pageNum = 1
  loadList()
}

async function loadList() {
  loading.value = true
  try {
    const result: any = await listFacilities(query)
    rows.value = result.rows || []
    total.value = result.total || 0
  } finally { loading.value = false }
}
async function loadMapPoints() {
  mapLoading.value = true
  try {
    const result: any = await listFacilities({
      facilityName: query.facilityName,
      area: query.area,
      categoryId: query.categoryId,
      facilityStatus: query.facilityStatus,
      pageNum: 1,
      pageSize: 10000
    })
    mapFacilities.value = result.rows || []
  } catch {
    mapFacilities.value = []
  } finally {
    mapLoading.value = false
  }
  await nextTick()
  renderMap()
}
async function loadCounts() {
  try {
    const result: any = await listFacilities({
      facilityName: query.facilityName,
      area: query.area,
      categoryId: query.categoryId,
      pageNum: 1,
      pageSize: 10000
    })
    counts.value = (result.rows || []).reduce((sum: Record<string, number>, item: Facility) => {
      const code = String(item.facilityStatus ?? '0')
      sum[code] = (sum[code] || 0) + 1
      return sum
    }, {})
  } catch { /* 接口不可用时保持列表可用 */ }
}
async function refreshAll() { await Promise.all([loadList(), loadCounts(), loadMapPoints()]) }
async function loadCategories() { const result: any = await listFacilityCategories({ pageNum: 1, pageSize: 200, categoryStatus: '0' }); categories.value = result.rows || [] }
function openCreate() { Object.assign(form, emptyForm()); dialogVisible.value = true }
function openEdit(row: Facility) { Object.assign(form, emptyForm(), row); dialogVisible.value = true }
function editMissingCoordinate(row: Facility) { missingVisible.value = false; openEdit(row) }
async function save() {
  if (!form.facilityCode || !form.facilityName) { ElMessage.warning('请填写设施编码和名称'); return }
  if (form.facilityId) {
    const { facilityStatus: _facilityStatus, ...payload } = form
    await updateFacility(payload)
  } else {
    await addFacility(form)
  }
  ElMessage.success('设施已保存')
  dialogVisible.value = false
  refreshAll()
}
async function refreshQr(row: Facility) { await ElMessageBox.confirm(`重新生成 ${row.facilityName} 的二维码？`, '二维码', { type: 'warning' }); await regenerateQrCode(row.facilityId!); qrPreviewVersion.value = Date.now(); ElMessage.success('二维码已重新生成'); await loadList(); if (detailVisible.value && current.value?.facilityId === row.facilityId) current.value = rows.value.find(item => item.facilityId === row.facilityId) || current.value }
async function remove(row: Facility) {
  deleteForm.facilityId = row.facilityId || 0
  deleteForm.facilityName = row.facilityName || ''
  deleteDialogVisible.value = true
}
async function submitDelete() {
  await deleteFacility(deleteForm.facilityId)
  ElMessage.success('设施已删除')
  deleteDialogVisible.value = false
  refreshAll()
}

async function openDetail(row: Facility) {
  current.value = row
  qrPreviewVersion.value = Date.now()
  const facilityId = row.facilityId!
  const [recordResult, ticketResult] = await Promise.all([
    listRecords({ facilityId, pageNum: 1, pageSize: 50 }),
    listTickets({ facilityId, pageNum: 1, pageSize: 50 })
  ]) as any[]
  records.value = recordResult.rows || []
  tickets.value = ticketResult.rows || []
  detailVisible.value = true
}

function statusColor(status?: string) { return status === '1' ? '#ef4444' : status === '2' ? '#94a3b8' : '#0f766e' }
function toggleMap() { mapVisible.value = !mapVisible.value; nextTick(renderMap) }
function openAreaDialog(area: string) {
  selectedArea.value = area
  areaFacilities.value = mapFacilities.value.filter(item => (item.area || '未分区') === area)
  areaVisible.value = true
}
function openAreaFacility(row: Facility) {
  areaVisible.value = false
  openDetail(row)
}
function openClusterDialog(cluster: any) {
  const facilityIds = new Set<number>(cluster.facilityIds || [])
  selectedArea.value = '点位簇'
  areaFacilities.value = mapFacilities.value.filter(item => item.facilityId != null && facilityIds.has(item.facilityId))
  areaVisible.value = true
}

function escapeHtml(value?: string) {
  return String(value || '-').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char] || char))
}

function clusterFacilityPoints(points: any[]) {
  if (!points.length) return []
  const longitudes = points.map(item => item.value[0])
  const latitudes = points.map(item => item.value[1])
  const minLongitude = Math.min(...longitudes)
  const maxLongitude = Math.max(...longitudes)
  const minLatitude = Math.min(...latitudes)
  const maxLatitude = Math.max(...latitudes)
  const coordinateSpan = Math.max(maxLongitude - minLongitude, maxLatitude - minLatitude, 0.001)
  const radius = Math.max(0.0012, Math.min(0.003, coordinateSpan / 9))
  const longitudeScale = Math.cos(((minLatitude + maxLatitude) / 2) * Math.PI / 180)
  const clusters: Array<{ longitude: number; latitude: number; points: any[] }> = []

  points.forEach(point => {
    const nearest = clusters
      .map(cluster => ({
        cluster,
        distance: Math.hypot(
          (point.value[0] - cluster.longitude) * longitudeScale,
          point.value[1] - cluster.latitude
        )
      }))
      .filter(item => item.distance <= radius)
      .sort((left, right) => left.distance - right.distance)[0]?.cluster

    if (!nearest) {
      clusters.push({ longitude: point.value[0], latitude: point.value[1], points: [point] })
      return
    }
    nearest.points.push(point)
    nearest.longitude = nearest.points.reduce((sum, item) => sum + item.value[0], 0) / nearest.points.length
    nearest.latitude = nearest.points.reduce((sum, item) => sum + item.value[1], 0) / nearest.points.length
  })

  return clusters.map(cluster => {
    const faultCount = cluster.points.filter(item => item.status === '1').length
    const disabledCount = cluster.points.filter(item => item.status === '2').length
    const normalCount = cluster.points.length - faultCount - disabledCount
    return {
      ...cluster.points[0],
      facilityId: cluster.points.length === 1 ? cluster.points[0].facilityId : undefined,
      facilityIds: cluster.points.map(item => item.facilityId).filter((id): id is number => id != null),
      name: cluster.points.length === 1 ? cluster.points[0].name : `${cluster.points.length} 个设施`,
      value: [cluster.longitude, cluster.latitude] as [number, number],
      status: faultCount ? '1' : disabledCount === cluster.points.length ? '2' : '0',
      facilityCount: cluster.points.length,
      faultCount,
      disabledCount,
      normalCount,
      facilities: cluster.points
    }
  })
}

function renderMap() {
  if (!mapVisible.value || !mapRef.value) return
  mapChart?.dispose()
  mapChart = echarts.init(mapRef.value)

  const points = plottedFacilities.value.map(item => ({
    facilityId: item.facilityId,
    name: item.facilityName,
    value: [Number(item.longitude), Number(item.latitude)],
    status: item.facilityStatus,
    area: item.area,
    location: item.location,
    categoryName: item.categoryName
  }))

  let boundingCoords: [[number, number], [number, number]] | undefined
  if (points.length) {
    const longitudes = points.map(item => item.value[0])
    const latitudes = points.map(item => item.value[1])
    const minLongitude = Math.min(...longitudes)
    const maxLongitude = Math.max(...longitudes)
    const minLatitude = Math.min(...latitudes)
    const maxLatitude = Math.max(...latitudes)
    const compactView = mapMode.value !== 'area'
    const longitudePadding = Math.max((maxLongitude - minLongitude) * (compactView ? 0.45 : 0.9), compactView ? 0.012 : 0.042)
    const latitudePadding = Math.max((maxLatitude - minLatitude) * (compactView ? 0.45 : 0.9), compactView ? 0.012 : 0.042)
    boundingCoords = [
      [minLongitude - longitudePadding, maxLatitude + latitudePadding],
      [maxLongitude + longitudePadding, minLatitude - latitudePadding]
    ]
  }

  const clusters = clusterFacilityPoints(points)
  const normalClusters = clusters.filter(item => !item.faultCount)
  const faultClusters = clusters.filter(item => item.faultCount)
  const showAreaOverview = mapMode.value === 'area'
  const showClusterOverview = mapMode.value === 'cluster'

  mapChart.setOption({
    animationDuration: 500,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      confine: true,
      padding: [10, 12],
      borderWidth: 0,
      backgroundColor: 'rgba(15, 23, 42, .94)',
      textStyle: { color: '#f8fafc', fontSize: 12 },
      extraCssText: 'border-radius: 10px; box-shadow: 0 12px 30px rgba(15, 23, 42, .24);',
      formatter: (params: any) => {
        const data = params.data || {}
        if (data.areaName) {
          return [
            `<div style="font-weight:700;margin-bottom:6px">${escapeHtml(data.areaName)}</div>`,
            `<div style="color:#cbd5e1;line-height:1.8">共 ${data.total} 个设施<br/>`,
            `<span style="color:#7dd3fc">正常 ${data.normal}</span> · `,
            `<span style="color:#fca5a5">故障 ${data.fault}</span> · `,
            `<span style="color:#cbd5e1">停用 ${data.disabled}</span></div>`,
            '<div style="margin-top:6px;color:#94a3b8;font-size:11px">点击查看设施清单</div>'
          ].join('')
        }
        if (data.facilityCount > 1) {
          const facilityNames = (data.facilities || []).slice(0, 6)
            .map((item: any) => `<div style="max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">· ${escapeHtml(item.name)}</div>`)
            .join('')
          return [
            `<div style="font-weight:700;margin-bottom:6px">聚合点位 · ${data.facilityCount} 个设施</div>`,
            `<div style="color:#cbd5e1;line-height:1.7">${facilityNames}</div>`,
            data.facilityCount > 6 ? `<div style="color:#94a3b8;margin-top:4px">还有 ${data.facilityCount - 6} 个设施</div>` : '',
            '<div style="margin-top:6px;color:#94a3b8;font-size:11px">点击查看完整清单</div>'
          ].join('')
        }
        if (!data.facilityId) return ''
        return [
          `<div style="font-weight:700;margin-bottom:6px">${escapeHtml(data.name)}</div>`,
          `<div style="color:#cbd5e1;line-height:1.75">区域：${escapeHtml(data.area)}<br/>`,
          `分类：${escapeHtml(data.categoryName || '未分类')}<br/>`,
          `位置：${escapeHtml(data.location)}<br/>`,
          `状态：${escapeHtml(facilityStatusMap[data.status || ''] || '未知')}<br/>`,
          `坐标：${Number(data.value[1]).toFixed(6)}, ${Number(data.value[0]).toFixed(6)}</div>`
        ].join('')
      }
    },
    geo: {
      map: 'xihu-district',
      roam: true,
      scaleLimit: { min: 0.8, max: 8 },
      ...(boundingCoords ? { boundingCoords } : {}),
      itemStyle: {
        areaColor: '#e8f3ee',
        borderColor: '#9ab8ad',
        borderWidth: 1,
        shadowColor: 'rgba(15, 118, 110, .12)',
        shadowBlur: 18
      },
      emphasis: {
        disabled: true
      },
      select: {
        disabled: true
      },
      label: {
        show: false
      }
    },
    series: [
      {
        name: '区域概览',
        type: 'scatter',
        coordinateSystem: 'geo',
        data: showAreaOverview ? areaStats.value : [],
        symbol: 'circle',
        symbolSize: (params: any) => Math.min(48, 28 + Math.sqrt(params.data?.total || 1) * 5),
        z: 4,
        itemStyle: {
          color: (params: any) => params.data?.fault ? 'rgba(15, 118, 110, .9)' : params.data?.disabled === params.data?.total ? '#64748b' : '#0f766e',
          borderColor: (params: any) => params.data?.fault ? '#dc2626' : '#ffffff',
          borderWidth: (params: any) => params.data?.fault ? 3 : 2,
          shadowBlur: 14,
          shadowColor: 'rgba(15, 23, 42, .18)'
        },
        emphasis: {
          scale: 1.08
        },
        label: {
          show: true,
          position: 'inside',
          formatter: (params: any) => String(params.data?.total || 0),
          color: '#ffffff',
          fontSize: 12,
          fontWeight: 700
        },
        labelLayout: {
          hideOverlap: true
        }
      },
      {
        name: '设施',
        type: 'scatter',
        coordinateSystem: 'geo',
        data: showAreaOverview ? [] : showClusterOverview ? normalClusters : points.filter(item => item.status !== '1'),
        symbol: 'circle',
        symbolSize: (params: any) => params.data?.facilityCount > 1 ? Math.min(36, 18 + Math.sqrt(params.data.facilityCount) * 5) : 10,
        z: 4,
        itemStyle: {
          color: (params: any) => params.data?.disabledCount === params.data?.facilityCount ? '#64748b' : statusColor(params.data.status),
          borderColor: '#ffffff',
          borderWidth: 2,
          shadowBlur: 8,
          shadowColor: 'rgba(15, 23, 42, .18)'
        },
        emphasis: {
          scale: 1.8
        },
        label: {
          show: true,
          position: 'inside',
          formatter: (params: any) => params.data?.facilityCount > 1 ? String(params.data.facilityCount) : '',
          color: '#ffffff',
          fontSize: 12,
          fontWeight: 700
        }
      },
      {
        name: '故障设施',
        type: 'effectScatter',
        coordinateSystem: 'geo',
        data: showAreaOverview ? [] : showClusterOverview ? faultClusters : points.filter(item => item.status === '1'),
        symbol: 'circle',
        symbolSize: (params: any) => params.data?.facilityCount > 1 ? Math.min(40, 20 + Math.sqrt(params.data.facilityCount) * 5) : 14,
        z: 6,
        rippleEffect: {
          scale: 2,
          brushType: 'stroke'
        },
        itemStyle: {
          color: '#dc2626',
          borderColor: '#ffffff',
          borderWidth: 2,
          shadowBlur: 7,
          shadowColor: 'rgba(220, 38, 38, .45)'
        },
        label: {
          show: true,
          position: 'inside',
          formatter: (params: any) => params.data?.facilityCount > 1 ? String(params.data.facilityCount) : '',
          color: '#ffffff',
          fontSize: 12,
          fontWeight: 700,
          textBorderColor: '#b91c1c',
          textBorderWidth: 1
        },
        labelLayout: {
          hideOverlap: true
        }
      }
    ]
  })
  mapChart.on('click', (params: any) => {
    if (params.data?.areaName) {
      openAreaDialog(params.data.areaName)
      return
    }
    if (params.data?.facilityCount > 1) {
      openClusterDialog(params.data)
      return
    }
    const target = mapFacilities.value.find(item => item.facilityId === params.data?.facilityId)
    if (target) openDetail(target)
  })
}
function resizeMap() { mapChart?.resize() }
onMounted(() => { refreshAll(); loadCategories(); window.addEventListener('resize', resizeMap) })
onBeforeUnmount(() => { window.removeEventListener('resize', resizeMap); mapChart?.dispose() })
</script>

<style scoped>
.pager { display: flex; justify-content: flex-end; padding: 16px 18px; }
.map-panel { margin-bottom: 16px; }
.map-header { gap: 16px; flex-wrap: wrap; }
.map-title-wrap { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 10px; min-width: 0; }
.map-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
.map-mode-switch { --el-color-primary: #0f766e; --el-color-primary-light-9: #ecfdf5; }
.map-caption { color: var(--ops-muted); font-size: 12px; }
.map-warning { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 11px; border: 1px solid #fcd34d; border-radius: 999px; background: #fffbeb; color: #b45309; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
.map-warning svg { width: 14px; height: 14px; }
.map-stage { position: relative; overflow: hidden; border-radius: 0 0 13px 13px; background: linear-gradient(145deg, #f4faf7 0%, #edf5f2 48%, #f8fbfa 100%); }
.map-chart { width: 100%; height: 470px; }
.map-area-index { position: absolute; top: 16px; right: 16px; z-index: 3; width: 190px; padding: 10px; border: 1px solid rgba(203, 213, 225, .9); border-radius: 10px; background: rgba(255, 255, 255, .94); box-shadow: 0 12px 30px rgba(15, 23, 42, .08); backdrop-filter: blur(8px); }
.area-index-head { display: flex; align-items: center; justify-content: space-between; padding: 0 7px 7px; color: var(--ops-muted); font-size: 10px; }
.area-index-head strong { color: var(--ops-ink); font-size: 12px; }
.area-index-item { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 7px; border: 0; border-radius: 7px; background: transparent; color: #334155; font-family: inherit; font-size: 12px; text-align: left; cursor: pointer; transition: background-color .16s, color .16s; }
.area-index-item + .area-index-item { margin-top: 1px; }
.area-index-item:hover { background: #f1f8f6; color: var(--ops-primary); }
.area-index-item span { display: inline-flex; align-items: center; gap: 7px; min-width: 0; }
.area-index-item span i { width: 7px; height: 7px; flex: 0 0 auto; border: 2px solid transparent; border-radius: 50%; background: #0f766e; box-shadow: 0 0 0 1px rgba(15, 118, 110, .2); }
.area-index-item.has-fault span i { border-color: #dc2626; background: #fef2f2; box-shadow: none; }
.area-index-item em { display: inline-flex; align-items: center; justify-content: center; min-width: 22px; height: 20px; padding: 0 6px; border-radius: 6px; background: #f1f5f9; color: #475569; font-size: 11px; font-style: normal; font-weight: 700; }
.map-legend { position: absolute; left: 16px; bottom: 16px; z-index: 3; display: flex; align-items: center; flex-wrap: wrap; gap: 8px 14px; max-width: calc(100% - 180px); padding: 9px 12px; border: 1px solid rgba(203, 213, 225, .9); border-radius: 10px; background: rgba(255, 255, 255, .92); box-shadow: 0 10px 26px rgba(15, 23, 42, .08); backdrop-filter: blur(8px); }
.map-legend-item { display: inline-flex; align-items: center; gap: 6px; color: #334155; font-size: 12px; font-weight: 600; white-space: nowrap; }
.map-legend-item i { width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 0 0 3px rgba(148, 163, 184, .12); }
.map-legend-item i.area-size-legend { width: 12px; height: 12px; border: 2px solid #fff; background: #0f766e; box-shadow: 0 0 0 1px rgba(15, 118, 110, .24); }
.map-legend-item i.area-fault-legend { width: 12px; height: 12px; border: 2px solid #dc2626; background: #ecfdf5; box-shadow: none; }
.map-legend-tip { color: var(--ops-muted); font-size: 11px; white-space: nowrap; }
.map-source { position: absolute; right: 12px; bottom: 8px; color: rgba(100, 116, 139, .78); font-size: 10px; pointer-events: none; }
.map-empty { position: absolute; inset: 0; z-index: 2; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px; background: rgba(248, 250, 252, .76); color: var(--ops-muted); text-align: center; }
.map-empty strong { color: var(--ops-ink); font-size: 15px; }
.map-empty span { font-size: 12px; }
.area-dialog-summary { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 18px; margin: -2px 0 14px; color: var(--ops-muted); font-size: 12px; }
.area-dialog-summary strong { color: var(--ops-ink); font-size: 15px; }
.area-dialog-summary .is-danger { color: #b91c1c; }
.area-dialog-summary .is-muted { color: #64748b; }
.missing-description { margin: 0 0 14px; color: var(--ops-muted); font-size: 13px; line-height: 1.7; }
.missing-list { display: flex; flex-direction: column; gap: 8px; max-height: 420px; overflow-y: auto; }
.missing-item { display: flex; align-items: center; justify-content: space-between; gap: 16px; width: 100%; padding: 12px 14px; border: 1px solid var(--ops-border); border-radius: 10px; background: #fff; color: inherit; font-family: inherit; text-align: left; cursor: pointer; transition: border-color .16s, background-color .16s, transform .16s; }
.missing-item:hover { border-color: #99d5cf; background: #f7fcfb; transform: translateY(-1px); }
.missing-main { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.missing-main strong { color: var(--ops-ink); font-size: 13px; }
.missing-main small { overflow: hidden; color: var(--ops-muted); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.drawer-section { margin-top: 22px; }
.drawer-section h4 { margin: 0 0 14px; font-size: 14px; color: var(--ops-primary); }
.drawer-section :deep(.el-timeline) { padding-left: 4px; }
.qr-wrap { display: flex; align-items: center; gap: 18px; }
.qr-image { width: 160px; height: 160px; border: 1px solid var(--ops-border); border-radius: 12px; background: #fff; }
.ticket-list { display: flex; flex-direction: column; gap: 10px; }
.ticket-item { padding: 12px 14px; border: 1px solid var(--ops-border); border-radius: 12px; background: #f8fafc; }
.ticket-top { display: flex; align-items: center; justify-content: space-between; }
.ticket-no { color: var(--ops-primary); font-family: "Cascadia Code", Consolas, monospace; font-size: 12px; }
.ticket-item p { margin: 8px 0; font-size: 13px; }
.ticket-meta { display: flex; justify-content: space-between; color: var(--ops-muted); font-size: 12px; }
.log-status { margin-left: 8px; color: var(--ops-muted); font-size: 12px; }
.process-desc { margin: 6px 0 0; color: var(--ops-muted); font-size: 12px; line-height: 1.7; }
@media (max-width: 768px) {
  .map-chart { height: 390px; }
  .map-area-index { position: static; width: auto; margin: 0 16px 14px; box-shadow: none; }
  .map-legend { right: 16px; max-width: calc(100% - 32px); }
  .map-legend-tip { flex-basis: 100%; }
}
</style>
