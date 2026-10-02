<template>
  <div class="page-shell">
    <div class="page-heading"><div><h1 class="page-title">巡检路线</h1><p class="page-subtitle">维护路线基础信息和设施巡检顺序，为任务与周期计划提供稳定的设施来源。</p></div><el-button v-permission="'system:route:add'" type="primary" :icon="Plus" @click="openCreate">新增路线</el-button></div>
    <section class="panel">
      <div class="panel-body toolbar"><el-input v-model="query.routeName" placeholder="路线名称" clearable style="width: 240px" @keyup.enter="refreshAll" /><el-button type="primary" @click="refreshAll">查询</el-button></div>
      <div class="status-tabs">
        <button
          v-for="tab in statusTabs"
          :key="tab.value || 'all'"
          type="button"
          class="status-tab"
          :class="{ 'is-active': query.routeStatus === tab.value }"
          :style="{ '--tab-color': tab.meta.color, '--tab-bg': tab.meta.bg, '--tab-border': tab.meta.border }"
          @click="switchStatus(tab.value)"
        >
          <i class="tab-dot" />{{ tab.label }}<em>{{ tab.count }}</em>
        </button>
      </div>
      <el-table v-loading="loading" :data="rows" stripe :row-class-name="rowClassName" @sort-change="handleSortChange">
        <el-table-column prop="routeNo" label="路线编号" min-width="150" sortable="custom" />
        <el-table-column prop="routeName" label="路线名称" min-width="180" sortable="custom" />
        <el-table-column prop="routeDesc" label="路线说明" min-width="260" show-overflow-tooltip />
        <el-table-column prop="routeStatus" label="状态" width="100" sortable="custom"><template #default="{ row }"><span class="status-pill" :style="routePillStyle(row.routeStatus)"><i class="pill-dot" />{{ row.routeStatus === '0' ? '启用' : '停用' }}</span></template></el-table-column>
        <el-table-column label="操作" width="150" fixed="right"><template #default="{ row }"><el-button v-permission="'system:route:edit'" link type="primary" @click="openEdit(row)">编辑 / 设施顺序</el-button></template></el-table-column>
      </el-table>
      <PaginationBar v-model:page="query.pageNum" v-model:page-size="query.pageSize" :total="total" @change="loadList" />
    </section>

    <el-dialog v-model="dialogVisible" :title="form.routeId ? '编辑巡检路线' : '新增巡检路线'" width="860px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="路线名称" required><el-input v-model="form.routeName" /></el-form-item>
        <el-form-item label="路线说明"><el-input v-model="form.routeDesc" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="状态"><el-switch v-model="form.routeStatus" active-value="0" inactive-value="1" active-text="启用" inactive-text="停用" /></el-form-item>
        <el-form-item label="路线设施" required>
          <div class="facility-picker">
            <el-select
              v-model="pendingFacilityId"
              placeholder="输入设施名称 / 编号 / 区域搜索"
              filterable
              remote
              reserve-keyword
              :remote-method="searchFacilities"
              :loading="facilityLoading"
              style="flex:1"
            >
              <el-option v-for="item in selectableFacilities" :key="item.facilityId" :label="`${item.facilityName}（${item.facilityCode}）`" :value="item.facilityId!" />
            </el-select>
            <el-button type="primary" plain @click="addFacility">添加</el-button>
          </div>
          <div class="selected-list">
            <div v-for="(item, index) in selectedFacilities" :key="item.facilityId" class="selected-row">
              <span class="selected-index">{{ index + 1 }}</span>
              <span class="selected-name">{{ item.facilityName }}（{{ item.facilityCode }}）</span>
              <el-button link type="primary" :disabled="index === 0" @click="move(index, -1)">上移</el-button>
              <el-button link type="primary" :disabled="index === selectedFacilities.length - 1" @click="move(index, 1)">下移</el-button>
              <el-button link type="danger" @click="removeFacility(index)">移除</el-button>
            </div>
            <div v-if="!selectedFacilities.length" class="empty-copy">至少选择一个有效设施，顺序即巡检顺序。</div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" @click="save">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import PaginationBar from '@/components/PaginationBar.vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { addRoute, getRoute, listFacilities, listRoutes, updateRoute, type Facility, type RouteFacilityRel, type RouteInfo } from '@/api/system'
import { ALL_TAB_META, ROUTE_STATUS_META, rowToneClass, statusPillStyle } from '@/utils/statusMeta'
import { applyTableSort, type TableSortChange } from '@/utils/tableSort'

const ROUTE_STATUS_CODES = ['0', '1']
const loading = ref(false)
const rows = ref<RouteInfo[]>([])
const total = ref(0)
const dialogVisible = ref(false)
const facilities = ref<Facility[]>([])
const facilityLoading = ref(false)
type RouteFacilityConfig = Facility & Pick<RouteFacilityRel, 'sortOrder'>

const selectedFacilities = ref<RouteFacilityConfig[]>([])
const pendingFacilityId = ref<number>()
const query = reactive({ routeName: '', routeStatus: '', pageNum: 1, pageSize: 10, orderByColumn: undefined as string | undefined, isAsc: undefined as string | undefined })
const emptyForm = (): RouteInfo => ({ routeName: '', routeDesc: '', routeStatus: '0' })
const form = reactive<RouteInfo>(emptyForm())
const selectableFacilities = computed(() => facilities.value.filter(item => !selectedFacilities.value.some(selected => selected.facilityId === item.facilityId)))

async function loadList() { loading.value = true; try { const result: any = await listRoutes(query); rows.value = result.rows || []; total.value = result.total || 0 } finally { loading.value = false } }
const statusTabs = computed(() => {
  const enabledCount = rows.value.filter(item => item.routeStatus === '0').length
  const disabledCount = rows.value.filter(item => item.routeStatus === '1').length
  const tabs = [{ value: '', label: '全部', count: total.value, meta: ALL_TAB_META }]
  ROUTE_STATUS_CODES.forEach(code => tabs.push({
    value: code,
    label: code === '0' ? '启用' : '停用',
    count: code === '0' ? enabledCount : disabledCount,
    meta: ROUTE_STATUS_META[code]
  }))
  return tabs
})
function routePillStyle(status?: string) { return statusPillStyle(ROUTE_STATUS_META[status || ''] || ROUTE_STATUS_META['1']) }
function rowClassName({ row }: { row: RouteInfo }) { return rowToneClass(row.routeStatus === '0' ? 'done' : 'closed') }
function switchStatus(value: string) { query.routeStatus = value; query.pageNum = 1; loadList() }
function handleSortChange(change: TableSortChange) {
  applyTableSort(query, change)
  query.pageNum = 1
  loadList()
}
async function refreshAll() { query.pageNum = 1; await loadList() }
async function loadFacilities(keyword = '') {
  facilityLoading.value = true
  try {
    const result: any = await listFacilities({ pageNum: 1, pageSize: 50, keyword: keyword.trim() })
    facilities.value = (result.rows || []).filter((item: Facility) => item.facilityStatus !== '2')
  } finally {
    facilityLoading.value = false
  }
}
function searchFacilities(keyword: string) {
  loadFacilities(keyword)
}
function openCreate() { Object.assign(form, emptyForm()); selectedFacilities.value = []; pendingFacilityId.value = undefined; dialogVisible.value = true }
async function openEdit(row: RouteInfo) {
  const result: any = await getRoute(row.routeId!)
  const detail: RouteInfo = result.data || row
  Object.assign(form, emptyForm(), detail)
  const rels = detail.tydRouteFacilityRelList || []
  selectedFacilities.value = rels
    .slice()
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .map(rel => ({
      ...(facilities.value.find(item => item.facilityId === rel.facilityId) || {
        facilityId: rel.facilityId,
        facilityName: rel.facilityName,
        facilityCode: rel.facilityCode
      })
    }))
  pendingFacilityId.value = undefined
  dialogVisible.value = true
}
function addFacility() {
  if (!pendingFacilityId.value) { ElMessage.warning('请选择要添加的设施'); return }
  const target = facilities.value.find(item => item.facilityId === pendingFacilityId.value)
  if (target) {
    selectedFacilities.value.push({
      ...target,
      sortOrder: selectedFacilities.value.length + 1
    })
  }
  pendingFacilityId.value = undefined
}
function removeFacility(index: number) { selectedFacilities.value.splice(index, 1) }
function move(index: number, offset: number) {
  const next = index + offset
  const list = selectedFacilities.value
  ;[list[index], list[next]] = [list[next], list[index]]
}
async function save() {
  if (!form.routeName) { ElMessage.warning('请输入路线名称'); return }
  if (!selectedFacilities.value.length) { ElMessage.warning('请至少为路线配置一个有效设施'); return }
  const payload: RouteInfo = {
    ...form,
    tydRouteFacilityRelList: selectedFacilities.value.map((item, index) => ({
      facilityId: item.facilityId,
      sortOrder: index + 1
    }))
  }
  if (form.routeId) await updateRoute(payload); else await addRoute(payload)
  ElMessage.success('路线已保存')
  dialogVisible.value = false
  loadList()
}
onMounted(() => { refreshAll(); loadFacilities() })
</script>

<style scoped>
.pager { display: flex; justify-content: flex-end; padding: 16px 18px; }
.facility-picker { display: flex; gap: 10px; width: 100%; }
.selected-list { width: 100%; margin-top: 12px; border: 1px dashed var(--ops-border); border-radius: 10px; padding: 10px; }
.selected-row { display: flex; align-items: center; gap: 8px; padding: 6px 4px; flex-wrap: wrap; }
.selected-index { width: 24px; height: 24px; border-radius: 7px; display: grid; place-items: center; background: #ccfbf1; color: #0f766e; font-size: 12px; font-weight: 700; }
.selected-name { flex: 1 1 180px; min-width: 160px; font-size: 13px; }
.empty-copy { padding: 10px; color: var(--ops-muted); font-size: 12px; text-align: center; }
</style>
