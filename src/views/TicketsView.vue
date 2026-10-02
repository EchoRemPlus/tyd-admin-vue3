<template>
  <div class="page-shell">
    <div class="page-heading">
      <div><h1 class="page-title">工单看板</h1><p class="page-subtitle">按状态分栏查看工单，完成派发、接单时限跟踪和闭环归档。</p></div>
      <div class="heading-actions">
        <el-radio-group v-model="viewMode">
          <el-radio-button value="board">看板</el-radio-button>
          <el-radio-button value="list">列表</el-radio-button>
        </el-radio-group>
        <el-radio-group v-if="viewMode === 'board'" v-model="density" size="small" class="density-switch">
          <el-radio-button value="compact">紧凑</el-radio-button>
          <el-radio-button value="cozy">标准</el-radio-button>
        </el-radio-group>
        <el-button :icon="Refresh" @click="refreshAll">刷新</el-button>
      </div>
    </div>
    <section class="panel board-panel">
      <div class="board-toolbar">
        <el-input v-model="filters.keyword" placeholder="编号 / 设施 / 分类 / 故障 / 状态 / 人员" clearable class="toolbar-search" @keyup.enter="refreshAll" />
        <el-select v-model="filters.quickFilter" placeholder="快捷筛选" clearable class="toolbar-select" @change="handleQuickFilterChange">
          <el-option label="最近一周" value="recent" />
          <el-option label="我的工单" value="mine" />
          <el-option label="已超时" value="overdue" />
          <el-option label="未派发" value="unassigned" />
          <el-option label="紧急工单" value="urgent" />
        </el-select>
        <el-select v-model="filters.priority" placeholder="优先级" clearable class="toolbar-select">
          <el-option label="紧急" value="1" />
          <el-option label="普通" value="2" />
          <el-option label="较低" value="3" />
        </el-select>
        <el-select v-if="canAssignTicket" v-model="filters.assigneeId" placeholder="维修人员" clearable filterable class="toolbar-select">
          <el-option v-for="item in repairers" :key="item.userId" :label="item.nickName || item.userName" :value="item.userId" />
        </el-select>
        <el-date-picker v-model="filters.dateRange" type="daterange" unlink-panels value-format="YYYY-MM-DD" range-separator="至" start-placeholder="创建开始" end-placeholder="创建结束" class="toolbar-date" />
        <el-checkbox v-model="filters.overdueOnly" border @change="handleOverdueChange">只看超时</el-checkbox>
        <el-button type="primary" :icon="Search" @click="refreshAll">查询</el-button>
        <el-button @click="resetFilters">重置</el-button>
        <span class="board-count">共 {{ totalCount }} 条</span>
      </div>

      <div v-if="viewMode === 'board'" class="board" :class="'density-' + density" v-loading="boardLoading">
        <div
          v-for="column in columns"
          :key="column.status"
          class="board-column"
          :class="'mode-' + columnMode[column.status]"
          :style="{ '--col-color': STATUS_META[column.status].bar, '--col-bg': STATUS_META[column.status].bg, '--col-text': STATUS_META[column.status].color }"
        >
          <!-- 空列 / 已收起的列：只留一条竖排窄条，宽度让给有内容的列 -->
          <div v-if="columnMode[column.status] === 'rail'" class="rail-inner" :title="railTitle(column)" @click="toggleColumn(column.status)">
            <i class="column-dot" />
            <span class="rail-title">{{ column.title }}</span>
            <span class="rail-hint"><el-icon><Expand /></el-icon></span>
            <strong class="rail-count">{{ columnTotals[column.status] || 0 }}</strong>
          </div>

          <template v-else>
            <div class="column-head">
              <span class="column-title"><i class="column-dot" />{{ column.title }}</span>
              <span class="column-tools">
                <strong class="column-count">{{ columnTotals[column.status] || 0 }}</strong>
                <button type="button" class="column-toggle" :title="'收起「' + column.title + '」'" @click="toggleColumn(column.status)">
                  <el-icon><Fold /></el-icon>
                </button>
              </span>
            </div>

            <div class="column-body">
              <article
                v-for="item in columnRows[column.status] || []"
                :key="item.ticketId"
                class="ticket-card"
                :class="[{ 'is-overdue': isOverdue(item) }, 'tone-' + (TICKET_TONE[item.ticketStatus || ''] || 'closed')]"
                :title="cardTitle(item)"
                @click="openDetail(item)"
              >
                <div class="ticket-top">
                  <span class="ticket-no">{{ item.ticketNo }}</span>
                  <em class="priority-chip" :class="'level-' + (item.priority || '2')">{{ priorityMap[item.priority || '2'] }}</em>
                </div>
                <h3 class="ticket-facility">{{ item.facilityName || '未知设施' }}</h3>
                <p class="ticket-issue">{{ item.issueDesc || '暂无故障描述' }}</p>
                <div class="ticket-foot">
                  <span class="foot-meta">
                    <span class="foot-assignee" :class="{ 'is-empty': !item.assigneeName }">{{ item.assigneeName || '未指派' }}</span>
                    <template v-if="!deadlineBadge(item).text">
                      <span class="foot-sep">·</span>
                      <span class="foot-time">{{ shortDate(item.createTime) }}</span>
                    </template>
                    <em v-if="deadlineBadge(item).text" class="time-chip" :class="'tone-' + deadlineBadge(item).tone">{{ deadlineBadge(item).text }}</em>
                  </span>
                  <el-button v-if="canAssignTicket && item.ticketStatus === '0'" type="primary" size="small" plain class="foot-action" @click.stop="openDispatch(item)">派发</el-button>
                  <span v-else-if="footTail(item)" class="foot-tail">{{ footTail(item) }}</span>
                </div>
              </article>
              <div v-if="!(columnRows[column.status] || []).length" class="empty-copy">暂无工单</div>
              <el-button v-if="(columnRows[column.status] || []).length < (columnTotals[column.status] || 0)" text class="load-more" :loading="columnLoading[column.status]" @click="loadMore(column.status)">
                加载更多（{{ (columnRows[column.status] || []).length }} / {{ columnTotals[column.status] || 0 }}）
              </el-button>
            </div>

            <!-- 列脚常驻：随时能跳到列表视图看该类工单的全量明细 -->
            <div class="column-foot">
              <span>共 {{ columnTotals[column.status] || 0 }} 张</span>
              <button type="button" class="foot-link" @click="gotoList(column.status)">列表查看 →</button>
            </div>
          </template>
        </div>
      </div>

      <div v-else class="list-view">
        <div class="status-tabs">
          <button
            v-for="tab in statusTabs"
            :key="tab.value || 'all'"
            type="button"
            class="status-tab"
            :class="{ 'is-active': listStatus === tab.value }"
            :style="{ '--tab-color': tab.meta.color, '--tab-bg': tab.meta.bg, '--tab-border': tab.meta.border }"
            @click="switchListStatus(tab.value)"
          >
            <i class="tab-dot" />{{ tab.label }}<em>{{ tab.count }}</em>
          </button>
        </div>
        <el-table v-loading="listLoading" :data="listRows" stripe :row-class-name="rowClassName" @row-click="openDetail" @sort-change="handleSortChange">
          <el-table-column prop="ticketNo" label="工单编号" width="146" sortable="custom" />
          <el-table-column prop="t.ticketStatus" label="状态" width="112" sortable="custom"><template #default="{ row }"><span class="status-pill" :style="statusPillStyle(row.ticketStatus)"><i class="pill-dot" />{{ ticketStatusMap[row.ticketStatus || ''] || '未知' }}</span></template></el-table-column>
          <el-table-column label="设施" min-width="120" show-overflow-tooltip><template #default="{ row }">{{ row.facilityName || '未知设施' }}</template></el-table-column>
          <el-table-column label="故障描述" min-width="150" show-overflow-tooltip><template #default="{ row }">{{ row.issueDesc || '-' }}</template></el-table-column>
          <el-table-column prop="priority" label="优先级" width="80" sortable="custom"><template #default="{ row }"><el-tag size="small" effect="plain" :type="row.priority === '1' ? 'danger' : 'info'">{{ priorityMap[row.priority || '2'] }}</el-tag></template></el-table-column>
          <el-table-column label="维修人" width="96"><template #default="{ row }">{{ row.assigneeName || '未指派' }}</template></el-table-column>
          <el-table-column label="时限" width="154"><template #default="{ row }"><span :class="{ 'text-overdue': isOverdue(row) }">{{ deadlineText(row) }}</span></template></el-table-column>
          <el-table-column prop="t.createTime" label="创建时间" width="148" sortable="custom"><template #default="{ row }">{{ formatTime(row.createTime) }}</template></el-table-column>
        <el-table-column label="操作" width="112" fixed="right"><template #default="{ row }"><el-button v-if="canAssignTicket && row.ticketStatus === '0'" link type="primary" @click.stop="openDispatch(row)">派发</el-button><el-button link type="primary" @click.stop="openDetail(row)">详情</el-button></template></el-table-column>
        </el-table>
        <div class="list-footer">
          <el-pagination background layout="total, sizes, prev, pager, next" :total="listTotal" :current-page="listQuery.pageNum" :page-size="listQuery.pageSize" :page-sizes="[10, 20, 50, 100]" @current-change="handlePageChange" @size-change="handleSizeChange" />
        </div>
      </div>
    </section>
    <el-dialog v-model="dispatchVisible" title="派发维修工单" width="540px">
      <el-form label-width="96px">
        <el-form-item label="工单编号"><strong>{{ current?.ticketNo }}</strong></el-form-item>
        <el-form-item label="维修人员" required>
          <el-select v-model="dispatchAssignee" style="width:100%" filterable>
            <el-option v-for="item in repairers" :key="item.userId" :label="item.nickName || item.userName" :value="item.userId" />
          </el-select>
        </el-form-item>
        <div class="dispatch-tip">保存后系统自动写入派发时间并通知维修人员。</div>
      </el-form>
      <template #footer><el-button @click="dispatchVisible = false">取消</el-button><el-button type="primary" @click="submitDispatch">确认派发</el-button></template>
    </el-dialog>

    <el-drawer v-model="detailVisible" title="工单详情" size="620px">
      <el-descriptions v-if="current" :column="1" border>
        <el-descriptions-item label="工单编号">{{ current.ticketNo }}</el-descriptions-item>
        <el-descriptions-item label="当前状态"><el-tag round>{{ ticketStatusMap[current.ticketStatus || ''] }}</el-tag></el-descriptions-item>
        <el-descriptions-item label="设施">{{ current.facilityName }}（{{ current.facilityLocation || '-' }}）</el-descriptions-item>
        <el-descriptions-item label="故障描述">{{ current.issueDesc || '-' }}</el-descriptions-item>
        <el-descriptions-item label="故障分类">{{ current.faultTypeName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="上报人">{{ current.reporterName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="维修人员">{{ current.assigneeName || '未指派' }}</el-descriptions-item>
        <el-descriptions-item label="派发时间">{{ formatTime(current.assignTime) }}</el-descriptions-item>
        <el-descriptions-item label="期望完成">{{ formatTime(current.deadline) }}</el-descriptions-item>
        <el-descriptions-item label="实际完成">{{ formatTime(current.completeTime) }}</el-descriptions-item>
        <el-descriptions-item label="维修结果">{{ repairResultMap[latestResult] || '尚未提交' }}</el-descriptions-item>
        <el-descriptions-item label="关闭原因">{{ current.closeReason || '-' }}</el-descriptions-item>
      </el-descriptions>

      <div class="drawer-section">
        <h4>维修处理记录</h4>
        <el-empty v-if="!processes.length" description="暂无维修处理记录" :image-size="70" />
        <el-timeline v-else>
          <el-timeline-item v-for="item in processes" :key="item.processId" :timestamp="formatTime(item.repairTime)" placement="top">
            <strong>{{ item.handlerName || item.createByName || '维修人员' }}</strong>
            <el-tag size="small" effect="plain" class="inline-tag">{{ processTypeText(item) }}</el-tag>
            <p class="process-desc">{{ item.description || '无补充说明' }}</p>
          </el-timeline-item>
        </el-timeline>
      </div>

      <div v-if="current?.recordId" class="drawer-section">
        <h4>来源巡检记录 <span class="section-count">由巡检上报自动生成</span></h4>
        <InspectionRecordGallery :records="sourceRecords" />
      </div>

      <div class="drawer-section">
        <h4>维修附件</h4>
        <el-empty v-if="!attachments.length" description="暂无维修附件" :image-size="70" />
        <div v-else class="attachment-list">
          <a v-for="item in attachments" :key="item.attachmentId" :href="item.fileUrl" target="_blank" rel="noopener" class="attachment-item">
            <el-tag size="small" effect="plain">{{ isImage(item.fileType) ? '图片' : '文件' }}</el-tag>
            <span>{{ item.fileName }}</span>
          </a>
        </div>
        <AttachmentUpload :related-type="'repair_ticket'" :related-id="current!.ticketId!" @uploaded="reloadAttachments" />
      </div>
      <div class="drawer-section">
        <h4>状态流转时间线</h4>
        <el-empty v-if="!logs.length" description="暂无流转记录" :image-size="70" />
        <el-timeline v-else>
          <el-timeline-item v-for="item in logs" :key="item.logId" :timestamp="formatTime(item.createTime)" :type="timelineType(item.toStatus)">
            <strong>{{ logActionMap[item.action || ''] || item.action || '状态变更' }}</strong>
            <span class="log-status">{{ ticketStatusMap[item.fromStatus || ''] || '创建' }} → {{ ticketStatusMap[item.toStatus || ''] || '创建' }}</span>
            <p class="process-desc">{{ item.operatorName || '系统' }}{{ item.reason ? ' · ' + item.reason : '' }}</p>
          </el-timeline-item>
        </el-timeline>
      </div>

      <div class="drawer-actions" v-if="current">
        <el-button v-if="canCloseTicket && !['3','4'].includes(current.ticketStatus || '')" type="danger" plain @click="doClose">关闭工单</el-button>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Expand, Fold, Refresh, Search } from '@element-plus/icons-vue'
import AttachmentUpload from '@/components/AttachmentUpload.vue'
import InspectionRecordGallery from '@/components/InspectionRecordGallery.vue'
import { closeTicket, getBusinessTimeline, getRecord, getTicket, listAttachments, listRepairProcesses, listTickets, listUsers, updateTicket, type Attachment, type BusinessLog, type InspectionRecord, type RepairProcess, type Ticket } from '@/api/system'
import { formatTime, logActionMap, priorityMap, repairResultMap, ticketStatusMap } from '@/utils/format'
import { useAuthStore } from '@/stores/auth'
import { applyTableSort, type TableSortChange } from '@/utils/tableSort'

const route = useRoute()
const auth = useAuthStore()
const canAssignTicket = computed(() => auth.isAdmin)
const canCloseTicket = computed(() => auth.isAdmin)
const COLUMN_PAGE_SIZE = 20
/** 与后端超时判定保持一致：未设置期望完成时间的工单按创建时间加 3 天。 */
const OVERDUE_FALLBACK_DAYS = 3
const STATUS_CODES = ['0', '1', '2', '3', '4']
const columns = [
  { status: '0', title: '待派发' },
  { status: '1', title: '待维修' },
  { status: '2', title: '维修中' },
  { status: '3', title: '已完成' },
  { status: '4', title: '已关闭' }
]
const buildStatusMap = (value: any) => STATUS_CODES.reduce((acc: Record<string, any>, code) => { acc[code] = value; return acc }, {} as Record<string, any>)

/** 各状态的展示色板：列表标签、左侧色条、筛选胶囊共用，与看板分栏一一对应。 */
const STATUS_META: Record<string, { color: string; bg: string; border: string; bar: string }> = {
  '0': { color: '#b45309', bg: '#fef3c7', border: '#fcd34d', bar: '#f59e0b' },
  '1': { color: '#0f766e', bg: '#ccfbf1', border: '#5eead4', bar: '#14b8a6' },
  '2': { color: '#1d4ed8', bg: '#dbeafe', border: '#93c5fd', bar: '#3b82f6' },
  '3': { color: '#15803d', bg: '#dcfce7', border: '#86efac', bar: '#22c55e' },
  '4': { color: '#475569', bg: '#e2e8f0', border: '#cbd5e1', bar: '#cbd5e1' }
}
const ALL_TAB_META = { color: '#0f766e', bg: '#e8f1f0', border: '#b8d5d2', bar: '#0f766e' }

const viewMode = ref<'board' | 'list'>('board')
/** 看板卡片密度：数据多时切到「紧凑」一屏能看更多，偏好记在本地。 */
const DENSITY_KEY = 'tyd.board.density'
const density = ref<'compact' | 'cozy'>(localStorage.getItem(DENSITY_KEY) === 'cozy' ? 'cozy' : 'compact')
watch(density, value => localStorage.setItem(DENSITY_KEY, value))
const boardLoading = ref(false)
const listLoading = ref(false)
const columnRows = ref<Record<string, Ticket[]>>(buildStatusMap([]))
const columnTotals = ref<Record<string, number>>(buildStatusMap(0))
const columnPages = ref<Record<string, number>>(buildStatusMap(0))
const columnLoading = ref<Record<string, boolean>>(buildStatusMap(false))
const listRows = ref<Ticket[]>([])
const listTotal = ref(0)
const listQuery = reactive({ pageNum: 1, pageSize: 20, orderByColumn: undefined as string | undefined, isAsc: undefined as string | undefined })
/** 列表视图当前选中的状态筛选，空串表示全部。 */
const listStatus = ref('')
const filters = reactive({
  keyword: '',
  quickFilter: '',
  priority: '',
  assigneeId: undefined as number | undefined,
  dateRange: null as [string, string] | null,
  overdueOnly: false
})
const repairers = ref<Record<string, any>[]>([])
const processes = ref<RepairProcess[]>([])
const logs = ref<BusinessLog[]>([])
const attachments = ref<Attachment[]>([])
const sourceRecords = ref<InspectionRecord[]>([])
const dispatchVisible = ref(false)
const detailVisible = ref(false)
const dispatchAssignee = ref<number>()
const current = ref<Ticket>()
const latestResult = computed(() => processes.value.length ? (processes.value[processes.value.length - 1].repairResult || '') : '')
const processTypeMap: Record<string, string> = {
  START: '开工记录',
  SAFETY_CHECK: '安全确认',
  WORK_NOTE: '作业记录',
  FINISH: '完工记录',
  FINAL_DISPOSITION: '最终处置'
}
function processTypeText(item: RepairProcess) {
  return processTypeMap[item.recordType || ''] || repairResultMap[item.repairResult || ''] || '处理中'
}
const totalCount = computed(() => viewMode.value === 'list'
  ? listTotal.value
  : STATUS_CODES.reduce((sum, code) => sum + (columnTotals.value[code] || 0), 0))

/** 列表视图的状态胶囊：把看板列头的「列名 + 数量」搬进列表，点一下即按状态过滤。 */
const statusTabs = computed(() => {
  const tabs = [{
    value: '',
    label: '全部',
    count: STATUS_CODES.reduce((sum, code) => sum + (columnTotals.value[code] || 0), 0),
    meta: ALL_TAB_META
  }]
  columns.forEach(column => tabs.push({
    value: column.status,
    label: column.title,
    count: columnTotals.value[column.status] || 0,
    meta: STATUS_META[column.status]
  }))
  return tabs
})

/**
 * 看板列只有两种形态：
 *   open —— 正常展示卡片，列内滚动；
 *   rail —— 收成 58px 竖排窄条，空列和历史堆积过多的列都走这里；
 * 收起的列把宽度让给有内容的列，同时所有列高度一致，
 * 所以不管数据怎么分布，版面都不会一列长一列短。
 */
type ColumnMode = 'open' | 'rail'
const COLUMN_FOLD_THRESHOLD = 8
/** 用户手动点过的列形态；没点过的走默认规则。 */
const columnOverride = ref<Record<string, ColumnMode>>({})
const columnMode = computed(() => {
  const modes: Record<string, ColumnMode> = {}
  columns.forEach(column => {
    const override = columnOverride.value[column.status]
    if (override) { modes[column.status] = override; return }
    const total = columnTotals.value[column.status] || 0
    const autoRail = total === 0 || (['3', '4'].includes(column.status) && total >= COLUMN_FOLD_THRESHOLD)
    modes[column.status] = autoRail ? 'rail' : 'open'
  })
  return modes
})

/** 点一下在「展开」和「收成窄条」之间来回切，两种形态都会记下来。 */
function toggleColumn(status: string) {
  const next: ColumnMode = columnMode.value[status] === 'open' ? 'rail' : 'open'
  columnOverride.value = { ...columnOverride.value, [status]: next }
}

/** 窄条的悬浮提示：说明这一列是什么、有多少张、点一下会怎样。 */
function railTitle(column: { status: string; title: string }) {
  return column.title + ' · 共 ' + (columnTotals.value[column.status] || 0) + ' 张，点击展开'
}

/** 列脚的「列表查看」：直接切到列表视图并带上该状态筛选，翻明细不用再自己找。 */
function gotoList(status: string) {
  listStatus.value = status
  listQuery.pageNum = 1
  viewMode.value = 'list'
}

function statusPillStyle(status?: string) {
  const meta = STATUS_META[status || ''] || STATUS_META['4']
  return { color: meta.color, background: meta.bg, borderColor: meta.border }
}

/** 行左侧色条用的语义色调：把业务状态码映射到 pending/waiting/doing/done/closed。 */
const TICKET_TONE: Record<string, string> = { '0': 'pending', '1': 'waiting', '2': 'doing', '3': 'done', '4': 'closed' }

/** 行左侧色条，扫视时状态连成一条线；Element 的 row-class-name 只能拿到行号，这里按状态挂类名。 */
function rowClassName({ row }: { row: Ticket }) {
  return 'row-tone-' + (TICKET_TONE[row.ticketStatus || ''] || 'closed')
}

function switchListStatus(value: string) {
  listStatus.value = value
  listQuery.pageNum = 1
  loadList()
}

/** “只看超时”和“已超时”快捷筛选保持同步，避免出现两个相互矛盾的条件。 */
function handleQuickFilterChange(value: string) {
  filters.overdueOnly = value === 'overdue'
  refreshAll()
}

function handleOverdueChange(value: boolean) {
  if (value) {
    filters.quickFilter = 'overdue'
  } else if (filters.quickFilter === 'overdue') {
    filters.quickFilter = ''
  }
  refreshAll()
}

function isImage(fileType?: string) { return Boolean(fileType && fileType.startsWith('image/')) }

/** 组装后端查询条件：日期与超时开关走 RuoYi 的 params 约定。 */
function buildFilterParams() {
  const params: Record<string, unknown> = {}
  const keyword = filters.keyword.trim()
  if (keyword) params.keyword = keyword
  if (filters.priority) params.priority = filters.priority
  if (filters.assigneeId) params.assigneeId = filters.assigneeId
  if (filters.quickFilter) params['params[quickFilter]'] = filters.quickFilter
  if (filters.overdueOnly) params['params[overdue]'] = '1'
  if (filters.dateRange && filters.dateRange.length === 2) {
    params['params[beginCreateTime]'] = filters.dateRange[0] + ' 00:00:00'
    params['params[endCreateTime]'] = filters.dateRange[1] + ' 23:59:59'
  }
  return params
}

function deadlineMoment(item: Ticket) {
  if (item.deadline) return dayjs(item.deadline)
  if (item.createTime) return dayjs(item.createTime).add(OVERDUE_FALLBACK_DAYS, 'day')
  return null
}
function isOverdue(item: Ticket) {
  if (!item.ticketStatus || ['3', '4'].includes(item.ticketStatus)) return false
  const due = deadlineMoment(item)
  return Boolean(due && due.isBefore(dayjs()))
}
function humanDuration(minutes: number) {
  if (minutes < 60) return Math.max(1, minutes) + ' 分钟'
  if (minutes < 60 * 24) return Math.floor(minutes / 60) + ' 小时'
  const days = Math.floor(minutes / (60 * 24))
  const hours = Math.floor((minutes % (60 * 24)) / 60)
  return hours ? days + ' 天 ' + hours + ' 小时' : days + ' 天'
}
function deadlineText(item: Ticket) {
  if (item.ticketStatus === '3') return item.completeTime ? '完成于 ' + formatTime(item.completeTime) : '已完成'
  if (item.ticketStatus === '4') return '已关闭'
  const due = deadlineMoment(item)
  if (!due) return '未设置时限'
  const diff = due.diff(dayjs(), 'minute')
  return diff < 0 ? '已超时 ' + humanDuration(-diff) : '剩余 ' + humanDuration(diff)
}

/** 卡片副标题里的日期只保留月日，完整时间放在 tooltip。 */
function shortDate(value?: string) { return value ? dayjs(value).format('MM-DD') : '' }

/** 卡片悬浮提示：把编号、设施、时限和位置拼成一行，避免卡面堆砌信息。 */
function cardTitle(item: Ticket) {
  return [item.ticketNo, item.facilityName, item.facilityLocation ? '位置：' + item.facilityLocation : '', deadlineText(item)]
    .filter(Boolean).join('｜')
}

/** 看板角标的短时长：超过一天只保留「天」，不再带小时，减少重复的视觉噪音。 */
function humanSpan(minutes: number) {
  if (minutes < 60) return Math.max(1, minutes) + '分'
  if (minutes < 60 * 24) return Math.floor(minutes / 60) + '时'
  return Math.floor(minutes / (60 * 24)) + '天'
}

/**
 * 时限角标：只有近期（3 天内）超时才用红色，历史超时降级为琥珀色，
 * 这样运行很久的库里不会满屏刺眼的红字。
 */
function deadlineBadge(item: Ticket) {
  if (['3', '4'].includes(item.ticketStatus || '')) return { text: '', tone: 'muted' }
  const due = deadlineMoment(item)
  if (!due) return { text: '', tone: 'muted' }
  const diff = due.diff(dayjs(), 'minute')
  if (diff < 0) return { text: '超时 ' + humanSpan(-diff), tone: -diff <= 60 * 24 * 3 ? 'danger' : 'warn' }
  return { text: '剩 ' + humanSpan(diff), tone: diff <= 60 * 24 ? 'danger' : diff <= 60 * 24 * 3 ? 'warn' : 'safe' }
}

/** 卡片右下角：已完成 / 已关闭展示收口时间，其余状态交给时限角标。 */
function footTail(item: Ticket) {
  if (item.ticketStatus === '3') return item.completeTime ? '完成 ' + shortDate(item.completeTime) : ''
  if (item.ticketStatus === '4') return item.updateTime ? '关闭 ' + shortDate(item.updateTime) : ''
  return ''
}

async function loadColumn(status: string, page: number) {
  columnLoading.value[status] = true
  try {
    const result: any = await listTickets({ ...buildFilterParams(), ticketStatus: status, pageNum: page, pageSize: COLUMN_PAGE_SIZE })
    const items: Ticket[] = result.rows || []
    columnRows.value[status] = page <= 1 ? items : [...columnRows.value[status], ...items]
    columnPages.value[status] = page
    if (typeof result.total === 'number') columnTotals.value[status] = result.total
  } finally {
    columnLoading.value[status] = false
  }
}
async function loadBoard() {
  boardLoading.value = true
  try {
    const result: any = await listTickets({ ...buildFilterParams(), pageNum: 1, pageSize: 10000 })
    const allRows: Ticket[] = result.rows || []
    columns.forEach(column => {
      const items = allRows.filter(item => item.ticketStatus === column.status)
      columnTotals.value[column.status] = items.length
      columnRows.value[column.status] = items.slice(0, COLUMN_PAGE_SIZE)
      columnPages.value[column.status] = items.length ? 1 : 0
    })
  } finally {
    boardLoading.value = false
  }
}
async function loadList() {
  listLoading.value = true
  try {
    const params: Record<string, unknown> = { ...buildFilterParams(), ...listQuery }
    if (listStatus.value) params.ticketStatus = listStatus.value
    const result: any = await listTickets(params)
    listRows.value = result.rows || []
    listTotal.value = result.total || 0
  } finally {
    listLoading.value = false
  }
}

/** 状态计数与当前选中的状态无关，切换胶囊时不重复请求，只跟其它筛选条件联动。 */
async function loadListCounts() {
  const result: any = await listTickets({ ...buildFilterParams(), pageNum: 1, pageSize: 10000 })
  const allRows: Ticket[] = result.rows || []
  columns.forEach(column => {
    columnTotals.value[column.status] = allRows.filter(item => item.ticketStatus === column.status).length
  })
}
function loadMore(status: string) { loadColumn(status, (columnPages.value[status] || 0) + 1) }
function handlePageChange(page: number) { listQuery.pageNum = page; loadList() }
function handleSizeChange(size: number) { listQuery.pageSize = size; listQuery.pageNum = 1; loadList() }
function handleSortChange(change: TableSortChange) {
  applyTableSort(listQuery, change)
  listQuery.pageNum = 1
  loadList()
}
async function refreshAll() {
  if (viewMode.value === 'list') await Promise.all([loadList(), loadListCounts()])
  else await loadBoard()
}
async function resetFilters() {
  filters.keyword = ''
  filters.quickFilter = ''
  filters.priority = ''
  filters.assigneeId = undefined
  filters.dateRange = null
  filters.overdueOnly = false
  listStatus.value = ''
  listQuery.pageNum = 1
  await refreshAll()
}
async function loadRepairers() {
  if (!canAssignTicket.value) {
    repairers.value = []
    return
  }
  const result: any = await listUsers({ pageNum: 1, pageSize: 200, status: '0' })
  repairers.value = result.rows || []
}
function openDispatch(item: Ticket) {
  if (!canAssignTicket.value) {
    ElMessage.warning('当前账号无权派发工单')
    return
  }
  current.value = item
  dispatchAssignee.value = undefined
  dispatchVisible.value = true
}
async function submitDispatch() {
  if (!dispatchAssignee.value) { ElMessage.warning('请选择维修人员'); return }
  await updateTicket({
    ...current.value!,
    assigneeId: dispatchAssignee.value,
    ticketStatus: '1'
  })
  ElMessage.success('工单已派发')
  dispatchVisible.value = false
  refreshAll()
}
async function openDetail(item: Ticket) {
  const ticketId = item.ticketId!
  const [detail, processResult, logResult, attachmentResult] = await Promise.all([
    getTicket(ticketId),
    listRepairProcesses({ ticketId, pageNum: 1, pageSize: 50 }),
    getBusinessTimeline('ticket', ticketId),
    listAttachments('repair_ticket', ticketId)
  ]) as any[]
  current.value = detail.data || item
  processes.value = processResult.rows || []
  logs.value = logResult.data || []
  attachments.value = attachmentResult.data || []
  await loadSourceRecord(current.value.recordId)
  detailVisible.value = true
}
/** 加载工单来源巡检记录，用于管理员核对巡检上报是否属实。 */
async function loadSourceRecord(recordId?: number) {
  sourceRecords.value = []
  if (!recordId) return
  try {
    const result: any = await getRecord(recordId)
    if (result.data?.recordId) sourceRecords.value = [result.data]
  } catch {
    sourceRecords.value = []
  }
}
/** 消息中心跳转过来时定位工单：优先用看板已加载数据，其次单独拉取详情。 */
function findLoadedTicket(ticketId: number) {
  for (const code of STATUS_CODES) {
    const hit = (columnRows.value[code] || []).find(item => item.ticketId === ticketId)
    if (hit) return hit
  }
  return listRows.value.find(item => item.ticketId === ticketId)
}
async function openFromQuery() {
  const raw = route.query.ticketId
  const ticketId = Number(Array.isArray(raw) ? raw[0] : raw)
  if (!ticketId) return false
  await loadBoard()
  const action = route.query.action
  const target = findLoadedTicket(ticketId)
  if (target) {
    await openDetail(target)
    return true
  }
  try {
    const result: any = await getTicket(ticketId)
    if (!result.data) {
      ElMessage.warning('关联工单不存在或已删除')
    } else {
      await openDetail(result.data)
    }
  } catch {
    ElMessage.warning('关联工单不存在或无权查看')
  }
  return true
}

function timelineType(status?: string) {
  if (status === '3') return 'success'
  if (status === '4') return 'info'
  if (status === '0') return 'warning'
  return 'primary'
}
async function reloadAttachments() {
  if (!current.value?.ticketId) return
  const result: any = await listAttachments('repair_ticket', current.value.ticketId)
  attachments.value = result.data || []
}

async function doClose() {
  const presetReason = current.value?.recordId ? '巡检误报，现场核实设施正常' : ''
  const result = await ElMessageBox.prompt('关闭后工单将不能继续维修，请填写关闭原因。', '关闭工单', {
    inputPlaceholder: presetReason || '请输入关闭原因',
    inputValue: presetReason,
    inputValidator: value => Boolean(value && value.trim()) || '关闭原因不能为空',
    type: 'warning'
  })
  await closeTicket(current.value!.ticketId!, result.value.trim())
  ElMessage.success('工单已关闭')
  detailVisible.value = false
  refreshAll()
}

watch(viewMode, mode => { if (mode === 'list') { loadList(); loadListCounts() } else loadBoard() })
onMounted(async () => {
  await loadRepairers()
  const opened = await openFromQuery()
  if (!opened) await loadBoard()
})
</script>

<style scoped>
.heading-actions { display: flex; align-items: center; gap: 10px; }
.board-panel { overflow: hidden; }
.board-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 14px 18px; border-bottom: 1px solid #edf2f7; }
.toolbar-search { width: 230px; }
.toolbar-select { width: 150px; }
.toolbar-date { width: 250px; }
.board-count { margin-left: auto; color: var(--ops-muted); font-size: 12px; }
/** 看板：五列等宽等高，总高度锁在视口内；空列收成窄条，历史列可折叠，数据多少都不影响版面形状。 */
.board { display: flex; align-items: stretch; gap: 12px; padding: 14px; overflow-x: auto; }
.board-column { --board-height: clamp(360px, calc(100vh - 300px), 940px); display: flex; flex-direction: column; flex: 1 1 216px; min-width: 216px; height: var(--board-height); border-radius: 14px; background: #f8fafc; border: 1px solid #e8eef3; overflow: hidden; }
/** rail：无数据时收成 58px 竖条，点一下可以展开看空态。 */
.board-column.mode-rail { flex: 0 0 58px; min-width: 58px; background: #fff; cursor: pointer; transition: background .16s; }
.board-column.mode-rail:hover { background: #f1f7f6; }
.rail-inner { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 14px 0; }
.rail-title { writing-mode: vertical-rl; letter-spacing: 3px; font-size: 12px; font-weight: 700; color: #64748b; }
.rail-hint { margin-top: auto; display: grid; place-items: center; font-size: 13px; color: #cbd5e1; }
.board-column.mode-rail:hover .rail-hint { color: var(--ops-primary); }
.rail-count { min-width: 22px; height: 22px; padding: 0 6px; display: grid; place-items: center; border-radius: 999px; color: var(--col-text); background: var(--col-bg); font-size: 12px; font-weight: 700; }
.column-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 10px 10px 12px; border-bottom: 1px solid #e8eef3; background: #fff; }
.column-title { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 700; }
.column-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--col-color); box-shadow: 0 0 0 3px var(--col-bg); }
.column-tools { display: inline-flex; align-items: center; gap: 4px; }
.column-count { min-width: 24px; height: 22px; padding: 0 7px; display: grid; place-items: center; border-radius: 999px; color: var(--col-text); background: var(--col-bg); font-size: 12px; font-weight: 700; }
.column-toggle { display: grid; place-items: center; width: 22px; height: 22px; padding: 0; border: 0; border-radius: 7px; background: transparent; color: #b0bcc9; cursor: pointer; }
.column-toggle:hover { background: #f1f5f9; color: #64748b; }
.column-body { flex: 1; overflow-y: auto; padding: 10px; }
.column-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 12px; border-top: 1px solid #e8eef3; background: #fff; color: #a8b4c2; font-size: 11px; }
.foot-link { padding: 0; border: 0; background: transparent; color: var(--ops-primary); font-size: 11px; cursor: pointer; }
.foot-link:hover { text-decoration: underline; }
/** 卡片：左侧色条 + 四行信息（编号/设施/描述/底部元信息），把原来 6 行的卡面压到大约一半高度。 */
.ticket-card { position: relative; padding: 9px 11px 9px 13px; margin-bottom: 8px; border-radius: 10px; background: #fff; border: 1px solid #e8eef3; box-shadow: 0 1px 2px rgba(15,23,42,.04); cursor: pointer; transition: transform .16s, box-shadow .16s, border-color .16s; }
.ticket-card::before { content: ''; position: absolute; left: 0; top: 8px; bottom: 8px; width: 3px; border-radius: 0 3px 3px 0; background: var(--tone-color, #cbd5e1); }
.ticket-card.tone-pending { --tone-color: #f59e0b; }
.ticket-card.tone-waiting { --tone-color: #14b8a6; }
.ticket-card.tone-doing { --tone-color: #3b82f6; }
.ticket-card.tone-done { --tone-color: #22c55e; }
.ticket-card.tone-closed { --tone-color: #cbd5e1; }
.ticket-card:hover { transform: translateY(-1px); border-color: #cbd5e1; box-shadow: 0 8px 18px rgba(15,23,42,.09); }
/** 超时不再用大红描边，改成极浅的暖色底，只提示不抢眼。 */
.ticket-card.is-overdue { border-color: #f6e3c8; background: linear-gradient(180deg, #fffdf7, #fff 60%); }
.ticket-top { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.ticket-no { flex: 1; min-width: 0; color: #0f766e; font-family: "Cascadia Code", Consolas, monospace; font-size: 11.5px; letter-spacing: .2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ticket-card .priority-chip { flex: none; }
.priority-chip { padding: 0 6px; height: 18px; line-height: 18px; border-radius: 5px; font-size: 11px; font-style: normal; background: #eef2f6; color: #64748b; }
.priority-chip.level-1 { background: #fee2e2; color: #b91c1c; }
.time-chip { padding: 0 5px; height: 17px; line-height: 17px; border-radius: 5px; font-size: 11px; font-style: normal; white-space: nowrap; }
.time-chip.tone-danger { background: #fee2e2; color: #b91c1c; }
.time-chip.tone-warn { background: #fef3c7; color: #b45309; }
.time-chip.tone-safe { background: #dcfce7; color: #15803d; }
.time-chip.tone-muted { background: #f1f5f9; color: #64748b; }
.ticket-facility { margin: 6px 0 0; font-size: 13px; font-weight: 600; color: #1f2d3d; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ticket-issue { margin: 4px 0 0; color: #94a3b8; font-size: 11.5px; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; word-break: break-all; }
.density-compact .ticket-issue { -webkit-line-clamp: 1; }
.ticket-foot { display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-top: 7px; }
.foot-meta { display: inline-flex; align-items: center; gap: 4px; min-width: 0; overflow: hidden; color: #a8b4c2; font-size: 11px; }
.foot-assignee { flex: none; max-width: 62px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #64748b; }
.foot-assignee.is-empty { color: #c3ccd8; }
.foot-sep, .foot-time, .foot-tail { flex: none; }
.foot-tail { color: #94a3b8; font-size: 11px; }
.foot-action { flex: none; height: 22px; padding: 0 8px; font-size: 11px; }
.density-cozy .ticket-card { padding: 12px 13px; }
.density-cozy .ticket-issue { margin-top: 5px; font-size: 12px; }
.density-cozy .ticket-foot { margin-top: 9px; }
.density-switch { margin-left: 2px; }
.load-more { width: 100%; margin-top: 2px; color: var(--ops-muted); font-size: 12px; }

.list-footer { display: flex; justify-content: flex-end; padding: 14px 18px; }
.dispatch-tip { color: var(--ops-muted); font-size: 12px; line-height: 1.7; }
.dispatch-risk { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; color: #475569; font-size: 13px; }
.drawer-section { margin-top: 22px; }
.drawer-section h4 { margin: 0 0 14px; font-size: 14px; color: var(--ops-primary); }
.section-count { margin-left: 8px; color: var(--ops-muted); font-size: 12px; font-weight: 400; }
.drawer-section :deep(.el-timeline) { padding-left: 4px; }
.inline-tag { margin-left: 8px; }
.log-status { margin-left: 10px; color: var(--ops-muted); font-size: 12px; }
.process-desc { margin: 6px 0 0; color: var(--ops-muted); font-size: 12px; line-height: 1.7; }
.attachment-list { display: flex; flex-direction: column; gap: 8px; }
.attachment-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--ops-border); color: var(--ops-primary); text-decoration: none; font-size: 13px; }
.attachment-item:hover { background: #f8fafc; }
.resource-toolbar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.resource-table { width: 100%; }
.resource-name { font-weight: 600; color: #1f2d3d; }
.resource-meta { margin-top: 2px; color: var(--ops-muted); font-size: 11px; }
.critical-tag { margin-left: 4px; }
.resource-summary-block, .resource-event-block { margin-top: 18px; }
.resource-summary-block h5, .resource-event-block h5 { margin: 0 0 10px; font-size: 13px; color: #475569; }
.outstanding-cell .is-outstanding { color: #b91c1c; font-weight: 700; }
.drawer-actions { display: flex; justify-content: flex-end; margin-top: 18px; }
@media (max-width: 720px) {
  .toolbar-search, .toolbar-select, .toolbar-date { width: 100%; }
  .board-count { margin-left: 0; }
  .board-column { --board-height: 440px; }
}
</style>
