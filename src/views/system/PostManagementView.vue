<template>
  <div class="page-shell">
    <div class="page-heading">
      <div><h1 class="page-title">岗位管理</h1><p class="page-subtitle">维护岗位编码与名称，用于标识人员在组织中的职责。</p></div>
      <el-button type="primary" :icon="Plus" @click="openCreate">新增岗位</el-button>
    </div>

    <section class="panel">
      <div class="panel-body toolbar">
        <el-input v-model="query.postCode" placeholder="岗位编码" clearable style="width: 180px" @keyup.enter="loadList" />
        <el-input v-model="query.postName" placeholder="岗位名称" clearable style="width: 180px" @keyup.enter="loadList" />
        <el-select v-model="query.status" placeholder="状态" clearable style="width: 130px"><el-option label="正常" value="0" /><el-option label="停用" value="1" /></el-select>
        <el-button type="primary" @click="loadList">查询</el-button>
      </div>
      <el-table v-loading="loading" :data="rows" stripe @sort-change="handleSortChange">
        <el-table-column prop="postId" label="编号" width="80" sortable="custom" />
        <el-table-column prop="postCode" label="岗位编码" min-width="150" sortable="custom" />
        <el-table-column prop="postName" label="岗位名称" min-width="150" sortable="custom" />
        <el-table-column prop="postSort" label="显示顺序" width="100" sortable="custom" />
        <el-table-column prop="status" label="状态" width="100" sortable="custom"><template #default="{ row }"><DictTag dict-type="sys_normal_disable" :value="row.status" /></template></el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="160" sortable="custom"><template #default="{ row }">{{ formatTime(row.createTime) }}</template></el-table-column>
        <el-table-column label="操作" width="150" fixed="right"><template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template></el-table-column>
      </el-table>
      <PaginationBar v-model:page="query.pageNum" v-model:page-size="query.pageSize" :total="total" @change="loadList" />
    </section>

    <el-dialog v-model="dialogVisible" :title="form.postId ? '编辑岗位' : '新增岗位'" width="560px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="岗位名称" prop="postName"><el-input v-model="form.postName" /></el-form-item>
        <el-form-item label="岗位编码" prop="postCode"><el-input v-model="form.postCode" placeholder="例如 inspector、repairer" /></el-form-item>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="显示顺序"><el-input-number v-model="form.postSort" :min="0" :max="9999" style="width:100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="状态"><el-radio-group v-model="form.status"><el-radio value="0">正常</el-radio><el-radio value="1">停用</el-radio></el-radio-group></el-form-item></el-col>
        </el-row>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" @click="save">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import PaginationBar from '@/components/PaginationBar.vue'
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import DictTag from '@/components/DictTag.vue'
import { addSysPost, deleteSysPosts, getSysPost, listSysPosts, updateSysPost, type SysPost } from '@/api/systemManage'
import { formatTime } from '@/utils/format'
import { applyTableSort, type TableSortChange } from '@/utils/tableSort'

const loading = ref(false)
const rows = ref<SysPost[]>([])
const total = ref(0)
const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
const query = reactive({ postCode: '', postName: '', status: '', pageNum: 1, pageSize: 10, orderByColumn: undefined as string | undefined, isAsc: undefined as string | undefined })
const emptyForm = (): SysPost => ({ postCode: '', postName: '', postSort: 0, status: '0', remark: '' })
const form = reactive<SysPost>(emptyForm())
const rules: FormRules = {
  postName: [{ required: true, message: '请输入岗位名称', trigger: 'blur' }],
  postCode: [{ required: true, message: '请输入岗位编码', trigger: 'blur' }]
}

async function loadList() {
  loading.value = true
  try {
    const result: any = await listSysPosts(query)
    rows.value = result.rows || []
    total.value = result.total || 0
  } finally { loading.value = false }
}
function handleSortChange(change: TableSortChange) {
  applyTableSort(query, change)
  query.pageNum = 1
  loadList()
}
function openCreate() { Object.assign(form, emptyForm()); dialogVisible.value = true }
async function openEdit(row: SysPost) { const result: any = await getSysPost(row.postId!); Object.assign(form, emptyForm(), result.data || row); dialogVisible.value = true }
async function save() {
  await formRef.value?.validate()
  if (form.postId) await updateSysPost(form); else await addSysPost(form)
  ElMessage.success('岗位已保存')
  dialogVisible.value = false
  loadList()
}
async function remove(row: SysPost) {
  await ElMessageBox.confirm(`确定删除岗位「${row.postName}」？`, '删除岗位', { type: 'warning' })
  await deleteSysPosts([row.postId!])
  ElMessage.success('岗位已删除')
  loadList()
}
onMounted(loadList)
</script>

<style scoped>.pager { display: flex; justify-content: flex-end; padding: 16px 18px; }</style>
