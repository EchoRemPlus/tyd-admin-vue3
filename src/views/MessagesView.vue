<template>
  <div class="page-shell">
    <div class="page-heading">
      <div><h1 class="page-title">消息中心</h1><p class="page-subtitle">「未读 / 已读」表示接收人的阅读状态；只有发给当前账号的消息才能标记已读。</p></div>
      <el-button :icon="Refresh" @click="reload">刷新</el-button>
    </div>
    <section class="panel">
      <div class="panel-body toolbar">
        <el-radio-group v-if="auth.isAdmin" v-model="query.scope" @change="reload">
          <el-radio-button value="all">全部消息</el-radio-button>
          <el-radio-button value="inbox">发给我的</el-radio-button>
          <el-radio-button value="outbox">我发出的</el-radio-button>
        </el-radio-group>
        <el-input v-model="query.keyword" placeholder="标题 / 内容 / 发送人 / 接收人" clearable style="width: 280px" @keyup.enter="reload" />
        <el-select v-model="query.isRead" placeholder="阅读状态" clearable style="width: 140px"><el-option label="未读" value="0" /><el-option label="已读" value="1" /></el-select>
        <el-button type="primary" @click="reload">查询</el-button>
        <span class="unread-hint">我的未读 <b>{{ myUnread }}</b> 条<span v-if="auth.isAdmin" class="site-unread"> · 全站未读 {{ siteUnread }} 条</span></span>
      </div>
      <el-table v-loading="loading" :data="rows" stripe @row-click="openMessage" @sort-change="handleSortChange">
        <el-table-column prop="isRead" label="状态" width="100" sortable="custom">
          <template #default="{ row }">
            <el-tag v-if="isMine(row)" :type="row.isRead === '0' ? 'danger' : 'info'" effect="plain" round>{{ row.isRead === '0' ? '未读' : '已读' }}</el-tag>
            <span v-else class="peer-state" title="该消息不是发给当前账号的，此处显示接收人的阅读状态">{{ row.isRead === '0' ? '对方未读' : '对方已读' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="180" sortable="custom" />
        <el-table-column prop="content" label="内容" min-width="300" show-overflow-tooltip />
        <el-table-column label="发送人" width="110"><template #default="{ row }">{{ senderName(row) }}</template></el-table-column>
        <el-table-column label="接收人" width="110"><template #default="{ row }">{{ receiverName(row) }}</template></el-table-column>
        <el-table-column prop="m.createTime" label="时间" width="160" sortable="custom"><template #default="{ row }">{{ formatTime(row.createTime) }}</template></el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button v-if="canMarkRead(row)" link type="primary" @click.stop="markRead(row)">标记已读</el-button>
            <el-button v-if="hasBusiness(row)" link type="primary" @click.stop="goBusiness(row)">{{ businessLabel(row) }}</el-button>
            <el-button link type="primary" @click.stop="openMessage(row)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>
      <PaginationBar v-model:page="query.pageNum" v-model:page-size="query.pageSize" :total="total" @change="loadData" />
    </section>

    <el-dialog v-model="detailVisible" :title="current?.title || '消息详情'" width="560px">
      <p class="message-meta">发送人：{{ senderName(current) }}　接收人：{{ receiverName(current) }}　{{ formatTime(current?.createTime) }}</p>
      <p class="message-body">{{ current?.content || '无内容' }}</p>
      <template #footer>
        <el-button v-if="hasBusiness(current)" type="primary" @click="goBusiness(current!)">{{ businessLabel(current) }}</el-button>
        <el-button v-if="canMarkRead(current)" type="primary" @click="markRead(current!)">标记已读</el-button>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import PaginationBar from '@/components/PaginationBar.vue'
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { listMessages, markMessageRead, type MessageInfo } from '@/api/system'
import { formatTime } from '@/utils/format'
import { useAuthStore } from '@/stores/auth'
import { useMenuStore } from '@/stores/menu'
import { applyTableSort, type TableSortChange } from '@/utils/tableSort'

const auth = useAuthStore()
const menuStore = useMenuStore()
const router = useRouter()

const loading = ref(false)
const rows = ref<MessageInfo[]>([])
const total = ref(0)
const current = ref<MessageInfo>()
const detailVisible = ref(false)
const query = reactive({ keyword: '', isRead: '', scope: 'all', pageNum: 1, pageSize: 10, orderByColumn: undefined as string | undefined, isAsc: undefined as string | undefined })
const myUnread = ref(0)
const siteUnread = ref(0)

/** 管理员默认看全站消息，但「未读」角标只统计发给当前账号的消息，避免把别人未读、自己发出的消息算进来。 */
function buildQuery() {
  const params: Record<string, unknown> = {
    keyword: query.keyword,
    isRead: query.isRead,
    pageNum: query.pageNum,
    pageSize: query.pageSize,
    orderByColumn: query.orderByColumn,
    isAsc: query.isAsc
  }
  if (query.scope === 'inbox') params.receiverId = auth.user?.userId
  else if (query.scope === 'outbox') params.senderId = auth.user?.userId
  return params
}

function reload() {
  query.pageNum = 1
  loadData()
}

function handleSortChange(change: TableSortChange) {
  applyTableSort(query, change)
  query.pageNum = 1
  loadData()
}

async function loadData() {
  loading.value = true
  try {
    const requests: Promise<any>[] = [
      listMessages(buildQuery()),
      listMessages({ receiverId: auth.user?.userId, isRead: '0', pageNum: 1, pageSize: 1 })
    ]
    if (auth.isAdmin) requests.push(listMessages({ isRead: '0', pageNum: 1, pageSize: 1 }))
    const [result, mine, site]: any[] = await Promise.all(requests)
    rows.value = result.rows || []
    total.value = result.total || 0
    myUnread.value = mine?.total || 0
    siteUnread.value = site ? (site.total || 0) : myUnread.value
  } finally { loading.value = false }
}
function isMine(row?: MessageInfo) {
  return !!row && row.receiverId === auth.user?.userId
}

function canMarkRead(row?: MessageInfo) {
  return !!row && row.isRead === '0' && isMine(row)
}

function senderName(row?: MessageInfo) {
  return row?.senderName || row?.createByName || '系统'
}

function receiverName(row?: MessageInfo) {
  if (isMine(row)) return '我'
  return row?.receiverName || (row?.receiverId ? '用户#' + row.receiverId : '-')
}

function hasBusiness(row?: MessageInfo) {
  return !!targetPath(row)
}

/** 消息关联业务对应的控制台页面；当前角色没有该页面权限时返回空串，避免跳转后落到 403。 */
function targetPath(row?: MessageInfo) {
  if (!row || !row.businessType || !row.businessId) return ''
  if (row.businessType === 'repair_ticket') return menuStore.hasPath('/tickets') ? '/tickets' : ''
  if (row.businessType === 'inspection_task') return menuStore.hasPath('/tasks') ? '/tasks' : ''
  return ''
}

function businessLabel(row?: MessageInfo) {
  if (!row) return '查看关联业务'
  if (row.businessType === 'repair_ticket') return '查看工单'
  if (row.businessType === 'inspection_task') return '查看任务'
  return '查看关联业务'
}

async function goBusiness(row: MessageInfo) {
  const path = targetPath(row)
  if (!path) {
    if (row?.businessType && row?.businessId) {
      ElMessage.info('当前账号无权访问该业务页面')
      return
    }
    ElMessage.info('该消息没有可跳转的关联业务')
    return
  }
  if (path === '/tickets') {
    await router.push({
      path,
      query: {
        ticketId: String(row.businessId),
        action: 'detail'
      }
    })
  } else {
    await router.push({ path, query: { taskId: String(row.businessId) } })
  }
  detailVisible.value = false
}

function openMessage(row: MessageInfo) { current.value = row; detailVisible.value = true }
async function markRead(row: MessageInfo) {
  if (!canMarkRead(row)) {
    ElMessage.warning('只能标记发给当前账号的消息')
    return
  }
  if (!row.messageId) return
  await markMessageRead(row.messageId)
  row.isRead = '1'
  ElMessage.success('已标记为已读')
  if (detailVisible.value) current.value = { ...row, isRead: '1' }
  loadData()
}
onMounted(loadData)
</script>

<style scoped>
.pager { display: flex; justify-content: flex-end; padding: 16px 18px; }
.unread-hint { margin-left: auto; color: #ef4444; font-size: 12px; }
.unread-hint b { font-weight: 700; }
.site-unread { color: var(--ops-muted); }
.peer-state { color: var(--ops-muted); font-size: 12px; }
.read-only-hint { margin-right: 8px; color: var(--ops-muted); font-size: 12px; }
.message-meta { margin: 0 0 14px; color: var(--ops-muted); font-size: 12px; }
.message-body { margin: 0; line-height: 1.9; white-space: pre-wrap; }
</style>
