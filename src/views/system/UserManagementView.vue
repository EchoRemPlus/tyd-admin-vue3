<template>
  <div class="page-shell">
    <div class="page-heading">
      <div><h1 class="page-title">用户管理</h1><p class="page-subtitle">维护系统账号、所属部门和角色，停用后的账号不能登录。</p></div>
      <el-button v-permission="'system:user:add'" type="primary" :icon="Plus" @click="openCreate">新增用户</el-button>
    </div>

    <section class="panel">
      <div class="panel-body toolbar">
        <el-input v-model="query.userName" placeholder="用户名称" clearable style="width: 180px" @keyup.enter="loadList" />
        <el-input v-model="query.phonenumber" placeholder="手机号码" clearable style="width: 160px" @keyup.enter="loadList" />
        <el-tree-select v-model="query.deptId" :data="deptTree" :props="{ label: 'label', value: 'id', children: 'children' }" check-strictly clearable placeholder="所属部门" style="width: 200px" />
        <el-select v-model="query.status" placeholder="状态" clearable style="width: 120px"><el-option label="正常" value="0" /><el-option label="停用" value="1" /></el-select>
        <el-button type="primary" @click="loadList">查询</el-button>
      </div>
      <el-table v-loading="loading" :data="rows" stripe @sort-change="handleSortChange">
        <el-table-column prop="u.userId" label="编号" width="80" sortable="custom"><template #default="{ row }">{{ row.userId }}</template></el-table-column>
        <el-table-column prop="u.userName" label="用户名称" min-width="130" sortable="custom"><template #default="{ row }">{{ row.userName }}</template></el-table-column>
        <el-table-column prop="u.nickName" label="用户昵称" min-width="130" sortable="custom"><template #default="{ row }">{{ row.nickName }}</template></el-table-column>
        <el-table-column prop="u.deptId" label="所属部门" min-width="140" sortable="custom"><template #default="{ row }">{{ row.dept?.deptName || '-' }}</template></el-table-column>
        <el-table-column prop="u.phonenumber" label="手机号码" width="130" sortable="custom"><template #default="{ row }">{{ row.phonenumber || '-' }}</template></el-table-column>
        <el-table-column prop="u.status" label="状态" width="100" sortable="custom"><template #default="{ row }"><el-switch v-model="row.status" active-value="0" inactive-value="1" @change="toggleStatus(row)" /></template></el-table-column>
        <el-table-column prop="u.createTime" label="创建时间" width="160" sortable="custom"><template #default="{ row }">{{ formatTime(row.createTime) }}</template></el-table-column>
        <el-table-column label="操作" width="220" fixed="right"><template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="warning" @click="resetPwd(row)">重置密码</el-button>
          <el-button v-permission="'system:user:remove'" link type="danger" :disabled="row.userId === 1" @click="remove(row)">删除</el-button>
        </template></el-table-column>
      </el-table>
      <PaginationBar v-model:page="query.pageNum" v-model:page-size="query.pageSize" :total="total" @change="loadList" />
    </section>

    <el-dialog v-model="dialogVisible" :title="form.userId ? '编辑用户' : '新增用户'" width="640px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="用户名称" prop="userName"><el-input v-model="form.userName" :disabled="Boolean(form.userId)" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="用户昵称" prop="nickName"><el-input v-model="form.nickName" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item v-if="!form.userId" label="登录密码" prop="password"><el-input v-model="form.password" type="password" show-password /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="手机号码" prop="phonenumber"><el-input v-model="form.phonenumber" maxlength="11" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="所属部门"><el-tree-select v-model="form.deptId" :data="deptTree" :props="{ label: 'label', value: 'id', children: 'children' }" check-strictly clearable style="width:100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="邮箱"><el-input v-model="form.email" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="性别"><DictSelect v-model="form.sex" dict-type="sys_user_sex" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="状态"><el-radio-group v-model="form.status"><el-radio value="0">正常</el-radio><el-radio value="1">停用</el-radio></el-radio-group></el-form-item></el-col>
        </el-row>
        <el-form-item label="角色">
          <el-select v-model="form.roleIds" multiple style="width:100%" placeholder="请选择角色">
            <el-option v-for="item in roles" :key="item.roleId" :label="item.roleName" :value="item.roleId!" />
          </el-select>
        </el-form-item>
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
import DictSelect from '@/components/DictSelect.vue'
import { addSysUser, changeUserStatus, deleteSysUsers, getDeptTree, getSysUser, listSysRoles, listSysUsers, resetUserPwd, updateSysUser, type SysRole, type SysUser, type TreeNode } from '@/api/systemManage'
import { formatTime } from '@/utils/format'
import { applyTableSort, type TableSortChange } from '@/utils/tableSort'

const loading = ref(false)
const rows = ref<SysUser[]>([])
const roles = ref<SysRole[]>([])
const deptTree = ref<TreeNode[]>([])
const total = ref(0)
const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
const query = reactive({ userName: '', phonenumber: '', deptId: undefined as number | undefined, status: '', pageNum: 1, pageSize: 10, orderByColumn: undefined as string | undefined, isAsc: undefined as string | undefined })
const emptyForm = (): SysUser => ({ userName: '', nickName: '', deptId: undefined, phonenumber: '', email: '', sex: '0', status: '0', password: '', roleIds: [], remark: '' })
const form = reactive<SysUser>(emptyForm())
const rules: FormRules = {
  userName: [{ required: true, message: '请输入用户名称', trigger: 'blur' }],
  nickName: [{ required: true, message: '请输入用户昵称', trigger: 'blur' }],
  password: [{ required: true, message: '请输入登录密码', trigger: 'blur' }]
}

async function loadList() {
  loading.value = true
  try {
    const result: any = await listSysUsers(query)
    rows.value = result.rows || []
    total.value = result.total || 0
  } finally { loading.value = false }
}
function handleSortChange(change: TableSortChange) {
  applyTableSort(query, change)
  query.pageNum = 1
  loadList()
}
async function loadOptions() {
  const [deptResult, roleResult] = await Promise.all([getDeptTree(), listSysRoles({ pageNum: 1, pageSize: 200, status: '0' })]) as any[]
  deptTree.value = (deptResult.data || []).map((node: any) => ({ ...node, label: node.label || node.deptName, id: node.id || node.deptId }))
  roles.value = roleResult.rows || []
}
function openCreate() { Object.assign(form, emptyForm()); dialogVisible.value = true }
async function openEdit(row: SysUser) {
  const result: any = await getSysUser(row.userId!)
  const detail = result.data || row
  Object.assign(form, emptyForm(), detail, {
    roleIds: (result.roleIds || detail.roleIds || []),
    password: undefined
  })
  dialogVisible.value = true
}
async function save() {
  await formRef.value?.validate()
  if (form.userId) await updateSysUser(form); else await addSysUser(form)
  ElMessage.success('用户已保存')
  dialogVisible.value = false
  loadList()
}
async function toggleStatus(row: SysUser) {
  const action = row.status === '0' ? '启用' : '停用'
  try {
    await changeUserStatus(row.userId!, row.status!)
    ElMessage.success(`用户已${action}`)
  } catch {
    row.status = row.status === '0' ? '1' : '0'
  }
}
async function resetPwd(row: SysUser) {
  const result = await ElMessageBox.prompt(`为用户「${row.nickName || row.userName}」设置新密码`, '重置密码', {
    inputPlaceholder: '请输入新密码（6-20 位）',
    inputValidator: value => (value && value.length >= 6 && value.length <= 20) || '密码长度需为 6-20 位',
    type: 'warning'
  })
  await resetUserPwd(row.userId!, result.value)
  ElMessage.success('密码已重置')
}
async function remove(row: SysUser) {
  await ElMessageBox.confirm(`确定删除用户「${row.nickName || row.userName}」？`, '删除用户', { type: 'warning' })
  await deleteSysUsers([row.userId!])
  ElMessage.success('用户已删除')
  loadList()
}
onMounted(() => { loadList(); loadOptions() })
</script>

<style scoped>.pager { display: flex; justify-content: flex-end; padding: 16px 18px; }</style>
