<template>
  <div class="page-shell">
    <div class="page-heading">
      <div><h1 class="page-title">周期计划</h1><p class="page-subtitle">通过 Cron 表达式按周期自动生成巡检任务。</p></div>
      <el-button type="primary" :icon="Plus" @click="openCreate">新增计划</el-button>
    </div>
    <section class="panel">
      <div class="panel-body toolbar">
        <el-input v-model="query.keyword" placeholder="计划名称 / 路线 / 负责人" clearable style="width: 300px" @keyup.enter="refreshAll" />
        <el-button type="primary" @click="refreshAll">查询</el-button>
      </div>
      <div class="status-tabs">
        <button
          v-for="tab in statusTabs"
          :key="tab.value || 'all'"
          type="button"
          class="status-tab"
          :class="{ 'is-active': query.enabled === tab.value }"
          :style="{ '--tab-color': tab.meta.color, '--tab-bg': tab.meta.bg, '--tab-border': tab.meta.border }"
          @click="switchStatus(tab.value)"
        >
          <i class="tab-dot" />{{ tab.label }}<em>{{ tab.count }}</em>
        </button>
      </div>
      <el-table v-loading="loading" :data="rows" stripe :row-class-name="rowClassName" @sort-change="handleSortChange">
        <el-table-column prop="planName" label="计划名称" min-width="180" show-overflow-tooltip sortable="custom" />
        <el-table-column prop="routeName" label="路线" min-width="150" show-overflow-tooltip />
        <el-table-column prop="cronExpression" label="Cron 表达式" min-width="180"><template #default="{ row }"><span class="mono">{{ row.cronExpression }}</span></template></el-table-column>
        <el-table-column prop="assigneeName" label="负责人" width="110"><template #default="{ row }">{{ row.assigneeName || '未指派' }}</template></el-table-column>
        <el-table-column prop="enabled" label="状态" width="100" sortable="custom"><template #default="{ row }"><span class="status-pill" :style="planPillStyle(row)"><i class="pill-dot" />{{ planEnabledText(row.enabled) }}</span></template></el-table-column>
        <el-table-column prop="nextFireTime" label="下次触发" width="160" sortable="custom"><template #default="{ row }">{{ formatTime(row.nextFireTime) }}</template></el-table-column>
        <el-table-column prop="lastGenerateTime" label="上次生成" width="160" sortable="custom"><template #default="{ row }">{{ formatTime(row.lastGenerateTime) }}</template></el-table-column>
        <el-table-column label="操作" width="160" fixed="right"><template #default="{ row }"><el-button link type="primary" @click="openEdit(row)">编辑</el-button><el-button v-permission="'system:plan:remove'" link type="danger" @click="remove(row)">删除</el-button></template></el-table-column>
      </el-table>
      <PaginationBar v-model:page="query.pageNum" v-model:page-size="query.pageSize" :total="total" @change="loadList" />
    </section>
    <el-dialog v-model="dialogVisible" :title="form.planId ? '编辑周期计划' : '新增周期计划'" width="620px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="计划名称" required><el-input v-model="form.planName" /></el-form-item>
        <el-form-item label="巡检路线" required><el-select v-model="form.routeId" style="width:100%"><el-option v-for="item in routes" :key="item.routeId" :label="item.routeName" :value="item.routeId" /></el-select></el-form-item>
        <el-form-item label="负责人"><el-select v-model="form.assigneeId" clearable style="width:100%"><el-option v-for="item in users" :key="item.userId" :label="item.nickName || item.userName" :value="item.userId" /></el-select></el-form-item>
        <el-form-item label="Cron 表达式" required><el-input v-model="form.cronExpression" placeholder="例如：0 0 8 * * ?" /></el-form-item>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="开始时间"><el-date-picker v-model="form.startTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="选择开始时间" style="width:100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="结束时间"><el-date-picker v-model="form.endTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="选择结束时间" style="width:100%" /></el-form-item></el-col>
        </el-row>
        <el-form-item label="启用状态"><el-switch v-model="form.enabled" active-value="1" inactive-value="0" active-text="启用" inactive-text="停用" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" @click="save">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import PaginationBar from '@/components/PaginationBar.vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { addPlan, deletePlan, getPlanStatusCounts, listPlans, listRoutes, listUsers, updatePlan, type Plan, type RouteInfo } from '@/api/system'
import { ALL_TAB_META, PLAN_STATUS_META, rowToneClass, statusPillStyle } from '@/utils/statusMeta'
import { formatTime } from '@/utils/format'
import { applyTableSort, type TableSortChange } from '@/utils/tableSort'

const loading = ref(false)
const rows = ref<Plan[]>([])
const total = ref(0)
const counts = ref<Record<string, number>>({})
const routes = ref<RouteInfo[]>([])
const users = ref<Array<Record<string, any>>>([])
const dialogVisible = ref(false)
const query = reactive({ keyword: '', enabled: '', pageNum: 1, pageSize: 10, orderByColumn: undefined as string | undefined, isAsc: undefined as string | undefined })
const emptyForm = (): Plan => ({ planName: '', routeId: undefined, assigneeId: undefined, cronExpression: '', startTime: '', endTime: '', enabled: '1' })
const form = reactive<Plan>(emptyForm())

function planEnabledText(enabled?: string) { return enabled === '1' ? '启用' : '停用' }
function planPillStyle(row: Plan) { return statusPillStyle(PLAN_STATUS_META[row.enabled === '1' ? '1' : '0']) }
function rowClassName({ row }: { row: Plan }) { return rowToneClass(row.enabled === '1' ? 'done' : 'closed') }

const statusTabs = computed(() => [{
  value: '',
  label: '全部',
  count: (counts.value['1'] || 0) + (counts.value['0'] || 0),
  meta: ALL_TAB_META
}, {
  value: '1',
  label: '启用',
  count: counts.value['1'] || 0,
  meta: PLAN_STATUS_META['1']
}, {
  value: '0',
  label: '停用',
  count: counts.value['0'] || 0,
  meta: PLAN_STATUS_META['0']
}])

function switchStatus(value: string) { query.enabled = value; query.pageNum = 1; loadList() }

async function loadList() {
  loading.value = true
  try {
    const result: any = await listPlans({ ...query })
    rows.value = result.rows || []
    total.value = result.total || 0
  } finally {
    loading.value = false
  }
}
async function loadCounts() {
  const result: any = await getPlanStatusCounts({ keyword: query.keyword })
  counts.value = result.data || {}
}
async function refreshAll() {
  query.pageNum = 1
  await Promise.all([loadList(), loadCounts()])
}
function handleSortChange(change: TableSortChange) {
  applyTableSort(query, change)
  query.pageNum = 1
  loadList()
}
async function loadOptions() {
  const [routeResult, userResult] = await Promise.all([
    listRoutes({ pageNum: 1, pageSize: 200, routeStatus: '0' }),
    listUsers({ pageNum: 1, pageSize: 200, status: '0' })
  ]) as any[]
  routes.value = routeResult.rows || []
  users.value = userResult.rows || []
}
function openCreate() { Object.assign(form, emptyForm()); dialogVisible.value = true }
function openEdit(row: Plan) { Object.assign(form, emptyForm(), row); dialogVisible.value = true }
async function remove(row: Plan) {
  await ElMessageBox.confirm(`确认删除计划「${row.planName || ''}」？`, '删除周期计划', { type: 'warning' })
  await deletePlan(row.planId!)
  ElMessage.success('计划已删除')
  refreshAll()
}
async function save() {
  if (!form.planName || !form.routeId || !form.cronExpression) { ElMessage.warning('请填写计划名称、路线和 Cron 表达式'); return }
  if (form.planId) await updatePlan(form); else await addPlan(form)
  ElMessage.success('计划已保存')
  dialogVisible.value = false
  loadList()
}
onMounted(() => { refreshAll(); loadOptions() })
</script>
