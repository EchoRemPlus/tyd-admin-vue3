<template>
  <div class="page-shell">
    <div class="page-heading">
      <div><h1 class="page-title">部门管理</h1><p class="page-subtitle">维护组织架构树，部门用于数据权限和任务派发范围划分。</p></div>
      <el-button type="primary" :icon="Plus" @click="openCreate(undefined)">新增部门</el-button>
    </div>

    <section class="panel">
      <div class="panel-body toolbar">
        <el-input v-model="query.deptName" placeholder="部门名称" clearable style="width: 200px" @keyup.enter="loadList" />
        <el-select v-model="query.status" placeholder="状态" clearable style="width: 130px"><el-option label="正常" value="0" /><el-option label="停用" value="1" /></el-select>
        <el-button type="primary" @click="loadList">查询</el-button>
      </div>
      <el-table v-loading="loading" :data="rows" row-key="deptId" :tree-props="{ children: 'children' }" default-expand-all @sort-change="handleSortChange">
        <el-table-column prop="deptName" label="部门名称" min-width="220" sortable="custom" />
        <el-table-column prop="orderNum" label="排序" width="90" sortable="custom" />
        <el-table-column prop="leader" label="负责人" width="120" sortable="custom" />
        <el-table-column prop="phone" label="联系电话" width="140" sortable="custom" />
        <el-table-column prop="status" label="状态" width="100" sortable="custom"><template #default="{ row }"><el-tag :type="row.status === '1' ? 'info' : 'success'" round>{{ row.status === '1' ? '停用' : '正常' }}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="220" fixed="right"><template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="primary" @click="openCreate(row)">新增下级</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template></el-table-column>
      </el-table>
    </section>

    <el-dialog v-model="dialogVisible" :title="form.deptId ? '编辑部门' : '新增部门'" width="600px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="上级部门">
          <el-tree-select v-model="form.parentId" :data="parentOptions" :props="{ label: 'deptName', value: 'deptId', children: 'children' }" check-strictly clearable placeholder="不选则为顶级部门" style="width:100%" />
        </el-form-item>
        <el-form-item label="部门名称" prop="deptName"><el-input v-model="form.deptName" /></el-form-item>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="显示排序"><el-input-number v-model="form.orderNum" :min="0" :max="9999" style="width:100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="负责人"><el-input v-model="form.leader" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="联系电话"><el-input v-model="form.phone" maxlength="11" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="邮箱"><el-input v-model="form.email" /></el-form-item></el-col>
        </el-row>
        <el-form-item label="状态"><el-radio-group v-model="form.status"><el-radio value="0">正常</el-radio><el-radio value="1">停用</el-radio></el-radio-group></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" @click="save">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { addSysDept, deleteSysDept, getSysDept, listSysDepts, updateSysDept, type SysDept } from '@/api/systemManage'
import { buildTree, sortTree } from '@/utils/treeData'
import type { TableSortChange } from '@/utils/tableSort'

const loading = ref(false)
const rows = ref<SysDept[]>([])
const sourceRows = ref<SysDept[]>([])
const currentSort = ref<TableSortChange>({})
const parentOptions = ref<SysDept[]>([])
const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
const query = reactive({ deptName: '', status: '', pageNum: 1, pageSize: 100 })
const emptyForm = (): SysDept => ({ parentId: undefined, deptName: '', orderNum: 0, leader: '', phone: '', email: '', status: '0' })
const form = reactive<SysDept>(emptyForm())
const rules: FormRules = {
  deptName: [{ required: true, message: '请输入部门名称', trigger: 'blur' }]
}

async function loadList() {
  loading.value = true
  try {
    const result: any = await listSysDepts(query)
    sourceRows.value = buildTree<SysDept>(result.data || [], 'deptId', 'parentId')
    applyTreeSort()
    parentOptions.value = [{ deptId: 0, deptName: '顶级部门', children: rows.value } as SysDept]
  } finally { loading.value = false }
}
function applyTreeSort() {
  if (!currentSort.value.prop || !currentSort.value.order) {
    rows.value = sourceRows.value
    return
  }
  rows.value = sortTree(sourceRows.value, currentSort.value.prop, currentSort.value.order)
}
function handleSortChange(change: TableSortChange) {
  currentSort.value = change
  applyTreeSort()
}
function openCreate(parent?: SysDept) { Object.assign(form, emptyForm(), { parentId: parent?.deptId ?? 0 }); dialogVisible.value = true }
async function openEdit(row: SysDept) { const result: any = await getSysDept(row.deptId!); Object.assign(form, emptyForm(), result.data || row); dialogVisible.value = true }
async function save() {
  await formRef.value?.validate()
  if (form.deptId) await updateSysDept(form); else await addSysDept(form)
  ElMessage.success('部门已保存')
  dialogVisible.value = false
  loadList()
}
async function remove(row: SysDept) {
  await ElMessageBox.confirm(`确定删除部门「${row.deptName}」？存在下级部门或已分配用户时不允许删除。`, '删除部门', { type: 'warning' })
  await deleteSysDept(row.deptId!)
  ElMessage.success('部门已删除')
  loadList()
}
onMounted(loadList)
</script>

<style scoped>.pager { display: flex; justify-content: flex-end; padding: 16px 18px; }</style>
