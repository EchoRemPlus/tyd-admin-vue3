<template>
  <div class="page-shell">
    <div class="page-heading">
      <div><h1 class="page-title">设施分类</h1><p class="page-subtitle">维护设施分类编码和顺序，已被设施引用的分类不允许删除。</p></div>
      <el-button v-permission="'system:category:add'" type="primary" :icon="Plus" @click="openCreate">新增分类</el-button>
    </div>
    <section class="panel">
      <div class="panel-body toolbar">
        <el-input v-model="query.keyword" placeholder="分类编码 / 名称" clearable style="width: 220px" @keyup.enter="refreshAll" />
        <el-button type="primary" @click="refreshAll">查询</el-button>
      </div>
      <div class="status-tabs">
        <button
          v-for="tab in statusTabs"
          :key="tab.value || 'all'"
          type="button"
          class="status-tab"
          :class="{ 'is-active': query.categoryStatus === tab.value }"
          :style="{ '--tab-color': tab.meta.color, '--tab-bg': tab.meta.bg, '--tab-border': tab.meta.border }"
          @click="switchStatus(tab.value)"
        >
          <i class="tab-dot" />{{ tab.label }}<em>{{ tab.count }}</em>
        </button>
      </div>
      <el-table v-loading="loading" :data="rows" stripe :row-class-name="rowClassName" @sort-change="handleSortChange">
        <el-table-column prop="categoryCode" label="分类编码" min-width="150" sortable="custom" />
        <el-table-column prop="categoryName" label="分类名称" min-width="180" sortable="custom" />
        <el-table-column prop="orderNum" label="排序" width="90" sortable="custom" />
        <el-table-column prop="categoryStatus" label="状态" width="100" sortable="custom"><template #default="{ row }"><span class="status-pill" :style="categoryPillStyle(row.categoryStatus)"><i class="pill-dot" />{{ categoryStatusMap[row.categoryStatus || ''] || '正常' }}</span></template></el-table-column>
        <el-table-column label="操作" width="150" fixed="right"><template #default="{ row }"><el-button v-permission="'system:category:edit'" link type="primary" @click="openEdit(row)">编辑</el-button><el-button v-permission="'system:category:remove'" link type="danger" @click="remove(row)">删除</el-button></template></el-table-column>
      </el-table>
      <PaginationBar v-model:page="query.pageNum" v-model:page-size="query.pageSize" :total="total" @change="loadList" />
    </section>

    <el-dialog v-model="dialogVisible" :title="form.categoryId ? '编辑设施分类' : '新增设施分类'" width="520px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="分类编码" required><el-input v-model="form.categoryCode" :disabled="Boolean(form.categoryId)" /></el-form-item>
        <el-form-item label="分类名称" required><el-input v-model="form.categoryName" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.orderNum" :min="0" :max="9999" style="width:100%" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" @click="save">保存</el-button></template>
    </el-dialog>

    <el-dialog v-model="deleteDialogVisible" title="删除设施分类" width="480px">
      <p>确定删除分类“{{ deleteForm.categoryName }}”吗？已被设施引用的分类不能删除。</p>
      <template #footer>
        <el-button @click="deleteDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="submitDelete">确认删除</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import PaginationBar from '@/components/PaginationBar.vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { addFacilityCategory, deleteFacilityCategory, listFacilityCategories, updateFacilityCategory, type FacilityCategory } from '@/api/system'
import { ALL_TAB_META, CATEGORY_STATUS_META, rowToneClass, statusPillStyle } from '@/utils/statusMeta'
import { categoryStatusMap } from '@/utils/format'
import { applyTableSort, type TableSortChange } from '@/utils/tableSort'

const loading = ref(false)
const rows = ref<FacilityCategory[]>([])
const total = ref(0)
const counts = ref<Record<string, number>>({})
const dialogVisible = ref(false)
const deleteDialogVisible = ref(false)
const query = reactive({ keyword: '', categoryStatus: '', pageNum: 1, pageSize: 10, orderByColumn: undefined as string | undefined, isAsc: undefined as string | undefined })
const emptyForm = (): FacilityCategory => ({ categoryCode: '', categoryName: '', categoryStatus: '0', orderNum: 0 })
const form = reactive<FacilityCategory>(emptyForm())
const deleteForm = reactive({ categoryId: 0, categoryName: '' })

const statusTabs = computed(() => [
  { value: '', label: '全部', count: (counts.value['0'] || 0) + (counts.value['1'] || 0), meta: ALL_TAB_META },
  { value: '0', label: '正常', count: counts.value['0'] || 0, meta: CATEGORY_STATUS_META['0'] },
  { value: '1', label: '停用', count: counts.value['1'] || 0, meta: CATEGORY_STATUS_META['1'] }
])
function categoryPillStyle(status?: string) { return statusPillStyle(CATEGORY_STATUS_META[status === '1' ? '1' : '0']) }
function rowClassName({ row }: { row: FacilityCategory }) { return rowToneClass(row.categoryStatus === '1' ? 'closed' : 'done') }
function switchStatus(value: string) { query.categoryStatus = value; refreshAll() }

function handleSortChange(change: TableSortChange) {
  applyTableSort(query, change)
  query.pageNum = 1
  loadList()
}

async function loadList() {
  loading.value = true
  try {
    const result: any = await listFacilityCategories(query)
    rows.value = result.rows || []
    total.value = result.total || 0
  } finally { loading.value = false }
}
async function loadCounts() {
  const result: any = await listFacilityCategories({ keyword: query.keyword, pageNum: 1, pageSize: 10000 })
  counts.value = (result.rows || []).reduce((sum: Record<string, number>, item: FacilityCategory) => {
    const code = item.categoryStatus === '1' ? '1' : '0'
    sum[code] = (sum[code] || 0) + 1
    return sum
  }, {})
}
async function refreshAll() { query.pageNum = 1; await Promise.all([loadList(), loadCounts()]) }
function openCreate() { Object.assign(form, emptyForm()); dialogVisible.value = true }
function openEdit(row: FacilityCategory) { Object.assign(form, emptyForm(), row); dialogVisible.value = true }
async function save() {
  if (!form.categoryCode || !form.categoryName) { ElMessage.warning('请填写分类编码和名称'); return }
  if (form.categoryId) {
    const { categoryStatus: _categoryStatus, ...payload } = form
    await updateFacilityCategory(payload)
  } else {
    await addFacilityCategory(form)
  }
  ElMessage.success('分类已保存')
  dialogVisible.value = false
  refreshAll()
}
async function remove(row: FacilityCategory) {
  deleteForm.categoryId = row.categoryId || 0
  deleteForm.categoryName = row.categoryName || ''
  deleteDialogVisible.value = true
}
async function submitDelete() {
  await deleteFacilityCategory(deleteForm.categoryId)
  ElMessage.success('分类已删除')
  deleteDialogVisible.value = false
  refreshAll()
}
onMounted(async () => { await Promise.all([loadList(), loadCounts()]) })
</script>

<style scoped>.pager { display: flex; justify-content: flex-end; padding: 16px 18px; }</style>
