<template>
  <div class="page-shell">
    <div class="page-heading">
      <div><h1 class="page-title">操作日志</h1><p class="page-subtitle">记录后台接口调用与业务操作，用于问题追溯和安全审计。</p></div>
      <el-button type="danger" plain :disabled="!selection.length" @click="removeSelected">删除选中</el-button>
    </div>

    <section class="panel">
      <div class="panel-body toolbar">
        <el-input v-model="query.title" placeholder="操作模块" clearable style="width: 170px" @keyup.enter="loadList" />
        <el-input v-model="query.operName" placeholder="操作人员" clearable style="width: 150px" @keyup.enter="loadList" />
        <el-select v-model="query.status" placeholder="状态" clearable style="width: 130px"><el-option label="成功" :value="0" /><el-option label="失败" :value="1" /></el-select>
        <el-button type="primary" @click="loadList">查询</el-button>
      </div>
      <el-table v-loading="loading" :data="rows" stripe @selection-change="onSelectionChange" @sort-change="handleSortChange">
        <el-table-column type="selection" width="46" />
        <el-table-column prop="operId" label="编号" width="80" sortable="custom" />
        <el-table-column prop="title" label="操作模块" min-width="130" sortable="custom" />
        <el-table-column prop="operName" label="操作人员" width="110" sortable="custom" />
        <el-table-column prop="requestMethod" label="请求方式" width="100" sortable="custom" />
        <el-table-column prop="operIp" label="操作地址" width="130" sortable="custom" />
        <el-table-column prop="operLocation" label="操作地点" min-width="120" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="90" sortable="custom"><template #default="{ row }"><el-tag :type="row.status === 0 ? 'success' : 'danger'" round>{{ row.status === 0 ? '成功' : '失败' }}</el-tag></template></el-table-column>
        <el-table-column prop="costTime" label="耗时" width="90" sortable="custom"><template #default="{ row }">{{ row.costTime != null ? row.costTime + ' ms' : '-' }}</template></el-table-column>
        <el-table-column prop="operTime" label="操作时间" width="160" sortable="custom"><template #default="{ row }">{{ formatTime(row.operTime) }}</template></el-table-column>
        <el-table-column label="操作" width="90" fixed="right"><template #default="{ row }"><el-button link type="primary" @click="openDetail(row)">详情</el-button></template></el-table-column>
      </el-table>
      <PaginationBar v-model:page="query.pageNum" v-model:page-size="query.pageSize" :total="total" @change="loadList" />
    </section>

    <el-dialog v-model="detailVisible" title="操作日志详情" width="720px">
      <el-descriptions v-if="current" :column="2" border>
        <el-descriptions-item label="操作模块">{{ current.title || '-' }}</el-descriptions-item>
        <el-descriptions-item label="操作人员">{{ current.operName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="请求方式">{{ current.requestMethod || '-' }}</el-descriptions-item>
        <el-descriptions-item label="操作状态">{{ current.status === 0 ? '成功' : '失败' }}</el-descriptions-item>
        <el-descriptions-item label="操作地址" :span="2">{{ current.operUrl || '-' }}</el-descriptions-item>
        <el-descriptions-item label="请求方法" :span="2">{{ current.method || '-' }}</el-descriptions-item>
        <el-descriptions-item label="操作地点" :span="2">{{ current.operIp }} {{ current.operLocation }}</el-descriptions-item>
        <el-descriptions-item label="操作时间" :span="2">{{ formatTime(current.operTime) }}</el-descriptions-item>
        <el-descriptions-item v-if="current.errorMsg" label="异常信息" :span="2">{{ current.errorMsg }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import PaginationBar from '@/components/PaginationBar.vue'
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { deleteOperLogs, listOperLogs, type OperLog } from '@/api/systemManage'
import { formatTime } from '@/utils/format'
import { applyTableSort, type TableSortChange } from '@/utils/tableSort'

const loading = ref(false)
const rows = ref<OperLog[]>([])
const total = ref(0)
const selection = ref<OperLog[]>([])
const detailVisible = ref(false)
const current = ref<OperLog>()
const query = reactive({ title: '', operName: '', status: undefined as number | undefined, pageNum: 1, pageSize: 10, orderByColumn: undefined as string | undefined, isAsc: undefined as string | undefined })

async function loadList() {
  loading.value = true
  try {
    const result: any = await listOperLogs(query)
    rows.value = result.rows || []
    total.value = result.total || 0
  } finally { loading.value = false }
}
function handleSortChange(change: TableSortChange) {
  applyTableSort(query, change)
  query.pageNum = 1
  loadList()
}
function onSelectionChange(value: OperLog[]) { selection.value = value }
function openDetail(row: OperLog) { current.value = row; detailVisible.value = true }
async function removeSelected() {
  await ElMessageBox.confirm(`确定删除选中的 ${selection.value.length} 条操作日志？`, '删除日志', { type: 'warning' })
  await deleteOperLogs(selection.value.map(item => item.operId!))
  ElMessage.success('操作日志已删除')
  loadList()
}
onMounted(loadList)
</script>

<style scoped>.pager { display: flex; justify-content: flex-end; padding: 16px 18px; }</style>
