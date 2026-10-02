<template>
  <div class="page-shell">
    <div class="page-heading">
      <div><h1 class="page-title">巡检任务</h1><p class="page-subtitle">按路线创建任务，跟踪设施快照和巡检完成进度。</p></div>
      <el-button v-permission="'system:task:add'" type="primary" :icon="Plus" @click="openCreate">新建任务</el-button>
    </div>
    <section class="panel">
      <div class="panel-body toolbar">
        <el-input v-model="query.keyword" placeholder="任务编号 / 名称 / 路线 / 负责人" clearable style="width: 300px" @keyup.enter="refreshAll" />
        <el-button type="primary" @click="refreshAll">查询</el-button>
      </div>
      <div class="status-tabs">
        <button
          v-for="tab in statusTabs"
          :key="tab.value || 'all'"
          type="button"
          class="status-tab"
          :class="{ 'is-active': query.taskStatus === tab.value }"
          :style="{ '--tab-color': tab.meta.color, '--tab-bg': tab.meta.bg, '--tab-border': tab.meta.border }"
          @click="switchStatus(tab.value)"
        >
          <i class="tab-dot" />{{ tab.label }}<em>{{ tab.count }}</em>
        </button>
      </div>
      <el-table v-loading="loading" :data="rows" stripe :row-class-name="rowClassName" @sort-change="handleSortChange">
        <el-table-column prop="taskNo" label="任务编号" width="146" sortable="custom" />
        <el-table-column prop="taskName" label="任务名称" min-width="170" show-overflow-tooltip sortable="custom" />
        <el-table-column prop="routeName" label="巡检路线" min-width="130" show-overflow-tooltip />
        <el-table-column prop="assigneeName" label="负责人" width="92"><template #default="{ row }">{{ row.assigneeName || '未指派' }}</template></el-table-column>
        <el-table-column prop="t.taskStatus" label="状态" width="108" sortable="custom"><template #default="{ row }"><span class="status-pill" :style="statusPillStyle(row.taskStatus)"><i class="pill-dot" />{{ taskStatusMap[row.taskStatus || ''] || '未知' }}</span></template></el-table-column>
        <el-table-column prop="t.plannedTime" label="计划时间" width="146" sortable="custom"><template #default="{ row }">{{ formatTime(row.plannedTime) }}</template></el-table-column>
        <el-table-column prop="t.deadline" label="截止时间" width="146" sortable="custom"><template #default="{ row }"><span :class="{ 'text-overdue': isTaskOverdue(row) }">{{ formatTime(row.deadline) }}</span></template></el-table-column>
        <el-table-column label="操作" width="200" fixed="right"><template #default="{ row }"><el-button link type="primary" @click="openDetail(row)">详情</el-button><el-button v-permission="'system:task:edit'" link type="primary" @click="openEdit(row)">编辑</el-button><el-button v-if="!['2','3'].includes(row.taskStatus || '')" v-permission="'system:task:edit'" link type="danger" @click="closeRow(row)">关闭</el-button></template></el-table-column>
      </el-table>
      <PaginationBar v-model:page="query.pageNum" v-model:page-size="query.pageSize" :total="total" @change="loadList" />
    </section>

    <el-dialog v-model="dialogVisible" :title="form.taskId ? '编辑巡检任务' : '新建巡检任务'" width="620px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="任务名称" required><el-input v-model="form.taskName" /></el-form-item>
        <el-form-item label="巡检路线" required><el-select v-model="form.routeId" :disabled="Boolean(form.taskId)" style="width:100%"><el-option v-for="item in routes" :key="item.routeId" :label="item.routeName" :value="item.routeId" /></el-select></el-form-item>
        <el-form-item label="负责人"><el-select v-model="form.assigneeId" clearable style="width:100%"><el-option v-for="item in users" :key="item.userId" :label="item.nickName || item.userName" :value="item.userId" /></el-select></el-form-item>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="计划时间"><el-date-picker v-model="form.plannedTime" type="datetime" placeholder="选择计划时间" value-format="YYYY-MM-DD HH:mm:ss" style="width:100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="截止时间"><el-date-picker v-model="form.deadline" type="datetime" placeholder="选择截止时间" value-format="YYYY-MM-DD HH:mm:ss" style="width:100%" /></el-form-item></el-col>
        </el-row>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="3" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" @click="saveTask">保存</el-button></template>
    </el-dialog>

    <el-drawer v-model="taskDetailVisible" title="任务详情" size="560px">
      <el-descriptions v-if="taskDetail" :column="1" border>
        <el-descriptions-item label="任务编号">{{ taskDetail.taskNo }}</el-descriptions-item>
        <el-descriptions-item label="任务名称">{{ taskDetail.taskName }}</el-descriptions-item>
        <el-descriptions-item label="巡检路线">{{ taskDetail.routeName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="负责人">{{ taskDetail.assigneeName || '未指派' }}</el-descriptions-item>
        <el-descriptions-item label="任务状态"><span class="status-pill" :style="statusPillStyle(taskDetail.taskStatus)"><i class="pill-dot" />{{ taskStatusMap[taskDetail.taskStatus || ''] || '未知' }}</span></el-descriptions-item>
        <el-descriptions-item label="计划时间">{{ formatTime(taskDetail.plannedTime) }}</el-descriptions-item>
        <el-descriptions-item label="截止时间"><span :class="{ 'text-overdue': isTaskOverdue(taskDetail) }">{{ formatTime(taskDetail.deadline) }}</span></el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatTime(taskDetail.createTime) }}</el-descriptions-item>
        <el-descriptions-item label="备注">{{ taskDetail.remark || '-' }}</el-descriptions-item>
      </el-descriptions>
      <div class="drawer-section">
        <h4>设施巡检快照 <span v-if="taskFacilities.length" class="section-count">共 {{ taskFacilities.length }} 个设施</span></h4>
        <el-empty v-if="!taskFacilities.length" description="暂无设施快照" :image-size="70" />
        <div v-else class="facility-groups">
          <section class="phase-group">
            <el-timeline>
              <el-timeline-item
                v-for="item in taskFacilities"
                :key="item.facilityId"
                :timestamp="facilityInspectionText(item)"
                :type="facilityInspectionType(item.inspectionStatus)"
              >
                <div class="facility-head">
                  <strong>{{ item.facilityName }}</strong>
                </div>
                <div class="facility-meta">
                  {{ item.facilityCode }} · {{ item.facilityLocation || item.facilityArea || '未设置位置' }}
                </div>
              </el-timeline-item>
            </el-timeline>
          </section>
        </div>
      </div>
      <div class="drawer-section">
        <h4>巡检记录与现场图片 <span v-if="recordTotal" class="section-count">共 {{ recordTotal }} 条</span></h4>
        <div class="record-toolbar">
          <el-input
            v-model="recordQuery.keyword"
            placeholder="记录编号 / 设施 / 分类 / 状态 / 巡检人 / 描述"
            clearable
            style="width: 300px"
            @clear="searchTaskRecords"
            @keyup.enter="searchTaskRecords"
          />
          <el-select v-model="recordQuery.quickFilter" placeholder="快捷筛选" clearable style="width: 130px" @change="searchTaskRecords">
            <el-option label="最近一周" value="recent" />
            <el-option label="异常记录" value="abnormal" />
          </el-select>
          <el-button type="primary" @click="searchTaskRecords">查询</el-button>
        </div>
        <InspectionRecordGallery :records="taskRecords" />
        <PaginationBar v-model:page="recordQuery.pageNum" v-model:page-size="recordQuery.pageSize" :total="recordTotal" :page-sizes="[5, 10, 20, 50]" @change="loadTaskRecords" />
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import PaginationBar from '@/components/PaginationBar.vue'
import InspectionRecordGallery from '@/components/InspectionRecordGallery.vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { addTask, closeTask, getTask, getTaskFacilities, listRecords, listRoutes, listTasks, listUsers, updateTask, type InspectionRecord, type RouteInfo, type Task, type TaskFacility } from '@/api/system'
import { formatTime, taskStatusMap } from '@/utils/format'
import { useAuthStore } from '@/stores/auth'
import { applyTableSort, type TableSortChange } from '@/utils/tableSort'

const auth = useAuthStore()
const TASK_STATUS_CODES = ['0', '1', '2', '3']
/** 各状态的展示色板：筛选胶囊、状态标签共用，语义与工单看板一致（待办 / 进行中 / 完成 / 关闭）。 */
const STATUS_META: Record<string, { color: string; bg: string; border: string }> = {
  '0': { color: '#b45309', bg: '#fef3c7', border: '#fcd34d' },
  '1': { color: '#1d4ed8', bg: '#dbeafe', border: '#93c5fd' },
  '2': { color: '#15803d', bg: '#dcfce7', border: '#86efac' },
  '3': { color: '#475569', bg: '#e2e8f0', border: '#cbd5e1' }
}
const ALL_TAB_META = { color: '#0f766e', bg: '#e8f1f0', border: '#b8d5d2' }
/** 行色条用的语义色调，与 STATUS_META 的配色一一对应。 */
const TASK_TONE: Record<string, string> = { '0': 'pending', '1': 'doing', '2': 'done', '3': 'closed' }

const route = useRoute()
const loading = ref(false)
const rows = ref<Task[]>([])
const total = ref(0)
/** 各状态任务数量，由后端 /system/task/statusCounts 按当前筛选条件统计。 */
const counts = ref<Record<string, number>>({})
const routes = ref<RouteInfo[]>([])
const users = ref<Record<string, any>[]>([])
const dialogVisible = ref(false)
const taskDetailVisible = ref(false)
const taskDetail = ref<Task>()
const taskFacilities = ref<TaskFacility[]>([])
const taskRecords = ref<InspectionRecord[]>([])
const recordTotal = ref(0)
const recordQuery = reactive({ taskId: undefined as number | undefined, keyword: '', quickFilter: '', pageNum: 1, pageSize: 10 })
const query = reactive({ keyword: '', taskStatus: '', pageNum: 1, pageSize: 10, orderByColumn: undefined as string | undefined, isAsc: undefined as string | undefined })
const emptyForm = (): Task => ({ taskName: '', routeId: undefined, assigneeId: undefined, plannedTime: '', deadline: '', remark: '' })
const form = reactive<Task>(emptyForm())

/** 状态筛选条：把「有几个待执行 / 几个已完成」直接摆在列表上方，点一下即过滤。 */
const statusTabs = computed(() => {
  const tabs = [{
    value: '',
    label: '全部',
    count: TASK_STATUS_CODES.reduce((sum, code) => sum + (counts.value[code] || 0), 0),
    meta: ALL_TAB_META
  }]
  TASK_STATUS_CODES.forEach(code => tabs.push({
    value: code,
    label: taskStatusMap[code],
    count: counts.value[code] || 0,
    meta: STATUS_META[code]
  }))
  return tabs
})

function statusPillStyle(status?: string) {
  const meta = STATUS_META[status || ''] || STATUS_META['3']
  return { color: meta.color, background: meta.bg, borderColor: meta.border }
}

function rowClassName({ row }: { row: Task }) {
  return 'row-tone-' + (TASK_TONE[row.taskStatus || ''] || 'closed')
}

/** 未结束（待执行 / 执行中）且已过截止时间的任务标红。 */
function isTaskOverdue(row?: Task) {
  if (!row || !row.deadline) return false
  if (['2', '3'].includes(row.taskStatus || '')) return false
  return dayjs(row.deadline).isBefore(dayjs())
}

async function loadList() {
  loading.value = true
  try {
    const result: any = await listTasks({ ...query })
    rows.value = result.rows || []
    total.value = result.total || 0
  } finally { loading.value = false }
}

async function loadCounts() {
  const result: any = await listTasks({ keyword: query.keyword, pageNum: 1, pageSize: 10000 })
  counts.value = TASK_STATUS_CODES.reduce((sum, code) => {
    sum[code] = (result.rows || []).filter((item: Task) => item.taskStatus === code).length
    return sum
  }, {} as Record<string, number>)
}

async function refreshAll() { await Promise.all([loadList(), loadCounts()]) }

function switchStatus(value: string) {
  query.taskStatus = value
  query.pageNum = 1
  loadList()
}

function handleSortChange(change: TableSortChange) {
  applyTableSort(query, change)
  query.pageNum = 1
  loadList()
}

async function loadOptions() {
  if (!auth.hasPermission('system:task:add') && !auth.hasPermission('system:task:edit')) return
  const [routeResult, userResult] = await Promise.all([listRoutes({ pageNum: 1, pageSize: 200, routeStatus: '0' }), listUsers({ pageNum: 1, pageSize: 200, status: '0' })]) as any[]
  routes.value = routeResult.rows || []
  users.value = userResult.rows || []
}

function resetForm(value: Task) { Object.assign(form, emptyForm(), value) }
function openCreate() { resetForm(emptyForm()); dialogVisible.value = true }
async function openEdit(row: Task) { const result: any = await getTask(row.taskId!); resetForm(result.data || row); dialogVisible.value = true }
async function saveTask() {
  if (!form.taskName || !form.routeId) { ElMessage.warning('请填写任务名称并选择巡检路线'); return }
  if (form.taskId) await updateTask(form); else await addTask(form)
  ElMessage.success('任务已保存')
  dialogVisible.value = false
  refreshAll()
}
function facilityInspectionText(item: TaskFacility) {
  if (item.inspectionStatus === '1') return '巡检正常'
  if (item.inspectionStatus === '2') return '发现异常'
  if (item.inspectionStatus === '3') return '已授权跳过'
  return facilityStateText(item)
}
function facilityInspectionType(status?: string) { if (status === '1') return 'success'; if (status === '2') return 'danger'; if (status === '3') return 'warning'; return 'info' }
function facilityStateText(item: TaskFacility) {
  return '待巡检'
}
async function openFromQuery() {
  const raw = route.query.taskId
  const taskId = Number(Array.isArray(raw) ? raw[0] : raw)
  if (!taskId) return
  try {
    const result: any = await getTask(taskId)
    if (!result.data) {
      ElMessage.warning('关联任务不存在或已删除')
      return
    }
    await openDetail(result.data)
  } catch {
    ElMessage.warning('关联任务不存在或无权查看')
  }
}

async function openDetail(row: Task) {
  recordQuery.taskId = row.taskId
  recordQuery.keyword = ''
  recordQuery.quickFilter = ''
  recordQuery.pageNum = 1
  recordQuery.pageSize = 10
  const [detail, facilityResult] = await Promise.all([
    getTask(row.taskId!),
    getTaskFacilities(row.taskId!)
  ]) as any[]
  taskDetail.value = detail.data || row
  taskFacilities.value = facilityResult.data || []
  taskDetailVisible.value = true
  await loadTaskRecords()
}
async function loadTaskRecords() {
  if (!recordQuery.taskId) return
  try {
    const result: any = await listRecords({ ...recordQuery })
    taskRecords.value = result.rows || []
    recordTotal.value = Number(result.total || 0)
  } catch {
    taskRecords.value = []
    recordTotal.value = 0
  }
}
function searchTaskRecords() {
  recordQuery.pageNum = 1
  loadTaskRecords()
}
async function closeRow(row: Task) {
  const { value } = await ElMessageBox.prompt(`确定关闭任务 ${row.taskName}？`, '关闭任务', {
    type: 'warning',
    inputPlaceholder: '请输入关闭原因',
    inputValidator: (value: string) => value?.trim() ? true : '关闭原因不能为空'
  })
  await closeTask(row.taskId!, value.trim())
  ElMessage.success('任务已关闭')
  refreshAll()
}
onMounted(async () => { refreshAll(); await loadOptions(); await openFromQuery() })
</script>

<style scoped>
.pager { display: flex; justify-content: flex-end; padding: 16px 18px; }
.facility-meta { margin-top: 6px; color: var(--ops-muted); font-size: 12px; }
.drawer-section { margin-top: 22px; }
.drawer-section h4 { margin: 0 0 14px; font-size: 14px; color: var(--ops-primary); }
.section-count { margin-left: 6px; color: var(--ops-muted); font-size: 12px; font-weight: 400; }
.record-toolbar { display: flex; gap: 10px; margin-bottom: 14px; }
.facility-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
</style>
