<template>
  <div class="page-shell">
    <div class="page-heading">
      <div><h1 class="page-title">菜单管理</h1><p class="page-subtitle">维护菜单、按钮权限标识和路由配置，权限字符与后端 @PreAuthorize 对应。</p></div>
      <el-button type="primary" :icon="Plus" @click="openCreate(undefined)">新增菜单</el-button>
    </div>

    <section class="panel">
      <div class="panel-body toolbar">
        <el-input v-model="query.menuName" placeholder="菜单名称" clearable style="width: 200px" @keyup.enter="loadList" />
        <el-select v-model="query.status" placeholder="状态" clearable style="width: 130px"><el-option label="正常" value="0" /><el-option label="停用" value="1" /></el-select>
        <el-button type="primary" @click="loadList">查询</el-button>
      </div>
      <el-table v-loading="loading" :data="rows" row-key="menuId" :tree-props="{ children: 'children' }" default-expand-all @sort-change="handleSortChange">
        <el-table-column prop="menuName" label="菜单名称" min-width="200" sortable="custom" />
        <el-table-column label="类型" width="90"><template #default="{ row }"><el-tag size="small" effect="plain">{{ menuTypeMap[row.menuType || ''] || '未知' }}</el-tag></template></el-table-column>
        <el-table-column prop="orderNum" label="排序" width="80" sortable="custom" />
        <el-table-column prop="perms" label="权限字符" min-width="180" sortable="custom" />
        <el-table-column prop="path" label="路由地址" min-width="140" sortable="custom" />
        <el-table-column prop="status" label="状态" width="90" sortable="custom"><template #default="{ row }"><el-tag :type="row.status === '1' ? 'info' : 'success'" round>{{ row.status === '1' ? '停用' : '正常' }}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="210" fixed="right"><template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="primary" @click="openCreate(row)">新增下级</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template></el-table-column>
      </el-table>
    </section>

    <el-dialog v-model="dialogVisible" :title="form.menuId ? '编辑菜单' : '新增菜单'" width="680px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="上级菜单">
          <el-tree-select v-model="form.parentId" :data="parentOptions" :props="{ label: 'menuName', value: 'menuId', children: 'children' }" check-strictly clearable placeholder="不选则为顶级菜单" style="width:100%" />
        </el-form-item>
        <el-form-item label="菜单类型">
          <el-radio-group v-model="form.menuType">
            <el-radio value="M">目录</el-radio><el-radio value="C">菜单</el-radio><el-radio value="F">按钮</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="菜单名称" prop="menuName"><el-input v-model="form.menuName" /></el-form-item>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="显示排序"><el-input-number v-model="form.orderNum" :min="0" :max="9999" style="width:100%" /></el-form-item></el-col>
          <el-col v-if="form.menuType !== 'F'" :span="12"><el-form-item label="菜单图标"><el-input v-model="form.icon" placeholder="Element Plus 图标名" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col v-if="form.menuType !== 'F'" :span="12"><el-form-item label="路由地址"><el-input v-model="form.path" placeholder="例如 /system 或 users" /></el-form-item></el-col>
          <el-col v-if="form.menuType === 'C'" :span="12"><el-form-item label="组件路径"><el-input v-model="form.component" placeholder="例如 system/user/index" /></el-form-item></el-col>
        </el-row>
        <el-form-item v-if="form.menuType !== 'M'" label="权限字符"><el-input v-model="form.perms" placeholder="例如 system:user:list" /></el-form-item>
        <el-row :gutter="16">
          <el-col v-if="form.menuType !== 'F'" :span="12"><el-form-item label="显示状态"><el-radio-group v-model="form.visible"><el-radio value="0">显示</el-radio><el-radio value="1">隐藏</el-radio></el-radio-group></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="菜单状态"><el-radio-group v-model="form.status"><el-radio value="0">正常</el-radio><el-radio value="1">停用</el-radio></el-radio-group></el-form-item></el-col>
        </el-row>
        <el-row v-if="form.menuType === 'C'" :gutter="16">
          <el-col :span="12"><el-form-item label="是否外链"><el-radio-group v-model="form.isFrame"><el-radio value="0">是</el-radio><el-radio value="1">否</el-radio></el-radio-group></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="是否缓存"><el-radio-group v-model="form.isCache"><el-radio value="0">缓存</el-radio><el-radio value="1">不缓存</el-radio></el-radio-group></el-form-item></el-col>
        </el-row>
      </el-form>
      <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" @click="save">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { addSysMenu, deleteSysMenu, getSysMenu, listSysMenus, updateSysMenu, type SysMenu } from '@/api/systemManage'
import { buildTree, sortTree } from '@/utils/treeData'
import type { TableSortChange } from '@/utils/tableSort'

const menuTypeMap: Record<string, string> = { M: '目录', C: '菜单', F: '按钮' }

const loading = ref(false)
const rows = ref<SysMenu[]>([])
const sourceRows = ref<SysMenu[]>([])
const currentSort = ref<TableSortChange>({})
const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
const query = reactive({ menuName: '', status: '', pageNum: 1, pageSize: 100 })
const emptyForm = (): SysMenu => ({ parentId: 0, menuName: '', menuType: 'M', orderNum: 0, path: '', component: '', perms: '', icon: '', visible: '0', status: '0', isFrame: '1', isCache: '0' })
const form = reactive<SysMenu>(emptyForm())
const rules: FormRules = {
  menuName: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }]
}

/** 上级菜单只能选择目录或菜单 */
const parentOptions = computed(() => [{ menuId: 0, menuName: '顶级菜单', children: filterParent(rows.value) } as SysMenu])

function filterParent(nodes: SysMenu[]): SysMenu[] {
  return nodes
    .filter(node => node.menuType !== 'F')
    .map(node => ({ ...node, children: node.children ? filterParent(node.children) : [] }))
}

async function loadList() {
  loading.value = true
  try {
    const result: any = await listSysMenus(query)
    sourceRows.value = buildTree<SysMenu>(result.data || [], 'menuId', 'parentId')
    applyTreeSort()
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
function openCreate(parent?: SysMenu) {
  Object.assign(form, emptyForm(), { parentId: parent?.menuId ?? 0, menuType: parent ? 'C' : 'M' })
  dialogVisible.value = true
}
async function openEdit(row: SysMenu) { const result: any = await getSysMenu(row.menuId!); Object.assign(form, emptyForm(), result.data || row); dialogVisible.value = true }
async function save() {
  await formRef.value?.validate()
  if (form.menuId) await updateSysMenu(form); else await addSysMenu(form)
  ElMessage.success('菜单已保存')
  dialogVisible.value = false
  loadList()
}
async function remove(row: SysMenu) {
  await ElMessageBox.confirm(`确定删除菜单「${row.menuName}」？存在下级菜单或已分配给角色时不允许删除。`, '删除菜单', { type: 'warning' })
  await deleteSysMenu(row.menuId!)
  ElMessage.success('菜单已删除')
  loadList()
}
onMounted(loadList)
</script>

<style scoped>.pager { display: flex; justify-content: flex-end; padding: 16px 18px; }</style>
