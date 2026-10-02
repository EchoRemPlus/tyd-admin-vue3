<template>
  <div class="page-shell">
    <div class="page-heading">
      <div><h1 class="page-title">字典管理</h1><p class="page-subtitle">维护业务字典类型与字典数据，状态和分类等下拉项由字典统一提供。</p></div>
      <el-button type="primary" :icon="Plus" @click="openTypeCreate">新增字典类型</el-button>
    </div>

    <section class="panel">
      <div class="panel-body toolbar">
        <el-input v-model="query.dictName" placeholder="字典名称" clearable style="width: 180px" @keyup.enter="loadTypes" />
        <el-input v-model="query.dictType" placeholder="字典类型" clearable style="width: 180px" @keyup.enter="loadTypes" />
        <el-select v-model="query.status" placeholder="状态" clearable style="width: 130px"><el-option label="正常" value="0" /><el-option label="停用" value="1" /></el-select>
        <el-button type="primary" @click="loadTypes">查询</el-button>
      </div>
      <el-table v-loading="loading" :data="typeRows" stripe @sort-change="handleTypeSortChange">
        <el-table-column prop="dictId" label="编号" width="80" sortable="custom" />
        <el-table-column prop="dictName" label="字典名称" min-width="160" sortable="custom" />
        <el-table-column prop="dictType" label="字典类型" min-width="180" sortable="custom" />
        <el-table-column prop="status" label="状态" width="100" sortable="custom"><template #default="{ row }"><el-tag :type="row.status === '1' ? 'info' : 'success'" round>{{ row.status === '1' ? '停用' : '正常' }}</el-tag></template></el-table-column>
        <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
        <el-table-column prop="createTime" label="创建时间" width="160" sortable="custom"><template #default="{ row }">{{ formatTime(row.createTime) }}</template></el-table-column>
        <el-table-column label="操作" width="220" fixed="right"><template #default="{ row }">
          <el-button link type="primary" @click="openData(row)">字典数据</el-button>
          <el-button link type="primary" @click="openTypeEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="removeType(row)">删除</el-button>
        </template></el-table-column>
      </el-table>
      <PaginationBar v-model:page="query.pageNum" v-model:page-size="query.pageSize" :total="typeTotal" @change="loadTypes" />
    </section>

    <el-dialog v-model="typeDialogVisible" :title="typeForm.dictId ? '编辑字典类型' : '新增字典类型'" width="560px">
      <el-form ref="typeFormRef" :model="typeForm" :rules="typeRules" label-width="90px">
        <el-form-item label="字典名称" prop="dictName"><el-input v-model="typeForm.dictName" /></el-form-item>
        <el-form-item label="字典类型" prop="dictType"><el-input v-model="typeForm.dictType" placeholder="例如 ticket_status" /></el-form-item>
        <el-form-item label="状态"><el-radio-group v-model="typeForm.status"><el-radio value="0">正常</el-radio><el-radio value="1">停用</el-radio></el-radio-group></el-form-item>
        <el-form-item label="备注"><el-input v-model="typeForm.remark" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="typeDialogVisible = false">取消</el-button><el-button type="primary" @click="saveType">保存</el-button></template>
    </el-dialog>

    <el-drawer v-model="dataDrawerVisible" :title="`字典数据 - ${currentType?.dictName || ''}`" size="720px">
      <div class="drawer-toolbar"><el-button type="primary" :icon="Plus" size="small" @click="openDataCreate">新增字典数据</el-button></div>
      <el-table v-loading="dataLoading" :data="dataRows" stripe @sort-change="handleDataSortChange">
        <el-table-column prop="dictSort" label="排序" width="80" sortable="custom" />
        <el-table-column prop="dictLabel" label="字典标签" min-width="140" sortable="custom" />
        <el-table-column prop="dictValue" label="字典键值" min-width="120" sortable="custom" />
        <el-table-column prop="status" label="状态" width="90" sortable="custom"><template #default="{ row }"><el-tag :type="row.status === '1' ? 'info' : 'success'" round>{{ row.status === '1' ? '停用' : '正常' }}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="150" fixed="right"><template #default="{ row }">
          <el-button link type="primary" @click="openDataEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="removeData(row)">删除</el-button>
        </template></el-table-column>
      </el-table>
    </el-drawer>

    <el-dialog v-model="dataDialogVisible" :title="dataForm.dictCode ? '编辑字典数据' : '新增字典数据'" width="560px" append-to-body>
      <el-form ref="dataFormRef" :model="dataForm" :rules="dataRules" label-width="90px">
        <el-form-item label="字典标签" prop="dictLabel"><el-input v-model="dataForm.dictLabel" /></el-form-item>
        <el-form-item label="字典键值" prop="dictValue"><el-input v-model="dataForm.dictValue" /></el-form-item>
        <el-form-item label="显示排序"><el-input-number v-model="dataForm.dictSort" :min="0" :max="9999" style="width:100%" /></el-form-item>
        <el-form-item label="回显样式">
          <el-select v-model="dataForm.listClass" clearable style="width:100%">
            <el-option v-for="item in styleOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="默认"><el-radio-group v-model="dataForm.isDefault"><el-radio value="Y">是</el-radio><el-radio value="N">否</el-radio></el-radio-group></el-form-item>
        <el-form-item label="状态"><el-radio-group v-model="dataForm.status"><el-radio value="0">正常</el-radio><el-radio value="1">停用</el-radio></el-radio-group></el-form-item>
        <el-form-item label="备注"><el-input v-model="dataForm.remark" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="dataDialogVisible = false">取消</el-button><el-button type="primary" @click="saveData">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import PaginationBar from '@/components/PaginationBar.vue'
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { addSysDictData, addSysDictType, deleteSysDictData, deleteSysDictTypes, listSysDictData, listSysDictTypes, updateSysDictData, updateSysDictType, type SysDictData, type SysDictType } from '@/api/systemManage'
import { formatTime } from '@/utils/format'
import { applyTableSort, type TableSortChange } from '@/utils/tableSort'

const styleOptions = ['default', 'primary', 'success', 'info', 'warning', 'danger']

const loading = ref(false)
const dataLoading = ref(false)
const typeRows = ref<SysDictType[]>([])
const dataRows = ref<SysDictData[]>([])
const typeTotal = ref(0)
const currentType = ref<SysDictType>()
const typeDialogVisible = ref(false)
const dataDrawerVisible = ref(false)
const dataDialogVisible = ref(false)
const typeFormRef = ref<FormInstance>()
const dataFormRef = ref<FormInstance>()
const query = reactive({ dictName: '', dictType: '', status: '', pageNum: 1, pageSize: 10, orderByColumn: undefined as string | undefined, isAsc: undefined as string | undefined })
const dataQuery = reactive({ pageNum: 1, pageSize: 200, orderByColumn: undefined as string | undefined, isAsc: undefined as string | undefined })

const emptyType = (): SysDictType => ({ dictName: '', dictType: '', status: '0', remark: '' })
const emptyData = (): SysDictData => ({ dictSort: 0, dictLabel: '', dictValue: '', listClass: 'default', isDefault: 'N', status: '0', remark: '' })
const typeForm = reactive<SysDictType>(emptyType())
const dataForm = reactive<SysDictData>(emptyData())
const typeRules: FormRules = {
  dictName: [{ required: true, message: '请输入字典名称', trigger: 'blur' }],
  dictType: [{ required: true, message: '请输入字典类型', trigger: 'blur' }]
}
const dataRules: FormRules = {
  dictLabel: [{ required: true, message: '请输入字典标签', trigger: 'blur' }],
  dictValue: [{ required: true, message: '请输入字典键值', trigger: 'blur' }]
}

async function loadTypes() {
  loading.value = true
  try {
    const result: any = await listSysDictTypes(query)
    typeRows.value = result.rows || []
    typeTotal.value = result.total || 0
  } finally { loading.value = false }
}
function handleTypeSortChange(change: TableSortChange) {
  applyTableSort(query, change)
  query.pageNum = 1
  loadTypes()
}
async function loadData() {
  if (!currentType.value) return
  dataLoading.value = true
  try {
    const result: any = await listSysDictData({ dictType: currentType.value.dictType, ...dataQuery })
    dataRows.value = result.rows || []
  } finally { dataLoading.value = false }
}
function handleDataSortChange(change: TableSortChange) {
  applyTableSort(dataQuery, change)
  loadData()
}
function openTypeCreate() { Object.assign(typeForm, emptyType()); typeDialogVisible.value = true }
function openTypeEdit(row: SysDictType) { Object.assign(typeForm, emptyType(), row); typeDialogVisible.value = true }
async function saveType() {
  await typeFormRef.value?.validate()
  if (typeForm.dictId) await updateSysDictType(typeForm); else await addSysDictType(typeForm)
  ElMessage.success('字典类型已保存')
  typeDialogVisible.value = false
  loadTypes()
}
async function removeType(row: SysDictType) {
  await ElMessageBox.confirm(`确定删除字典类型「${row.dictName}」？已分配字典数据时不允许删除。`, '删除字典', { type: 'warning' })
  await deleteSysDictTypes([row.dictId!])
  ElMessage.success('字典类型已删除')
  loadTypes()
}
function openData(row: SysDictType) { currentType.value = row; dataDrawerVisible.value = true; loadData() }
function openDataCreate() { Object.assign(dataForm, emptyData(), { dictType: currentType.value?.dictType }); dataDialogVisible.value = true }
function openDataEdit(row: SysDictData) { Object.assign(dataForm, emptyData(), row); dataDialogVisible.value = true }
async function saveData() {
  await dataFormRef.value?.validate()
  if (dataForm.dictCode) await updateSysDictData(dataForm); else await addSysDictData(dataForm)
  ElMessage.success('字典数据已保存')
  dataDialogVisible.value = false
  loadData()
}
async function removeData(row: SysDictData) {
  await ElMessageBox.confirm(`确定删除字典数据「${row.dictLabel}」？`, '删除字典数据', { type: 'warning' })
  await deleteSysDictData([row.dictCode!])
  ElMessage.success('字典数据已删除')
  loadData()
}
onMounted(loadTypes)
</script>

<style scoped>
.pager { display: flex; justify-content: flex-end; padding: 16px 18px; }
.drawer-toolbar { display: flex; justify-content: flex-end; margin-bottom: 12px; }
</style>
