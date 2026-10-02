<template>
  <div class="page-shell">
    <div class="page-heading">
      <div><h1 class="page-title">登录日志</h1><p class="page-subtitle">记录账号登录结果与来源地址，失败次数过多可解锁账号。</p></div>
      <el-button type="danger" plain :disabled="!selection.length" @click="removeSelected">删除选中</el-button>
    </div>

    <section class="panel">
      <div class="panel-body toolbar">
        <el-input v-model="query.userName" placeholder="用户名称" clearable style="width: 170px" @keyup.enter="loadList" />
        <el-input v-model="query.ipaddr" placeholder="登录地址" clearable style="width: 170px" @keyup.enter="loadList" />
        <el-select v-model="query.status" placeholder="状态" clearable style="width: 130px"><el-option label="成功" value="0" /><el-option label="失败" value="1" /></el-select>
        <el-button type="primary" @click="loadList">查询</el-button>
      </div>
      <el-table v-loading="loading" :data="rows" stripe @selection-change="onSelectionChange" @sort-change="handleSortChange">
        <el-table-column type="selection" width="46" />
        <el-table-column prop="infoId" label="编号" width="80" sortable="custom" />
        <el-table-column prop="userName" label="用户名称" width="120" sortable="custom" />
        <el-table-column prop="ipaddr" label="登录地址" width="140" sortable="custom" />
        <el-table-column prop="loginLocation" label="登录地点" min-width="130" show-overflow-tooltip />
        <el-table-column prop="browser" label="浏览器" min-width="120" show-overflow-tooltip />
        <el-table-column prop="os" label="操作系统" min-width="120" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="90" sortable="custom"><template #default="{ row }"><el-tag :type="row.status === '0' ? 'success' : 'danger'" round>{{ row.status === '0' ? '成功' : '失败' }}</el-tag></template></el-table-column>
        <el-table-column prop="msg" label="操作信息" min-width="140" show-overflow-tooltip />
        <el-table-column prop="loginTime" label="登录时间" width="160" sortable="custom"><template #default="{ row }">{{ formatTime(row.loginTime) }}</template></el-table-column>
        <el-table-column label="操作" width="100" fixed="right"><template #default="{ row }"><el-button link type="warning" @click="unlock(row)">解锁</el-button></template></el-table-column>
      </el-table>
      <PaginationBar v-model:page="query.pageNum" v-model:page-size="query.pageSize" :total="total" @change="loadList" />
    </section>
  </div>
</template>

<script setup lang="ts">
import PaginationBar from '@/components/PaginationBar.vue'
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { deleteLoginLogs, listLoginLogs, unlockAccount, type LoginLog } from '@/api/systemManage'
import { formatTime } from '@/utils/format'
import { applyTableSort, type TableSortChange } from '@/utils/tableSort'

const loading = ref(false)
const rows = ref<LoginLog[]>([])
const total = ref(0)
const selection = ref<LoginLog[]>([])
const query = reactive({ userName: '', ipaddr: '', status: '', pageNum: 1, pageSize: 10, orderByColumn: undefined as string | undefined, isAsc: undefined as string | undefined })

async function loadList() {
  loading.value = true
  try {
    const result: any = await listLoginLogs(query)
    rows.value = result.rows || []
    total.value = result.total || 0
  } finally { loading.value = false }
}
function handleSortChange(change: TableSortChange) {
  applyTableSort(query, change)
  query.pageNum = 1
  loadList()
}
function onSelectionChange(value: LoginLog[]) { selection.value = value }
async function removeSelected() {
  await ElMessageBox.confirm(`确定删除选中的 ${selection.value.length} 条登录日志？`, '删除日志', { type: 'warning' })
  await deleteLoginLogs(selection.value.map(item => item.infoId!))
  ElMessage.success('登录日志已删除')
  loadList()
}
async function unlock(row: LoginLog) {
  await ElMessageBox.confirm(`确定解锁账号「${row.userName}」？`, '解锁账号', { type: 'warning' })
  await unlockAccount(row.userName!)
  ElMessage.success('账号已解锁')
}
onMounted(loadList)
</script>

<style scoped>.pager { display: flex; justify-content: flex-end; padding: 16px 18px; }</style>
