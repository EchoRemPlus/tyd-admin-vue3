<template>
  <div class="page-shell">
    <div class="page-heading">
      <div><h1 class="page-title">业务审计</h1><p class="page-subtitle">跟踪任务、工单和设施的状态变化，查看操作人、前后状态与原因。</p></div>
      <el-button :icon="Refresh" @click="loadList">刷新</el-button>
    </div>
    <section class="panel">
      <div class="panel-body toolbar">
        <el-select v-model="query.businessType" placeholder="业务类型" clearable style="width: 170px">
          <el-option v-for="(label, value) in businessTypeMap" :key="value" :label="label" :value="value" />
        </el-select>
        <el-select v-model="query.action" placeholder="业务动作" clearable filterable style="width: 190px">
          <el-option v-for="(label, value) in logActionMap" :key="value" :label="label" :value="value" />
        </el-select>
        <el-input v-model="query.keyword" placeholder="业务编号 / 原因 / 操作人" clearable style="width: 260px" @keyup.enter="reload" />
        <el-date-picker
          v-model="dateRange"
          type="datetimerange"
          range-separator="至"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          value-format="YYYY-MM-DD HH:mm:ss"
          style="width: 360px"
        />
        <el-button type="primary" @click="reload">查询</el-button>
        <el-button @click="resetQuery">重置</el-button>
      </div>
      <el-table v-loading="loading" :data="rows" stripe @sort-change="handleSortChange">
        <el-table-column prop="l.createTime" label="时间" width="170" sortable="custom"><template #default="{ row }">{{ formatTime(row.createTime) }}</template></el-table-column>
        <el-table-column prop="l.businessType" label="业务类型" width="130" sortable="custom"><template #default="{ row }"><el-tag effect="plain" round type="info">{{ businessTypeMap[row.businessType] || row.businessType }}</el-tag></template></el-table-column>
        <el-table-column label="业务编号" min-width="150">
          <template #default="{ row }">
            <el-tooltip v-if="row.businessNo" :content="`业务主键：${row.businessId ?? '-'}`" placement="top">
              <span class="business-no">{{ row.businessNo }}</span>
            </el-tooltip>
            <span v-else class="business-no is-muted">{{ row.businessId ?? '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="l.action" label="业务动作" width="150" sortable="custom"><template #default="{ row }"><el-tag effect="light" round>{{ logActionMap[row.action] || row.action }}</el-tag></template></el-table-column>
        <el-table-column label="状态变化" min-width="190">
          <template #default="{ row }">
            <span v-if="!hasStatusChange(row)" class="status-single">{{ statusChangeText(row) }}</span>
            <template v-else>
              <span>{{ businessStatusText(row.businessType, row.fromStatus) }}</span>
              <span class="status-arrow">→</span>
              <span>{{ businessStatusText(row.businessType, row.toStatus) }}</span>
            </template>
          </template>
        </el-table-column>
        <el-table-column label="操作人" width="130">
          <template #default="{ row }">
            <el-tooltip v-if="row.operatorName" :content="'操作账号：' + row.operatorName" placement="top">
              <span>{{ operatorLabel(row) }}</span>
            </el-tooltip>
            <span v-else>系统</span>
          </template>
        </el-table-column>
        <el-table-column prop="reason" label="原因" min-width="220" show-overflow-tooltip />
      </el-table>
      <PaginationBar v-model:page="query.pageNum" v-model:page-size="query.pageSize" :total="total" @change="loadList" />
    </section>
  </div>
</template>

<script setup lang="ts">
import PaginationBar from '@/components/PaginationBar.vue'
import { onMounted, reactive, ref } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { listBusinessLogs, type BusinessLog } from '@/api/system'
import { businessStatusText, businessTypeMap, formatTime, logActionMap } from '@/utils/format'
import { applyTableSort, type TableSortChange } from '@/utils/tableSort'

const loading = ref(false)
const rows = ref<BusinessLog[]>([])
const total = ref(0)
const dateRange = ref<[string, string] | null>(null)
const query = reactive({ businessType: '', action: '', keyword: '', beginTime: '', endTime: '', pageNum: 1, pageSize: 20, orderByColumn: undefined as string | undefined, isAsc: undefined as string | undefined })

function reload() {
  query.beginTime = dateRange.value?.[0] || ''
  query.endTime = dateRange.value?.[1] || ''
  query.pageNum = 1
  loadList()
}

async function loadList() {
  loading.value = true
  try {
    const result: any = await listBusinessLogs(query)
    rows.value = result.rows || []
    total.value = result.total || 0
  } finally { loading.value = false }
}

function handleSortChange(change: TableSortChange) {
  applyTableSort(query, change)
  query.pageNum = 1
  loadList()
}

/** 操作人展示昵称；系统调度写入的 system 没有对应账号，统一显示「系统」。 */
function operatorLabel(row: BusinessLog) {
  if (row.operatorNickName) return row.operatorNickName
  if (!row.operatorName || row.operatorName === 'system') return '系统'
  return row.operatorName
}

function hasStatusChange(row: BusinessLog) {
  if (row.action === 'GENERATE') return false
  const from = row.fromStatus ?? null
  const to = row.toStatus ?? null
  return from !== null && to !== null && from !== to
}

function statusChangeText(row: BusinessLog) {
  if (row.action === 'GENERATE') return '已生成任务'
  const from = row.fromStatus ?? null
  const to = row.toStatus ?? null
  if (from === null && to === null) return '-'
  return businessStatusText(row.businessType, to ?? from)
}

function resetQuery() {
  query.businessType = ''
  query.action = ''
  query.keyword = ''
  dateRange.value = null
  query.beginTime = ''
  query.endTime = ''
  query.orderByColumn = undefined
  query.isAsc = undefined
  reload()
}

onMounted(loadList)
</script>

<style scoped>
.status-arrow { margin: 0 8px; color: var(--ops-muted); }
.status-single { color: var(--ops-text); }
.business-no { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; color: var(--ops-primary, #0f766e); }
.business-no.is-muted { color: var(--ops-muted); }
</style>
