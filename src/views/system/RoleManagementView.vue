<template>
  <div class="page-shell">
    <div class="page-heading">
      <div><h1 class="page-title">角色管理</h1><p class="page-subtitle">维护角色与菜单权限，角色决定用户在系统内可见的功能范围。</p></div>
      <el-button v-permission="'system:role:add'" type="primary" :icon="Plus" @click="openCreate">新增角色</el-button>
    </div>

    <section class="panel">
      <div class="panel-body toolbar">
        <el-input v-model="query.roleName" placeholder="角色名称" clearable style="width: 180px" @keyup.enter="loadList" />
        <el-input v-model="query.roleKey" placeholder="权限字符" clearable style="width: 180px" @keyup.enter="loadList" />
        <el-select v-model="query.status" placeholder="状态" clearable style="width: 120px"><el-option label="正常" value="0" /><el-option label="停用" value="1" /></el-select>
        <el-button type="primary" @click="loadList">查询</el-button>
      </div>
      <el-table v-loading="loading" :data="rows" stripe @sort-change="handleSortChange">
        <el-table-column prop="roleId" label="编号" width="80" sortable="custom" />
        <el-table-column prop="roleName" label="角色名称" min-width="150" sortable="custom" />
        <el-table-column prop="roleKey" label="权限字符" min-width="150" sortable="custom" />
        <el-table-column prop="roleSort" label="显示顺序" width="100" sortable="custom" />
        <el-table-column prop="status" label="状态" width="100" sortable="custom"><template #default="{ row }"><el-switch v-model="row.status" active-value="0" inactive-value="1" @change="toggleStatus(row)" /></template></el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="160" sortable="custom"><template #default="{ row }">{{ formatTime(row.createTime) }}</template></el-table-column>
        <el-table-column label="操作" width="160" fixed="right"><template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" :disabled="row.roleId === 1" @click="remove(row)">删除</el-button>
        </template></el-table-column>
      </el-table>
      <PaginationBar v-model:page="query.pageNum" v-model:page-size="query.pageSize" :total="total" @change="loadList" />
    </section>

    <el-dialog v-model="dialogVisible" :title="form.roleId ? '编辑角色' : '新增角色'" width="640px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="角色名称" prop="roleName"><el-input v-model="form.roleName" /></el-form-item>
        <el-form-item label="权限字符" prop="roleKey"><el-input v-model="form.roleKey" placeholder="例如 inspector、repairer" /></el-form-item>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="显示顺序"><el-input-number v-model="form.roleSort" :min="0" :max="9999" style="width:100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="状态"><el-radio-group v-model="form.status"><el-radio value="0">正常</el-radio><el-radio value="1">停用</el-radio></el-radio-group></el-form-item></el-col>
        </el-row>
        <el-form-item label="菜单权限">
          <div class="menu-tree">
            <div class="menu-tree-actions">
              <el-checkbox v-model="expandAll" @change="toggleExpand">展开/折叠</el-checkbox>
              <el-checkbox v-model="checkAll" @change="toggleCheckAll">全选/全不选</el-checkbox>
            </div>
            <el-tree ref="treeRef" :data="menuTree" show-checkbox node-key="id" :props="{ label: 'label', children: 'children' }" :default-expand-all="expandAll" />
          </div>
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
import { addSysRole, changeRoleStatus, deleteSysRoles, getMenuTree, getRoleMenuTree, getSysRole, listSysRoles, updateSysRole, type SysRole, type TreeNode } from '@/api/systemManage'
import { formatTime } from '@/utils/format'
import { applyTableSort, type TableSortChange } from '@/utils/tableSort'

const loading = ref(false)
const rows = ref<SysRole[]>([])
const menuTree = ref<TreeNode[]>([])
const total = ref(0)
const dialogVisible = ref(false)
const expandAll = ref(true)
const checkAll = ref(false)
const treeRef = ref<any>()
const formRef = ref<FormInstance>()
const query = reactive({ roleName: '', roleKey: '', status: '', pageNum: 1, pageSize: 10, orderByColumn: undefined as string | undefined, isAsc: undefined as string | undefined })
const emptyForm = (): SysRole => ({ roleName: '', roleKey: '', roleSort: 0, status: '0', remark: '' })
const form = reactive<SysRole>(emptyForm())
const rules: FormRules = {
  roleName: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  roleKey: [{ required: true, message: '请输入权限字符', trigger: 'blur' }]
}

async function loadList() {
  loading.value = true
  try {
    const result: any = await listSysRoles(query)
    rows.value = result.rows || []
    total.value = result.total || 0
  } finally { loading.value = false }
}
function handleSortChange(change: TableSortChange) {
  applyTableSort(query, change)
  query.pageNum = 1
  loadList()
}
async function loadMenuTree() {
  const result: any = await getMenuTree()
  menuTree.value = result.data || []
}
function openCreate() {
  Object.assign(form, emptyForm())
  dialogVisible.value = true
  setTimeout(() => { treeRef.value?.setCheckedKeys([]); checkAll.value = false })
}
async function openEdit(row: SysRole) {
  const [detail, menuResult] = await Promise.all([getSysRole(row.roleId!), getRoleMenuTree(row.roleId!)]) as any[]
  Object.assign(form, emptyForm(), detail.data || row)
  const roleMenu: any = menuResult
  if (roleMenu.menus?.length) menuTree.value = roleMenu.menus
  dialogVisible.value = true
  setTimeout(() => {
    treeRef.value?.setCheckedKeys(roleMenu.checkedKeys || [])
    checkAll.value = false
  })
}
async function save() {
  await formRef.value?.validate()
  const checked = treeRef.value?.getCheckedKeys() || []
  const halfChecked = treeRef.value?.getHalfCheckedKeys() || []
  const payload: SysRole = { ...form, menuIds: [...checked, ...halfChecked] }
  if (form.roleId) await updateSysRole(payload); else await addSysRole(payload)
  ElMessage.success('角色已保存')
  dialogVisible.value = false
  loadList()
}
async function toggleStatus(row: SysRole) {
  const action = row.status === '0' ? '启用' : '停用'
  try {
    await changeRoleStatus(row.roleId!, row.status!)
    ElMessage.success(`角色已${action}`)
  } catch {
    row.status = row.status === '0' ? '1' : '0'
  }
}
async function remove(row: SysRole) {
  await ElMessageBox.confirm(`确定删除角色「${row.roleName}」？`, '删除角色', { type: 'warning' })
  await deleteSysRoles([row.roleId!])
  ElMessage.success('角色已删除')
  loadList()
}
function toggleExpand() {
  const nodes = treeRef.value?.store?.nodesMap || {}
  Object.values(nodes).forEach((node: any) => { node.expanded = expandAll.value })
}
function toggleCheckAll() {
  treeRef.value?.setCheckedKeys(checkAll.value ? collectIds(menuTree.value) : [])
}
function collectIds(nodes: TreeNode[]): number[] {
  return nodes.flatMap(node => [node.id!, ...(node.children ? collectIds(node.children) : [])])
}
onMounted(() => { loadList(); loadMenuTree() })
</script>

<style scoped>
.pager { display: flex; justify-content: flex-end; padding: 16px 18px; }
.menu-tree { width: 100%; max-height: 280px; overflow-y: auto; border: 1px solid var(--ops-border); border-radius: 10px; padding: 10px; }
.menu-tree-actions { display: flex; gap: 16px; padding-bottom: 8px; border-bottom: 1px dashed var(--ops-border); margin-bottom: 8px; }
</style>
